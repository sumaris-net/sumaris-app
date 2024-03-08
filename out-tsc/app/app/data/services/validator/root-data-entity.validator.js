import { AppFormArray, ReferentialUtils, SharedFormArrayValidators, SharedValidators, } from '@sumaris-net/ngx-components';
import { Validators } from '@angular/forms';
import { DataEntityValidatorService } from './data-entity.validator';
export class DataRootEntityValidatorService extends DataEntityValidatorService {
    constructor(formBuilder, translate, settings) {
        super(formBuilder, translate, settings);
    }
    getFormGroupConfig(data, opts) {
        return Object.assign(super.getFormGroupConfig(data), {
            program: [data && data.program || null, Validators.compose([Validators.required, SharedValidators.entity])],
            creationDate: [data && data.creationDate || null],
            validationDate: [data && data.validationDate || null],
            recorderPerson: [data && data.recorderPerson || null, SharedValidators.entity],
            comments: [data && data.comments || null, Validators.maxLength(2000)],
            synchronizationStatus: [data && data.synchronizationStatus || null]
        });
    }
    getObserversFormArray(data, opts) {
        const required = !opts || opts.required !== false;
        const formArray = new AppFormArray((value) => this.getObserverControl(value, { required }), ReferentialUtils.equals, ReferentialUtils.isEmpty, {
            allowEmptyArray: false,
            validators: required ? SharedFormArrayValidators.requiredArrayMinLength(1) : null
        });
        if (data || required) {
            formArray.patchValue(data || [null]);
        }
        return formArray;
    }
    getObserverControl(observer, opts) {
        return this.formBuilder.control(observer || null, (opts === null || opts === void 0 ? void 0 : opts.required) ? [Validators.required, SharedValidators.entity] : SharedValidators.entity);
    }
}
//# sourceMappingURL=root-data-entity.validator.js.map