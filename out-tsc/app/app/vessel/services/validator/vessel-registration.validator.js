import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { VesselRegistrationPeriod } from '../model/vessel.model';
import { fromDateISOString, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
let VesselRegistrationValidatorService = class VesselRegistrationValidatorService {
    constructor(formBuilder, dateAdapter, translate) {
        this.formBuilder = formBuilder;
        this.dateAdapter = dateAdapter;
        this.translate = translate;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroup(data, opts) {
        return this.formBuilder.group({
            __typename: [VesselRegistrationPeriod.TYPENAME],
            id: [toNumber(data && data.id, null)],
            startDate: [(data === null || data === void 0 ? void 0 : data.startDate) || null, opts && opts.required ? Validators.required : null],
            endDate: [(data === null || data === void 0 ? void 0 : data.endDate) || null],
            registrationCode: [(data === null || data === void 0 ? void 0 : data.registrationCode) || null, opts && opts.required ? Validators.required : null],
            intRegistrationCode: [(data === null || data === void 0 ? void 0 : data.intRegistrationCode) || null],
            registrationLocation: [(data === null || data === void 0 ? void 0 : data.registrationLocation) || null, opts && opts.required ? Validators.compose([Validators.required, SharedValidators.entity]) : SharedValidators.entity]
        });
    }
    updateFormGroup(form, opts) {
        const startDateControl = form.get('startDate');
        if (opts && opts.maxDate) {
            const maxDate = fromDateISOString(opts.maxDate);
            const maxDateStr = this.dateAdapter.format(maxDate, this.translate.instant('COMMON.DATE_TIME_PATTERN'));
            startDateControl.setValidators(opts.required
                ? Validators.compose([
                    SharedValidators.dateIsBefore(opts.maxDate, maxDateStr, 'day'),
                    Validators.required
                ])
                : SharedValidators.dateIsBefore(opts.maxDate, maxDateStr, 'day'));
        }
        else if (opts && opts.required) {
            startDateControl.setValidators(Validators.required);
        }
        else {
            startDateControl.clearValidators();
        }
    }
};
VesselRegistrationValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        DateAdapter,
        TranslateService])
], VesselRegistrationValidatorService);
export { VesselRegistrationValidatorService };
//# sourceMappingURL=vessel-registration.validator.js.map