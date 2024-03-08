import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { fromDateISOString, isNotNil, SharedFormGroupValidators, SharedValidators } from '@sumaris-net/ngx-components';
import { toBoolean } from '@sumaris-net/ngx-components';
import { LocalSettingsService } from '@sumaris-net/ngx-components';
import { Sale } from './sale.model';
import { DataRootEntityValidatorService } from '@app/data/services/validator/root-data-entity.validator';
import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
let SaleValidatorService = class SaleValidatorService extends DataRootEntityValidatorService {
    constructor(formBuilder, translate, settings, dateAdapter) {
        super(formBuilder, translate, settings);
        this.dateAdapter = dateAdapter;
    }
    getFormGroupConfig(data, opts) {
        const formConfig = {
            __typename: [Sale.TYPENAME],
            id: [data && data.id || null],
            updateDate: [data && data.updateDate || null],
            creationDate: [data && data.creationDate || null],
            vesselSnapshot: [data && data.vesselSnapshot || null, !opts.required ? SharedValidators.entity : Validators.compose([Validators.required, SharedValidators.entity])],
            saleType: [data && data.saleType || null, !opts.required ? SharedValidators.entity : Validators.compose([Validators.required, SharedValidators.entity])],
            startDateTime: [data && data.startDateTime || null],
            endDateTime: [data && data.endDateTime || null, SharedValidators.dateRangeEnd('startDateTime')],
            saleLocation: [data && data.saleLocation || null, SharedValidators.entity],
            comments: [data && data.comments || null, Validators.maxLength(2000)]
        };
        return formConfig;
    }
    getFormGroupOptions(data, opts) {
        return {
            validator: Validators.compose([
                SharedFormGroupValidators.requiredIf('saleLocation', 'saleType'),
                SharedFormGroupValidators.requiredIf('startDateTime', 'saleType')
            ])
        };
    }
    updateFormGroup(form, opts) {
        opts = this.fillDefaultOptions(opts);
        if (opts.required === true) {
            form.controls['vesselSnapshot'].setValidators([Validators.required, SharedValidators.entity]);
            form.controls['saleType'].setValidators([Validators.required, SharedValidators.entity]);
        }
        else {
            form.controls['vesselSnapshot'].setValidators(SharedValidators.entity);
            form.controls['saleType'].setValidators(SharedValidators.entity);
        }
        if (opts.minDate) {
            const minDate = fromDateISOString(opts.minDate);
            const minDateStr = this.dateAdapter.format(minDate, this.translate.instant('COMMON.DATE_TIME_PATTERN'));
            form.controls['startDateTime'].setValidators(SharedValidators.dateIsAfter(minDate, minDateStr));
        }
        const formGroupOptions = this.getFormGroupOptions(null, opts);
        form.setValidators(formGroupOptions === null || formGroupOptions === void 0 ? void 0 : formGroupOptions.validators);
        return form;
    }
    /* -- fill options defaults -- */
    fillDefaultOptions(opts) {
        var _a;
        opts = opts || {};
        opts.isOnFieldMode = isNotNil(opts.isOnFieldMode) ? opts.isOnFieldMode : (((_a = this.settings) === null || _a === void 0 ? void 0 : _a.isOnFieldMode()) || false);
        opts.required = toBoolean(opts.required, true);
        opts.withProgram = toBoolean(opts.withProgram, false);
        return opts;
    }
};
SaleValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService,
        DateAdapter])
], SaleValidatorService);
export { SaleValidatorService };
//# sourceMappingURL=sale.validator.js.map