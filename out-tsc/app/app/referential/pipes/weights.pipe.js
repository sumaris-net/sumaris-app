import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { isNil } from '@sumaris-net/ngx-components';
import { WeightUtils } from '@app/referential/services/model/model.utils';
let WeightFormatPipe = class WeightFormatPipe {
    transform(value, opts) {
        if (isNil(value))
            return '';
        let fromUnit = ((opts === null || opts === void 0 ? void 0 : opts.fromUnit) || 'kg');
        let toUnit = ((opts === null || opts === void 0 ? void 0 : opts.toUnit) || 'auto');
        // Detect target unit
        if (toUnit === 'auto') {
            value = WeightUtils.convert(value, fromUnit, 'kg');
            fromUnit = 'kg';
            if (value < 0.001)
                toUnit = 'mg';
            else if (value < 1)
                toUnit = 'g';
            else if (value < 1000)
                toUnit = 'kg';
            else
                toUnit = 't';
        }
        // Apply conversion
        if (fromUnit !== toUnit) {
            value = WeightUtils.convert(+value, fromUnit, toUnit);
        }
        return WeightUtils.format(value, Object.assign(Object.assign({}, opts), { unit: toUnit }));
    }
};
WeightFormatPipe = __decorate([
    Pipe({
        name: 'weightFormat'
    })
], WeightFormatPipe);
export { WeightFormatPipe };
//# sourceMappingURL=weights.pipe.js.map