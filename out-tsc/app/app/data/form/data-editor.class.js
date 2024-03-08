import { __awaiter, __decorate, __metadata } from "tslib";
import { Directive, EventEmitter, Injector } from '@angular/core';
import { merge, Observable } from 'rxjs';
import { AppEditorOptions, AppEntityEditor, changeCaseToUnderscore, ConfigService, DateUtils, fromDateISOString, isEmptyArray, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettingsService, MessageService, PersonService, ReferentialUtils, toBoolean, } from '@sumaris-net/ngx-components';
import { catchError, distinctUntilChanged, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { noHtml } from '@app/shared/functions';
import { RxState } from '@rx-angular/state';
import { APP_SOCIAL_CONFIG_OPTIONS } from '@app/social/config/social.config';
import { DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { environment } from '@environments/environment';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';
export class DataEditorOptions extends AppEditorOptions {
}
let AppDataEntityEditor = class AppDataEntityEditor extends AppEntityEditor {
    constructor(injector, dataType, dataService, options) {
        super(injector, dataType, dataService, Object.assign({ autoOpenNextTab: !(injector.get(LocalSettingsService).mobile) }, options));
        this._reloadProgramSubject = new EventEmitter();
        this._reloadStrategySubject = new EventEmitter();
        this.logPrefix = null;
        this.canSendMessage = false;
        this.programRefService = injector.get(ProgramRefService);
        this.strategyRefService = injector.get(StrategyRefService);
        this.messageService = injector.get(MessageService);
        this.personService = injector.get(PersonService);
        this.configService = injector.get(ConfigService);
        this.mobile = this.settings.mobile;
        this.acquisitionLevel = options === null || options === void 0 ? void 0 : options.acquisitionLevel;
        this.settingsId = (options === null || options === void 0 ? void 0 : options.settingsId) || this.acquisitionLevel || `editor-${this.constructor.name}`;
        this.requiredStrategy = true;
        // FOR DEV ONLY ----
        this.logPrefix = '[base-data-editor] ';
        this.canDebug = !environment.production;
        this.debug = toBoolean(this.settings.getPageSettings(this.settingsId, 'debug'), this.canDebug);
    }
    ngOnInit() {
        super.ngOnInit();
        // Watch program, to configure tables from program properties
        this._state.connect('program', merge(this.programLabel$.pipe(distinctUntilChanged()), 
        // Allow to force reload (e.g. when program remotely changes - see startListenProgramRemoteChanges() )
        this._reloadProgramSubject.pipe(map(() => this.programLabel)))
            .pipe(filter(isNotNilOrBlank), 
        // DEBUG --
        //tap(programLabel => console.debug('DEV - Getting programLabel=' + programLabel)),
        switchMap((programLabel) => this.programRefService.watchByLabel(programLabel, { debug: this.debug })), catchError((err, _) => {
            this.setError(err);
            return Promise.resolve(null);
        })));
        const programLoaded$ = this.program$.pipe(filter(isNotNil), mergeMap((program) => this.setProgram(program)
            .then(() => program)
            .catch(err => {
            this.setError(err);
            return undefined;
        })), filter(isNotNil));
        this._state.connect('strategyFilter', programLoaded$.pipe(mergeMap(program => this.watchStrategyFilter(program))));
        // Load strategy from strategyLabel (after program loaded)
        this._state.connect('strategy', merge(this.strategyFilter$, this._reloadStrategySubject.pipe(map(_ => this.strategyFilter)))
            .pipe(filter(strategyFilter => this.canLoadStrategy(this.program, strategyFilter)), mergeMap((strategyFilter) => this.loadStrategy(strategyFilter)
            .catch(err => {
            this.setError(err);
            return undefined;
        }))));
        this._state.connect('requiredStrategy', this.strategyResolution$.pipe(filter(isNotNil), map(r => r !== DataStrategyResolutions.NONE)));
        this._state.hold(this.strategy$, strategy => this.setStrategy(strategy));
        // Listen config
        if (!this.mobile) {
            this._state.hold(this.configService.config, (config) => this.onConfigLoaded(config));
        }
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this._state.ngOnDestroy();
        this._reloadProgramSubject.complete();
        this._reloadProgramSubject.unsubscribe();
        this._reloadStrategySubject.complete();
        this._reloadStrategySubject.unsubscribe();
    }
    canUserWrite(data, opts) {
        return this.dataService.canUserWrite(data, Object.assign({ program: this.program }, opts));
    }
    enable(opts) {
        if (!this.data)
            return false;
        super.enable(opts);
        return true;
    }
    watchStrategyFilter(program) {
        if (!this.strategyResolution)
            throw new Error('Missing strategy resolution. Please check super.setProgram() has been called');
        switch (this.strategyResolution) {
            // Most recent
            case DataStrategyResolutions.LAST:
            default:
                return this.acquisitionLevel$.pipe(map(acquisitionLevel => {
                    return {
                        programId: program.id,
                        acquisitionLevel,
                    };
                }));
        }
    }
    canLoadStrategy(program, strategyFilter) {
        // None: avoid to load
        if (this.strategyResolution === DataStrategyResolutions.NONE)
            return false;
        // Check program
        if (!program)
            return false;
        // Check acquisition level
        if (isNilOrBlank(strategyFilter === null || strategyFilter === void 0 ? void 0 : strategyFilter.acquisitionLevel) && isEmptyArray(strategyFilter === null || strategyFilter === void 0 ? void 0 : strategyFilter.acquisitionLevels)) {
            return false;
        }
        // Spatio-temporal
        if (this.strategyResolution === DataStrategyResolutions.SPATIO_TEMPORAL) {
            return ReferentialUtils.isNotEmpty(strategyFilter === null || strategyFilter === void 0 ? void 0 : strategyFilter.location) && isNotNil(strategyFilter === null || strategyFilter === void 0 ? void 0 : strategyFilter.startDate);
        }
        // User select
        if (this.strategyResolution === DataStrategyResolutions.USER_SELECT) {
            return isNotEmptyArray(strategyFilter === null || strategyFilter === void 0 ? void 0 : strategyFilter.includedIds) || isNotNilOrBlank(strategyFilter === null || strategyFilter === void 0 ? void 0 : strategyFilter.label);
        }
        // Last
        return true;
    }
    loadStrategy(strategyFilter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug(this.logPrefix + 'Loading strategy, using filter:', strategyFilter);
            try {
                return yield this.strategyRefService.loadByFilter(strategyFilter, {
                    fullLoad: false,
                    failIfMissing: this.requiredStrategy,
                    debug: this.debug
                });
            }
            catch (err) {
                console.error((err === null || err === void 0 ? void 0 : err.message) || err, err);
                return undefined;
            }
        });
    }
    setProgram(program) {
        return __awaiter(this, void 0, void 0, function* () {
            // Can be overridden by subclasses
            if (!program)
                return; // Skip
            // DEBUG
            if (this.debug)
                console.debug(this.logPrefix + `Program ${program.label} loaded`);
            // Set strategy resolution
            const strategyResolution = program.getProperty(ProgramProperties.DATA_STRATEGY_RESOLUTION);
            console.info(this.logPrefix + 'Strategy resolution: ' + strategyResolution);
            this.strategyResolution = strategyResolution;
        });
    }
    setStrategy(strategy) {
        return __awaiter(this, void 0, void 0, function* () {
            // Can be overridden by subclasses
            // DEBUG
            if (strategy && this.debug)
                console.debug(this.logPrefix + `Strategy #${strategy.id} loaded`, strategy);
        });
    }
    setError(error, opts) {
        var _a, _b;
        if (error && typeof error !== 'string') {
            // Convert form errors
            if ((_a = error.details) === null || _a === void 0 ? void 0 : _a.errors) {
                // Create a details message, from errors in forms (e.g. returned by control())
                const formErrors = error.details.errors;
                if (formErrors) {
                    const i18FormError = this.errorTranslator.translateErrors(formErrors, {
                        separator: ', ',
                        controlPathTranslator: this,
                    });
                    if (isNotNilOrBlank(i18FormError)) {
                        error.details.message = i18FormError;
                    }
                }
            }
            // Keep details message, if main message is the default message
            if (error.message === 'COMMON.FORM.HAS_ERROR' && isNotNilOrBlank((_b = error.details) === null || _b === void 0 ? void 0 : _b.message)) {
                error.message = error.details.message;
                delete error.details;
            }
        }
        super.setError(error, opts);
    }
    /* -- protected methods -- */
    translateControlPath(controlPath) {
        const i18nKey = (this.i18nContext.prefix || '') + changeCaseToUnderscore(controlPath).toUpperCase();
        return this.translate.instant(i18nKey);
    }
    startListenProgramRemoteChanges(program) {
        var _a;
        if (!program || isNil(program.id))
            return; // Skip if program is missing
        console.debug(`[root-data-editor] Listening program #${program.id} changes...`);
        // Remove previous subscription, if exists
        (_a = this.remoteProgramSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        const previousUpdateDate = fromDateISOString(program.updateDate) || DateUtils.moment();
        const subscription = this.programRefService
            .listenChanges(program.id)
            .pipe(filter(isNotNil), 
        // Avoid reloading while editing the page
        filter(() => !this.dirty), 
        // Filter or newer program only
        filter((data) => previousUpdateDate.isBefore(data.updateDate)), 
        // Reload program & strategies
        mergeMap((_) => this.reloadProgram()))
            .subscribe();
        // DEBUG
        //.add(() =>  console.debug(`[root-data-editor] [WS] Stop listening to program changes on server.`))
        subscription.add(() => this.unregisterSubscription(subscription));
        this.registerSubscription(subscription);
        this.remoteProgramSubscription = subscription;
    }
    startListenStrategyRemoteChanges(program) {
        var _a;
        if (!program || isNil(program.id))
            return; // Skip
        // Remove previous listener (e.g. on a previous program id)
        (_a = this.remoteStrategySubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        const previousUpdateDate = fromDateISOString(program.updateDate) || DateUtils.moment();
        const subscription = this.strategyRefService
            .listenChangesByProgram(program.id)
            .pipe(filter(isNotNil), 
        // Avoid reloading while editing the page
        filter(() => !this.dirty), 
        // Filter or newer strategy only
        filter((updateDate) => previousUpdateDate.isBefore(updateDate)), 
        // Reload strategies
        mergeMap((_) => this.reloadStrategy()))
            .subscribe();
        // DEBUG
        //.add(() =>  console.debug(`[base-data-editor] [WS] Stop listening to strategies changes on server.`))
        subscription.add(() => this.unregisterSubscription(subscription));
        this.registerSubscription(subscription);
        this.remoteStrategySubscription = subscription;
    }
    /**
     * Force to reload the program
     *
     * @protected
     */
    reloadProgram(opts = { clearCache: true }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug(`[base-data-editor] Force program reload...`);
            // Cache clear
            if ((opts === null || opts === void 0 ? void 0 : opts.clearCache) !== false) {
                yield this.programRefService.clearCache();
            }
            this._reloadProgramSubject.next();
        });
    }
    /**
     * Force to reload the strategy
     *
     * @protected
     */
    reloadStrategy(opts = { clearCache: true }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug(`[base-data-editor] Force strategy reload...`);
            // Cache clear (by default)
            if (!opts || opts.clearCache !== false) {
                yield this.strategyRefService.clearCache();
            }
            this._reloadStrategySubject.next();
        });
    }
    /**
     * Override default function, to add the entity program as subtitle)
     *
     * @param page
     * @param opts
     */
    addToPageHistory(page, opts) {
        const _super = Object.create(null, {
            addToPageHistory: { get: () => super.addToPageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            page.subtitle = page.subtitle || this.programLabel;
            return _super.addToPageHistory.call(this, page, opts);
        });
    }
    onConfigLoaded(config) {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('[base-data-editor] Init using config', config);
            const canSendMessage = config.getPropertyAsBoolean(APP_SOCIAL_CONFIG_OPTIONS.ENABLE_NOTIFICATION_ICONS);
            if (this.canSendMessage !== canSendMessage) {
                this.canSendMessage = canSendMessage;
                this.markForCheck();
            }
        });
    }
    openComposeMessageModal(recipient, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.canSendMessage)
                return; // Skip if disabled
            console.debug(this.logPrefix + 'Writing a message to:', recipient);
            const title = (_a = noHtml((opts === null || opts === void 0 ? void 0 : opts.title) || this.titleSubject.value)) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            const url = this.router.url;
            const body = this.translate.instant('DATA.MESSAGE_BODY', { title, url });
            yield this.messageService.openComposeModal({
                suggestFn: (value, filter) => this.personService.suggest(value, filter),
                data: {
                    subject: title,
                    recipients: recipient ? [recipient] : [],
                    body,
                },
            });
        });
    }
    devToggleDebug() {
        this.debug = !this.debug;
        this.markForCheck();
        // Save it into local settings
        this.settings.savePageSetting(this.settingsId, this.debug, 'debug');
    }
};
__decorate([
    RxStateRegister(),
    __metadata("design:type", RxState)
], AppDataEntityEditor.prototype, "_state", void 0);
__decorate([
    RxStateSelect('acquisitionLevel'),
    __metadata("design:type", Observable)
], AppDataEntityEditor.prototype, "acquisitionLevel$", void 0);
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], AppDataEntityEditor.prototype, "programLabel$", void 0);
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], AppDataEntityEditor.prototype, "program$", void 0);
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], AppDataEntityEditor.prototype, "strategyResolution$", void 0);
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], AppDataEntityEditor.prototype, "requiredStrategy$", void 0);
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], AppDataEntityEditor.prototype, "strategyFilter$", void 0);
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], AppDataEntityEditor.prototype, "strategy$", void 0);
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], AppDataEntityEditor.prototype, "pmfms$", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", String)
], AppDataEntityEditor.prototype, "acquisitionLevel", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", String)
], AppDataEntityEditor.prototype, "programLabel", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Program)
], AppDataEntityEditor.prototype, "program", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", String)
], AppDataEntityEditor.prototype, "strategyResolution", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Boolean)
], AppDataEntityEditor.prototype, "requiredStrategy", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Object)
], AppDataEntityEditor.prototype, "strategyFilter", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Strategy)
], AppDataEntityEditor.prototype, "strategy", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Object)
], AppDataEntityEditor.prototype, "pmfms", void 0);
AppDataEntityEditor = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __metadata("design:paramtypes", [Injector, Function, Object, DataEditorOptions])
], AppDataEntityEditor);
export { AppDataEntityEditor };
//# sourceMappingURL=data-editor.class.js.map