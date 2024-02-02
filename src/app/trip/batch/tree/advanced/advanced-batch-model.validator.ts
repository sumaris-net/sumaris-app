import { Injectable } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { isNil, isNotEmptyArray, LocalSettingsService, removeDuplicatesFromArray, TreeItemEntityUtils } from '@sumaris-net/ngx-components';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Batch, BatchAsObjectOptions, BatchFromObjectOptions } from '@app/trip/batch/common/batch.model';
import { TranslateService } from '@ngx-translate/core';
import { BatchModel, BatchModelFilter, BatchModelUtils } from '@app/trip/batch/tree/batch-tree.model';
import { PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { Rule } from '@app/referential/services/model/rule.model';
import { BatchModelValidatorOptions, BatchModelValidatorService } from '@app/trip/batch/tree/batch-model.validator';

@Injectable({ providedIn: 'root' })
export class AdvancedBatchModelValidatorService<
  T extends Batch<T> = Batch,
  O extends BatchModelValidatorOptions = BatchModelValidatorOptions,
  AO extends BatchAsObjectOptions = BatchAsObjectOptions,
  FO extends BatchFromObjectOptions = BatchFromObjectOptions
> extends BatchModelValidatorService<T, O, AO, FO> {
  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings, measurementsValidatorService);
  }

  createModel(
    data: Batch | undefined,
    opts: {
      allowDiscard: boolean;
      sortingPmfms: IPmfm[];
      catchPmfms: IPmfm[];
      rules?: Rule[];
    }
  ): BatchModel {
    if (!opts) throw new Error("Missing required argument 'opts'");

    // Create a batch model
    const model = super.createModel(data, opts);
    if (!model) return;

    // Enable weight and sampling batch weight, in landing batch
    TreeItemEntityUtils.findByFilter(
      model,
      BatchModelFilter.fromObject(<Partial<BatchModelFilter>>{
        parent: {
          measurementValues: {
            [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.LANDING,
          },
        },
        hidden: false, // Exclude if no pmfms
        leaf: true,
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

    // Initialize exhaustiveInventory, on each leaf
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

    if (this.debug) BatchModelUtils.logTree(model);

    return model;
  }

  protected fillDefaultRules(opts?: { allowDiscard?: boolean; rules?: Rule[] }): Rule[] {
    return super.fillDefaultRules(opts);
  }
}
