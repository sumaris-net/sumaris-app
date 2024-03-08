import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { SharedValidators } from '@sumaris-net/ngx-components';
let ProgramPersonValidatorService = class ProgramPersonValidatorService {
    constructor(formBuilder) {
        this.formBuilder = formBuilder;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroup(data) {
        return this.formBuilder.group({
            id: [data && data.id || null],
            updateDate: [data && data.updateDate || null],
            programId: [data && data.programId || null],
            location: [data && data.location || null, SharedValidators.entity],
            privilege: [data && data.privilege || null, Validators.compose([Validators.required, SharedValidators.entity])],
            person: [data && data.person || null, Validators.compose([Validators.required, SharedValidators.entity])],
        });
    }
};
ProgramPersonValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], ProgramPersonValidatorService);
export { ProgramPersonValidatorService };
//# sourceMappingURL=program-person.validator.js.map