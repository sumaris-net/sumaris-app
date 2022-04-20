import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import {
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  LocalSettingsService,
  ReferentialRef,
  SharedAsyncValidators,
  SharedValidators,
  toNumber
} from '@sumaris-net/ngx-components';
import { Batch, BatchWeight } from '../common/batch.model';
import { SubBatch } from './sub-batch.model';
import { Subscription } from 'rxjs';
import { BatchWeightValidator } from '@app/trip/batch/common/batch.validator';
import { LocationLevelIds, MethodIds, PmfmIds, QualitativeValueIds, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { DataEntityValidatorOptions, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { WeightLengthConversionRefService } from '@app/referential/weight-length-conversion/weight-length-conversion-ref.service';
import { FishingArea } from '@app/data/services/model/fishing-area.model';
import { LocationUtils } from '@app/referential/location/location.utils';
import { VesselPosition } from '@app/data/services/model/vessel-position.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import * as momentImported from 'moment';
import { Moment } from 'moment';
import { BatchErrorCodes } from '@app/trip/batch/batch.errors';
import { environment } from '@environments/environment';
import { RoundWeightConversionRefService } from '@app/referential/round-weight-conversion/round-weight-conversion-ref.service';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { convertWeight, isLengthUnitSymbol, isWeightUnitSymbol } from '@app/referential/services/model/model.utils';
import { DataContext } from '@app/data/services/model/data-context.model';
import { BatchGroup, BatchGroupUtils } from '@app/trip/batch/group/batch-group.model';
import { ContextService } from '@app/shared/context.service';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';

const moment = momentImported;

export interface BatchContext extends DataContext {
  parentGroup?: BatchGroup;
}
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
    protected wlService: WeightLengthConversionRefService,
    protected rwService: RoundWeightConversionRefService,
    protected context: ContextService<BatchContext>
    ) {
    super(formBuilder, settings);
    console.debug(`[sub-batch-validator] Creating validator (context: ${this.context.constructor.name})`);
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
      const weightPmfm = (opts?.pmfms || []).find(PmfmUtils.isWeight);
      form.addControl('weight', this.getWeightFormGroup(null, {
        required: opts?.weightRequired,
        pmfm: weightPmfm
      }));
    }
    else if (!withWeight && form.controls.weight) {
      form.removeControl('weight');
    }
  }

  async enableWeightLengthConversion(form: FormGroup, opts: {
    pmfms: IPmfm[];
    qvPmfm?: IPmfm;
    // Context
    rectangleLabel?: string;
    date?: Moment;
    parentGroup?: BatchGroup;
    countryId?: number;
    // Weight
    weightRequired?: boolean;
    weightPath?: string;
    // Length
    lengthPath?: string;
    lengthPmfmId?: number;
    // UI
    debug?: boolean;
    markForCheck?: () => void;
    onError?: (err) => void;
  }): Promise<Subscription> {

    if (!this.context) {
      console.warn('[sub-batch-validator] Cannot enable weight conversion. Missing data context');
      return;
    }
    const date = opts?.date || this.context?.getValueAsDate('date') || moment();
    const countryId = opts.countryId || (this.context?.getValue('country') as ReferentialRef)?.id;
    const parentGroup = opts.parentGroup || this.context?.getValue('parentGroup') as BatchGroup;
    let rectangleLabel = opts?.rectangleLabel || this.getContextualStatisticalRectangle();
    const qvPmfm = opts?.qvPmfm;

    // DEBUG
    if (!rectangleLabel && !environment.production) {
      rectangleLabel = '65F1'
      console.warn('[sub-batch-validator] TODO: force rectangle label (for DEV) to ' + rectangleLabel);
    }
    // Make sure to have a statistical rectangle
    if (!rectangleLabel) {
      console.warn('[sub-batch-validator] Cannot enable weight conversion. No statistical rectangle (in options or data context)');
      if (opts?.onError) opts?.onError({code: BatchErrorCodes.WEIGHT_LENGTH_CONVERSION_NO_RECTANGLE, message: 'TRIP.SUB_BATCH.ERROR.WEIGHT_LENGTH_CONVERSION_NO_RECTANGLE'})
      return null;
    }

    // Find the length Pmfm
    const lengthPmfms = isNotNil(opts.lengthPmfmId)
      ? (opts.pmfms || []).filter(p => p.id === opts.lengthPmfmId)
      : (opts.pmfms || []).filter(PmfmUtils.isLength);
    if (isEmptyArray(lengthPmfms)) {
      console.warn('[sub-batch-validator] Cannot enable weight conversion. No length PMFMs found in list:', opts?.pmfms);
      if (opts?.onError) opts?.onError({code: BatchErrorCodes.WEIGHT_LENGTH_CONVERSION_NO_LENGTH_PMFM, message: 'TRIP.SUB_BATCH.ERROR.WEIGHT_LENGTH_CONVERSION_NO_LENGTH_PMFM'})
      return null;
    }

    // Get the PMFM to use to store computed weight
    const weightPmfm = (opts.pmfms || []).find(p => PmfmUtils.isWeight(p) && p.methodId === MethodIds.CALCULATED_WEIGHT_LENGTH)
    || DenormalizedPmfmStrategy.fromObject(<IPmfm>{
        id: PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH,
        required: opts.weightRequired,
        methodId: MethodIds.CALCULATED_WEIGHT_LENGTH,
        unitLabel: <WeightUnitSymbol>'kg',
        minValue: 0,
        maximumNumberDecimals: SubBatchValidators.DEFAULT_WEIGHT_LENGTH_CONVERSION_MAX_DECIMALS
    });

    // Create weight form
    let weightControl = form.get('weight');
    if (!weightControl) {
      weightControl = this.getWeightFormGroup(null, {
        required: opts?.weightRequired,
        maxDecimals: toNumber(weightPmfm?.maximumNumberDecimals, SubBatchValidators.DEFAULT_WEIGHT_LENGTH_CONVERSION_MAX_DECIMALS),
        pmfm: weightPmfm
      });
      form.addControl('weight', weightControl);
    }
    if (weightControl.enabled) weightControl.disable({emitEvent: false});

    // DEBUG
    console.debug('[sub-batch-validator] Enable weight length conversion:',
      {date, rectangleLabel, countryId, lengthPmfms, weightPmfm, parentGroup, qvPmfm});

    return SharedAsyncValidators.registerAsyncValidator(form,
      SubBatchValidators.weightLengthConversion(this.wlService, this.rwService,
        {...opts,
          date, rectangleLabel, countryId,
          lengthPmfms, weightPmfm, parentGroup, qvPmfm
      }),
      {markForCheck: opts?.markForCheck, debug: true});
  }

  protected getWeightFormGroup(data?: BatchWeight, opts? :{
    required?: boolean;
    maxDecimals?: number;
    pmfm?: IPmfm;
  }): FormGroup {
    // DEBUG
    console.debug('[sub-batch-validator] Creating weight form group...', opts);
    return this.formBuilder.group(BatchWeightValidator.getFormGroupConfig(data, opts));
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

  /**
   * Default maxDecimals, for a weight calculated by a Weight-Length conversion
   */
  static DEFAULT_WEIGHT_LENGTH_CONVERSION_MAX_DECIMALS = 6;

  static weightLengthConversion(wlService: WeightLengthConversionRefService,
                                rwService: RoundWeightConversionRefService,
                                opts?: {
                                  // Context
                                  rectangleLabel: string;
                                  date: Moment;
                                  countryId?: number;
                                  // Weight
                                  weightPath?: string;
                                  weightPmfm?: IPmfm;
                                  // Length
                                  lengthPmfms: IPmfm[];
                                  // Reference Taxon
                                  taxonNamePath?: string;
                                  // Parent
                                  parentPath?: string;
                                  parentGroup?: BatchGroup;
                                  qvPmfm?: IPmfm;
  }): ValidatorFn {


    return (control) => SubBatchValidators.computeWeightLengthConversion(control as FormGroup,
      wlService, rwService,
      {...opts, emitEvent: false, onlySelf: false})
  }

  /**
   * Converting length into a weight
   * @param form
   * @param wlService
   * @param rwService
   * @param opts
   */
  private static async computeWeightLengthConversion(form: FormGroup,
                                                     wlService: WeightLengthConversionRefService,
                                                     rwService: RoundWeightConversionRefService,
                                                     opts: {
                                                       emitEvent?: boolean;
                                                       onlySelf?: boolean;
                                                       // Context
                                                       rectangleLabel: string
                                                       date: Moment;
                                                       countryId?: number;
                                                       // Weight
                                                       weightPath?: string;
                                                       weightPmfm?: IPmfm;
                                                       // Reference Taxon
                                                       taxonNamePath?: string;
                                                       // Sex
                                                       sexPmfmId?: number;
                                                       sexPath?: string;
                                                       // Length
                                                       lengthPmfms: IPmfm[];
                                                       // nb indiv
                                                       individualCountPath?: string;
                                                       // Parent
                                                       parentPath?: string;
                                                       parentGroup?: BatchGroup;
                                                       qvPmfm?: IPmfm;
                                                     }) : Promise<ValidationErrors | null> {

    const taxonNamePath = opts.taxonNamePath || 'taxonName';
    const sexPmfmId = toNumber(opts.sexPmfmId, PmfmIds.SEX).toString();
    const sexPath = opts?.sexPath || `measurementValues.${sexPmfmId}`;
    const individualCountPath = opts.individualCountPath || `individualCount`;
    const weightPath = opts.weightPath || 'weight';
    const parentPath = opts.parentPath || 'parent';
    const qvPath = isNotNil(opts.qvPmfm?.id) && `measurementValues.${opts.qvPmfm.id}` || undefined;

    const date = opts.date || moment();
    const month = date.month();
    const year = date.year();

    // Find the length Pmfm with a value
    let lengthPmfmIndex = 0;
    const lengthControl = (opts.lengthPmfms || [])
      .map(pmfm => form.get(`measurementValues.${pmfm.id}`))
      .find((control, i) => {
        lengthPmfmIndex = i;
        return control && isNotNil(control.value);
      });
    if (!lengthControl) {
      console.warn('[sub-batch-validator] Cannot apply conversion: no length found');
      return;
    }
    const lengthPmfm =  opts.lengthPmfms[lengthPmfmIndex];

    const taxonNameControl = form.get(taxonNamePath);
    const individualCountControl = form.get(individualCountPath);
    const sexControl = form.get(sexPath);
    const weightControl = form.get(weightPath);
    const parentControl = form.get(parentPath);
    const qvControl = qvPath && form.get(qvPath);

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
    const weightUnit = isWeightUnitSymbol(opts.weightPmfm?.unitLabel) ? opts.weightPmfm.unitLabel : 'kg';
    const qvValue = qvControl?.value;
    const parentGroup: BatchGroup = parentControl.value || opts.parentGroup;

    // DEBUG
    console.debug('[sub-batch-validator] Start weight-length conversion: ',
      {...opts, taxonName: taxonName?.label, sex: sex?.label, lengthPmfm, length});

    // Check required values
    if (isNil(referenceTaxonId) || isNilOrBlank(opts.rectangleLabel) || isNil(lengthPmfm)) {
      console.warn('[sub-batch-validator] Cannot apply conversion');
      return;
    }

    // Compute weight, using length
    if (isNotNilOrNaN(length) && length > 0) {

      // Find a Weight-Length conversion
      const wlConversion = await wlService.findAppliedConversion({
        ...opts, month, year, lengthPmfmId: lengthPmfm.id, referenceTaxonId, sexId: sex?.id
      });

      // Compute weight
      let computedWeightKg = wlConversion && wlService.computeWeight(wlConversion, length, {
        individualCount,
        lengthUnit: isLengthUnitSymbol(lengthPmfm.unitLabel) ? lengthPmfm.unitLabel : undefined,
        lengthPrecision: lengthPmfm.precision,
        weightUnit: 'kg'
      });

      // DEBUG
      if (computedWeightKg) console.debug(`[sub-batch-validator] Computed weight (alive): ${computedWeightKg}kg`);

      // Convert from alive weight, into given dressing
      // Parent

      if (computedWeightKg && parentGroup) {
        const taxonGroupId = parentGroup.taxonGroup?.id;

        const parent = qvValue ? BatchGroupUtils.findChildByQvValue(parentGroup, qvValue, opts.qvPmfm) : parentGroup;
        const dressingId = parent.measurementValues && PmfmValueUtils.toModelValue(parent.measurementValues[PmfmIds.DRESSING], {type: 'qualitative_value'});
        if (isNotNil(taxonGroupId) && isNotNil(dressingId)) {
          const preservingId = parent.measurementValues && PmfmValueUtils.toModelValue(parent.measurementValues[PmfmIds.PRESERVATION], {type: 'qualitative_value'})
            || QualitativeValueIds.PRESERVATION.FRESH;

          // Find a round weight conversion
          const rwConversion = await rwService.findAppliedConversion({
            ...opts, date, taxonGroupId, dressingId: +dressingId, preservingId: +preservingId, locationId: opts.countryId
          })

          // Apply round weight (inverse) conversion
          if (rwConversion) {
            computedWeightKg = computedWeightKg / rwConversion.conversionCoefficient;

            console.debug(`[sub-batch-validator] Computed weight (dressing): ${computedWeightKg}kg`);
          }
        }
      }

      // Convert to expected weight Unit
      if (computedWeightKg && weightUnit !== 'kg') {
        computedWeightKg = convertWeight(computedWeightKg, 'kg', weightUnit);
      }
      if (isNotNilOrNaN(computedWeightKg)) {

        // Round to HALF_UP
        const maxDecimals = toNumber(opts.weightPmfm?.maximumNumberDecimals, SubBatchValidators.DEFAULT_WEIGHT_LENGTH_CONVERSION_MAX_DECIMALS);
        const precision = Math.pow(10, maxDecimals);
        const value = (Math.trunc(computedWeightKg * precision + 0.5) / precision).toFixed(maxDecimals);

        const weight: BatchWeight = weightControl.value;
        if (!weight || +weight.value !== +value) {

          // DEBUG
          console.info(`[sub-batch-validator] Computed weight, by length conversion: ${value}${weightUnit}`);

          weightControl.patchValue({
            value,
            methodId: MethodIds.CALCULATED_WEIGHT_LENGTH,
            computed: true,
            estimated: false
          }, opts);
        }
      }
      else {
        const previousWeight: BatchWeight = weightControl.value;
        if (previousWeight.computed === true && isNotNil(previousWeight.value)) {

          // DEBUG
          console.debug('[sub-batch-validator] Reset previously computed weight');

          weightControl.patchValue({
            value: null,
            computed: false,
            estimated: false
          }, opts);

        }
      }
    }

    return undefined;
  }
}
