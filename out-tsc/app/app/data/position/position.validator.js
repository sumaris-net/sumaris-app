import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { SharedValidators, toNumber } from '@sumaris-net/ngx-components';
let PositionValidatorService = class PositionValidatorService {
    constructor(formBuilder) {
        this.formBuilder = formBuilder;
    }
    getFormGroup(data, opts) {
        return this.formBuilder.group({
            __typename: [(data === null || data === void 0 ? void 0 : data.__typename) || opts.__typename],
            id: [toNumber(data === null || data === void 0 ? void 0 : data.id, null)],
            updateDate: [(data === null || data === void 0 ? void 0 : data.updateDate) || null],
            dateTime: [(data === null || data === void 0 ? void 0 : data.dateTime) || null],
            latitude: [toNumber(data === null || data === void 0 ? void 0 : data.latitude, null), this.getLatitudeValidator(opts)],
            longitude: [toNumber(data === null || data === void 0 ? void 0 : data.longitude, null), this.getLongitudeValidator(opts)]
        });
    }
    updateFormGroup(form, opts) {
        // Latitude
        form.get('latitude').setValidators(this.getLatitudeValidator(opts));
        // Longitude
        form.get('longitude').setValidators(this.getLongitudeValidator(opts));
    }
    getLatitudeValidator(opts) {
        let validators = [];
        if (opts === null || opts === void 0 ? void 0 : opts.required)
            validators = [Validators.required];
        if (opts === null || opts === void 0 ? void 0 : opts.boundingBox) {
            validators = [
                ...validators,
                Validators.min(Math.min(opts.boundingBox[1], opts.boundingBox[3])),
                Validators.max(Math.max(opts.boundingBox[1], opts.boundingBox[3]))
            ];
        }
        else {
            validators = [
                ...validators,
                SharedValidators.latitude
            ];
        }
        return Validators.compose(validators);
    }
    getLongitudeValidator(opts) {
        let validators = [];
        if (opts === null || opts === void 0 ? void 0 : opts.required)
            validators = [Validators.required];
        if (opts === null || opts === void 0 ? void 0 : opts.boundingBox) {
            validators = [
                ...validators,
                Validators.min(Math.min(opts.boundingBox[0], opts.boundingBox[2])),
                Validators.max(Math.max(opts.boundingBox[0], opts.boundingBox[2]))
            ];
        }
        else {
            validators = [
                ...validators,
                SharedValidators.longitude
            ];
        }
        return Validators.compose(validators);
    }
};
PositionValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], PositionValidatorService);
export { PositionValidatorService };
//# sourceMappingURL=position.validator.js.map