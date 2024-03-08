import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { DateUtils, isEmptyArray, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, isNotNilOrBlank, isNotNilOrNaN, LocalSettingsService, SharedAsyncValidators, SharedValidators, toNumber, } from '@sumaris-net/ngx-components';
import { Batch } from '../common/batch.model';
import { BatchWeightValidator } from '@app/trip/batch/common/batch.validator';
import { LocationLevelIds, MethodIds, PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { WeightLengthConversionRefService } from '@app/referential/taxon-name/weight-length-conversion/weight-length-conversion-ref.service';
import { LocationUtils } from '@app/referential/location/location.utils';
import moment from 'moment';
import { BatchErrorCodes } from '@app/trip/batch/batch.errors';
import { RoundWeightConversionRefService } from '@app/referential/taxon-group/round-weight-conversion/round-weight-conversion-ref.service';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { isLengthUnitSymbol, isWeightUnitSymbol, WeightUtils } from '@app/referential/services/model/model.utils';
import { BatchGroupUtils } from '@app/trip/batch/group/batch-group.model';
import { ContextService } from '@app/shared/context.service';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { TranslateService } from '@ngx-translate/core';
import { PositionUtils } from '@app/data/position/position.utils';
let SubBatchValidatorService = class SubBatchValidatorService extends DataEntityValidatorService {
    constructor(formBuilder, translate, settings, wlService, rwService, context) {
        super(formBuilder, translate, settings);
        this.wlService = wlService;
        this.rwService = rwService;
        this.context = context;
        // DEBUG
        //console.debug(`[sub-batch-validator] Creating validator (context: ${this.context?.constructor.name})`);
    }
    getFormGroupConfig(data, opts) {
        const rankOrder = toNumber(data === null || data === void 0 ? void 0 : data.rankOrder, null);
        return {
            __typename: [Batch.TYPENAME],
            id: [toNumber(data === null || data === void 0 ? void 0 : data.id, null)],
            updateDate: [(data === null || data === void 0 ? void 0 : data.updateDate) || null],
            rankOrder: !opts || opts.rankOrderRequired !== false ? [rankOrder, Validators.required] : [rankOrder],
            label: [(data === null || data === void 0 ? void 0 : data.label) || null],
            individualCount: [toNumber(data === null || data === void 0 ? void 0 : data.individualCount, null), Validators.compose([Validators.min(1), SharedValidators.integer])],
            samplingRatio: [typeof (data === null || data === void 0 ? void 0 : data.samplingRatio) === 'object' ? null : toNumber(data === null || data === void 0 ? void 0 : data.samplingRatio, null), SharedValidators.empty],
            samplingRatioText: [(data === null || data === void 0 ? void 0 : data.samplingRatioText) || null, SharedValidators.empty],
            taxonGroup: [(data === null || data === void 0 ? void 0 : data.taxonGroup) || null, SharedValidators.entity],
            taxonName: [(data === null || data === void 0 ? void 0 : data.taxonName) || null, SharedValidators.entity],
            comments: [(data === null || data === void 0 ? void 0 : data.comments) || null],
            parent: [(data === null || data === void 0 ? void 0 : data.parent) || null, SharedValidators.object],
            measurementValues: this.formBuilder.group({}),
            // Specific for SubBatch
            parentGroup: [(data === null || data === void 0 ? void 0 : data.parentGroup) || null, Validators.compose([Validators.required, SharedValidators.object])]
        };
    }
    getFormGroup(data, opts) {
        const form = super.getFormGroup(data, opts);
        // Add weight sub form
        if (opts === null || opts === void 0 ? void 0 : opts.withWeight) {
            const weightPmfm = this.getWeightLengthPmfm({ required: opts === null || opts === void 0 ? void 0 : opts.weightRequired, pmfms: opts === null || opts === void 0 ? void 0 : opts.pmfms });
            form.addControl('weight', this.getWeightFormGroup(data === null || data === void 0 ? void 0 : data.weight, {
                required: opts === null || opts === void 0 ? void 0 : opts.weightRequired,
                pmfm: weightPmfm
            }));
        }
        return form;
    }
    updateFormGroup(form, opts) {
        // Add/remove weight form group, if need
        if (opts === null || opts === void 0 ? void 0 : opts.withWeight) {
            if (!form.controls.weight) {
                const weightPmfm = this.getWeightLengthPmfm({ required: opts === null || opts === void 0 ? void 0 : opts.weightRequired, pmfms: opts === null || opts === void 0 ? void 0 : opts.pmfms });
                form.addControl('weight', this.getWeightFormGroup(null, {
                    required: opts === null || opts === void 0 ? void 0 : opts.weightRequired,
                    pmfm: weightPmfm
                }));
            }
        }
        else if (form.controls.weight) {
            form.removeControl('weight');
        }
    }
    getWeightLengthPmfm(opts) {
        opts = opts || {};
        return (opts.pmfms || []).find(p => PmfmUtils.isWeight(p) && p.methodId === MethodIds.CALCULATED_WEIGHT_LENGTH)
            || DenormalizedPmfmStrategy.fromObject({
                id: PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH,
                required: opts.required || false,
                methodId: MethodIds.CALCULATED_WEIGHT_LENGTH,
                unitLabel: 'kg',
                minValue: 0,
                maximumNumberDecimals: SubBatchValidators.DEFAULT_WEIGHT_LENGTH_CONVERSION_MAX_DECIMALS
            });
    }
    enableWeightLengthConversion(form, opts) {
        var _a, _b, _c, _d, _e;
        if (!this.context) {
            console.warn('[sub-batch-validator] Cannot enable weight conversion. Missing data context');
            return;
        }
        const date = (opts === null || opts === void 0 ? void 0 : opts.date) || ((_a = this.context) === null || _a === void 0 ? void 0 : _a.getValueAsDate('date')) || moment();
        const countryId = opts.countryId || ((_c = (_b = this.context) === null || _b === void 0 ? void 0 : _b.getValue('country')) === null || _c === void 0 ? void 0 : _c.id);
        const parentGroup = opts.parentGroup
            || ((_d = ((opts === null || opts === void 0 ? void 0 : opts.parentGroupPath) && form.get(opts.parentGroupPath))) === null || _d === void 0 ? void 0 : _d.value)
            || ((_e = this.context) === null || _e === void 0 ? void 0 : _e.getValue('parentGroup'));
        const rectangleLabel = (opts === null || opts === void 0 ? void 0 : opts.rectangleLabel) || this.getContextualStatisticalRectangle();
        const qvPmfm = opts === null || opts === void 0 ? void 0 : opts.qvPmfm;
        // DEBUG
        // if (!rectangleLabel && !environment.production) {
        //   rectangleLabel = '65F1'
        //   console.warn('[sub-batch-validator] TODO: force rectangle label (for DEV) to ' + rectangleLabel);
        // }
        // Make sure to have a statistical rectangle
        if (!rectangleLabel) {
            console.warn('[sub-batch-validator] Cannot enable weight conversion. No statistical rectangle (in options or data context)');
            if (opts === null || opts === void 0 ? void 0 : opts.onError)
                opts === null || opts === void 0 ? void 0 : opts.onError({ code: BatchErrorCodes.WEIGHT_LENGTH_CONVERSION_NO_RECTANGLE, message: 'TRIP.SUB_BATCH.ERROR.WEIGHT_LENGTH_CONVERSION_NO_RECTANGLE' });
            return null;
        }
        // Find the length Pmfm
        const lengthPmfms = isNotNil(opts.lengthPmfmId)
            ? (opts.pmfms || []).filter(p => p.id === opts.lengthPmfmId)
            : (opts.pmfms || []).filter(PmfmUtils.isLength);
        if (isEmptyArray(lengthPmfms)) {
            console.warn('[sub-batch-validator] Cannot enable weight conversion. No length PMFMs found in list:', opts === null || opts === void 0 ? void 0 : opts.pmfms);
            if (opts === null || opts === void 0 ? void 0 : opts.onError)
                opts === null || opts === void 0 ? void 0 : opts.onError({ code: BatchErrorCodes.WEIGHT_LENGTH_CONVERSION_NO_LENGTH_PMFM, message: 'TRIP.SUB_BATCH.ERROR.WEIGHT_LENGTH_CONVERSION_NO_LENGTH_PMFM' });
            return null;
        }
        // Get the PMFM to use to store computed weight
        const weightPmfm = this.getWeightLengthPmfm({ required: opts === null || opts === void 0 ? void 0 : opts.weightRequired, pmfms: opts === null || opts === void 0 ? void 0 : opts.pmfms });
        // Create weight form
        let weightControl = form.get('weight');
        if (!weightControl) {
            weightControl = this.getWeightFormGroup(null, {
                required: opts === null || opts === void 0 ? void 0 : opts.weightRequired,
                pmfm: weightPmfm
            });
            form.addControl('weight', weightControl);
        }
        if (weightControl.enabled)
            weightControl.disable({ emitEvent: false });
        // DEBUG
        console.debug('[sub-batch-validator] Enable weight length conversion:', { date, rectangleLabel, countryId, lengthPmfms, weightPmfm, parentGroup, qvPmfm });
        return SharedAsyncValidators.registerAsyncValidator(form, SubBatchValidators.weightLengthConversion(this.wlService, this.rwService, Object.assign(Object.assign({}, opts), { date, rectangleLabel, countryId,
            lengthPmfms, weightPmfm, parentGroup, qvPmfm })), { markForCheck: opts === null || opts === void 0 ? void 0 : opts.markForCheck, debug: true });
    }
    getWeightFormGroup(data, opts) {
        // DEBUG
        console.debug('[sub-batch-validator] Creating weight form group...', opts);
        return this.formBuilder.group(BatchWeightValidator.getFormGroupConfig(data, opts));
    }
    getContextualStatisticalRectangle() {
        var _a, _b;
        // Read fishing Areas
        const fishingAreas = (_a = this.context) === null || _a === void 0 ? void 0 : _a.getValue('fishingAreas');
        if (isNotEmptyArray(fishingAreas)) {
            console.debug('[sub-batch-validator] Trying to get statistical rectangle, from fishing areas ...');
            const rectangle = (fishingAreas || [])
                .map(fa => fa.location)
                .filter(isNotNil)
                .find(location => isNil(location.levelId) || (location.levelId === LocationLevelIds.RECTANGLE_ICES || location.levelId === LocationLevelIds.RECTANGLE_GFCM));
            if (isNotNilOrBlank(rectangle === null || rectangle === void 0 ? void 0 : rectangle.label)) {
                console.debug('[sub-batch-validator] Find statistical rectangle: ' + rectangle.label);
                return rectangle.label;
            }
            // Continue
        }
        // Read vessel positions
        const vesselPositions = (_b = this.context) === null || _b === void 0 ? void 0 : _b.getValue('vesselPositions');
        if (isNotEmptyArray(vesselPositions)) {
            console.debug('[sub-batch-validator] Trying to get statistical rectangle, from positions ...');
            const rectangleLabel = (vesselPositions || []).slice() // Copy before reverse()
                .reverse() // Last position first
                .filter(p => PositionUtils.isNotNilAndValid(p))
                .map(position => LocationUtils.getRectangleLabelByLatLong(position.latitude, position.longitude))
                .find(isNotNil);
            if (rectangleLabel)
                console.debug('[sub-batch-validator] Find statistical rectangle: ' + rectangleLabel);
            return rectangleLabel;
        }
    }
};
SubBatchValidatorService = __decorate([
    Injectable(
    // Cannot be root, because we need to inject context dynamically
    //{providedIn: 'root'}
    ),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService,
        WeightLengthConversionRefService,
        RoundWeightConversionRefService,
        ContextService])
], SubBatchValidatorService);
export { SubBatchValidatorService };
export class SubBatchValidators {
    static weightLengthConversion(wlService, rwService, opts) {
        return (control) => SubBatchValidators.computeWeightLengthConversion(control, wlService, rwService, Object.assign(Object.assign({}, opts), { emitEvent: false, onlySelf: false }));
    }
    /**
     * Converting length into a weight
     *
     * @param form
     * @param wlService
     * @param rwService
     * @param opts
     */
    static computeWeightLengthConversion(form, wlService, rwService, opts) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const taxonNamePath = opts.taxonNamePath || 'taxonName';
            const sexPmfmId = toNumber(opts.sexPmfmId, PmfmIds.SEX).toString();
            const sexPath = (opts === null || opts === void 0 ? void 0 : opts.sexPath) || `measurementValues.${sexPmfmId}`;
            const individualCountPath = opts.individualCountPath || `individualCount`;
            const weightPath = opts.weightPath || 'weight';
            const parentPath = opts.parentGroupPath || 'parentGroup';
            const qvPath = isNotNil((_a = opts.qvPmfm) === null || _a === void 0 ? void 0 : _a.id) && `measurementValues.${opts.qvPmfm.id}` || undefined;
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
            const lengthPmfm = opts.lengthPmfms[lengthPmfmIndex];
            const taxonNameControl = form.get(taxonNamePath);
            const individualCountControl = form.get(individualCountPath);
            const sexControl = form.get(sexPath);
            const weightControl = form.get(weightPath);
            const parentControl = form.get(parentPath);
            const qvControl = qvPath && form.get(qvPath);
            const weightMeasurementControl = (opts === null || opts === void 0 ? void 0 : opts.weightPmfm) && form.get(`measurementValues.${opts.weightPmfm.id}`);
            // Check controls
            if (!taxonNameControl)
                throw Error(`Cannot resolve control with path: '${taxonNamePath}'`);
            if (!individualCountControl)
                throw Error(`Cannot resolve control with path: '${individualCountPath}'`);
            if (!weightControl)
                throw Error(`Cannot resolve control with path: '${weightPath}'`);
            if (lengthControl.disabled)
                lengthControl.enable(opts);
            if (weightControl.disabled)
                weightControl.enable(opts);
            const length = toNumber(lengthControl.value, null);
            const taxonName = taxonNameControl.value;
            const referenceTaxonId = taxonName === null || taxonName === void 0 ? void 0 : taxonName.referenceTaxonId;
            const individualCount = toNumber(individualCountControl === null || individualCountControl === void 0 ? void 0 : individualCountControl.value, 1);
            const sex = sexControl === null || sexControl === void 0 ? void 0 : sexControl.value;
            const weightUnit = isWeightUnitSymbol((_b = opts.weightPmfm) === null || _b === void 0 ? void 0 : _b.unitLabel) ? opts.weightPmfm.unitLabel : 'kg';
            const qvValue = qvControl === null || qvControl === void 0 ? void 0 : qvControl.value;
            const parentGroup = opts.parentGroup || (parentControl === null || parentControl === void 0 ? void 0 : parentControl.value);
            // DEBUG
            console.debug('[sub-batch-validator] Start weight-length conversion: ', Object.assign(Object.assign({}, opts), { taxonName: taxonName === null || taxonName === void 0 ? void 0 : taxonName.label, sex: sex === null || sex === void 0 ? void 0 : sex.label, lengthPmfm, length }));
            // Check required values
            if (isNil(referenceTaxonId) || isNilOrBlank(opts.rectangleLabel) || isNil(lengthPmfm)) {
                console.warn('[sub-batch-validator] Cannot apply conversion');
                return;
            }
            // Compute weight, using length
            if (isNotNilOrNaN(length) && length > 0) {
                // Find a Weight-Length conversion
                const wlConversion = yield wlService.loadByFilter({
                    month, year,
                    lengthPmfmId: lengthPmfm.id,
                    referenceTaxonId,
                    sexId: toNumber(sex === null || sex === void 0 ? void 0 : sex.id, QualitativeValueIds.SEX.UNSEXED),
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
                if (value)
                    console.debug(`[sub-batch-validator] Alive weight = ${value}kg`);
                // Convert from alive weight, into given dressing
                // Parent
                if (value && parentGroup) {
                    const taxonGroupId = (_c = parentGroup.taxonGroup) === null || _c === void 0 ? void 0 : _c.id;
                    const parent = qvValue && BatchGroupUtils.findChildByQvValue(parentGroup, qvValue, opts.qvPmfm) || parentGroup;
                    const dressingId = (parent === null || parent === void 0 ? void 0 : parent.measurementValues) && PmfmValueUtils.toModelValue(parent.measurementValues[PmfmIds.DRESSING], { type: 'qualitative_value' });
                    if (isNotNil(taxonGroupId) && isNotNil(dressingId)) {
                        const preservingId = parent.measurementValues && PmfmValueUtils.toModelValue(parent.measurementValues[PmfmIds.PRESERVATION], { type: 'qualitative_value' })
                            || QualitativeValueIds.PRESERVATION.FRESH;
                        // Find a round weight conversion
                        const rwConversion = yield rwService.loadByFilter({
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
                const weight = weightControl.value;
                if (isNotNilOrNaN(value)) {
                    // Round to HALF_UP
                    const maxDecimals = toNumber((_d = opts.weightPmfm) === null || _d === void 0 ? void 0 : _d.maximumNumberDecimals, SubBatchValidators.DEFAULT_WEIGHT_LENGTH_CONVERSION_MAX_DECIMALS);
                    const precision = Math.pow(10, maxDecimals);
                    const valueStr = (Math.trunc(value * precision + 0.5) / precision).toFixed(maxDecimals);
                    if (!weight || +weight.value !== +valueStr) {
                        // DEBUG
                        console.info(`[sub-batch-validator] Computed weight, by length conversion: ${value}${weightUnit}`);
                        weightControl.patchValue({
                            value: +valueStr,
                            methodId: MethodIds.CALCULATED_WEIGHT_LENGTH,
                            computed: true,
                            estimated: false
                        }, opts);
                    }
                    if (weightMeasurementControl && +weightMeasurementControl.value !== +valueStr) {
                        weightMeasurementControl === null || weightMeasurementControl === void 0 ? void 0 : weightMeasurementControl.setValue(valueStr, opts);
                    }
                }
                else {
                    if (!weight || weight.computed === true && isNotNil(weight.value)) {
                        // DEBUG
                        console.debug('[sub-batch-validator] Reset previously computed weight');
                        weightControl.patchValue({
                            value: null,
                            computed: false,
                            estimated: false,
                            methodId: null
                        }, opts);
                        weightMeasurementControl === null || weightMeasurementControl === void 0 ? void 0 : weightMeasurementControl.setValue(null, opts);
                    }
                }
            }
            return undefined;
        });
    }
}
/**
 * Default maxDecimals, for a weight calculated by a Weight-Length conversion
 */
SubBatchValidators.DEFAULT_WEIGHT_LENGTH_CONVERSION_MAX_DECIMALS = 6;
//# sourceMappingURL=sub-batch.validator.js.map