import { AppValidatorService } from '@sumaris-net/ngx-components';
import { FormBuilder } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
export class BaseValidatorService extends AppValidatorService {
    static create(injector, factory) {
        const target = new BaseValidatorService(injector.get(FormBuilder), injector.get(TranslateService));
        target.getFormGroup = factory;
        return target;
    }
    constructor(formBuilder, translate) {
        super(formBuilder, translate);
    }
    getRowValidator(data, opts) {
        return this.getFormGroup(data, opts);
    }
    getFormGroup(data, opts) {
        return this.formBuilder.group(this.getFormGroupConfig(data, opts), this.getFormGroupOptions(data, opts));
    }
    getFormGroupConfig(data, opts) {
        return {};
    }
    getFormGroupOptions(data, opts) {
        return {};
    }
    updateFormGroup(form, opts) {
    }
}
export class ValidatorService extends BaseValidatorService {
    constructor(formBuilder, translate, createValidatorFn) {
        super(formBuilder, translate);
        this.getFormGroup = createValidatorFn;
    }
}
//# sourceMappingURL=base.validator.service.js.map