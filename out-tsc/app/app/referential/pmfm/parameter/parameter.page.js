import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { ReferentialForm } from '../../form/referential.form';
import { ParameterValidatorService } from '../../services/validator/parameter.validator';
import { AccountService, AppEntityEditor, fadeInOutAnimation, isNil, referentialToString, } from '@sumaris-net/ngx-components';
import { Parameter } from '../../services/model/parameter.model';
import { ParameterService } from '../../services/parameter.service';
import { ReferentialRefService } from '../../services/referential-ref.service';
import { environment } from '@environments/environment';
import { SimpleReferentialTable } from '../../table/referential-simple.table';
let ParameterPage = class ParameterPage extends AppEntityEditor {
    constructor(injector, accountService, validatorService, parameterService, referentialRefService) {
        super(injector, Parameter, parameterService, {
            tabCount: 1
        });
        this.injector = injector;
        this.accountService = accountService;
        this.validatorService = validatorService;
        this.parameterService = parameterService;
        this.referentialRefService = referentialRefService;
        this.referentialToString = referentialToString;
        this.form = validatorService.getFormGroup();
        // default values
        this.defaultBackHref = '/referential/list?entity=Parameter';
        this.canEdit = this.accountService.isAdmin();
        this.tabCount = 2;
        this.debug = !environment.production;
        this.fieldDefinitions = {
            type: {
                key: `type`,
                label: `REFERENTIAL.PARAMETER.TYPE`,
                type: 'enum',
                required: true,
                values: ['double', 'string', 'qualitative_value', 'date', 'boolean']
                    .map(key => ({ key, value: ('REFERENTIAL.PARAMETER.TYPE_ENUM.' + key.toUpperCase()) }))
            }
        };
    }
    get type() {
        return this.form.controls.type.value;
    }
    get isQualitative() {
        return this.type === 'qualitative_value';
    }
    ngOnInit() {
        super.ngOnInit();
        // Set entity name (required for referential form validator)
        this.referentialForm.entityName = Parameter.ENTITY_NAME;
        // Check label is unique
        this.form.get('label')
            .setAsyncValidators((control) => __awaiter(this, void 0, void 0, function* () {
            const label = control.enabled && control.value;
            return label && (yield this.parameterService.existsByLabel(label, { excludedId: this.data && this.data.id })) ?
                { unique: true } : null;
        }));
        this.markAsReady();
    }
    /* -- protected methods -- */
    updateView(data, opts) {
        const _super = Object.create(null, {
            updateView: { get: () => super.updateView }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.updateView.call(this, data, opts);
            this.tabCount = this.isQualitative ? 2 : 1;
        });
    }
    enable() {
        super.enable();
        if (!this.isNewData) {
            this.form.get('label').disable();
        }
    }
    registerForms() {
        this.addChildForms([this.qualitativeValuesTable, this.referentialForm]);
    }
    setValue(data) {
        if (!data)
            return; // Skip
        const json = data.asObject();
        json.qualitativeValues = json.qualitativeValues || []; // Make sure to it array
        this.form.patchValue(json, { emitEvent: false });
        // QualitativeValues
        this.qualitativeValuesTable.value = data.qualitativeValues && data.qualitativeValues.slice() || []; // force update
        this.markAsPristine();
    }
    getValue() {
        const _super = Object.create(null, {
            getValue: { get: () => super.getValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield _super.getValue.call(this);
            // Re add label, because missing when field disable
            data.label = this.form.get('label').value;
            data.label = data.label && data.label.toUpperCase();
            yield this.qualitativeValuesTable.save();
            data.qualitativeValues = this.qualitativeValuesTable.value;
            return data;
        });
    }
    computeTitle(data) {
        // new data
        if (!data || isNil(data.id)) {
            return this.translate.get('REFERENTIAL.PARAMETER.NEW.TITLE').toPromise();
        }
        // Existing data
        return this.translate.get('REFERENTIAL.PARAMETER.EDIT.TITLE', data).toPromise();
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { title: `${this.data.label} - ${this.data.name}`, subtitle: 'REFERENTIAL.ENTITY.PARAMETER', icon: 'list' });
        });
    }
    getFirstInvalidTabIndex() {
        if (this.referentialForm.invalid)
            return 0;
        if (this.isQualitative && this.qualitativeValuesTable.invalid)
            return 1;
        return -1;
    }
    onEntityLoaded(data, options) {
        const _super = Object.create(null, {
            onEntityLoaded: { get: () => super.onEntityLoaded }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onEntityLoaded.call(this, data, options);
            this.canEdit = this.canUserWrite(data);
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    ViewChild('referentialForm', { static: true }),
    __metadata("design:type", ReferentialForm)
], ParameterPage.prototype, "referentialForm", void 0);
__decorate([
    ViewChild('qualitativeValuesTable', { static: true }),
    __metadata("design:type", SimpleReferentialTable)
], ParameterPage.prototype, "qualitativeValuesTable", void 0);
ParameterPage = __decorate([
    Component({
        selector: 'app-parameter',
        templateUrl: 'parameter.page.html',
        providers: [
            { provide: ValidatorService, useExisting: ParameterValidatorService }
        ],
        animations: [fadeInOutAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        AccountService,
        ParameterValidatorService,
        ParameterService,
        ReferentialRefService])
], ParameterPage);
export { ParameterPage };
//# sourceMappingURL=parameter.page.js.map