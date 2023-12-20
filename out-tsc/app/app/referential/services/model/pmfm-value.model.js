import { isMoment } from 'moment/moment';
import { DateUtils, fromDateISOString, isNil, isNilOrBlank, isNotNil, isNotNilOrBlank, isNotNilOrNaN, joinPropertiesPath, notNilOrDefault, referentialToString, ReferentialUtils, toDateISOString, toNumber, } from '@sumaris-net/ngx-components';
import { PmfmUtils } from './pmfm.model';
import { isNilOrNaN } from '@app/shared/functions';
import { LengthMeterConversion } from '@app/referential/services/model/model.enum';
import { MathUtils } from '@app/shared/math.utils';
export const PMFM_VALUE_SEPARATOR = '|';
export class PmfmValueUtils {
    static isConvertedNumber(value) {
        return (value instanceof Number) && isNotNilOrNaN(value[PmfmValueUtils.CONVERSION_COEFFICIENT_PROPERTY]);
    }
    static isEmpty(value) {
        return isNilOrBlank(value) || ReferentialUtils.isEmpty(value);
    }
    static isNotEmpty(value) {
        return isNotNilOrBlank(value) || ReferentialUtils.isNotEmpty(value);
    }
    static equals(pv1, pv2) {
        // Exact match
        if ((isNil(pv1) && isNil(pv2)) || (pv1 === pv2))
            return true;
        // Dates
        if (isMoment(pv1) || isMoment(pv2)) {
            return DateUtils.equals(pv1, pv2);
        }
        // Integer can be serialized as '1.0' or '1' (from javascript or java code)
        if (!isNaN(+pv1) && +pv1 === +pv2)
            return true;
        // Serialize ReferentialRef to id
        const v1 = typeof pv1 === 'object' && isNotNil(pv1.id) ? pv1.id : pv1;
        const v2 = typeof pv2 === 'object' && isNotNil(pv2.id) ? pv2.id : pv2;
        // Test match
        // WARN: use '==' a NOT '===' because number can be serialized as string
        // eslint-disable-next-line eqeqeq
        return v1 == v2;
    }
    static toModelValue(value, pmfm, opts = { applyConversion: true }) {
        if (isNil(value) || !pmfm)
            return undefined;
        if (Array.isArray(value)) {
            return value.map(v => this.toModelValue(v, pmfm)).join(PMFM_VALUE_SEPARATOR);
        }
        switch (pmfm.type) {
            case 'qualitative_value':
                return value && isNotNil(value.id) && value.id.toString() || value || undefined;
            case 'integer':
            case 'double':
                if (isNil(value) && !isNaN(+value))
                    return undefined;
                // Apply conversion
                if (pmfm.displayConversion && opts.applyConversion && isNotNilOrNaN(pmfm.displayConversion.conversionCoefficient)) {
                    value = this.applyConversion(value, 1 / pmfm.displayConversion.conversionCoefficient, { markAsConverted: false });
                }
                return value;
            case 'string':
                return value;
            case 'boolean':
                return (value === true || value === 'true') ? 'true' : ((value === false || value === 'false') ? 'false' : undefined);
            case 'date':
                return toDateISOString(value);
            default:
                throw new Error('Unknown pmfm\'s type: ' + pmfm.type);
        }
    }
    static toModelValueAsNumber(value, pmfm) {
        if (!pmfm || isNil(value))
            return value;
        switch (pmfm.type) {
            case 'double':
            case 'integer':
            case 'qualitative_value':
                return +(PmfmValueUtils.toModelValue(value, pmfm));
            case 'boolean':
                const trueFalse = PmfmValueUtils.toModelValue(value, pmfm);
                return trueFalse === 'true' ? 1 : 0;
            default:
                return undefined; // Cannot convert to a number (alphanumerical,date,etc.)
        }
    }
    static asObject(value) {
        if (isNil(value))
            return undefined;
        // Multiple values (e.g. selective device, on a physical gear)
        if (Array.isArray(value)) {
            return value.map(v => this.asObject(v)).join(PMFM_VALUE_SEPARATOR);
        }
        // If moment object, then convert to ISO string - fix #157
        if (isMoment(value)) {
            return toDateISOString(value);
        }
        // If date, convert to ISO string
        if (value instanceof Date) {
            return toDateISOString(DateUtils.moment(value));
        }
        // Number with conversion
        else if (this.isConvertedNumber(value)) {
            // DEBUG
            //console.debug(`[pmfm-value] Apply inverse conversion: ${value} * ${value.__conversionCoefficient}`);
            return (+value / value.__conversionCoefficient).toString();
        }
        // Qualitative value, String or number
        else {
            value = notNilOrDefault(value.id, value);
            return '' + value;
        }
    }
    static fromModelValue(value, pmfm, opts) {
        var _a;
        if (!pmfm)
            return value;
        // If empty, apply the pmfm default value
        if (isNil(value) && isNotNil(pmfm.defaultValue))
            value = pmfm.defaultValue;
        // If many values
        if (typeof value === 'string' && !(opts === null || opts === void 0 ? void 0 : opts.doNotSplitValue) && (pmfm.isMultiple || value.indexOf(PMFM_VALUE_SEPARATOR) !== -1)) {
            value = value.split(PMFM_VALUE_SEPARATOR);
        }
        if (Array.isArray(value)) {
            return value.map(v => this.fromModelValue(v, pmfm, { doNotSplitValue: true }));
        }
        // Simple value
        switch (pmfm.type) {
            case 'qualitative_value':
                if (isNotNil(value)) {
                    const qvId = (typeof value === 'object') ? value.id : parseInt(value);
                    return (pmfm.qualitativeValues || (PmfmUtils.isFullPmfm(pmfm) && ((_a = pmfm.parameter) === null || _a === void 0 ? void 0 : _a.qualitativeValues)) || [])
                        .find(qv => qv.id === qvId) || null;
                }
                return null;
            case 'integer':
                if (isNilOrNaN(value))
                    return null;
                // Apply conversion excepted for displaying the value
                if (pmfm.displayConversion) {
                    // DEBUG
                    //console.debug(`[pmfm-value] Pmfm '${pmfm.label}' will apply conversion: ${value} * ${pmfm.displayConversion.conversionCoefficient}`);
                    value = PmfmValueUtils.applyConversion(value, pmfm.displayConversion.conversionCoefficient);
                }
                else {
                    value = parseInt(value);
                }
                return value;
            case 'double':
                if (isNilOrNaN(value))
                    return null;
                // Apply conversion excepted for displaying the value
                if (pmfm.displayConversion) {
                    // DEBUG
                    //console.debug(`[pmfm-value] Pmfm '${pmfm.label}' will apply conversion: ${value} * ${pmfm.displayConversion.conversionCoefficient}`);
                    value = PmfmValueUtils.applyConversion(value, pmfm.displayConversion.conversionCoefficient);
                }
                else {
                    value = parseFloat(value);
                }
                return value;
            case 'string':
                return value || null;
            case 'boolean':
                return (value === 'true' || value === true || value === 1) ? true : ((value === 'false' || value === false || value === 0) ? false : null);
            case 'date':
                return fromDateISOString(value) || null;
            default:
                throw new Error('Unknown pmfm type: ' + pmfm.type);
        }
    }
    static valueToString(value, opts) {
        var _a;
        if (isNil(value) || !(opts === null || opts === void 0 ? void 0 : opts.pmfm))
            return null;
        switch (opts.pmfm.type) {
            case 'qualitative_value':
                if (value && typeof value !== 'object') {
                    const qvId = parseInt(value);
                    value = opts.pmfm && (opts.pmfm.qualitativeValues || (PmfmUtils.isFullPmfm(opts.pmfm) && opts.pmfm.parameter && opts.pmfm.parameter.qualitativeValues) || [])
                        .find(qv => qv.id === qvId) || null;
                }
                // eslint-disable-next-line eqeqeq
                if (opts.hideIfDefaultValue && value.id == opts.pmfm.defaultValue) {
                    return null;
                }
                let result = value && ((opts.propertyNames && joinPropertiesPath(value, opts.propertyNames)) || value.name || value.label) || null;
                if (result && ((_a = opts.showLabelForPmfmIds) === null || _a === void 0 ? void 0 : _a.includes(opts.pmfm.id))) {
                    result = referentialToString(opts.pmfm, ['name']) + ': ' + result;
                }
                return result;
            case 'integer':
            case 'double':
                return isNotNil(value) ? value : null;
            case 'string':
                return value || null;
            case 'date':
                return value || null;
            case 'boolean':
                return (value === 'true' || value === true || value === 1) ? '&#x2714;' /*checkmark*/ :
                    ((value === 'false' || value === false || value === 0) ? '&#x2718;' : null); /*empty*/
            default:
                throw new Error('Unknown pmfm\'s type: ' + opts.pmfm.type);
        }
    }
    static applyConversion(value, conversionCoefficient, opts) {
        if (isNil(value) || isNil(conversionCoefficient))
            return value;
        // SKip (already converted)
        if (this.isConvertedNumber(value) && value.__conversionCoefficient === conversionCoefficient) {
            if ((opts === null || opts === void 0 ? void 0 : opts.markAsConverted) === false) {
                return +value; // Remove property __conversionCoefficient
            }
            return value;
        }
        // DEBUG
        console.debug(`[pmfm-value] Applying conversion: ${value} * ${conversionCoefficient}`);
        // Workaround because of float, in javascript (see issue #458)
        const target = new Number(MathUtils.multiply(parseFloat(value), conversionCoefficient));
        // Storage conversion coefficient (need by inverse conversion)
        if (!opts || opts.markAsConverted !== false) {
            target.__conversionCoefficient = conversionCoefficient;
        }
        return target;
    }
    static convertLengthValue(sourceValue, sourceUnit, targetUnit, targetPrecision) {
        const unitConversionCoefficient = sourceUnit === targetUnit ? 1
            // source -> meter (pivot) -> target
            : LengthMeterConversion[sourceUnit] / LengthMeterConversion[targetUnit];
        targetPrecision = toNumber(targetPrecision, 0.000001); // Precision of 6 decimals by default
        const precisionCoefficient = 1 / targetPrecision;
        // Convert to the expected unit, and round to expected precision
        const result = Math.round(precisionCoefficient * unitConversionCoefficient * sourceValue) / precisionCoefficient;
        return result;
    }
}
PmfmValueUtils.CONVERSION_COEFFICIENT_PROPERTY = '__conversionCoefficient';
//# sourceMappingURL=pmfm-value.model.js.map