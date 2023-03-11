import {Injectable} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';
import {
  DateUtils,
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
import {Batch, BatchWeight} from '../common/batch.model';
import {SubBatch} from './sub-batch.model';
import {Subscription} from 'rxjs';
import {BatchWeightValidator} from '@app/trip/batch/common/batch.validator';
import {LocationLevelIds, MethodIds, PmfmIds, QualitativeValueIds, WeightUnitSymbol} from '@app/referential/services/model/model.enum';
import {DataEntityValidatorOptions, DataEntityValidatorService} from '@app/data/services/validator/data-entity.validator';
import {IPmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import {WeightLengthConversionRefService} from '@app/referential/taxon/weight-length-conversion/weight-length-conversion-ref.service';
import {FishingArea} from '@app/data/services/model/fishing-area.model';
import {LocationUtils} from '@app/referential/location/location.utils';
import {VesselPosition} from '@app/data/services/model/vessel-position.model';
import {TaxonNameRef} from '@app/referential/services/model/taxon-name.model';
import moment, {Moment} from 'moment';
import {BatchErrorCodes} from '@app/trip/batch/batch.errors';
import {RoundWeightConversionRefService} from '@app/referential/taxon-group/round-weight-conversion/round-weight-conversion-ref.service';
import {DenormalizedPmfmStrategy} from '@app/referential/services/model/pmfm-strategy.model';
import {isLengthUnitSymbol, isWeightUnitSymbol, WeightUtils} from '@app/referential/services/model/model.utils';
import {DataContext} from '@app/data/services/model/data-context.model';
import {BatchGroup, BatchGroupUtils} from '@app/trip/batch/group/batch-group.model';
import {ContextService} from '@app/shared/context.service';
import {PmfmValueUtils} from '@app/referential/services/model/pmfm-value.model';
import {TranslateService} from '@ngx-translate/core';
import {PositionUtils} from '@app/trip/services/position.utils';

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

@Injectable(
  // Canot be root, because we need to inject context dynamically
  //{providedIn: 'root'}
)
export class SubBatchValidatorService extends DataEntityValidatorService<SubBatch, SubBatchValidatorValidatorOptions> {

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected wlService: WeightLengthConversionRefService,
    protected rwService: RoundWeightConversionRefService,
    protected context: ContextService<BatchContext>
    ) {
    super(formBuilder, translate, settings);

    // DEBUG
    //console.debug(`[sub-batch-validator] Creating validator (context: ${this.context?.constructor.name})`);
  }

  getFormGroupConfig(data?: SubBatch, opts?: SubBatchValidatorValidatorOptions): { [p: string]: any } {

    const rankOrder = toNumber(data?.rankOrder, null);
    return {
      __typename: [Batch.TYPENAME],
      id: [toNumber(data?.id, null)],
      updateDate: [data?.updateDate || null],
      rankOrder: !opts || opts.rankOrderRequired !== false ? [rankOrder, Validators.required] : [rankOrder],
      label: [data?.label || null],
      individualCount: [toNumber(data?.individualCount, null), Validators.compose([Validators.min(1), SharedValidators.integer])],
      samplingRatio: [typeof data?.samplingRatio === 'object' ? null : toNumber(data?.samplingRatio, null), SharedValidators.empty], // Make no sense to have sampling ratio
      samplingRatioText: [data?.samplingRatioText || null, SharedValidators.empty], // Make no sense to have sampling ratio
      taxonGroup: [data?.taxonGroup || null, SharedValidators.entity],
      taxonName: [data?.taxonName || null, SharedValidators.entity],
      comments: [data?.comments || null],
      parent: [data?.parent || null, SharedValidators.object],
      measurementValues: this.formBuilder.group({}),

      // Specific for SubBatch
      parentGroup: [data?.parentGroup || null, Validators.compose([Validators.required, SharedValidators.object])]
    };
  }

  getFormGroup(data?: SubBatch, opts?: SubBatchValidatorValidatorOptions): UntypedFormGroup {
    const form = super.getFormGroup(data, opts);

    // Add weight sub form
    if (opts?.withWeight) {
      const weightPmfm = this.getWeightLengthPmfm({required: opts?.weightRequired, pmfms: opts?.pmfms});
      form.addControl('weight', this.getWeightFormGroup(data?.weight, {
        required: opts?.weightRequired,
        pmfm: weightPmfm
      }));
    }

    return form;
  }

  updateFormGroup(form: UntypedFormGroup, opts?: SubBatchValidatorValidatorOptions) {

    // Add/remove weight form group, if need
    if (opts?.withWeight) {
      if (!form.controls.weight) {
        const weightPmfm = this.getWeightLengthPmfm({ required: opts?.weightRequired, pmfms: opts?.pmfms });
        form.addControl('weight', this.getWeightFormGroup(null, {
          required: opts?.weightRequired,
          pmfm: weightPmfm
        }));
      }
    }
    else if (form.controls.weight) {
      form.removeControl('weight');
    }
  }

  getWeightLengthPmfm(opts: {pmfms?: IPmfm[], required?: boolean}){
    opts = opts || {};
    return (opts.pmfms || []).find(p => PmfmUtils.isWeight(p) && p.methodId === MethodIds.CALCULATED_WEIGHT_LENGTH)
    || DenormalizedPmfmStrategy.fromObject(<IPmfm>{
      id: PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH,
      required: opts.required || false,
      methodId: MethodIds.CALCULATED_WEIGHT_LENGTH,
      unitLabel: <WeightUnitSymbol>'kg',
      minValue: 0,
      maximumNumberDecimals: SubBatchValidators.DEFAULT_WEIGHT_LENGTH_CONVERSION_MAX_DECIMALS
    })
  }

  enableWeightLengthConversion(form: UntypedFormGroup, opts: {
    pmfms: IPmfm[];
    qvPmfm?: IPmfm;
    // Context
    rectangleLabel?: string;
    date?: Moment;
    countryId?: number;
    // Parent
    parentGroupPath?: string;
    parentGroup?: BatchGroup;
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
  }): Subscription {

    if (!this.context) {
      console.warn('[sub-batch-validator] Cannot enable weight conversion. Missing data context');
      return;
    }
    const date = opts?.date || this.context?.getValueAsDate('date') || moment();
    const countryId = opts.countryId || (this.context?.getValue('country') as ReferentialRef)?.id;
    const parentGroup = opts.parentGroup
      || (opts?.parentGroupPath && form.get(opts.parentGroupPath))?.value
      || this.context?.getValue('parentGroup') as BatchGroup;
    const rectangleLabel = opts?.rectangleLabel || this.getContextualStatisticalRectangle();
    const qvPmfm = opts?.qvPmfm;

    // DEBUG
    // if (!rectangleLabel && !environment.production) {
    //   rectangleLabel = '65F1'
    //   console.warn('[sub-batch-validator] TODO: force rectangle label (for DEV) to ' + rectangleLabel);
    // }

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
    const weightPmfm = this.getWeightLengthPmfm({required: opts?.weightRequired, pmfms: opts?.pmfms});

    // Create weight form
    let weightControl = form.get('weight');
    if (!weightControl) {
      weightControl = this.getWeightFormGroup(null, {
        required: opts?.weightRequired,
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
  }): UntypedFormGroup {
    // DEBUG
    console.debug('[sub-batch-validator] Creating weight form group...', opts);
    return this.formBuilder.group(BatchWeightValidator.getFormGroupConfig(data, opts));
  }

  protected getContextualStatisticalRectangle(): string | undefined {

    // Read fishing Areas
    const fishingAreas = this.context?.getValue('fishingAreas') as FishingArea[];
    if (isNotEmptyArray(fishingAreas)) {
      console.debug('[sub-batch-validator] Trying to get statistical rectangle, from fishing areas ...');
      const rectangle = (fishingAreas || [])
          .map(fa => fa.location)
          .filter(isNotNil)
          .find(location => isNil(location.levelId) || (location.levelId === LocationLevelIds.ICES_RECTANGLE || location.levelId === LocationLevelIds.GFCM_RECTANGLE));
      if (isNotNilOrBlank(rectangle?.label)) {
        console.debug('[sub-batch-validator] Find statistical rectangle: ' + rectangle.label);
        return rectangle.label;
      }
      // Continue
    }

    // Read vessel positions
    const vesselPositions = this.context?.getValue('vesselPositions') as VesselPosition[];
    if (isNotEmptyArray(vesselPositions)) {
      console.debug('[sub-batch-validator] Trying to get statistical rectangle, from positions ...');
      const rectangleLabel = (vesselPositions || []).slice()// Copy before reverse()
        .reverse() // Last position first
        .filter(p => PositionUtils.isNotNilAndValid(p))
        .map(position => LocationUtils.getRectangleLabelByLatLong(position.latitude, position.longitude))
        .find(isNotNil);
      if (rectangleLabel) console.debug('[sub-batch-validator] Find statistical rectangle: ' + rectangleLabel);
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
                                  parentGroupPath?: string;
                                  parentGroup?: BatchGroup;
                                  qvPmfm?: IPmfm;
  }): ValidatorFn {


    return (control) => SubBatchValidators.computeWeightLengthConversion(control as UntypedFormGroup,
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
  private static async computeWeightLengthConversion(form: UntypedFormGroup,
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
                                                       parentGroupPath?: string;
                                                       parentGroup?: BatchGroup;
                                                       qvPmfm?: IPmfm;
                                                     }) : Promise<ValidationErrors | null> {

    const taxonNamePath = opts.taxonNamePath || 'taxonName';
    const sexPmfmId = toNumber(opts.sexPmfmId, PmfmIds.SEX).toString();
    const sexPath = opts?.sexPath || `measurementValues.${sexPmfmId}`;
    const individualCountPath = opts.individualCountPath || `individualCount`;
    const weightPath = opts.weightPath || 'weight';
    const parentPath = opts.parentGroupPath || 'parentGroup';
    const qvPath = isNotNil(opts.qvPmfm?.id) && `measurementValues.${opts.qvPmfm.id}` || undefined;

    const date = opts.date || DateUtils.moment();
    const month = date.month() + 1; // month() return 0 for januray
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
    const weightMeasurementControl = opts?.weightPmfm && form.get(`measurementValues.${opts.weightPmfm.id}`);

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
    const parentGroup: BatchGroup = opts.parentGroup || parentControl?.value;

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
      const wlConversion = await wlService.loadByFilter({
        month, year,
        lengthPmfmId: lengthPmfm.id,
        referenceTaxonId,
        sexId: toNumber(sex?.id, QualitativeValueIds.SEX.UNSEXED), // Unsexed by default
        rectangleLabel: opts.rectangleLabel
      });

      // Compute weight
      let value = wlService.computeWeight(wlConversion, length, {
        individualCount,
        lengthUnit: isLengthUnitSymbol(lengthPmfm.unitLabel) ? lengthPmfm.unitLabel : undefined,
        lengthPrecision: lengthPmfm.precision,
        weightUnit: 'kg'
      });

      // DEBUG
      if (value) console.debug(`[sub-batch-validator] Alive weight = ${value}kg`);

      // Convert from alive weight, into given dressing
      // Parent

      if (value && parentGroup) {
        const taxonGroupId = parentGroup.taxonGroup?.id;

        const parent = qvValue && BatchGroupUtils.findChildByQvValue(parentGroup, qvValue, opts.qvPmfm) || parentGroup;
        const dressingId = parent?.measurementValues && PmfmValueUtils.toModelValue(parent.measurementValues[PmfmIds.DRESSING], {type: 'qualitative_value'});
        if (isNotNil(taxonGroupId) && isNotNil(dressingId)) {
          const preservingId = parent.measurementValues && PmfmValueUtils.toModelValue(parent.measurementValues[PmfmIds.PRESERVATION], {type: 'qualitative_value'})
            || QualitativeValueIds.PRESERVATION.FRESH;

          // Find a round weight conversion
          const rwConversion = await rwService.loadByFilter({
            date, taxonGroupId, dressingId: +dressingId, preservingId: +preservingId, locationId: opts.countryId
          });

          // Apply round weight (inverse) conversion
          if (rwConversion) {
            value = rwService.inverseAliveWeight(rwConversion, value);
            console.debug(`[sub-batch-validator] Dressing/preservation weight = ${value}kg`);
          }
        }
      }

      // Convert to expected weight Unit
      if (value && weightUnit !== 'kg') {
        // FIXME check this works !
        value = WeightUtils.convert(value, 'kg', weightUnit);
      }

      const weight: BatchWeight = weightControl.value;
      if (isNotNilOrNaN(value)) {

        // Round to HALF_UP
        const maxDecimals = toNumber(opts.weightPmfm?.maximumNumberDecimals, SubBatchValidators.DEFAULT_WEIGHT_LENGTH_CONVERSION_MAX_DECIMALS);
        const precision = Math.pow(10, maxDecimals);
        const valueStr = (Math.trunc(value * precision + 0.5) / precision).toFixed(maxDecimals);

        let weight: BatchWeight = weightControl.value;
        if (!weight || +weight.value !== +valueStr) {
          // DEBUG
          console.info(`[sub-batch-validator] Computed weight, by length conversion: ${value}${weightUnit}`);

          weightControl.patchValue(<BatchWeight>{
            value: +valueStr,
            methodId: MethodIds.CALCULATED_WEIGHT_LENGTH,
            computed: true,
            estimated: false
          }, opts);
        }
        if (weightMeasurementControl && +weightMeasurementControl.value !== +valueStr) {
          weightMeasurementControl?.setValue(valueStr, opts);
        }
      }
      else {
        if (!weight || weight.computed === true && isNotNil(weight.value)) {

          // DEBUG
          console.debug('[sub-batch-validator] Reset previously computed weight');

          weightControl.patchValue(<BatchWeight>{
            value: null,
            computed: false,
            estimated: false,
            methodId: null
          }, opts);
          weightMeasurementControl?.setValue(null, opts);
        }
      }
    }

    return undefined;
  }
}
