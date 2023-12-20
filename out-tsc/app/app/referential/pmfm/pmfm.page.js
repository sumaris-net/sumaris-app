import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { AccountService, AppEntityEditor, fadeInOutAnimation, isEmptyArray, isNil, isNilOrBlank, isNotEmptyArray, joinProperties, joinPropertiesPath, Referential, referentialToString, ReferentialUtils, } from '@sumaris-net/ngx-components';
import { ReferentialForm } from '../form/referential.form';
import { PmfmValidatorService } from '../services/validator/pmfm.validator';
import { Pmfm } from '../services/model/pmfm.model';
import { PmfmService } from '../services/pmfm.service';
import { ReferentialRefService } from '../services/referential-ref.service';
import { ParameterService } from '../services/parameter.service';
import { filter, mergeMap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { environment } from '@environments/environment';
import { SelectReferentialModal } from '@app/referential/table/select-referential.modal';
import { IonCheckbox, ModalController } from '@ionic/angular';
import { SimpleReferentialTable } from '@app/referential/table/referential-simple.table';
import { UnitIds } from '@app/referential/services/model/model.enum';
let PmfmPage = class PmfmPage extends AppEntityEditor {
    constructor(injector, accountService, validatorService, pmfmService, parameterService, referentialRefService, modalCtrl) {
        super(injector, Pmfm, pmfmService, { tabCount: 2 });
        this.injector = injector;
        this.accountService = accountService;
        this.validatorService = validatorService;
        this.pmfmService = pmfmService;
        this.parameterService = parameterService;
        this.referentialRefService = referentialRefService;
        this.modalCtrl = modalCtrl;
        this.$parameter = new BehaviorSubject(null);
        this.useDefaultQualitativesValues = true;
        this.referentialToString = referentialToString;
        this.form = validatorService.getFormGroup();
        // default values
        this.defaultBackHref = '/referential/list?entity=Pmfm';
        this.debug = !environment.production;
    }
    get matrix() {
        return this.form.controls.matrix.value;
    }
    get hasMatrix() {
        return ReferentialUtils.isNotEmpty(this.matrix);
    }
    ngOnInit() {
        super.ngOnInit();
        // Set entity name (required for referential form validator)
        this.referentialForm.entityName = 'Pmfm';
        const autocompleteConfig = {
            suggestFn: (value, opts) => this.referentialRefService.suggest(value, opts),
            displayWith: (value) => value && joinPropertiesPath(value, ['label', 'name']),
            attributes: ['label', 'name'],
            columnSizes: [6, 6],
        };
        this.fieldDefinitions = {
            parameter: {
                key: `parameter`,
                label: `REFERENTIAL.PMFM.PARAMETER`,
                type: 'entity',
                autocomplete: Object.assign(Object.assign({}, autocompleteConfig), { filter: { entityName: 'Parameter' }, showAllOnFocus: false }),
            },
            unit: {
                key: `unit`,
                label: `REFERENTIAL.PMFM.UNIT`,
                type: 'entity',
                autocomplete: Object.assign(Object.assign({}, autocompleteConfig), { attributes: ['label'], filter: { entityName: 'Unit' }, showAllOnFocus: false }),
            },
            // Numerical options
            minValue: {
                key: `minValue`,
                label: `REFERENTIAL.PMFM.MIN_VALUE`,
                type: 'double',
            },
            maxValue: {
                key: `maxValue`,
                label: `REFERENTIAL.PMFM.MAX_VALUE`,
                type: 'double',
            },
            defaultValue: {
                key: `defaultValue`,
                label: `REFERENTIAL.PMFM.DEFAULT_VALUE`,
                type: 'double',
            },
            maximumNumberDecimals: {
                key: `maximumNumberDecimals`,
                label: `REFERENTIAL.PMFM.MAXIMUM_NUMBER_DECIMALS`,
                type: 'integer',
                minValue: 0,
            },
            signifFiguresNumber: {
                key: `signifFiguresNumber`,
                label: `REFERENTIAL.PMFM.SIGNIF_FIGURES_NUMBER`,
                type: 'integer',
                minValue: 0,
            },
            precision: {
                key: `precision`,
                label: `REFERENTIAL.PMFM.PRECISION`,
                type: 'double',
                minValue: 0,
            },
            matrix: {
                key: `matrix`,
                label: `REFERENTIAL.PMFM.MATRIX`,
                type: 'entity',
                autocomplete: Object.assign(Object.assign({}, autocompleteConfig), { attributes: ['id', 'name'], filter: { entityName: 'Matrix' }, showAllOnFocus: false }),
            },
            fraction: {
                key: `fraction`,
                label: `REFERENTIAL.PMFM.FRACTION`,
                type: 'entity',
                autocomplete: Object.assign(Object.assign({}, autocompleteConfig), { attributes: ['id', 'name'], filter: { entityName: 'Fraction' }, showAllOnFocus: false }),
            },
            method: {
                key: `method`,
                label: `REFERENTIAL.PMFM.METHOD`,
                type: 'entity',
                autocomplete: Object.assign(Object.assign({}, autocompleteConfig), { attributes: ['id', 'name'], filter: { entityName: 'Method' }, showAllOnFocus: false }),
            },
        };
        // TODO : See #450 (need to implement `levelIds[]` to get "n to n" relation between Fraction and Matrix)
        // Check fraction
        // this.form.get('fraction')
        //   .setAsyncValidators(async (control: AbstractControl) => {
        //     const value = control.enabled && control.value;
        //     return value && (!this.matrix || value.levelId !== this.matrix.id) ? {entity: true} : null;
        //   });
        // Listen for parameter
        this.registerSubscription(this.form
            .get('parameter')
            .valueChanges.pipe(filter(ReferentialUtils.isNotEmpty), mergeMap((p) => this.parameterService.load(p.id)))
            .subscribe((p) => {
            // If qualitative value: use 'None' unit
            if (p.isQualitative) {
                this.form.get('unit').setValue({ id: UnitIds.NONE });
            }
            else {
                // Remove default unit (added just before)
                const unit = this.form.get('unit').value;
                if (unit && unit.id === UnitIds.NONE && !unit.label) {
                    this.form.get('unit').setValue(null, { emitEvent: false });
                }
            }
            this.$parameter.next(p);
        }));
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.$parameter.complete();
    }
    addNewParameter() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.router.navigateByUrl('/referential/parameter/new');
            return true;
        });
    }
    openParameter(parameter) {
        return __awaiter(this, void 0, void 0, function* () {
            parameter = parameter || this.$parameter.value;
            if (isNil(parameter))
                return;
            const succeed = yield this.router.navigateByUrl(`/referential/parameter/${parameter.id}?label=${parameter.label}`);
            return succeed;
        });
    }
    /* -- protected methods -- */
    registerForms() {
        this.addChildForms([this.referentialForm, this.qualitativeValuesTable]);
    }
    setValue(data) {
        var _a;
        if (!data)
            return; // Skip
        const json = data.asObject();
        json.entityName = Pmfm.ENTITY_NAME;
        this.form.patchValue(json, { emitEvent: false });
        // qualitativeValues
        if (isNilOrBlank(data.qualitativeValues)) {
            this.qualitativeValuesTable.value = ((_a = data.parameter) === null || _a === void 0 ? void 0 : _a.qualitativeValues) || [];
            this.btnUseDefaultQualitativeValues.checked = true;
            this.useDefaultQualitativesValues = true;
        }
        else {
            this.qualitativeValuesTable.value = this.data.qualitativeValues.map((d) => Referential.fromObject(d.asObject()));
            this.btnUseDefaultQualitativeValues.checked = false;
            this.useDefaultQualitativesValues = false;
        }
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
            data.qualitativeValues = this.useDefaultQualitativesValues ? null : this.qualitativeValuesTable.value;
            return data;
        });
    }
    computeTitle(data) {
        // new data
        if (!data || isNil(data.id)) {
            return this.translate.get('REFERENTIAL.PMFM.NEW.TITLE').toPromise();
        }
        // Existing data
        return this.translate.get('REFERENTIAL.PMFM.EDIT.TITLE', { title: joinProperties(this.data, ['label', 'name']) }).toPromise();
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { title: joinProperties(this.data, ['label', 'name']), subtitle: 'REFERENTIAL.ENTITY.PMFM', icon: 'list' });
        });
    }
    getFirstInvalidTabIndex() {
        if (this.referentialForm.invalid)
            return 0;
        return 0;
    }
    onNewEntity(data, options) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onNewEntity.call(this, data, options);
            // Check label is unique
            this.form.get('label').setAsyncValidators((control) => __awaiter(this, void 0, void 0, function* () {
                const label = control.enabled && control.value;
                return label && (yield this.pmfmService.existsByLabel(label, { excludedId: this.data.id })) ? { unique: true } : null;
            }));
            this.markAsReady();
        });
    }
    onEntityLoaded(data, options) {
        const _super = Object.create(null, {
            onEntityLoaded: { get: () => super.onEntityLoaded }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onEntityLoaded.call(this, data, options);
            this.markAsReady();
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    toggleUseDefaultQualitativeValues(event) {
        return __awaiter(this, void 0, void 0, function* () {
            // NOTE : the status of the check btn is not already updated at this moment this is why is it inverted
            if (!this.btnUseDefaultQualitativeValues.checked) {
                this.qualitativeValuesTable.value = this.data.parameter.qualitativeValues;
                this.useDefaultQualitativesValues = true;
                this.markAsDirty();
            }
            else {
                this.qualitativeValuesTable.value = null;
                const data = yield this.openSelectReferentialModal();
                if (isNilOrBlank(data)) {
                    this.btnUseDefaultQualitativeValues.checked = true;
                    this.qualitativeValuesTable.value = this.data.parameter.qualitativeValues;
                }
                else {
                    this.useDefaultQualitativesValues = false;
                }
            }
        });
    }
    openSelectReferentialModal(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const excludedIds = (this.qualitativeValuesTable.value || []).map((q) => q.id);
            const filter = {
                entityName: 'QualitativeValue',
                levelId: this.form.get('parameter').value.id,
                excludedIds,
            };
            console.debug(`[pmfm-page] Opening select PMFM modal, with filter:`, filter);
            const hasTopModal = !!(yield this.modalCtrl.getTop());
            const modal = yield this.modalCtrl.create({
                component: SelectReferentialModal,
                componentProps: Object.assign(Object.assign({}, opts), { allowMultipleSelection: true, showLevelFilter: false, filter }),
                keyboardClose: true,
                backdropDismiss: false,
                cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large',
            });
            yield modal.present();
            const { data } = yield modal.onDidDismiss();
            if (isNotEmptyArray(data)) {
                this.qualitativeValuesTable.value = isEmptyArray(this.qualitativeValuesTable.value) ? data : this.qualitativeValuesTable.value.concat(data);
                this.markAsDirty();
            }
            return data;
        });
    }
    onAfterDeleteQualitativeValueRows(deletedRows) {
        var _a, _b;
        this.markAsDirty();
        if (isEmptyArray(this.qualitativeValuesTable.value)) {
            this.useDefaultQualitativesValues = true;
            this.btnUseDefaultQualitativeValues.checked = true;
            this.qualitativeValuesTable.value = ((_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.parameter) === null || _b === void 0 ? void 0 : _b.qualitativeValues) || [];
        }
    }
    onQualitativeValueRowClick(row) {
        this.qualitativeValuesTable.selection.toggle(row);
    }
};
__decorate([
    ViewChild('referentialForm', { static: true }),
    __metadata("design:type", ReferentialForm)
], PmfmPage.prototype, "referentialForm", void 0);
__decorate([
    ViewChild('qualitativeValuesTable', { static: true }),
    __metadata("design:type", SimpleReferentialTable)
], PmfmPage.prototype, "qualitativeValuesTable", void 0);
__decorate([
    ViewChild('btnUseDefaultQualitativeValues', { static: true }),
    __metadata("design:type", IonCheckbox)
], PmfmPage.prototype, "btnUseDefaultQualitativeValues", void 0);
PmfmPage = __decorate([
    Component({
        selector: 'app-pmfm',
        templateUrl: 'pmfm.page.html',
        providers: [{ provide: ValidatorService, useExisting: PmfmValidatorService }],
        animations: [fadeInOutAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        AccountService,
        PmfmValidatorService,
        PmfmService,
        ParameterService,
        ReferentialRefService,
        ModalController])
], PmfmPage);
export { PmfmPage };
//# sourceMappingURL=pmfm.page.js.map