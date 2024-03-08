import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { PmfmValuePipe } from '@app/referential/pipes/pmfms.pipe';
let IsMeasurementFormValuesPipe = class IsMeasurementFormValuesPipe {
    constructor() {
        this.transform = MeasurementValuesUtils.isMeasurementFormValues;
    }
};
IsMeasurementFormValuesPipe = __decorate([
    Pipe({
        name: 'isMeasurementFormValues',
    })
], IsMeasurementFormValuesPipe);
export { IsMeasurementFormValuesPipe };
let IsMeasurementModelValuesPipe = class IsMeasurementModelValuesPipe {
    constructor() {
        this.transform = MeasurementValuesUtils.isMeasurementModelValues;
    }
};
IsMeasurementModelValuesPipe = __decorate([
    Pipe({
        name: 'isMeasurementModelValues'
    })
], IsMeasurementModelValuesPipe);
export { IsMeasurementModelValuesPipe };
let MeasurementValueGetPipe = class MeasurementValueGetPipe extends PmfmValuePipe {
    transform(entity, opts) {
        if (!entity.measurementValues || !(opts === null || opts === void 0 ? void 0 : opts.pmfm))
            return undefined;
        return this.format(entity.measurementValues[opts.pmfm.id], Object.assign({ applyDisplayConversion: opts.pmfm.displayConversion && MeasurementValuesUtils.isMeasurementModelValues(entity.measurementValues) }, opts));
    }
};
MeasurementValueGetPipe = __decorate([
    Pipe({
        name: 'measurementValueGet'
    })
], MeasurementValueGetPipe);
export { MeasurementValueGetPipe };
//# sourceMappingURL=measurements.pipe.js.map