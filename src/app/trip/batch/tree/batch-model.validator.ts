import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import {AppFormArray, isEmptyArray, isNotEmptyArray, isNotNil, LocalSettingsService, ReferentialRef, removeDuplicatesFromArray} from '@sumaris-net/ngx-components';
import {IPmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { DataEntityValidatorOptions } from '@app/data/services/validator/data-entity.validator';
import { Batch, BatchAsObjectOptions, BatchFromObjectOptions } from '@app/trip/batch/common/batch.model';
import { BatchValidatorService } from '@app/trip/batch/common/batch.validator';
import { TranslateService } from '@ngx-translate/core';
import { BatchModel, BatchModelFilter, BatchModelUtils } from '@app/trip/batch/tree/batch-tree.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { environment } from '@environments/environment';
import { PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { TreeItemEntityUtils } from '@app/shared/tree-item-entity.utils';
import { Rule } from '@app/referential/services/model/rule.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { BatchRules } from '@app/trip/batch/tree/batch-tree.rules';

export interface BatchModelValidatorOptions extends DataEntityValidatorOptions {
  withWeight?: boolean;
  withChildrenWeight?: boolean;
  weightRequired?: boolean;
  rankOrderRequired?: boolean;
  labelRequired?: boolean;
  withMeasurements?: boolean;
  withMeasurementTypename?: boolean;
  pmfms?: IPmfm[];
  allowSpeciesSampling?: boolean;

  // Children
  withChildren?: boolean;
  childrenPmfms?: IPmfm[];
  qvPmfm?: IPmfm;
}


@Injectable({providedIn: 'root'})
export class BatchModelValidatorService<
  T extends Batch<T> = Batch,
  O extends BatchModelValidatorOptions = BatchModelValidatorOptions,
  AO extends BatchAsObjectOptions = BatchAsObjectOptions,
  FO extends BatchFromObjectOptions = BatchFromObjectOptions
  > extends BatchValidatorService<T, O> {

  debug: boolean;

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    measurementsValidatorService: MeasurementsValidatorService,
    private batchRules: BatchRules,
    settings?: LocalSettingsService
  ) {
    super(formBuilder, translate, settings, measurementsValidatorService);
    this.debug = !environment.production;
  }

  createModel(data: Batch|undefined, opts: {
    allowDiscard: boolean;
    sortingPmfms: IPmfm[];
    catchPmfms: IPmfm[];
    physicalGear: PhysicalGear;
    rules?: Rule[];
  }): BatchModel {

    // Map sorting pmfms
    opts.sortingPmfms = (opts.sortingPmfms || []).map(p => {

      // Fill CHILD_GEAR qualitative values, with the given opts.physicalGear
      if (opts?.physicalGear?.children && p.id === PmfmIds.CHILD_GEAR) {
        // Convert to referential item
        p = p.clone();
        p.qualitativeValues = (opts.physicalGear.children || []).map(pg => ReferentialRef.fromObject({
          id: pg.rankOrder,
          label: pg.rankOrder,
          name: pg.measurementValues[PmfmIds.GEAR_LABEL] || pg.gear.name
        }));
        if (isEmptyArray(p.qualitativeValues)) {
          console.warn(`[batch-model-validator] Unable to fill items for Pmfm#${p.id} (${p.label})`);
        }
        else {
          // DEBUG
          console.debug(`[batch-tree-container] Fill CHILD_GEAR PMFM, with:`, p.qualitativeValues);
        }
      }

      return p;
    }).filter(isNotNil);

    // Create rules
    const allowDiscard = opts.allowDiscard !== false;
    let rules = (opts.rules || []);

    if (allowDiscard) {
      rules = [
        ...rules,
        // Landing rules
        Rule.fromObject(<Partial<Rule>>{
          precondition: true,
          filter: ({model}) => PmfmValueUtils.equals(model.originalData.measurementValues[PmfmIds.DISCARD_OR_LANDING], QualitativeValueIds.DISCARD_OR_LANDING.LANDING),

          // Avoid discard pmfms
          children: this.batchRules.getNotDiscardPmfms('pmfm.')
        }),

        // Discard rules
        Rule.fromObject(<Partial<Rule>>{
          precondition: true,
          filter: ({model}) => PmfmValueUtils.equals(model.originalData.measurementValues[PmfmIds.DISCARD_OR_LANDING], QualitativeValueIds.DISCARD_OR_LANDING.DISCARD)
            || PmfmValueUtils.equals(model.parent?.originalData.measurementValues[PmfmIds.DISCARD_OR_LANDING], QualitativeValueIds.DISCARD_OR_LANDING.DISCARD),

          // Avoid landing pmfms
          children: this.batchRules.getNotLandingPmfms('pmfm.')
        })
      ];
    }
    else {
      rules = [...rules,
        // No discard pmfms
        ...this.batchRules.getNotDiscardPmfms('pmfm.')
      ];
    }

    // Create a batch model
    const model = BatchModelUtils.createModel(data, {...opts, rules});
    if (!model) return;

    // Special case for discard batches
    {
      if (allowDiscard) {

        // Enable sampling batch, in VRAC batches
        TreeItemEntityUtils.findByFilter(model, BatchModelFilter.fromObject(<Partial<BatchModelFilter>>{
            parent: {
              measurementValues: {
                [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD
              }
            },
            hidden: false, // Exclude if no pmfms
            measurementValues: {
              [PmfmIds.BATCH_SORTING]: QualitativeValueIds.BATCH_SORTING.BULK
            }
          }))
          .forEach(batch => {
            const weightPmfms = (batch.childrenPmfms || []).filter(PmfmUtils.isWeight).map(p => p.clone())
            if (isNotEmptyArray(weightPmfms)) {
              // Add weights PMFM (if not found)
              const pmfms = removeDuplicatesFromArray([
                ...batch.pmfms,
                ...weightPmfms
              ], 'id');

              // Update the state, to enable weight (and sampling weight)
              batch.state = {
                ...batch.state,
                pmfms,
                showWeight: true,
                requiredWeight: true,
                showSamplingBatch: true,
                showSampleWeight: true,
                requiredSampleWeight: true,
                samplingBatchEnabled: true
              };
            }
          });

        // Activer le champ "Inventaire exhaustif e l'espèce ?"
        TreeItemEntityUtils.findByFilter(model, BatchModelFilter.fromObject(<Partial<BatchModelFilter>>{
          hidden: false, // Exclude if no pmfms
          isLeaf: true
        }))
        .forEach(leafBatch => {
          leafBatch.state = {
            ...leafBatch.state,
            showExhaustiveInventory: true
          }
        });
      }
      else {
        const discardFilter = BatchModelFilter.fromObject(<Partial<BatchModelFilter>>{
          measurementValues: {
            [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD
          }
        });
        TreeItemEntityUtils.deleteByFilter(model, discardFilter);
      }
    }

    // Translate the root name
    if (!model.parent && model.name)  {
      model.name = this.translate.instant(model.name);
    }

    if (this.debug) BatchModelUtils.logTree(model);

    return model;
  }

  createFormGroupByModel(model: BatchModel, opts: {allowSpeciesSampling: boolean}): UntypedFormGroup {
    if (!model) throw new Error('Missing required argument \'model\'');

    // DEBUG
    console.debug(`- ${model.originalData?.label} ${model.path}`);

    const form = this.getFormGroup(model.originalData as T, <O>{
      pmfms: model.pmfms,
      withMeasurements: true,
      withMeasurementTypename: true,
      withChildren: model.isLeaf,
      childrenPmfms: model.isLeaf && model.childrenPmfms,
      allowSpeciesSampling: opts.allowSpeciesSampling
    });

    // Update model valid marker (check this BEFORE to add the children form array)
    model.valid = form.valid;

    // Recursive call, on each children model
    if (!model.isLeaf) {
      const childrenFormArray = new AppFormArray<BatchModel, UntypedFormGroup>(
        (m) => this.createFormGroupByModel(m, opts),
        BatchModel.equals,
        BatchModel.isEmpty,
        {
          allowReuseControls: false,
          allowEmptyArray: true
        }
      );
      if (model.state?.showSamplingBatch) {
        const samplingForm = super.getFormGroup(null);
        samplingForm.setControl('children', childrenFormArray, {emitEvent: false});
        form.setControl('children', this.formBuilder.array([samplingForm]), {emitEvent: false});
        childrenFormArray.patchValue(model.children || []);
      }
      else {
        form.setControl('children', childrenFormArray, {emitEvent: false});
        childrenFormArray.patchValue(model.children || []);
      }
    }
    else {
      const childrenFormArray = new AppFormArray<Batch, UntypedFormControl>(
        (value) => new UntypedFormControl(value),
        Batch.equals,
        BatchUtils.isEmpty,
        {
          allowReuseControls: false,
          allowEmptyArray: true
        }
      );
      form.setControl('children', childrenFormArray, {emitEvent: false});
      childrenFormArray.patchValue(model.originalData.children || []);
    }

    model.validator = form;
    return form;
  }

  getFormGroup(data?: T, opts?: O): UntypedFormGroup {
    return super.getFormGroup(data, {
      ...opts,
      qvPmfm: null
    });
  }

  getFormGroupConfig(data?: T, opts?: O): { [key: string]: any } {

    const config = super.getFormGroupConfig(data, {
      ...opts,
      withChildren: false, // Skip inherited children logic: avoid to create an unused sampling batch. See bellow
      withMeasurements: false, // Skip inherited measurement logic, to use 'opts.pmfms' (instead of 'opts.childrenPmfms')
    });

    delete config.parent;
    delete config.children;
    delete config.measurementValues;

    // Children array:
    if (opts?.withChildren) {

      // DEBUG
      console.debug(`[batch-model-validator] Creating children form array, with pmfms: `, opts.childrenPmfms);
      config['children'] = this.getChildrenFormArray(data?.children, {
        withWeight: true,
        withMeasurements: true,
        ...opts,
        allowSamplingBatch: undefined,
        withChildren: opts.allowSpeciesSampling,
        withChildrenWeight: true,
        pmfms: opts.childrenPmfms || null,
        childrenPmfms: null
      });
    }

    // Add measurement values
    if (opts?.withMeasurements) {
      if (isNotEmptyArray(opts.pmfms)) {
        config['measurementValues'] = this.getMeasurementValuesForm(data?.measurementValues, {
          pmfms: opts.pmfms,
          forceOptional: false, // We always need full validation, in model form
          withTypename: opts.withMeasurementTypename
        });
      }
      else {
        // WARN: we need to keep existing measurement (e.g. for individual sub-batch)
        // => create a simple control, without PMFMs validation. This should be done in sub-batch form/modal
        config['measurementValues'] = this.formBuilder.control(data?.measurementValues || null);
      }
    }

    return config;
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);
    return opts;
  }

}
