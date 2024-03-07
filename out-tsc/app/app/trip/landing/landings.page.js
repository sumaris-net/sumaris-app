import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { UntypedFormBuilder } from '@angular/forms';
import { Alerts, ConfigService, isNilOrBlank, isNotEmptyArray, isNotNil, isNotNilOrBlank, isNotNilOrNaN, PersonService, PersonUtils, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, SharedValidators, slideUpDownAnimation, StatusIds, toBoolean, toNumber, } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { ObservedLocation } from '../observedlocation/observed-location.model';
import { AppRootDataTable, AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
import { OBSERVED_LOCATION_FEATURE_NAME, TRIP_CONFIG_OPTIONS } from '../trip.config';
import { environment } from '@environments/environment';
import { BehaviorSubject } from 'rxjs';
import { ObservedLocationOfflineModal } from '../observedlocation/offline/observed-location-offline.modal';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import { ObservedLocationFilter } from '../observedlocation/observed-location.filter';
import { filter } from 'rxjs/operators';
import { DataQualityStatusEnum, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { ContextService } from '@app/shared/context.service';
import { Landing } from '@app/trip/landing/landing.model';
import { LandingFilter } from '@app/trip/landing/landing.filter';
import { LandingService } from '@app/trip/landing/landing.service';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { Program } from '@app/referential/services/model/program.model';
import { SelectProgramModal } from '@app/referential/program/select-program.modal';
import { LANDING_I18N_PMFM_PREFIX, LANDING_RESERVED_END_COLUMNS, LANDING_TABLE_DEFAULT_I18N_PREFIX } from '@app/trip/landing/landings.table';
import { PMFM_ID_REGEXP, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { TripService } from '@app/trip/trip/trip.service';
import { ObservedLocationService } from '@app/trip/observedlocation/observed-location.service';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { ObservedLocationsPageSettingsEnum } from '@app/trip/observedlocation/table/observed-locations.page';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
export const LandingsPageSettingsEnum = {
    PAGE_ID: 'landings',
    FILTER_KEY: AppRootTableSettingsEnum.FILTER_KEY,
    FEATURE_NAME: OBSERVED_LOCATION_FEATURE_NAME,
};
export const LANDING_PAGE_RESERVED_START_COLUMNS = [
    'quality',
    'program',
    'vessel',
    'vesselType',
    'vesselBasePortLocation',
    'location',
    'dateTime',
    'observers',
    'creationDate',
    'recorderPerson',
    'samplesCount'
];
export const LANDING_PAGE_RESERVED_END_COLUMNS = LANDING_RESERVED_END_COLUMNS;
let LandingsPage = class LandingsPage extends AppRootDataTable {
    constructor(injector, dataService, personService, referentialRefService, programRefService, strategyRefService, vesselSnapshotService, observedLocationService, tripService, formBuilder, configService, pmfmNamePipe, context, cd) {
        super(injector, Landing, LandingFilter, [...LANDING_PAGE_RESERVED_START_COLUMNS, ...LANDING_RESERVED_END_COLUMNS], dataService, null, {
            reservedStartColumns: LANDING_PAGE_RESERVED_START_COLUMNS,
            reservedEndColumns: LANDING_PAGE_RESERVED_END_COLUMNS,
            i18nColumnPrefix: LANDING_TABLE_DEFAULT_I18N_PREFIX,
            i18nPmfmPrefix: LANDING_I18N_PMFM_PREFIX,
            watchAllOptions: {
                computeRankOrder: false, // Not need, because this table use the landing 'id'
                //withObservedLocation: true, // Need to get observers
            }
        });
        this.personService = personService;
        this.referentialRefService = referentialRefService;
        this.programRefService = programRefService;
        this.strategyRefService = strategyRefService;
        this.vesselSnapshotService = vesselSnapshotService;
        this.observedLocationService = observedLocationService;
        this.tripService = tripService;
        this.formBuilder = formBuilder;
        this.configService = configService;
        this.pmfmNamePipe = pmfmNamePipe;
        this.context = context;
        this.cd = cd;
        this.$title = new BehaviorSubject(undefined);
        this.$observedLocationTitle = new BehaviorSubject(undefined);
        this.$pmfms = new BehaviorSubject([]);
        this.$detailProgram = new BehaviorSubject(undefined); // Program to use to create new landing
        this.statusList = DataQualityStatusList;
        this.statusById = DataQualityStatusEnum;
        this.selectedSegment = '';
        this.showTitleSegment = false;
        this.showFilterProgram = true;
        this.showFilterStrategy = false; // Can be override by setProgram() or resetProgram()
        this.showFilterVessel = true;
        this.showFilterLocation = true;
        this.showFilterPeriod = true;
        this.showFilterSampleLabel = false; // Can be override by setProgram() or resetProgram()
        this.showFilterSampleTagId = false; // Can be override by setProgram() or resetProgram()
        this.showQuality = true;
        this.showRecorder = true;
        this.showObservers = true;
        this.inlineEdition = false;
        this.i18nPmfmPrefix = this.options.i18nPmfmPrefix;
        this.filterForm = formBuilder.group({
            program: [null, SharedValidators.entity],
            strategy: [null, SharedValidators.entity],
            vesselSnapshot: [null, SharedValidators.entity],
            location: [null, SharedValidators.entity],
            startDate: [null, SharedValidators.validDate],
            endDate: [null, SharedValidators.validDate],
            synchronizationStatus: [null],
            recorderDepartment: [null, SharedValidators.entity],
            recorderPerson: [null, SharedValidators.entity],
            observers: formBuilder.array([[null, SharedValidators.entity]]),
            sampleLabel: [null],
            sampleTagId: [null]
        });
        this.autoLoad = false;
        this.defaultSortBy = 'dateTime';
        this.defaultSortDirection = 'desc';
        this.settingsId = LandingsPageSettingsEnum.PAGE_ID; // Fixed value, to be able to reuse it in the editor page
        this.featureName = LandingsPageSettingsEnum.FEATURE_NAME; // Same feature as Observed locations
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    get filterObserversForm() {
        return this.filterForm.controls.observers;
    }
    get filterDataQualityControl() {
        return this.filterForm.controls.dataQualityStatus;
    }
    set showProgramColumn(value) {
        this.setShowColumn('program', value);
    }
    get showProgramColumn() {
        return this.getShowColumn('program');
    }
    set showVesselTypeColumn(value) {
        this.setShowColumn('vesselType', value);
    }
    get showVesselTypeColumn() {
        return this.getShowColumn('vesselType');
    }
    set showVesselBasePortLocationColumn(value) {
        this.setShowColumn('vesselBasePortLocation', value);
    }
    get showVesselBasePortLocationColumn() {
        return this.getShowColumn('vesselBasePortLocation');
    }
    set showObserversColumn(value) {
        this.setShowColumn('observers', value);
    }
    get showObserversColumn() {
        return this.getShowColumn('observers');
    }
    set showCreationDateColumn(value) {
        this.setShowColumn('creationDate', value);
    }
    get showCreationDateColumn() {
        return this.getShowColumn('creationDate');
    }
    set showRecorderPersonColumn(value) {
        this.setShowColumn('recorderPerson', value);
    }
    get showRecorderPersonColumn() {
        return this.getShowColumn('recorderPerson');
    }
    set showDateTimeColumn(value) {
        this.setShowColumn('dateTime', value);
    }
    get showDateTimeColumn() {
        return this.getShowColumn('dateTime');
    }
    set showSamplesCountColumn(value) {
        this.setShowColumn('samplesCount', value);
    }
    get showSamplesCountColumn() {
        return this.getShowColumn('samplesCount');
    }
    set showLocationColumn(value) {
        this.setShowColumn('location', value);
    }
    get showLocationColumn() {
        return this.getShowColumn('location');
    }
    get pmfms() {
        return this.$pmfms.value;
    }
    set pmfms(pmfms) {
        this.$pmfms.next(pmfms);
    }
    ngOnInit() {
        super.ngOnInit();
        // Qualitative values display attributes
        this.qualitativeValueAttributes = this.settings.getFieldDisplayAttributes('qualitativeValue', ['label', 'name']);
        // Programs combo (filter)
        this.registerAutocompleteField('program', {
            service: this.programRefService,
            filter: {
                acquisitionLevelLabels: [AcquisitionLevelCodes.OBSERVED_LOCATION, AcquisitionLevelCodes.LANDING],
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            },
            mobile: this.mobile
        });
        // Strategy combo (filter)
        this.registerAutocompleteField('strategy', {
            suggestFn: (value, filter) => {
                const program = this.filterForm.get('program').value;
                return this.strategyRefService.suggest(value, Object.assign(Object.assign({}, filter), { levelId: program === null || program === void 0 ? void 0 : program.id }));
            },
            attributes: ['label'],
            filter: {
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            },
            mobile: this.mobile
        });
        // Combo: vessels
        this.vesselSnapshotAttributes = this.settings.getFieldDisplayAttributes('vesselSnapshot', VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES);
        this.vesselSnapshotService.getAutocompleteFieldOptions().then(opts => {
            this.registerAutocompleteField('vesselSnapshot', opts);
            this.vesselSnapshotAttributes = opts.attributes;
        });
        // Locations combo (filter)
        this.registerAutocompleteField('location', {
            service: this.referentialRefService,
            filter: {
                entityName: 'Location',
                levelIds: [LocationLevelIds.AUCTION, LocationLevelIds.PORT]
            },
            mobile: this.mobile
        });
        // Combo: recorder department
        this.registerAutocompleteField('department', {
            service: this.referentialRefService,
            filter: {
                entityName: 'Department'
            },
            mobile: this.mobile
        });
        // Combo: recorder person
        const personAttributes = this.settings.getFieldDisplayAttributes('person', ['lastName', 'firstName', 'department.name']);
        this.registerAutocompleteField('person', {
            service: this.personService,
            filter: {
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
            },
            attributes: personAttributes,
            displayWith: PersonUtils.personToString,
            mobile: this.mobile
        });
        // Combo: observers
        this.registerAutocompleteField('observers', {
            service: this.personService,
            filter: {
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
            },
            attributes: personAttributes,
            displayWith: PersonUtils.personToString,
            mobile: this.mobile
        });
        this.registerSubscription(this.configService.config
            .pipe(filter(isNotNil))
            .subscribe(config => this.onConfigLoaded(config)));
        // Clear the context
        this.resetContext();
    }
    setFilter(filter, opts) {
        const _super = Object.create(null, {
            setFilter: { get: () => super.setFilter }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Program
            const programLabel = (_a = filter === null || filter === void 0 ? void 0 : filter.program) === null || _a === void 0 ? void 0 : _a.label;
            if (isNotNilOrBlank(programLabel)) {
                const program = yield this.programRefService.loadByLabel(programLabel);
                yield this.setProgram(program);
            }
            else {
                // Check if user can access more than one program
                const { data, total } = yield this.programRefService.loadAll(0, 1, null, null, {
                    statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
                }, { withTotal: true });
                if (isNotEmptyArray(data) && total === 1) {
                    const program = data[0];
                    yield this.setProgram(program);
                }
                else {
                    yield this.resetProgram();
                }
            }
            _super.setFilter.call(this, filter, opts);
        });
    }
    /* -- protected function -- */
    onConfigLoaded(config) {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('[landings] Init using config', config);
            // Show title segment ? (always disable on mobile)
            this.showTitleSegment = !this.mobile && config.getPropertyAsBoolean(TRIP_CONFIG_OPTIONS.OBSERVED_LOCATION_LANDINGS_TAB_ENABLE);
            // title
            const observedLocationTitle = config.getProperty(TRIP_CONFIG_OPTIONS.OBSERVED_LOCATION_NAME);
            this.$observedLocationTitle.next(observedLocationTitle);
            // Quality
            this.showQuality = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.QUALITY_PROCESS_ENABLE);
            this.setShowColumn('quality', this.showQuality, { emitEvent: false });
            // Recorder
            this.showRecorder = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_RECORDER);
            this.setShowColumn('recorderPerson', this.showRecorder, { emitEvent: false });
            // Observer
            this.showObservers = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_OBSERVERS);
            this.setShowColumn('observers', this.showObservers, { emitEvent: false });
            // Manage filters display according to config settings.
            this.showFilterProgram = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_FILTER_PROGRAM);
            this.showFilterLocation = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_FILTER_LOCATION);
            this.showFilterPeriod = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_FILTER_PERIOD);
            // Restore filter from settings, or load all
            yield this.restoreFilterOrLoad();
            this.updateColumns();
        });
    }
    setProgram(program) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(program === null || program === void 0 ? void 0 : program.label))
                throw new Error('Invalid program');
            console.debug('[landings] Init using program', program);
            // I18n suffix
            let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
            this.i18nColumnSuffix = i18nSuffix;
            // Title
            const title = this.translateContext.instant(this.i18nColumnPrefix + 'TITLE', this.i18nColumnSuffix);
            this.$title.next(title);
            this.showVesselTypeColumn = program.getPropertyAsBoolean(ProgramProperties.VESSEL_TYPE_ENABLE);
            this.showVesselBasePortLocationColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE);
            this.showCreationDateColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_CREATION_DATE_ENABLE);
            this.showLocationColumn = this.showFilterLocation || program.getPropertyAsBoolean(ProgramProperties.LANDING_LOCATION_ENABLE);
            this.showObserversColumn = this.showObservers || program.getPropertyAsBoolean(ProgramProperties.LANDING_OBSERVERS_ENABLE);
            this.showRecorderPersonColumn = this.showRecorder || program.getPropertyAsBoolean(ProgramProperties.LANDING_RECORDER_PERSON_ENABLE);
            this.showSamplesCountColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_SAMPLES_COUNT_ENABLE);
            this.showFilterStrategy = program.getPropertyAsBoolean(ProgramProperties.LANDING_STRATEGY_ENABLE);
            this.showFilterSampleLabel = program.getPropertyAsBoolean(ProgramProperties.LANDING_SAMPLE_LABEL_ENABLE);
            // Location filter
            const locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.OBSERVED_LOCATION_LOCATION_LEVEL_IDS);
            this.autocompleteFields.location.filter.levelIds = isNotEmptyArray(locationLevelIds) ? locationLevelIds : undefined;
            // Landing pmfms
            const includedPmfmIds = program.getPropertyAsNumbers(ProgramProperties.LANDING_COLUMNS_PMFM_IDS);
            const landingPmfms = yield this.programRefService.loadProgramPmfms(program === null || program === void 0 ? void 0 : program.label, {
                acquisitionLevel: AcquisitionLevelCodes.LANDING
            });
            const columnPmfms = landingPmfms.filter(p => p.required || (includedPmfmIds === null || includedPmfmIds === void 0 ? void 0 : includedPmfmIds.includes(p.id)));
            this.$pmfms.next(columnPmfms);
            const samplePmfms = yield this.programRefService.loadProgramPmfms(program === null || program === void 0 ? void 0 : program.label, {
                acquisitionLevels: [AcquisitionLevelCodes.SAMPLE, AcquisitionLevelCodes.INDIVIDUAL_MONITORING, AcquisitionLevelCodes.INDIVIDUAL_RELEASE]
            });
            this.showFilterSampleTagId = (samplePmfms === null || samplePmfms === void 0 ? void 0 : samplePmfms.some(PmfmUtils.isTagId)) || false;
            this.$detailProgram.next(program);
            if (this.loaded)
                this.updateColumns();
        });
    }
    resetProgram() {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[landings] Reset filter program');
            this.showVesselTypeColumn = toBoolean(ProgramProperties.VESSEL_TYPE_ENABLE.defaultValue, false);
            this.showVesselBasePortLocationColumn = toBoolean(ProgramProperties.LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE.defaultValue, false);
            this.showCreationDateColumn = toBoolean(ProgramProperties.LANDING_CREATION_DATE_ENABLE.defaultValue, false);
            this.showLocationColumn = this.showFilterLocation || toBoolean(ProgramProperties.LANDING_LOCATION_ENABLE.defaultValue, false);
            this.showObserversColumn = this.showObservers || toBoolean(ProgramProperties.LANDING_OBSERVERS_ENABLE.defaultValue, false);
            this.showRecorderPersonColumn = this.showRecorder || toBoolean(ProgramProperties.LANDING_RECORDER_PERSON_ENABLE.defaultValue, false);
            this.showSamplesCountColumn = toBoolean(ProgramProperties.LANDING_SAMPLES_COUNT_ENABLE.defaultValue, false);
            this.showFilterStrategy = toBoolean(ProgramProperties.LANDING_STRATEGY_ENABLE.defaultValue, false);
            this.showFilterSampleLabel = toBoolean(ProgramProperties.LANDING_SAMPLE_LABEL_ENABLE.defaultValue, false);
            this.showFilterSampleTagId = false;
            // Reset location filter
            delete this.autocompleteFields.location.filter.levelIds;
            this.$title.next(this.i18nColumnPrefix + 'TITLE');
            this.$pmfms.next([]);
            this.$detailProgram.next(undefined);
            if (this.loaded)
                this.updateColumns();
        });
    }
    restoreFilterOrLoad(opts) {
        const _super = Object.create(null, {
            restoreFilterOrLoad: { get: () => super.restoreFilterOrLoad }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Load by observed location
            const observedLocationId = this.route.snapshot.paramMap.get('observedLocationId');
            if (isNotNilOrNaN(observedLocationId)) {
                const observedLocation = yield this.observedLocationService.load(+observedLocationId);
                yield this.setFilter({ observedLocationId: +observedLocationId, program: observedLocation.program }, Object.assign({ emitEvent: true }, opts));
                return;
            }
            // Load by trip
            const tripId = this.route.snapshot.paramMap.get('tripId');
            if (isNotNilOrNaN(tripId)) {
                const trip = yield this.tripService.load(+tripId);
                yield this.setFilter({ tripId: +tripId, program: trip.program }, Object.assign({ emitEvent: true }, opts));
                return;
            }
            // For to use queryParams, if any
            const { q } = this.route.snapshot.queryParams;
            if (isNotNilOrBlank(q)) {
                return _super.restoreFilterOrLoad.call(this, Object.assign(Object.assign({}, opts), { sources: ['queryParams'] }));
            }
            // Default implementation
            return _super.restoreFilterOrLoad.call(this, opts);
        });
    }
    getDisplayColumns() {
        const pmfms = this.pmfms;
        if (!pmfms)
            return this.columns;
        const userColumns = this.getUserColumns();
        const pmfmColumnNames = pmfms
            //.filter(p => p.isMandatory || !userColumns || userColumns.includes(p.pmfmId.toString()))
            .filter(p => !p.hidden)
            .map(p => p.id.toString());
        const startColumns = (this.options && this.options.reservedStartColumns || []).filter(c => !userColumns || userColumns.includes(c));
        const endColumns = (this.options && this.options.reservedEndColumns || []).filter(c => !userColumns || userColumns.includes(c));
        return RESERVED_START_COLUMNS
            .concat(startColumns)
            .concat(pmfmColumnNames)
            .concat(endColumns)
            .concat(RESERVED_END_COLUMNS)
            // Remove columns to hide
            .filter(column => !this.excludesColumns.includes(column));
        // DEBUG
        //console.debug("[measurement-table] Updating columns: ", this.displayedColumns)
        //if (!this.loading) this.markForCheck();
    }
    onSegmentChanged(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = event.detail.value;
            if (isNilOrBlank(path))
                return; // Skip if no path
            this.markAsLoading();
            // Prepare filter for next page
            const nextFilter = ObservedLocationFilter.fromLandingFilter(this.asFilter());
            const json = (nextFilter === null || nextFilter === void 0 ? void 0 : nextFilter.asObject({ keepTypename: true })) || {};
            yield this.settings.savePageSetting(ObservedLocationsPageSettingsEnum.PAGE_ID, json, ObservedLocationsPageSettingsEnum.FILTER_KEY);
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                yield this.navController.navigateRoot(path, { animated: false });
                // Reset the selected segment
                this.selectedSegment = '';
                this.markAsLoaded();
            }), 200);
        });
    }
    /**
     * Action triggered when user swipes
     */
    onSwipeTab(event) {
        // DEBUG
        // if (this.debug) console.debug("[landings] onSwipeTab()");
        // Skip, if not a valid swipe event
        if (!event
            || event.defaultPrevented || (event.srcEvent && event.srcEvent.defaultPrevented)
            || event.pointerType !== 'touch') {
            return false;
        }
        this.toggleSynchronizationStatus();
        return true;
    }
    openRow(id, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            if (this.onOpenRow.observers.length) {
                this.onOpenRow.emit(row);
                return true;
            }
            const data = Landing.fromObject(row.currentData);
            // Get the detail program
            const program = yield this.getDetailProgram(data);
            if (!program)
                return false; // User cancelled
            // Get the detail editor
            const editor = program.getProperty(ProgramProperties.LANDING_EDITOR);
            console.debug('[landings] Opening a landing, using editor: ' + editor);
            return yield this.navController.navigateForward([editor, id], {
                relativeTo: this.route,
                queryParams: {
                    parent: AcquisitionLevelCodes.OBSERVED_LOCATION
                }
            });
        });
    }
    openNewRowDetail(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            if (this.onNewRow.observed) {
                this.onNewRow.emit(event);
                return true;
            }
            // Get the detail program
            const program = yield this.getDetailProgram();
            if (!program)
                return false; // User cancelled
            // Get the detail editor
            const editor = program.getProperty(ProgramProperties.LANDING_EDITOR);
            console.debug('[landings] Opening new landing, using editor: ' + editor);
            return yield this.navController.navigateForward([editor, 'new'], {
                relativeTo: this.route,
                queryParams: {
                    program: program === null || program === void 0 ? void 0 : program.label,
                    parent: AcquisitionLevelCodes.OBSERVED_LOCATION,
                    tableId: this.settingsId
                }
            });
        });
    }
    openTrashModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[landings] Opening trash modal...');
            // TODO BLA
            /*const modal = await this.modalCtrl.create({
              component: TripTrashModal,
              componentProps: {
                synchronizationStatus: this.filter.synchronizationStatus
              },
              keyboardClose: true,
              cssClass: 'modal-large'
            });
        
            // Open the modal
            await modal.present();
        
            // On dismiss
            const res = await modal.onDidDismiss();
            if (!res) return; // CANCELLED*/
        });
    }
    prepareOfflineMode(event, opts) {
        const _super = Object.create(null, {
            prepareOfflineMode: { get: () => super.prepareOfflineMode }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (this.importing)
                return; // Skip
            if (event) {
                const feature = this.settings.getOfflineFeature(this.featureName) || {
                    name: this.featureName
                };
                const value = Object.assign(Object.assign({}, this.filter), feature.filter);
                const modal = yield this.modalCtrl.create({
                    component: ObservedLocationOfflineModal,
                    componentProps: {
                        value
                    }, keyboardClose: true
                });
                // Open the modal
                modal.present();
                // Wait until closed
                const { data, role } = yield modal.onDidDismiss();
                if (!data || role === 'cancel')
                    return; // User cancelled
                // Update feature filter, and save it into settings
                feature.filter = data;
                this.settings.saveOfflineFeature(feature);
                // DEBUG
                console.debug('[observed-location-table] Will prepare offline mode, using filter:', feature.filter);
            }
            return _super.prepareOfflineMode.call(this, event, opts);
        });
    }
    deleteSelection(event, opts) {
        const _super = Object.create(null, {
            deleteSelection: { get: () => super.deleteSelection }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const rowsToDelete = this.selection.selected;
            const landingIds = (rowsToDelete || [])
                .map(row => row.currentData)
                .map(ObservedLocation.fromObject)
                .map(o => o.id);
            // ask confirmation if one landing has samples (with tagId)
            if (isNotEmptyArray(landingIds) && (!opts || opts.interactive !== false)) {
                const hasSample = yield this._dataService.hasSampleWithTagId(landingIds);
                if (hasSample) {
                    const messageKey = landingIds.length === 1
                        ? 'OBSERVED_LOCATION.LANDING.CONFIRM.DELETE_ONE_HAS_SAMPLE'
                        : 'OBSERVED_LOCATION.LANDING.CONFIRM.DELETE_MANY_HAS_SAMPLE';
                    const confirmed = yield Alerts.askConfirmation(messageKey, this.alertCtrl, this.translate, event);
                    if (!confirmed)
                        return; // skip
                }
            }
            // Use inherited function, when no sample
            return _super.deleteSelection.call(this, event, { interactive: false /*already confirmed*/ });
        });
    }
    get canUserCancelOrDelete() {
        // IMAGINE-632: User can only delete landings or samples created by himself or on which he is defined as observer
        // Cannot delete if not connected
        if (!this.accountService.isLogin() || this.selection.isEmpty()) {
            return false;
        }
        // When connected user is an admin
        if (this.accountService.isAdmin()) {
            return true;
        }
        const user = this.accountService.person;
        // Find a row that user CANNOT delete
        const invalidRow = this.selection.selected
            .find(row => {
            var _a;
            const entity = row.currentData;
            // When observed location has been recorded by connected user
            if (user.id === ((_a = entity === null || entity === void 0 ? void 0 : entity.recorderPerson) === null || _a === void 0 ? void 0 : _a.id)) {
                return false; // OK
            }
            // When connected user is in observed location observers
            return !(entity.observers || []).some(observer => (user.id === (observer === null || observer === void 0 ? void 0 : observer.id)));
        });
        //
        return !invalidRow;
    }
    /**
     * Use in ngFor, for trackBy
     *
     * @param index
     * @param pmfm
     */
    trackPmfmFn(index, pmfm) {
        return toNumber(pmfm === null || pmfm === void 0 ? void 0 : pmfm.id, index);
    }
    // Override pmfm column name
    getI18nColumnName(columnName) {
        // Translate pmfm column
        if (PMFM_ID_REGEXP.test(columnName)) {
            const pmfm = this.pmfms.find(p => p.id.toString() === columnName);
            if (pmfm) {
                return this.pmfmNamePipe.transform(pmfm, { html: false, i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nColumnSuffix });
            }
        }
        return super.getI18nColumnName(columnName);
    }
    /* -- protected methods -- */
    getDetailProgram(source) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            // Find data program
            const programLabel = ((_a = source === null || source === void 0 ? void 0 : source.program) === null || _a === void 0 ? void 0 : _a.label) || ((_c = (_b = this.filter) === null || _b === void 0 ? void 0 : _b.program) === null || _c === void 0 ? void 0 : _c.label);
            let program = programLabel && (yield this.programRefService.loadByLabel(programLabel))
                || this.$detailProgram.value;
            if (!program) {
                const modal = yield this.modalCtrl.create({
                    component: SelectProgramModal,
                    componentProps: {
                        filter: {
                            statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
                            acquisitionLevelLabels: [AcquisitionLevelCodes.LANDING]
                        }
                    },
                    keyboardClose: true,
                    cssClass: 'modal-large'
                });
                yield modal.present();
                const { data } = yield modal.onDidDismiss();
                program = data === null || data === void 0 ? void 0 : data[0];
                if (!(program instanceof Program))
                    return; // User cancelled
                console.debug('[landings] Selected program: ', program);
            }
            return program;
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    resetContext() {
        this.context.reset();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsPage.prototype, "showTitleSegment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsPage.prototype, "showFilterProgram", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsPage.prototype, "showFilterStrategy", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsPage.prototype, "showFilterVessel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsPage.prototype, "showFilterLocation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsPage.prototype, "showFilterPeriod", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsPage.prototype, "showFilterSampleLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsPage.prototype, "showFilterSampleTagId", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsPage.prototype, "showQuality", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsPage.prototype, "showRecorder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsPage.prototype, "showObservers", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsPage.prototype, "showProgramColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsPage.prototype, "showVesselTypeColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsPage.prototype, "showVesselBasePortLocationColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsPage.prototype, "showObserversColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsPage.prototype, "showCreationDateColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsPage.prototype, "showRecorderPersonColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsPage.prototype, "showDateTimeColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsPage.prototype, "showSamplesCountColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsPage.prototype, "showLocationColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], LandingsPage.prototype, "pmfms", null);
LandingsPage = __decorate([
    Component({
        selector: 'app-landings-page',
        templateUrl: 'landings.page.html',
        styleUrls: ['landings.page.scss'],
        animations: [slideUpDownAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        LandingService,
        PersonService,
        ReferentialRefService,
        ProgramRefService,
        StrategyRefService,
        VesselSnapshotService,
        ObservedLocationService,
        TripService,
        UntypedFormBuilder,
        ConfigService,
        PmfmNamePipe,
        ContextService,
        ChangeDetectorRef])
], LandingsPage);
export { LandingsPage };
//# sourceMappingURL=landings.page.js.map