var OperationPage_1;
import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Optional, ViewChild } from '@angular/core';
import { OperationService } from './operation.service';
import { OperationForm } from './operation.form';
import { TripService } from '../trip/trip.service';
import { MeasurementsForm } from '@app/data/measurement/measurements.form.component';
import { AppEditorOptions, AppFormUtils, AppHelpModal, DateUtils, EntityUtils, fadeInOutAnimation, FilesUtils, firstNotNilPromise, fromDateISOString, Hotkeys, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, MINIFY_ENTITY_FOR_LOCAL_STORAGE, ReferentialUtils, sleep, toBoolean, toInt, toNumber, } from '@sumaris-net/ngx-components';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, startWith, switchMap, takeUntil, tap, throttleTime } from 'rxjs/operators';
import { Validators } from '@angular/forms';
import { Operation, OperationUtils } from '../trip/trip.model';
import { OperationPasteFlags, ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds, QualitativeLabels, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { from, merge, of, Subscription, timer } from 'rxjs';
import { MeasurementUtils } from '@app/data/measurement/measurement.model';
import { ModalController } from '@ionic/angular';
import { SampleTreeComponent } from '@app/trip/sample/sample-tree.component';
import { OperationValidators } from '@app/trip/operation/operation.validator';
import { TripContextService } from '@app/trip/trip-context.service';
import { ContextService } from '@app/shared/context.service';
import { Geometries } from '@app/shared/geometries.utils';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { flagsToString, removeFlag } from '@app/shared/flags.utils';
import { PositionUtils } from '@app/data/position/position.utils';
import { RxState } from '@rx-angular/state';
import { TripPage } from '@app/trip/trip/trip.page';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';
import { RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';
import { ExtractionType } from '@app/extraction/type/extraction-type.model';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
import { AppDataEntityEditor } from '@app/data/form/data-editor.class';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
let OperationPage = OperationPage_1 = class OperationPage extends AppDataEntityEditor {
    constructor(injector, dataService, options) {
        var _a;
        super(injector, Operation, dataService, Object.assign({ pathIdAttribute: 'operationId', tabCount: 3, i18nPrefix: 'TRIP.OPERATION.EDIT.', acquisitionLevel: AcquisitionLevelCodes.OPERATION }, options));
        this._forceMeasurementAsOptionalOnFieldMode = false;
        this.hasIndividualMeasures$ = this._state.select('hasIndividualMeasures');
        this.physicalGear$ = this._state.select('physicalGear');
        this.gearId$ = this._state.select('gearId');
        this.lastOperations$ = this._state.select('lastOperations');
        this.lastEndDate$ = this._state.select('lastEndDate');
        this.saveOptions = {};
        this.selectedSubTabIndex = 0;
        this.allowParentOperation = false;
        this.autoFillBatch = false;
        this.autoFillDatesFromTrip = false;
        this.displayAttributes = {};
        this.toolbarColor = 'primary';
        this.canDownload = false;
        // All second tabs components are disabled, by default (waiting PMFM measurements to decide that to show)
        this.showCatchTab = false;
        this.showSamplesTab = false;
        this.showBatchTables = false;
        this.showBatchTablesByProgram = true;
        this.showSampleTablesByProgram = false;
        this.isDuplicatedData = false;
        this._defaultIsParentOperation = true;
        this.tripService = injector.get(TripService);
        this.context = injector.get(TripContextService);
        this.modalCtrl = injector.get(ModalController);
        this.dateTimePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');
        this.displayAttributes.gear = this.settings.getFieldDisplayAttributes('gear');
        this.hotkeys = injector.get(Hotkeys);
        // Init defaults
        this.showLastOperations = this.settings.isUsageMode('FIELD');
        this.tripId = toInt(this.route.snapshot.params['tripId']);
        this.forceOptionalExcludedPmfmIds = [
            PmfmIds.SURVIVAL_SAMPLING_TYPE,
            PmfmIds.HAS_ACCIDENTAL_CATCHES,
            // Let the user save OP, even if not set
            //PmfmIds.HAS_INDIVIDUAL_MEASURES
        ];
        this._defaultIsParentOperation = this.route.snapshot.queryParams['type'] !== 'child';
        // Get paste flags from clipboard, if related to Operation
        const clipboard = (_a = this.context) === null || _a === void 0 ? void 0 : _a.clipboard;
        this.operationPasteFlags = toNumber(clipboard === null || clipboard === void 0 ? void 0 : clipboard.pasteFlags, 0);
        // Add shortcut
        if (!this.mobile) {
            this.registerSubscription(this.hotkeys
                .addShortcut({ keys: 'f1', description: 'COMMON.BTN_SHOW_HELP', preventDefault: true })
                .subscribe((event) => this.openHelpModal(event)));
            this.registerSubscription(this.hotkeys
                .addShortcut({ keys: 'control.+', description: 'COMMON.BTN_ADD', preventDefault: true })
                .pipe(filter((_) => !this.disabled && this.showFabButton))
                .subscribe((event) => this.onNewFabButtonClick(event)));
        }
        // Watch program, to configure tables from program properties
        this._state.connect('program', this._state.select('programLabel').pipe(filter(isNotNilOrBlank), switchMap((programLabel) => {
            var _a;
            // Try to load by context
            const contextualProgram = (_a = this.context) === null || _a === void 0 ? void 0 : _a.program;
            if ((contextualProgram === null || contextualProgram === void 0 ? void 0 : contextualProgram.label) === programLabel) {
                return of(contextualProgram);
            }
            // Load by service
            return this.programRefService.watchByLabel(programLabel, { debug: this.debug });
        })));
        // Apply program
        this._state.hold(this._state.select('program'), (program) => {
            // Update the context (to avoid a reload, when opening the another operation)
            if (this.context && this.context.program !== program) {
                this.context.setValue('program', program);
            }
            return this.setProgram(program);
        });
        // Watch trip
        this._state.connect('lastOperations', this._state.select('tripId').pipe(
        // Only if tripId changes
        filter((tripId) => isNotNil(tripId) && this._lastOperationsTripId !== tripId), 
        // Update default back Href
        tap((tripId) => {
            this._lastOperationsTripId = tripId; // Remember new trip id
            // Update back href
            const tripHref = `/trips/${tripId}?tab=${TripPage.TABS.OPERATIONS}`;
            if (this.defaultBackHref !== tripHref) {
                this.defaultBackHref = tripHref;
                this.markForCheck();
            }
        }), 
        // Load last operations (if enabled)
        //filter(_ => this.showLastOperations),
        filter(isNotNil), 
        //debounceTime(500),
        switchMap((tripId) => this.dataService.watchAll(0, 5, 'startDateTime', 'desc', { tripId }, {
            withBatchTree: false,
            withSamples: false,
            computeRankOrder: false,
            withTotal: true,
            fetchPolicy: 'cache-and-network',
        })), map((res) => (res && res.data) || [])));
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    get form() {
        return this.opeForm.form;
    }
    get showFabButton() {
        if (!this._enabled)
            return false;
        switch (this._selectedTabIndex) {
            case OperationPage_1.TABS.CATCH:
                return this.showBatchTables;
            case OperationPage_1.TABS.SAMPLE:
                return this.showSamplesTab;
            default:
                return false;
        }
    }
    get forceMeasurementAsOptional() {
        return this._forceMeasurementAsOptionalOnFieldMode && this.isOnFieldMode;
    }
    /**
     * Allow to override function from OperationService, by passing the trip into options
     */
    get entityQualityService() {
        return this;
    }
    get canDuplicate() {
        return this.operationPasteFlags !== 0;
    }
    get physicalGear() {
        return this._state.get('physicalGear');
    }
    set physicalGear(value) {
        this._state.set('physicalGear', () => value);
    }
    get tripId() {
        return this._state.get('tripId');
    }
    set tripId(value) {
        this._state.set('tripId', () => value);
    }
    get lastEndDate() {
        return this._state.get('lastEndDate');
    }
    set lastEndDate(value) {
        this._state.set('lastEndDate', () => value);
    }
    // TODO Hide lastOperation on to small screen
    /*@HostListener('window:resize', ['$event'])
    onResize(event?: Event) {
      this.showLastOperations = window.innerWidth < ; // XS screen
      console.debug('[menu] Screen size (px): ' + this._screenWidth);
    }*/
    saveAndControl(event, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event === null || event === void 0 ? void 0 : event.defaultPrevented)
                return false; // Skip
            event === null || event === void 0 ? void 0 : event.preventDefault(); // Avoid propagation to <ion-item>
            // Avoid reloading while saving or still loading
            yield this.waitIdle();
            const saved = (this.mobile || this.isOnFieldMode) && this.dirty && this.valid
                ? // If on field mode AND valid: save silently
                    yield this.save(event, { openTabIndex: -1 })
                : // Else If desktop mode: ask before save
                    yield this.saveIfDirtyAndConfirm(null, { openTabIndex: -1 });
            if (!saved)
                return; // not saved
            // Control (using a clone)
            const data = this.data.clone();
            const errors = yield this.control(data);
            const valid = isNil(errors);
            if (!valid) {
                // Force the desktop mode (to enable strict validation)
                this.usageMode = 'DESK';
                // Load data with error (e.g. quality flags)
                yield this.updateView(data, opts);
                errors.message = errors.message || 'COMMON.FORM.HAS_ERROR';
                this.setError(errors, opts);
                this.markAllAsTouched(opts);
                this.scrollToTop();
            }
            else {
                // Clean previous error
                this.resetError(opts);
                yield this.updateView(data);
            }
        });
    }
    control(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const errors = yield this.service.control(data, Object.assign(Object.assign({}, opts), { trip: this.trip }));
            if (errors) {
                const pmfms = yield firstNotNilPromise(this.measurementsForm.pmfms$, { stop: this.destroySubject });
                const errorMessage = this.errorTranslator.translateErrors(errors, {
                    controlPathTranslator: {
                        translateControlPath: (path) => this.service.translateControlPath(path, {
                            i18nPrefix: this.i18nContext.prefix,
                            pmfms,
                        }),
                    },
                });
                return {
                    details: {
                        errors,
                        message: errorMessage,
                    },
                };
            }
            // Show success toast
            if (!opts || opts.emitEvent !== false) {
                yield this.showToast({ message: 'TRIP.OPERATION.INFO.CONTROL_SUCCEED', type: 'info' });
            }
            return; // No errors
        });
    }
    translateControlPath(controlPath) {
        return this.dataService.translateControlPath(controlPath, { i18nPrefix: this.i18nContext.prefix, pmfms: this.measurementsForm.pmfms });
    }
    canUserWrite(data, opts) {
        var _a;
        return (isNil((_a = this.trip) === null || _a === void 0 ? void 0 : _a.validationDate) &&
            this.dataService.canUserWrite(data, Object.assign(Object.assign({}, opts), { trip: this.trip, program: this.program })));
    }
    qualify(data, qualityFlagId) {
        return this.dataService.qualify(data, qualityFlagId);
    }
    openHelpModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event)
                event.preventDefault();
            if (!this.helpUrl)
                return;
            console.debug(`[operation-page] Open help page {${this.helpUrl}}...`);
            const modal = yield this.modalCtrl.create({
                component: AppHelpModal,
                componentProps: {
                    title: this.translate.instant('COMMON.HELP.TITLE'),
                    markdownUrl: this.helpUrl,
                },
                backdropDismiss: true,
            });
            return modal.present();
        });
    }
    ngOnInit() {
        super.ngOnInit();
        // Update the data context
        this.registerSubscription(merge(this.selectedTabIndexChange.pipe(filter((tabIndex) => tabIndex === OperationPage_1.TABS.CATCH && this.showBatchTables)), from(this.ready()))
            .pipe(debounceTime(500), throttleTime(500))
            .subscribe((_) => this.updateDataContext()));
        // Get physical gear by form
        this._state.connect('physicalGear', this.opeForm.physicalGearControl.valueChanges.pipe(
        // skip if loading (when opening an existing operation, physicalGear will be set inside onEntityLoaded() )
        filter((_) => !this.loading)));
        this._state.connect('gearId', this.physicalGear$, (_, physicalGear) => { var _a; return toNumber((_a = physicalGear === null || physicalGear === void 0 ? void 0 : physicalGear.gear) === null || _a === void 0 ? void 0 : _a.id, null); });
        this._state.hold(this.gearId$.pipe(filter((gearId) => isNotNil(gearId) && this.loaded), debounceTime(450)), () => this.markForCheck());
    }
    ngAfterViewInit() {
        super.ngAfterViewInit();
        if (this.measurementsForm) {
            this.registerSubscription(this.measurementsForm.pmfms$
                .pipe(filter(isNotNil), mergeMap((_) => this.measurementsForm.ready$), filter((ready) => ready === true))
                .subscribe((_) => this.onMeasurementsFormReady()));
        }
        const queryParams = this.route.snapshot.queryParams;
        // Manage tab group
        {
            this.selectedSubTabIndex = (queryParams['subtab'] && parseInt(queryParams['subtab'])) || 0;
        }
        // Manage toolbar color
        if (isNotNilOrBlank(queryParams['color'])) {
            this.toolbarColor = queryParams['color'];
        }
    }
    /**
     * Configure specific behavior
     */
    onMeasurementsFormReady() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            // Wait program to be loaded
            //await this.ready();
            // DEBUG
            console.debug('[operation-page] Measurement form is ready');
            // Clean existing subscription (e.g. when acquisition level change, this function can= be called many times)
            (_a = this._measurementSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
            this._measurementSubscription = new Subscription();
            const formGroup = this.measurementsForm.form;
            let defaultTableStates = true;
            // If PMFM "Sampling type" exists (e.g. SUMARiS), then use to enable/disable some tables
            const samplingTypeControl = formGroup === null || formGroup === void 0 ? void 0 : formGroup.controls[PmfmIds.SURVIVAL_SAMPLING_TYPE];
            if (isNotNil(samplingTypeControl) && this.batchTree) {
                defaultTableStates = false;
                this.showCatchTab = (_b = this.batchTree) === null || _b === void 0 ? void 0 : _b.showCatchForm;
                this._measurementSubscription.add(samplingTypeControl.valueChanges
                    .pipe(debounceTime(400), startWith(samplingTypeControl.value), filter(ReferentialUtils.isNotEmpty), map((qv) => qv.label), distinctUntilChanged())
                    .subscribe((qvLabel) => {
                    var _a;
                    switch (qvLabel) {
                        case QualitativeLabels.SURVIVAL_SAMPLING_TYPE.SURVIVAL:
                            if (this.debug)
                                console.debug('[operation] Enable samples tables');
                            this.showBatchTablesByProgram = false;
                            this.showSampleTablesByProgram = true;
                            break;
                        case QualitativeLabels.SURVIVAL_SAMPLING_TYPE.CATCH_HAUL:
                            if (this.debug)
                                console.debug('[operation] Enable batches tables');
                            this.showBatchTablesByProgram = true;
                            this.showSampleTablesByProgram = false;
                            break;
                        case QualitativeLabels.SURVIVAL_SAMPLING_TYPE.UNSAMPLED:
                            if (this.debug)
                                console.debug('[operation] Disable samples and batches tables');
                            this.showBatchTablesByProgram = false;
                            this.showSampleTablesByProgram = false;
                    }
                    this.showBatchTables = this.showBatchTablesByProgram;
                    this.showCatchTab = this.showBatchTables || ((_a = this.batchTree) === null || _a === void 0 ? void 0 : _a.showCatchForm) || false;
                    this.showSamplesTab = this.showSampleTablesByProgram;
                    this.tabCount = this.showSamplesTab ? 3 : this.showCatchTab ? 2 : 1;
                    // Force first sub tab index, if modification was done from the form
                    // This condition avoid to change subtab, when reloading the page
                    if (this.selectedTabIndex === OperationPage_1.TABS.GENERAL) {
                        this.selectedSubTabIndex = 0;
                    }
                    this.updateTablesState();
                    this.markForCheck();
                }));
            }
            // If PMFM "Has accidental catches ?" exists, then use to enable/disable sample tables
            const hasAccidentalCatchesControl = formGroup === null || formGroup === void 0 ? void 0 : formGroup.controls[PmfmIds.HAS_ACCIDENTAL_CATCHES];
            if (isNotNil(hasAccidentalCatchesControl)) {
                defaultTableStates = true; // Applying defaults (because will not manage the catch)
                hasAccidentalCatchesControl.setValidators(Validators.required);
                this._measurementSubscription.add(hasAccidentalCatchesControl.valueChanges
                    .pipe(debounceTime(400), startWith(hasAccidentalCatchesControl.value), filter(isNotNil), distinctUntilChanged())
                    .subscribe((hasAccidentalCatches) => {
                    var _a;
                    if (this.debug)
                        console.debug('[operation] Enable/Disable samples table, because HAS_ACCIDENTAL_CATCHES=' + hasAccidentalCatches);
                    // Enable samples, when has accidental catches
                    this.showSampleTablesByProgram = hasAccidentalCatches;
                    this.showSamplesTab = this.showSampleTablesByProgram;
                    this.showCatchTab = this.showBatchTables || ((_a = this.batchTree) === null || _a === void 0 ? void 0 : _a.showCatchForm) || false;
                    this.tabCount = this.showSamplesTab ? 3 : this.showCatchTab ? 2 : 1;
                    // Force first tab index
                    if (this.selectedTabIndex === OperationPage_1.TABS.GENERAL) {
                        this.selectedSubTabIndex = 0;
                    }
                    this.updateTablesState();
                    this.markForCheck();
                }));
            }
            if (this.allowParentOperation) {
                defaultTableStates = false;
                this._measurementSubscription.add(this.opeForm.parentChanges
                    .pipe(startWith(this.opeForm.parentControl.value), map((parent) => !!parent), // Convert to boolean
                distinctUntilChanged())
                    .subscribe((hasParent) => __awaiter(this, void 0, void 0, function* () {
                    var _d;
                    let acquisitionLevel;
                    if (hasParent) {
                        if (this.debug)
                            console.debug('[operation] Enable batch tables');
                        this.showBatchTables = this.showBatchTablesByProgram;
                        this.showCatchTab = this.showBatchTables || ((_d = this.batchTree) === null || _d === void 0 ? void 0 : _d.showCatchForm) || false;
                        this.showSamplesTab = this.showSampleTablesByProgram;
                        this.tabCount = this.showSamplesTab ? 3 : this.showCatchTab ? 2 : 1;
                        acquisitionLevel = AcquisitionLevelCodes.CHILD_OPERATION;
                    }
                    else {
                        if (this.debug)
                            console.debug('[operation] Disable batch tables');
                        this.showBatchTables = false;
                        this.showSamplesTab = false;
                        this.showCatchTab = false;
                        this.tabCount = 1;
                        acquisitionLevel = AcquisitionLevelCodes.OPERATION;
                    }
                    // Propagate acquisition level
                    this.acquisitionLevel = acquisitionLevel;
                    // Force first tab index
                    if (this.selectedTabIndex === OperationPage_1.TABS.GENERAL) {
                        this.selectedSubTabIndex = 0;
                    }
                    // Auto fill batches (if new data)
                    if (this.showBatchTables && this.autoFillBatch && this.batchTree && this.isNewData) {
                        yield this.batchTree.autoFill({ skipIfDisabled: false, skipIfNotEmpty: true });
                    }
                    this.updateTablesState();
                    this.markForCheck();
                })));
            }
            const hasIndividualMeasuresControl = formGroup === null || formGroup === void 0 ? void 0 : formGroup.controls[PmfmIds.HAS_INDIVIDUAL_MEASURES];
            if (isNotNil(hasIndividualMeasuresControl) && this.batchTree) {
                this._measurementSubscription.add(hasIndividualMeasuresControl.valueChanges
                    .pipe(startWith(hasIndividualMeasuresControl.value), filter(isNotNil))
                    .subscribe((value) => this._state.set('hasIndividualMeasures', (_) => value)));
                this._measurementSubscription.add(this.hasIndividualMeasures$.subscribe((value) => {
                    // Will be done by the template
                    this.batchTree.allowSpeciesSampling = value;
                    this.batchTree.defaultHasSubBatches = value;
                    this.batchTree.allowSubBatches = value;
                    // Hide button to toggle hasSubBatches (yes/no) when value if forced
                    this.batchTree.setModalOption('showHasSubBatchesButton', !value);
                    if (!this.allowParentOperation) {
                        this.showCatchTab = this.showBatchTables || this.batchTree.showCatchForm;
                        this.tabCount = 1 + (this.showCatchTab ? 1 : 0) + (this.showSamplesTab ? 1 : 0);
                    }
                    this.updateTablesState();
                }));
            }
            else {
                this._state.set('hasIndividualMeasures', (_) => true);
            }
            // Show default tables state
            if (defaultTableStates) {
                if (this.debug)
                    console.debug('[operation] Enable default tables (Nor SUMARiS nor ADAP pmfms were found)');
                this.showBatchTables = this.showBatchTablesByProgram;
                this.showCatchTab = this.showBatchTables || ((_c = this.batchTree) === null || _c === void 0 ? void 0 : _c.showCatchForm) || false;
                this.showSamplesTab = this.showSampleTablesByProgram;
                this.tabCount = this.showSamplesTab ? 3 : this.showCatchTab ? 2 : 1;
                this.updateTablesState();
                this.markForCheck();
                // Auto fill batches (if new data)
                if (this.showBatchTables && this.autoFillBatch && this.batchTree && this.isNewData) {
                    this.batchTree.autoFill({ skipIfDisabled: false, skipIfNotEmpty: true });
                }
            }
            // Anormal trip => Change comments as required
            const tripProgressControl = formGroup === null || formGroup === void 0 ? void 0 : formGroup.controls[PmfmIds.TRIP_PROGRESS];
            if (isNotNil(tripProgressControl)) {
                this._measurementSubscription.add(tripProgressControl.valueChanges
                    .pipe(debounceTime(400), startWith(tripProgressControl.value), filter(isNotNilOrBlank), distinctUntilChanged())
                    .subscribe((normalProgress) => {
                    if (!normalProgress)
                        console.debug('[operation] abnormal progress: force comment as required');
                    this.opeForm.requiredComment = !normalProgress;
                    this.markForCheck();
                }));
            }
        });
    }
    ngOnDestroy() {
        var _a, _b;
        super.ngOnDestroy();
        (_a = this._measurementSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        (_b = this._sampleRowSubscription) === null || _b === void 0 ? void 0 : _b.unsubscribe();
    }
    setProgram(program) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!program)
                return; // Skip
            if (this.debug)
                console.debug(`[operation] Program ${program.label} loaded, with properties: `, program.properties);
            let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
            this.i18nContext.suffix = i18nSuffix;
            this.allowParentOperation = program.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION);
            this.autoFillBatch = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_AUTO_FILL);
            this.autoFillDatesFromTrip = program.getPropertyAsBoolean(ProgramProperties.TRIP_APPLY_DATE_ON_NEW_OPERATION);
            this._forceMeasurementAsOptionalOnFieldMode = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE);
            const isGPSUsed = toBoolean(MeasurementUtils.asBooleanValue((_a = this.trip) === null || _a === void 0 ? void 0 : _a.measurements, PmfmIds.GPS_USED), true);
            const enablePosition = isGPSUsed && program.getPropertyAsBoolean(ProgramProperties.TRIP_POSITION_ENABLE);
            this.opeForm.trip = this.trip;
            this.opeForm.showPosition = enablePosition;
            this.opeForm.boundingBox = enablePosition && Geometries.parseAsBBox(program.getProperty(ProgramProperties.TRIP_POSITION_BOUNDING_BOX));
            // TODO: make possible to have both showPosition and showFishingArea at true (ex SFA artisanal logbook program)
            this.opeForm.showFishingArea = !enablePosition; // Trip has gps in use, so active positions controls else active fishing area control
            this.opeForm.fishingAreaLocationLevelIds = program.getPropertyAsNumbers(ProgramProperties.TRIP_OPERATION_FISHING_AREA_LOCATION_LEVEL_IDS);
            const defaultLatitudeSign = program.getProperty(ProgramProperties.TRIP_LATITUDE_SIGN);
            const defaultLongitudeSign = program.getProperty(ProgramProperties.TRIP_LONGITUDE_SIGN);
            this.opeForm.defaultLatitudeSign = defaultLatitudeSign;
            this.opeForm.defaultLongitudeSign = defaultLongitudeSign;
            this.opeForm.metierTaxonGroupTypeIds = program.getPropertyAsNumbers(ProgramProperties.TRIP_OPERATION_METIER_TAXON_GROUP_TYPE_IDS);
            this.opeForm.maxDistanceWarning = program.getPropertyAsInt(ProgramProperties.TRIP_DISTANCE_MAX_WARNING);
            this.opeForm.maxDistanceError = program.getPropertyAsInt(ProgramProperties.TRIP_DISTANCE_MAX_ERROR);
            this.opeForm.allowParentOperation = this.allowParentOperation;
            this.opeForm.startProgram = program.creationDate;
            this.opeForm.showMetier = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_METIER_ENABLE);
            this.opeForm.showMetierFilter = this.opeForm.showMetier && program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_METIER_FILTER);
            this.opeForm.programLabel = program.label;
            this.opeForm.fishingStartDateTimeEnable = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE);
            this.opeForm.fishingEndDateTimeEnable = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE);
            this.opeForm.endDateTimeEnable = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE);
            this.opeForm.maxShootingDurationInHours = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_SHOOTING_DURATION_HOURS);
            this.opeForm.maxTotalDurationInHours = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_MAX_TOTAL_DURATION_HOURS);
            this.opeForm.defaultIsParentOperation = this._defaultIsParentOperation;
            this.operationPasteFlags = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_PASTE_FLAGS);
            if (this.debug && this.operationPasteFlags !== 0) {
                console.debug(`[operation-page] Enable duplication with paste flags: ${flagsToString(this.operationPasteFlags, OperationPasteFlags)}`);
            }
            this.helpUrl = program.getProperty(ProgramProperties.TRIP_OPERATION_HELP_URL) || program.getProperty(ProgramProperties.TRIP_HELP_URL);
            this.measurementsForm.i18nSuffix = i18nSuffix;
            this.measurementsForm.forceOptional = this.forceMeasurementAsOptional;
            this.measurementsForm.maxVisibleButtons = program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS);
            this.measurementsForm.maxItemCountForButtons = program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS);
            this.saveOptions.computeBatchRankOrder = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_RANK_ORDER_COMPUTE);
            this.saveOptions.computeBatchIndividualCount =
                !this.mobile && program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_INDIVIDUAL_COUNT_COMPUTE);
            this.saveOptions.computeBatchWeight = !this.mobile && program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_LENGTH_WEIGHT_CONVERSION_ENABLE);
            // NOT need here, while 'updateLinkedOperation' is forced in save()
            //this.saveOptions.updateLinkedOperation = this.allowParentOperation;
            this.showBatchTablesByProgram = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_ENABLE);
            this.showSampleTablesByProgram = program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_ENABLE);
            if (!this.allowParentOperation) {
                this.acquisitionLevel = AcquisitionLevelCodes.OPERATION;
            }
            // When route ask for a child operation
            else if (!this._defaultIsParentOperation) {
                this.acquisitionLevel = AcquisitionLevelCodes.CHILD_OPERATION;
            }
            if (this.batchTree)
                this.batchTree.program = program;
            if (this.sampleTree)
                this.sampleTree.program = program;
            // Load available taxon groups (e.g. with taxon groups found in strategies)
            yield this.initAvailableTaxonGroups(program.label);
            this.markAsReady();
        });
    }
    load(id, opts) {
        return super.load(id, Object.assign(Object.assign({}, opts), { withLinkedOperation: true }));
    }
    onNewEntity(data, options) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const tripId = options && isNotNil(options.tripId) ? +options.tripId : isNotNil(this.trip && this.trip.id) ? this.trip.id : data && data.tripId;
            if (isNil(tripId))
                throw new Error("Missing argument 'options.tripId'!");
            data.tripId = tripId;
            // Load parent trip
            const trip = yield this.loadTrip(tripId);
            // Use the default gear, if only one
            if (trip && trip.gears && trip.gears.length === 1) {
                data.physicalGear = trip.gears[0];
            }
            // Copy some trip's properties (need by filter)
            data.programLabel = (_a = trip.program) === null || _a === void 0 ? void 0 : _a.label;
            data.vesselId = (_b = trip.vesselSnapshot) === null || _b === void 0 ? void 0 : _b.id;
            // Paste clipboard, if not already a duplicated operation
            const clipboard = (_c = this.context) === null || _c === void 0 ? void 0 : _c.clipboard;
            if (OperationUtils.isOperation(clipboard === null || clipboard === void 0 ? void 0 : clipboard.data)) {
                // Do NOT copy dates, when in the on field mode (will be filled later)
                if (this.isOnFieldMode) {
                    data.paste(clipboard === null || clipboard === void 0 ? void 0 : clipboard.data, removeFlag(this.operationPasteFlags, OperationPasteFlags.DATE));
                }
                else {
                    data.paste(clipboard === null || clipboard === void 0 ? void 0 : clipboard.data, this.operationPasteFlags);
                }
                // Reset clipboard
                (_d = this.context) === null || _d === void 0 ? void 0 : _d.setValue('clipboard', {
                    data: null,
                    pasteFlags: this.operationPasteFlags, // Keep flags
                });
                this.isDuplicatedData = true;
            }
            // If is on field mode, then fill default values
            if (this.isOnFieldMode) {
                data.startDateTime = DateUtils.moment();
                if (!this.isDuplicatedData) {
                    // Wait last operations to be loaded
                    const previousOperations = yield firstNotNilPromise(this.lastOperations$, { stop: this.destroySubject });
                    // Copy from previous operation only if is not a duplicated operation
                    const previousOperation = (previousOperations || []).find((ope) => ope && ope !== data && ReferentialUtils.isNotEmpty(ope.metier));
                    if (previousOperation) {
                        data.physicalGear = (trip.gears || []).find((g) => EntityUtils.equals(g, previousOperation.physicalGear, 'id')) || data.physicalGear;
                        data.metier = previousOperation.metier;
                        data.rankOrder = previousOperation.rankOrder + 1;
                    }
                    else {
                        data.rankOrder = 1;
                    }
                }
            }
            // Propagate program
            if (data.programLabel)
                this.programLabel = data.programLabel;
            // Propagate physical gear
            if (data.physicalGear)
                this.physicalGear = data.physicalGear;
            this.opeForm.showComment = !this.mobile;
        });
    }
    onEntityLoaded(data, options) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const tripId = options && isNotNil(options.tripId) ? +options.tripId : isNotNil(this.trip && this.trip.id) ? this.trip.id : data && data.tripId;
            if (isNil(tripId))
                throw new Error("Missing argument 'options.tripId'!");
            data.tripId = tripId;
            const trip = yield this.loadTrip(tripId);
            // Replace physical gear by the real entity
            data.physicalGear = (trip.gears || []).find((g) => EntityUtils.equals(g, data.physicalGear, 'id')) || data.physicalGear;
            data.programLabel = (_a = trip.program) === null || _a === void 0 ? void 0 : _a.label;
            data.vesselId = (_b = trip.vesselSnapshot) === null || _b === void 0 ? void 0 : _b.id;
            yield this.loadLinkedOperation(data);
            // Propagate program
            if (data.programLabel)
                this.programLabel = data.programLabel;
            // Propagate physical gear
            if (data.physicalGear)
                this.physicalGear = data.physicalGear;
            this.opeForm.showComment = !this.mobile || isNotNilOrBlank(data.comments);
            this.canDownload = !this.mobile && EntityUtils.isRemoteId(data === null || data === void 0 ? void 0 : data.id);
        });
    }
    onNewFabButtonClick(event) {
        switch (this.selectedTabIndex) {
            case OperationPage_1.TABS.CATCH:
                if (this.showBatchTables && this.batchTree)
                    this.batchTree.addRow(event);
                break;
            case OperationPage_1.TABS.SAMPLE:
                if (this.showSamplesTab && this.sampleTree)
                    this.sampleTree.addRow(event);
                break;
        }
    }
    /**
     * Compute the title
     *
     * @param data
     * @param opts
     */
    computeTitle(data, opts) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            // Trip exists
            const titlePrefix = ((!opts || opts.withPrefix !== false) &&
                this.trip &&
                (yield this.translate
                    .get('TRIP.OPERATION.TITLE_PREFIX', {
                    vessel: (this.trip && this.trip.vesselSnapshot && (this.trip.vesselSnapshot.exteriorMarking || this.trip.vesselSnapshot.name)) || '',
                    departureDateTime: (this.trip && this.trip.departureDateTime && this.dateFormat.transform(this.trip.departureDateTime)) || '',
                })
                    .toPromise())) ||
                '';
            // new ope
            if (!data || isNil(data.id)) {
                return titlePrefix + (yield this.translate.get('TRIP.OPERATION.NEW.TITLE').toPromise());
            }
            // Select the date to use for title
            let titleDateTime = data.startDateTime || data.fishingStartDateTime;
            if (OperationUtils.hasParentOperation(data)) {
                titleDateTime = DateUtils.min(fromDateISOString(data.endDateTime), fromDateISOString(data.fishingEndDateTime)) || titleDateTime;
            }
            // Format date:
            // - if mobile: display time only if today
            const startDateTime = titleDateTime &&
                (this.mobile && DateUtils.moment().isSame(titleDateTime, 'day')
                    ? this.dateFormat.transform(titleDateTime, { pattern: 'HH:mm' })
                    : this.dateFormat.transform(titleDateTime, { time: true }));
            // Get rankOrder from context, or compute it (if NOT mobile to avoid additional processing time)
            let rankOrder = !this.mobile && ((_b = (_a = this.context) === null || _a === void 0 ? void 0 : _a.operation) === null || _b === void 0 ? void 0 : _b.rankOrder);
            if (isNil(rankOrder) && !this.mobile) {
                // Compute the rankOrder
                const now = this.debug && Date.now();
                if (this.debug)
                    console.debug('[operation-page] Computing rankOrder...');
                rankOrder = yield this.service.computeRankOrder(data, { fetchPolicy: 'cache-first' });
                if (this.debug)
                    console.debug(`[operation-page] Computing rankOrder [OK] #${rankOrder} - in ${Date.now() - now}ms`);
                // Update data, and form
                data.rankOrder = rankOrder;
                (_c = this.opeForm) === null || _c === void 0 ? void 0 : _c.form.patchValue({ rankOrder }, { emitEvent: false });
            }
            if (rankOrder) {
                return (titlePrefix + (yield this.translate.get('TRIP.OPERATION.EDIT.TITLE', { startDateTime, rankOrder }).toPromise()));
            }
            // No rankOrder (e.g. if mobile)
            else {
                return (titlePrefix + (yield this.translate.get('TRIP.OPERATION.EDIT.TITLE_NO_RANK', { startDateTime }).toPromise()));
            }
        });
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (this.mobile)
                return; // Skip if mobile
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { icon: 'navigate' });
        });
    }
    onTabChange(event, queryParamName) {
        const changed = super.onTabChange(event, queryParamName);
        if (changed) {
            switch (this.selectedTabIndex) {
                case OperationPage_1.TABS.CATCH:
                    if (this.showBatchTables && this.batchTree)
                        this.batchTree.realignInkBar();
                    this.markForCheck();
                    break;
                case OperationPage_1.TABS.SAMPLE:
                    if (this.showSamplesTab && this.sampleTree)
                        this.sampleTree.realignInkBar();
                    this.markForCheck();
                    break;
            }
        }
        return changed;
    }
    waitIdle(opts) {
        return AppFormUtils.waitIdle(this, opts);
    }
    onLastOperationClick(event, id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event === null || event === void 0 ? void 0 : event.defaultPrevented)
                return; // Skip
            if (isNil(id) || this.data.id === id)
                return; // skip
            // Avoid reloading while saving or still loading
            yield this.waitIdle();
            const saved = (this.mobile || this.isOnFieldMode) && (!this.dirty || this.valid)
                ? // If on field mode: try to save silently
                    yield this.save(event, { openTabIndex: -1 })
                : // If desktop mode: ask before save
                    yield this.saveIfDirtyAndConfirm(null, { openTabIndex: -1 });
            if (!saved)
                return; // Skip
            return this.navigateTo(+id);
        });
    }
    saveAndNew(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event === null || event === void 0 ? void 0 : event.defaultPrevented)
                return false; // Skip
            event === null || event === void 0 ? void 0 : event.preventDefault(); // Avoid propagation to <ion-item>
            // Avoid reloading while saving or still loading
            yield this.waitIdle();
            const saved = (this.mobile || this.isOnFieldMode) && (!this.dirty || this.valid)
                ? // If on field mode AND valid: save silently
                    yield this.save(event, { openTabIndex: -1 })
                : // Else If desktop mode: ask before save
                    yield this.saveIfDirtyAndConfirm(null, { openTabIndex: -1 });
            if (!saved)
                return; // not saved
            // Redirect to /new
            return yield this.navigateTo('new');
        });
    }
    duplicate(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((event === null || event === void 0 ? void 0 : event.defaultPrevented) || !this.context)
                return; // Skip
            event === null || event === void 0 ? void 0 : event.preventDefault(); // Avoid propagation to <ion-item>
            // Avoid reloading while saving or still loading
            yield this.waitIdle();
            const saved = (this.mobile || this.isOnFieldMode) && this.dirty && this.valid
                ? // If on field mode AND valid: save silently
                    yield this.save(event, { openTabIndex: -1 })
                : // Else If desktop mode: ask before save
                    yield this.saveIfDirtyAndConfirm(null, { openTabIndex: -1 });
            if (!saved)
                return; // User cancelled, or cannot saved => skip
            // Fill context's clipboard
            this.context.setValue('clipboard', {
                data: this.data,
                pasteFlags: this.operationPasteFlags,
            });
            // Open new operation
            return this.navigateTo('new');
        });
    }
    setValue(data) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const isNewData = isNil(data === null || data === void 0 ? void 0 : data.id);
                const jobs = [this.opeForm.setValue(data)];
                // Get gear, from the physical gear
                const gearId = toNumber((_b = (_a = data === null || data === void 0 ? void 0 : data.physicalGear) === null || _a === void 0 ? void 0 : _a.gear) === null || _b === void 0 ? void 0 : _b.id, null);
                // Set measurements form
                this.measurementsForm.gearId = gearId;
                this.measurementsForm.programLabel = this.programLabel;
                const isChildOperation = data.parentOperation || isNotNil(data.parentOperationId) || !this._defaultIsParentOperation;
                const acquisitionLevel = isChildOperation ? AcquisitionLevelCodes.CHILD_OPERATION : AcquisitionLevelCodes.OPERATION;
                // Propagate acquisition level, if changed
                if (this.acquisitionLevel !== acquisitionLevel) {
                    this.measurementsForm.unload();
                    this.measurementsForm.acquisitionLevel = acquisitionLevel;
                    this.measurementsForm.markAsReady();
                    this.acquisitionLevel = acquisitionLevel;
                }
                jobs.push(this.measurementsForm.setValue((data && data.measurements) || []));
                // Set batch tree
                if (this.batchTree) {
                    //this.batchTree.programLabel = this.programLabel;
                    this.batchTree.physicalGear = data.physicalGear;
                    this.batchTree.gearId = gearId;
                    jobs.push(this.batchTree.setValue((data && data.catchBatch) || null));
                }
                // Set sample tree
                if (this.sampleTree)
                    jobs.push(this.sampleTree.setValue((data && data.samples) || []));
                yield Promise.all(jobs);
                console.debug('[operation] setValue() [OK]');
                // If new data, auto fill the table
                if (isNewData) {
                    if (this.autoFillDatesFromTrip && !this.isDuplicatedData)
                        this.opeForm.fillWithTripDates();
                }
            }
            catch (err) {
                const error = (err === null || err === void 0 ? void 0 : err.message) || err;
                console.debug('[operation] Error during setValue(): ' + error, err);
                this.setError(error);
            }
        });
    }
    cancel(event) {
        // Avoid to reload/unload if page destroyed
        timer(500)
            .pipe(takeUntil(this.destroySubject))
            .subscribe(() => super.cancel(event));
        // nothing
        return Promise.resolve();
    }
    unload() {
        return super.unload();
    }
    updateViewState(data, opts) {
        super.updateViewState(data, opts);
        // Display form error, if has errors from context, applies it on form.
        const errorMessage = this.enabled && this.usageMode === 'DESK' && isNil(data.controlDate) ? data.qualificationComments : undefined;
        if (isNotNilOrBlank(errorMessage)) {
            console.info('[operation-page] Restore error from qualificationComments : ', errorMessage);
            // Clean error
            this.form.get('qualificationComments').reset();
            setTimeout(() => {
                var _a, _b;
                this.markAllAsTouched();
                this.form.updateValueAndValidity();
                const error = { details: { message: errorMessage } };
                if (isNil((_a = data.catchBatch) === null || _a === void 0 ? void 0 : _a.controlDate) && ((_b = data.catchBatch) === null || _b === void 0 ? void 0 : _b.qualificationComments)) {
                    error.details.errors = { catch: { invalidOrIncomplete: true } };
                }
                this.setError(Object.assign({ message: 'COMMON.FORM.HAS_ERROR' }, error), { detailsCssClass: 'error-details' });
            });
        }
    }
    save(event, opts) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading || this.saving) {
                console.debug('[data-editor] Skip save: editor is busy (loading or saving)');
                return false;
            }
            if (!this.dirty) {
                console.debug('[data-editor] Skip save: editor not dirty');
                return true;
            }
            // Workaround to avoid the option menu to be selected
            if (this.mobile)
                yield sleep(50);
            // Save new gear to the trip
            const physicalGear = yield this.getOrAddPhysicalGear({ emitEvent: false });
            if (!physicalGear) {
                this.markForCheck();
                return false; // Stop if failed
            }
            // Force to pass specific saved options to dataService.save()
            const saved = yield _super.save.call(this, event, Object.assign(Object.assign(Object.assign({}, this.saveOptions), { updateLinkedOperation: this.opeForm.isParentOperation || this.opeForm.isChildOperation }), opts));
            // Continue to mark as saving, to avoid option menu to open
            this.markAsSaving();
            try {
                // Display form error on top
                if (!saved) {
                    // DEBUG
                    console.debug('[operation] Computing form error...');
                    let error = '';
                    if (this.opeForm.invalid) {
                        error = this.opeForm.formError;
                    }
                    if (this.measurementsForm.invalid) {
                        error += (isNotNilOrBlank(error) ? ',' : '') + this.measurementsForm.formError;
                    }
                    this.setError(error);
                    this.scrollToTop();
                }
                else {
                    // Workaround, to make sure the editor is not dirty anymore
                    // => mark components as pristine
                    if (this.dirty) {
                        console.warn('[operation] FIXME: manually mark children to pristine, but it should be done by editor save()!');
                        (_a = this.batchTree) === null || _a === void 0 ? void 0 : _a.markAsPristine();
                        (_b = this.sampleTree) === null || _b === void 0 ? void 0 : _b.markAsPristine();
                    }
                    // Mark trip as dirty
                    if (RootDataEntityUtils.isReadyToSync(this.trip)) {
                        RootDataEntityUtils.markAsDirty(this.trip);
                        this.trip = yield this.tripService.save(this.trip);
                        // Update the context
                        this.context.setValue('trip', this.trip);
                    }
                }
                return saved;
            }
            finally {
                this.markAsSaved();
            }
        });
    }
    saveIfDirtyAndConfirm(event, opts) {
        const _super = Object.create(null, {
            saveIfDirtyAndConfirm: { get: () => super.saveIfDirtyAndConfirm }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return _super.saveIfDirtyAndConfirm.call(this, event, Object.assign(Object.assign({}, this.saveOptions), opts));
        });
    }
    getOrAddPhysicalGear(opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading || this.saving)
                return false;
            if (!this.dirty)
                return true; // Skip
            const physicalGear = this.opeForm.physicalGearControl.value;
            if (!physicalGear || isNotNil(physicalGear.id))
                return true; // Skip
            // DEBUG
            console.debug('[operation-page] Saving new physical gear...');
            this.markAsSaving();
            this.resetError();
            try {
                const savedPhysicalGear = yield this.tripService.getOrAddGear(this.trip.id, physicalGear);
                // Update form with the new gear
                this.opeForm.physicalGearControl.patchValue(savedPhysicalGear, { emitEvent: false });
                // Update the current trip object
                if (!((_a = this.trip.gears) === null || _a === void 0 ? void 0 : _a.some((g) => PhysicalGear.equals(g, savedPhysicalGear)))) {
                    this.trip.gears.push(savedPhysicalGear);
                }
                return true;
            }
            catch (err) {
                this.setError(err);
                return false;
            }
            finally {
                this.markAsSaved(opts);
            }
        });
    }
    onPrepareSampleForm(pmfmForm) {
        var _a;
        console.debug('[operation-page] Initializing sample form (validators...)');
        (_a = this._sampleRowSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        this._sampleRowSubscription = this.computeSampleRowValidator(pmfmForm);
    }
    markAsLoaded(opts) {
        var _a;
        super.markAsLoaded(opts);
        (_a = this.children) === null || _a === void 0 ? void 0 : _a.forEach((c) => c.markAsLoaded(opts));
    }
    setError(error, opts) {
        var _a, _b;
        // If errors in operations
        if (typeof error === 'object' && ((_b = (_a = error === null || error === void 0 ? void 0 : error.details) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b.catch)) {
            // Show error in batch tree
            this.batchTree.setError('ERROR.INVALID_OR_INCOMPLETE_FILL', {
            //showOnlyInvalidRows: true
            });
            // Open the operation tab
            this.tabGroup.selectedIndex = OperationPage_1.TABS.CATCH;
            // Reset other errors
            super.setError(undefined, opts);
        }
        else {
            super.setError(error, opts);
            // Reset batch tree error
            this.batchTree.resetError(opts);
        }
    }
    // change visibility to public
    resetError(opts) {
        this.setError(undefined, opts);
    }
    /* -- protected method -- */
    computeSampleRowValidator(pmfmForm) {
        return OperationValidators.addSampleValidators(pmfmForm);
    }
    loadTrip(tripId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Update trip id (will cause last operations to be watched, if need)
            this.tripId = +tripId;
            let trip = this.context.getValue('trip');
            // If not the expected trip: reload
            if ((trip === null || trip === void 0 ? void 0 : trip.id) !== tripId) {
                trip = yield this.tripService.load(tripId, { fullLoad: true });
                // Update the context
                this.context.setValue('trip', trip);
            }
            this.trip = trip;
            this.saveOptions.trip = trip;
            return trip;
        });
    }
    /**
     * Open the first tab that is invalid
     */
    getFirstInvalidTabIndex() {
        var _a, _b, _c, _d;
        // find invalids tabs (keep order)
        const invalidTabs = [
            this.opeForm.invalid || this.measurementsForm.invalid,
            (this.showCatchTab && ((_a = this.batchTree) === null || _a === void 0 ? void 0 : _a.invalid)) || false,
            (this.showSamplesTab && ((_b = this.sampleTree) === null || _b === void 0 ? void 0 : _b.invalid)) || false,
        ];
        // Open the first invalid tab
        const invalidTabIndex = invalidTabs.indexOf(true);
        // If catch tab, open the invalid sub tab
        if (invalidTabIndex === OperationPage_1.TABS.CATCH) {
            this.selectedSubTabIndex = (_c = this.batchTree) === null || _c === void 0 ? void 0 : _c.getFirstInvalidTabIndex();
            this.updateTablesState();
        }
        // If sample tab, open the invalid sub tab
        else if (invalidTabIndex === OperationPage_1.TABS.SAMPLE) {
            this.selectedSubTabIndex = (_d = this.sampleTree) === null || _d === void 0 ? void 0 : _d.getFirstInvalidTabIndex();
            this.updateTablesState();
        }
        return invalidTabIndex;
    }
    computeUsageMode(operation) {
        var _a;
        // Allow to override the usageMode, by context (e.g. when control a trip)
        const contextualUsageMode = (_a = this.context) === null || _a === void 0 ? void 0 : _a.getValue('usageMode');
        if (contextualUsageMode)
            return contextualUsageMode;
        // Read the settings
        return this.settings.isUsageMode('FIELD') &&
            (isNil(this.trip) ||
                (isNotNil(this.trip.departureDateTime) && fromDateISOString(this.trip.departureDateTime).diff(DateUtils.moment(), 'day') < 15))
            ? 'FIELD'
            : 'DESK';
    }
    registerForms() {
        // Register sub forms & table
        this.addChildForms([this.opeForm, this.measurementsForm, this.batchTree, this.sampleTree]);
    }
    waitWhilePending() {
        this.form.updateValueAndValidity();
        return super.waitWhilePending();
    }
    saveDirtyChildren() {
        return super.saveDirtyChildren();
    }
    getValue() {
        const _super = Object.create(null, {
            getValue: { get: () => super.getValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield _super.getValue.call(this);
            // Batches
            if (this.showCatchTab && this.batchTree) {
                // Do not need to save here, because editor should do it
                //await this.batchTree.save();
                // Get batch tree,rom the batch tree component
                data.catchBatch = this.batchTree.value;
                // Make sure to clean species groups, if not batch enable
                if (!this.showBatchTables) {
                    data.catchBatch.children = undefined;
                }
            }
            else {
                data.catchBatch = undefined;
            }
            // Samples
            if (this.showSamplesTab && this.sampleTree) {
                yield this.sampleTree.save();
                data.samples = this.sampleTree.value;
            }
            else {
                data.samples = undefined;
            }
            return data;
        });
    }
    getJsonValueToSave() {
        const json = this.opeForm.value;
        // Mark as not controlled (remove control date, etc.)
        // BUT keep qualityFlag (e.g. need to keep it when = NOT_COMPLETED - see below)
        DataEntityUtils.markAsNotControlled(json, { keepQualityFlag: true });
        // Make sure parent operation has quality flag
        if (this.allowParentOperation && EntityUtils.isEmpty(json.parentOperation, 'id') && DataEntityUtils.hasNoQualityFlag(json)) {
            console.warn('[operation-page] Parent operation does not have quality flag id. Changing to NOT_COMPLETED ');
            json.qualityFlagId = QualityFlagIds.NOT_COMPLETED;
            // Propage this change to the form
            this.opeForm.qualityFlagControl.patchValue(QualityFlagIds.NOT_COMPLETED, { emitEvent: false });
        }
        // Clean childOperation if empty
        if (EntityUtils.isEmpty(json.childOperation, 'id')) {
            delete json.childOperation;
        }
        json.measurements = this.measurementsForm.value;
        json.tripId = this.trip.id;
        return json;
    }
    initAvailableTaxonGroups(programLabel) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug('[operation] Setting available taxon groups...');
            // Load program's taxon groups
            let availableTaxonGroups = yield this.programRefService.loadTaxonGroups(programLabel);
            // Retrieve the trip measurements on SELF_SAMPLING_PROGRAM, if any
            const qvMeasurement = (this.trip.measurements || []).find((m) => m.pmfmId === PmfmIds.SELF_SAMPLING_PROGRAM);
            if (qvMeasurement && ReferentialUtils.isNotEmpty(qvMeasurement.qualitativeValue)) {
                // Retrieve QV from the program pmfm (because measurement's QV has only the 'id' attribute)
                const tripPmfms = yield this.programRefService.loadProgramPmfms(programLabel, { acquisitionLevel: AcquisitionLevelCodes.TRIP });
                const pmfm = (tripPmfms || []).find((p) => p.id === PmfmIds.SELF_SAMPLING_PROGRAM);
                const qualitativeValue = ((pmfm === null || pmfm === void 0 ? void 0 : pmfm.qualitativeValues) || []).find((qv) => qv.id === qvMeasurement.qualitativeValue.id);
                // Transform QV.label has a list of TaxonGroup.label
                const contextualTaxonGroupLabels = qualitativeValue === null || qualitativeValue === void 0 ? void 0 : qualitativeValue.label.split(/[^\w]+/).filter(isNotNilOrBlank).map((label) => label.trim().toUpperCase());
                // Limit the program list, using the restricted list
                if (isNotEmptyArray(contextualTaxonGroupLabels)) {
                    availableTaxonGroups = availableTaxonGroups.filter((tg) => contextualTaxonGroupLabels.some((label) => label === tg.label ||
                        // Contextual 'RJB' must match RJB_1, RJB_2
                        tg.label.startsWith(label)));
                }
            }
            // Set table's default taxon groups
            if (this.batchTree)
                this.batchTree.availableTaxonGroups = availableTaxonGroups;
            if (this.sampleTree)
                this.sampleTree.availableTaxonGroups = availableTaxonGroups;
        });
    }
    updateTablesState() {
        var _a, _b, _c, _d;
        if (this.enabled) {
            if (this.showCatchTab) {
                if ((_a = this.batchTree) === null || _a === void 0 ? void 0 : _a.disabled) {
                    this.batchTree.enable();
                    this.batchTree.realignInkBar();
                }
            }
            if (this.showSamplesTab) {
                if ((_b = this.sampleTree) === null || _b === void 0 ? void 0 : _b.disabled) {
                    this.sampleTree.enable();
                    this.sampleTree.realignInkBar();
                }
            }
        }
        else {
            if (this.showCatchTab && ((_c = this.batchTree) === null || _c === void 0 ? void 0 : _c.enabled)) {
                this.batchTree.disable();
            }
            if (this.showSamplesTab && ((_d = this.sampleTree) === null || _d === void 0 ? void 0 : _d.enabled)) {
                this.sampleTree.disable();
            }
        }
        // Force expected sub tab index
        if (this.showBatchTables && this.batchTree && this.batchTree.selectedTabIndex !== this.selectedSubTabIndex) {
            this.batchTree.setSelectedTabIndex(this.selectedSubTabIndex);
        }
        else if (this.showSamplesTab && this.sampleTree && this.sampleTree.selectedTabIndex !== this.selectedSubTabIndex) {
            this.sampleTree.setSelectedTabIndex(this.selectedSubTabIndex);
        }
    }
    loadLinkedOperation(data) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const childOperationId = toNumber(data.childOperationId, (_a = data.childOperation) === null || _a === void 0 ? void 0 : _a.id);
            // Load child operation
            if (isNotNil(childOperationId)) {
                try {
                    data.childOperation = yield this.dataService.load(childOperationId, { fetchPolicy: 'cache-first' });
                    data.childOperationId = undefined;
                }
                catch (err) {
                    console.error('Cannot load child operation: reset', err);
                    data.childOperation = undefined;
                    data.childOperationId = undefined;
                    data.parentOperation = undefined;
                }
            }
            else {
                // Load parent operation
                const parentOperationId = toNumber(data.parentOperationId, (_b = data.parentOperation) === null || _b === void 0 ? void 0 : _b.id);
                if (isNotNil(parentOperationId)) {
                    let validParent = true;
                    try {
                        data.parentOperation = yield this.dataService.load(parentOperationId, { fullLoad: false, fetchPolicy: 'cache-first' });
                        data.parentOperationId = undefined;
                        // Check parent operation is not already associated to another remote child operation
                        if (data.parentOperation &&
                            EntityUtils.isRemoteId(data.parentOperation.childOperationId) &&
                            data.parentOperation.childOperationId !== data.id) {
                            console.error(`Parent operation exists, but already linked to another remote operation: #${data.parentOperation.childOperationId}: mark parent has missing, to force user to fix it`);
                            validParent = false;
                        }
                    }
                    catch (err) {
                        console.error('Cannot load parent operation: keep existing, to force user to fix it', err);
                        validParent = false;
                    }
                    if (!validParent) {
                        data.parentOperationId = undefined;
                        // We create a fake Operation, with a qualityFlag = MISSING
                        // This is required to detect error at validation time (see OperationValidators.existsParent)
                        data.parentOperation = Operation.fromObject({
                            id: parentOperationId,
                            startDateTime: data.startDateTime,
                            fishingStartDateTime: data.fishingStartDateTime,
                            qualityFlagId: QualityFlagIds.MISSING,
                        });
                    }
                }
            }
        });
    }
    computePageUrl(id) {
        const parentUrl = this.getParentPageUrl();
        return parentUrl && `${parentUrl}/operation/${id}`;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    computeNextTabIndex() {
        if (this.selectedTabIndex > 0)
            return undefined; // Already on the next tab
        return this.showCatchTab ? OperationPage_1.TABS.CATCH : this.showSamplesTab ? OperationPage_1.TABS.SAMPLE : undefined;
    }
    startListenChanges() {
        if (EntityUtils.isLocal(this.data))
            return; // Skip if local entity
        super.startListenChanges();
    }
    /**
     * Update context, for batch validator
     *
     * @protected
     */
    updateDataContext() {
        var _a, _b, _c, _d, _e;
        console.debug('[operation-page] Updating data context...');
        // Date
        const date = this.lastEndDate || ((_a = this.opeForm.lastStartDateTimeControl) === null || _a === void 0 ? void 0 : _a.value);
        this.context.setValue('date', fromDateISOString(date));
        // Fishing area
        if (this.opeForm.showFishingArea) {
            const fishingAreas = (this.opeForm.fishingAreasHelper && ((_b = this.opeForm.fishingAreasHelper.formArray) === null || _b === void 0 ? void 0 : _b.value)) || ((_c = this.data) === null || _c === void 0 ? void 0 : _c.fishingAreas);
            this.context.setValue('fishingAreas', fishingAreas);
            this.context.resetValue('vesselPositions');
        }
        // Or vessel positions
        else if (this.opeForm.showPosition) {
            const positions = [(_d = this.opeForm.firstActivePositionControl) === null || _d === void 0 ? void 0 : _d.value, (_e = this.opeForm.lastActivePositionControl) === null || _e === void 0 ? void 0 : _e.value].filter((position) => PositionUtils.isNotNilAndValid(position));
            this.context.setValue('vesselPositions', positions);
            this.context.resetValue('fishingAreas');
        }
    }
    /**
     * Navigate to other operation
     *
     * @param id
     * @param opts
     * @protected
     */
    navigateTo(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = this.computePageUrl(id);
            const commands = path && typeof path === 'string' ? path.split('/').slice(1) : path;
            if (isNotEmptyArray(commands)) {
                // Change the trip id in path
                if (isNotNil(opts === null || opts === void 0 ? void 0 : opts.tripId) && commands[0] === 'trips' && +commands[1] === this.tripId) {
                    commands[1] = opts.tripId;
                }
                // Should replace the current page in history ? (default: true)
                let replaceUrl = !opts || opts.replaceUrl !== false;
                const queryParams = (opts === null || opts === void 0 ? void 0 : opts.queryParams) || {};
                // Workaround, to force angular to reload a new page
                if (id === 'new') {
                    const ok = yield this.goBack();
                    if (!ok)
                        return;
                    yield sleep(450);
                    replaceUrl = false; // No more need to replace the current page in history
                }
                else {
                    queryParams[this.pathIdAttribute] = '' + id;
                }
                return yield this.router.navigate(commands, {
                    replaceUrl,
                    queryParams,
                });
            }
            return Promise.reject('Missing page URL');
        });
    }
    openParentOperation(parent) {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = (this.mobile || this.isOnFieldMode) && (!this.dirty || this.valid)
                ? // If on field mode: try to save silently
                    yield this.save(null, { openTabIndex: -1 })
                : // If desktop mode: ask before save
                    yield this.saveIfDirtyAndConfirm(null, {
                        openTabIndex: -1,
                    });
            if (!saved)
                return; // Skip
            // Not same trips
            if (this.tripId !== parent.tripId) {
                return this.navigateTo(parent.id, {
                    replaceUrl: false,
                    tripId: parent.tripId,
                    queryParams: { color: 'secondary' },
                });
            }
            else {
                // Open, and replace the current OP
                return this.navigateTo(parent.id);
            }
        });
    }
    downloadAsJson(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const confirmed = yield this.saveIfDirtyAndConfirm(event);
            if (confirmed === false)
                return;
            if (!EntityUtils.isRemoteId((_a = this.data) === null || _a === void 0 ? void 0 : _a.id))
                return; // Skip
            // Create file content
            const data = yield this.dataService.load(this.data.id, { fullLoad: true });
            const json = data.asObject(MINIFY_ENTITY_FOR_LOCAL_STORAGE);
            const content = JSON.stringify([json]);
            // Write to file
            FilesUtils.writeTextToFile(content, {
                filename: this.translate.instant('TRIP.OPERATION.LIST.DOWNLOAD_JSON_FILENAME'),
                type: 'application/json',
            });
        });
    }
    openDownloadPage(type) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const confirmed = yield this.saveIfDirtyAndConfirm();
            if (confirmed === false)
                return;
            const trip = this.trip;
            if (!EntityUtils.isRemoteId(trip === null || trip === void 0 ? void 0 : trip.id) || !EntityUtils.isRemoteId((_a = this.data) === null || _a === void 0 ? void 0 : _a.id))
                return; // Skip
            // Create extraction type and filter
            type = type || ExtractionType.fromLiveLabel('PMFM_TRIP');
            const programLabel = (_b = trip.program) === null || _b === void 0 ? void 0 : _b.label;
            const tripId = trip.id;
            const operationId = this.data.id;
            const filter = ExtractionUtils.createTripFilter(programLabel, [tripId], [operationId]);
            const queryParams = ExtractionUtils.asQueryParams(type, filter);
            // Open extraction
            yield this.router.navigate(['extraction', 'data'], { queryParams });
        });
    }
};
OperationPage.TABS = {
    GENERAL: 0,
    CATCH: 1,
    SAMPLE: 2,
};
__decorate([
    ViewChild('opeForm', { static: true }),
    __metadata("design:type", OperationForm)
], OperationPage.prototype, "opeForm", void 0);
__decorate([
    ViewChild('measurementsForm', { static: true }),
    __metadata("design:type", MeasurementsForm)
], OperationPage.prototype, "measurementsForm", void 0);
__decorate([
    ViewChild('batchTree', { static: true }),
    __metadata("design:type", Object)
], OperationPage.prototype, "batchTree", void 0);
__decorate([
    ViewChild('sampleTree', { static: true }),
    __metadata("design:type", SampleTreeComponent)
], OperationPage.prototype, "sampleTree", void 0);
OperationPage = OperationPage_1 = __decorate([
    Component({
        selector: 'app-operation-page',
        templateUrl: './operation.page.html',
        styleUrls: ['./operation.page.scss'],
        animations: [fadeInOutAnimation],
        providers: [{ provide: APP_DATA_ENTITY_EDITOR, useExisting: OperationPage_1 }, { provide: ContextService, useExisting: TripContextService }, RxState],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __param(2, Optional()),
    __metadata("design:paramtypes", [Injector,
        OperationService,
        AppEditorOptions])
], OperationPage);
export { OperationPage };
//# sourceMappingURL=operation.page.js.map