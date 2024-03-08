import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { UntypedFormBuilder } from '@angular/forms';
import { Strategy } from '../services/model/strategy.model';
import { AccountService, Alerts, AppEntityEditor, firstNotNilPromise, isNil, isNotNil, } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '../services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import { StrategyForm } from './strategy.form';
import { StrategyValidatorService } from '../services/validator/strategy.validator';
import { StrategyService } from '../services/strategy.service';
import { BehaviorSubject } from 'rxjs';
import { ReferentialForm } from '../form/referential.form';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ProgramRefService } from '../services/program-ref.service';
let StrategyPage = class StrategyPage extends AppEntityEditor {
    constructor(injector, formBuilder, accountService, validatorService, dataService, programRefService, referentialRefService, modalCtrl) {
        super(injector, Strategy, dataService, {
            pathIdAttribute: 'strategyId'
        });
        this.injector = injector;
        this.formBuilder = formBuilder;
        this.accountService = accountService;
        this.validatorService = validatorService;
        this.programRefService = programRefService;
        this.referentialRefService = referentialRefService;
        this.modalCtrl = modalCtrl;
        this.$program = new BehaviorSubject(null);
        this.showImportModal = false;
        // default values
        this.defaultBackHref = '/referential/programs';
        this._enabled = this.accountService.isAdmin();
        this.tabCount = 4;
        this.debug = !environment.production;
    }
    get form() {
        return this.strategyForm.form;
    }
    ngOnInit() {
        super.ngOnInit();
        // Update back href, when program changed
        this.registerSubscription(this.$program.subscribe(program => {
            if (program && isNotNil(program.id)) {
                this.defaultBackHref = `/referential/programs/${program.id}?tab=1`;
            }
            this.markAsReady();
            this.markForCheck();
        }));
        this.registerSubscription(this.referentialForm.form.valueChanges
            .pipe(debounceTime(100), filter(() => this.referentialForm.valid), 
        // DEBUG
        tap(value => console.debug('[strategy-page] referentialForm value changes:', value)))
            .subscribe(value => this.strategyForm.form.patchValue(Object.assign(Object.assign({}, value), { entityName: undefined }))));
    }
    setError(err) {
        // Special case when user cancelled save. See strategy form
        if (err === 'CANCELLED') {
            this.askConfirmationToReload();
            return;
        }
        super.setError(err);
    }
    load(id, opts) {
        const _super = Object.create(null, {
            load: { get: () => super.load }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Force the load from network
            return _super.load.call(this, id, Object.assign(Object.assign({}, opts), { fetchPolicy: 'network-only' }));
        });
    }
    canUserWrite(data, opts) {
        return super.canUserWrite(data, Object.assign(Object.assign({}, opts), { 
            // Important: sent the opts.program, to check if user is a program manager
            program: this.$program.value }));
    }
    enable(opts) {
        super.enable(opts);
        if (!this.isNewData) {
            this.form.get('label').disable();
        }
    }
    /* -- protected methods -- */
    registerForms() {
        this.addChildForms([
            this.referentialForm,
            this.strategyForm
        ]);
    }
    onNewEntity(data, options) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onNewEntity.call(this, data, options);
            data.programId = options.programId;
            const program = yield this.programRefService.load(data.programId);
            this.$program.next(program);
        });
    }
    onEntityLoaded(data, options) {
        const _super = Object.create(null, {
            onEntityLoaded: { get: () => super.onEntityLoaded }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onEntityLoaded.call(this, data, options);
            const program = yield this.programRefService.load(data.programId);
            this.$program.next(program);
        });
    }
    setValue(data) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                return; // Skip
            this.referentialForm.setValue(data);
            yield this.strategyForm.updateView(data);
            // Remember count - see getJsonValueToSave()
            this.initialPmfmCount = (_a = data.pmfms) === null || _a === void 0 ? void 0 : _a.length;
            this.markAsPristine();
        });
    }
    getJsonValueToSave() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.strategyForm.dirty) {
                const saved = yield this.strategyForm.save();
                if (!saved)
                    return; // Skip
            }
            const data = this.strategyForm.form.value;
            // Re add label, because missing when field disable
            data.label = this.referentialForm.form.get('label').value;
            console.debug('[strategy-page] JSON value to save:', data);
            // Workaround to avoid to many PMFM_STRATEGY deletion
            const deletedPmfmCount = (this.initialPmfmCount || 0) - (((_a = data.pmfms) === null || _a === void 0 ? void 0 : _a.length) || 0);
            if (deletedPmfmCount > 1) {
                const confirm = yield Alerts.askConfirmation('PROGRAM.STRATEGY.CONFIRM.MANY_PMFM_DELETED', this.alertCtrl, this.translate, null, { count: deletedPmfmCount });
                if (!confirm)
                    throw 'CANCELLED'; // Stop
            }
            return data;
        });
    }
    downloadAsJson(event, opts = { keepRemoteId: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event === null || event === void 0 ? void 0 : event.defaultPrevented)
                return false; // Skip
            event === null || event === void 0 ? void 0 : event.preventDefault(); // Avoid propagation
            // Avoid reloading while saving or still loading
            yield this.waitIdle();
            const saved = this.dirty && this.valid
                // If on field mode AND valid: save silently
                ? yield this.save(event)
                // Else If desktop mode: ask before save
                : yield this.saveIfDirtyAndConfirm();
            if (!saved)
                return; // not saved
            // Download as JSON
            yield this.service.downloadAsJson(this.data, Object.assign(Object.assign({ keepRemoteId: false }, opts), { program: this.$program.value }));
        });
    }
    askConfirmationToReload() {
        return __awaiter(this, void 0, void 0, function* () {
            const confirm = yield Alerts.askConfirmation('PROGRAM.STRATEGY.CONFIRM.RELOAD_PAGE', this.alertCtrl, this.translate, null);
            if (confirm) {
                return this.reload();
            }
        });
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // new data
            if (!data || isNil(data.id)) {
                return this.translate.get('PROGRAM.STRATEGY.NEW.TITLE').toPromise();
            }
            // Existing data
            const program = yield firstNotNilPromise(this.$program);
            return this.translate.instant('PROGRAM.STRATEGY.EDIT.TITLE', {
                program: program.label,
                label: data.label || ('#' + data.id)
            });
        });
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { matIcon: 'date_range', title: `${this.data.label} - ${this.data.name}`, subtitle: 'REFERENTIAL.ENTITY.PROGRAM' });
        });
    }
    getFirstInvalidTabIndex() {
        if (this.referentialForm.invalid)
            return 0;
        if (this.strategyForm.invalid)
            return 1;
        return -1;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    initTranscribingItemTable(table) {
    }
    startImport(event) {
    }
};
__decorate([
    ViewChild('referentialForm', { static: true }),
    __metadata("design:type", ReferentialForm)
], StrategyPage.prototype, "referentialForm", void 0);
__decorate([
    ViewChild('strategyForm', { static: true }),
    __metadata("design:type", StrategyForm)
], StrategyPage.prototype, "strategyForm", void 0);
StrategyPage = __decorate([
    Component({
        selector: 'app-strategy',
        templateUrl: 'strategy.page.html',
        styleUrls: ['./strategy.page.scss'],
        providers: [
            { provide: ValidatorService, useExisting: StrategyValidatorService }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        AccountService,
        StrategyValidatorService,
        StrategyService,
        ProgramRefService,
        ReferentialRefService,
        ModalController])
], StrategyPage);
export { StrategyPage };
//# sourceMappingURL=strategy.page.js.map