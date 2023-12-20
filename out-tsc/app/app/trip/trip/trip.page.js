var TripPage_1;
import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, Component, Inject, Injector, Input, Self, ViewChild } from "@angular/core";
import { TripService } from "./trip.service";
import { TripForm } from "./trip.form";
import { SaleForm } from "../sale/sale.form";
import { OperationsTable } from "../operation/operations.table";
import { MeasurementsForm } from "@app/data/measurement/measurements.form.component";
import { PhysicalGearTable } from "../physicalgear/physical-gears.table";
import { AcquisitionLevelCodes, PmfmIds } from "@app/referential/services/model/model.enum";
import { AppRootDataEntityEditor } from "@app/data/form/root-data-editor.class";
import { Validators } from "@angular/forms";
import {
    AccountService,
    Alerts,
    AppHelpModal,
    DateUtils,
    EntitiesStorage,
    EntityUtils,
    equals,
    fadeInOutAnimation,
    FilesUtils,
    InMemoryEntitiesService,
    isNil,
    isNotEmptyArray,
    isNotNil,
    isNotNilOrBlank,
    MINIFY_ENTITY_FOR_LOCAL_STORAGE,
    NetworkService,
    ReferentialRef,
    ReferentialUtils,
    sleep
} from "@sumaris-net/ngx-components";
import { TripsPageSettingsEnum } from "./trips.table";
import { Trip } from "./trip.model";
import { SelectPhysicalGearModal } from "../physicalgear/select-physical-gear.modal";
import { ModalController } from "@ionic/angular";
import { PhysicalGearFilter } from "../physicalgear/physical-gear.filter";
import { ProgramProperties } from "@app/referential/services/config/program.config";
import { VesselSnapshot } from "@app/referential/services/model/vessel-snapshot.model";
import {
    debounceTime,
    distinctUntilChanged,
    filter,
    first,
    map,
    mergeMap,
    startWith,
    tap,
    throttleTime
} from "rxjs/operators";
import { environment } from "@environments/environment";
import { TRIP_FEATURE_NAME } from "@app/trip/trip.config";
import { from, merge, Subscription } from "rxjs";
import { OperationService } from "@app/trip/operation/operation.service";
import { ContextService } from "@app/shared/context.service";
import { TripContextService } from "@app/trip/trip-context.service";
import { Sale } from "@app/trip/sale/sale.model";
import { PhysicalGear } from "@app/trip/physicalgear/physical-gear.model";
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN } from "@app/trip/physicalgear/physicalgear.service";
import moment from "moment";
import { ExtractionType } from "@app/extraction/type/extraction-type.model";
import { ExtractionUtils } from "@app/extraction/common/extraction.utils";
import { APP_DATA_ENTITY_EDITOR, DataStrategyResolutions } from "@app/data/form/data-editor.utils";

