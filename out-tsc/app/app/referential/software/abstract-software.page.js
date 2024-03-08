import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectorRef, Directive, Injector, ViewChild } from '@angular/core';
import { AccountService, AppEditorOptions, AppEntityEditor, AppPropertiesForm, CORE_CONFIG_OPTIONS, EntityUtils, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, PlatformService, } from '@sumaris-net/ngx-components';
import { ReferentialForm } from '../form/referential.form';
import { SoftwareService } from '../services/software.service';
import { SoftwareValidatorService } from '../services/validator/software.validator';
import { ReferentialRefService } from '../services/referential-ref.service';
let AbstractSoftwarePage = class AbstractSoftwarePage extends AppEntityEditor {
    constructor(injector, dataType, dataService, validatorService, configOptions, options) {
        super(injector, dataType, dataService, options);
        this.validatorService = validatorService;
        this.platform = injector.get(PlatformService);
        this.accountService = injector.get(AccountService);
        this.cd = injector.get(ChangeDetectorRef);
        this.referentialRefService = injector.get(ReferentialRefService);
        // Convert map to list of options
        this.propertyDefinitions = Object.values(Object.assign(Object.assign({}, CORE_CONFIG_OPTIONS), configOptions)).map((def) => {
            if (def.type === 'entity' || def.type === 'entities') {
                def = Object.assign({}, def); // Copy
                def.autocomplete = Object.assign({ suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter), attributes: ['label', 'name'] }, (def.autocomplete || {}));
            }
            return def;
        });
        this.form = validatorService.getFormGroup();
    }
    ngOnInit() {
        super.ngOnInit();
        // Set entity name (required for referential form validator)
        this.referentialForm.entityName = 'Software';
        // Check label is unique
        if (this.service instanceof SoftwareService) {
            const softwareService = this.service;
            this.form.get('label').setAsyncValidators((control) => __awaiter(this, void 0, void 0, function* () {
                const label = control.enabled && control.value;
                return label && (yield softwareService.existsByLabel(label)) ? { unique: true } : null;
            }));
        }
    }
    /* -- protected methods -- */
    enable() {
        super.enable();
        if (!this.isNewData) {
            this.form.get('label').disable();
        }
    }
    registerForms() {
        this.addChildForms([this.referentialForm, this.propertiesForm]);
    }
    loadFromRoute() {
        const _super = Object.create(null, {
            loadFromRoute: { get: () => super.loadFromRoute }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure the platform is ready, before loading configuration
            yield this.platform.ready();
            return _super.loadFromRoute.call(this);
        });
    }
    setValue(data) {
        if (!data)
            return; // Skip
        this.form.patchValue(Object.assign(Object.assign({}, data.asObject()), { properties: [] }), { emitEvent: false });
        // Program properties
        this.propertiesForm.value = EntityUtils.getMapAsArray(data.properties || {});
        this.markAsPristine();
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
            return data;
        });
    }
    computeTitle(data) {
        // new data
        if (!data || isNil(data.id)) {
            return this.translate.get('CONFIGURATION.NEW.TITLE').toPromise();
        }
        return this.translate.get('CONFIGURATION.EDIT.TITLE', data).toPromise();
    }
    getFirstInvalidTabIndex() {
        if (this.referentialForm.invalid)
            return 0;
        if (this.propertiesForm.invalid)
            return 1;
        return -1;
    }
    onEntityLoaded(data, options) {
        const _super = Object.create(null, {
            onEntityLoaded: { get: () => super.onEntityLoaded }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadEntityProperties(data);
            yield _super.onEntityLoaded.call(this, data, options);
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
            this.markAsReady();
        });
    }
    loadEntityProperties(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(Object.keys(data.properties)
                .map((key) => this.propertyDefinitions.find((def) => def.key === key && (def.type === 'entity' || def.type === 'entities')))
                .filter(isNotNil)
                .map((def) => __awaiter(this, void 0, void 0, function* () {
                if (def.type === 'entities') {
                    const values = (data.properties[def.key] || '').trim().split(/[|,]+/);
                    if (isNotEmptyArray(values)) {
                        const entities = yield Promise.all(values.map((value) => this.resolveEntity(def, value)));
                        data.properties[def.key] = entities;
                    }
                    else {
                        data.properties[def.key] = null;
                    }
                }
                // If type = 'entity'
                else {
                    let value = data.properties[def.key];
                    value = typeof value === 'string' ? value.trim() : value;
                    if (isNotNilOrBlank(value)) {
                        const entity = yield this.resolveEntity(def, value);
                        data.properties[def.key] = entity;
                    }
                    else {
                        data.properties[def.key] = null;
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
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    ViewChild('referentialForm', { static: true }),
    __metadata("design:type", ReferentialForm)
], AbstractSoftwarePage.prototype, "referentialForm", void 0);
__decorate([
    ViewChild('propertiesForm', { static: true }),
    __metadata("design:type", AppPropertiesForm)
], AbstractSoftwarePage.prototype, "propertiesForm", void 0);
AbstractSoftwarePage = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __metadata("design:paramtypes", [Injector, Function, Object, SoftwareValidatorService, Object, AppEditorOptions])
], AbstractSoftwarePage);
export { AbstractSoftwarePage };
//# sourceMappingURL=abstract-software.page.js.map