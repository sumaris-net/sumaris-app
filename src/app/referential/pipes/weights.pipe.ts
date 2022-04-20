import { Pipe, PipeTransform } from '@angular/core';
import { WeightUnitSymbol } from '../services/model/model.enum';
import { isNil, isNotNil, toNumber } from '@sumaris-net/ngx-components';
import { convertWeight } from '@app/referential/services/model/model.utils';
import { roundHalfUp } from '@app/shared/functions';

@Pipe({
  name: 'weightFormat'
})
export class WeightFormatPipe implements PipeTransform {

  transform(value: number|string, opts?: {fromUnit?: WeightUnitSymbol|string, toUnit?: WeightUnitSymbol|string|'auto', maxDecimals?: number}): string {
    if (isNil(value)) return '';

    let fromUnit = (opts?.fromUnit || 'kg') as WeightUnitSymbol;
    let toUnit = (opts?.toUnit || 'auto') as WeightUnitSymbol | 'auto';
    // Need conversion
    if (toUnit === 'auto') {
      value = convertWeight(value, fromUnit as WeightUnitSymbol, 'kg');
      fromUnit = 'kg';
      if (value < 0.001) toUnit = 'mg'
      else if (value < 1) toUnit = 'g'
      else if (value < 1000) toUnit = 'kg'
      else toUnit = 't';
    }
    if (fromUnit !== toUnit) {
      value = convertWeight(+value, fromUnit, toUnit);
    }
    return this.format(value, toUnit, toNumber(opts?.maxDecimals, 3));
  }

  format(value: number|string, unit: WeightUnitSymbol|string, maxDecimals?: number): string {
    if (isNil(value)) return '';
    if (isNotNil(maxDecimals)) {
      value = roundHalfUp(value, maxDecimals);
      return `${value.toFixed(maxDecimals)} ${unit}`;
    }
    return `${value} ${unit}`;
  }

}
