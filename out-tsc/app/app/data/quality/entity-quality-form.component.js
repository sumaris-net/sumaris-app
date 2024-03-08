import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Inject, Input, Optional, Output, } from '@angular/core';
import { DataEntity, DataEntityUtils, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE } from '../services/model/data-entity.model';
// import fade in animation
import { AccountService, APP_USER_EVENT_SERVICE, ConfigService, EntityUtils, fadeInAnimation, isNil, isNotNil, LocalSettingsService, NetworkService, Toasts, toNumber, } from '@sumaris-net/ngx-components';
import { isDataQualityService, isRootDataQualityService, } from '../services/data-quality-service.class';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { merge, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '@environments/environment';
import { isDataSynchroService } from '../services/root-data-synchro-service.class';
import { debounceTime } from 'rxjs/operators';
import { UserEventService } from '@app/social/user-event/user-event.service';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AppDataEntityEditor } from '@app/data/form/data-editor.class';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
let EntityQualityFormComponent = class EntityQualityFormComponent {
    constructor(router, accountService, programRefService, referentialRefService, settings, toastController, translate, network, configService, cd, userEventService, editor) {
        this.router = router;
        this.accountService = accountService;
        this.programRefService = programRefService;
        this.referentialRefService = referentialRefService;
        this.settings = settings;
        this.toastController = toastController;
        this.translate = translate;
        this.network = network;
        this.configService = configService;
        this.cd = cd;
        this.userEventService = userEventService;
        this._subscription = new Subscription();
        this._progression = new ProgressionModel({ total: 100 });
        this.loading = true;
        this.busy = false;
        this.cancel = new EventEmitter();
        this.editor = editor;
        this._mobile = settings.mobile;
        // DEBUG
        this._debug = !environment.production;
    }
    get serviceForRootEntity() {
        // tslint:disable-next-line:no-unused-expression
        return this.service;
    }
    get synchroService() {
        // tslint:disable-next-line:no-unused-expression
        return this.service;
    }
    ngOnInit() {
        // Check editor exists
        if (!this.editor)
            throw new Error("Missing mandatory 'editor' input!");
        // Check data service exists
        this.service = this.service || (isDataQualityService(this.editor.service) ? this.editor.service : null);
        if (!this.service)
            throw new Error("Missing mandatory 'service' input!");
        this._isRootDataQualityService = isRootDataQualityService(this.service);
        this._isSynchroService = isDataSynchroService(this.service);
        // Subscribe to update events
        let updateViewEvents = merge(this.editor.onUpdateView, this.editor.dirtySubject, this.accountService.onLogin, this.network.onNetworkStatusChanges);
        // Add a debounce time
        if (this._mobile)
            updateViewEvents = updateViewEvents.pipe(debounceTime(500));
        this._subscription.add(updateViewEvents.subscribe(() => this.updateView(this.editor.data)));
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
        this.data = null;
        this.qualityFlags = null;
        this.editor = null;
        this.service = null;
    }
    control(event, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            opts = opts || {};
            const progressionSubscription = this.fillProgressionOptions(opts, 'QUALITY.INFO.CONTROL_DOTS');
            this.busy = true;
            let valid = false;
            try {
                // Make sure to get valid and saved data
                const data = yield this.editor.saveAndGetDataIfValid();
                // no data or invalid: skip
                if (!data)
                    return false;
                // Disable the editor (should be done AFTER save)
                this.editor.disable();
                if (this._debug)
                    console.debug(`[entity-quality] Control ${data.constructor.name}...`);
                let errors = yield this.service.control(data, opts);
                valid = isNil(errors);
                if (!valid) {
                    yield this.editor.updateView(data);
                    // Construct error with details
                    if (isNil(errors.details)) {
                        errors = {
                            message: errors.message || data.qualificationComments || 'COMMON.ERROR.HAS_ERROR',
                            details: { errors: errors },
                        };
                    }
                    else {
                        errors.message = errors.message || data.qualificationComments || 'COMMON.ERROR.HAS_ERROR';
                    }
                    this.editor.setError(errors);
                    this.editor.markAllAsTouched();
                    if (!opts || opts.emitEvent !== false) {
                        this.markForCheck();
                    }
                }
                else {
                    // Clean previous error
                    this.editor.resetError(opts);
                    // Emit event (refresh component with the new data)
                    if (!opts || opts.emitEvent !== false) {
                        this.updateView(data);
                    }
                    else {
                        this.data = data;
                    }
                }
            }
            finally {
                this.editor.enable(opts);
                this.busy = false;
                this.markForCheck();
                progressionSubscription === null || progressionSubscription === void 0 ? void 0 : progressionSubscription.unsubscribe();
            }
            return valid;
        });
    }
    terminate(event, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.busy)
                return;
            opts = opts || {};
            const progressionSubscription = this.fillProgressionOptions(opts, 'QUALITY.INFO.TERMINATE_DOTS');
            const endProgression = opts.progression.current + opts.maxProgression;
            // Control data
            const controlled = yield this.control(event, Object.assign(Object.assign({}, opts), { emitEvent: false, maxProgression: (opts === null || opts === void 0 ? void 0 : opts.maxProgression) * 0.9 }));
            // Control failed
            if (!controlled || (event === null || event === void 0 ? void 0 : event.defaultPrevented) || ((_a = opts.progression) === null || _a === void 0 ? void 0 : _a.cancelled)) {
                progressionSubscription === null || progressionSubscription === void 0 ? void 0 : progressionSubscription.unsubscribe();
                // If mode was on field: force desk mode, to show errors
                if (this.editor.isOnFieldMode) {
                    this.editor.usageMode = 'DESK';
                    this.editor.markAllAsTouched();
                }
                return false;
            }
            this.busy = true;
            // Disable the editor
            this.editor.disable();
            try {
                console.debug('[entity-quality] Terminate entity input...');
                const data = yield this.serviceForRootEntity.terminate(this.editor.data);
                if (opts === null || opts === void 0 ? void 0 : opts.progression)
                    opts.progression.current = endProgression;
                // Emit event (refresh editor -> will refresh component also)
                if (!opts || opts.emitEvent !== false) {
                    this.busy = false;
                    yield this.updateEditor(data);
                }
                else {
                    this.data = data;
                }
                return true;
            }
            finally {
                this.editor.enable(opts);
                this.busy = false;
                this.markForCheck();
                progressionSubscription === null || progressionSubscription === void 0 ? void 0 : progressionSubscription.unsubscribe();
            }
        });
    }
    synchronize(event, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.busy)
                return;
            if (!EntityUtils.isLocal(this.data))
                throw new Error('Need a local trip');
            if (this.network.offline) {
                this.network.showOfflineToast({
                    showRetryButton: true,
                    onRetrySuccess: () => this.synchronize(),
                });
                return;
            }
            const path = this.router.url;
            opts = opts || {};
            const progressionSubscription = this.fillProgressionOptions(opts, 'QUALITY.INFO.SYNCHRONIZE_DOTS');
            const progressionStep = opts.maxProgression / 3; // 3 steps : control, synchronize, and terminate
            // Control data
            const controlled = yield this.control(event, Object.assign(Object.assign({}, opts), { emitEvent: false, maxProgression: progressionStep }));
            if (!controlled || (event === null || event === void 0 ? void 0 : event.defaultPrevented) || ((_a = opts.progression) === null || _a === void 0 ? void 0 : _a.cancelled)) {
                progressionSubscription === null || progressionSubscription === void 0 ? void 0 : progressionSubscription.unsubscribe();
                return false;
            }
            this.busy = true;
            // Disable the editor
            this.editor.disable();
            try {
                console.debug('[entity-quality] Synchronizing entity...');
                const remoteData = yield this.synchroService.synchronize(this.editor.data);
                opts.progression.increment(progressionStep); // Increment progression
                // Success message
                this.showToast({ message: 'INFO.SYNCHRONIZATION_SUCCEED', type: 'info', showCloseButton: true });
                // Remove the page from the history (because of local id)
                yield this.settings.removePageHistory(path);
                // Do a ONLINE terminate
                console.debug('[entity-quality] Terminate entity...');
                const data = yield this.serviceForRootEntity.terminate(remoteData);
                opts.progression.increment(progressionStep); // Increment progression
                // Update the editor (Will refresh the component)
                this.busy = false;
                yield this.updateEditor(data, { updateRoute: true });
            }
            catch (error) {
                this.editor.setError(error);
                const context = (error && error.context) || (() => this.data.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE));
                this.userEventService.showToastErrorWithContext({
                    error,
                    context,
                });
            }
            finally {
                this.editor.enable();
                this.busy = false;
                this.markForCheck();
                progressionSubscription === null || progressionSubscription === void 0 ? void 0 : progressionSubscription.unsubscribe();
            }
        });
    }
    validate(event, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.busy)
                return;
            opts = opts || {};
            const progressionSubscription = this.fillProgressionOptions(opts, 'QUALITY.INFO.VALIDATE_DOTS');
            // Control data
            const controlled = yield this.control(event, Object.assign(Object.assign({}, opts), { emitEvent: false }));
            if (!controlled || (event === null || event === void 0 ? void 0 : event.defaultPrevented) || ((_a = opts.progression) === null || _a === void 0 ? void 0 : _a.cancelled)) {
                progressionSubscription === null || progressionSubscription === void 0 ? void 0 : progressionSubscription.unsubscribe();
                // If mode was on field: force desk mode, to show errors
                if (this.editor.isOnFieldMode) {
                    this.editor.usageMode = 'DESK';
                    this.editor.markAllAsTouched();
                }
                return;
            }
            try {
                this.busy = true;
                if (!DataEntityUtils.isControlled(this.data)) {
                    console.debug('[entity-quality] Terminate entity input...');
                    this.data = yield this.serviceForRootEntity.terminate(this.data);
                }
                console.debug('[entity-quality] Mark entity as validated...');
                const data = yield this.serviceForRootEntity.validate(this.data);
                // Update the editor (Will refresh the component)
                this.busy = false;
                yield this.updateEditor(data);
            }
            catch (error) {
                this.editor.setError(error);
                const context = (error && error.context) || (() => this.data.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE));
                this.userEventService.showToastErrorWithContext({
                    error,
                    context,
                });
                this.editor.enable();
                this.busy = false;
                this.markForCheck();
            }
            finally {
                progressionSubscription === null || progressionSubscription === void 0 ? void 0 : progressionSubscription.unsubscribe();
            }
        });
    }
    unvalidate(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.serviceForRootEntity.unvalidate(this.data);
            yield this.updateEditor(data);
        });
    }
    qualify(event, qualityFlagId) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.service.qualify(this.data, qualityFlagId);
            yield this.updateEditor(data);
        });
    }
    /* -- protected method -- */
    updateView(data) {
        var _a;
        if (this.busy)
            return; // Skip
        data = data || this.data || ((_a = this.editor) === null || _a === void 0 ? void 0 : _a.data);
        this.data = data;
        this.loading = isNil(data) || isNil(data.id);
        if (this.loading) {
            this.canSynchronize = false;
            this.canControl = false;
            this.canTerminate = false;
            this.canValidate = false;
            this.canUnvalidate = false;
            this.canQualify = false;
            this.canUnqualify = false;
        }
        else if (data instanceof DataEntity) {
            console.debug('[entity-quality] Updating view...');
            // If local, avoid to check too many properties (for performance in mobile devices)
            const isLocalData = EntityUtils.isLocal(data);
            const canWrite = isLocalData || this.editor.canUserWrite(data);
            // Terminate and control
            this.canControl = canWrite && ((isLocalData && data.synchronizationStatus === 'DIRTY') || isNil(data.controlDate) || this.editor.dirty);
            this.canTerminate = this.canControl && this._isRootDataQualityService && (!isLocalData || data.synchronizationStatus === 'DIRTY');
            // Validation and qualification
            if (this.programRefService.enableQualityProcess && !isLocalData) {
                const isAdmin = this.accountService.isAdmin();
                const program = this.editor.program;
                const isValidator = isAdmin || this.programRefService.canUserValidate(program);
                const isQualifier = isAdmin || this.programRefService.canUserQualify(program);
                this.canValidate = canWrite && isValidator && this._isRootDataQualityService && isNotNil(data.controlDate) && isNil(data.validationDate);
                this.canUnvalidate =
                    !canWrite && isValidator && this._isRootDataQualityService && isNotNil(data.controlDate) && isNotNil(data.validationDate);
                this.canQualify = !canWrite && isQualifier && isNotNil(data.validationDate) && isNil(data.qualificationDate);
                this.canUnqualify = !canWrite && isQualifier && isNotNil(data.validationDate) && isNotNil(data.qualificationDate);
            }
            else {
                this.canValidate = false;
                this.canUnvalidate = false;
                this.canQualify = false;
                this.canUnqualify = false;
            }
            // Synchro service
            this.canSynchronize = this._isSynchroService && canWrite && isLocalData && data.synchronizationStatus === 'READY_TO_SYNC';
        }
        // Load available quality flags
        if ((this.canQualify || this.canUnqualify) && !this.qualityFlags) {
            this.referentialRefService.loadQualityFlags().then((items) => {
                this.qualityFlags = items;
                this.markForCheck();
            });
        }
        else {
            this.markForCheck();
        }
    }
    showToast(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.toastController)
                throw new Error("Missing toastController in component's constructor");
            return yield Toasts.show(this.toastController, this.translate, opts);
        });
    }
    updateEditor(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.editor.updateView(data, opts);
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    fillProgressionOptions(opts, defaultProgressionMessage) {
        if (!opts)
            throw new Error("Argument 'opts' is required");
        // Init max progression
        opts.maxProgression = toNumber(opts.maxProgression, 100);
        // Init progression model
        if (!opts.progression) {
            this._progression.reset();
            this._progression.message = defaultProgressionMessage;
            opts.progression = this._progression;
            // Reset progression, when finish
            return new Subscription(() => {
                this._progression.reset();
            });
        }
        return undefined;
    }
};
__decorate([
    Input(),
    __metadata("design:type", AppDataEntityEditor)
], EntityQualityFormComponent.prototype, "editor", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], EntityQualityFormComponent.prototype, "service", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], EntityQualityFormComponent.prototype, "cancel", void 0);
EntityQualityFormComponent = __decorate([
    Component({
        selector: 'app-entity-quality-form',
        templateUrl: './entity-quality-form.component.html',
        styleUrls: ['./entity-quality-form.component.scss'],
        animations: [fadeInAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __param(10, Inject(APP_USER_EVENT_SERVICE)),
    __param(11, Optional()),
    __param(11, Inject(APP_DATA_ENTITY_EDITOR)),
    __metadata("design:paramtypes", [Router,
        AccountService,
        ProgramRefService,
        ReferentialRefService,
        LocalSettingsService,
        ToastController,
        TranslateService,
        NetworkService,
        ConfigService,
        ChangeDetectorRef,
        UserEventService,
        AppDataEntityEditor])
], EntityQualityFormComponent);
export { EntityQualityFormComponent };
//# sourceMappingURL=entity-quality-form.component.js.map