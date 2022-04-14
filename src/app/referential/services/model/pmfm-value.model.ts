import { Moment } from 'moment';
import {
  fromDateISOString,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrNaN,
  joinPropertiesPath,
  ReferentialRef,
  referentialToString,
  ReferentialUtils,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { IPmfm, Pmfm, PmfmType, PmfmUtils, UnitConversion } from './pmfm.model';
import { DenormalizedPmfmStrategy } from './pmfm-strategy.model';
import { isNilOrNaN } from '@app/shared/functions';

export declare type PmfmValue = number | string | boolean | Moment | ReferentialRef<any>;
export declare type PmfmDefinition = DenormalizedPmfmStrategy | Pmfm;
export const PMFM_VALUE_SEPARATOR = '|';

export abstract class PmfmValueUtils {

  static toModelValue(value: PmfmValue | PmfmValue[] | any, pmfm: IPmfm | { type: PmfmType; displayConversion?: UnitConversion; }, opts?: {applyConversion?: boolean}): string {
    if (isNil(value) || !pmfm) return undefined;
    if (Array.isArray(value)) {
      return value.map(v => this.toModelValue(v, pmfm)).join(PMFM_VALUE_SEPARATOR);
    }
    switch (pmfm.type) {
      case 'qualitative_value':
        return value && isNotNil(value.id) && value.id.toString() || value || undefined;
      case 'integer':
      case 'double':
        if (isNil(value) && !isNaN(+value)) return undefined;
        // Apply conversion
        if (isNotNilOrNaN(pmfm.displayConversion?.conversionCoefficient) && (!opts || opts.applyConversion !== false)) {

          // DEBUG
          console.debug(`[pmfm-value] Applying revert conversion: ${value} / ${pmfm.displayConversion.conversionCoefficient}`);

          value = (+value) / pmfm.displayConversion.conversionCoefficient;

        }
        return value.toString();
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

  static toModelValueAsNumber(value: any, pmfm: IPmfm): number {
    if (!pmfm || isNil(value)) return value;
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

  static fromModelValue(value: any, pmfm: IPmfm): PmfmValue | PmfmValue[] {
    if (!pmfm) return value;
    // If empty, apply the pmfm default value
    if (isNil(value) && isNotNil(pmfm.defaultValue)) value = pmfm.defaultValue;

    // If many values
    if (typeof value === 'string' && value.indexOf(PMFM_VALUE_SEPARATOR) !== -1) {
      value = value.split(PMFM_VALUE_SEPARATOR);
    }
    if (Array.isArray(value)) {
      return value.map(v => this.fromModelValue(v, pmfm) as PmfmValue);
    }

    // Simple value
    switch (pmfm.type) {
      case 'qualitative_value':
        if (isNotNil(value)) {
          const qvId = (typeof value === 'object') ? value.id : parseInt(value);
          return (pmfm.qualitativeValues || (PmfmUtils.isFullPmfm(pmfm) && pmfm.parameter && pmfm.parameter.qualitativeValues) || [])
            .find(qv => qv.id === qvId) || null;

        }
        return null;
      case 'integer':
        if (isNilOrNaN(value)) return null;
        value = parseInt(value);
        // Apply conversion excepted for displaying the value
        if (pmfm.displayConversion) {
          value = value * pmfm.displayConversion.conversionCoefficient;
        }
        return value;
      case 'double':
        if (isNilOrNaN(value)) return null;
        value = parseFloat(value);
        // Apply conversion excepted for displaying the value
        if (pmfm.displayConversion) {
          value = value * pmfm.displayConversion.conversionCoefficient;
        }
        return value;
      case 'string':
        return value || null;
      case 'boolean':
        return (value === 'true' || value === true || value === 1) ? true : ((value === 'false' || value === false || value === 0) ? false : null);
      case 'date':
        return fromDateISOString(value) || null;
      default:
        throw new Error('Unknown pmfm\'s type: ' + pmfm.type);
    }
  }

  static valueToString(value: any, opts: { pmfm: IPmfm; propertyNames?: string[]; html?: boolean; hideIfDefaultValue?: boolean; showLabelForPmfmIds?: number[] }): string | undefined {
    if (isNil(value) || !opts || !opts.pmfm) return null;
    switch (opts.pmfm.type) {
      case 'qualitative_value':
        if (value && typeof value !== 'object') {
          const qvId = parseInt(value);
          value = opts.pmfm && (opts.pmfm.qualitativeValues || (PmfmUtils.isFullPmfm(opts.pmfm) && opts.pmfm.parameter && opts.pmfm.parameter.qualitativeValues) || [])
            .find(qv => qv.id === qvId) || null;
        }
        // eslint-disable-next-line eqeqeq
        if (value && value.id == opts.pmfm.defaultValue && opts.hideIfDefaultValue) {
          return null;
        }
        let result = value && ((opts.propertyNames && joinPropertiesPath(value, opts.propertyNames)) || value.name || value.label) || null;
        if (result && opts.showLabelForPmfmIds?.includes(opts.pmfm.id)) {
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

  static isEmpty(value: PmfmValue | any) {
    return isNilOrBlank(value) || ReferentialUtils.isEmpty(value);
  }

  static equals(v1: PmfmValue, v2: PmfmValue) {
    return (isNil(v1) && isNil(v2)) || (v1 === v2) || (ReferentialUtils.equals(v1, v2));
  }
}
