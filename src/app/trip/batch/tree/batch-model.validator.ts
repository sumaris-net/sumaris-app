import { inject, Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import {
  AppFormArray,
  AppFormUtils,
  isNotEmptyArray,
  LocalSettingsService,
  removeDuplicatesFromArray,
  TreeItemEntityUtils,
} from '@sumaris-net/ngx-components';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { ControlUpdateOnType, DataEntityValidatorOptions } from '@app/data/services/validator/data-entity.validator';
import { Batch, BatchAsObjectOptions, BatchFromObjectOptions } from '@app/trip/batch/common/batch.model';
import { BatchValidatorService } from '@app/trip/batch/common/batch.validator';
import { TranslateService } from '@ngx-translate/core';
import { BatchModel, BatchModelFilter, BatchModelUtils } from '@app/trip/batch/tree/batch-tree.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { environment } from '@environments/environment';
import { PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { Rule } from '@app/referential/services/model/rule.model';
import { BatchRulesService } from '@app/trip/batch/tree/batch-tree.rules';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';

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


@Injectable()
export class BatchModelValidatorService<
  T extends Batch<T> = Batch,
  O extends BatchModelValidatorOptions = BatchModelValidatorOptions,
  AO extends BatchAsObjectOptions = BatchAsObjectOptions,
  FO extends BatchFromObjectOptions = BatchFromObjectOptions
  > extends BatchValidatorService<T, O> {

  protected readonly debug: boolean;
  protected readonly batchRules = inject(BatchRulesService);

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings, measurementsValidatorService);
    this.debug = !environment.production;
  }

  async createModel(data: Batch|undefined, opts: {
    catchPmfms: IPmfm[];
    sortingPmfms: IPmfm[];
    allowDiscard: boolean;
    // Optional options
    rules?: Rule[];
    i18nSuffix?: string;
    physicalGear?: PhysicalGear
  }): Promise<BatchModel> {
    if (!opts) throw new Error('Missing required argument \'opts\'');

    // Create rules
    const rules = this.fillDefaultRules(opts);

    // Create a batch model
    const model = BatchModelUtils.createModel(data, {...opts, rules});
    if (!model) return;

    // If allow discard
    if (opts?.allowDiscard !== false) {
      // Hide discard batch, if not a leaf
      TreeItemEntityUtils.findByFilter(model, BatchModelFilter.fromObject(<Partial<BatchModelFilter>>{
        measurementValues: {
          [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD
        },
        hidden: false, // Exclude if no pmfms
        isLeaf: false
      }))
        .forEach(batch => {
          batch.pmfms = [];
          batch.state = {
            ...batch.state,
            requiredWeight: false
          };

          // Hide empty item
          batch.hidden = true;

          // Add 'discard' into the children name
          if (batch.hidden) {
            batch.children?.forEach(child => {
              child.name = [batch.name, child.name].join(', ');
            });
          }
        });

      // Enable sampling batch, in VRAC batches
      TreeItemEntityUtils.findByFilter(
        model,
        BatchModelFilter.fromObject(<Partial<BatchModelFilter>>{
          parentFilter: <BatchModelFilter>{
            measurementValues: {
              [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD,
            },
          },
          measurementValues: {
            [PmfmIds.BATCH_SORTING]: QualitativeValueIds.BATCH_SORTING.BULK,
          },
          hidden: false, // Exclude if no pmfms
        })
      ).forEach((batch) => {
        const weightPmfms = (batch.childrenPmfms || []).filter(PmfmUtils.isWeight).map((p) => p.clone());
        if (isNotEmptyArray(weightPmfms)) {
          // Add weights PMFM (if not found)
          const initialPmfms = removeDuplicatesFromArray([...batch.state?.initialPmfms, ...weightPmfms], 'id');

          // Update the state, to enable weight (and sampling weight)
          batch.state = {
            ...batch.state,
            initialPmfms,
            showWeight: true,
            requiredWeight: true,
            showSamplingBatch: true,
            showSampleWeight: true,
            requiredSampleWeight: true,
            samplingBatchEnabled: true,
          };
        }
      });
    }

    // Remove discard batch, if not allowed
    else {
      const discardFilter = BatchModelFilter.fromObject(<Partial<BatchModelFilter>>{
        measurementValues: {
          [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD
        }
      });
      TreeItemEntityUtils.deleteByFilter(model, discardFilter);
    }

    // Translate the root name
    if (!model.parent && model.name)  {
      model.name = this.translate.instant(model.name);
    }

    return model;
  }

  createFormGroupByModel(model: BatchModel, opts: {
    allowSpeciesSampling: boolean;
    isOnFieldMode?: boolean;
    updateOn?: ControlUpdateOnType;
  }): UntypedFormGroup {
    if (!model) throw new Error('Missing required argument \'model\'');
    if (!opts) throw new Error('Missing required argument \'opts\'');

    // DEBUG
    console.debug(`- ${model.originalData?.label} ${model.path}`);

    const weightPmfms = model.weightPmfms;
    const withWeight = isNotEmptyArray(weightPmfms);
    // Init weight object
    if (withWeight) {
      model.originalData.weight = BatchUtils.getWeight(model.originalData, model.weightPmfms);
    }
    if (model.isLeaf && isNotEmptyArray(model.originalData.children)) {
      const childrenWeightPmfms = (model.childrenPmfms || []).filter(PmfmUtils.isWeight);
      if (isNotEmptyArray(childrenWeightPmfms)) {
        model.originalData.children.forEach(batch => {
          batch.weight = BatchUtils.getWeight(batch, childrenWeightPmfms);
          const samplingBatch = BatchUtils.getSamplingChild(batch);
          if (samplingBatch) samplingBatch.weight = BatchUtils.getWeight(samplingBatch, childrenWeightPmfms);
        });
      }
    }
    const form = this.getFormGroup(model.originalData as T, <O>{
      pmfms: model.pmfms,
      withMeasurements: true,
      withMeasurementTypename: true,
      withWeight,
      weightRequired: opts.isOnFieldMode === false && withWeight,
      withChildren: model.isLeaf, // if NOT a leaf, children control will be created using model (see bellow)
      childrenPmfms: model.isLeaf && model.childrenPmfms,
      allowSpeciesSampling: opts.allowSpeciesSampling,
      isOnFieldMode: opts.isOnFieldMode,
      updateOn: opts.updateOn
    });

    // Update model valid marker (check this BEFORE to add the children form array)
    model.valid = form.valid;
    if (form.invalid) {
      AppFormUtils.logFormErrors(form, '[batch-model-validator] ' + model.name + ' > ');
    }

    // Recursive call, on each children model
    if (!model.isLeaf) {
      const childrenFormArray = new AppFormArray<BatchModel, UntypedFormGroup>(
        (m) => this.createFormGroupByModel(m, opts),
        BatchModel.equals,
        BatchModel.isEmpty,
        {
          allowReuseControls: false,
          allowEmptyArray: true,
          updateOn: opts?.updateOn
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
          allowEmptyArray: true,
          updateOn: opts?.updateOn
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

      if (isNotEmptyArray(opts.childrenPmfms)) {
        // DEBUG
        //console.debug(`[batch-model-validator] ${data?.label} Creating children form array, with pmfms: `, opts.childrenPmfms);

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
      // E.g. individual measures
      else {
        config['children'] = this.formBuilder.array([]);

        // TODO add individual measures pmfms
        /*config['children'] = this.getChildrenFormArray(data?.children, {
          withWeight: false,
          withMeasurements: true,
          ...opts,
          allowSamplingBatch: undefined,
          withChildren: false,
          pmfms: opts.individualPmfms || null,
        });*/
      }
    }

    // Add measurement values
    if (opts?.withMeasurements) {
      if (isNotEmptyArray(opts.pmfms)) {
        config['measurementValues'] = this.getMeasurementValuesForm(data?.measurementValues, {
          pmfms: opts.pmfms,
          forceOptional: false, // We always need full validation, in model form
          withTypename: opts.withMeasurementTypename,
          updateOn: opts?.updateOn
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

  protected fillDefaultRules(opts?: {allowDiscard?: boolean, rules?: Rule[], pmfmPath?: string}): Rule[] {
    const allowDiscard = opts?.allowDiscard !== false;
    const pmfmPath = opts?.pmfmPath || 'pmfm.';

    // Full tree (Landing + discard)
    if (allowDiscard) {
      return [
        ...(opts?.rules || []),
        // Landing rules
        Rule.fromObject(<Partial<Rule>>{
          precondition: true,
          filter: ({model}) => PmfmValueUtils.equals(model.originalData.measurementValues[PmfmIds.DISCARD_OR_LANDING], QualitativeValueIds.DISCARD_OR_LANDING.LANDING),
          // FIXME failed when reload batch (e.g. after a save())
          //controlledAttribute: `model.originalData.measurementValues.${PmfmIds.DISCARD_OR_LANDING}`,
          //operator: '=',
          //value: QualitativeValueIds.DISCARD_OR_LANDING.LANDING.toString(),

          // Avoid discard pmfms
          children: this.batchRules.getNotDiscardPmfms(pmfmPath)
        }),

        // Discard rules
        Rule.fromObject(<Partial<Rule>>{
          precondition: true,
          filter: ({model}) => PmfmValueUtils.equals(model.originalData.measurementValues[PmfmIds.DISCARD_OR_LANDING], QualitativeValueIds.DISCARD_OR_LANDING.DISCARD)
             || PmfmValueUtils.equals(model.parent?.originalData.measurementValues[PmfmIds.DISCARD_OR_LANDING], QualitativeValueIds.DISCARD_OR_LANDING.DISCARD),
          // FIXME failed when reload batch (e.g. after a save())
          //controlledAttribute: `model.originalData.measurementValues.${PmfmIds.DISCARD_OR_LANDING}`,
          //operator: '=',
          //value: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD.toString(),

          // Avoid landing pmfms
          children: this.batchRules.getNotLandingPmfms(pmfmPath)
        })
      ];
    }

    // Landing only (No discard)
    else {
      return [
        ...(opts?.rules || []),
        // No discard pmfms
        ...this.batchRules.getNotDiscardPmfms(pmfmPath)
      ];
    }
  }

}
