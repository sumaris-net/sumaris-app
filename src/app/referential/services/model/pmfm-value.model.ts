import { isMoment, Moment } from 'moment/moment';
import {
  DateUtils,
  fromDateISOString,
  IReferentialRef,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  joinPropertiesPath,
  notNilOrDefault,
  referentialToString,
  ReferentialUtils,
  toDateISOString,
  toNumber,
} from '@sumaris-net/ngx-components';
import { IPmfm, PmfmType, PmfmUtils, UnitConversion } from './pmfm.model';
import { isNilOrNaN } from '@app/shared/functions';
import { LengthMeterConversion, LengthUnitSymbol } from '@app/referential/services/model/model.enum';
import { MathUtils } from '@app/shared/math.utils';

export declare type PmfmValue = number | string | boolean | Moment | IReferentialRef<any>;

export const PMFM_VALUE_SEPARATOR = '|';

// eslint-disable-next-line @typescript-eslint/ban-types
export declare type ConvertedNumber = Number & { __conversionCoefficient: number };

export abstract class PmfmValueUtils {
  private static readonly CONVERSION_COEFFICIENT_PROPERTY = '__conversionCoefficient';

  static isConvertedNumber(value: any): value is ConvertedNumber {
    return value instanceof Number && isNotNilOrNaN(value[PmfmValueUtils.CONVERSION_COEFFICIENT_PROPERTY]);
  }

  static isEmpty(value: PmfmValue | any) {
    return isNilOrBlank(value) || (typeof value === 'object' && ReferentialUtils.isEmpty(value));
  }

  static isNotEmpty(value: PmfmValue | any) {
    return isNotNilOrBlank(value) && (typeof value !== 'object' || ReferentialUtils.isNotEmpty(value));
  }

  static equals(pv1: PmfmValue, pv2: PmfmValue): boolean {
    // Exact match
    if ((isNil(pv1) && isNil(pv2)) || pv1 === pv2) return true;

    // Dates
    if (isMoment(pv1) || isMoment(pv2)) {
      return DateUtils.equals(pv1 as any, pv2 as any);
    }

    // Integer can be serialized as '1.0' or '1' (from javascript or java code)
    if (!isNaN(+pv1) && +pv1 === +pv2) return true;

    // Serialize ReferentialRef to id
    const v1 = typeof pv1 === 'object' && isNotNil(pv1?.id) ? pv1.id : pv1;
    const v2 = typeof pv2 === 'object' && isNotNil(pv2?.id) ? pv2.id : pv2;

    // Test match
    // WARN: use '==' a NOT '===' because number can be serialized as string
    // eslint-disable-next-line eqeqeq
    return v1 == v2;
  }

  static toModelValue(
    value: PmfmValue | PmfmValue[] | any,
    pmfm: IPmfm | { type: PmfmType; displayConversion?: UnitConversion },
    opts = { applyConversion: true }
  ): string {
    if (isNil(value) || !pmfm) return undefined;
    if (Array.isArray(value)) {
      return value.map((v) => this.toModelValue(v, pmfm)).join(PMFM_VALUE_SEPARATOR);
    }
    switch (pmfm.type) {
      case 'qualitative_value':
        return (value && isNotNil(value.id) && value.id.toString()) || value || undefined;
      case 'integer':
      case 'double':
        if (isNil(value) && !isNaN(+value)) return undefined;

        // Apply conversion
        if (pmfm.displayConversion && opts.applyConversion && isNotNilOrNaN(pmfm.displayConversion.conversionCoefficient)) {
          value = this.applyConversion(value, 1 / pmfm.displayConversion.conversionCoefficient, { markAsConverted: false });
        }
        return value;
      case 'string':
        return value;
      case 'boolean':
        return value === true || value === 'true' ? 'true' : value === false || value === 'false' ? 'false' : undefined;
      case 'date':
        return toDateISOString(value);
      default:
        throw new Error("Unknown pmfm's type: " + pmfm.type);
    }
  }

  static toModelValueAsNumber(value: any, pmfm: IPmfm): number {
    if (!pmfm || isNil(value)) return value;
    switch (pmfm.type) {
      case 'double':
      case 'integer':
      case 'qualitative_value':
        return +PmfmValueUtils.toModelValue(value, pmfm);
      case 'boolean':
        return PmfmValueUtils.toModelValue(value, pmfm) === 'true' ? 1 : 0;
      default:
        return undefined; // Cannot convert to a number (alphanumerical,date,etc.)
    }
  }

