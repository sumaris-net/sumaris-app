var LandingPage_1;
import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Optional, ViewChild } from '@angular/core';
import { AppEditorOptions, EntityUtils, equals, fadeInOutAnimation, firstArrayValue, firstNotNilPromise, firstTruePromise, fromDateISOString, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, NetworkService, ReferentialRef, ReferentialUtils, removeDuplicatesFromArray, ServerErrorCodes, } from '@sumaris-net/ngx-components';
import { LandingForm } from './landing.form';
import { SAMPLE_TABLE_DEFAULT_I18N_PREFIX, SamplesTable } from '../sample/samples.table';
import { LandingService } from './landing.service';
import { AppRootDataEntityEditor, RootDataEditorOptions } from '@app/data/form/root-data-editor.class';
import { ObservedLocationService } from '../observedlocation/observed-location.service';
import { TripService } from '../trip/trip.service';
import { debounceTime, filter, map, tap, throttleTime } from 'rxjs/operators';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Landing } from './landing.model';
import { Trip } from '../trip/trip.model';
import { ObservedLocation } from '../observedlocation/observed-location.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { environment } from '@environments/environment';
import { STRATEGY_SUMMARY_DEFAULT_I18N_PREFIX, StrategySummaryCardComponent } from '@app/data/strategy/strategy-summary-card.component';
import { merge } from 'rxjs';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { ContextService } from '@app/shared/context.service';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import moment from 'moment';
import { TRIP_LOCAL_SETTINGS_OPTIONS } from '@app/trip/trip.config';
import { LandingsPageSettingsEnum } from '@app/trip/landing/landings.page';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { APP_DATA_ENTITY_EDITOR, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
export class LandingEditorOptions extends RootDataEditorOptions {
}
let LandingPage = LandingPage_1 = class LandingPage extends AppRootDataEntityEditor {
    constructor(injector, options) {
        super(injector, Landing, injector.get(LandingService), Object.assign({ tabCount: 2, i18nPrefix: 'LANDING.EDIT.', enableListenChanges: true, acquisitionLevel: AcquisitionLevelCodes.LANDING }, options));
        this.showParent = false;
        this.showEntityMetadata = false;
        this.showQualityForm = false;
        this.showSamplesTable = false;
        this.enableReport = false;
        this.observedLocationService = injector.get(ObservedLocationService);
        this.tripService = injector.get(TripService);
        this.referentialRefService = injector.get(ReferentialRefService);
        this.vesselService = injector.get(VesselSnapshotService);
        this.context = injector.get(ContextService);
        this.network = injector.get(NetworkService);
        this.parentAcquisitionLevel = this.route.snapshot.queryParamMap.get('parent');
        this.showParent = !!this.parentAcquisitionLevel;
        // FOR DEV ONLY ----
        this.debug = !environment.production;
        this.logPrefix = '[landing-page] ';
    }
    get form() {
        return this.landingForm.form;
    }
    get strategyLabel() {
        return this._state.get('strategyLabel');
    }
    set strategyLabel(value) {
        this._state.set('strategyLabel', () => value);
    }
    ngAfterViewInit() {
        super.ngAfterViewInit();
        // Enable samples tab, when has pmfms
        firstTruePromise(this.samplesTable.hasPmfms$).then(() => {
            this.showSamplesTable = true;
            this.markForCheck();
        });
        // Use landing date as default dateTime for samples
        this.registerSubscription(this.landingForm.form
            .get('dateTime')
            .valueChanges.pipe(throttleTime(200), filter(isNotNil), tap((dateTime) => (this.samplesTable.defaultSampleDate = fromDateISOString(dateTime))))
            .subscribe());
        this.registerSubscription(this.landingForm.observedLocationChanges.pipe(filter((_) => this.showParent)).subscribe((parent) => this.onParentChanged(parent)));
        // Watch table events, to avoid strategy edition, when has sample rows
        this.registerSubscription(merge(this.samplesTable.onConfirmEditCreateRow, this.samplesTable.onCancelOrDeleteRow, this.samplesTable.onAfterDeletedRows)
            .pipe(debounceTime(500))
            .subscribe(() => (this.landingForm.canEditStrategy = this.samplesTable.empty)));
    }
    canUserWrite(data, opts) {
        var _a;
        return isNil((_a = this.parent) === null || _a === void 0 ? void 0 : _a.validationDate) && super.canUserWrite(data, opts);
    }
    reload() {
        return __awaiter(this, void 0, void 0, function* () {
            this.markAsLoading();
            const route = this.route.snapshot;
            yield this.load(this.data && this.data.id, route.params);
        });
    }
    watchStrategyFilter(program) {
        console.debug(this.logPrefix + 'watchStrategyFilter', this.acquisitionLevel);
        if (this.strategyResolution === 'user-select') {
            return this._state.select(['acquisitionLevel', 'strategyLabel'], s => s)
                .pipe(
            // DEBUG
            tap(s => console.debug(this.logPrefix + 'Received strategy label: ', s)), map(({ acquisitionLevel, strategyLabel }) => {
                return {
                    acquisitionLevel,
                    programId: program.id,
                    label: strategyLabel
                };
            }));
        }
        return super.watchStrategyFilter(program);
    }
    onPrepareSampleForm({ form, pmfms }) {
        var _a;
        console.debug('[landing-page] Initializing sample form (validators...)');
        // Add computation and validation
        (_a = this._rowValidatorSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        this._rowValidatorSubscription = this.registerSampleRowValidator(form, pmfms);
    }
    setError(err, opts) {
        // cast err to solve type error : detail is not a property of AppErrorWithDetails, property detail is on AppErrorWithDetails.error.detail
        err = err;
        if (err &&
            typeof err !== 'string' &&
            (err === null || err === void 0 ? void 0 : err.code) === ServerErrorCodes.DATA_NOT_UNIQUE &&
            (err === null || err === void 0 ? void 0 : err.details) &&
            typeof err.details === 'object' &&
            err.details.hasOwnProperty('duplicatedValues')) {
            const details = err.details;
            this.samplesTable.setError('LANDING.ERROR.DUPLICATED_SAMPLE_TAG_ID', { duplicatedValues: details.duplicatedValues });
            super.setError(undefined, opts);
            this.selectedTabIndex = this.getFirstInvalidTabIndex();
        }
        else {
            this.samplesTable.setError(undefined);
            super.setError(err, opts);
        }
    }
    updateView(data, opts) {
        const _super = Object.create(null, {
            updateView: { get: () => super.updateView }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.updateView.call(this, data, opts);
            this.landingForm.showParent = this.showParent;
            this.landingForm.parentAcquisitionLevel = this.parentAcquisitionLevel;
            if (this.parent) {
                // Parent is an Observed location
                if (this.parent instanceof ObservedLocation) {
                    this.landingForm.showProgram = false;
                    this.landingForm.showVessel = true;
                }
                // Parent is an Trip
                else if (this.parent instanceof Trip) {
                    this.landingForm.showProgram = false;
                    this.landingForm.showVessel = false;
                }
            }
            // No parent defined
            else {
                // If show parent
                if (this.showParent) {
                    console.warn('[landing-page] Landing without parent: show parent field');
                    this.landingForm.showProgram = false;
                    this.landingForm.showVessel = true;
                    this.landingForm.showLocation = false;
                    this.landingForm.showDateTime = false;
                    this.showQualityForm = true;
                }
                // Landing is root
                else {
                    console.warn('[landing-page] Landing as ROOT has not been tested !');
                    this.landingForm.showProgram = true;
                    this.landingForm.showVessel = true;
                    this.landingForm.showLocation = true;
                    this.landingForm.showDateTime = true;
                    this.showQualityForm = true;
                }
            }
            if (!this.isNewData && this.landingForm.requiredStrategy) {
                this.landingForm.canEditStrategy = false;
            }
            this.defaultBackHref = this.computeDefaultBackHref();
            if (!opts || opts.emitEvent !== false) {
                this.markForCheck();
            }
        });
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
    /* -- protected methods  -- */
    registerForms() {
        this.addChildForms([this.landingForm, this.samplesTable]);
    }
    onNewEntity(data, options) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const queryParams = this.route.snapshot.queryParams;
            // DEBUG
            //console.debug('DEV - Creating new landing entity');
            // Mask quality cards
            this.showEntityMetadata = false;
            this.showQualityForm = false;
            if (this.isOnFieldMode) {
                data.dateTime = moment();
            }
            // Fill parent ids
            data.observedLocationId = options && options.observedLocationId && parseInt(options.observedLocationId);
            data.tripId = options && options.tripId && parseInt(options.tripId);
            // Set rankOrder
            if (isNotNil(queryParams['rankOrder'])) {
                data.rankOrder = +queryParams['rankOrder'];
            }
            else {
                data.rankOrder = 1;
            }
            // Fill defaults, from table's filter.
            const tableId = this.queryParams['tableId'];
            const searchFilter = tableId && this.settings.getPageSettings(tableId, LandingsPageSettingsEnum.FILTER_KEY);
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
                if (searchFilter.location && this.landingForm.showLocation) {
                    data.location = ReferentialRef.fromObject(searchFilter.location);
                }
                // Strategy
                if (searchFilter.strategy) {
                    data.strategy = Strategy.fromObject(searchFilter.strategy);
                }
            }
            // Load parent
            this.parent = yield this.loadParent(data);
            yield this.fillPropertiesFromParent(data, this.parent);
            // Get contextual strategy
            const contextualStrategy = this.context.getValue('strategy');
            const strategyLabel = ((_a = data.strategy) === null || _a === void 0 ? void 0 : _a.label) || (contextualStrategy === null || contextualStrategy === void 0 ? void 0 : contextualStrategy.label) || queryParams['strategyLabel'];
            if (strategyLabel) {
                data.measurementValues = data.measurementValues || {};
                data.measurementValues[PmfmIds.STRATEGY_LABEL] = strategyLabel;
                if (EntityUtils.isEmpty(data.strategy, 'id')) {
                    data.strategy = contextualStrategy || (yield this.strategyRefService.loadByLabel(strategyLabel));
                }
            }
            // Emit program, strategy
            const programLabel = (_b = data.program) === null || _b === void 0 ? void 0 : _b.label;
            if (programLabel)
                this.programLabel = programLabel;
            if (strategyLabel)
                this.strategyLabel = strategyLabel;
        });
    }
    onEntityLoaded(data, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.parent = yield this.loadParent(data);
            const programLabel = (_a = this.parent.program) === null || _a === void 0 ? void 0 : _a.label;
            // Copy not fetched data
            if (this.parent) {
                // Set program using parent's program, if not already set
                data.program = ReferentialUtils.isNotEmpty(data.program) ? data.program : this.parent.program;
                data.observers = (isNotEmptyArray(data.observers) && data.observers) || this.parent.observers;
                if (this.parent instanceof ObservedLocation) {
                    data.location = data.location || this.parent.location;
                    data.dateTime = data.dateTime || this.parent.startDateTime || this.parent.endDateTime;
                    data.observedLocation = this.showParent ? this.parent : undefined;
                    data.observedLocationId = this.showParent ? null : this.parent.id;
                    data.tripId = undefined;
                    //data.trip = undefined; // Keep it
                }
                else if (this.parent instanceof Trip) {
                    data.vesselSnapshot = this.parent.vesselSnapshot;
                    data.location = data.location || this.parent.returnLocation || this.parent.departureLocation;
                    data.dateTime = data.dateTime || this.parent.returnDateTime || this.parent.departureDateTime;
                    data.trip = this.showParent ? this.parent : undefined;
                    data.tripId = this.showParent ? undefined : this.parent.id;
                    data.observedLocation = undefined;
                    data.observedLocationId = undefined;
                }
                this.showEntityMetadata = EntityUtils.isRemote(data);
                this.showQualityForm = false;
            }
            // Landing as root
            else {
                this.showEntityMetadata = EntityUtils.isRemote(data);
                this.showQualityForm = this.showEntityMetadata;
            }
            const strategyLabel = data.measurementValues && data.measurementValues[PmfmIds.STRATEGY_LABEL];
            this.landingForm.canEditStrategy = isNil(strategyLabel) || isEmptyArray(data.samples);
            // Emit program, strategy
            if (programLabel)
                this.programLabel = programLabel;
            if (strategyLabel)
                this.strategyLabel = strategyLabel;
        });
    }
    onParentChanged(parent) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!equals(parent, this.parent)) {
                console.debug('[landing] Parent changed to: ', parent);
                this.parent = parent;
                // Update data (copy some properties)
                if (this.loaded && !this.saving) {
                    const data = yield this.getValue();
                    yield this.fillPropertiesFromParent(data, parent);
                    yield this.setValue(data);
                    this.markAsDirty();
                }
            }
        });
    }
    fillPropertiesFromParent(data, parent) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            console.debug('[landing-page] Fill some properties from parent', parent);
            const queryParams = this.route.snapshot.queryParams;
            if (parent) {
                // Copy parent program and observers
                data.program = parent.program;
                data.observers = parent.observers;
                if (parent instanceof ObservedLocation) {
                    data.observedLocation = this.showParent ? parent : undefined;
                    data.observedLocationId = this.showParent ? null : this.parent.id;
                    data.location = (this.landingForm.showLocation && data.location) || parent.location;
                    data.dateTime = (this.landingForm.showDateTime && data.dateTime) || parent.startDateTime || parent.endDateTime;
                    // Keep trip, because some data are stored into the trip (e.g. fishingAreas, metier, ...)
                    //data.trip = undefined;
                    data.tripId = undefined;
                    // Load the vessel, if any
                    if (isNotNil(queryParams['vessel'])) {
                        const vesselId = +queryParams['vessel'];
                        console.debug(`[landing-page] Loading vessel {${vesselId}}...`);
                        data.vesselSnapshot = yield this.vesselService.load(vesselId, { fetchPolicy: 'cache-first' });
                    }
                }
                else if (parent instanceof Trip) {
                    data.trip = this.showParent ? parent : undefined;
                    data.vesselSnapshot = parent.vesselSnapshot;
                    data.location = parent.returnLocation || parent.departureLocation;
                    data.dateTime = parent.returnDateTime || parent.departureDateTime;
                    data.observedLocation = undefined;
                    data.observedLocationId = undefined;
                }
                // Copy date to samples, if not set by user
                if (!this.samplesTable.showSampleDateColumn) {
                    console.debug(`[landing-page] Updating samples...`);
                    (data.samples || []).forEach((sample) => {
                        sample.sampleDate = data.dateTime;
                    });
                }
            }
            // No parent
            else {
                const contextualProgram = this.context.getValue('program');
                const programLabel = ((_a = data.program) === null || _a === void 0 ? void 0 : _a.label) || (contextualProgram === null || contextualProgram === void 0 ? void 0 : contextualProgram.label) || queryParams['program'];
                if (programLabel && EntityUtils.isEmpty(data === null || data === void 0 ? void 0 : data.program, 'id')) {
                    data.program = contextualProgram || (yield this.programRefService.loadByLabel(programLabel));
                }
            }
        });
    }
    computeDefaultBackHref() {
        if (this.parent && !this.showParent) {
            // Back to parent observed location
            if (this.parent instanceof ObservedLocation) {
                return `/observations/${this.parent.id}?tab=1`;
            }
            // Back to parent trip
            else if (this.parent instanceof Trip) {
                return `/trips/${this.parent.id}?tab=2`;
            }
        }
        if (this.parentAcquisitionLevel) {
            // Back to entity table
            switch (this.parentAcquisitionLevel) {
                case 'OBSERVED_LOCATION':
                    return `/observations/landings`;
                    break;
                default:
                    throw new Error('Cannot compute the back href, for parent ' + this.parentAcquisitionLevel);
            }
        }
    }
    setProgram(program) {
        const _super = Object.create(null, {
            setProgram: { get: () => super.setProgram }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!program)
                return; // Skip
            yield _super.setProgram.call(this, program);
            const isNewData = this.isNewData;
            // Customize the UI, using program options
            const enableStrategy = program.getPropertyAsBoolean(ProgramProperties.LANDING_STRATEGY_ENABLE);
            this.landingForm.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.OBSERVED_LOCATION_LOCATION_LEVEL_IDS);
            this.landingForm.allowAddNewVessel = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_CREATE_VESSEL_ENABLE);
            this.landingForm.showStrategy = enableStrategy;
            this.landingForm.requiredStrategy = !isNewData && enableStrategy;
            this.landingForm.canEditStrategy = isNewData && enableStrategy;
            this.landingForm.showObservers = program.getPropertyAsBoolean(ProgramProperties.LANDING_OBSERVERS_ENABLE);
            this.landingForm.showDateTime = program.getPropertyAsBoolean(ProgramProperties.LANDING_DATE_TIME_ENABLE);
            this.landingForm.showLocation = program.getPropertyAsBoolean(ProgramProperties.LANDING_LOCATION_ENABLE);
            this.landingForm.fishingAreaLocationLevelIds = program.getPropertyAsNumbers(ProgramProperties.LANDING_FISHING_AREA_LOCATION_LEVEL_IDS);
            // Compute i18n prefix
            let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            i18nSuffix = i18nSuffix && i18nSuffix !== 'legacy' ? i18nSuffix : ((_a = this.i18nContext) === null || _a === void 0 ? void 0 : _a.suffix) || '';
            this.i18nContext.suffix = i18nSuffix;
            this.landingForm.i18nSuffix = i18nSuffix;
            this.enableReport = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_REPORT_ENABLE);
            if (this.samplesTable) {
                this.samplesTable.i18nColumnSuffix = i18nSuffix;
                this.samplesTable.i18nColumnPrefix = SAMPLE_TABLE_DEFAULT_I18N_PREFIX + i18nSuffix;
                this.samplesTable.setModalOption('maxVisibleButtons', program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS));
                this.samplesTable.setModalOption('maxItemCountForButtons', program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_ITEM_COUNT_FOR_BUTTONS));
                this.samplesTable.weightDisplayedUnit = this.settings.getProperty(TRIP_LOCAL_SETTINGS_OPTIONS.SAMPLE_WEIGHT_UNIT, program.getProperty(ProgramProperties.LANDING_SAMPLE_WEIGHT_UNIT));
                this.samplesTable.showLabelColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_SAMPLE_LABEL_ENABLE);
                // Apply sample table pmfms
                // If strategy is required, pmfms will be set by setStrategy()
                if (!enableStrategy) {
                    yield this.setTablePmfms(this.samplesTable, program.label);
                }
            }
            if (this.strategyCard) {
                this.strategyCard.i18nPrefix = STRATEGY_SUMMARY_DEFAULT_I18N_PREFIX + i18nSuffix;
            }
            // Emit ready event (should allow children forms to apply value)
            // If strategy is required, markAsReady() will be called in setStrategy()
            if (!enableStrategy || isNewData) {
                this.markAsReady();
            }
            // Listen program's strategies change (will reload strategy if need)
            if (this.network.online) {
                this.startListenProgramRemoteChanges(program);
                this.startListenStrategyRemoteChanges(program);
            }
        });
    }
    setStrategy(strategy, opts) {
        const _super = Object.create(null, {
            setStrategy: { get: () => super.setStrategy }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.setStrategy.call(this, strategy);
            const program = this.program;
            if (!strategy || !program)
                return; // Skip if empty
            // Propagate to form
            this.landingForm.strategyLabel = strategy.label;
            // Propagate strategy's fishing area locations to form
            const fishingAreaLocations = removeDuplicatesFromArray((strategy.appliedStrategies || []).map((a) => a.location), 'id');
            this.landingForm.filteredFishingAreaLocations = fishingAreaLocations;
            this.landingForm.enableFishingAreaFilter = isNotEmptyArray(fishingAreaLocations); // Enable filter should be done AFTER setting locations, to reload items
            // Configure samples table
            if (this.samplesTable && this.samplesTable.acquisitionLevel) {
                this.samplesTable.strategyLabel = strategy.label;
                const taxonNameStrategy = firstArrayValue(strategy.taxonNames);
                this.samplesTable.defaultTaxonName = taxonNameStrategy && taxonNameStrategy.taxonName;
                this.samplesTable.showTaxonGroupColumn = false;
                // Load strategy's pmfms
                yield this.setTablePmfms(this.samplesTable, program.label, strategy.label);
            }
            this.markAsReady();
            this.markForCheck();
        });
    }
    setTablePmfms(table, programLabel, strategyLabel) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!strategyLabel) {
                // Set the table program, to delegate pmfms load
                table.programLabel = programLabel;
            }
            else {
                // Load strategy's pmfms
                let samplesPmfms = yield this.programRefService.loadProgramPmfms(programLabel, {
                    strategyLabel,
                    acquisitionLevel: table.acquisitionLevel,
                });
                const strategyPmfmIds = samplesPmfms.map((pmfm) => pmfm.id);
                // Retrieve additional pmfms(= PMFMs in date, but NOT in the strategy)
                const additionalPmfmIds = ((!this.isNewData && ((_a = this.data) === null || _a === void 0 ? void 0 : _a.samples)) || []).reduce((res, sample) => MeasurementValuesUtils.getPmfmIds(sample.measurementValues || {}).reduce((res, pmfmId) => (!strategyPmfmIds.includes(pmfmId) ? res.concat(pmfmId) : res), res), []);
                // Override samples table pmfm, if need
                if (isNotEmptyArray(additionalPmfmIds)) {
                    // Load additional pmfms, from ids
                    const additionalPmfms = (yield Promise.all(additionalPmfmIds.map((id) => this.pmfmService.loadPmfmFull(id)))).map(DenormalizedPmfmStrategy.fromFullPmfm);
                    // IMPORTANT: Make sure pmfms have been loaded once, BEFORE override.
                    // (Elsewhere, the strategy's PMFM will be applied after the override, and additional PMFM will be lost)
                    samplesPmfms = samplesPmfms.concat(additionalPmfms);
                }
                // Give it to samples table (but exclude STRATEGY_LABEL)
                table.pmfms = samplesPmfms.filter((p) => p.id !== PmfmIds.STRATEGY_LABEL);
                // Avoid to load by program, because PMFM are already known
                //table.programLabel = programLabel;
            }
        });
    }
    loadParent(data) {
        return __awaiter(this, void 0, void 0, function* () {
            let parent;
            // Load parent observed location
            if (isNotNil(data.observedLocationId)) {
                console.debug(`[landing-page] Loading parent observed location #${data.observedLocationId} ...`);
                parent = yield this.observedLocationService.load(data.observedLocationId, { fetchPolicy: 'cache-first' });
            }
            // Load parent trip
            else if (isNotNil(data.tripId)) {
                console.debug('[landing-page] Loading parent trip...');
                parent = yield this.tripService.load(data.tripId, { fetchPolicy: 'cache-first' });
            }
            else {
                console.debug('[landing] No parent (observed location or trip) found in path.');
            }
            return parent;
        });
    }
    setValue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                return; // Skip
            yield this.landingForm.setValue(data);
            // Set samples to table
            this.samplesTable.value = data.samples || [];
        });
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { icon: 'boat' });
        });
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = yield firstNotNilPromise(this.program$, { stop: this.destroySubject });
            let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            i18nSuffix = (i18nSuffix !== 'legacy' && i18nSuffix) || '';
            const titlePrefix = (this.parent &&
                this.parent instanceof ObservedLocation &&
                this.translate.instant('LANDING.TITLE_PREFIX', {
                    location: this.parent.location && (this.parent.location.name || this.parent.location.label),
                    date: (this.parent.startDateTime && this.dateFormat.transform(this.parent.startDateTime)) || '',
                })) ||
                '';
            // new data
            if (!data || isNil(data.id)) {
                return titlePrefix + this.translate.instant(`LANDING.NEW.${i18nSuffix}TITLE`);
            }
            // Existing data
            return (titlePrefix +
                this.translate.instant(`LANDING.EDIT.${i18nSuffix}TITLE`, {
                    vessel: data.vesselSnapshot && (data.vesselSnapshot.exteriorMarking || data.vesselSnapshot.name),
                }));
        });
    }
    computePageUrl(id) {
        const parentUrl = this.getParentPageUrl();
        return `${parentUrl}/landing/${id}`;
    }
    getFirstInvalidTabIndex() {
        if (this.landingForm.invalid)
            return 0;
        if (this.samplesTable.invalid || this.samplesTable.error)
            return 1;
        return -1;
    }
    computeUsageMode(landing) {
        return this.settings.isUsageMode('FIELD') &&
            // Force desktop mode if landing date/time is 1 day later than now
            (isNil(landing && landing.dateTime) || landing.dateTime.diff(moment(), 'day') <= 1)
            ? 'FIELD'
            : 'DESK';
    }
    getValue() {
        const _super = Object.create(null, {
            getValue: { get: () => super.getValue }
        });
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            //console.debug('[landing-page] getValue()');
            const data = yield _super.getValue.call(this);
            // Workaround, because sometime measurementValues is empty (see issue IMAGINE-273)
            data.measurementValues = ((_a = this.form.controls.measurementValues) === null || _a === void 0 ? void 0 : _a.value) || {};
            // Store strategy label to measurement
            if (this.strategyResolution === DataStrategyResolutions.USER_SELECT) {
                const strategyLabel = (_b = this.strategy) === null || _b === void 0 ? void 0 : _b.label;
                if (isNotNilOrBlank(strategyLabel)) {
                    data.measurementValues[PmfmIds.STRATEGY_LABEL] = strategyLabel;
                }
            }
            // Save samples table
            if (this.samplesTable.dirty) {
                yield this.samplesTable.save();
            }
            data.samples = this.samplesTable.value;
            // DEBUG
            //console.debug('[landing-page] DEV check getValue() result:', data);
            return data;
        });
    }
    openObservedLocation(parent) {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = (this.mobile || this.isOnFieldMode) && (!this.dirty || this.valid)
                ? // If on field mode: try to save silently
                    yield this.save(null, { openTabIndex: -1 })
                : // If desktop mode: ask before save
                    yield this.saveIfDirtyAndConfirm();
            if (!saved)
                return; // Skip
            return this.navController.navigateForward(['observations', parent.id], {
                replaceUrl: false,
                queryParams: {
                    tab: 0,
                    embedded: true,
                },
            });
        });
    }
    getJsonValueToSave() {
        var _a;
        return (_a = this.landingForm.value) === null || _a === void 0 ? void 0 : _a.asObject();
    }
    registerSampleRowValidator(form, pmfms) {
        // Can be override by subclasses (e.g auction control, biological sampling samples table)
        console.warn('[landing-page] No row validator override');
        return null;
    }
    setWeightDisplayUnit(unitLabel) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.samplesTable.weightDisplayedUnit === unitLabel)
                return; // Skip if same
            const saved = (this.mobile || this.isOnFieldMode) && (!this.dirty || this.valid)
                ? // If on field mode: try to save silently
                    yield this.save(null, { openTabIndex: -1 })
                : // If desktop mode: ask before save
                    yield this.saveIfDirtyAndConfirm();
            if (!saved)
                return; // Skip
            console.debug('[landing-page] Change weight unit to ' + unitLabel);
            this.samplesTable.weightDisplayedUnit = unitLabel;
            this.settings.setProperty(TRIP_LOCAL_SETTINGS_OPTIONS.SAMPLE_WEIGHT_UNIT, unitLabel);
            // Reload program and strategy
            yield this.reloadProgram({ clearCache: false });
            if (this.landingForm.requiredStrategy)
                yield this.reloadStrategy({ clearCache: false });
            // Reload data
            setTimeout(() => this.reload(), 250);
        });
    }
};
__decorate([
    ViewChild('landingForm', { static: true }),
    __metadata("design:type", LandingForm)
], LandingPage.prototype, "landingForm", void 0);
__decorate([
    ViewChild('samplesTable', { static: true }),
    __metadata("design:type", SamplesTable)
], LandingPage.prototype, "samplesTable", void 0);
__decorate([
    ViewChild('strategyCard', { static: false }),
    __metadata("design:type", StrategySummaryCardComponent)
], LandingPage.prototype, "strategyCard", void 0);
LandingPage = LandingPage_1 = __decorate([
    Component({
        selector: 'app-landing-page',
        templateUrl: './landing.page.html',
        styleUrls: ['./landing.page.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
        animations: [fadeInOutAnimation],
        providers: [
            { provide: APP_DATA_ENTITY_EDITOR, useExisting: LandingPage_1 },
            {
                provide: AppEditorOptions,
                useValue: {
                    pathIdAttribute: 'landingId',
                },
            },
        ],
    }),
    __param(1, Optional()),
    __metadata("design:paramtypes", [Injector, LandingEditorOptions])
], LandingPage);
export { LandingPage };
//# sourceMappingURL=landing.page.js.map