var FishingAreaValidatorService_1;
import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { DataEntityValidatorService } from '../services/validator/data-entity.validator';
import { FishingArea } from './fishing-area.model';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { LocalSettingsService, SharedFormGroupValidators, SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
let FishingAreaValidatorService = FishingAreaValidatorService_1 = class FishingAreaValidatorService extends DataEntityValidatorService {
    constructor(formBuilder, translate, settings) {
        super(formBuilder, translate, settings);
        this.formBuilder = formBuilder;
        this.translate = translate;
        this.settings = settings;
    }
    getFormGroupConfig(data, opts) {
        return Object.assign(super.getFormGroupConfig(data, opts), {
            __typename: [FishingArea.TYPENAME],
            location: [data && data.location || null, this.getLocationValidators(opts)],
            distanceToCoastGradient: [data && data.distanceToCoastGradient || null, SharedValidators.entity],
            depthGradient: [data && data.depthGradient || null, SharedValidators.entity],
            nearbySpecificArea: [data && data.nearbySpecificArea || null, SharedValidators.entity]
        });
    }
    getFormGroupOptions(data, opts) {
        // Location if required only if the fishing area is NOT already required
        if (!opts || opts.required !== true) {
            return {
                validator: [
                    SharedFormGroupValidators.requiredIf('location', 'distanceToCoastGradient'),
                    SharedFormGroupValidators.requiredIf('location', 'depthGradient'),
                    SharedFormGroupValidators.requiredIf('location', 'nearbySpecificArea')
                ]
            };
        }
        else {
            // Location control is already required (see getLocationValidators() )
            return null;
        }
    }
    updateFormGroup(formGroup, opts) {
        var _a;
        opts = this.fillDefaultOptions(opts);
        const locationValidators = this.getLocationValidators(opts);
        formGroup.get('location').setValidators(locationValidators);
        // Set form group validators
        formGroup.setValidators((_a = this.getFormGroupOptions(null, opts)) === null || _a === void 0 ? void 0 : _a.validators);
        formGroup.updateValueAndValidity({ emitEvent: false });
    }
    getLocationValidators(opts) {
        return (opts && opts.required) ? Validators.compose([Validators.required, FishingAreaValidatorService_1.entity]) : SharedValidators.entity;
    }
    fillDefaultOptions(opts) {
        opts = super.fillDefaultOptions(opts);
        opts.required = toBoolean(opts.required, true);
        return opts;
    }
    static entity(control) {
        const value = control.value;
        if (value && (typeof value !== 'object' || value.id === undefined || value.id === null)) {
            return { entity: true };
        }
        return null;
    }
};
FishingAreaValidatorService = FishingAreaValidatorService_1 = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService])
], FishingAreaValidatorService);
export { FishingAreaValidatorService };
//# sourceMappingURL=fishing-area.validator.js.map