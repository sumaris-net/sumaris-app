import { __decorate, __metadata, __param } from "tslib";
import { ReferentialValidatorService } from '../services/validator/referential.validator';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, Optional } from '@angular/core';
import { AppForm, splitById, StatusList } from '@sumaris-net/ngx-components';
import { ValidatorService } from '@e-is/ngx-material-table';
import { FormGroupDirective } from '@angular/forms';
let ReferentialForm = class ReferentialForm extends AppForm {
    constructor(injector, validatorService, formGroupDir) {
        super(injector, (formGroupDir === null || formGroupDir === void 0 ? void 0 : formGroupDir.form) || (validatorService === null || validatorService === void 0 ? void 0 : validatorService.getRowValidator()));
        this.validatorService = validatorService;
        this.formGroupDir = formGroupDir;
        this._statusList = StatusList;
        this.showError = true;
        this.showDescription = true;
        this.showComments = true;
        this.cd = injector.get(ChangeDetectorRef);
    }
    set statusList(values) {
        this._statusList = values;
        // Fill statusById
        this.statusById = splitById(values);
    }
    get statusList() {
        return this._statusList;
    }
    ngOnInit() {
        var _a, _b;
        this.setForm(this.form || ((_a = this.formGroupDir) === null || _a === void 0 ? void 0 : _a.form) || ((_b = this.validatorService) === null || _b === void 0 ? void 0 : _b.getRowValidator()));
        super.ngOnInit();
        // Fill statusById, if not set by input
        if (this._statusList && !this.statusById) {
            this.statusById = splitById(this._statusList);
        }
    }
    setValue(data, opts) {
        super.setValue(data, opts);
        // Make sure to set entityName if set from Input()
        const entityNameControl = this.form.get('entityName');
        if (entityNameControl && this.entityName && entityNameControl.value !== this.entityName) {
            entityNameControl.setValue(this.entityName, opts);
        }
    }
    markForCheck() {
        var _a;
        (_a = this.cd) === null || _a === void 0 ? void 0 : _a.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialForm.prototype, "showDescription", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialForm.prototype, "showComments", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialForm.prototype, "entityName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], ReferentialForm.prototype, "statusList", null);
ReferentialForm = __decorate([
    Component({
        selector: 'app-referential-form',
        templateUrl: './referential.form.html',
        changeDetection: ChangeDetectionStrategy.OnPush,
        providers: [
            {
                provide: ValidatorService,
                useExisting: ReferentialValidatorService
            }
        ]
    }),
    __param(1, Optional()),
    __param(2, Optional()),
    __metadata("design:paramtypes", [Injector,
        ValidatorService,
        FormGroupDirective])
], ReferentialForm);
export { ReferentialForm };
//# sourceMappingURL=referential.form.js.map