  static asObject(value: PmfmValue | PmfmValue[] | any): string | any {
    if (isNil(value)) return undefined;
    // Multiple values (e.g. selective device, on a physical gear)
    if (Array.isArray(value)) {
      return value.map((v) => this.asObject(v)).join(PMFM_VALUE_SEPARATOR);
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

  static fromModelValue(value: any, pmfm: IPmfm, opts?: { doNotSplitValue: boolean }): PmfmValue | PmfmValue[] {
    if (!pmfm) return value;
    // If empty, apply the pmfm default value
    if (isNil(value) && isNotNil(pmfm.defaultValue)) value = pmfm.defaultValue;

    // If many values
    if (typeof value === 'string' && !opts?.doNotSplitValue && (pmfm.isMultiple || value.indexOf(PMFM_VALUE_SEPARATOR) !== -1)) {
      value = value.split(PMFM_VALUE_SEPARATOR);
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.fromModelValue(v, pmfm, { doNotSplitValue: true }) as PmfmValue);
    }

    // Simple value
    switch (pmfm.type) {
      case 'qualitative_value':
        if (isNotNil(value)) {
          const qvId = typeof value === 'object' ? value.id : parseInt(value);
          return (
            (pmfm.qualitativeValues || (PmfmUtils.isFullPmfm(pmfm) && pmfm.parameter?.qualitativeValues) || []).find((qv) => qv.id === qvId) || null
          );
        }
        return null;
      case 'integer':
        if (isNilOrNaN(value)) return null;
        // Apply conversion excepted for displaying the value
        if (pmfm.displayConversion) {
          // DEBUG
          //console.debug(`[pmfm-value] Pmfm '${pmfm.label}' will apply conversion: ${value} * ${pmfm.displayConversion.conversionCoefficient}`);
          value = PmfmValueUtils.applyConversion(value, pmfm.displayConversion.conversionCoefficient);
        } else {
          value = parseInt(value);
        }
        return value;
      case 'double':
        if (isNilOrNaN(value)) return null;
        // Apply conversion excepted for displaying the value
        if (pmfm.displayConversion) {
          // DEBUG
          //console.debug(`[pmfm-value] Pmfm '${pmfm.label}' will apply conversion: ${value} * ${pmfm.displayConversion.conversionCoefficient}`);
          value = PmfmValueUtils.applyConversion(value, pmfm.displayConversion.conversionCoefficient);
        } else {
          value = parseFloat(value);
        }
        return value;
      case 'string':
        return value || null;
      case 'boolean':
        return value === 'true' || value === true || value === 1 ? true : value === 'false' || value === false || value === 0 ? false : null;
      case 'date':
        return fromDateISOString(value) || null;
      default:
        throw new Error('Unknown pmfm type: ' + pmfm.type);
    }
  }

  static valueToString(
    value: any,
    opts: { pmfm: IPmfm; propertyNames?: string[]; html?: boolean; hideIfDefaultValue?: boolean; showNameForPmfmIds?: number[] }
  ): string | undefined {
    if (isNil(value) || !opts?.pmfm) return null;
    switch (opts.pmfm.type) {
      case 'qualitative_value': {
        if (value && typeof value !== 'object') {
          const qvId = parseInt(value);
          value =
            (opts.pmfm &&
              (
                opts.pmfm.qualitativeValues ||
                (PmfmUtils.isFullPmfm(opts.pmfm) && opts.pmfm.parameter && opts.pmfm.parameter.qualitativeValues) ||
                []
              ).find((qv) => qv.id === qvId)) ||
            null;
        }
        // eslint-disable-next-line eqeqeq
        if (opts.hideIfDefaultValue && value.id == opts.pmfm.defaultValue) {
          return null;
        }
        let result = (value && ((opts.propertyNames && joinPropertiesPath(value, opts.propertyNames)) || value.name || value.label)) || null;
        if (result && opts.showNameForPmfmIds?.includes(opts.pmfm.id)) {
          result = referentialToString(opts.pmfm, ['name']) + ': ' + result;
        }
        return result;
      }
      case 'integer':
      case 'double':
        return isNotNil(value) ? value : null;
      case 'string':
        return value || null;
      case 'date':
        return value || null;
      case 'boolean':
        return value === 'true' || value === true || value === 1
          ? '&#x2714;' /*checkmark*/
          : value === 'false' || value === false || value === 0
            ? '&#x2718;'
            : null; /*empty*/
      default:
        throw new Error("Unknown pmfm's type: " + opts.pmfm.type);
    }
  }

  static applyConversion(value: any, conversionCoefficient?: number, opts?: { markAsConverted: boolean }): number {
    if (isNil(value) || isNil(conversionCoefficient)) return value;

    // SKip (already converted)
    if (this.isConvertedNumber(value) && value.__conversionCoefficient === conversionCoefficient) {
      if (opts?.markAsConverted === false) {
        return +value; // Remove property __conversionCoefficient
      }
      return value as any as number;
    }

    // DEBUG
    console.debug(`[pmfm-value] Applying conversion: ${value} * ${conversionCoefficient}`);

    // Workaround because of float, in javascript (see issue #458)
    const target: any = new Number(MathUtils.multiply(parseFloat(value), conversionCoefficient));

    // Storage conversion coefficient (need by inverse conversion)
    if (!opts || opts.markAsConverted !== false) {
      target.__conversionCoefficient = conversionCoefficient;
    }

    return target;
  }

  static convertLengthValue(sourceValue: number, sourceUnit: LengthUnitSymbol, targetUnit: LengthUnitSymbol, targetPrecision?: number): number {
    const unitConversionCoefficient =
      sourceUnit === targetUnit
        ? 1
        : // source -> meter (pivot) -> target
          LengthMeterConversion[sourceUnit] / LengthMeterConversion[targetUnit];
    targetPrecision = toNumber(targetPrecision, 0.000001); // Precision of 6 decimals by default
    const precisionCoefficient = 1 / targetPrecision;

    // Convert to the expected unit, and round to expected precision
    return Math.round(precisionCoefficient * unitConversionCoefficient * sourceValue) / precisionCoefficient;
  }
}
