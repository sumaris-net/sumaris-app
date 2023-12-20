import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Injector, Input, Optional, ViewChild } from '@angular/core';
import { APP_LOGGING_SERVICE, AppEditor, AppFormUtils, changeCaseToUnderscore, equals, fadeInOutAnimation, filterFalse, filterTrue, firstNotNilPromise, getPropertyByPath, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettingsService, toBoolean, toNumber, TreeItemEntityUtils, waitFor, waitForTrue, } from '@sumaris-net/ngx-components';
import { AlertController, IonModal, NavController } from '@ionic/angular';
import { BatchTreeComponent } from '@app/trip/batch/tree/batch-tree.component';
import { Batch } from '@app/trip/batch/common/batch.model';
import { Program } from '@app/referential/services/model/program.model';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { combineLatestWith, Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { BatchModel } from '@app/trip/batch/tree/batch-tree.model';
import { BatchModelValidatorService } from '@app/trip/batch/tree/batch-model.validator';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { PhysicalGearService } from '@app/trip/physicalgear/physicalgear.service';
import { TripContextService } from '@app/trip/trip-context.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { RxState } from '@rx-angular/state';
import { BatchModelTreeComponent } from '@app/trip/batch/tree/batch-model-tree.component';
import { MatSidenav } from '@angular/material/sidenav';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { ContextService } from '@app/shared/context.service';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
export const BatchTreeContainerSettingsEnum = {
    PAGE_ID: 'batch-tree-container',
    TREE_PANEL_FLOATING_KEY: 'treePanelFloating'
};
let BatchTreeContainerComponent = class BatchTreeContainerComponent extends AppEditor {
    constructor(injector, route, router, alertCtrl, translate, programRefService, batchModelValidatorService, pmfmNamePipe, physicalGearService, context, _state, cd, settings, loggingService) {
        super(route, router, injector.get(NavController), alertCtrl, translate);
        this.programRefService = programRefService;
        this.batchModelValidatorService = batchModelValidatorService;
        this.pmfmNamePipe = pmfmNamePipe;
        this.physicalGearService = physicalGearService;
        this.context = context;
        this._state = _state;
        this.cd = cd;
        this.settings = settings;
        this._listenProgramChanges = true;
        this._logPrefix = '[batch-tree-container] ';
        this.allowSamplingBatches$ = this._state.select('allowSpeciesSampling');
        this.allowSubBatches$ = this._state.select('allowSubBatches');
        this.programLabel$ = this._state.select('programLabel');
        this.program$ = this._state.select('program');
        this.requiredGear$ = this._state.select('requiredGear');
        this.gearId$ = this._state.select('gearId');
        this.form$ = this._state.select('form');
        this.editingBatch$ = this._state.select('editingBatch');
        this.currentBadge$ = this._state.select('currentBadge');
        this.treePanelFloating$ = this._state.select('treePanelFloating');
        this.model$ = this._state.select('model');
        this.batchTreeStatus$ = this._state.select('batchTreeStatus');
        this.samplingRatioFormat = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;
        this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
        this.useSticky = true;
        this.style = 'menu';
        this.showToolbar = true;
        this.useModal = false;
        this.rxStrategy = 'userBlocking';
        // Defaults
        this.mobile = injector.get(LocalSettingsService).mobile;
        this.i18nContext = {
            prefix: '',
            suffix: ''
        };
        this.errorTranslatorOptions = { separator: '<br/>', controlPathTranslator: this };
        this._state.set({
            treePanelFloating: this.settings.getPageSettings(BatchTreeContainerSettingsEnum.PAGE_ID, BatchTreeContainerSettingsEnum.TREE_PANEL_FLOATING_KEY) || this.mobile, // On desktop, panel is pinned by default
        });
        // Watch program, to configure tables from program properties
        this._state.connect('program', this.programLabel$
            .pipe(filter(() => this._listenProgramChanges), // Avoid to watch program, if was already set
        filter(isNotNilOrBlank), distinctUntilChanged(), switchMap(programLabel => this.programRefService.watchByLabel(programLabel))));
        this._state.hold(filterTrue(this.readySubject)
            .pipe(switchMap(() => this._state.select(['program', 'gearId'], s => s)), debounceTime(100), distinctUntilChanged(equals)), ({ program, gearId }) => __awaiter(this, void 0, void 0, function* () {
            yield this.setProgram(program);
            yield this.loadPmfms(program, gearId);
        }));
        this._state.connect('model', this._state.select(['data', 'physicalGear', 'allowDiscard', 'catchPmfms', 'sortingPmfms'], s => s, {
            data: (d1, d2) => d1 === d2,
            physicalGear: PhysicalGear.equals,
            allowDiscard: (a1, a2) => a1 === a2,
            catchPmfms: equals,
            sortingPmfms: equals
        })
            .pipe(filter(({ data, physicalGear, allowDiscard, sortingPmfms, catchPmfms }) => sortingPmfms && catchPmfms && physicalGear && true), mergeMap(({ data, physicalGear, allowDiscard, sortingPmfms, catchPmfms }) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Load physical gear's children (if not already done)
            if (physicalGear && isEmptyArray(physicalGear.children)) {
                const tripId = (_a = this.context.trip) === null || _a === void 0 ? void 0 : _a.id;
                physicalGear.children = yield this.physicalGearService.loadAllByParentId({ tripId, parentGearId: physicalGear.id });
            }
            // Create the model
            return this.batchModelValidatorService.createModel(data, { allowDiscard, sortingPmfms, catchPmfms, physicalGear });
        }))));
        this._state.connect('form', this._state.select(['model', 'allowSpeciesSampling'], s => s)
            .pipe(filter(({ model, allowSpeciesSampling }) => !!model), map(({ model, allowSpeciesSampling }) => {
            const form = this.batchModelValidatorService.createFormGroupByModel(model, {
                allowSpeciesSampling,
                isOnFieldMode: this.isOnFieldMode
            });
            form.disable();
            return form;
        })));
        // Reload data, when form (or model) changed
        this._state.hold(this.form$
            .pipe(filter(form => !this.loading && !!form)), (_) => this.updateView(this.data, { markAsPristine: false /*keep dirty state*/ }));
        this._state.hold(filterTrue(this.readySubject)
            .pipe(switchMap(() => this.batchTree.dirtySubject), filter(dirty => dirty === true && this.enabled && this.loaded)), () => this.markAsDirty());
        // If now allowed sampling batches: remove it from data
        this._state.hold(filterFalse(this.allowSamplingBatches$), () => this.resetSamplingBatches());
        this._state.connect('batchTreeStatus', this.watchBatchTreeStatus());
        this._state.connect('currentBadge', this.batchTreeStatus$, (state, status) => {
            if (!status.valid) {
                return {
                    text: '!',
                    hidden: false,
                    color: 'accent'
                };
            }
            else if (status.rowCount) {
                return {
                    text: status.rowCount.toString(),
                    hidden: false,
                    color: 'primary'
                };
            }
            return {
                text: '',
                hidden: true,
                color: 'primary'
            };
        });
        // Workaround need by the sidenav, when included inside a MatTabGroup
        const parentTabGroup = injector.get(MatTabGroup);
        if (parentTabGroup) {
            const parentTab = injector.get(MatTab);
            this._state.hold(parentTabGroup.animationDone, (event) => {
                // Visible
                if (parentTab.isActive) {
                    if (!this.treePanelFloating || !this.editingBatch) {
                        this.openTreePanel();
                    }
                }
                else {
                    this.closeTreePanel();
                }
            });
        }
        // DEBUG
        this._logger = loggingService.getLogger('batch-tree-container');
        this.debug = !environment.production;
    }
    get model() {
        return this._state.get('model');
    }
    set editingBatch(value) {
        this._state.set('editingBatch', _ => value);
    }
    get editingBatch() {
        return this._state.get('editingBatch');
    }
    get catchPmfms() {
        return this._state.get('catchPmfms');
    }
    get sortingPmfms() {
        return this._state.get('sortingPmfms');
    }
    set data(value) {
        this._state.set('data', (_) => value);
    }
    get data() {
        return this._state.get('data');
    }
    set allowSpeciesSampling(value) {
        this._state.set('allowSpeciesSampling', (_) => value);
    }
    get allowSpeciesSampling() {
        return this._state.get('allowSpeciesSampling');
    }
    set allowSubBatches(value) {
        this._state.set('allowSubBatches', (_) => value);
    }
    get allowSubBatches() {
        return this._state.get('allowSubBatches');
    }
    set programLabel(value) {
        this._state.set('programLabel', (_) => value);
    }
    get programLabel() {
        var _a;
        return this._state.get('programLabel') || ((_a = this.program) === null || _a === void 0 ? void 0 : _a.label);
    }
    set program(value) {
        // Disable watchByLabel, when changing programLabel
        // Avoid to watch program changes, when program is given by parent component
        this._listenProgramChanges = false;
        this._state.set('program', (_) => value);
    }
    get program() {
        return this._state.get('program');
    }
    set requiredGear(value) {
        this._state.set('requiredGear', (_) => value);
    }
    get requiredGear() {
        return this._state.get('requiredGear');
    }
    set gearId(value) {
        this._state.set('gearId', (_) => value);
    }
    get gearId() {
        return this._state.get('gearId');
    }
    set physicalGear(value) {
        var _a;
        if (this.physicalGear && (value === null || value === void 0 ? void 0 : value.id) !== this.physicalGear.id) {
            // Reset pmfms, to force a reload
            this.resetRootForm();
        }
        // Apply change
        this._state.set({
            physicalGear: value,
            gearId: toNumber((_a = value === null || value === void 0 ? void 0 : value.gear) === null || _a === void 0 ? void 0 : _a.id, null)
        });
    }
    get physicalGear() {
        return this._state.get('physicalGear');
    }
    set showCatchForm(value) {
        this._state.set('showCatchForm', (_) => value);
    }
    get showCatchForm() {
        return this._state.get('showCatchForm') || false;
    }
    set showBatchTables(value) {
        this._state.set('showBatchTables', (_) => value);
    }
    get showBatchTables() {
        return this._state.get('showBatchTables') || false;
    }
    set allowDiscard(value) {
        this._state.set('allowDiscard', _ => value);
    }
    get allowDiscard() {
        return this._state.get('allowDiscard');
    }
    get programAllowMeasure() {
        return this._state.get('programAllowMeasure');
    }
    set programAllowMeasure(value) {
        this._state.set('programAllowMeasure', _ => value);
    }
    get touched() {
        var _a;
        return ((_a = this.form) === null || _a === void 0 ? void 0 : _a.touched) || super.touched;
    }
    get invalid() {
        return !this.valid;
    }
    get valid() {
        return !this.model || this.model.valid;
    }
    get loading() {
        // Should NOT use batchTree loading state, because it is load later (when gearId is known)
        return this.model && this.loadingSubject.value;
    }
    get isNewData() {
        var _a;
        return isNil((_a = this.data) === null || _a === void 0 ? void 0 : _a.id);
    }
    set value(value) {
        this.setValue(value);
    }
    get value() {
        return this.data;
    }
    get form() {
        return this._state.get('form');
    }
    get highlightForwardButton() {
        var _a, _b;
        return ((_a = this.editingBatch) === null || _a === void 0 ? void 0 : _a.valid) && (!((_b = this.batchTree) === null || _b === void 0 ? void 0 : _b.showBatchTables)
            || this.visibleRowCount > 0);
    }
    get visibleRowCount() {
        var _a;
        return ((_a = this.batchTree) === null || _a === void 0 ? void 0 : _a.showBatchTables)
            ? this.batchTree.batchGroupsTable.visibleRowCount
            : 0;
    }
    get isOnFieldMode() {
        return this.usageMode === 'FIELD';
    }
    set treePanelFloating(value) {
        this._state.set('treePanelFloating', _ => value);
    }
    get treePanelFloating() {
        return this._state.get('treePanelFloating');
    }
    ngOnInit() {
        super.ngOnInit();
        this.showCatchForm = toBoolean(this._state.get('showCatchForm'), true);
        this.showBatchTables = toBoolean(this._state.get('showBatchTables'), true);
        this.programAllowMeasure = toBoolean(this._state.get('programAllowMeasure'), this.showBatchTables);
        this.allowSubBatches = toBoolean(this._state.get('allowSubBatches'), this.programAllowMeasure);
        this.allowSpeciesSampling = toBoolean(this._state.get('allowSpeciesSampling'), this.programAllowMeasure);
        this.allowDiscard = toBoolean(this.allowDiscard, true);
        this.treePanelFloating = toBoolean(this.treePanelFloating, true);
    }
    // Change visibility to public
    setError(error, opts) {
        if (!error || typeof error === 'string') {
            super.setError(error, opts);
        }
        else {
            console.log('TODO: apply error to rows ?', error);
        }
    }
    // Change visibility to public
    resetError(opts) {
        super.resetError(opts);
    }
    translateControlPath(path) {
        var _a, _b, _c, _d, _e;
        if (path.startsWith('measurementValues.')) {
            const parts = path.split('.');
            const pmfmId = parseInt(parts[parts.length - 1]);
            const pmfm = (this.catchPmfms || []).find(p => p.id === pmfmId)
                || (this.sortingPmfms || []).find(p => p.id === pmfmId);
            if (pmfm)
                return this.pmfmNamePipe.transform(pmfm, { i18nPrefix: this.i18nPmfmPrefix, i18nContext: (_a = this.i18nContext) === null || _a === void 0 ? void 0 : _a.suffix });
        }
        else if (path.includes('.measurementValues.')) {
            const parts = path.split('.');
            const pmfmId = parseInt(parts[parts.length - 1]);
            const pmfm = (this.sortingPmfms || []).find(p => p.id === pmfmId);
            if (pmfm) {
                const nodePath = parts.slice(0, parts.length - 2).join('.');
                const node = this.getBatchModelByPath(nodePath);
                return `${(node === null || node === void 0 ? void 0 : node.fullName) || path} > ${this.pmfmNamePipe.transform(pmfm, { i18nPrefix: this.i18nPmfmPrefix, i18nContext: (_b = this.i18nContext) === null || _b === void 0 ? void 0 : _b.suffix })}`;
            }
        }
        if (path.startsWith('children.')) {
            const parts = path.split('.');
            const fieldName = parts[parts.length - 1];
            const nodePath = parts.slice(0, parts.length - 1).join('.');
            let nodeName = (_c = this.getBatchModelByPath(nodePath)) === null || _c === void 0 ? void 0 : _c.fullName;
            if (!nodeName) {
                const nodeForm = (_d = this.form) === null || _d === void 0 ? void 0 : _d.get(nodePath);
                nodeName = (_e = nodeForm === null || nodeForm === void 0 ? void 0 : nodeForm.value) === null || _e === void 0 ? void 0 : _e.label;
            }
            const i18nKey = (this.batchTree.i18nContext.prefix || 'TRIP.BATCH.EDIT.') + changeCaseToUnderscore(fieldName).toUpperCase();
            return `${nodeName || path} > ${this.translate.instant(i18nKey)}`;
        }
        return path;
    }
    markAllAsTouched(opts) {
        var _a;
        (_a = this.form) === null || _a === void 0 ? void 0 : _a.markAllAsTouched();
        // Mark children component as touched also
        if (!opts || opts.withChildren !== false) {
            super.markAllAsTouched(opts);
        }
        // Mark as touched the component itself, but NOT the child batch tree
        else {
            if (this.touchedSubject.value !== true) {
                this.touchedSubject.next(true);
            }
            if (!this.loading && (!opts || opts.emitEvent !== false))
                this.markForCheck();
        }
    }
    markAsPristine(opts) {
        var _a;
        (_a = this.form) === null || _a === void 0 ? void 0 : _a.markAsPristine(opts);
        super.markAsPristine(opts);
    }
    autoFill(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ready();
            console.warn(this._logPrefix + 'autoFill() not implemented yet!');
        });
    }
    toggleFloatingPanel(event) {
        var _a;
        if ((_a = this.sidenav) === null || _a === void 0 ? void 0 : _a.opened)
            this.sidenav.close();
    }
    toggleTreePanelFloating() {
        var _a;
        const previousFloating = this.treePanelFloating;
        this.treePanelFloating = !previousFloating;
        this.settings.savePageSetting(BatchTreeContainerSettingsEnum.PAGE_ID, this.treePanelFloating, BatchTreeContainerSettingsEnum.TREE_PANEL_FLOATING_KEY);
        if (!previousFloating)
            (_a = this.sidenav) === null || _a === void 0 ? void 0 : _a.close();
    }
    openTreePanel(event, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if ((event === null || event === void 0 ? void 0 : event.defaultPrevented) || this.useModal)
                return; // Cancelled
            // First, expand model tree
            if (!opts || opts.expandAll !== false) {
                if (!this.batchModelTree)
                    this.cd.detectChanges();
                (_a = this.batchModelTree) === null || _a === void 0 ? void 0 : _a.expandAll();
            }
            // Wait side nav to be created
            if (!this.sidenav)
                yield waitFor(() => !!this.sidenav, { stop: this.destroySubject });
            // open it, if need
            if (!this.sidenav.opened)
                yield this.sidenav.open();
            this.markForCheck();
        });
    }
    closeTreePanel() {
        var _a;
        (_a = this.sidenav) === null || _a === void 0 ? void 0 : _a.close();
        this.markForCheck();
    }
    toggleTreePanel() {
        var _a;
        (_a = this.sidenav) === null || _a === void 0 ? void 0 : _a.toggle();
        this.markForCheck();
    }
    addRow(event) {
        var _a;
        if ((_a = this.editingBatch) === null || _a === void 0 ? void 0 : _a.isLeaf) {
            this.batchTree.addRow(event);
        }
    }
    unload(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            this.resetRootForm();
            this.data = null;
            this.markAsPristine();
            this.markAsLoading();
        });
    }
    getFirstInvalidTabIndex() {
        return 0;
    }
    setValue(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            data = data || Batch.fromObject({
                rankOrder: 1,
                label: AcquisitionLevelCodes.CATCH_BATCH
            });
            const dataChanged = (this.data !== data);
            if (dataChanged) {
                this.data = data;
                // By default, select the root batch in tree
                if (!this._lastEditingBatchPath && !this.useModal) {
                    this._lastEditingBatchPath = '';
                }
            }
            // Mark as loading
            if (!opts || opts.emitEvent !== false)
                this.markAsLoading();
            try {
                // Wait component is ready
                yield this.ready();
                // Update the view
                if (data === this.data) {
                    yield this.updateView(data, { dataChanged });
                    if (!opts || opts.emitEvent !== false) {
                        this.markAsLoaded();
                    }
                }
            }
            catch (err) {
                console.error(err && err.message || err);
                throw err;
            }
        });
    }
    getValue() {
        return this.data;
    }
    save(event, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = Date.now();
                console.debug(this._logPrefix + `Saving tree...`);
                if (this.dirty && this.loaded) {
                    // Save editing batch
                    const confirmed = yield this.confirmEditingBatch(Object.assign({ keepEditingBatch: true }, opts));
                    if (!confirmed)
                        return false; // Not confirmed = cannot save
                    // Get value (using getRawValue(), because some controls are disabled)
                    const json = this.form.getRawValue();
                    // Update data
                    this.data = this.data || new Batch();
                    this.data.fromObject(json, { withChildren: true });
                    console.debug(this._logPrefix + `Saving tree [OK] in ${Date.now() - now}ms`, this.data);
                }
                return true;
            }
            catch (err) {
                (_a = this._logger) === null || _a === void 0 ? void 0 : _a.error('save', `Error while saving batch tree: ${(err === null || err === void 0 ? void 0 : err.message) || err}`);
                throw err;
            }
            finally {
                this.markAllAsTouched();
                if (!this.submitted) {
                    this.submitted = true;
                    this.markForCheck();
                }
            }
        });
    }
    setModalOption(key, value) {
        this.modalOptions = this.modalOptions || {};
        this.modalOptions[key] = value;
    }
    setSelectedTabIndex(value) {
        var _a;
        (_a = this.batchTree) === null || _a === void 0 ? void 0 : _a.setSelectedTabIndex(value);
    }
    realignInkBar() {
        var _a;
        (_a = this.batchTree) === null || _a === void 0 ? void 0 : _a.realignInkBar();
    }
    ready(opts) {
        const _super = Object.create(null, {
            ready: { get: () => super.ready }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // DO NOT wait children ready()
            //await Promise.all(this.childTrees.map(c => c.ready()));
            yield _super.ready.call(this, opts);
            // Wait form
            if (this.loading && this.gearId) {
                yield waitForTrue(this._state.select(['form', 'model'], _ => true), opts);
            }
            else {
                yield firstNotNilPromise(this.program$, opts);
            }
        });
    }
    // Unused
    load(id, options) {
        return Promise.resolve(undefined);
    }
    // Unused
    reload() {
        return this.setValue(this.data);
    }
    /* -- protected function -- */
    setProgram(program, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug(this._logPrefix + `Program ${program.label} loaded, with properties: `, program.properties);
            let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
            this.i18nContext.suffix = i18nSuffix;
            const programAllowMeasure = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ENABLE);
            this.programAllowMeasure = programAllowMeasure;
            this.allowSpeciesSampling = this.allowSpeciesSampling && programAllowMeasure;
            this.allowSubBatches = this.allowSubBatches && programAllowMeasure;
            this.showTaxonGroup = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_GROUP_ENABLE);
            this.showTaxonName = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_NAME_ENABLE);
            this.samplingRatioFormat = program.getProperty(ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT);
            // Propagate to children components, if need
            if (!opts || opts.emitEvent !== false) {
                // This should be need when program$ has been set by parent, and not from the programLabel$ observable
                if (this.programLabel !== program.label) {
                    this.programLabel = program.label;
                }
            }
            // Propagate to state, if need
            if (this.program !== program) {
                this.program = program;
            }
            this.markForCheck();
        });
    }
    loadPmfms(program, gearId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!program || isNil(gearId))
                return; // Skip
            console.info(this._logPrefix + 'Loading pmfms...');
            // Remember component state
            const enabled = this.enabled;
            const touched = this.touched;
            const dirty = this.dirty;
            try {
                // Save data if dirty and enabled (do not save when disabled, e.g. when reload)
                if (dirty && enabled) {
                    console.info('[batch-tree-container] Save batches... (before to reset tabs)');
                    try {
                        yield this.save();
                    }
                    catch (err) {
                        // Log then continue
                        console.error(err && err.message || err);
                    }
                }
                // Load pmfms for batches
                const [catchPmfms, sortingPmfms] = yield Promise.all([
                    this.programRefService.loadProgramPmfms(program.label, {
                        acquisitionLevel: AcquisitionLevelCodes.CATCH_BATCH,
                        gearId
                    }),
                    this.programRefService.loadProgramPmfms(program.label, {
                        acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH,
                        gearId
                    })
                ]);
                // Update the state
                this._state.set((state) => (Object.assign(Object.assign({}, state), { catchPmfms, sortingPmfms })));
            }
            catch (err) {
                const error = (err === null || err === void 0 ? void 0 : err.message) || err;
                this.setError(error);
            }
            finally {
                // Restore component state
                if (enabled)
                    this.enable();
                if (dirty)
                    this.markAsDirty();
                if (touched)
                    this.markAllAsTouched();
            }
        });
    }
    updateView(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const model = this.model;
            if (!model)
                return; // Skip if missing model, or if data changed
            // Set the tree value - only once if data changed, to avoid a tree refresh (e.g. after a save())
            if (!opts || opts.dataChanged !== false) {
                this.batchModelTree.data = [model];
            }
            else {
                // Update the form (e.g. after a save())
                model.validator.reset(data.asObject(), { emitEvent: false });
            }
            // Keep the editing batch
            const editingBatch = isNotNil(this._lastEditingBatchPath) ? model.get(this._lastEditingBatchPath) : undefined;
            if (!(editingBatch === null || editingBatch === void 0 ? void 0 : editingBatch.hidden)) {
                // Force a reload to update the batch id (e.g. after a save(), to force batch id to be applied)
                if (this.editingBatch === editingBatch)
                    yield this.stopEditBatch();
                yield this.startEditBatch(null, editingBatch);
            }
            else {
                // Stop editing batch (not found)
                yield this.stopEditBatch();
            }
            if (!opts || opts.markAsPristine !== false) {
                this.markAsPristine();
            }
        });
    }
    startEditBatch(event, model) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (!model || !(model instanceof BatchModel))
                throw new Error('Missing required \'model\' argument');
            event === null || event === void 0 ? void 0 : event.stopImmediatePropagation();
            if (this.editingBatch === model) {
                if (this.treePanelFloating)
                    this.closeTreePanel();
                if (this.useModal)
                    (_a = this.modal) === null || _a === void 0 ? void 0 : _a.present();
                return; // Skip
            }
            // Save current state
            yield this.ready();
            const dirty = this.dirty;
            const touched = this.touched;
            const enabled = this.enabled;
            try {
                // Save previous changes
                const confirmed = yield this.confirmEditingBatch({ keepEditingBatch: true });
                if (!confirmed)
                    return; // Not confirmed = Cannot change
                console.info(this._logPrefix + `Start editing '${model === null || model === void 0 ? void 0 : model.name}'...`);
                if (this.treePanelFloating)
                    this.closeTreePanel();
                model.editing = true;
                if (this.modal && !this.modal.isOpen) {
                    if (!this.batchTree) {
                        yield this.modal.present();
                        this.cd.detectChanges();
                    }
                    else {
                        this.modal.present();
                    }
                }
                // Remember last editing batch, to be able to restore it later (e.g. see setValue())
                this._lastEditingBatchPath = model.path;
                this.batchTree.markAsNotReady();
                const rootAcquisitionLevel = !model.parent ? AcquisitionLevelCodes.CATCH_BATCH : AcquisitionLevelCodes.SORTING_BATCH;
                const program = this.program;
                const programLabel = (program === null || program === void 0 ? void 0 : program.label) || this.programLabel;
                // do NOT pass the programLabel here, to avoid a pmfms reload (pmfms will be pass using 'model.state' - see bellow)
                //this.batchTree.programLabel = programLabel;
                if (program !== this.batchTree.program) {
                    yield this.batchTree.setProgram(program, { emitEvent: false /*avoid pmfms reload*/ });
                }
                // Configure batch tree
                this.batchTree.gearId = this.gearId;
                this.batchTree.physicalGear = this.physicalGear;
                this.batchTree.i18nContext = this.i18nContext;
                this.batchTree.showBatchTables = this.showBatchTables && model.childrenPmfms && isNotEmptyArray(PmfmUtils.filterPmfms(model.childrenPmfms, { excludeHidden: true }));
                this.batchTree.allowSpeciesSampling = this.allowSpeciesSampling;
                this.batchTree.allowSubBatches = this.allowSubBatches;
                this.batchTree.batchGroupsTable.showTaxonGroupColumn = this.showTaxonGroup;
                this.batchTree.batchGroupsTable.showTaxonNameColumn = this.showTaxonName;
                this.batchTree.batchGroupsTable.samplingRatioFormat = this.samplingRatioFormat;
                this.batchTree.rootAcquisitionLevel = rootAcquisitionLevel;
                this.batchTree.setSubBatchesModalOption('programLabel', programLabel);
                this.batchTree.batchGroupsTable.pmfms = model.childrenPmfms || [];
                // Configure catch form state
                this.batchTree.catchBatchForm.applyState(Object.assign({ acquisitionLevel: rootAcquisitionLevel, 
                    // defaults
                    showSamplingBatch: false, samplingBatchEnabled: false, samplingRatioFormat: this.samplingRatioFormat }, model.state));
                this.batchTree.markAsReady();
                const jobs = [this.batchTree.catchBatchForm.ready(), this.batchTree.batchGroupsTable.ready()];
                if (this.batchTree.subBatchesTable) {
                    // TODO: pass sub batches pmfms. For now there are recomputed
                    this.batchTree.subBatchesTable.programLabel = programLabel;
                    jobs.push(this.batchTree.subBatchesTable.ready());
                }
                // Prepare data to set
                let data;
                if ((_b = model.state) === null || _b === void 0 ? void 0 : _b.showSamplingBatch) {
                    const source = model.currentData;
                    data = Batch.fromObject(source, { withChildren: false });
                    const samplingSource = BatchUtils.getOrCreateSamplingChild(source);
                    data.children = [Batch.fromObject(samplingSource, { withChildren: model.isLeaf })];
                }
                else {
                    data = Batch.fromObject(model.currentData, { withChildren: model.isLeaf });
                }
                // Waiting end of init jobs
                yield Promise.all(jobs);
                // Apply data
                yield this.batchTree.setValue(data);
                this.editingBatch = model;
            }
            finally {
                // Restore previous state
                if (dirty)
                    this.markAsDirty();
                if (touched)
                    this.markAllAsTouched({ withChildren: false });
                if (enabled && !this.batchTree.enabled)
                    this.batchTree.enable();
            }
        });
    }
    stopEditBatch(event, source) {
        return __awaiter(this, void 0, void 0, function* () {
            source = source || this.editingBatch;
            if (!source)
                return;
            this.editingBatch = null;
            source.editing = false;
            // Forget the last editing batch
            this._lastEditingBatchPath = null;
        });
    }
    resetRootForm() {
        // Reset pmfms, form and model
        this._state.set({
            sortingPmfms: null,
            catchPmfms: null,
            form: null,
            model: null
        });
        this._lastEditingBatchPath = null;
    }
    resetSamplingBatches() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.loaded)
                return;
            const dirty = this.dirty;
            // Save if need
            if (dirty) {
                const saved = yield this.save();
                if (!saved)
                    return; // Skip
            }
            try {
                // Delete sampling batches in data
                const deletedSamplingBatches = BatchUtils.deleteByFilterInTree(this.data, { isSamplingBatch: true });
                // Some batches have been deleted
                if (isNotEmptyArray(deletedSamplingBatches)) {
                    // Reapply data
                    yield this.setValue(this.data, { emitEvent: false });
                }
            }
            finally {
                // Restore dirty state
                if (dirty)
                    this.markAsDirty();
            }
        });
    }
    /**
     * Save editing batch
     */
    confirmEditingBatch(opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const model = this.editingBatch;
            if (!model)
                return true; // No editing batch: ok (not need to save)
            // Save current state
            const dirty = this.dirty;
            // Save if need
            if (this.batchTree.dirty) {
                console.info(this._logPrefix + `Saving ${model.originalData.label} ...`);
                const saved = yield this.batchTree.save();
                if (!saved) {
                    model.valid = this.batchTree.valid;
                    return false;
                }
            }
            // Get saved data
            const batch = (_a = this.batchTree.value) === null || _a === void 0 ? void 0 : _a.clone();
            if (batch.label !== model.originalData.label)
                throw new Error(`Invalid saved batch label. Expected: ${model.originalData.label} Actual: ${batch.label}`);
            // Update model value (batch first)
            const json = batch.asObject();
            if (isNotEmptyArray(model.pmfms)) {
                MeasurementValuesUtils.normalizeEntityToForm(json, model.pmfms, model.validator, { keepOtherExistingPmfms: true });
            }
            // Update batch weight (need by validator)
            if (model.state.showWeight) {
                json.weight = BatchUtils.getWeight(json, model.weightPmfms);
            }
            if (model.state.showSampleWeight) {
                const samplingJson = BatchUtils.getSamplingChild(json);
                samplingJson.weight = BatchUtils.getWeight(samplingJson, model.weightPmfms);
            }
            model.validator.patchValue(json);
            // Wait validation finished
            if (!model.validator.valid) {
                yield AppFormUtils.waitWhilePending(model.validator);
                // Log invalid
                if (this.debug && model.validator.invalid) {
                    AppFormUtils.logFormErrors(model.validator, '[batch-tree-container] ');
                }
            }
            // Update model validity
            model.valid = model.validator.valid;
            // Update rowCount
            if (model.isLeaf) {
                model.rowCount = this.batchTree.batchGroupsTable.visibleRowCount;
            }
            if (!opts || opts.keepEditingBatch !== true) {
                this.editingBatch = null;
                model.editing = false;
                (_b = this.modal) === null || _b === void 0 ? void 0 : _b.dismiss();
            }
            // Reset dirty state
            this.batchTree.markAsPristine();
            // Restore the previous dirty state
            if (dirty)
                this.markAsDirty();
            return true;
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    getBatchModelByPath(path) {
        return getPropertyByPath(this.model, path);
    }
    forward(event, model) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(this._logPrefix + 'Go forward');
            event === null || event === void 0 ? void 0 : event.stopImmediatePropagation();
            model = model || this.editingBatch;
            if (!model)
                return;
            const nextVisible = TreeItemEntityUtils.forward(model, c => !c.hidden);
            if (nextVisible) {
                yield this.startEditBatch(null, nextVisible);
                this.setSelectedTabIndex(0);
            }
        });
    }
    backward(event, model) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(this._logPrefix + 'Go backward');
            event === null || event === void 0 ? void 0 : event.stopImmediatePropagation();
            model = model || this.editingBatch;
            if (!model)
                return;
            const previousVisible = TreeItemEntityUtils.backward(model, c => !c.hidden);
            if (previousVisible) {
                yield this.startEditBatch(null, previousVisible);
                this.setSelectedTabIndex(0);
            }
        });
    }
    watchBatchTreeStatus() {
        const stopSubject = new Subject();
        return new Observable((subscriber) => {
            const subscription = new Subscription();
            subscription.add(() => stopSubject.next());
            waitFor(() => !!this.batchTree, { stop: stopSubject })
                .then(() => {
                subscription.add(this.batchTree.statusChanges
                    .pipe(combineLatestWith(this.batchTree.batchGroupsTable.dataSource.rowsSubject), map(([status, rows]) => {
                    return {
                        valid: status !== 'INVALID',
                        rowCount: this.batchTree.showBatchTables
                            ? ((rows === null || rows === void 0 ? void 0 : rows.length) || 0)
                            : undefined
                    };
                }))
                    .subscribe(state => subscriber.next(state)));
            });
            return subscription;
        });
    }
};
__decorate([
    ViewChild('batchTree'),
    __metadata("design:type", BatchTreeComponent)
], BatchTreeContainerComponent.prototype, "batchTree", void 0);
__decorate([
    ViewChild('batchModelTree'),
    __metadata("design:type", BatchModelTreeComponent)
], BatchTreeContainerComponent.prototype, "batchModelTree", void 0);
__decorate([
    ViewChild('sidenav'),
    __metadata("design:type", MatSidenav)
], BatchTreeContainerComponent.prototype, "sidenav", void 0);
__decorate([
    ViewChild('modal'),
    __metadata("design:type", IonModal)
], BatchTreeContainerComponent.prototype, "modal", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchTreeContainerComponent.prototype, "queryTabIndexParamName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchTreeContainerComponent.prototype, "modalOptions", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchTreeContainerComponent.prototype, "defaultHasSubBatches", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], BatchTreeContainerComponent.prototype, "availableTaxonGroups", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchTreeContainerComponent.prototype, "showTaxonName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchTreeContainerComponent.prototype, "showTaxonGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchTreeContainerComponent.prototype, "showAutoFillButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchTreeContainerComponent.prototype, "samplingRatioFormat", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], BatchTreeContainerComponent.prototype, "selectedTabIndex", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchTreeContainerComponent.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchTreeContainerComponent.prototype, "i18nPmfmPrefix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchTreeContainerComponent.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchTreeContainerComponent.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchTreeContainerComponent.prototype, "debug", void 0);
__decorate([
    Input(),
    __metadata("design:type", BatchFilter)
], BatchTreeContainerComponent.prototype, "filter", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchTreeContainerComponent.prototype, "style", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchTreeContainerComponent.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchTreeContainerComponent.prototype, "useModal", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchTreeContainerComponent.prototype, "rxStrategy", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeContainerComponent.prototype, "allowSpeciesSampling", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeContainerComponent.prototype, "allowSubBatches", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], BatchTreeContainerComponent.prototype, "programLabel", null);
__decorate([
    Input(),
    __metadata("design:type", Program),
    __metadata("design:paramtypes", [Program])
], BatchTreeContainerComponent.prototype, "program", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeContainerComponent.prototype, "requiredGear", null);
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BatchTreeContainerComponent.prototype, "gearId", null);
__decorate([
    Input(),
    __metadata("design:type", PhysicalGear),
    __metadata("design:paramtypes", [PhysicalGear])
], BatchTreeContainerComponent.prototype, "physicalGear", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeContainerComponent.prototype, "showCatchForm", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeContainerComponent.prototype, "showBatchTables", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeContainerComponent.prototype, "allowDiscard", null);
BatchTreeContainerComponent = __decorate([
    Component({
        selector: 'app-batch-tree-container',
        templateUrl: './batch-tree-container.component.html',
        styleUrls: ['./batch-tree-container.component.scss'],
        providers: [
            { provide: ContextService, useExisting: TripContextService },
            RxState
        ],
        animations: [fadeInOutAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(13, Optional()),
    __param(13, Inject(APP_LOGGING_SERVICE)),
    __metadata("design:paramtypes", [Injector,
        ActivatedRoute,
        Router,
        AlertController,
        TranslateService,
        ProgramRefService,
        BatchModelValidatorService,
        PmfmNamePipe,
        PhysicalGearService,
        TripContextService,
        RxState,
        ChangeDetectorRef,
        LocalSettingsService, Object])
], BatchTreeContainerComponent);
export { BatchTreeContainerComponent };
//# sourceMappingURL=batch-tree-container.component.js.map