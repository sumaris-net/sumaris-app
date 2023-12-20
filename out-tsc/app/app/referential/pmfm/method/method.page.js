import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { AppReferentialEditor } from '@app/referential/form/referential-editor.class';
import { ReferentialForm } from '@app/referential/form/referential.form';
import { Method } from '@app/referential/pmfm/method/method.model';
import { MethodService } from '@app/referential/pmfm/method/method.service';
import { MethodValidatorService } from '@app/referential/pmfm/method/method.validator';
let MethodPage = class MethodPage extends AppReferentialEditor {
    constructor(injector, dataService, validatorService) {
        super(injector, Method, dataService, validatorService.getFormGroup(), {
            entityName: Method.ENTITY_NAME,
            uniqueLabel: true,
            withLevels: false,
            tabCount: 1,
        });
        this.registerFieldDefinition({
            key: 'isCalculated',
            label: `REFERENTIAL.METHOD.IS_CALCULATED`,
            type: 'boolean',
        });
        this.registerFieldDefinition({
            key: 'isEstimated',
            label: `REFERENTIAL.METHOD.IS_ESTIMATED`,
            type: 'boolean',
        });
    }
    /* -- protected methods -- */
    registerForms() {
        this.addChildForms([this.referentialForm]);
    }
    setValue(data) {
        super.setValue(data);
    }
    onEntitySaved(data) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    getFirstInvalidTabIndex() {
        if (this.referentialForm.invalid)
            return 0;
        return -1;
    }
};
__decorate([
    ViewChild('referentialForm', { static: true }),
    __metadata("design:type", ReferentialForm)
], MethodPage.prototype, "referentialForm", void 0);
MethodPage = __decorate([
    Component({
        selector: 'app-method',
        templateUrl: 'method.page.html',
        styleUrls: ['method.page.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector, MethodService, MethodValidatorService])
], MethodPage);
export { MethodPage };
//# sourceMappingURL=method.page.js.map