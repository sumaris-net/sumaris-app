import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { UntypedFormBuilder } from '@angular/forms';
import { Program } from '../services/model/program.model';
import { ProgramService } from '../services/program.service';
import { ReferentialForm } from '../form/referential.form';
import { ProgramValidatorService } from '../services/validator/program.validator';
import { StrategiesTable } from '../strategy/strategies.table';
import { AccountService, AppEntityEditor, AppListForm, AppPropertiesForm, changeCaseToUnderscore, EntityUtils, fadeInOutAnimation, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, referentialToString, ReferentialUtils, SharedValidators, StatusIds, } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '../services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import { ProgramProperties } from '../services/config/program.config';
import { SelectReferentialModal } from '../table/select-referential.modal';
import { environment } from '@environments/environment';
import { SamplingStrategiesTable } from '../strategy/sampling/sampling-strategies.table';
import { PersonPrivilegesTable } from '@app/referential/program/privilege/person-privileges.table';
import { LocationLevels } from '@app/referential/services/model/model.enum';
import { RxState } from '@rx-angular/state';
const PROGRAM_TABS = {
    LOCATIONS: 1,
    STRATEGIES: 2,
    OPTIONS: 3,
    PERSONS: 4,
};
let ProgramPage = class ProgramPage extends AppEntityEditor {
    constructor(injector, programService, formBuilder, accountService, validatorService, referentialRefService, modalCtrl, _state) {
        super(injector, Program, programService, {
            pathIdAttribute: 'programId',
            autoOpenNextTab: false,
            tabCount: 5,
        });
        this.injector = injector;
        this.programService = programService;
        this.formBuilder = formBuilder;
        this.accountService = accountService;
        this.validatorService = validatorService;
        this.referentialRefService = referentialRefService;
        this.modalCtrl = modalCtrl;
        this._state = _state;
        this.TABS = PROGRAM_TABS;
        this.strategiesTable$ = this._state.select('strategiesTables');
        this.fieldDefinitions = {};
        this.i18nFieldPrefix = 'PROGRAM.';
        this.strategyEditor = 'legacy';
        this.i18nTabStrategiesSuffix = '';
        this.referentialToString = referentialToString;
        this.referentialEquals = ReferentialUtils.equals;
        this.form = validatorService.getFormGroup();
        // default values
        this.mobile = this.settings.mobile;
        this.defaultBackHref = '/referential/list?entity=Program';
        this._enabled = this.accountService.isAdmin();
        this.propertyDefinitions = Object.values(ProgramProperties).map((def) => {
            // Add default configuration for entity/entities
            if (def.type === 'entity' || def.type === 'entities') {
                def = Object.assign({}, def); // Copy
                def.autocomplete = Object.assign({ suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter), attributes: ['label', 'name'] }, (def.autocomplete || {}));
            }
            return def;
        });
        this.debug = !environment.production;
    }
    get strategiesTable() {
        return this._state.get('strategiesTables');
    }
    set strategiesTable(value) {
        this._state.set('strategiesTables', () => value);
    }
    ngOnInit() {
        super.ngOnInit();
        // Set entity name (required for referential form validator)
        this.referentialForm.entityName = 'Program';
        // Check label is unique
        // TODO BLA: FIXME: le control reste en pending !
        const idControl = this.form.get('id');
        this.form.get('label').setAsyncValidators((control) => __awaiter(this, void 0, void 0, function* () {
            console.debug('[program-page] Checking of label is unique...');
            const exists = yield this.programService.existsByLabel(control.value, {
                excludedIds: isNotNil(idControl.value) ? [idControl.value] : undefined,
            }, { fetchPolicy: 'network-only' });
            if (exists) {
                console.warn('[program-page] Label not unique!');
                return { unique: true };
            }
            console.debug('[program-page] Checking of label is unique [OK]');
            SharedValidators.clearError(control, 'unique');
        }));
        this.registerFormField('gearClassification', {
            type: 'entity',
            autocomplete: {
                suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
                filter: {
                    entityName: 'GearClassification',
                },
            },
        });
        this.registerFormField('taxonGroupType', {
            key: 'taxonGroupType',
            type: 'entity',
            autocomplete: {
                suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
                filter: {
                    entityName: 'TaxonGroupType',
                },
            },
        });
        this.markAsReady();
    }
    load(id, opts) {
        // Force the load from network
        return super.load(id, Object.assign(Object.assign({}, opts), { fetchPolicy: 'network-only' }));
    }
    enable(opts) {
        super.enable(opts);
        // TODO BLA remove this ?
        this.locationClassificationList.enable(opts);
        if (!this.isNewData) {
            this.form.get('label').disable();
        }
    }
    /* -- protected methods -- */
    registerForms() {
        this.addChildForms([this.referentialForm, this.propertiesForm, this.locationClassificationList, this.locationList, this.personsTable]);
    }
    registerFormField(fieldName, def) {
        const definition = Object.assign({ key: fieldName, label: this.i18nFieldPrefix + changeCaseToUnderscore(fieldName).toUpperCase() }, def);
        this.fieldDefinitions[fieldName] = definition;
    }
    onNewEntity(data, options) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onNewEntity.call(this, data, options);
            this.markAsReady();
        });
    }
    onEntityLoaded(data, options) {
        const _super = Object.create(null, {
            onEntityLoaded: { get: () => super.onEntityLoaded }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadEntityProperties(data);
            yield _super.onEntityLoaded.call(this, data, options);
            this.strategyEditor = (data && data.getProperty(ProgramProperties.STRATEGY_EDITOR)) || 'legacy';
            this.i18nTabStrategiesSuffix = this.strategyEditor === 'sampling' ? '.SAMPLING' : '';
            this.cd.detectChanges();
            this.markAsReady();
        });
    }
    onEntitySaved(data) {
        const _super = Object.create(null, {
            onEntitySaved: { get: () => super.onEntitySaved }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadEntityProperties(data);
            yield _super.onEntitySaved.call(this, data);
        });
    }
    setValue(data) {
        data = data || new Program();
        this.form.patchValue(Object.assign(Object.assign({}, data), { properties: [], locationClassifications: [], strategies: [], persons: [] }), { emitEvent: false });
        // Program properties
        this.propertiesForm.value = EntityUtils.getMapAsArray(data.properties);
        // Location classification
        this.locationClassificationList.setValue(data.locationClassifications || []);
        // Locations
        this.locationList.setValue(data.locations || []);
        // Users
        this.personsTable.setValue(data.persons || []);
        this.markForCheck();
    }
    loadEntityProperties(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(Object.keys(data.properties)
                .map((key) => this.propertyDefinitions.find((def) => def.key === key && (def.type === 'entity' || def.type === 'entities' || def.type === 'enums')))
                .filter(isNotNil)
                .map((def) => __awaiter(this, void 0, void 0, function* () {
                let value = data.properties[def.key];
                switch (def.type) {
                    case 'entity': {
                        value = typeof value === 'string' ? value.trim() : value;
                        if (isNotNilOrBlank(value)) {
                            const entity = yield this.resolveEntity(def, value);
                            data.properties[def.key] = entity;
                        }
                        else {
                            data.properties[def.key] = null;
                        }
                        break;
                    }
                    case 'entities': {
                        const values = (value || '').trim().split(/[|,]+/);
                        if (isNotEmptyArray(values)) {
                            const entities = yield Promise.all(values.map((v) => this.resolveEntity(def, v)));
                            data.properties[def.key] = entities;
                        }
                        else {
                            data.properties[def.key] = null;
                        }
                        break;
                    }
                    case 'enums': {
                        const keys = (value || '').trim().split(/[|,]+/);
                        if (isNotEmptyArray(keys)) {
                            const enumValues = keys.map((key) => { var _a; return (_a = def.values) === null || _a === void 0 ? void 0 : _a.find((defValue) => defValue && key === (defValue['key'] || defValue)); });
                            data.properties[def.key] = enumValues || null;
                        }
                        else {
                            data.properties[def.key] = null;
                        }
                        break;
                    }
                }
            })));
        });
    }
    resolveEntity(def, value) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!def.autocomplete) {
                console.warn('Missing autocomplete, in definition of property ' + def.key);
                return; // Skip
            }
            const filter = Object.assign({}, def.autocomplete.filter); // Copy filter
            const joinAttribute = ((_a = def.autocomplete.filter) === null || _a === void 0 ? void 0 : _a.joinAttribute) || 'id';
            if (joinAttribute === 'id') {
                filter.id = parseInt(value);
                value = '*';
            }
            else {
                filter.searchAttribute = joinAttribute;
            }
            const suggestFn = def.autocomplete.suggestFn || this.referentialRefService.suggest;
            try {
                // Fetch entity, as a referential
                const res = yield suggestFn(value, filter);
                const data = Array.isArray(res) ? res : res.data;
                return ((data && data[0]) || { id: value, label: '??' });
            }
            catch (err) {
                console.error('Cannot fetch entity, from option: ' + def.key + '=' + value, err);
                return { id: value, label: '??' };
            }
        });
    }
    getJsonValueToSave() {
        const _super = Object.create(null, {
            getJsonValueToSave: { get: () => super.getJsonValueToSave }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield _super.getJsonValueToSave.call(this);
            // Re add label, because missing when field disable
            data.label = this.form.get('label').value;
            // Transform properties
            data.properties = this.propertiesForm.value;
            data.properties
                .filter((property) => this.propertyDefinitions.find((def) => def.key === property.key && (def.type === 'entity' || def.type === 'entities')))
                .forEach((property) => {
                var _a;
                if (Array.isArray(property.value)) {
                    property.value = property.value
                        .map((v) => v === null || v === void 0 ? void 0 : v.id)
                        .filter(isNotNil)
                        .join(',');
                }
                else {
                    property.value = (_a = property.value) === null || _a === void 0 ? void 0 : _a.id;
                }
            });
            data.properties
                .filter((property) => this.propertyDefinitions.find((def) => def.key === property.key && def.type === 'enums'))
                .forEach((property) => {
                var _a;
                if (Array.isArray(property.value)) {
                    property.value = property.value
                        .map((v) => v === null || v === void 0 ? void 0 : v.key)
                        .filter(isNotNil)
                        .join(',');
                }
                else {
                    property.value = (_a = property.value) === null || _a === void 0 ? void 0 : _a.key;
                }
            });
            // Users
            if (this.personsTable.dirty) {
                yield this.personsTable.save();
            }
            data.persons = this.personsTable.value;
            return data;
        });
    }
    computeTitle(data) {
        // new data
        if (!data || isNil(data.id)) {
            return this.translate.get('PROGRAM.NEW.TITLE').toPromise();
        }
        // Existing data
        return this.translate.get('PROGRAM.EDIT.TITLE', data).toPromise();
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { icon: 'contract', title: `${this.data.label} - ${this.data.name}`, subtitle: 'REFERENTIAL.ENTITY.PROGRAM' });
        });
    }
    getFirstInvalidTabIndex() {
        var _a;
        if (this.referentialForm.invalid)
            return 0;
        if (this.locationList.invalid)
            return 1;
        if ((_a = this.strategiesTable) === null || _a === void 0 ? void 0 : _a.invalid)
            return 2;
        if (this.propertiesForm.invalid)
            return 3;
        if (this.personsTable.invalid)
            return 4;
        return 0;
    }
    addLocationClassification() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disabled)
                return; // Skip
            const items = yield this.openSelectReferentialModal({
                allowMultipleSelection: true,
                filter: {
                    entityName: 'LocationClassification',
                },
            });
            // Add to list
            (items || []).forEach((item) => this.locationClassificationList.add(item));
            this.markForCheck();
        });
    }
    addLocation() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disabled)
                return; // Skip
            const classificationIds = (this.locationClassificationList.value || []).map((item) => item.id);
            const rectangleLocationLevelIds = LocationLevels.getStatisticalRectangleLevelIds();
            const levelIds = (_a = (yield this.referentialRefService.loadAll(0, 1000, null, null, {
                entityName: 'LocationLevel',
                levelIds: classificationIds,
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
            }))) === null || _a === void 0 ? void 0 : _a.data.map((item) => item.id).filter((levelId) => !rectangleLocationLevelIds.includes(levelId));
            const excludedIds = (this.locationList.value || []).map((item) => item.id);
            const items = yield this.openSelectReferentialModal({
                filter: {
                    entityName: 'Location',
                    statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
                    levelIds,
                    excludedIds,
                },
            });
            // Add to list
            (items || []).forEach((item) => this.locationList.add(item));
            this.markForCheck();
        });
    }
    onOpenStrategy(row) {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = yield this.saveIfDirtyAndConfirm();
            if (!saved)
                return; // Cannot save
            this.markAsLoading();
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                yield this.router.navigate(['referential', 'programs', this.data.id, 'strategies', this.strategyEditor, row.currentData.id], {
                    queryParams: {},
                });
                this.markAsLoaded();
            }));
        });
    }
    onNewStrategy(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const savedOrContinue = yield this.saveIfDirtyAndConfirm();
            if (savedOrContinue) {
                this.markAsLoading();
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.router.navigate(['referential', 'programs', this.data.id, 'strategy', this.strategyEditor, 'new'], {
                        queryParams: {},
                    });
                    this.markAsLoaded();
                }));
            }
        });
    }
    openSelectReferentialModal(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const hasTopModal = !!(yield this.modalCtrl.getTop());
            const modal = yield this.modalCtrl.create({
                component: SelectReferentialModal,
                componentProps: opts,
                keyboardClose: true,
                backdropDismiss: false,
                cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large',
            });
            yield modal.present();
            const { data } = yield modal.onDidDismiss();
            return data;
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    ViewChild('referentialForm', { static: true }),
    __metadata("design:type", ReferentialForm)
], ProgramPage.prototype, "referentialForm", void 0);
__decorate([
    ViewChild('propertiesForm', { static: true }),
    __metadata("design:type", AppPropertiesForm)
], ProgramPage.prototype, "propertiesForm", void 0);
__decorate([
    ViewChild('locationClassificationList', { static: true }),
    __metadata("design:type", AppListForm)
], ProgramPage.prototype, "locationClassificationList", void 0);
__decorate([
    ViewChild('legacyStrategiesTable', { static: true }),
    __metadata("design:type", StrategiesTable)
], ProgramPage.prototype, "legacyStrategiesTable", void 0);
__decorate([
    ViewChild('samplingStrategiesTable', { static: true }),
    __metadata("design:type", SamplingStrategiesTable)
], ProgramPage.prototype, "samplingStrategiesTable", void 0);
__decorate([
    ViewChild('personsTable', { static: true }),
    __metadata("design:type", PersonPrivilegesTable)
], ProgramPage.prototype, "personsTable", void 0);
__decorate([
    ViewChild('locationList', { static: true }),
    __metadata("design:type", AppListForm)
], ProgramPage.prototype, "locationList", void 0);
ProgramPage = __decorate([
    Component({
        selector: 'app-program',
        templateUrl: 'program.page.html',
        styleUrls: ['./program.page.scss'],
        providers: [
            { provide: ValidatorService, useExisting: ProgramValidatorService },
            RxState
        ],
        animations: [fadeInOutAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        ProgramService,
        UntypedFormBuilder,
        AccountService,
        ProgramValidatorService,
        ReferentialRefService,
        ModalController,
        RxState])
], ProgramPage);
export { ProgramPage };
//# sourceMappingURL=program.page.js.map