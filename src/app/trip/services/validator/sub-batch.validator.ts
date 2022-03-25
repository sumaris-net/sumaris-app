import { Injectable, Optional } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import {
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  LocalSettingsService,
  SharedAsyncValidators,
  SharedValidators,
  toNumber
} from '@sumaris-net/ngx-components';
import { Batch, BatchWeight } from '../model/batch.model';
import { SubBatch } from '../model/subbatch.model';
import { Subscription } from 'rxjs';
import { BatchWeightValidator } from '@app/trip/services/validator/batch.validator';
import { LocationLevelIds, PmfmIds } from '@app/referential/services/model/model.enum';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { DataEntityValidatorOptions, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { WeightLengthConversionRefService } from '@app/referential/weight-length-conversion/weight-length-conversion-ref.service';
import { FishingArea } from '@app/data/services/model/fishing-area.model';
import { LocationUtils } from '@app/referential/location/location.utils';
import { VesselPosition } from '@app/data/services/model/vessel-position.model';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { DataContextService } from '@app/data/services/data-context.service';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { Moment } from 'moment';
import * as momentImported from 'moment';

const moment = momentImported;

export interface SubBatchValidatorValidatorOptions extends DataEntityValidatorOptions {
  withWeight?: boolean;
  weightRequired?: boolean;
  rankOrderRequired?: boolean;
  withMeasurements?: boolean;
  pmfms?: IPmfm[];
}

@Injectable()
export class SubBatchValidatorService extends DataEntityValidatorService<SubBatch, SubBatchValidatorValidatorOptions> {

  constructor(
    formBuilder: FormBuilder,
    settings: LocalSettingsService,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected wlcRefService: WeightLengthConversionRefService,
    @Optional() protected context?: DataContextService
    ) {
    super(formBuilder, settings);
    console.debug(`[sub-batch-validator] Creating validator (context: ${this.context?.constructor.name || 'none'})`);
  }

  getFormGroupConfig(data?: SubBatch, opts?: SubBatchValidatorValidatorOptions): { [p: string]: any } {

    const rankOrder = toNumber(data && data.rankOrder, null);
    return {
      __typename: [Batch.TYPENAME],
      id: [toNumber(data && data.id, null)],
      updateDate: [data && data.updateDate || null],
      rankOrder: !opts || opts.rankOrderRequired !== false ? [rankOrder, Validators.required] : [rankOrder],
      label: [data && data.label || null],
      individualCount: [toNumber(data && data.individualCount, null), Validators.compose([Validators.min(1), SharedValidators.integer])],
      samplingRatio: [toNumber(data && data.samplingRatio, null), SharedValidators.empty], // Make no sense to have sampling ratio
      samplingRatioText: [data && data.samplingRatioText || null, SharedValidators.empty], // Make no sense to have sampling ratio
      taxonGroup: [data && data.taxonGroup || null, SharedValidators.entity],
      taxonName: [data && data.taxonName || null, SharedValidators.entity],
      comments: [data && data.comments || null],
      parent: [data && data.parent || null, SharedValidators.object],
      measurementValues: this.formBuilder.group({}),

      // Specific for SubBatch
      parentGroup: [data && data.parentGroup || null, Validators.compose([Validators.required, SharedValidators.object])]
    };
  }

  getFormGroup(data?: SubBatch, opts?: SubBatchValidatorValidatorOptions): FormGroup {
    const form = super.getFormGroup(data, opts);

    // Add weight sub form
    if (opts?.withWeight) {
      form.addControl('weight', this.getWeightFormGroup(data && data.weight, {
        required: opts?.weightRequired
      }));
    }

    return form;
  }

  updateFormGroup(form: FormGroup, opts?: SubBatchValidatorValidatorOptions) {

    const withWeight = opts?.withWeight || false;

    // Add/remove weight form group, if need
    if (withWeight && !form.controls.weight) {
      form.addControl('weight', this.getWeightFormGroup(null, {
        required: opts?.weightRequired
      }));
    }
    else if (!withWeight && form.controls.weight) {
      form.removeControl('weight');
    }
  }

  enableWeightLengthConversion(form: FormGroup, opts: {
    // Context
    rectangleLabel?: string;
    date?: Moment;
    // Weight
    weightRequired?: boolean;
    weightPath?: string;
    // Length
    lengthPath?: string;
    lengthPmfmId?: number;
    pmfms?: IPmfm[];
    // UI
    debug?: boolean;
    markForCheck?: () => void;
  }): Subscription {

    if (!this.context) {
      console.warn('[sub-batch-validator] Cannot enable weight conversion. Missing data context');
      return;
    }

    // Make sure to have a statistical rectangle
    const rectangleLabel = opts?.rectangleLabel || this.getContextualStatisticalRectangle();
    if (!rectangleLabel) {
      console.warn('[sub-batch-validator] Cannot enable weight conversion. No statistical rectangle found in options or data context');
      return null;
    }

    // Find the length Pmfm
    const lengthPmfmIds = opts?.pmfms && opts.pmfms
        .filter(p => p.id === opts.lengthPmfmId || p.label.indexOf('LENGTH') !== -1)
        .map(p => p.id)
      || (isNotNil(opts.lengthPmfmId) ? [opts.lengthPmfmId] : undefined);
    if (isEmptyArray(lengthPmfmIds)) {
      console.warn('[sub-batch-validator] Cannot enable weight conversion. No length PMFMs found in list:', opts?.pmfms);
      return null;
    }

    const date = opts?.date || this.getContextualDate();
    const month = date.month();
    const year = date.year();
    console.info(`[sub-batch-validator] Enable weight length conversion: {month: ${month}, year: ${year}, rectangle: '${rectangleLabel}', pmfms: [${lengthPmfmIds.join(',')}]`);

    // Create weight form if need
    if (!form.controls.weight) {
      form.addControl('weight', this.getWeightFormGroup(null, {
        required: opts?.weightRequired
      }));
    }

    return SharedAsyncValidators.registerAsyncValidator(form,
      SubBatchValidators.weightLengthConversion(this.wlcRefService, {...opts,
        month, year, rectangleLabel, lengthPmfmIds
      }),
      {markForCheck: opts?.markForCheck});
  }

  protected getWeightFormGroup(data?: BatchWeight, opts? :{
    required?: boolean
  }): FormGroup {
    return this.formBuilder.group(BatchWeightValidator.getFormGroupConfig(data, opts));
  }

  protected getContextualDate(): Moment {
    return this.context?.getValue('date') as Moment || moment();
  }

  protected getContextualStatisticalRectangle(): string | undefined {

    // Read fishing Areas
    const fishingAreas = this.context?.getValue('fishingAreas') as FishingArea[];
    if (isNotEmptyArray(fishingAreas)) {
      console.debug('Trying to get rectangle from fishing areas: ', fishingAreas);
      const rectangle = (fishingAreas || [])
          .map(fa => fa.location)
          .filter(isNotNil)
          .find(location => isNil(location.levelId) || (location.levelId === LocationLevelIds.ICES_RECTANGLE || location.levelId === LocationLevelIds.GFCM_RECTANGLE));
      if (isNotNilOrBlank(rectangle?.label)) {
        return rectangle.label;
      }
      // Continue
    }

    // Read vessel positions
    const vesselPositions = this.context?.getValue('vesselPositions') as VesselPosition[];
    if (isNotEmptyArray(vesselPositions)) {
      console.debug('Trying to get rectangle from position: ', vesselPositions);
      const rectangleLabel = (vesselPositions || [])
        .map(position => LocationUtils.getRectangleLabelByLatLong(position.latitude, position.longitude))
        .find(isNotNil);
      return rectangleLabel;
    }
  }
}

export class SubBatchValidators {

  static weightLengthConversion(service: WeightLengthConversionRefService,
                                opts?: {
                                  // Context
                                  rectangleLabel: string;
                                  month: number;
                                  year: number;
                                  // Weight
                                  weightPath?: string;
                                  // Length
                                  lengthPmfmIds: number[];
                                  // Reference Taxon
                                  taxonNamePath?: string;
  }): ValidatorFn {


    return (control) => SubBatchValidators.computeWeightLengthConversion(control as FormGroup,
      service,
      {...opts, emitEvent: false, onlySelf: false})
  }

  /**
   * Converting length into a weight
   * @param form
   * @param opts
   */
  private static async computeWeightLengthConversion(form: FormGroup,
                                               service: WeightLengthConversionRefService,
                                               opts: {
                                                 emitEvent?: boolean;
                                                 onlySelf?: boolean;
                                                 // Context
                                                 rectangleLabel: string
                                                 month: number;
                                                 year: number;
                                                 // Weight
                                                 weightPath?: string;
                                                 // Reference Taxon
                                                 taxonNamePath?: string;
                                                 // Sex
                                                 sexPmfmId?: number;
                                                 sexPath?: string;
                                                 // Length
                                                 lengthPmfmIds: number[],
                                                 // nb indiv
                                                 individualCountPath?: string
  }) : Promise<ValidationErrors | null> {

    const taxonNamePath = opts.taxonNamePath || 'taxonName';
    const sexPmfmId = toNumber(opts.sexPmfmId, PmfmIds.SEX).toString();
    const sexPath = opts?.sexPath || `measurementValues.${sexPmfmId}`;
    const individualCountPath = opts.individualCountPath || `individualCount`;
    const weightPath = opts.weightPath || 'weight';

    let lengthPmfmIndex = 0;
    const lengthControl = opts.lengthPmfmIds
      .map(pmfmId => form.get(`measurementValues.${pmfmId}`))
      .find((control, i) => {
        lengthPmfmIndex = i;
        return control && isNotNil(control.value);
      });
    if (!lengthControl) {
      console.warn('[batch-validator] Cannot apply conversion: no length found');
      return;
    }
    const lengthPmfmId =  opts.lengthPmfmIds[lengthPmfmIndex];

    const taxonNameControl = form.get(taxonNamePath);
    const individualCountControl = form.get(individualCountPath);
    const sexControl = form.get(sexPath);
    const weightControl = form.get(weightPath);

    // Check controls
    if (!taxonNameControl) throw Error(`Cannot resolve control with path: '${taxonNamePath}'`);
    if (!individualCountControl) throw Error(`Cannot resolve control with path: '${individualCountPath}'`);
    if (!weightControl) throw Error(`Cannot resolve control with path: '${weightPath}'`);

    if (lengthControl.disabled) lengthControl.enable(opts);
    if (weightControl.disabled) weightControl.enable(opts);

    const length = toNumber(lengthControl.value, null);
    const taxonName = taxonNameControl.value as TaxonNameRef;
    const referenceTaxonId = taxonName?.referenceTaxonId;
    const individualCount = toNumber(individualCountControl?.value, 1);
    const sex = sexControl?.value;

    // DEBUG
    console.debug('[batch-validator] Start weight-length conversion: ',
      [opts.month,  opts.year, opts.rectangleLabel, taxonName?.label, sex?.label, lengthPmfmId, length]);

    // Check required values
    if (isNil(referenceTaxonId) || isNilOrBlank(opts.rectangleLabel) || isNil(lengthPmfmId)) {
      console.warn('[batch-validator] Cannot apply conversion');
      return;
    }

    // Compute weight, using length
    if (isNotNilOrNaN(length) && length > 0) {

      // Find a conversion
      const conversion = await service.findAppliedConversion({
        ...opts, lengthPmfmId, referenceTaxonId, sexId: sex?.id
      });

      // Compute the weight
      let computedWeight = conversion && service.computeWeight(conversion, length, {
        individualCount, unit: 'kg'
      });

      if (isNotNilOrNaN(computedWeight)) {
        console.debug('[batch-validator] Computed weight :' + computedWeight);

        // Convert to round weight

        const weight: BatchWeight = weightControl.value;
        if (!weight || weight.value !== computedWeight) {
          // DEBUG
          console.debug('[batch-validator] New computed weight: ', [computedWeight]);
          weightControl.patchValue({
            value: computedWeight,
            computed: true,
            estimated: false
          }, opts);
        }
      }
    }

    return undefined;
  }
}
