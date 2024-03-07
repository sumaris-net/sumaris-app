var UnitConversion_1, Pmfm_1;
import { __decorate, __metadata } from "tslib";
import { DateUtils, EntityClass, fromDateISOString, isNil, isNotNil, isNotNilOrBlank, ReferentialRef, toNumber } from '@sumaris-net/ngx-components';
import { MethodIdGroups, PmfmIds, PmfmLabelPatterns, UnitLabel, UnitLabelGroups, UnitLabelPatterns, WeightKgConversion } from './model.enum';
import { Parameter } from './parameter.model';
import { PmfmValueUtils } from './pmfm-value.model';
import { FullReferential } from '@app/referential/services/model/referential.model';
export const PMFM_ID_REGEXP = /\d+/;
export const PMFM_NAME_ENDS_WITH_PARENTHESIS_REGEXP = new RegExp(/^\s*([^\/(]+)(?:(\s*\/\s+[^/]+)|(\s*\([^\)]+\s*\)))+$/);
let UnitConversion = UnitConversion_1 = class UnitConversion {
    constructor() {
    }
    clone(opts) {
        const target = new UnitConversion_1();
        this.copy(target, opts);
        return target;
    }
    copy(target, opts) {
        target.fromObject(this.asObject(opts), opts);
    }
    asObject(opts) {
        var _a, _b;
        return {
            fromUnit: (_a = this.fromUnit) === null || _a === void 0 ? void 0 : _a.asObject(opts),
            toUnit: (_b = this.toUnit) === null || _b === void 0 ? void 0 : _b.asObject(opts),
            conversionCoefficient: this.conversionCoefficient,
            updateDate: DateUtils.toDateISOString(this.updateDate),
        };
    }
    fromObject(source, opts) {
        this.fromUnit = source.fromUnit && ReferentialRef.fromObject(source.fromUnit);
        this.toUnit = source.toUnit && ReferentialRef.fromObject(source.toUnit);
        this.conversionCoefficient = source.conversionCoefficient;
        this.updateDate = fromDateISOString(source.updateDate);
    }
    /**
     * Invert fromUnit and toUnit. Set the conversionCoefficient to its inverse.
     *
     * @return self This object itself.
     */
    reverse() {
        const currentFromUnit = this.fromUnit;
        const currentToUnit = this.toUnit;
        this.fromUnit = currentToUnit;
        this.toUnit = currentFromUnit;
        this.conversionCoefficient = 1 / this.conversionCoefficient;
        return this;
    }
};
UnitConversion = UnitConversion_1 = __decorate([
    EntityClass({ typename: 'UnitConversionVO' }),
    __metadata("design:paramtypes", [])
], UnitConversion);
export { UnitConversion };
let Pmfm = Pmfm_1 = class Pmfm extends FullReferential {
    constructor() {
        super(Pmfm_1.TYPENAME);
        this.entityName = Pmfm_1.ENTITY_NAME;
    }
    asObject(opts) {
        var _a;
        const target = super.asObject(Object.assign(Object.assign({}, opts), { minify: false // Do NOT minify itself
         }));
        if (opts && opts.minify) {
            target.parameterId = toNumber(this.parameter && this.parameter.id, null);
            target.matrixId = toNumber(this.matrix && this.matrix.id, null);
            target.fractionId = toNumber(this.fraction && this.fraction.id, null);
            target.methodId = toNumber(this.method && this.method.id, null);
            target.unitId = toNumber(this.unit && this.unit.id, null);
            delete target.parameter;
            delete target.matrix;
            delete target.fraction;
            delete target.method;
            delete target.unit;
            delete target.displayConversion;
        }
        else {
            target.parameter = this.parameter && this.parameter.asObject(opts);
            target.matrix = this.matrix && this.matrix.asObject(opts);
            target.fraction = this.fraction && this.fraction.asObject(opts);
            target.method = this.method && this.method.asObject(opts);
            target.unit = this.unit && this.unit.asObject(opts);
            target.displayConversion = (_a = this.displayConversion) === null || _a === void 0 ? void 0 : _a.asObject(opts);
        }
        target.qualitativeValues = this.qualitativeValues && this.qualitativeValues.map(qv => qv.asObject(opts)) || undefined;
        target.defaultValue = PmfmValueUtils.toModelValue(this.defaultValue, this, { applyConversion: false });
        // Revert conversion (if any)
        if (this.displayConversion)
            PmfmUtils.applyConversion(target, this.displayConversion.clone().reverse(), { markAsConverted: false });
        return target;
    }
    fromObject(source) {
        var _a;
        super.fromObject(source);
        this.entityName = source.entityName || Pmfm_1.ENTITY_NAME;
        this.type = source.type || ((_a = source.parameter) === null || _a === void 0 ? void 0 : _a.type);
        this.minValue = source.minValue;
        this.maxValue = source.maxValue;
        this.defaultValue = source.defaultValue;
        this.maximumNumberDecimals = source.maximumNumberDecimals;
        this.signifFiguresNumber = source.signifFiguresNumber;
        this.detectionThreshold = source.detectionThreshold;
        this.precision = source.precision;
        this.parameter = source.parameter && Parameter.fromObject(source.parameter);
        this.matrix = source.matrix && ReferentialRef.fromObject(source.matrix);
        this.fraction = source.fraction && ReferentialRef.fromObject(source.fraction);
        this.method = source.method && ReferentialRef.fromObject(source.method);
        this.unit = source.unit && ReferentialRef.fromObject(source.unit);
        this.qualitativeValues = source.qualitativeValues && source.qualitativeValues.map(ReferentialRef.fromObject) || undefined;
        this.completeName = source.completeName;
        return this;
    }
    get isQualitative() {
        return this.type === 'qualitative_value';
    }
    get matrixId() {
        return this.matrix && this.matrix.id;
    }
    get fractionId() {
        return this.fraction && this.fraction.id;
    }
    get methodId() {
        return this.method && this.method.id;
    }
    get unitLabel() {
        return this.unit && this.unit.label;
    }
    get isComputed() {
        return PmfmUtils.isComputed(this);
    }
    get isMultiple() {
        return false; // Default value
    }
};
Pmfm.ENTITY_NAME = 'Pmfm';
Pmfm = Pmfm_1 = __decorate([
    EntityClass({ typename: 'PmfmVO' }),
    __metadata("design:paramtypes", [])
], Pmfm);
export { Pmfm };
export class PmfmUtils {
    static getExtendedType(pmfm) {
        if (!pmfm || !pmfm.type)
            return; // Unknown
        if (pmfm.type === 'double') {
            if (PmfmLabelPatterns.LATITUDE.test(pmfm.label)) {
                return 'latitude';
            }
            if (PmfmLabelPatterns.LONGITUDE.test(pmfm.label)) {
                return 'longitude';
            }
            if (pmfm.unitLabel === UnitLabel.DECIMAL_HOURS || UnitLabelPatterns.DECIMAL_HOURS.test(pmfm.unitLabel)) {
                return 'duration';
            }
        }
        else if (pmfm.type === 'date') {
            if (pmfm.unitLabel === UnitLabel.DATE_TIME || UnitLabelPatterns.DATE_TIME.test(pmfm.unitLabel)) {
                return 'dateTime';
            }
        }
        return pmfm.type;
    }
    static filterPmfms(pmfms, opts) {
        return pmfms.filter(p => {
            var _a;
            return p
                // Exclude hidden pmfms
                && (!opts || !opts.excludeHidden || !p.hidden)
                // Exclude some pmfm by ids
                && (!opts || !((_a = opts.excludePmfmIds) === null || _a === void 0 ? void 0 : _a.length) || !opts.excludePmfmIds.includes(p.id));
        });
    }
    static getFirstQualitativePmfm(pmfms, opts = {
        minQvCount: 1 // Should have at least 2 values (by default)
    }) {
        // exclude hidden pmfm (see batch modal)
        const qvPmfm = this.filterPmfms(pmfms, opts)
            .find((p, index) => p.type === 'qualitative_value'
            && p.qualitativeValues
            // Exclude if no enough qualitative values
            && p.qualitativeValues.length >= opts.minQvCount
            // Exclude if too many qualitative values
            && (!opts.maxQvCount || p.qualitativeValues.length <= opts.maxQvCount)
            // Apply the first function, if any
            && (!opts.filterFn || opts.filterFn(p, index)));
        return qvPmfm;
    }
    static isNumeric(pmfm) {
        return pmfm.type === 'integer' || pmfm.type === 'double';
    }
    static isAlphanumeric(pmfm) {
        return pmfm.type === 'string';
    }
    static isDate(pmfm) {
        return pmfm.type === 'date';
    }
    static isQualitative(pmfm) {
        return pmfm.type === 'qualitative_value';
    }
    /**
     * Check if individual weight (e.g. for batches, products)
     *
     * @param pmfm
     */
    static isWeight(pmfm) {
        var _a;
        return UnitLabelGroups.WEIGHT.includes(pmfm.unitLabel)
            || PmfmLabelPatterns.WEIGHT.test(pmfm.label)
            || (pmfm instanceof Pmfm && PmfmLabelPatterns.WEIGHT.test((_a = pmfm.parameter) === null || _a === void 0 ? void 0 : _a.label));
    }
    /**
     * Check if dressing pmfms (by id or by  label like 'DRESSING_%')
     *
     * @param pmfm
     */
    static isDressing(pmfm) {
        var _a;
        return pmfm.id === PmfmIds.DRESSING
            || PmfmLabelPatterns.DRESSING.test(pmfm.label)
            || (pmfm instanceof Pmfm && PmfmLabelPatterns.DRESSING.test((_a = pmfm.parameter) === null || _a === void 0 ? void 0 : _a.label));
    }
    /**
     * Check if individual length (e.g. for batches, products)
     *
     * @param pmfm
     */
    static isLength(pmfm) {
        var _a, _b;
        return pmfm && ((UnitLabelGroups.LENGTH.includes(pmfm.unitLabel) && (PmfmLabelPatterns.LENGTH.test(pmfm.label)))
            || (pmfm instanceof Pmfm
                && UnitLabelGroups.LENGTH.includes((_a = pmfm.unit) === null || _a === void 0 ? void 0 : _a.label)
                && PmfmLabelPatterns.LENGTH.test((_b = pmfm.parameter) === null || _b === void 0 ? void 0 : _b.label)));
    }
    /**
     * Check if pmfm is a selectivity device
     *
     * @param pmfm
     */
    static isSelectivityDevice(pmfm) {
        var _a;
        return pmfm && (PmfmLabelPatterns.SELECTIVITY_DEVICE.test(pmfm.label)
            || (pmfm instanceof Pmfm && PmfmLabelPatterns.SELECTIVITY_DEVICE.test((_a = pmfm.parameter) === null || _a === void 0 ? void 0 : _a.label)));
    }
    /**
     * Check if pmfm is a tag id
     *
     * @param pmfm
     */
    static isTagId(pmfm) {
        return pmfm && (pmfm.id === PmfmIds.TAG_ID
        //|| PmfmLabelPatterns.TAG_ID.test(pmfm.label)
        //|| (pmfm instanceof Pmfm && PmfmLabelPatterns.TAG_ID.test(pmfm.parameter?.label))
        );
    }
    static hasParameterLabelIncludes(pmfm, labels) {
        return pmfm && labels.includes(pmfm.parameter.label);
    }
    static isComputed(pmfm) {
        var _a;
        return (isNotNil(pmfm.methodId) && MethodIdGroups.CALCULATED.includes(pmfm.methodId))
            || (pmfm instanceof Pmfm && MethodIdGroups.CALCULATED.includes((_a = pmfm.method) === null || _a === void 0 ? void 0 : _a.id));
    }
    static isDenormalizedPmfm(pmfm) {
        return (pmfm['completeName'] || pmfm['name']) && true;
    }
    static isFullPmfm(pmfm) {
        return pmfm['parameter'] && true;
    }
    static isNotHidden(pmfm) {
        return !pmfm.hidden;
    }
    /**
     * Compute a PMFM.NAME, with the last part of the name
     *
     * @param pmfm
     * @param opts
     */
    static getPmfmName(pmfm, opts) {
        var _a;
        if (!pmfm)
            return undefined;
        let name;
        let details;
        if (PmfmUtils.isDenormalizedPmfm(pmfm)) {
            // If withDetails = true, use complete name if exists
            if ((opts === null || opts === void 0 ? void 0 : opts.withDetails) && pmfm.completeName) {
                // extract secondary elements (matrix, fraction, method, etc.)
                const index = pmfm.completeName.indexOf(' - ');
                if (index !== -1) {
                    name = pmfm.completeName.substring(0, index);
                    details = pmfm.completeName.substring(index + 3);
                }
                else {
                    name = pmfm.completeName;
                }
            }
            else {
                name = pmfm.name;
            }
        }
        else if (PmfmUtils.isFullPmfm(pmfm)) {
            name = (_a = pmfm.parameter) === null || _a === void 0 ? void 0 : _a.name;
            if (opts === null || opts === void 0 ? void 0 : opts.withDetails) {
                details = [
                    pmfm.matrix && pmfm.matrix.name,
                    pmfm.fraction && pmfm.fraction.name,
                    pmfm.method && pmfm.method.name
                ].filter(isNotNil).join(' - ');
            }
        }
        name = this.sanitizeName(name, pmfm, opts);
        if (isNotNilOrBlank(details)) {
            if (opts === null || opts === void 0 ? void 0 : opts.html) {
                return `<b>${name}</b><div class="pmfm-details">${details}</div>`;
            }
            else {
                return `${name} - ${details}`;
            }
        }
        return name;
    }
    static sanitizeName(name, pmfm, opts) {
        // Compact mode
        if (!opts || opts.compact !== false) {
            // Remove parenthesis content (=synonym), if any
            // e.g.
            // - 'Longueur totale (LT)' should becomes 'Longueur totale'
            // - 'D1 / Open wounds' should becomes 'D1'
            const matches = PMFM_NAME_ENDS_WITH_PARENTHESIS_REGEXP.exec(name || '');
            name = (matches === null || matches === void 0 ? void 0 : matches[1]) || name;
        }
        // Append unit
        if ((!opts || opts.withUnit !== false) && (pmfm.type === 'integer' || pmfm.type === 'double') && pmfm.unitLabel && pmfm.unitLabel !== '°') {
            if (opts === null || opts === void 0 ? void 0 : opts.html) {
                if (opts === null || opts === void 0 ? void 0 : opts.withDetails) {
                    name += ` (${pmfm.unitLabel})`;
                }
                else {
                    name += `<small><br/>(${pmfm.unitLabel})</small>`;
                }
            }
            else {
                name += ` (${pmfm.unitLabel})`;
            }
        }
        return name;
    }
    /**
     * Add weight conversion to a list of pmfms
     *
     * @param pmfms
     * @param expectedWeightSymbol
     * @param opts
     */
    static setWeightUnitConversions(pmfms, expectedWeightSymbol, opts = { clone: true }) {
        (pmfms || []).forEach((pmfm, i) => {
            pmfms[i] = this.setWeightUnitConversion(pmfm, expectedWeightSymbol, opts) || pmfm;
        });
        return pmfms;
    }
    static setWeightUnitConversion(source, expectedWeightSymbol, opts = { clone: true }) {
        var _a;
        if (!this.isWeight(source))
            return source; // SKip if not a weight pmfm
        const actualWeightUnit = ((_a = source.unitLabel) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || UnitLabel.KG;
        if (actualWeightUnit === expectedWeightSymbol) {
            return source; // Conversion not need
        }
        // actual -> kg (pivot) -> expected
        const conversionCoefficient = WeightKgConversion[actualWeightUnit] / WeightKgConversion[expectedWeightSymbol];
        const conversion = UnitConversion.fromObject({ conversionCoefficient,
            fromUnit: { label: source.unitLabel },
            toUnit: { label: expectedWeightSymbol }
        });
        // Clone to keep existing pmfm unchanged
        const target = (!opts || opts.clone !== false) ? source.clone() : source;
        target.displayConversion = conversion;
        return this.applyConversion(target, conversion);
    }
    static applyConversion(target, conversion, opts) {
        var _a;
        const expectedUnitSymbol = ((_a = conversion.toUnit) === null || _a === void 0 ? void 0 : _a.label) || '';
        const conversionCoefficient = toNumber(conversion.conversionCoefficient, 1);
        // Must be done before updating maximumNumberDecimals (result depends of its value)
        const precision = PmfmUtils.getOrComputePrecision(target);
        if (this.isDenormalizedPmfm(target)) {
            target.unitLabel = expectedUnitSymbol;
            // Update the complete name (the unit part), if exists
            const matches = target.completeName && this.NAME_WITH_WEIGHT_UNIT_REGEXP.exec(target.completeName);
            if (matches) {
                target.completeName = `${matches[1]}(${expectedUnitSymbol})${matches[3] || ''}`;
            }
        }
        else if (target instanceof Pmfm) {
            if (target.unit) {
                // Update the complete name (the unit part), if exists
                const matches = target.name && this.NAME_WITH_WEIGHT_UNIT_REGEXP.exec(target.name);
                if (matches) {
                    target.name = `${matches[1]}(${expectedUnitSymbol})${matches[3] || ''}`;
                }
                target.unit.label = expectedUnitSymbol;
                target.unit.name = expectedUnitSymbol;
            }
        }
        // Convert max number decimals
        if (isNotNil(target.maximumNumberDecimals)) {
            const convertedMaximumNumberDecimals = Math.log10(conversionCoefficient);
            target.maximumNumberDecimals = Math.max(0, target.maximumNumberDecimals - convertedMaximumNumberDecimals);
            // DEBUG
            //console.debug(`[pmfm-utils] PMFM '${target.label}' Changing maximumNumberDecimals to ${target.maximumNumberDecimals}`);
        }
        // DEBUG
        //else console.debug(`[pmfm-utils] PMFM '${target.label}' without maximumNumberDecimals`, target);
        // Convert min value
        if (isNotNil(target.minValue)) {
            target.minValue = PmfmValueUtils.applyConversion(target.minValue, conversionCoefficient);
            // DEBUG
            // console.debug(`[pmfm-utils] PMFM '${target.label}' Changing minValue to ${target.minValue}`);
        }
        // DEBUG
        // else console.debug(`[pmfm-utils] PMFM '${target.label}' without minValue`, target);
        // Convert max value
        if (isNotNil(target.maxValue)) {
            target.maxValue = PmfmValueUtils.applyConversion(target.maxValue, conversionCoefficient);
            // DEBUG
            // console.debug(`[pmfm-utils] PMFM '${target.label}' Changing maxValue to ${target.maxValue}`);
        }
        // DEBUG
        // else console.debug(`[pmfm-utils] PMFM '${target.label}' without maxValue`, target);
        // Convert precision
        if (precision > 0) {
            target.precision = precision * conversionCoefficient;
            // DEBUG
            // console.debug(`[pmfm-utils] PMFM '${target.label}' Changing precision from ${precision} to ${target.precision}`);
        }
        // Convert default value
        if (isNotNil(target.defaultValue) && (!isNaN(Number(target.defaultValue)))) {
            target.defaultValue = PmfmValueUtils.applyConversion(target.defaultValue, conversionCoefficient);
            // DEBUG
            console.debug(`[pmfm-utils] PMFM '${target.label}' Changing defaultValue from to ${target.defaultValue}`);
        }
        // Convert type
        if (target.type === 'double' && target.maximumNumberDecimals === 0) {
            target.type = 'integer';
            // DEBUG
            console.debug(`[pmfm-utils] PMFM '${target.label}' Changing type to '${target.type}'`);
        }
        return target;
    }
    /**
     * Get or compute the precision, for a numerical pmfm (double or integer). Will use the defined precision, or compute it from maximumNumberDecimals.
     * Example:
     * - if maximumNumberDecimals=null and precision=null, then precision = defaultPrecision
     * - if maximumNumberDecimals=1 and precision=0.5, then precision=0.5
     * - if maximumNumberDecimals=1 and precision=null, then precision=0.1
     *
     * @param pmfm
     */
    static getOrComputePrecision(pmfm, defaultPrecision) {
        if (pmfm.precision > 0)
            return pmfm.precision;
        if (isNil(pmfm.maximumNumberDecimals))
            return defaultPrecision;
        return Math.pow(10, -1 * pmfm.maximumNumberDecimals);
    }
}
PmfmUtils.NAME_WITH_WEIGHT_UNIT_REGEXP = /^(.* )\((t|kg|g|mg)\)( - .*)?$/;
//# sourceMappingURL=pmfm.model.js.map