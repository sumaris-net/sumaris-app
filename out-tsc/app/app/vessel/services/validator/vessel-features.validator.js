import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
import { VesselFeatures } from '../model/vessel.model';
import { fromDateISOString, SharedValidators, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
let VesselFeaturesValidatorService = class VesselFeaturesValidatorService {
    constructor(formBuilder, dateAdapter, translate) {
        this.formBuilder = formBuilder;
        this.dateAdapter = dateAdapter;
        this.translate = translate;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroup(data, opts) {
        opts = this.fillDefaultOptions(opts);
        return this.formBuilder.group({
            __typename: [VesselFeatures.TYPENAME],
            id: [toNumber(data === null || data === void 0 ? void 0 : data.id, null)],
            updateDate: [(data === null || data === void 0 ? void 0 : data.updateDate) || null],
            creationDate: [(data === null || data === void 0 ? void 0 : data.creationDate) || null],
            startDate: [(data === null || data === void 0 ? void 0 : data.startDate) || null, Validators.required],
            endDate: [(data === null || data === void 0 ? void 0 : data.endDate) || null],
            name: [(data === null || data === void 0 ? void 0 : data.name) || null, opts.withNameRequired ? Validators.compose([Validators.required, Validators.maxLength(100)]) : Validators.maxLength(100)],
            exteriorMarking: [(data === null || data === void 0 ? void 0 : data.exteriorMarking) || null, Validators.compose([Validators.required, Validators.maxLength(100)])],
            administrativePower: [toNumber(data === null || data === void 0 ? void 0 : data.administrativePower, null), Validators.compose([Validators.min(0), SharedValidators.integer])],
            lengthOverAll: [toNumber(data === null || data === void 0 ? void 0 : data.lengthOverAll, null), Validators.compose([Validators.min(0), SharedValidators.decimal({ maxDecimals: 2 })])],
            grossTonnageGrt: [toNumber(data === null || data === void 0 ? void 0 : data.grossTonnageGrt, null), Validators.compose([Validators.min(0), SharedValidators.decimal({ maxDecimals: 2 })])],
            grossTonnageGt: [toNumber(data === null || data === void 0 ? void 0 : data.grossTonnageGt, null), Validators.compose([Validators.min(0), SharedValidators.decimal({ maxDecimals: 2 })])],
            constructionYear: [toNumber(data === null || data === void 0 ? void 0 : data.constructionYear, null), Validators.compose([Validators.min(1900), SharedValidators.integer])],
            ircs: [(data === null || data === void 0 ? void 0 : data.ircs) || null],
            hullMaterial: [(data === null || data === void 0 ? void 0 : data.hullMaterial) || null, SharedValidators.entity],
            basePortLocation: [(data === null || data === void 0 ? void 0 : data.basePortLocation) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            comments: [(data === null || data === void 0 ? void 0 : data.comments) || null, Validators.maxLength(2000)],
            qualityFlagId: [data && data.qualityFlagId || QualityFlagIds.NOT_QUALIFIED]
        });
    }
    updateFormGroup(form, opts) {
        opts = this.fillDefaultOptions(opts);
        const nameControl = form.get('name');
        const startDateControl = form.get('startDate');
        if (opts.withNameRequired) {
            nameControl.setValidators(Validators.required);
        }
        else {
            nameControl.clearValidators();
        }
        nameControl.updateValueAndValidity({ emitEvent: false });
        if (opts.maxDate) {
            const maxDate = fromDateISOString(opts.maxDate);
            const maxDateStr = this.dateAdapter.format(maxDate, this.translate.instant('COMMON.DATE_TIME_PATTERN'));
            startDateControl.setValidators(Validators.compose([
                SharedValidators.dateIsBefore(opts.maxDate, maxDateStr, 'day'),
                Validators.required
            ]));
        }
        else {
            startDateControl.setValidators(Validators.required);
        }
    }
    fillDefaultOptions(opts) {
        opts = opts || {};
        opts.withNameRequired = toBoolean(opts.withNameRequired, true);
        return opts;
    }
};
VesselFeaturesValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        DateAdapter,
        TranslateService])
], VesselFeaturesValidatorService);
export { VesselFeaturesValidatorService };
//# sourceMappingURL=vessel-features.validator.js.map