import { inject, Injectable } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { isEmptyArray, isNil, isNotNil, LocalSettingsService, ReferentialRef, TreeItemEntityUtils } from '@sumaris-net/ngx-components';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Batch, BatchAsObjectOptions, BatchFromObjectOptions } from '@app/trip/batch/common/batch.model';
import { TranslateService } from '@ngx-translate/core';
import { BatchModel, BatchModelFilter, BatchModelUtils } from '@app/trip/batch/tree/batch-tree.model';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { Rule } from '@app/referential/services/model/rule.model';
import { BatchModelValidatorOptions, BatchModelValidatorService } from '@app/trip/batch/tree/batch-model.validator';
import { PhysicalGearService } from '@app/trip/physicalgear/physicalgear.service';

@Injectable({ providedIn: 'root' })
export class SelectivityBatchModelValidatorService<
  T extends Batch<T> = Batch,
  O extends BatchModelValidatorOptions = BatchModelValidatorOptions,
  AO extends BatchAsObjectOptions = BatchAsObjectOptions,
  FO extends BatchFromObjectOptions = BatchFromObjectOptions
> extends BatchModelValidatorService<T, O, AO, FO> {
  private physicalGearService = inject(PhysicalGearService);

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

      physicalGear: PhysicalGear;

      rules?: Rule[];
    }
  ): Promise<BatchModel> {
    const physicalGear = opts.physicalGear;
    if (!physicalGear) throw new Error("Missing required argument 'opts.physicalGear'");

    // Load physical gear's children (if not already done)
    if (isEmptyArray(physicalGear.children) && isNotNil(physicalGear.tripId)) {
      // DEBUG
      console.debug("[selectivity-batch-model-validator] Load physical gear's children:", physicalGear);
      physicalGear.children = await this.physicalGearService.loadAllByParentId({ tripId: physicalGear.tripId, parentGearId: physicalGear.id });
    }

    // Map sorting pmfms
    const sortingPmfms = (opts.sortingPmfms || [])
      .map((p) => {
        // Fill CHILD_GEAR qualitative values, with the given opts.physicalGear
        if (p.id === PmfmIds.CHILD_GEAR) {
          // Convert to referential item
          p = p.clone();
          p.type = 'qualitative_value';
          p.qualitativeValues = (opts.physicalGear?.children || []).map((pg) =>
            ReferentialRef.fromObject({
              id: pg.rankOrder,
              label: pg.rankOrder,
              name: pg.measurementValues[PmfmIds.GEAR_LABEL] || pg.gear.name,
            })
          );
          if (isEmptyArray(p.qualitativeValues)) {
            console.warn(`[batch-model-validator] Unable to fill items for Pmfm#${p.id} (${p.label})`);
          } else {
            // DEBUG
            console.debug(`[batch-model-validator] Fill CHILD_GEAR PMFM, with:`, p.qualitativeValues);
          }
        }

        return p;
      })
      .filter(isNotNil);

    const model = await super.createModel(data, { ...opts, sortingPmfms });
    if (!model) return;

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
          showExhaustiveInventory: false,
        };
      }
    });

    if (this.debug) BatchModelUtils.logTree(model);

    return model;
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);
    return opts;
  }
}
