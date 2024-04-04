import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { UntypedFormBuilder } from '@angular/forms';
import { Alerts, ConfigService, isNilOrBlank, isNotEmptyArray, isNotNil, isNotNilOrBlank, PersonService, PersonUtils, SharedValidators, slideUpDownAnimation, StatusIds, TranslateContextService } from '@sumaris-net/ngx-components';
import { ObservedLocationService } from '../observed-location.service';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { ObservedLocation } from '../observed-location.model';
import { AppRootDataTable } from '@app/data/table/root-table.class';
import { OBSERVED_LOCATION_FEATURE_NAME, TRIP_CONFIG_OPTIONS } from '../../trip.config';
import { environment } from '@environments/environment';
import { BehaviorSubject } from 'rxjs';
import { ObservedLocationOfflineModal } from '../offline/observed-location-offline.modal';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import { ObservedLocationFilter } from '../observed-location.filter';
import { filter } from 'rxjs/operators';
import { DataQualityStatusEnum, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { ContextService } from '@app/shared/context.service';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { LANDING_TABLE_DEFAULT_I18N_PREFIX } from '@app/trip/landing/landings.table';
import { AnimationController, IonSegment } from '@ionic/angular';
import { LandingsPageSettingsEnum } from '@app/trip/landing/landings.page';
export const ObservedLocationsPageSettingsEnum = {
    PAGE_ID: 'observedLocations',
    FILTER_KEY: 'filter',
    FEATURE_NAME: OBSERVED_LOCATION_FEATURE_NAME,
};
let ObservedLocationsPage = class ObservedLocationsPage extends AppRootDataTable {
    constructor(injector, _dataService, personService, referentialRefService, programRefService, formBuilder, configService, translateContext, animationCtrl, context, cd) {
        super(injector, ObservedLocation, ObservedLocationFilter, ['quality',
            'program',
            'location',
            'startDateTime',
            'observers',
            'recorderPerson',
            'comments'], _dataService, null);
        this._dataService = _dataService;
        this.personService = personService;
        this.referentialRefService = referentialRefService;
        this.programRefService = programRefService;
        this.formBuilder = formBuilder;
        this.configService = configService;
        this.translateContext = translateContext;
        this.animationCtrl = animationCtrl;
        this.context = context;
        this.cd = cd;
        this.$title = new BehaviorSubject('');
        this.$landingsTitle = new BehaviorSubject('');
        this.statusList = DataQualityStatusList;
        this.statusById = DataQualityStatusEnum;
        this.selectedSegment = 'observations';
        this.showTitleSegment = false;
        this.showFilterProgram = true;
        this.showFilterLocation = true;
        this.showFilterPeriod = true;
        this.showQuality = true;
        this.showRecorder = true;
        this.showObservers = true;
        this.allowMultipleSelection = true;
        this.inModal = false;
        this.enableFilterPanelCompact = false;
        this.inlineEdition = false;
        this.i18nColumnPrefix = 'OBSERVED_LOCATION.TABLE.';
        this.filterForm = formBuilder.group({
            program: [null, SharedValidators.entity],
            location: [null, SharedValidators.entity],
            startDate: [null, SharedValidators.validDate],
            endDate: [null, SharedValidators.validDate],
            synchronizationStatus: [null],
            recorderDepartment: [null, SharedValidators.entity],
            recorderPerson: [null, SharedValidators.entity],
            observers: formBuilder.array([[null, SharedValidators.entity]])
        });
        this.autoLoad = false;
        this.defaultSortBy = 'startDateTime';
        this.defaultSortDirection = 'desc';
        this.settingsId = ObservedLocationsPageSettingsEnum.PAGE_ID; // Fixed value, to be able to reuse it in the editor page
        this.featureName = ObservedLocationsPageSettingsEnum.FEATURE_NAME;
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    set showProgramColumn(value) {
        this.setShowColumn('program', value);
    }
    get showProgramColumn() {
        return this.getShowColumn('program');
    }
    get filterObserversForm() {
        return this.filterForm.controls.observers;
    }
    get filterDataQualityControl() {
        return this.filterForm.controls.dataQualityStatus;
    }
    ngOnInit() {
        super.ngOnInit();
        // In modal mode: hide update card
        if (this.inModal) {
            this.showInstallUpgradeCard = false;
            this.showUpdateOfflineFeature = false;
        }
        // Programs combo (filter)
        this.registerAutocompleteField('program', {
            service: this.programRefService,
            filter: {
                acquisitionLevelLabels: [AcquisitionLevelCodes.OBSERVED_LOCATION, AcquisitionLevelCodes.LANDING],
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            },
            mobile: this.mobile
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
        this.filterPanelFloating = !this.enableFilterPanelCompact;
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
            _super.setFilter.call(this, filter, Object.assign(Object.assign({}, opts), { emitEvent: this.enableFilterPanelCompact ? true : opts === null || opts === void 0 ? void 0 : opts.emitEvent }));
        });
    }
    openTrashModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[observed-locations] Opening trash modal...');
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
                const feature = this.settings.getOfflineFeature(this._dataService.featureName) || {
                    name: this._dataService.featureName
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
            const observedLocationIds = (rowsToDelete || [])
                .map(row => row.currentData)
                .map(ObservedLocation.fromObject)
                .map(o => o.id);
            // ask confirmation if one observation has samples (with tagId)
            if (isNotEmptyArray(observedLocationIds) && (!opts || opts.interactive !== false)) {
                const hasSample = yield this._dataService.hasSampleWithTagId(observedLocationIds);
                if (hasSample) {
                    const messageKey = observedLocationIds.length === 1
                        ? 'OBSERVED_LOCATION.CONFIRM.DELETE_ONE_HAS_SAMPLE'
                        : 'OBSERVED_LOCATION.CONFIRM.DELETE_MANY_HAS_SAMPLE';
                    const confirmed = yield Alerts.askConfirmation(messageKey, this.alertCtrl, this.translate, event);
                    if (!confirmed)
                        return; // skip
                }
            }
            // Use inherited function, when no sample
            return _super.deleteSelection.call(this, event, { interactive: false /*already confirmed*/ });
        });
    }
    /* -- protected functions -- */
    onConfigLoaded(config) {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('[observed-locations] Init using config', config);
            // Show title segment ? (always disable on mobile)
            this.showTitleSegment = !this.mobile && config.getPropertyAsBoolean(TRIP_CONFIG_OPTIONS.OBSERVED_LOCATION_LANDINGS_TAB_ENABLE);
            const title = config.getProperty(TRIP_CONFIG_OPTIONS.OBSERVED_LOCATION_NAME);
            this.$title.next(title);
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
            if (this.enabled)
                yield this.restoreFilterOrLoad();
            this.updateColumns();
        });
    }
    onSegmentChanged(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = event.detail.value;
            if (isNilOrBlank(path))
                return;
            this.markAsLoading();
            // Prepare filter for next page
            const nextFilter = ObservedLocationFilter.toLandingFilter(this.asFilter());
            const json = (nextFilter === null || nextFilter === void 0 ? void 0 : nextFilter.asObject({ keepTypename: true })) || {};
            yield this.settings.savePageSetting(LandingsPageSettingsEnum.PAGE_ID, json, LandingsPageSettingsEnum.FILTER_KEY);
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
        // if (this.debug) console.debug("[observed-locations] onSwipeTab()");
        // Skip, if not a valid swipe event
        if (!event
            || event.defaultPrevented || (event.srcEvent && event.srcEvent.defaultPrevented)
            || event.pointerType !== 'touch') {
            return false;
        }
        this.toggleSynchronizationStatus();
        return true;
    }
    setProgram(program) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[observed-location] Init using program', program);
            // I18n suffix
            let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
            this.i18nColumnSuffix = i18nSuffix;
            // Title
            const landingsTitle = this.translateContext.instant(LANDING_TABLE_DEFAULT_I18N_PREFIX + 'TITLE', this.i18nColumnSuffix);
            this.$landingsTitle.next(landingsTitle);
        });
    }
    resetProgram() {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[observed-location] Reset program');
            // I18n suffix
            this.i18nColumnSuffix = '';
            // Title
            this.$landingsTitle.next(LANDING_TABLE_DEFAULT_I18N_PREFIX + 'TITLE');
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
], ObservedLocationsPage.prototype, "showTitleSegment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationsPage.prototype, "showFilterProgram", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationsPage.prototype, "showFilterLocation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationsPage.prototype, "showFilterPeriod", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationsPage.prototype, "showQuality", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationsPage.prototype, "showRecorder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationsPage.prototype, "showObservers", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationsPage.prototype, "allowMultipleSelection", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationsPage.prototype, "inModal", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationsPage.prototype, "enableFilterPanelCompact", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ObservedLocationsPage.prototype, "showProgramColumn", null);
__decorate([
    ViewChild('ion-segment', { static: true }),
    __metadata("design:type", IonSegment)
], ObservedLocationsPage.prototype, "ionSegment", void 0);
ObservedLocationsPage = __decorate([
    Component({
        selector: 'app-observed-locations-page',
        templateUrl: 'observed-locations.page.html',
        styleUrls: ['observed-locations.page.scss'],
        animations: [slideUpDownAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ObservedLocationService,
        PersonService,
        ReferentialRefService,
        ProgramRefService,
        UntypedFormBuilder,
        ConfigService,
        TranslateContextService,
        AnimationController,
        ContextService,
        ChangeDetectorRef])
], ObservedLocationsPage);
export { ObservedLocationsPage };
//# sourceMappingURL=observed-locations.page.js.map