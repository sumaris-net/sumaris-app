import { inject, Injectable } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import {
  isNil,
  isNotEmptyArray,
  LocalSettingsService,
  removeDuplicatesFromArray,
  TranslateContextService,
  TreeItemEntityUtils,
} from '@sumaris-net/ngx-components';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Batch, BatchAsObjectOptions, BatchFromObjectOptions } from '@app/trip/batch/common/batch.model';
import { TranslateService } from '@ngx-translate/core';
import { BatchModel, BatchModelFilter, BatchModelUtils } from '@app/trip/batch/tree/batch-tree.model';
import { PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { Rule } from '@app/referential/services/model/rule.model';
import { BatchModelValidatorOptions, BatchModelValidatorService } from '@app/trip/batch/tree/batch-model.validator';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';

@Injectable({ providedIn: 'root' })
export class AdvancedBatchModelValidatorService<
  T extends Batch<T> = Batch,
  O extends BatchModelValidatorOptions = BatchModelValidatorOptions,
  AO extends BatchAsObjectOptions = BatchAsObjectOptions,
  FO extends BatchFromObjectOptions = BatchFromObjectOptions,
> extends BatchModelValidatorService<T, O, AO, FO> {
  protected translateContext = inject(TranslateContextService);

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings, measurementsValidatorService);
  }

  async createModel(
    data: Batch | undefined,
    opts: {
      allowDiscard: boolean;
      sortingPmfms: IPmfm[];
      catchPmfms: IPmfm[];
      // Optional
      rules?: Rule[];
      i18nSuffix?: string;
    }
  ): Promise<BatchModel> {
    if (!opts) throw new Error("Missing required argument 'opts'");
    const allowDiscard = opts?.allowDiscard !== false;

    // Rename Landing/Discard
    const sortingPmfms = (opts?.sortingPmfms || []).map((pmfm) => {
      if (pmfm.id === PmfmIds.DISCARD_OR_LANDING) {
        pmfm = pmfm.clone();
        pmfm.qualitativeValues = pmfm.qualitativeValues.map((qv) => {
          qv = qv.clone();
          if (qv.id === QualitativeValueIds.DISCARD_OR_LANDING.LANDING) {
            qv.name = this.translateContext.instant(`TRIP.BATCH.PMFM_QUALITATIVE_VALUES.DISCARD_OR_LANDING.LANDING`, opts?.i18nSuffix);
          } else if (qv.id === QualitativeValueIds.DISCARD_OR_LANDING.DISCARD) {
            qv.name = this.translateContext.instant(`TRIP.BATCH.PMFM_QUALITATIVE_VALUES.DISCARD_OR_LANDING.DISCARD`, opts?.i18nSuffix);
          }
          return qv;
        });
      }
      return pmfm;
    });

    // Create a batch model
    const model = await super.createModel(data, { ...opts, sortingPmfms });
    if (!model) return;

    // Enable weight and sampling batch weight, in landing batch
    TreeItemEntityUtils.findByFilter(
      model,
      BatchModelFilter.fromObject({
        or: <BatchModelFilter[]>[
          {
            parentFilter: <BatchModelFilter>{
              measurementValues: {
                [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.LANDING,
              },
            },
            pmfmIds: [PmfmIds.LANDING_CATEGORY],
          },
          {
            parentFilter: <BatchModelFilter>{
              measurementValues: {
                [PmfmIds.IS_SAMPLING]: QualitativeValueIds.IS_SAMPLING.YES,
              },
            },
            pmfmIds: [PmfmIds.DISCARD_TYPE],
          },
        ],
        hidden: false, // Exclude if no pmfms
        leaf: true,
      })
    ).forEach((batch) => {
      const weightPmfms = (batch.childrenPmfms || []).filter(PmfmUtils.isWeight).map((p) => p.clone());
      if (isNotEmptyArray(weightPmfms)) {
        // Add weights PMFM (if not found)
        const initialPmfms = removeDuplicatesFromArray([...(batch.state?.initialPmfms || []), ...weightPmfms], 'id');

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

    if (allowDiscard) {
      // No sampling batch (Non détaillé)
      TreeItemEntityUtils.findByFilter(
        model,
        BatchModelFilter.fromObject(<Partial<BatchModelFilter>>{
          measurementValues: {
            [PmfmIds.IS_SAMPLING]: QualitativeValueIds.IS_SAMPLING.NO,
          },
          hidden: false, // Exclude if no pmfms
          leaf: false,
        })
      ).forEach((batch) => {
        const firstChild = batch.children?.[0];
        const firstChildPmfm = firstChild?.pmfms?.[0];
        if (firstChildPmfm?.type === 'qualitative_value') {
          firstChildPmfm.hidden = false;
          firstChildPmfm.defaultValue = null;
          firstChildPmfm.qualitativeValues = firstChildPmfm.qualitativeValues?.filter((qv) => qv.id !== QualitativeValueIds.DISCARD_TYPE.EMV);
          batch.childrenPmfms = firstChild?.pmfms;
          batch.childrenState = {
            ...batch.childrenState,
            showTaxonGroupColumn: false,
            showTaxonNameColumn: false,
            showSamplingBatchColumns: false,
            showIndividualCountColumns: false,
            showAutoFillButton: true,
            allowSubBatches: false,
          };
          batch.children = [];
          batch.isLeaf = true;

          // Auto fill data
          if (batch.originalData && !batch.originalData.children) {
            const labelPrefix = (batch.originalData.label += '.');
            batch.originalData.children = firstChildPmfm.qualitativeValues.map((qv, index) => {
              return Batch.fromObject({
                rankOrder: index + 1,
                label: labelPrefix + (qv.label || index + 1),
                measurementValues: {
                  [firstChildPmfm.id]: qv.id.toString(),
                },
              });
            });
          }
        }
      });

      // No INV, under :
      // - Discard / Vrac / Détaillé
      // - Discard / Hors Vrac
      TreeItemEntityUtils.findByFilter(
        model,
        BatchModelFilter.fromObject(<Partial<BatchModelFilter>>{
          parent: {
            or: [
              {
                measurementValues: {
                  [PmfmIds.IS_SAMPLING]: QualitativeValueIds.IS_SAMPLING.YES,
                },
              },
              {
                measurementValues: {
                  [PmfmIds.BATCH_SORTING]: QualitativeValueIds.BATCH_SORTING.NON_BULK,
                },
              },
            ],
          },
          measurementValues: {
            [PmfmIds.DISCARD_TYPE]: QualitativeValueIds.DISCARD_TYPE.INV,
          },
          hidden: false, // Exclude if no pmfms
          leaf: false,
        })
      ).forEach((batch) => batch.remove());

      // EMV
      TreeItemEntityUtils.findByFilter(
        model,
        BatchModelFilter.fromObject(<Partial<BatchModelFilter>>{
          measurementValues: {
            [PmfmIds.DISCARD_TYPE]: QualitativeValueIds.DISCARD_TYPE.EMV,
          },
          hidden: false, // Exclude if no pmfms
          leaf: true,
        })
      ).forEach((batch) => {
        batch.childrenState = {
          ...batch.childrenState,
          showTaxonGroupColumn: false,
          showTaxonNameColumn: false,
          showSamplingBatchColumns: false,
          showIndividualCountColumns: false,
          showAutoFillButton: true,
          allowSubBatches: false,
        };
      });
    }

    // Initialize exhaustiveInventory=true, on each leaf
    TreeItemEntityUtils.findByFilter(
      model,
      BatchModelFilter.fromObject(<Partial<BatchModelFilter>>{
        hidden: false, // Exclude if no pmfms
        isLeaf: true,
      })
    ).forEach((leafBatch) => {
      if (isNil(leafBatch.state.showExhaustiveInventory)) {
        leafBatch.state = {
          ...leafBatch.state,
          showExhaustiveInventory: true,
        };
      }
    });

    // Disabled empty node
    TreeItemEntityUtils.filterRecursively(model, (model) => model.parent && !model.isLeaf && !(model.pmfms || []).some((p) => !p.hidden)).forEach(
      (model) => {
        model.disabled = true;
      }
    );

    if (this.debug) BatchModelUtils.logTree(model);

    return model;
  }

  protected fillDefaultRules(opts?: { allowDiscard?: boolean; rules?: Rule[]; pmfmPath?: string }): Rule[] {
    const pmfmPath = opts?.pmfmPath || 'pmfm.';

    return [
      ...super.fillDefaultRules(opts),

      // Discard / Hors-Vrac rules
      Rule.fromObject(<Partial<Rule>>{
        precondition: true,
        filter: ({ model }) =>
          PmfmValueUtils.equals(model.originalData.measurementValues[PmfmIds.BATCH_SORTING], QualitativeValueIds.BATCH_SORTING.NON_BULK),

        // Avoid IS_SAMPLING (Détaillé / Non détaillé)
        children: [
          Rule.fromObject(<Partial<Rule>>{
            label: 'no-is-sampling-pmfm',
            controlledAttribute: `${pmfmPath}id`,
            operator: '!=',
            values: [PmfmIds.IS_SAMPLING.toString()],
            message: 'Batch sorting pmfm not allowed',
          }),
        ],
      }),

      /* // Discard / Inerte et Végétaux
      Rule.fromObject(<Partial<Rule>>{
        precondition: true,
        filter: ({ model }) => PmfmValueUtils.equals(model.originalData.measurementValues[PmfmIds.IS_SAMPLING], QualitativeValueIds.IS_SAMPLING.YES),

        // Avoid IS_SAMPLING (Détaillé / Non détaillé)
        children: [
          Rule.fromObject(<Partial<Rule>>{
            label: 'no-inv-pmfm',
            controlledAttribute: `${pmfmPath}id`,
            operator: '!=',
            values: [PmfmIds.IS_SAMPLING.toString()],
            message: 'Batch sorting pmfm not allowed',
          }),
        ],
      }),*/
    ];
  }
}
