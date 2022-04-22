import { isNil, isNotNil } from '@sumaris-net/ngx-components';
import { LengthUnitSymbol, UnitLabelGroups, WeightKgConversion, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { roundHalfUp } from '@app/shared/functions';

export function isLengthUnitSymbol(label: any): label is LengthUnitSymbol {
  return label && UnitLabelGroups.LENGTH.includes(label);
}
export function isWeightUnitSymbol(label: any): label is WeightUnitSymbol {
  return label && UnitLabelGroups.WEIGHT.includes(label);
}

export class WeightUtils {

  /**
   * Apply a conversion; fromUnit -> toUnit
   * @param value
   * @param fromUnit
   * @param toUnit
   **/
  static convert(value: number|string, fromUnit: WeightUnitSymbol, toUnit?: WeightUnitSymbol): number {
    toUnit = toUnit || 'kg';
    if (fromUnit === toUnit) return +value;
    const fromConversion = WeightKgConversion[fromUnit];
    const toConversion = WeightKgConversion[toUnit];
    if (isNil(fromConversion)) throw new Error(`Unknown weight unit '${fromUnit}'`);
    if (isNil(toConversion)) throw new Error(`Unknown weight unit '${toUnit}'`);

    return +value * fromConversion / toConversion;
  }

  static format(value: number|string, opts: {unit?: WeightUnitSymbol|string, withUnit?: boolean, maxDecimals?: number}): string {
    if (isNil(value)) return '';
    const withUnit = opts && opts.withUnit !== false && opts.unit;
    if (isNotNil(opts?.maxDecimals)) {
      value = roundHalfUp(value, opts.maxDecimals);
      return withUnit ? `${value.toFixed(opts.maxDecimals)} ${opts.unit}` : value.toFixed(opts.maxDecimals);
    }
    return withUnit ? `${value} ${opts.unit}` : value.toString();
  }
}
