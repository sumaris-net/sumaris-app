import { isNil } from '@sumaris-net/ngx-components';
import { LengthUnitSymbol, UnitLabelGroups, WeightKgConversion, WeightUnitSymbol } from '@app/referential/services/model/model.enum';

export function isLengthUnitSymbol(label: any): label is LengthUnitSymbol {
  return label && UnitLabelGroups.LENGTH.includes(label);
}
export function isWeightUnitSymbol(label: any): label is WeightUnitSymbol {
  return label && UnitLabelGroups.WEIGHT.includes(label);
}

/**
 * Apply a conversion; fromUnit -> toUnit
 * @param value
 * @param fromUnit
 * @param toUnit
 **/
export function convertWeight(value: number|string, fromUnit: WeightUnitSymbol, toUnit?: WeightUnitSymbol): number {
  toUnit = toUnit || 'kg';
  if (fromUnit === toUnit) return +value;
  const fromConversion = WeightKgConversion[fromUnit];
  const toConversion = WeightKgConversion[toUnit];
  if (isNil(fromConversion)) throw new Error(`Unknown weight unit '${fromUnit}'`);
  if (isNil(toConversion)) throw new Error(`Unknown weight unit '${toUnit}'`);

  return +value * fromConversion / toConversion;
}
