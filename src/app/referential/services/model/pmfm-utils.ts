import {
  MethodIdGroups,
  PmfmIds,
  PmfmLabelPatterns,
  UnitLabel,
  UnitLabelGroups,
  UnitLabelPatterns,
  WeightKgConversion,
  WeightUnitSymbol,
} from '@app/referential/services/model/model.enum';
import { EntityUtils, isNil, isNotNil, isNotNilOrBlank, toNumber } from '@sumaris-net/ngx-components';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import {
  ExtendedPmfmType,
  IDenormalizedPmfm,
  IFullPmfm,
  IPmfm,
  Pmfm,
  PMFM_NAME_ENDS_WITH_PARENTHESIS_REGEXP,
  UnitConversion,
} from '@app/referential/services/model/pmfm.model';

export abstract class PmfmUtils {
  static NAME_WITH_WEIGHT_UNIT_REGEXP = /^(.* )\((t|kg|g|mg)\)( - .*)?$/;

  static getExtendedType(pmfm: IPmfm): ExtendedPmfmType {
    if (!pmfm || !pmfm.type) return; // Unknown
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
    } else if (pmfm.type === 'date') {
      if (pmfm.unitLabel === UnitLabel.DATE_TIME || UnitLabelPatterns.DATE_TIME.test(pmfm.unitLabel)) {
        return 'dateTime';
      }
    }
    return pmfm.type as ExtendedPmfmType;
  }

  static filterPmfms<P extends IPmfm>(
    pmfms: P[],
    opts?: {
      excludeHidden?: boolean; // true by default
      excludePmfmIds?: number[];
    }
  ): P[] {
    return pmfms.filter(
      (p) =>
        p &&
        // Exclude hidden pmfms
        (!opts || !opts.excludeHidden || !p.hidden) &&
        // Exclude some pmfm by ids
        (!opts || !opts.excludePmfmIds?.length || !opts.excludePmfmIds.includes(p.id))
    );
  }

  static getFirstQualitativePmfm<P extends IPmfm>(
    pmfms: P[],
    opts: {
      excludeHidden?: boolean;
      excludePmfmIds?: number[];
      includePmfmIds?: number[];
      minQvCount?: number;
      maxQvCount?: number;
      filterFn?: (IPmfm, index) => boolean;
    }
  ): P {
    opts = { minQvCount: 1, ...opts };
    // exclude hidden pmfm (see batch modal)
    const qvPmfm = this.filterPmfms(pmfms, opts).find(
      (p, index) =>
        p.type === 'qualitative_value' &&
        p.qualitativeValues &&
        (opts.includePmfmIds?.includes(p.id) ||
          // Exclude if no enough qualitative values
          (p.qualitativeValues.length >= opts.minQvCount &&
            // Exclude if too many qualitative values
            (!opts.maxQvCount || p.qualitativeValues.length <= opts.maxQvCount))) &&
        // Apply the first function, if any
        (!opts.filterFn || opts.filterFn(p, index))
    );
    return qvPmfm;
  }

  static isNumeric(pmfm: IPmfm): boolean {
    return pmfm.type === 'integer' || pmfm.type === 'double';
  }

  static isAlphanumeric(pmfm: IPmfm): boolean {
    return pmfm.type === 'string';
  }

  static isDate(pmfm: IPmfm): boolean {
    return pmfm.type === 'date';
  }

  static isDateTime(pmfm: IPmfm): boolean {
    return pmfm.type === 'dateTime';
  }

  static isQualitative(pmfm: IPmfm): boolean {
    return pmfm.type === 'qualitative_value';
  }

  static isVirtual(pmfm: IPmfm): boolean {
    return EntityUtils.isLocalId(pmfm.id);
  }

  /**
   * Check if individual weight (e.g. for batches, products)
   *
   * @param pmfm
   */
  static isWeight(pmfm: IPmfm): boolean {
    return (
      UnitLabelGroups.WEIGHT.includes(pmfm.unitLabel) ||
      PmfmLabelPatterns.WEIGHT.test(pmfm.label) ||
      (pmfm instanceof Pmfm && PmfmLabelPatterns.WEIGHT.test(pmfm.parameter?.label))
    );
  }

  /**
   * Check if dressing pmfms (by id or by  label like 'DRESSING_%')
   *
   * @param pmfm
   */
  static isDressing(pmfm: IPmfm): boolean {
    return (
      pmfm.id === PmfmIds.DRESSING ||
      PmfmLabelPatterns.DRESSING.test(pmfm.label) ||
      (pmfm instanceof Pmfm && PmfmLabelPatterns.DRESSING.test(pmfm.parameter?.label))
    );
  }

  /**
   * Check if individual length (e.g. for batches, products)
   *
   * @param pmfm
   */
  static isLength(pmfm: IPmfm): boolean {
    return (
      pmfm &&
      ((UnitLabelGroups.LENGTH.includes(pmfm.unitLabel) && PmfmLabelPatterns.LENGTH.test(pmfm.label)) ||
        (pmfm instanceof Pmfm && UnitLabelGroups.LENGTH.includes(pmfm.unit?.label) && PmfmLabelPatterns.LENGTH.test(pmfm.parameter?.label)))
    );
  }

  /**
   * Check if pmfm is a selectivity device
   *
   * @param pmfm
   */
  static isSelectivityDevice(pmfm: IPmfm): boolean {
    return (
      pmfm &&
      (PmfmLabelPatterns.SELECTIVITY_DEVICE.test(pmfm.label) ||
        (pmfm instanceof Pmfm && PmfmLabelPatterns.SELECTIVITY_DEVICE.test(pmfm.parameter?.label)))
    );
  }

  /**
   * Check if pmfm is a tag id
   *
   * @param pmfm
   */
  static isTagId(pmfm: IPmfm): boolean {
    return (
      pmfm && pmfm.id === PmfmIds.TAG_ID
      //|| PmfmLabelPatterns.TAG_ID.test(pmfm.label)
      //|| (pmfm instanceof Pmfm && PmfmLabelPatterns.TAG_ID.test(pmfm.parameter?.label))
    );
  }

  /**
   * Check if pmfm is on a latitude
   * @param pmfm
   */
  static isLatitude(pmfm: IPmfm): boolean {
    return (pmfm && PmfmLabelPatterns.LATITUDE.test(pmfm.label)) || (pmfm instanceof Pmfm && PmfmLabelPatterns.LATITUDE.test(pmfm.parameter?.label));
  }

  /**
   * Check if pmfm is on a longitude
   * @param pmfm
   */
  static isLongitude(pmfm: IPmfm): boolean {
    return (
      (pmfm && PmfmLabelPatterns.LONGITUDE.test(pmfm.label)) || (pmfm instanceof Pmfm && PmfmLabelPatterns.LONGITUDE.test(pmfm.parameter?.label))
    );
  }

  static hasParameterLabelIncludes(pmfm: Pmfm, labels: string[]): boolean {
    return pmfm && labels.includes(pmfm.parameter.label);
  }

  static isComputed(pmfm: IPmfm) {
    return (
      (isNotNil(pmfm.methodId) && MethodIdGroups.CALCULATED.includes(pmfm.methodId)) ||
      (pmfm instanceof Pmfm && MethodIdGroups.CALCULATED.includes(pmfm.method?.id))
    );
  }

  static isDenormalizedPmfm(pmfm: IPmfm): pmfm is IDenormalizedPmfm {
    return (pmfm['completeName'] || pmfm['name']) && true;
  }

  static isFullPmfm(pmfm: IPmfm): pmfm is IFullPmfm {
    return pmfm['parameter'] && true;
  }

  static isNotHidden(pmfm: IPmfm): boolean {
    return !pmfm.hidden;
  }

  /**
   * Compute a PMFM.NAME, with the last part of the name
   *
   * @param pmfm
   * @param opts
   */
  static getPmfmName(
    pmfm: IPmfm,
    opts?: {
      withUnit?: boolean; // true by default
      compact?: boolean; // true by default
      html?: boolean; // false by default
      withDetails?: boolean; // false by default
    }
  ): string {
    if (!pmfm) return undefined;

    let name;
    let details;
    if (PmfmUtils.isDenormalizedPmfm(pmfm)) {
      // If withDetails = true, use complete name if exists
      if (opts?.withDetails && pmfm.completeName) {
        // extract secondary elements (matrix, fraction, method, etc.)
        const index = pmfm.completeName.indexOf(' - ');
        if (index !== -1) {
          name = pmfm.completeName.substring(0, index);
          details = pmfm.completeName.substring(index + 3);
        } else {
          name = pmfm.completeName;
        }
      } else {
        name = pmfm.name;
      }
    } else if (PmfmUtils.isFullPmfm(pmfm)) {
      name = pmfm.parameter?.name;
      if (opts?.withDetails) {
        details = [pmfm.matrix && pmfm.matrix.name, pmfm.fraction && pmfm.fraction.name, pmfm.method && pmfm.method.name]
          .filter(isNotNil)
          .join(' - ');
      }
    }

    name = this.sanitizeName(name, pmfm, opts);

    if (isNotNilOrBlank(details)) {
      if (opts?.html) {
        return `<b>${name}</b><div class="pmfm-details">${details}</div>`;
      } else {
        return `${name} - ${details}`;
      }
    }

    return name;
  }

  static sanitizeName(name: string, pmfm: IPmfm, opts?: { withUnit?: boolean; compact?: boolean; html?: boolean; withDetails?: boolean }): string {
    // Compact mode
    if (!opts || opts.compact !== false) {
      // Remove parenthesis content (=synonym), if any
      // e.g.
      // - 'Longueur totale (LT)' should becomes 'Longueur totale'
      // - 'D1 / Open wounds' should becomes 'D1'
      const matches = PMFM_NAME_ENDS_WITH_PARENTHESIS_REGEXP.exec(name || '');
      name = matches?.[1]?.trim() || name;
    }

    // Append unit
    if ((!opts || opts.withUnit !== false) && (pmfm.type === 'integer' || pmfm.type === 'double') && pmfm.unitLabel && pmfm.unitLabel !== '°') {
      if (opts?.html) {
        if (opts?.withDetails) {
          name += ` (${pmfm.unitLabel})`;
        } else {
          name += `<small><br/>(${pmfm.unitLabel})</small>`;
        }
      } else {
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
  static setWeightUnitConversions<P extends IPmfm>(pmfms: P[], expectedWeightSymbol: WeightUnitSymbol, opts = { clone: true }): P[] {
    (pmfms || []).forEach((pmfm, i) => {
      pmfms[i] = this.setWeightUnitConversion(pmfm, expectedWeightSymbol, opts) || pmfm;
    });
    return pmfms;
  }

  static setWeightUnitConversion<P extends IPmfm>(source: P, expectedWeightSymbol: WeightUnitSymbol, opts = { clone: true }): P {
    if (!this.isWeight(source)) return source; // SKip if not a weight pmfm

    const actualWeightUnit = source.unitLabel?.toLowerCase() || UnitLabel.KG;
    if (actualWeightUnit === expectedWeightSymbol) {
      return source; // Conversion not need
    }

    // actual -> kg (pivot) -> expected
    const conversionCoefficient = WeightKgConversion[actualWeightUnit] / WeightKgConversion[expectedWeightSymbol];
    const conversion = UnitConversion.fromObject({
      conversionCoefficient,
      fromUnit: { label: source.unitLabel },
      toUnit: { label: expectedWeightSymbol },
    });

    // Clone to keep existing pmfm unchanged
    const target = !opts || opts.clone !== false ? (source.clone() as P) : source;

    target.displayConversion = conversion;

    return this.applyConversion(target, conversion);
  }

  static applyConversion<P extends IPmfm>(target: P, conversion: UnitConversion, opts?: { markAsConverted: boolean }): P {
    const expectedUnitSymbol = conversion.toUnit?.label || '';
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
    } else if (target instanceof Pmfm) {
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
    if (isNotNil(target.defaultValue) && !isNaN(Number(target.defaultValue))) {
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
  static getOrComputePrecision(pmfm: IPmfm, defaultPrecision?: number): number {
    if (pmfm.precision > 0) return pmfm.precision;
    if (isNil(pmfm.maximumNumberDecimals)) return defaultPrecision;
    return Math.pow(10, -1 * pmfm.maximumNumberDecimals);
  }

  static equals(pmfm1: IPmfm, pmfm2: IPmfm): boolean {
    return (
      pmfm1 === pmfm2 ||
      (isNil(pmfm1)
        ? isNil(pmfm2)
        : pmfm1.id === pmfm2?.id &&
          pmfm1.hidden === pmfm2?.hidden &&
          PmfmValueUtils.equals(pmfm1.defaultValue, pmfm2?.defaultValue) &&
          UnitConversion.equals(pmfm1.displayConversion, pmfm2?.displayConversion))
    );
  }

  static arrayEquals(pmfms1: IPmfm[], pmfms2: IPmfm[]) {
    return (
      Array.isArray(pmfms1) &&
      Array.isArray(pmfms2) &&
      pmfms1.length === pmfms2.length &&
      pmfms1.every((pmfm, index) => PmfmUtils.equals(pmfm, pmfms2[index]))
    );
  }
}
