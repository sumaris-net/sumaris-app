import { Pipe, PipeTransform } from '@angular/core';
import { WeightUnitSymbol } from '../services/model/model.enum';
import { isNil, isNotNil } from '@sumaris-net/ngx-components';
import { WeightUtils } from '@app/referential/services/model/model.utils';
import { roundHalfUp } from '@app/shared/functions';

@Pipe({
  name: 'weightFormat'
})
export class WeightFormatPipe implements PipeTransform {

  transform(value: number|string, opts?: {
    withUnit?: boolean;
    fromUnit?: WeightUnitSymbol|string;
    toUnit?: WeightUnitSymbol|string|'auto';
    maxDecimals?: number;
  }): string {
    if (isNil(value)) return '';

    let fromUnit = (opts?.fromUnit || 'kg') as WeightUnitSymbol;
    let toUnit = (opts?.toUnit || 'auto') as WeightUnitSymbol | 'auto';

    // Detect target unit
    if (toUnit === 'auto') {
      value = WeightUtils.convert(value, fromUnit as WeightUnitSymbol, 'kg');
      fromUnit = 'kg';
      if (value < 0.001) toUnit = 'mg'
      else if (value < 1) toUnit = 'g'
      else if (value < 1000) toUnit = 'kg'
      else toUnit = 't';
    }
    // Apply conversion
    if (fromUnit !== toUnit) {
      value = WeightUtils.convert(+value, fromUnit, toUnit);
    }
    return WeightUtils.format(value, {...opts, unit: toUnit});
  }

}
