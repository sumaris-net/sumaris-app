import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppValidatorService } from '@sumaris-net/ngx-components';
import { AggregationStrata } from '@app/extraction/strata/strata.model';
let AggregationStrataValidatorService = class AggregationStrataValidatorService extends AppValidatorService {
    constructor(formBuilder) {
        super(formBuilder);
        this.formBuilder = formBuilder;
    }
    getFormGroup(data) {
        return this.formBuilder.group({
            __typename: [AggregationStrata.TYPENAME],
            id: [null],
            sheetName: [data && data.sheetName || null, Validators.required],
            timeColumnName: [data && data.timeColumnName || 'year', Validators.required],
            spatialColumnName: [data && data.spatialColumnName || 'square', Validators.required],
            aggColumnName: [data && data.aggColumnName || null, Validators.required],
            aggFunction: [data && data.aggFunction || 'SUM', Validators.required],
            techColumnName: [data && data.techColumnName || null]
        });
    }
};
AggregationStrataValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], AggregationStrataValidatorService);
export { AggregationStrataValidatorService };
//# sourceMappingURL=strata.validator.js.map