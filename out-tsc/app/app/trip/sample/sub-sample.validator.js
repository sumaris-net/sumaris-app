import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { SharedValidators } from '@sumaris-net/ngx-components';
import { SampleValidatorService } from '@app/trip/sample/sample.validator';
import { TranslateService } from '@ngx-translate/core';
import { ImageAttachmentValidator } from '@app/data/image/image-attachment.validator';
let SubSampleValidatorService = class SubSampleValidatorService extends SampleValidatorService {
    constructor(formBuilder, translate, imageAttachmentValidator) {
        super(formBuilder, translate, imageAttachmentValidator);
        this.formBuilder = formBuilder;
        this.translate = translate;
        this.imageAttachmentValidator = imageAttachmentValidator;
    }
    getFormGroupConfig(data, opts) {
        const config = super.getFormGroupConfig(data, Object.assign({ withChildren: false }, opts));
        // Change label and samples to optional
        config['label'] = [data && data.label || null];
        config['sampleDate'] = [data && data.sampleDate || null];
        // Add parent control (required by default)
        if (!opts || opts.withParent !== false) {
            const parentValidators = (!opts || opts.requiredParent !== false)
                ? Validators.compose([SharedValidators.object, Validators.required])
                : SharedValidators.object;
            config['parent'] = [data && data.parent || null, parentValidators];
        }
        return config;
    }
    getFormGroupOptions(data, opts) {
        return {
            validators: [] // remove required validator on taxonGroup/taxonName
        };
    }
};
SubSampleValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        ImageAttachmentValidator])
], SubSampleValidatorService);
export { SubSampleValidatorService };
//# sourceMappingURL=sub-sample.validator.js.map