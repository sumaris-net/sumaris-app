import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewChild } from '@angular/core';
import { AppFormUtils, AppTabEditor, InMemoryEntitiesService, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettingsService, ReferentialRef, toBoolean, toNumber, } from '@sumaris-net/ngx-components';
import { AlertController, NavController } from '@ionic/angular';
import { combineLatest, defer, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, startWith, switchMap, tap } from 'rxjs/operators';
import { Batch } from '../common/batch.model';
import { BatchGroupUtils } from '../group/batch-group.model';
import { BatchGroupsTable } from '../group/batch-groups.table';
import { SubBatchesTable, SubBatchFilter } from '../sub/sub-batches.table';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { SubBatch, SubBatchUtils } from '../sub/sub-batch.model';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/trip-context.service';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AppSharedFormUtils } from '@app/shared/forms.utils';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { CatchBatchForm } from '@app/trip/batch/catch/catch.form';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { RxState } from '@rx-angular/state';
import { environment } from '@environments/environment';
import { qualityFlagInvalid } from '@app/data/services/model/model.utils';
let BatchTreeComponent = class BatchTreeComponent extends AppTabEditor {
    constructor(route, router, navController, alertCtrl, translate, programRefService, settings, context, _state, cd) {
        super(route, router, navController, alertCtrl, translate, {
            tabCount: settings.mobile ? 1 : 2,
        });
        this.route = route;
        this.router = router;
        this.navController = navController;
        this.alertCtrl = alertCtrl;
        this.translate = translate;
        this.programRefService = programRefService;
        this.settings = settings;
        this.context = context;
        this._state = _state;
        this.cd = cd;
        this._listenProgramChanges = true;
        this._logPrefix = '[batch-tree] ';
        this.programLabel$ = this._state.select('programLabel');
        this.program$ = this._state.select('program');
        this.showSamplingBatchColumns$ = this._state.select(['allowSpeciesSampling', 'programAllowMeasure'], ({ allowSpeciesSampling, programAllowMeasure }) => allowSpeciesSampling && programAllowMeasure);
        this.showCatchForm$ = this._state.select('showCatchForm');
        this.showBatchTables$ = this._state.select('showBatchTables');
        this.allowSubBatches$ = this._state.select('allowSubBatches');
        this.requiredGear$ = this._state.select('requiredGear');
        this.gearId$ = this._state.select('gearId');
        this.rootAcquisitionLevel = AcquisitionLevelCodes.CATCH_BATCH;
        this.useSticky = false;
        this.rxStrategy = 'normal';
        this.showAutoFillButton = true;
        this.debug = false;
        // Defaults
        this.mobile = settings.mobile;
        this.i18nContext = {
            prefix: '',
            suffix: '',
        };
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    set showSubBatchesTable(value) {
        this._state.set('showSubBatchesTable', (_) => value);
    }
    get showSubBatchesTable() {
        return this._state.get('showSubBatchesTable');
    }
    set physicalGear(value) {
        var _a;
        this._state.set({
            physicalGear: value,
            gearId: toNumber((_a = value === null || value === void 0 ? void 0 : value.gear) === null || _a === void 0 ? void 0 : _a.id, null),
        });
    }
    get physicalGear() {
        return this._state.get('physicalGear');
    }
    set samplingRatioFormat(value) {
        this._state.set('samplingRatioFormat', (_) => value);
    }
    get samplingRatioFormat() {
        return this._state.get('samplingRatioFormat');
    }
    set showCatchForm(value) {
        this._state.set('showCatchForm', (_) => value);
    }
    get showCatchForm() {
        return this._state.get('showCatchForm');
    }
    set showBatchTables(value) {
        this._state.set('showBatchTables', (_) => value);
    }
    get showBatchTables() {
        return this._state.get('showBatchTables');
    }
    set disabled(value) {
        if (value && this._enabled) {
            this.disable();
        }
        else if (!value && !this._enabled) {
            this.enable();
        }
    }
    get disabled() {
        return !super.enabled;
    }
    get touched() {
        var _a;
        return (_a = this.form) === null || _a === void 0 ? void 0 : _a.touched;
    }
    get programAllowMeasure() {
        return this._state.get('programAllowMeasure') || false;
    }
    set programAllowMeasure(value) {
        this._state.set('programAllowMeasure', (_) => value);
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
    get isNewData() {
        var _a;
        return isNil((_a = this.data) === null || _a === void 0 ? void 0 : _a.id);
    }
    set value(catchBatch) {
        this.setValue(catchBatch);
    }
    get value() {
        return this.getValue();
    }
    set programLabel(value) {
        this._state.set('programLabel', (_) => value);
    }
    get programLabel() {
        return this._state.get('programLabel');
    }
    set program(value) {
        this._listenProgramChanges = false; // Avoid to watch program changes, when program is given by parent component
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
    set availableTaxonGroups(value) {
        this.batchGroupsTable.availableTaxonGroups = value;
    }
    get availableTaxonGroups() {
        return this.batchGroupsTable.availableTaxonGroups;
    }
    set defaultHasSubBatches(value) {
        this.batchGroupsTable.defaultHasSubBatches = value;
    }
    get defaultHasSubBatches() {
        return this.batchGroupsTable.defaultHasSubBatches;
    }
    set filter(value) {
        this.setFilter(value);
    }
    get filter() {
        var _a;
        return (_a = this.catchBatchForm) === null || _a === void 0 ? void 0 : _a.filter;
    }
    get dirty() {
        var _a;
        return super.dirty || ((_a = this._subBatchesService) === null || _a === void 0 ? void 0 : _a.dirty) || false;
    }
    set modalOptions(modalOptions) {
        this.batchGroupsTable.modalOptions = modalOptions;
    }
    get modalOptions() {
        return this.batchGroupsTable.modalOptions;
    }
    get subBatchesCount() {
        var _a;
        return this._subBatchesService ? this._subBatchesService.count + this._subBatchesService.hiddenCount : ((_a = this.subBatchesTable) === null || _a === void 0 ? void 0 : _a.totalRowCount) || 0;
    }
    get statusChanges() {
        const delegates = [
            // Listen on forms
            ...(this.forms || []).filter(c => c.form).map((c) => c.form.statusChanges
                .pipe(startWith(c.form.invalid ? 'INVALID' : 'VALID'))),
            // Listen on tables
            ...(this.tables || []).map((t) => t.onStartEditingRow
                .pipe(
            //map(_ => t.editedRow),
            switchMap(row => {
                var _a, _b;
                return row.validator ? row.validator.statusChanges
                    .pipe(startWith(qualityFlagInvalid((_a = row.currentData) === null || _a === void 0 ? void 0 : _a.qualityFlagId) ? 'INVALID' : 'VALID'))
                    :
                        of(qualityFlagInvalid((_b = row.currentData) === null || _b === void 0 ? void 0 : _b.qualityFlagId) ? 'INVALID' : 'VALID');
            }))),
        ];
        // Warn if empty
        if (this.debug && !delegates.length)
            console.warn(this._logPrefix + 'No child allow to observe the status');
        return combineLatest(delegates).pipe(startWith(['VALID']), debounceTime(450), map((_) => {
            // DEBUG
            //if (this.debug) console.debug(this._logPrefix + 'Computing tree status...', _);
            if (this.loading)
                return 'PENDING';
            if (this.disabled)
                return 'DISABLED';
            if (this.valid)
                return 'VALID';
            return this.pending ? 'PENDING' : 'INVALID';
        }), distinctUntilChanged());
    }
    ngOnInit() {
        // Set defaults
        this.tabCount = this.mobile ? 1 : 2;
        this.showCatchForm = toBoolean(this.showCatchForm, true);
        this.showBatchTables = toBoolean(this.showBatchTables, true);
        this.allowSpeciesSampling = toBoolean(this.allowSpeciesSampling, true);
        this.allowSubBatches = toBoolean(this.allowSubBatches, true);
        this._subBatchesService = this.mobile
            ? new InMemoryEntitiesService(SubBatch, SubBatchFilter, {
                equals: Batch.equals,
                sortByReplacement: { id: 'rankOrder' },
            })
            : null;
        super.ngOnInit();
        // Register forms
        this.registerForms();
        this._state.connect('showCatchForm', combineLatest([this.catchBatchForm.hasContent$, this.catchBatchForm.ready$]).pipe(filter(([_, ready]) => ready), map(([hasContent, _]) => hasContent), tap((showCatchForm) => {
            if (this._enabled) {
                if (showCatchForm && !this.catchBatchForm.enabled) {
                    this.catchBatchForm.enable();
                }
                else if (!showCatchForm && this.catchBatchForm.enabled) {
                    this.catchBatchForm.disable();
                }
            }
        })));
        this._state.connect('showSubBatchesTable', this._state.select(['allowSubBatches', 'programAllowMeasure'], ({ allowSubBatches, programAllowMeasure }) => allowSubBatches && programAllowMeasure));
        this._state.hold(this._state.select('showSubBatchesTable'), (showSubBatchesTable) => {
            // If disabled
            if (!showSubBatchesTable) {
                // Reset existing sub batches
                if (!this.loading)
                    this.resetSubBatches();
                // Select the first tab
                this.setSelectedTabIndex(0);
            }
            if (!this.loading)
                this.markForCheck();
        });
    }
    ngAfterViewInit() {
        // Get available sub-batches only when subscribe (for performance reason)
        this.batchGroupsTable.availableSubBatches = defer(() => this.getSubBatches());
        // Watch program, to configure tables from program properties
        this._state.connect('program', this.programLabel$.pipe(filter(() => this._listenProgramChanges), // Avoid to watch program, if was already set
        filter(isNotNilOrBlank), distinctUntilChanged(), switchMap((programLabel) => this.programRefService.watchByLabel(programLabel))));
        // Apply program
        this._state.hold(this.program$, (program) => this.setProgram(program));
        if (this.subBatchesTable) {
            // Enable sub batches table, only when table pmfms ready
            this._state.connect('showSubBatchesTable', combineLatest([
                this.subBatchesTable.hasPmfms$,
                this.subBatchesTable.readySubject,
                this.batchGroupsTable.dataSource.rowsSubject.pipe(map(isNotEmptyArray)),
                this.allowSubBatches$,
            ]).pipe(map(([hasPmfms, ready, howBatchGroupRows, allowSubBatches]) => (hasPmfms && ready && howBatchGroupRows && allowSubBatches) || false)));
            // Update available parent on individual batch table, when batch group changes
            this._state.hold(this.batchGroupsTable.dataSource.rowsSubject.pipe(filter((rows) => !this.loading && this.allowSubBatches && isNotEmptyArray(rows)), debounceTime(400), map((_) => this.batchGroupsTable.dataSource.getData())), (parents) => (this.subBatchesTable.availableParents = parents));
        }
    }
    ngOnDestroy() {
        var _a;
        super.ngOnDestroy();
        (_a = this._subBatchesService) === null || _a === void 0 ? void 0 : _a.stop();
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
    setModalOption(key, value) {
        this.batchGroupsTable.setModalOption(key, value);
    }
    setSubBatchesModalOption(key, value) {
        this.batchGroupsTable.setSubBatchesModalOption(key, value);
    }
    disable(opts) {
        super.disable(opts);
    }
    enable(opts) {
        super.enable(opts);
    }
    save(event, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // Create (or fill) the catch form entity
            const source = this.catchBatchForm.value; // Get the JSON (/!\ measurementValues should be Form ready)
            const target = this.data || new Batch();
            target.fromObject(source, { withChildren: false /*will be set after*/ });
            const samplingSource = BatchUtils.getSamplingChild(source);
            const samplingTarget = samplingSource && Batch.fromObject(samplingSource, { withChildren: false /*will be set after*/ });
            // Save batch groups and sub batches
            const [batchGroups, subBatches] = yield Promise.all([this.getBatchGroups(true), this.getSubBatches()]);
            // Prepare subBatches for model (set parent)
            if (isNotEmptyArray(subBatches)) {
                SubBatchUtils.linkSubBatchesToParent(batchGroups, subBatches, {
                    qvPmfm: this.batchGroupsTable.qvPmfm,
                });
            }
            if (samplingTarget) {
                target.children = [samplingTarget];
                samplingTarget.children = batchGroups;
            }
            else {
                target.children = batchGroups;
            }
            // DEBUG
            //if (this.debug) BatchUtils.logTree(target);
            this.data = target;
            return true;
        });
    }
    getJsonValueToSave() {
        // Get only the catch form
        return this.form.value;
    }
    getValue() {
        return this.data;
    }
    load(id, options) {
        // Unused
        return Promise.resolve(undefined);
    }
    reload() {
        // Unused
        return Promise.resolve(undefined);
    }
    setValue(source, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            source =
                source ||
                    Batch.fromObject({
                        rankOrder: 1,
                        label: this.rootAcquisitionLevel,
                    });
            // If catch batch (=no parent nor parentId) and rootAcquisitionLevel = CATCH_BATCH
            if (!source.parent && isNil(source.parentId) && this.rootAcquisitionLevel === AcquisitionLevelCodes.CATCH_BATCH) {
                // Check expected label
                if (source.label !== AcquisitionLevelCodes.CATCH_BATCH) {
                    throw new Error(`[batch-tree] Invalid catch batch label. Expected: ${AcquisitionLevelCodes.CATCH_BATCH} - Actual: ${source.label}`);
                }
            }
            // Check root batch has the expected label (should start with the rootAcquisitionLevel)
            else if (source.label && !source.label.startsWith(this.rootAcquisitionLevel)) {
                console.warn(`[batch-tree] Invalid root batch label. Expected: ${this.rootAcquisitionLevel} - Actual: ${source.label}`);
            }
            // DEBUG
            //console.debug(this._logPrefix + 'setValue()', source);
            this.markAsLoading({ emitEvent: false });
            this.markAsNotReady({ emitEvent: false });
            try {
                this.data = source;
                let childrenLabelPrefix = this.rootAcquisitionLevel === AcquisitionLevelCodes.CATCH_BATCH ? AcquisitionLevelCodes.SORTING_BATCH + '#' : `${source.label}.`;
                // Set catch batch
                const samplingSource = BatchUtils.getSamplingChild(source);
                {
                    const target = source.clone({ withChildren: false });
                    if (samplingSource) {
                        target.children = [samplingSource.clone({ withChildren: false })];
                        childrenLabelPrefix = `${samplingSource.label}.`;
                    }
                    this.catchBatchForm.gearId = this.gearId;
                    this.catchBatchForm.markAsReady();
                    yield this.catchBatchForm.setValue(target);
                }
                if (this.batchGroupsTable) {
                    // Retrieve batch group (make sure label start with acquisition level)
                    // Then convert into batch group entities
                    const batchGroups = BatchGroupUtils.fromBatchTree(samplingSource || source);
                    // Apply to table
                    this.batchGroupsTable.gearId = this.gearId;
                    this.batchGroupsTable.labelPrefix = childrenLabelPrefix;
                    this.batchGroupsTable.markAsReady();
                    this.batchGroupsTable.value = batchGroups;
                    yield this.batchGroupsTable.ready(); // Wait loaded (need to be sure the QV pmfm is set)
                    const groupQvPmfm = this.batchGroupsTable.qvPmfm;
                    const subBatches = SubBatchUtils.fromBatchGroups(batchGroups, {
                        groupQvPmfm,
                    });
                    if (this.subBatchesTable) {
                        this.subBatchesTable.qvPmfm = groupQvPmfm;
                        this.subBatchesTable.value = subBatches;
                        const ready = this.subBatchesTable.setAvailableParents(batchGroups, {
                            emitEvent: true,
                            linkDataToParent: false, // Not need (will be done later, in value setter)
                        });
                        this.subBatchesTable.markAsReady();
                        yield ready;
                    }
                    else {
                        this._subBatchesService.value = subBatches;
                    }
                }
            }
            finally {
                this.markAsPristine();
                this.markAsUntouched();
                this.markAsLoaded({ emitEvent: false });
            }
            // DEBUG the dirty state
            //this.catchBatchForm.form.valueChanges.subscribe(value => {
            //  if (this.loaded) console.error('TODO value change', new Error());
            //})
        });
    }
    /* -- protected method -- */
    get form() {
        return this.catchBatchForm.form;
    }
    registerForms() {
        this.addChildForms([this.catchBatchForm, this.batchGroupsTable, () => this.subBatchesTable]);
    }
    /**
     *
     * @param program
     * @param opts allow to avoid program propagation (e.g. see batch tree container)
     * @protected
     */
    setProgram(program, opts = { emitEvent: true }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug(`[batch-tree] Program ${program.label} loaded, with properties: `, program.properties);
            this.markAsLoading({ emitEvent: false });
            let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
            this.i18nContext.suffix = i18nSuffix;
            const programAllowMeasure = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ENABLE);
            this.programAllowMeasure = programAllowMeasure;
            this.allowSpeciesSampling = this.allowSpeciesSampling && programAllowMeasure;
            this.allowSubBatches = this.allowSubBatches && programAllowMeasure;
            this.enableWeightLengthConversion = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_LENGTH_WEIGHT_CONVERSION_ENABLE);
            const samplingRatioFormat = program.getProperty(ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT);
            this.samplingRatioFormat = samplingRatioFormat;
            this.catchBatchForm.samplingRatioFormat = samplingRatioFormat;
            this.batchGroupsTable.showWeightColumns = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_WEIGHT_ENABLE);
            this.batchGroupsTable.showTaxonGroupColumn = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_GROUP_ENABLE);
            this.batchGroupsTable.showTaxonNameColumn = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_TAXON_NAME_ENABLE);
            this.batchGroupsTable.samplingRatioFormat = samplingRatioFormat;
            this.batchGroupsTable.enableWeightLengthConversion = this.enableWeightLengthConversion;
            this.batchGroupsTable.setModalOption('maxVisibleButtons', program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS));
            this.batchGroupsTable.setModalOption('maxItemCountForButtons', program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_ITEM_COUNT_FOR_BUTTONS));
            this.batchGroupsTable.setModalOption('enableBulkMode', !program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_AUTO_FILL)); // Disable bulk mode when auto fill is on
            this.batchGroupsTable.i18nColumnSuffix = i18nSuffix;
            // Some specific taxon groups have no weight collected
            const taxonGroupsNoWeight = program.getPropertyAsStrings(ProgramProperties.TRIP_BATCH_TAXON_GROUPS_NO_WEIGHT);
            this.batchGroupsTable.taxonGroupsNoWeight = (taxonGroupsNoWeight || []).map((label) => label.trim().toUpperCase()).filter(isNotNilOrBlank);
            // Some specific taxon groups are never landing
            const taxonGroupsNoLanding = program.getPropertyAsStrings(ProgramProperties.TRIP_BATCH_TAXON_GROUPS_NO_LANDING);
            this.batchGroupsTable.taxonGroupsNoLanding = (taxonGroupsNoLanding || []).map((label) => label.trim().toUpperCase()).filter(isNotNilOrBlank);
            // Store country to context (to be used in sub batches modal)
            const countryId = program.getPropertyAsInt(ProgramProperties.TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID);
            if (isNotNil(countryId) && isNil(this.context.getValue('country'))) {
                this.context.setValue('country', ReferentialRef.fromObject({ id: countryId }));
            }
            else {
                if (this.enableWeightLengthConversion) {
                    console.error(`Missing country location id, for round weight conversion! Please define program property '${ProgramProperties.TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID.key}' for ${program.label}`);
                }
                this.context.resetValue('country');
            }
            // Force taxon name in sub batches, if not filled in root batch
            const subBatchesTaxonName = !this.batchGroupsTable.showTaxonNameColumn && program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_INDIVIDUAL_TAXON_NAME_ENABLE);
            this.batchGroupsTable.setSubBatchesModalOption('showTaxonNameColumn', subBatchesTaxonName);
            this.batchGroupsTable.setSubBatchesModalOption('showBluetoothIcon', program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ICHTHYOMETER_ENABLE));
            if (this.subBatchesTable) {
                this.subBatchesTable.showTaxonNameColumn = subBatchesTaxonName;
                this.subBatchesTable.showTaxonNameInParentAutocomplete = !subBatchesTaxonName && this.batchGroupsTable.showTaxonNameColumn;
                this.subBatchesTable.showIndividualCount = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_INDIVIDUAL_COUNT_ENABLE);
                this.subBatchesTable.weightDisplayedUnit = program.getProperty(ProgramProperties.TRIP_BATCH_MEASURE_INDIVIDUAL_WEIGHT_DISPLAYED_UNIT);
                this.subBatchesTable.i18nColumnSuffix = i18nSuffix;
            }
            // Propagate to children components, if need
            if (!opts || opts.emitEvent !== false) {
                // This should be need when program$ has been set by parent, and not from the programLabel$ observable
                if (this.programLabel !== program.label) {
                    this.programLabel = program.label;
                }
            }
        });
    }
    markAsLoaded(opts) {
        super.markAsLoaded(opts);
    }
    markAsLoading(opts) {
        if (!this.loadingSubject.value) {
            this.loadingSubject.next(true);
            // Emit to children
            if (!opts || opts.onlySelf !== true) {
                this.children.filter(c => c.loading)
                    .forEach(c => c.markAsLoading(opts));
            }
            if (!opts || opts.emitEvent !== false)
                this.markForCheck();
        }
    }
    markAsNotReady(opts) {
        var _a;
        if (this.readySubject.value) {
            this.readySubject.next(false);
            // Emit to children
            if (!opts || opts.onlySelf !== true) {
                (_a = this.children) === null || _a === void 0 ? void 0 : _a.map((c) => c['readySubject']).filter(isNotNil).filter((readySubject) => readySubject.value !== false).forEach((readySubject) => readySubject.next(false));
            }
            if (!opts || opts.emitEvent !== false)
                this.markForCheck();
        }
    }
    onSubBatchesChanges(subbatches) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(subbatches))
                return; // user cancelled
            try {
                if (this.subBatchesTable) {
                    this.subBatchesTable.value = subbatches;
                    // Wait table not busy
                    yield this.subBatchesTable.waitIdle({ stop: this.destroySubject, stopError: false });
                    this.subBatchesTable.markAsDirty();
                }
                else {
                    yield this._subBatchesService.saveAll(subbatches);
                }
            }
            catch (err) {
                console.error(this._logPrefix + 'Error while updating sub batches', err);
            }
        });
    }
    onTabChange(event, queryTabIndexParamName) {
        const result = super.onTabChange(event, queryTabIndexParamName);
        if (!this.loading) {
            // On each tables, confirm the current editing row
            if (this.showBatchTables && this.batchGroupsTable)
                this.batchGroupsTable.confirmEditCreate();
            if (this.allowSubBatches && this.subBatchesTable)
                this.subBatchesTable.confirmEditCreate();
        }
        return result;
    }
    autoFill(opts = { skipIfDisabled: true, skipIfNotEmpty: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            const dirty = this.dirty;
            yield this.batchGroupsTable.autoFillTable(opts);
            // Propagate dirty state
            if (!dirty && this.batchGroupsTable.dirty) {
                this.markAsDirty();
            }
        });
    }
    setSelectedTabIndex(value, opts) {
        super.setSelectedTabIndex(value, Object.assign({ realignInkBar: !this.mobile }, opts));
    }
    addRow(event) {
        switch (this.selectedTabIndex) {
            case 0:
                this.batchGroupsTable.addRow(event);
                break;
            case 1:
                this.subBatchesTable.addRow(event);
                break;
        }
    }
    getFirstInvalidTabIndex() {
        var _a;
        if (this.showCatchForm && this.catchBatchForm.invalid)
            return 0;
        if (this.showBatchTables && this.batchGroupsTable.invalid)
            return 0;
        if (this.allowSubBatches && ((_a = this.subBatchesTable) === null || _a === void 0 ? void 0 : _a.invalid))
            return 1;
        return -1;
    }
    waitIdle() {
        return AppFormUtils.waitIdle(this);
    }
    setFilter(dataFilter) {
        this.catchBatchForm.filter = dataFilter;
        this.batchGroupsTable.setFilter(dataFilter);
    }
    /* -- protected methods -- */
    getBatchGroups(forceSave) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.showBatchTables)
                return undefined;
            return this.getTableValue(this.batchGroupsTable, forceSave);
        });
    }
    getSubBatches() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.showBatchTables)
                return undefined;
            if (this.subBatchesTable) {
                return this.getTableValue(this.subBatchesTable);
            }
            else {
                return ((this._subBatchesService.value || [])
                    // make sure to convert into model
                    .map((source) => SubBatch.fromObject(source)));
            }
        });
    }
    resetSubBatches() {
        console.warn(this._logPrefix + 'Resetting sub batches !!');
        if (this.subBatchesTable)
            this.subBatchesTable.value = [];
        if (this._subBatchesService)
            this._subBatchesService.setValue([]);
    }
    saveDirtyChildren() {
        return super.saveDirtyChildren();
    }
    getTableValue(table, forceSave) {
        return __awaiter(this, void 0, void 0, function* () {
            const dirty = table.dirty;
            if (dirty || forceSave) {
                try {
                    yield table.save();
                }
                catch (err) {
                    if (!forceSave)
                        this.setError((err && err.message) || err);
                    throw err;
                }
                // Remember dirty state
                if (dirty)
                    this.markAsDirty({ emitEvent: false });
            }
            return table.value;
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    dumpDebugData(type) {
        switch (type) {
            case 'catchForm':
                this._debugData = AppSharedFormUtils.dumpForm(this.catchBatchForm.form);
                break;
            case 'rowValidator':
                this._debugData = AppSharedFormUtils.dumpForm(this.batchGroupsTable.getDebugData(type));
                break;
            default:
                throw new Error('Unknown type: ' + type);
        }
        this.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchTreeComponent.prototype, "rootAcquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchTreeComponent.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchTreeComponent.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchTreeComponent.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchTreeComponent.prototype, "enableWeightLengthConversion", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchTreeComponent.prototype, "i18nPmfmPrefix", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchTreeComponent.prototype, "rxStrategy", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchTreeComponent.prototype, "showAutoFillButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchTreeComponent.prototype, "debug", void 0);
__decorate([
    Input(),
    __metadata("design:type", PhysicalGear),
    __metadata("design:paramtypes", [PhysicalGear])
], BatchTreeComponent.prototype, "physicalGear", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], BatchTreeComponent.prototype, "samplingRatioFormat", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeComponent.prototype, "showCatchForm", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeComponent.prototype, "showBatchTables", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeComponent.prototype, "disabled", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeComponent.prototype, "allowSpeciesSampling", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeComponent.prototype, "allowSubBatches", null);
__decorate([
    Input(),
    __metadata("design:type", Batch),
    __metadata("design:paramtypes", [Batch])
], BatchTreeComponent.prototype, "value", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], BatchTreeComponent.prototype, "programLabel", null);
__decorate([
    Input(),
    __metadata("design:type", Program),
    __metadata("design:paramtypes", [Program])
], BatchTreeComponent.prototype, "program", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeComponent.prototype, "requiredGear", null);
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], BatchTreeComponent.prototype, "gearId", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], BatchTreeComponent.prototype, "availableTaxonGroups", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchTreeComponent.prototype, "defaultHasSubBatches", null);
__decorate([
    Input(),
    __metadata("design:type", BatchFilter),
    __metadata("design:paramtypes", [BatchFilter])
], BatchTreeComponent.prototype, "filter", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], BatchTreeComponent.prototype, "modalOptions", null);
__decorate([
    ViewChild('catchBatchForm', { static: true }),
    __metadata("design:type", CatchBatchForm)
], BatchTreeComponent.prototype, "catchBatchForm", void 0);
__decorate([
    ViewChild('batchGroupsTable', { static: true }),
    __metadata("design:type", BatchGroupsTable)
], BatchTreeComponent.prototype, "batchGroupsTable", void 0);
__decorate([
    ViewChild('subBatchesTable', { static: false }),
    __metadata("design:type", SubBatchesTable)
], BatchTreeComponent.prototype, "subBatchesTable", void 0);
BatchTreeComponent = __decorate([
    Component({
        selector: 'app-batch-tree',
        templateUrl: './batch-tree.component.html',
        styleUrls: ['./batch-tree.component.scss'],
        providers: [{ provide: ContextService, useExisting: TripContextService }, RxState],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [ActivatedRoute,
        Router,
        NavController,
        AlertController,
        TranslateService,
        ProgramRefService,
        LocalSettingsService,
        ContextService,
        RxState,
        ChangeDetectorRef])
], BatchTreeComponent);
export { BatchTreeComponent };
//# sourceMappingURL=batch-tree.component.js.map