import { __awaiter, __decorate, __metadata } from "tslib";
import { Directive, Injector } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { AccountService, AppEntityEditor, changeCaseToUnderscore, EntityUtils, firstNotNilPromise, isNil, isNotNil, ReferentialUtils, } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '../services/referential-ref.service';
import { environment } from '@environments/environment';
import { ReferentialService } from '@app/referential/services/referential.service';
import { BehaviorSubject } from 'rxjs';
let AppReferentialEditor = class AppReferentialEditor extends AppEntityEditor {
    constructor(injector, dataType, dataService, form, opts) {
        super(injector, dataType, dataService, Object.assign({ i18nPrefix: (opts === null || opts === void 0 ? void 0 : opts.i18nPrefix)
                || `REFERENTIAL.${changeCaseToUnderscore(opts.entityName).toUpperCase()}.` }, opts));
        this.injector = injector;
        this.fieldDefinitions = {};
        this.$levels = new BehaviorSubject(undefined);
        this.accountService = injector.get(AccountService);
        this.referentialService = injector.get(ReferentialService);
        this.referentialRefService = injector.get(ReferentialRefService);
        this.mobile = this.settings.mobile;
        this.entityName = opts.entityName;
        this.form = form;
        // default values
        this.uniqueLabel = (opts === null || opts === void 0 ? void 0 : opts.uniqueLabel) === true;
        this.defaultBackHref = `/referential/list?entity=${this.entityName}`;
        this._logPrefix = this.entityName
            ? `[${changeCaseToUnderscore(this.entityName).replace(/_/g, '-')}-page] `
            : '[referential-page] ';
        this.debug = !environment.production;
        this.withLevels = (opts === null || opts === void 0 ? void 0 : opts.withLevels) || false;
        if (this.withLevels) {
            this.loadLevels();
        }
    }
    ready(opts) {
        const _super = Object.create(null, {
            ready: { get: () => super.ready }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.ready.call(this, opts);
            // Wait levels to be loaded
            if (this.withLevels)
                yield firstNotNilPromise(this.$levels);
        });
    }
    load(id, opts) {
        return super.load(id, Object.assign({ entityName: this.entityName }, opts));
    }
    listenChanges(id, opts) {
        return super.listenChanges(id, Object.assign(Object.assign({}, opts), { entityName: this.entityName }));
    }
    enable() {
        super.enable();
        if (this.uniqueLabel && !this.isNewData) {
            this.form.get('label').disable();
        }
    }
    /* -- protected methods -- */
    registerFieldDefinition(opts) {
        this.fieldDefinitions[opts.key] = opts;
    }
    setValue(data) {
        if (!data)
            return; // Skip
        const json = data.asObject();
        // Load level as an object
        if (this.withLevels && isNotNil(data.levelId) && typeof data.levelId === 'number') {
            json.levelId = (this.$levels.value || []).find(l => l.id === data.levelId);
        }
        json.entityName = json.entityName || this.entityName;
        this.form.patchValue(json, { emitEvent: false });
        this.markAsPristine();
    }
    getValue() {
        const _super = Object.create(null, {
            getValue: { get: () => super.getValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield _super.getValue.call(this);
            // Re add label, because missing when field disable
            if (this.uniqueLabel) {
                data.label = this.form.get('label').value;
                data.label = data.label && data.label.toUpperCase();
            }
            // Transform level object into levelId
            if (this.withLevels && isNotNil(data.levelId)) {
                data.levelId = ReferentialUtils.isNotEmpty(data.levelId) ? data.levelId.id : data.levelId;
            }
            return data;
        });
    }
    computeTitle(data) {
        // new data
        if (!data || isNil(data.id)) {
            return this.translate.get(this.i18nContext.prefix + 'NEW.TITLE').toPromise();
        }
        // Existing data
        return this.translate.get(this.i18nContext.prefix + 'EDIT.TITLE', data).toPromise();
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { title: `${this.data.label} - ${this.data.name}`, subtitle: `REFERENTIAL.ENTITY.${changeCaseToUnderscore(this.entityName).toUpperCase()}`, icon: 'list' });
        });
    }
    getFirstInvalidTabIndex() {
        if (this.form.invalid)
            return 0;
        return -1;
    }
    onNewEntity(data, options) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onNewEntity.call(this, data, options);
            // Check label is unique
            if (this.uniqueLabel) {
                this.form.get('label')
                    .setAsyncValidators((control) => __awaiter(this, void 0, void 0, function* () {
                    const label = control.enabled && control.value;
                    const filter = {
                        entityName: this.entityName,
                        excludedIds: isNotNil(this.data.id) ? [this.data.id] : undefined
                    };
                    return label && (yield this.referentialService.existsByLabel(label, filter)) ? { unique: true } : null;
                }));
            }
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
    loadLevels() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const levels = yield this.referentialRefService.loadLevels(this.entityName);
            const sortAttributes = (_a = this.fieldDefinitions.level) === null || _a === void 0 ? void 0 : _a.autocomplete.attributes;
            if (sortAttributes.length) {
                levels.sort(EntityUtils.sortComparator('label', 'asc'));
            }
            this.$levels.next(levels);
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
AppReferentialEditor = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __metadata("design:paramtypes", [Injector, Function, Object, UntypedFormGroup, Object])
], AppReferentialEditor);
export { AppReferentialEditor };
//# sourceMappingURL=referential-editor.class.js.map