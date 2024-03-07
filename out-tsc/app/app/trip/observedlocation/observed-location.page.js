var ObservedLocationPage_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input, ViewChild } from '@angular/core';
import { ObservedLocationForm } from './form/observed-location.form';
import { ObservedLocationService } from './observed-location.service';
import { LandingsTable } from '../landing/landings.table';
import { AppRootDataEntityEditor } from '@app/data/form/root-data-editor.class';
import { AccountService, Alerts, ConfigService, CORE_CONFIG_OPTIONS, DateUtils, EntityUtils, fadeInOutAnimation, firstNotNilPromise, isNotNil, NetworkService, ReferentialRef, ReferentialUtils, StatusIds, toBoolean, TranslateContextService, } from '@sumaris-net/ngx-components';
import { ModalController } from '@ionic/angular';
import { SelectVesselsForDataModal } from './vessels/select-vessel-for-data.modal';
import { ObservedLocation } from './observed-location.model';
import { Landing } from '../landing/landing.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { BehaviorSubject } from 'rxjs';
import { filter, first, tap } from 'rxjs/operators';
import { AggregatedLandingsTable } from '../aggregated-landing/aggregated-landings.table';
import { ObservedLocationsPageSettingsEnum } from './table/observed-locations.page';
import { environment } from '@environments/environment';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import { LandingFilter } from '../landing/landing.filter';
import { ContextService } from '@app/shared/context.service';
import moment from 'moment';
import { VesselService } from '@app/vessel/services/vessel-service';
import { ObservedLocationContextService } from '@app/trip/observedlocation/observed-location-context.service';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
const ObservedLocationPageTabs = {
    GENERAL: 0,
    LANDINGS: 1,
};
let ObservedLocationPage = ObservedLocationPage_1 = class ObservedLocationPage extends AppRootDataEntityEditor {
    constructor(injector, dataService, modalCtrl, configService, accountService, vesselService, translateContext, context, observedLocationContext, network) {
        super(injector, ObservedLocation, dataService, {
            pathIdAttribute: 'observedLocationId',
            tabCount: 2,
            i18nPrefix: 'OBSERVED_LOCATION.EDIT.',
            enableListenChanges: true
        });
        this.modalCtrl = modalCtrl;
        this.configService = configService;
        this.accountService = accountService;
        this.vesselService = vesselService;
        this.translateContext = translateContext;
        this.context = context;
        this.observedLocationContext = observedLocationContext;
        this.network = network;
        this.showLandingTab = false;
        this.$landingTableType = new BehaviorSubject(undefined);
        this.$table = new BehaviorSubject(undefined);
        this.dbTimeZone = DateUtils.moment().tz();
        this.showRecorder = true;
        this.showObservers = true;
        this.canCopyLocally = false;
        this.showToolbar = true;
        this.showQualityForm = true;
        this.showOptionsMenu = true;
        this.toolbarColor = 'primary';
        this.defaultBackHref = '/observations';
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    get table() {
        return this.$table.value;
    }
    ngOnInit() {
        super.ngOnInit();
        this.registerSubscription(this.configService.config.subscribe(config => {
            if (!config)
                return;
            this.showRecorder = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_RECORDER);
            this.dbTimeZone = config.getProperty(CORE_CONFIG_OPTIONS.DB_TIMEZONE);
            this.markForCheck();
        }));
        // Detect embedded mode, from route params
        this.registerSubscription(this.route.queryParams
            .pipe(first())
            .subscribe(queryParams => {
            // Manage embedded mode
            const embedded = toBoolean(queryParams['embedded'], false);
            if (embedded) {
                this.showLandingTab = false;
                this.showOptionsMenu = false;
                this.showQualityForm = false;
                this.autoOpenNextTab = false; // Keep first tab
                this.toolbarColor = 'secondary';
                this.markForCheck();
            }
        }));
    }
    updateView(data, opts) {
        //return super.updateView(Object.freeze(data), opts);
        return super.updateView(data, opts);
    }
    updateViewState(data, opts) {
        super.updateViewState(data);
        // Update tabs state (show/hide)
        this.updateTabsState(data);
        if (this.aggregatedLandingsTable)
            this.aggregatedLandingsTable.updateCanEditDelete(isNotNil(data.validationDate));
    }
    updateTabsState(data) {
        // Enable landings tab
        this.showLandingTab = this.showLandingTab || (!this.isNewData || this.isOnFieldMode);
        // INFO CLT : #IMAGINE-614 / Set form to dirty in creation in order to manager errors on silent save (as done for update)
        if (this.isNewData && this.isOnFieldMode) {
            this.markAsDirty();
        }
        // Move to second tab
        if (this.showLandingTab && this.autoOpenNextTab && !this.isNewData && this.selectedTabIndex === 0) {
            this.selectedTabIndex = 1;
            this.tabGroup.realignInkBar();
            this.autoOpenNextTab = false; // Should switch only once
        }
    }
    onOpenLanding(row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!row)
                return;
            const saved = this.isOnFieldMode && this.dirty
                // If on field mode: try to save silently
                ? yield this.save(undefined)
                // If desktop mode: ask before save
                : yield this.saveIfDirtyAndConfirm();
            if (!saved)
                return; // Cannot save
            this.markAsLoading();
            try {
                yield this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/${row.currentData.id}`);
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    onNewLanding(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = this.isOnFieldMode && this.dirty
                // If on field mode: try to save silently
                ? yield this.save(event)
                // If desktop mode: ask before save
                : yield this.saveIfDirtyAndConfirm();
            if (!saved)
                return; // Cannot save
            this.markAsLoading();
            try {
                // Add landing using vessels modal
                if (this.addLandingUsingHistoryModal) {
                    const vessel = yield this.openSelectVesselModal();
                    if (vessel && this.landingsTable) {
                        const rankOrder = ((yield this.landingsTable.getMaxRankOrderOnVessel(vessel)) || 0) + 1;
                        yield this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/new?vessel=${vessel.id}&rankOrder=${rankOrder}`);
                    }
                }
                // Create landing without vessel selection
                else {
                    const rankOrder = ((yield this.landingsTable.getMaxRankOrder()) || 0) + 1;
                    yield this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/new?rankOrder=${rankOrder}`);
                }
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    onNewAggregatedLanding(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = this.isOnFieldMode && this.dirty
                // If on field mode: try to save silently
                ? yield this.save(event)
                // If desktop mode: ask before save
                : yield this.saveIfDirtyAndConfirm();
            if (!saved)
                return; // Cannot save
            this.markAsLoading();
            try {
                const vessel = yield this.openSelectVesselModal(true);
                if (vessel && this.aggregatedLandingsTable) {
                    yield this.aggregatedLandingsTable.addAggregatedRow(vessel);
                }
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    onNewTrip(row) {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = this.isOnFieldMode && this.dirty
                // If on field mode: try to save silently
                ? yield this.save(undefined)
                // If desktop mode: ask before save
                : yield this.saveIfDirtyAndConfirm();
            if (!saved)
                return; // Cannot save
            this.markAsLoading();
            try {
                const landing = row.currentData;
                yield this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/new?vessel=${landing.vesselSnapshot.id}&landing=${landing.id}`);
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    onOpenTrip(row) {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = this.isOnFieldMode && this.dirty
                // If on field mode: try to save silently
                ? yield this.save(undefined)
                // If desktop mode: ask before save
                : yield this.saveIfDirtyAndConfirm();
            if (!saved)
                return; // Cannot save
            this.markAsLoading();
            try {
                yield this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/${row.currentData.tripId}`);
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    openSelectVesselModal(excludeExistingVessels) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const programLabel = ((_a = this.aggregatedLandingsTable) === null || _a === void 0 ? void 0 : _a.programLabel) || this.programLabel || this.data.program.label;
            if (!this.data.startDateTime || !programLabel) {
                throw new Error('Root entity has no program and start date. Cannot open select vessels modal');
            }
            // Prepare vessel filter's value
            const excludeVesselIds = (toBoolean(excludeExistingVessels, false) && this.aggregatedLandingsTable
                && (yield this.aggregatedLandingsTable.vesselIdsAlreadyPresent())) || [];
            const showOfflineVessels = EntityUtils.isLocal(this.data) && (yield this.vesselService.countAll({ synchronizationStatus: 'DIRTY' })) > 0;
            const defaultVesselSynchronizationStatus = this.network.offline || showOfflineVessels ? 'DIRTY' : 'SYNC';
            // Prepare landing's filter
            const startDate = this.data.startDateTime.clone().add(-15, 'days');
            const endDate = this.data.startDateTime.clone();
            const landingFilter = LandingFilter.fromObject({
                programLabel,
                startDate,
                endDate,
                locationId: ReferentialUtils.isNotEmpty(this.data.location) ? this.data.location.id : undefined,
                groupByVessel: (this.landingsTable && this.landingsTable.isTripDetailEditor) || (isNotNil(this.aggregatedLandingsTable)),
                excludeVesselIds,
                synchronizationStatus: 'SYNC' // only remote entities. This is required to read 'Remote#LandingVO' local storage
            });
            const modal = yield this.modalCtrl.create({
                component: SelectVesselsForDataModal,
                componentProps: {
                    allowMultiple: false,
                    landingFilter,
                    vesselFilter: {
                        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
                        onlyWithRegistration: true
                    },
                    allowAddNewVessel: this.allowAddNewVessel,
                    showVesselTypeColumn: this.showVesselType,
                    showBasePortLocationColumn: this.showVesselBasePortLocation,
                    showSamplesCountColumn: (_b = this.landingsTable) === null || _b === void 0 ? void 0 : _b.showSamplesCountColumn,
                    defaultVesselSynchronizationStatus,
                    showOfflineVessels,
                    maxDateVesselRegistration: endDate,
                },
                keyboardClose: true,
                cssClass: 'modal-large'
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data } = yield modal.onDidDismiss();
            // If modal return a landing, use it
            if (data && data[0] instanceof Landing) {
                console.debug('[observed-location] Vessel selection modal result:', data);
                return data[0].vesselSnapshot;
            }
            if (data && data[0] instanceof VesselSnapshot) {
                console.debug('[observed-location] Vessel selection modal result:', data);
                const vessel = data[0];
                if (excludeVesselIds.includes(data.id)) {
                    yield Alerts.showError('AGGREGATED_LANDING.VESSEL_ALREADY_PRESENT', this.alertCtrl, this.translate);
                    return;
                }
                return vessel;
            }
            else {
                console.debug('[observed-location] Vessel selection modal was cancelled');
            }
        });
    }
    addRow(event) {
        if (this.landingsTable) {
            this.landingsTable.addRow(event);
        }
        else if (this.aggregatedLandingsTable) {
            this.aggregatedLandingsTable.addRow(event);
        }
    }
    openReport(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.dirty) {
                const data = yield this.saveAndGetDataIfValid();
                if (!data)
                    return; // Cancel
            }
            return this.router.navigateByUrl(this.computePageUrl(this.data.id) + '/report');
        });
    }
    copyLocally() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.data)
                return;
            // Copy the trip
            yield this.dataService.copyLocallyById(this.data.id, { withLanding: true, displaySuccessToast: true });
        });
    }
    /* -- protected methods -- */
    setProgram(program) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!program)
                return; // Skip
            if (this.debug)
                console.debug(`[observed-location] Program ${program.label} loaded, with properties: `, program.properties);
            // Update the context
            if (this.observedLocationContext.program !== program) {
                console.debug('TODO setting context program', program.label);
                this.observedLocationContext.setValue('program', program);
            }
            try {
                this.observedLocationForm.showEndDateTime = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_END_DATE_TIME_ENABLE);
                this.observedLocationForm.showStartTime = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_START_TIME_ENABLE);
                this.observedLocationForm.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.OBSERVED_LOCATION_LOCATION_LEVEL_IDS);
                this.observedLocationForm.showObservers = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_OBSERVERS_ENABLE);
                if (!this.observedLocationForm.showObservers && ((_a = this.data) === null || _a === void 0 ? void 0 : _a.observers)) {
                    this.data.observers = []; // make sure to reset data observers, if any
                }
                const aggregatedLandings = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_ENABLE);
                if (aggregatedLandings) {
                    // Force some date properties
                    this.observedLocationForm.timezone = this.dbTimeZone;
                    this.observedLocationForm.showEndDateTime = true;
                    this.observedLocationForm.showStartTime = false;
                    this.observedLocationForm.showEndTime = false;
                    this.observedLocationForm.startDateDay = program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_START_DAY);
                    this.observedLocationForm.forceDurationDays = program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT);
                }
                else {
                    this.observedLocationForm.timezone = null; // Use local TZ for dates
                }
                this.allowAddNewVessel = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_CREATE_VESSEL_ENABLE);
                this.addLandingUsingHistoryModal = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_SHOW_LANDINGS_HISTORY);
                let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
                i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
                this.i18nContext.suffix = i18nSuffix;
                this.enableReport = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_REPORT_ENABLE);
                this.landingEditor = program.getProperty(ProgramProperties.LANDING_EDITOR);
                this.showVesselType = program.getPropertyAsBoolean(ProgramProperties.VESSEL_TYPE_ENABLE);
                this.showVesselBasePortLocation = program.getPropertyAsBoolean(ProgramProperties.LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE);
                this.$landingTableType.next(aggregatedLandings ? 'aggregated' : 'legacy');
                // Wait the expected table (set using ngInit - see template)
                const table$ = this.$table.pipe(filter(t => aggregatedLandings ? t instanceof AggregatedLandingsTable : t instanceof LandingsTable));
                const table = yield firstNotNilPromise(table$, { stop: this.destroySubject });
                // Configure table
                if (aggregatedLandings) {
                    console.debug('[observed-location] Init aggregated landings table:', table);
                    const aggregatedLandingsTable = table;
                    aggregatedLandingsTable.timeZone = this.dbTimeZone;
                    aggregatedLandingsTable.nbDays = program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT);
                    aggregatedLandingsTable.programLabel = program.getProperty(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM);
                }
                else {
                    console.debug('[observed-location] Init landings table:', table);
                    const landingsTable = table;
                    landingsTable.i18nColumnSuffix = i18nSuffix;
                    landingsTable.detailEditor = this.landingEditor;
                    landingsTable.showDateTimeColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_DATE_TIME_ENABLE);
                    landingsTable.showVesselTypeColumn = this.showVesselType;
                    landingsTable.showVesselBasePortLocationColumn = this.showVesselBasePortLocation;
                    landingsTable.showObserversColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_OBSERVERS_ENABLE);
                    landingsTable.showCreationDateColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_CREATION_DATE_ENABLE);
                    landingsTable.showRecorderPersonColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_RECORDER_PERSON_ENABLE);
                    landingsTable.showLocationColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_LOCATION_ENABLE);
                    landingsTable.showSamplesCountColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_SAMPLES_COUNT_ENABLE);
                    landingsTable.includedPmfmIds = program.getPropertyAsNumbers(ProgramProperties.LANDING_COLUMNS_PMFM_IDS);
                    this.showLandingTab = true;
                }
                this.addChildForm(() => table);
                this.markAsReady();
                // Listen program, to reload if changes
                if (this.network.online)
                    this.startListenProgramRemoteChanges(program);
            }
            catch (err) {
                this.setError(err);
            }
        });
    }
    onNewEntity(data, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[observed-location] New entity: applying defaults...');
            // If is on field mode, fill default values
            if (this.isOnFieldMode) {
                if (!this.observedLocationForm.showStartTime && this.observedLocationForm.timezone) {
                    data.startDateTime = moment().tz(this.observedLocationForm.timezone)
                        .startOf('day').utc();
                }
                else {
                    data.startDateTime = moment();
                }
                // Set current user as observers (if enable)
                if (this.showObservers) {
                    const user = this.accountService.account.asPerson();
                    data.observers.push(user);
                }
                this.showLandingTab = true;
                // Listen first opening the operations tab, then save
                this.registerSubscription(this.tabGroup.selectedTabChange
                    .pipe(filter(event => event.index === ObservedLocationPageTabs.LANDINGS), first(), tap(() => this.save()))
                    .subscribe());
            }
            // Fill defaults, from table's filter. Implemented for all usage mode, to fix #IMAGINE-648
            const tableId = this.queryParams['tableId'];
            const searchFilter = tableId && this.settings.getPageSettings(tableId, ObservedLocationsPageSettingsEnum.FILTER_KEY);
            if (searchFilter) {
                // Synchronization status
                if (searchFilter.synchronizationStatus && searchFilter.synchronizationStatus !== 'SYNC') {
                    data.synchronizationStatus = 'DIRTY';
                }
                // program
                if (searchFilter.program && searchFilter.program.label) {
                    data.program = ReferentialRef.fromObject(searchFilter.program);
                }
                // Location
                if (searchFilter.location) {
                    data.location = ReferentialRef.fromObject(searchFilter.location);
                }
            }
            // Set contextual program, if any
            if (!data.program) {
                const contextualProgram = this.context.getValue('program');
                if (contextualProgram === null || contextualProgram === void 0 ? void 0 : contextualProgram.label) {
                    data.program = ReferentialRef.fromObject(contextualProgram);
                }
            }
            // Propagate program
            const programLabel = (_a = data.program) === null || _a === void 0 ? void 0 : _a.label;
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
            this.canCopyLocally = this.accountService.isAdmin() && EntityUtils.isRemoteId(data === null || data === void 0 ? void 0 : data.id);
        });
    }
    setValue(data) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            console.info('[observed-location] Setting data', data);
            if (!this.isNewData) {
                // Wait ready only on existing data (must not wait table because program is not set yet)
                yield this.ready();
            }
            // Set data to form
            this.observedLocationForm.value = data;
            if (!this.isNewData) {
                // Propagate to table parent
                (_a = this.table) === null || _a === void 0 ? void 0 : _a.setParent(data);
            }
        });
    }
    getValue() {
        const _super = Object.create(null, {
            getValue: { get: () => super.getValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return yield _super.getValue.call(this);
        });
    }
    get form() {
        return this.observedLocationForm.form;
    }
    computeUsageMode(data) {
        return this.settings.isUsageMode('FIELD') || data.synchronizationStatus === 'DIRTY' ? 'FIELD' : 'DESK';
    }
    registerForms() {
        this.addChildForms([
            this.observedLocationForm,
            // Use landings table as child, only if editable
            //() => this.landingsTable?.canEdit && this.landingsTable,
            //() => this.aggregatedLandingsTable
        ]);
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // new data
            if (this.isNewData) {
                return this.translate.get('OBSERVED_LOCATION.NEW.TITLE').toPromise();
            }
            // Make sure page is ready (e.g. i18nContext has been loaded, in setProgram())
            yield this.ready();
            // Existing data
            return this.translateContext.get(`OBSERVED_LOCATION.EDIT.TITLE`, this.i18nContext.suffix, {
                location: data.location && (data.location.name || data.location.label),
                dateTime: data.startDateTime && this.dateFormat.transform(data.startDateTime)
            }).toPromise();
        });
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { icon: 'location' });
        });
    }
    onEntitySaved(data) {
        const _super = Object.create(null, {
            onEntitySaved: { get: () => super.onEntitySaved }
        });
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onEntitySaved.call(this, data);
            // Save landings table, when editable
            if (((_a = this.landingsTable) === null || _a === void 0 ? void 0 : _a.dirty) && this.landingsTable.canEdit) {
                yield this.landingsTable.save();
            }
            else if ((_b = this.aggregatedLandingsTable) === null || _b === void 0 ? void 0 : _b.dirty) {
                yield this.aggregatedLandingsTable.save();
            }
        });
    }
    getFirstInvalidTabIndex() {
        var _a;
        return this.observedLocationForm.invalid ? 0
            : (((_a = this.table) === null || _a === void 0 ? void 0 : _a.invalid) ? 1
                : -1);
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    ViewChild('observedLocationForm', { static: true }),
    __metadata("design:type", ObservedLocationForm)
], ObservedLocationPage.prototype, "observedLocationForm", void 0);
__decorate([
    ViewChild('landingsTable'),
    __metadata("design:type", LandingsTable)
], ObservedLocationPage.prototype, "landingsTable", void 0);
__decorate([
    ViewChild('aggregatedLandingsTable'),
    __metadata("design:type", AggregatedLandingsTable)
], ObservedLocationPage.prototype, "aggregatedLandingsTable", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationPage.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationPage.prototype, "showQualityForm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationPage.prototype, "showOptionsMenu", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], ObservedLocationPage.prototype, "toolbarColor", void 0);
ObservedLocationPage = ObservedLocationPage_1 = __decorate([
    Component({
        selector: 'app-observed-location-page',
        templateUrl: './observed-location.page.html',
        styleUrls: ['./observed-location.page.scss'],
        animations: [fadeInOutAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush,
        providers: [
            { provide: APP_DATA_ENTITY_EDITOR, useExisting: ObservedLocationPage_1 }
        ],
    }),
    __metadata("design:paramtypes", [Injector,
        ObservedLocationService,
        ModalController,
        ConfigService,
        AccountService,
        VesselService,
        TranslateContextService,
        ContextService,
        ObservedLocationContextService,
        NetworkService])
], ObservedLocationPage);
export { ObservedLocationPage };
//# sourceMappingURL=observed-location.page.js.map