export const TripPageSettingsEnum = {
    PAGE_ID: 'trip',
    FEATURE_ID: TRIP_FEATURE_NAME,
};
let TripPage = TripPage_1 = class TripPage extends AppRootDataEntityEditor {
    constructor(injector, entities, modalCtrl, operationService, context, tripContext, accountService, network, physicalGearService) {
        super(injector, Trip, injector.get(TripService), {
            pathIdAttribute: 'tripId',
            tabCount: 3,
            enableListenChanges: true,
            i18nPrefix: 'TRIP.',
            acquisitionLevel: AcquisitionLevelCodes.TRIP,
            settingsId: TripPageSettingsEnum.PAGE_ID
        });
        this.entities = entities;
        this.modalCtrl = modalCtrl;
        this.operationService = operationService;
        this.context = context;
        this.tripContext = tripContext;
        this.accountService = accountService;
        this.network = network;
        this.physicalGearService = physicalGearService;
        this._forceMeasurementAsOptionalOnFieldMode = false;
        this.showSaleForm = false;
        this.showGearTable = false;
        this.showOperationTable = false;
        this.devAutoFillData = false;
        this.canCopyLocally = false;
        this.canDownload = false;
        this.toolbarColor = 'primary';
        this.defaultBackHref = '/trips';
        this.operationPasteFlags = this.operationPasteFlags || 0;
        // FOR DEV ONLY ----
        this.logPrefix = '[trip-page] ';
    }
    get dirty() {
        var _a;
        return (this.dirtySubject.value ||
            // Ignore operation table, when computing dirty state
            ((_a = this.children) === null || _a === void 0 ? void 0 : _a.filter((form) => form !== this.operationsTable).findIndex((c) => c.dirty)) !== -1);
    }
    get forceMeasurementAsOptional() {
        return this._forceMeasurementAsOptionalOnFieldMode && this.isOnFieldMode;
    }
    ngOnInit() {
        super.ngOnInit();
        // Listen some field
        this._state.connect('departureDateTime', this.tripForm.departureDateTimeChanges.pipe(filter(d => d === null || d === void 0 ? void 0 : d.isValid())));
        this._state.connect('departureLocation', this.tripForm.departureLocationChanges);
        // Update the data context
        this.registerSubscription(merge(this.selectedTabIndexChange.pipe(filter((tabIndex) => tabIndex === TripPage_1.TABS.OPERATIONS && this.showOperationTable)), from(this.ready()))
            .pipe(debounceTime(500), throttleTime(500))
            .subscribe((_) => this.updateDataContext()));
    }
    ngAfterViewInit() {
        super.ngAfterViewInit();
        // Cascade refresh to operation tables
        this.registerSubscription(this.onUpdateView
            .pipe(filter((_) => !this.loading), debounceTime(250))
            .subscribe(() => this.operationsTable.onRefresh.emit()));
        // Before delete gears, check if used in operations
        this.registerSubscription(this.physicalGearsTable.onBeforeDeleteRows.subscribe((event) => __awaiter(this, void 0, void 0, function* () {
            const rows = event.detail.rows;
            const canDelete = yield this.operationService.areUsedPhysicalGears(this.data.id, rows.map((row) => row.currentData.id));
            event.detail.success(canDelete);
            if (!canDelete) {
                yield Alerts.showError('TRIP.PHYSICAL_GEAR.ERROR.CANNOT_DELETE_USED_GEAR_HELP', this.alertCtrl, this.translate, {
                    titleKey: 'TRIP.PHYSICAL_GEAR.ERROR.CANNOT_DELETE',
                });
            }
        })));
        // Allow to show operations tab, when add gear
        this.registerSubscription(this.physicalGearsTable.onConfirmEditCreateRow.subscribe((_) => (this.showOperationTable = true)));
        if (this.measurementsForm) {
            this.registerSubscription(this.measurementsForm.pmfms$
                .pipe(
            //debounceTime(400),
            filter(isNotNil), mergeMap((_) => this.measurementsForm.ready()))
                .subscribe((_) => this.onMeasurementsFormReady()));
        }
        // Auto fill form, in DEV mode
        if (!environment.production) {
            this.registerSubscription(this.program$
                .pipe(filter(isNotNil), filter(() => this.isNewData && this.devAutoFillData))
                .subscribe((program) => this.setTestValue(program)));
        }
    }
    ngOnDestroy() {
        var _a;
        super.ngOnDestroy();
        (_a = this._measurementSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
    }
    setError(error, opts) {
        var _a, _b, _c, _d;
        // If errors in operations
        if (typeof error !== 'string' && ((_b = (_a = error === null || error === void 0 ? void 0 : error.details) === null || _a === void 0 ? void 0 : _a.errors) === null || _b === void 0 ? void 0 : _b.operations)) {
            // Show error in operation table
            this.operationsTable.setError('TRIP.ERROR.INVALID_OPERATIONS', {
                showOnlyInvalidRows: true,
            });
            // Open the operation tab
            this.tabGroup.selectedIndex = TripPage_1.TABS.OPERATIONS;
            // Reset other errors
            this.physicalGearsTable.resetError(opts);
            super.setError(undefined, opts);
        }
        // If errors in gears
        else if (typeof error !== 'string' && ((_d = (_c = error === null || error === void 0 ? void 0 : error.details) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d.gears)) {
            // Show error in operation table
            this.physicalGearsTable.setError('TRIP.ERROR.INVALID_GEARS');
            // Open the operation tab
            this.tabGroup.selectedIndex = TripPage_1.TABS.PHYSICAL_GEARS;
            // Reset other errors
            this.operationsTable.resetError(opts);
            super.setError(undefined, opts);
        }
        // Error in the main form
        else {
            super.setError(error, opts);
            // Reset error in table (and filter in op table)
            this.physicalGearsTable.resetError(opts);
            this.operationsTable.resetError(opts);
        }
    }
    // change visibility to public
    resetError(opts) {
        this.setError(undefined, opts);
    }
    translateControlPath(controlPath) {
        return this.dataService.translateControlPath(controlPath, { i18nPrefix: this.i18nContext.prefix });
    }
    registerForms() {
        this.addChildForms([this.tripForm, this.saleForm, this.measurementsForm, this.physicalGearsTable, this.operationsTable]);
    }
    setProgram(program) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (!program)
                return; // Skip load Trip
            if (this.debug)
                console.debug(`[trip] Program ${program.label} loaded, with properties: `, program.properties);
            // Update the context
            if (this.tripContext.program !== program) {
                this.tripContext.setValue('program', program);
            }
            this.strategyResolution = program.getProperty(ProgramProperties.DATA_STRATEGY_RESOLUTION);
            let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
            this.i18nContext.suffix = i18nSuffix;
            this.operationEditor = program.getProperty(ProgramProperties.TRIP_OPERATION_EDITOR);
            this.enableReport = program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_ENABLE);
            // Trip form
            this.tripForm.showObservers = program.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE);
            if (!this.tripForm.showObservers && ((_a = this.data) === null || _a === void 0 ? void 0 : _a.observers)) {
                this.data.observers = []; // make sure to reset data observers, if any
            }
            this.tripForm.showMetiers = program.getPropertyAsBoolean(ProgramProperties.TRIP_METIERS_ENABLE);
            if (!this.tripForm.showMetiers && ((_b = this.data) === null || _b === void 0 ? void 0 : _b.metiers)) {
                this.data.metiers = []; // make sure to reset data metiers, if any
            }
            this.tripForm.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.TRIP_LOCATION_LEVEL_IDS);
            this.tripForm.locationSuggestLengthThreshold = program.getPropertyAsInt(ProgramProperties.TRIP_LOCATION_FILTER_MIN_LENGTH);
            this.tripForm.minDurationInHours = program.getPropertyAsInt(ProgramProperties.TRIP_MIN_DURATION_HOURS);
            this.tripForm.maxDurationInHours = program.getPropertyAsInt(ProgramProperties.TRIP_MAX_DURATION_HOURS);
            // Sale form
            this.showSaleForm = program.getPropertyAsBoolean(ProgramProperties.TRIP_SALE_ENABLE);
            // Measurement form
            this._forceMeasurementAsOptionalOnFieldMode = program.getPropertyAsBoolean(ProgramProperties.TRIP_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE);
            this.measurementsForm.forceOptional = this._forceMeasurementAsOptionalOnFieldMode;
            this.measurementsForm.maxVisibleButtons = program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS);
            this.measurementsForm.maxItemCountForButtons = program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS);
            // Physical gears
            this.physicalGearsTable.canEditRankOrder = program.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEAR_RANK_ORDER_ENABLE);
            this.physicalGearsTable.allowChildrenGears = program.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN);
            this.physicalGearsTable.showSubGearsCountColumn = this.physicalGearsTable.allowChildrenGears;
            this.physicalGearsTable.setModalOption('helpMessage', program.getProperty(ProgramProperties.TRIP_PHYSICAL_GEAR_HELP_MESSAGE));
            this.physicalGearsTable.setModalOption('maxVisibleButtons', program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS));
            this.physicalGearsTable.setModalOption('maxItemCountForButtons', program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_ITEM_COUNT_FOR_BUTTONS));
            this.physicalGearsTable.setModalOption('minChildrenCount', program.getPropertyAsInt(ProgramProperties.TRIP_PHYSICAL_GEAR_MIN_CHILDREN_COUNT));
            this.physicalGearsTable.i18nColumnSuffix = i18nSuffix;
            // Operation table
            const positionEnabled = program.getPropertyAsBoolean(ProgramProperties.TRIP_POSITION_ENABLE);
            this.operationsTable.showPosition = positionEnabled;
            this.operationsTable.showFishingArea = !positionEnabled;
            const allowParentOperation = program.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION);
            this.operationsTable.allowParentOperation = allowParentOperation;
            this.operationsTable.showMap = this.network.online && program.getPropertyAsBoolean(ProgramProperties.TRIP_MAP_ENABLE);
            this.operationsTable.showEndDateTime = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE);
            this.operationsTable.showFishingEndDateTime =
                !this.operationsTable.showEndDateTime && program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE);
            this.operationsTable.i18nColumnSuffix = i18nSuffix;
            this.operationsTable.detailEditor = this.operationEditor;
            this.operationPasteFlags = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_PASTE_FLAGS);
            this.helpUrl = program.getProperty(ProgramProperties.TRIP_HELP_URL);
            // Toggle showMap to false, when offline
            if (this.operationsTable.showMap) {
                const subscription = this.network.onNetworkStatusChanges.pipe(filter((status) => status === 'none')).subscribe((_) => {
                    this.operationsTable.showMap = false;
                    this.markForCheck();
                    subscription.unsubscribe(); // Remove the subscription (not need anymore)
                });
                this.registerSubscription(subscription);
            }
            // If new data, enable gears tab
            if (this.isNewData)
                this.showGearTable = true;
            // If new data: update trip form (need to update validator, with min/maxDurationInHours)
            if (this.isNewData)
                this.tripForm.updateFormGroup();
            // Disabled operations tab, while no gear
            // But enable anyway, when parent operation allowed
            this.showOperationTable = this.showOperationTable || allowParentOperation;
            this.markAsReady();
            this.markForCheck();
            // Listen program, to reload if changes
            if (this.network.online)
                this.startListenProgramRemoteChanges(program);
        });
    }
    watchStrategyFilter(program) {
        console.debug(this.logPrefix + 'Using strategy resolution: ' + this.strategyResolution);
        switch (this.strategyResolution) {
            // Spatio-temporal
            case DataStrategyResolutions.SPATIO_TEMPORAL:
                return this._state.select(['acquisitionLevel', 'departureDateTime', 'departureLocation'], (_) => _, {
                    acquisitionLevel: equals,
                    departureDateTime: DateUtils.equals,
                    departureLocation: ReferentialUtils.equals
                })
                    .pipe(map(({ acquisitionLevel, departureDateTime, departureLocation }) => {
                    return {
                        acquisitionLevel,
                        programId: program.id,
                        startDate: departureDateTime,
                        endDate: departureDateTime,
                        location: departureLocation,
                    };
                }),
                // DEBUG
                tap(values => console.debug(this.logPrefix + 'Strategy filter changed:', values)));
            default:
                return super.watchStrategyFilter(program);
        }
    }
    canLoadStrategy(program, strategyFilter) {
        switch (this.strategyResolution) {
            case DataStrategyResolutions.SPATIO_TEMPORAL:
                return super.canLoadStrategy(program, strategyFilter) && ReferentialUtils.isNotEmpty(strategyFilter === null || strategyFilter === void 0 ? void 0 : strategyFilter.location) && isNotNil(strategyFilter === null || strategyFilter === void 0 ? void 0 : strategyFilter.startDate);
            default:
                return super.canLoadStrategy(program, strategyFilter);
        }
    }
    setStrategy(strategy) {
        const _super = Object.create(null, {
            setStrategy: { get: () => super.setStrategy }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.setStrategy.call(this, strategy);
            // Update the context
            if (this.tripContext.strategy !== strategy) {
                if (this.debug)
                    console.debug(this.logPrefix + "Update context's strategy...", strategy);
                this.tripContext.setValue('strategy', strategy);
            }
        });
    }
    onNewEntity(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[trip] New entity: applying defaults...');
            if (this.isOnFieldMode) {
                data.departureDateTime = moment();
                // Listen first opening the operations tab, then save
                this.registerSubscription(this.tabGroup.selectedTabChange
                    .pipe(filter((event) => this.showOperationTable && event.index === TripPage_1.TABS.OPERATIONS),
                // Save trip when opening the operation tab
                mergeMap((_) => this.save()), filter((saved) => saved === true), first(),
                // If save succeed, propagate the tripId to the table
                tap((_) => this.operationsTable.setTripId(this.data.id)))
                    .subscribe());
            }
            // Fill defaults, from table's filter
            const tableId = this.queryParams['tableId'];
            const searchFilter = tableId && this.settings.getPageSettings(tableId, TripsPageSettingsEnum.FILTER_KEY);
            if (searchFilter) {
                // Synchronization status
                if (searchFilter.synchronizationStatus && searchFilter.synchronizationStatus !== 'SYNC') {
                    data.synchronizationStatus = 'DIRTY';
                }
                // program
                if (searchFilter.program && searchFilter.program.label) {
                    data.program = ReferentialRef.fromObject(searchFilter.program);
                }
                // Vessel
                if (searchFilter.vesselSnapshot) {
                    data.vesselSnapshot = VesselSnapshot.fromObject(searchFilter.vesselSnapshot);
                }
                // Location
                if (searchFilter.location) {
                    data.departureLocation = ReferentialRef.fromObject(searchFilter.location);
                }
            }
            // Set contextual program, if any
            if (!data.program) {
                const contextualProgram = this.context.getValue('program');
                if (contextualProgram === null || contextualProgram === void 0 ? void 0 : contextualProgram.label) {
                    data.program = ReferentialRef.fromObject(contextualProgram);
                }
            }
            this.showGearTable = false;
            this.showOperationTable = false;
            // Propagate program
            const programLabel = data.program && data.program.label;
            this.programLabel = programLabel;
            // Enable forms (do not wait for program load)
            if (!programLabel)
                this.markAsReady();
        });
    }
    onEntityLoaded(data, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const programLabel = (_a = data.program) === null || _a === void 0 ? void 0 : _a.label;
            if (programLabel)
                this.programLabel = programLabel;
            this.canDownload = !this.mobile && EntityUtils.isRemoteId(data === null || data === void 0 ? void 0 : data.id);
            this.canCopyLocally = this.accountService.isAdmin() && EntityUtils.isRemoteId(data === null || data === void 0 ? void 0 : data.id);
            this._state.set({ departureDateTime: data.departureDateTime, departureLocation: data.departureLocation });
            console.log('TODO loaded', this.program);
        });
    }
    updateViewState(data, opts) {
        super.updateViewState(data, opts);
        // Update tabs state (show/hide)
        this.updateTabsState(data);
    }
    updateTabsState(data) {
        // Enable gears tab if a program has been selected
        this.showGearTable = !this.isNewData || isNotNilOrBlank(this.programLabel);
        // Enable operations tab if has gears
        this.showOperationTable = this.showOperationTable || (this.showGearTable && isNotEmptyArray(data.gears));
    }
    openReport(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.dirty) {
                const data = yield this.saveAndGetDataIfValid();
                if (!data)
                    return; // Cancel
            }
            const reportType = ((_a = this.program) === null || _a === void 0 ? void 0 : _a.getProperty(ProgramProperties.TRIP_REPORT_TYPE)) || ProgramProperties.TRIP_REPORT_TYPE.defaultValue;
            const typePath = reportType !== 'legacy' ? [reportType] : [];
            return this.router.navigateByUrl([this.computePageUrl(this.data.id), 'report', ...typePath].join('/'));
        });
    }
    setValue(data) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const isNewData = isNil(data.id);
                const jobs = [];
                // Set data to form
                jobs.push(this.tripForm.setValue(data));
                this.saleForm.value = (data && data.sale) || new Sale();
                // Measurements
                if (isNewData) {
                    this.measurementsForm.value = (data === null || data === void 0 ? void 0 : data.measurements) || [];
                }
                else {
                    this.measurementsForm.programLabel = (_a = data.program) === null || _a === void 0 ? void 0 : _a.label;
                    jobs.push(this.measurementsForm.setValue((data === null || data === void 0 ? void 0 : data.measurements) || []));
                }
                // Set physical gears
                this.physicalGearsTable.tripId = data.id;
                this.physicalGearService.value = (data && data.gears) || [];
                if (!isNewData)
                    jobs.push(this.physicalGearsTable.waitIdle({ timeout: 2000 }));
                // Operations table
                if (!isNewData && this.operationsTable)
                    this.operationsTable.setTripId(data.id);
                yield Promise.all(jobs);
                // DEBUG
                //console.debug('[trip] setValue() [OK]');
            }
            catch (err) {
                const error = (err === null || err === void 0 ? void 0 : err.message) || err;
                console.debug('[trip] Error during setValue(): ' + error, err);
                this.setError(error);
            }
        });
    }
    onOpenOperation(row) {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = this.isOnFieldMode && this.dirty ? yield this.save(undefined) : yield this.saveIfDirtyAndConfirm();
            if (!saved)
                return; // Cannot saved
            this.markAsLoading();
            // Propagate the usage mode (e.g. when try to 'terminate' the trip)
            this.tripContext.setValue('usageMode', this.usageMode);
            // Store the trip in context
            this.tripContext.setValue('trip', this.data.clone());
            // Store the selected operation (e.g. useful to avoid rankOrder computation, in the operation page)
            this.tripContext.setValue('operation', row.currentData);
            // Propagate the past flags to clipboard
            this.tripContext.setValue('clipboard', {
                data: null,
                pasteFlags: this.operationPasteFlags, // Keep flags
            });
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                const editorPath = this.operationEditor !== 'legacy' ? [this.operationEditor] : [];
                yield this.router.navigate(['trips', this.data.id, 'operation', ...editorPath, row.currentData.id], { queryParams: {} /*reset query params*/ });
                this.markAsLoaded();
            }));
        });
    }
    onNewOperation(event, operationQueryParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = this.isOnFieldMode && this.dirty
                ? // If on field mode: try to save silently
                    yield this.save(event)
                : // If desktop mode: ask before save
                    yield this.saveIfDirtyAndConfirm();
            if (!saved)
                return; // Cannot save
            this.markAsLoading();
            // Store the trip in context
            this.tripContext.setValue('trip', this.data.clone());
            // Propagate the usage mode (e.g. when try to 'terminate' the trip)
            this.tripContext.setValue('usageMode', this.usageMode);
            // Reset operation
            this.tripContext.resetValue('operation');
            // Open the operation editor
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                const editorPath = this.operationEditor !== 'legacy' ? [this.operationEditor] : [];
                yield this.router.navigate(['trips', this.data.id, 'operation', ...editorPath, 'new'], {
                    queryParams: operationQueryParams || {},
                });
                this.markAsLoaded();
            }));
        });
    }
    onDuplicateOperation(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(event === null || event === void 0 ? void 0 : event.data))
                return; // Skip
            // Fill clipboard
            this.tripContext.setValue('clipboard', {
                data: event.data.clone(),
                pasteFlags: this.operationPasteFlags,
            });
            yield this.onNewOperation(event);
        });
    }
    // For DEV only
    setTestValue(program) {
        var _a;
        const departureDate = moment().startOf('minutes');
        const returnDate = departureDate.clone().add(15, 'day');
        const trip = Trip.fromObject({
            program,
            departureDateTime: departureDate,
            departureLocation: { id: 11, label: 'FRDRZ', name: 'Douarnenez', entityName: 'Location', __typename: 'ReferentialVO' },
            returnDateTime: returnDate,
            returnLocation: { id: 11, label: 'FRDRZ', name: 'Douarnenez', entityName: 'Location', __typename: 'ReferentialVO' },
            vesselSnapshot: {
                id: 1,
                vesselId: 1,
                name: 'Vessel 1',
                basePortLocation: { id: 11, label: 'FRDRZ', name: 'Douarnenez', __typename: 'ReferentialVO' },
                __typename: 'VesselSnapshotVO',
            },
            measurements: [
                { numericalValue: 1, pmfmId: 21 },
                { numericalValue: 1, pmfmId: 188 }, // GPS_USED
            ],
            // Keep existing synchronizationStatus
            synchronizationStatus: (_a = this.data) === null || _a === void 0 ? void 0 : _a.synchronizationStatus,
        });
        this.measurementsForm.value = trip.measurements;
        this.form.patchValue(trip);
    }
    devToggleAutoFillData() {
        this.devAutoFillData = !this.devAutoFillData;
        this.settings.savePageSetting(this.settingsId, this.devAutoFillData, 'devAutoFillData');
    }
    devToggleOfflineMode() {
        if (this.network.offline) {
            this.network.setForceOffline(false);
        }
        else {
            this.network.setForceOffline();
        }
    }
    copyLocally() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.data)
                return;
            // Copy the trip
            yield this.dataService.copyLocallyById(this.data.id, { withOperations: true, displaySuccessToast: true });
        });
    }
    /**
     * Open a modal to select a previous gear
     *
     * @param event
     */
    openSearchPhysicalGearModal(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!event || !event.detail.success)
                return; // Skip (missing callback)
            const trip = Trip.fromObject(this.tripForm.value);
            const vessel = trip.vesselSnapshot;
            const date = trip.departureDateTime || trip.returnDateTime;
            const withOffline = EntityUtils.isLocal(trip) || trip.synchronizationStatus === 'DIRTY';
            if (!vessel || !date)
                return; // Skip
            const programLabel = this.programLabel;
            const acquisitionLevel = event.type || this.physicalGearsTable.acquisitionLevel;
            const filter = {
                program: { label: programLabel },
                vesselId: vessel.id,
                excludeTripId: trip.id,
                startDate: DateUtils.min(moment(), date && date.clone()).add(-1, 'month'),
                endDate: date && date.clone(),
                excludeChildGear: acquisitionLevel === AcquisitionLevelCodes.PHYSICAL_GEAR,
                excludeParentGear: acquisitionLevel === AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR,
            };
            const showGearColumn = acquisitionLevel === AcquisitionLevelCodes.PHYSICAL_GEAR;
            const includedPmfmIds = (_a = this.tripContext.program) === null || _a === void 0 ? void 0 : _a.getPropertyAsNumbers(ProgramProperties.TRIP_PHYSICAL_GEARS_COLUMNS_PMFM_IDS);
            const distinctBy = [
                'gear.id',
                'rankOrder',
                ...(this.physicalGearsTable.pmfms || [])
                    .filter((p) => (p.required && !p.hidden) || (includedPmfmIds === null || includedPmfmIds === void 0 ? void 0 : includedPmfmIds.includes(p.id)))
                    .map((p) => `measurementValues.${p.id}`),
            ];
            const hasTopModal = !!(yield this.modalCtrl.getTop());
            const modal = yield this.modalCtrl.create({
                component: SelectPhysicalGearModal,
                componentProps: {
                    allowMultiple: false,
                    programLabel,
                    acquisitionLevel,
                    filter,
                    distinctBy,
                    withOffline,
                    showGearColumn,
                },
                backdropDismiss: false,
                keyboardClose: true,
                cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large',
            });
            // Open the modal
            yield modal.present();
            // On dismiss
            const { data } = yield modal.onDidDismiss();
            if (isNotEmptyArray(data)) {
                const gearToCopy = PhysicalGear.fromObject(data[0]);
                console.debug('[trip] Result of select gear modal:', gearToCopy);
                // Call resolve callback
                event.detail.success(gearToCopy);
            }
            else {
                // User cancelled
                event.detail.error('CANCELLED');
            }
        });
    }
    save(event, opts) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (this.saving || this.loading)
                return false;
            // Workaround to avoid the option menu to be selected
            if (this.mobile)
                yield sleep(50);
            return _super.save.call(this, event, opts);
        });
    }
    /* -- protected methods -- */
    get form() {
        return this.tripForm.form;
    }
    computeUsageMode(data) {
        return this.settings.isUsageMode('FIELD') || data.synchronizationStatus === 'DIRTY' ? 'FIELD' : 'DESK';
    }
    computeNextTabIndex() {
        return super.computeNextTabIndex() || this.selectedTabIndex;
    }
    computeTitle(data) {
        // new data
        if (!data || isNil(data.id)) {
            return this.translate.get('TRIP.NEW.TITLE').toPromise();
        }
        // Existing data
        return this.translate
            .get('TRIP.EDIT.TITLE', {
            vessel: data.vesselSnapshot && (data.vesselSnapshot.exteriorMarking || data.vesselSnapshot.name),
            departureDateTime: data.departureDateTime && this.dateFormat.transform(data.departureDateTime),
        })
            .toPromise();
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { icon: 'boat' });
        });
    }
    getJsonValueToSave() {
        const _super = Object.create(null, {
            getJsonValueToSave: { get: () => super.getJsonValueToSave }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const json = yield _super.getJsonValueToSave.call(this);
            json.sale = !this.saleForm.empty ? this.saleForm.value : null;
            return json;
        });
    }
    getValue() {
        const _super = Object.create(null, {
            getValue: { get: () => super.getValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield _super.getValue.call(this);
            data.measurements = this.measurementsForm.value;
            if (this.physicalGearsTable.dirty) {
                yield this.physicalGearsTable.save();
            }
            data.gears = this.physicalGearService.value;
            return data;
        });
    }
    getFirstInvalidTabIndex() {
        const invalidTabs = [
            this.tripForm.invalid || this.measurementsForm.invalid,
            this.showGearTable && this.physicalGearsTable.invalid,
            this.showOperationTable && this.operationsTable.invalid,
        ];
        return invalidTabs.findIndex((invalid) => invalid === true);
    }
    /**
     * Configure specific behavior
     */
    onMeasurementsFormReady() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Wait program to be loaded
            yield this.ready();
            // DEBUG
            //console.debug('[operation-page] Measurement form is ready');
            // Clean existing subscription (e.g. when acquisition level change, this function can= be called many times)
            (_a = this._measurementSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
            this._measurementSubscription = new Subscription();
            const formGroup = this.measurementsForm.form;
            // If PMFM "Use of a GPS ?" exists, then use to enable/disable positions or fishing area
            const isGPSUsed = formGroup === null || formGroup === void 0 ? void 0 : formGroup.controls[PmfmIds.GPS_USED];
            if (isNotNil(isGPSUsed)) {
                isGPSUsed.setValidators(Validators.required);
                this._measurementSubscription.add(isGPSUsed.valueChanges
                    .pipe(debounceTime(400), startWith(isGPSUsed.value), filter(isNotNil), distinctUntilChanged())
                    .subscribe((value) => {
                    if (this.debug)
                        console.debug('[trip] Enable/Disable positions or fishing area, because GPS_USED=' + value);
                    // Enable positions, when has gps
                    this.operationsTable.showPosition = value;
                    // Enable fishing area, when has not gps
                    this.operationsTable.showFishingArea = !value;
                    this.markForCheck();
                }));
            }
        });
    }
    /**
     * Update context, for batch validator
     *
     * @protected
     */
    updateDataContext() {
        console.debug(this.logPrefix + 'Updating data context...');
        // Program
        const program = this.program;
        if (this.tripContext.program !== program) {
            this.tripContext.setValue('program', program);
        }
        // Strategy
        const strategy = this.strategy;
        if (this.tripContext.strategy !== strategy) {
            this.tripContext.setValue('strategy', strategy);
        }
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
            const data = yield this.dataService.load(this.data.id, { fullLoad: true, withOperation: true });
            const json = data.asObject(MINIFY_ENTITY_FOR_LOCAL_STORAGE);
            const content = JSON.stringify([json]);
            // Write to file
            FilesUtils.writeTextToFile(content, {
                filename: this.translate.instant('TRIP.TABLE.DOWNLOAD_JSON_FILENAME'),
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
            if (!EntityUtils.isRemoteId((_a = this.data) === null || _a === void 0 ? void 0 : _a.id))
                return; // Skip
            // Create extraction type and filter
            type = type || ExtractionType.fromLiveLabel('PMFM_TRIP');
            const programLabel = (_b = this.data.program) === null || _b === void 0 ? void 0 : _b.label;
            const tripId = this.data.id;
            const filter = ExtractionUtils.createTripFilter(programLabel, [tripId]);
            const queryParams = ExtractionUtils.asQueryParams(type, filter);
            // Open extraction
            yield this.router.navigate(['extraction', 'data'], { queryParams });
        });
    }
    openHelpModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event)
                event.preventDefault();
            if (!this.helpUrl) {
                yield Alerts.showError('TRIP.WARNING.NO_HELP_URL', this.alertCtrl, this.translate, {
                    titleKey: 'WARNING.OOPS_DOTS',
                }, {
                    programLabel: this.programLabel,
                });
                return;
            }
            console.debug(`[trip-page] Open help page {${this.helpUrl}}...`);
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
    markForCheck() {
        this.cd.markForCheck();
    }
};
TripPage.TABS = {
    GENERAL: 0,
    PHYSICAL_GEARS: 1,
    OPERATIONS: 2,
};
__decorate([
    Input(),
    __metadata("design:type", String)
], TripPage.prototype, "toolbarColor", void 0);
__decorate([
    ViewChild('tripForm', { static: true }),
    __metadata("design:type", TripForm)
], TripPage.prototype, "tripForm", void 0);
__decorate([
    ViewChild('saleForm', { static: true }),
    __metadata("design:type", SaleForm)
], TripPage.prototype, "saleForm", void 0);
__decorate([
    ViewChild('physicalGearsTable', { static: true }),
    __metadata("design:type", PhysicalGearTable)
], TripPage.prototype, "physicalGearsTable", void 0);
__decorate([
    ViewChild('measurementsForm', { static: true }),
    __metadata("design:type", MeasurementsForm)
], TripPage.prototype, "measurementsForm", void 0);
__decorate([
    ViewChild('operationsTable', { static: true }),
    __metadata("design:type", OperationsTable)
], TripPage.prototype, "operationsTable", void 0);
TripPage = TripPage_1 = __decorate([
    Component({
        selector: 'app-trip-page',
        templateUrl: './trip.page.html',
        styleUrls: ['./trip.page.scss'],
        animations: [fadeInOutAnimation],
        providers: [
            { provide: APP_DATA_ENTITY_EDITOR, useExisting: TripPage_1 },
            {
                provide: PHYSICAL_GEAR_DATA_SERVICE_TOKEN,
                useFactory: () => new InMemoryEntitiesService(PhysicalGear, PhysicalGearFilter, {
                    equals: PhysicalGear.equals,
                    sortByReplacement: { id: 'rankOrder' },
                }),
            },
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __param(8, Self()),
    __param(8, Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN)),
    __metadata("design:paramtypes", [Injector,
        EntitiesStorage,
        ModalController,
        OperationService,
        ContextService,
        TripContextService,
        AccountService,
        NetworkService,
        InMemoryEntitiesService])
], TripPage);
export { TripPage };
//# sourceMappingURL=trip.page.js.map
