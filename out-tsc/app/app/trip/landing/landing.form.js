import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output, QueryList, ViewChildren } from '@angular/core';
import { debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { AcquisitionLevelCodes, LocationLevelGroups, LocationLevelIds, PmfmIds, } from '@app/referential/services/model/model.enum';
import { LandingValidatorService } from './landing.validator';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { ConfigService, DateUtils, EntityUtils, FormArrayHelper, getPropertyByPath, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, isNotNilOrBlank, NetworkService, PersonService, PersonUtils, ReferentialRef, ReferentialUtils, SharedValidators, StatusIds, suggestFromArray, toBoolean, toDateISOString, } from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Landing } from './landing.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { VesselModal } from '@app/vessel/modal/vessel-modal';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { TranslateService } from '@ngx-translate/core';
import { FishingAreaValidatorService } from '@app/data/fishing-area/fishing-area.validator';
import { Trip } from '@app/trip/trip/trip.model';
import { TripValidatorService } from '@app/trip/trip/trip.validator';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { ObservedLocationFilter } from '@app/trip/observedlocation/observed-location.filter';
import { DateAdapter } from '@angular/material/core';
import { SelectObservedLocationsModal, } from '@app/trip/observedlocation/select-modal/select-observed-locations.modal';
import { StrategyService } from '@app/referential/services/strategy.service';
const TRIP_FORM_EXCLUDED_FIELD_NAMES = ['program', 'vesselSnapshot', 'departureDateTime', 'departureLocation', 'returnDateTime', 'returnLocation'];
let LandingForm = class LandingForm extends MeasurementValuesForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, validatorService, referentialRefService, personService, vesselSnapshotService, configService, translate, modalCtrl, tripValidatorService, fishingAreaValidatorService, networkService, strategyService, dateAdapter) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(), {
            mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        });
        this.measurementsValidatorService = measurementsValidatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.validatorService = validatorService;
        this.referentialRefService = referentialRefService;
        this.personService = personService;
        this.vesselSnapshotService = vesselSnapshotService;
        this.configService = configService;
        this.translate = translate;
        this.modalCtrl = modalCtrl;
        this.tripValidatorService = tripValidatorService;
        this.fishingAreaValidatorService = fishingAreaValidatorService;
        this.networkService = networkService;
        this.strategyService = strategyService;
        this.dateAdapter = dateAdapter;
        this.observerFocusIndex = -1;
        this.metierFocusIndex = -1;
        this.fishingAreaFocusIndex = -1;
        this.strategyControl$ = this._state.select('strategyControl');
        this.observedLocationLabel$ = this._state.select('observedLocationLabel');
        this.observedLocationControl$ = this._state.select('observedLocationControl');
        this.autocompleteFilters = {
            fishingArea: false,
        };
        this.required = true;
        this.showProgram = false;
        this.showVessel = true;
        this.showDateTime = false; // Default value of program option LANDING_DATE_TIME_ENABLE
        this.showLocation = false; // Default value of program option LANDING_LOCATION_ENABLE
        this.showComment = true;
        this.showMeasurements = true;
        this.showError = true;
        this.showButtons = true;
        this.showMetier = false;
        this.showFishingArea = false;
        this.showTripDepartureDateTime = false;
        this.allowManyMetiers = null;
        this.filteredFishingAreaLocations = null;
        this.fishingAreaLocationLevelIds = null;
        this.disabledParent = null;
        this.observedLocationChanges = new EventEmitter();
        this.openObservedLocation = new EventEmitter();
        this.strategyChanges = new EventEmitter();
        this._enable = false;
        this.mobile = this.settings.mobile;
        // Set default acquisition level
        this.acquisitionLevel = AcquisitionLevelCodes.LANDING;
        this.errorTranslatorOptions = { separator: '<br/>', controlPathTranslator: this };
    }
    get empty() {
        const value = this.value;
        return ReferentialUtils.isEmpty(value.location) && !value.dateTime && (!value.comments || !value.comments.length);
    }
    get valid() {
        return this.form && (this.required ? this.form.valid : this.form.valid || this.empty);
    }
    get observersForm() {
        return this.form.controls.observers;
    }
    get tripForm() {
        return this.form.controls.trip;
    }
    get observedLocationControl() {
        return this._state.get('observedLocationControl');
    }
    get strategyControl() {
        return this._state.get('strategyControl');
    }
    get metiersForm() {
        var _a;
        return (_a = this.tripForm) === null || _a === void 0 ? void 0 : _a.controls.metiers;
    }
    get fishingAreasForm() {
        var _a;
        return (_a = this.tripForm) === null || _a === void 0 ? void 0 : _a.controls.fishingAreas;
    }
    get showTrip() {
        return this.showMetier || this.showFishingArea;
    }
    set showStrategy(value) {
        this._state.set('showStrategy', (_) => value);
    }
    get showStrategy() {
        return this._state.get('showStrategy');
    }
    set enableFishingAreaFilter(value) {
        var _a;
        this.setFieldFilterEnable('fishingArea', value);
        (_a = this.fishingAreaFields) === null || _a === void 0 ? void 0 : _a.forEach((fishingArea) => {
            this.setFieldFilterEnable('fishingArea', value, fishingArea, true);
        });
    }
    set canEditStrategy(value) {
        this._state.set('canEditStrategy', (_) => value);
    }
    get canEditStrategy() {
        return this._state.get('canEditStrategy');
    }
    set showObservers(value) {
        if (this._showObservers !== value) {
            this._showObservers = value;
            this.initObserversHelper();
            this.markForCheck();
        }
    }
    get showObservers() {
        return this._showObservers;
    }
    set showParent(value) {
        this._state.set('showParent', (_) => value);
    }
    get showParent() {
        return this._state.get('showParent') || false;
    }
    set parentAcquisitionLevel(value) {
        this._state.set('parentAcquisitionLevel', (_) => value);
    }
    get parentAcquisitionLevel() {
        return this._state.get('parentAcquisitionLevel');
    }
    ngOnInit() {
        super.ngOnInit();
        // Default values
        this.showStrategy = toBoolean(this.showStrategy, false); // Will init the strategy control, if need
        this.showObservers = toBoolean(this.showObservers, false); // Will init the observers helper, if need
        this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
        if (isNil(this.locationLevelIds) && this.showLocation) {
            this.locationLevelIds = [LocationLevelIds.PORT];
            console.debug('[landing-form] Location level ids:', this.locationLevelIds);
        }
        if (isNil(this.fishingAreaLocationLevelIds) && this.showFishingArea) {
            this.fishingAreaLocationLevelIds = LocationLevelGroups.FISHING_AREA;
            console.debug('[landing-form] Fishing area location level ids:', this.fishingAreaLocationLevelIds);
        }
        // Combo: programs
        this.registerAutocompleteField('program', {
            service: this.programRefService,
            filter: {
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
                acquisitionLevelLabels: [AcquisitionLevelCodes.LANDING],
            },
            mobile: this.mobile,
        });
        // Combo: strategy
        this.registerAutocompleteField('strategy', {
            suggestFn: (value, filter) => this.suggestStrategy(value, filter),
            filter: {
                entityName: 'Strategy',
                searchAttribute: 'label',
            },
            attributes: ['label'],
            columnSizes: [12],
            showAllOnFocus: true,
            mobile: this.mobile,
        });
        // Combo: vessels
        this.vesselSnapshotService.getAutocompleteFieldOptions().then((opts) => this.registerAutocompleteField('vesselSnapshot', opts));
        // Combo location
        this.registerAutocompleteField('location', {
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { levelIds: this.locationLevelIds })),
            filter: {
                entityName: 'Location',
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
            },
            mobile: this.mobile,
        });
        // Combo: observers
        this.registerAutocompleteField('person', {
            // Important, to get the current (focused) control value, in suggestObservers() function (otherwise it will received '*').
            showAllOnFocus: false,
            suggestFn: (value, filter) => this.suggestObservers(value, filter),
            // Default filter. An excludedIds will be add dynamically
            filter: {
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
                userProfiles: ['SUPERVISOR', 'USER', 'GUEST'],
            },
            attributes: ['lastName', 'firstName', 'department.name'],
            displayWith: PersonUtils.personToString,
            mobile: this.mobile,
        });
        // Combo: metier
        const metierAttributes = this.settings.getFieldDisplayAttributes('qualitativeValue');
        this.registerAutocompleteField('metier', {
            showAllOnFocus: false,
            suggestFn: (value, filter) => this.suggestMetiers(value, filter),
            // Default filter. A excludedIds will be add dynamically
            filter: {
                entityName: 'Metier',
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
            },
            attributes: metierAttributes,
            mobile: this.mobile,
        });
        // Combo: fishingAreas
        const fishingAreaAttributes = this.settings.getFieldDisplayAttributes('fishingAreaLocation', ['label']);
        this.registerAutocompleteField('fishingAreaLocation', {
            showAllOnFocus: false,
            suggestFn: (value, filter) => this.suggestFishingAreaLocations(value, Object.assign(Object.assign({}, filter), { levelIds: this.fishingAreaLocationLevelIds })),
            // Default filter. An excludedIds will be add dynamically
            filter: {
                entityName: 'Location',
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
            },
            attributes: fishingAreaAttributes,
            mobile: this.mobile,
        });
        // Propagate program
        this.registerSubscription(this.form
            .get('program')
            .valueChanges.pipe(debounceTime(250), map((value) => (value && typeof value === 'string' ? value : (value && value.label) || undefined)))
            .subscribe((programLabel) => (this.programLabel = programLabel)));
        // Update the strategy filter (if autocomplete field exists. If not, program will set later in ngOnInit())
        this._state.hold(this.programLabel$, (programLabel) => {
            if (this.autocompleteFields.strategy) {
                this.autocompleteFields.strategy.filter.levelLabel = programLabel;
            }
        });
        this._state.hold(this.strategyLabel$, (strategyLabel) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Wait loaded
            yield this.waitIdle({ stop: this.destroySubject });
            // Get control to store strategy label, in measurements form
            const measControl = this.form.get('measurementValues.' + PmfmIds.STRATEGY_LABEL);
            if (measControl && measControl.value !== strategyLabel) {
                // DEBUG
                console.debug(`[landing-form] Setting measurementValues.${PmfmIds.STRATEGY_LABEL}=${strategyLabel}`);
                measControl.setValue(strategyLabel);
            }
            // Update strategy control
            if (this.showStrategy && this.strategyControl && ((_a = this.strategyControl.value) === null || _a === void 0 ? void 0 : _a.label) !== strategyLabel) {
                console.debug('[landing-form] Updating strategy control, with value', { label: strategyLabel });
                this.strategyControl.setValue({ label: strategyLabel }, { emitEvent: false });
                this.markForCheck();
            }
            // Refresh fishing areas autocomplete
            (_b = this.fishingAreaFields) === null || _b === void 0 ? void 0 : _b.forEach((fishingArea) => fishingArea.reloadItems());
        }));
        // Init trip form (if enable)
        if (this.showTrip) {
            const tripForm = this.initTripForm();
            if (this.showMetier)
                this.initMetiersHelper(tripForm);
            if (this.showFishingArea)
                this.initFishingAreas(tripForm);
        }
        // Add strategy control
        this._state.connect('strategyControl', this._state.select('showStrategy'), (_, show) => this.initStrategyControl(show));
        this._state.hold(this._state.select('canEditStrategy'), (canEditStrategy) => {
            var _a, _b;
            if (canEditStrategy && ((_a = this.strategyControl) === null || _a === void 0 ? void 0 : _a.disabled)) {
                this.strategyControl.enable();
            }
            else if (!canEditStrategy && ((_b = this.strategyControl) === null || _b === void 0 ? void 0 : _b.enabled)) {
                this.strategyControl.disable();
            }
        });
        // Add observed location control
        this._state.connect('showObservedLocation', this._state.select(['showParent', 'parentAcquisitionLevel'], (s) => s), ({ showParent, parentAcquisitionLevel }) => showParent && parentAcquisitionLevel === AcquisitionLevelCodes.OBSERVED_LOCATION);
        this._state.connect('observedLocationControl', this._state.select('showObservedLocation'), (_, show) => this.initObservedLocationControl(show));
        this._state.connect('observedLocationLabel', this.observedLocationChanges.pipe(filter((parent) => !parent || parent instanceof ObservedLocation), distinctUntilChanged(EntityUtils.equals)), (_, parent) => this.displayObservedLocation(parent));
        this._state.hold(this.strategyControl$.pipe(switchMap((control) => control.valueChanges), distinctUntilChanged(EntityUtils.equals)), (strategy) => this.strategyChanges.emit(strategy));
    }
    registerAutocompleteField(fieldName, opts) {
        return super.registerAutocompleteField(fieldName, opts);
    }
    toggleFilter(fieldName, field) {
        this.setFieldFilterEnable(fieldName, !this.isFieldFilterEnable(fieldName), field);
    }
    onApplyingEntity(data, opts) {
        super.onApplyingEntity(data, opts);
        if (!data)
            return; // Skip
        // Propagate the strategy
        const strategyLabel = data.measurementValues && data.measurementValues[PmfmIds.STRATEGY_LABEL];
        if (strategyLabel) {
            this.strategyControl.patchValue(ReferentialRef.fromObject({ label: strategyLabel }));
        }
    }
    updateView(data, opts) {
        const _super = Object.create(null, {
            updateView: { get: () => super.updateView }
        });
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                return;
            // Reapplied changed data
            if (this.isNewData && this.form.touched) {
                console.warn('[landing-form] Merging form value and input data, before updating view');
                // Make sure to keep existing touched field's value
                const json = this.form.value;
                Object.keys(json).forEach((key) => {
                    var _a;
                    if (isNil(json[key]) && ((_a = this.form.get(key)) === null || _a === void 0 ? void 0 : _a.untouched))
                        delete json[key];
                });
                data = Landing.fromObject(Object.assign(Object.assign({}, data.asObject()), json));
            }
            // Resize observers array
            if (this._showObservers) {
                // Make sure to have (at least) one observer
                data.observers = isNotEmptyArray(data.observers) ? data.observers : [null];
                this.observersHelper.resize(Math.max(1, data.observers.length));
            }
            else {
                data.observers = [];
                (_a = this.observersHelper) === null || _a === void 0 ? void 0 : _a.resize(0);
            }
            // Trip
            let trip = data.trip;
            this.showMetier = this.showMetier || isNotEmptyArray(trip === null || trip === void 0 ? void 0 : trip.metiers);
            this.showFishingArea = this.showFishingArea || isNotEmptyArray(trip === null || trip === void 0 ? void 0 : trip.fishingAreas);
            if (!trip && (this.showMetier || this.showFishingArea)) {
                trip = new Trip();
                data.trip = trip;
            }
            let tripForm = this.tripForm;
            if (this.showTrip && !tripForm) {
                tripForm = this.initTripForm();
                if (this.showMetier)
                    this.initMetiersHelper(tripForm);
                if (this.showFishingArea)
                    this.initFishingAreas(tripForm);
            }
            // Resize metiers array
            if (this.showMetier) {
                trip.metiers = isNotEmptyArray(trip.metiers) ? trip.metiers : [null];
                this.metiersHelper.resize(Math.max(1, trip.metiers.length));
            }
            else {
                (_b = this.metiersHelper) === null || _b === void 0 ? void 0 : _b.removeAllEmpty();
            }
            // Resize fishing areas array
            if (this.showFishingArea) {
                trip.fishingAreas = isNotEmptyArray(trip.fishingAreas) ? trip.fishingAreas : [null];
                this.fishingAreasHelper.resize(Math.max(1, trip.fishingAreas.length));
            }
            else {
                (_c = this.fishingAreasHelper) === null || _c === void 0 ? void 0 : _c.removeAllEmpty();
            }
            // DEBUG
            //console.debug('[landing-form] updateView', data);
            yield _super.updateView.call(this, data, opts);
        });
    }
    getValue() {
        // DEBUG
        //console.debug('[landing-form] get value');
        const data = super.getValue();
        if (!data)
            return;
        // Re add the strategy label
        if (this.showStrategy) {
            const strategyValue = this.strategyControl.value;
            const strategyLabel = EntityUtils.isNotEmpty(strategyValue, 'label') ? strategyValue.label : strategyValue;
            data.measurementValues = data.measurementValues || {};
            data.measurementValues[PmfmIds.STRATEGY_LABEL.toString()] = strategyLabel;
        }
        if (this.showTrip) {
            const trip = Trip.fromObject(Object.assign(Object.assign({}, data.trip), { 
                // Override some editable properties
                program: data.program, vesselSnapshot: data.vesselSnapshot, returnDateTime: toDateISOString(data.dateTime), departureLocation: data.location, returnLocation: data.location }));
            // INFO CLT : trip departure date time is stored in database for imagine
            trip.departureDateTime = trip.departureDateTime || data.dateTime;
            data.trip = trip;
        }
        // DEBUG
        //console.debug('[landing-form] getValue() result:', data);
        return data;
    }
    addObserver() {
        this.observersHelper.add();
        if (!this.mobile) {
            this.observerFocusIndex = this.observersHelper.size() - 1;
        }
    }
    addMetier() {
        this.metiersHelper.add();
        if (!this.mobile) {
            this.metierFocusIndex = this.metiersHelper.size() - 1;
        }
    }
    addFishingArea() {
        this.fishingAreasHelper.add();
        if (!this.mobile) {
            this.fishingAreaFocusIndex = this.fishingAreasHelper.size() - 1;
        }
    }
    enable(opts) {
        var _a, _b;
        super.enable(opts);
        // Leave program disable once data has been saved
        if (!this.isNewData && !this.form.get('program').enabled) {
            this.form.controls['program'].disable({ emitEvent: false });
            this.markForCheck();
        }
        if (this.canEditStrategy && ((_a = this.strategyControl) === null || _a === void 0 ? void 0 : _a.disabled)) {
            this.strategyControl.enable(opts);
        }
        else if (!this.canEditStrategy && ((_b = this.strategyControl) === null || _b === void 0 ? void 0 : _b.enabled)) {
            this.strategyControl.disable({ emitEvent: false });
        }
    }
    addVesselModal() {
        return __awaiter(this, void 0, void 0, function* () {
            const modal = yield this.modalCtrl.create({ component: VesselModal });
            modal.onDidDismiss().then((res) => {
                // if new vessel added, use it
                if (res && res.data instanceof VesselSnapshot) {
                    console.debug('[landing-form] New vessel added : updating form...', res.data);
                    this.form.get('vesselSnapshot').setValue(res.data);
                    this.markForCheck();
                }
                else {
                    console.debug('[landing-form] No vessel added (user cancelled)');
                }
            });
            return modal.present();
        });
    }
    /* -- protected method -- */
    isFieldFilterEnable(fieldName) {
        return this.autocompleteFilters[fieldName];
    }
    setFieldFilterEnable(fieldName, value, field, forceReload) {
        if (this.autocompleteFilters[fieldName] !== value || forceReload) {
            this.autocompleteFilters[fieldName] = value;
            this.markForCheck();
            if (field)
                field.reloadItems();
        }
    }
    suggestStrategy(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            // Avoid to reload, when value is already a valid strategy
            if (ReferentialUtils.isNotEmpty(value))
                return { data: [value] };
            filter = Object.assign(Object.assign({}, filter), { levelLabel: this.programLabel });
            if (isNilOrBlank(filter.levelLabel))
                return undefined; // Program no loaded yet
            // Force network, if possible - fix IMAGINE 302
            const fetchPolicy = (this.networkService.online && 'network-only') || undefined; /*default*/
            return this.referentialRefService.suggest(value, filter, undefined, undefined, { fetchPolicy });
        });
    }
    openSelectObservedLocationModal(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (event)
                event.preventDefault();
            const control = this.observedLocationControl;
            if (!control || control.disabled)
                return;
            try {
                control.disable({ emitEvent: false });
                const program = yield this.programRefService.loadByLabel(this.programLabel);
                const defaultData = ObservedLocation.fromObject({
                    program,
                });
                const filter = ObservedLocationFilter.fromObject({
                    program,
                });
                if (this.showStrategy) {
                    const strategy = this.strategyControl.value;
                    const period = strategy && (yield this.strategyService.getDateRangeByLabel(this.strategyControl.value.label));
                    filter.startDate = (strategy && period.startDate) || DateUtils.moment().startOf('year');
                    filter.endDate = (strategy && period.endDate) || DateUtils.moment().endOf('year');
                }
                const modal = yield this.modalCtrl.create({
                    component: SelectObservedLocationsModal,
                    componentProps: {
                        allowMultipleSelection: false,
                        showFilterProgram: false,
                        allowNewObservedLocation: true,
                        defaultNewObservedLocation: defaultData,
                        selectedId: (_a = control.value) === null || _a === void 0 ? void 0 : _a.id,
                        filter,
                    },
                    keyboardClose: true,
                    backdropDismiss: true,
                    cssClass: 'modal-large',
                });
                yield modal.present();
                const { data } = yield modal.onDidDismiss();
                const value = data === null || data === void 0 ? void 0 : data[0];
                if (!value)
                    return; // User cancelled
                console.debug('[landing-form] Selected observed location: ', value);
                control.setValue(value);
                control.markAsTouched();
            }
            finally {
                control.enable();
            }
        });
    }
    suggestObservers(value, filter) {
        const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
        const newValue = currentControlValue ? '*' : value;
        // Excluded existing observers, BUT keep the current control value
        const excludedIds = (this.observersForm.value || [])
            .filter(ReferentialUtils.isNotEmpty)
            .filter((person) => !currentControlValue || currentControlValue !== person)
            .map((person) => parseInt(person.id));
        return this.personService.suggest(newValue, Object.assign(Object.assign({}, filter), { excludedIds }));
    }
    suggestMetiers(value, filter) {
        const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
        // Excluded existing observers, BUT keep the current control value
        const excludedIds = (this.metiersForm.value || [])
            .filter(ReferentialUtils.isNotEmpty)
            .filter((item) => !currentControlValue || currentControlValue !== item)
            .map((item) => parseInt(item.id));
        return this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { excludedIds }));
    }
    suggestFishingAreaLocations(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
            // Excluded existing locations, BUT keep the current control value
            const excludedIds = (this.fishingAreasForm.value || [])
                .map((fa) => fa.location)
                .filter(ReferentialUtils.isNotEmpty)
                .filter((item) => !currentControlValue || currentControlValue !== item)
                .map((item) => parseInt(item.id));
            if (this.autocompleteFilters.fishingArea && isNotNil(this.filteredFishingAreaLocations)) {
                return suggestFromArray(this.filteredFishingAreaLocations, value, Object.assign(Object.assign({}, filter), { excludedIds }));
            }
            else {
                return this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { excludedIds }));
            }
        });
    }
    initObserversHelper() {
        if (isNil(this._showObservers))
            return; // skip if not loading yet
        // Create helper, if need
        if (!this.observersHelper) {
            this.observersHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'observers'), (person) => this.validatorService.getObserverControl(person), ReferentialUtils.equals, ReferentialUtils.isEmpty, { allowEmptyArray: !this._showObservers });
        }
        // Helper exists: update options
        else {
            this.observersHelper.allowEmptyArray = !this._showObservers;
        }
        if (this._showObservers) {
            // Create at least one observer
            if (this.observersHelper.size() === 0) {
                this.observersHelper.resize(1);
            }
        }
        else if (this.observersHelper.size() > 0) {
            this.observersHelper.resize(0);
        }
    }
    initTripForm() {
        let tripForm = this.tripForm;
        if (!tripForm) {
            // DEBUG
            //console.debug('[landing-form] Creating trip form');
            const tripFormConfig = this.tripValidatorService.getFormGroupConfig(null, {
                withMetiers: this.showMetier,
                withFishingAreas: this.showFishingArea,
                withSale: false,
                withObservers: false,
                withMeasurements: false,
                departureDateTimeRequired: false,
            });
            // Excluded some trip's fields
            TRIP_FORM_EXCLUDED_FIELD_NAMES.filter((key) => {
                if (!this.showTripDepartureDateTime || key !== 'departureDateTime') {
                    delete tripFormConfig[key];
                }
            });
            tripForm = this.formBuilder.group(tripFormConfig);
            this.form.addControl('trip', tripForm);
        }
        return tripForm;
    }
    initStrategyControl(showStrategy) {
        var _a;
        if (showStrategy) {
            let control = this.strategyControl;
            if (!control) {
                const strategyLabel = this.strategyLabel;
                control = this.formBuilder.control((strategyLabel && { label: strategyLabel }) || null, Validators.required);
                this.form.setControl('strategy', control);
                // Propagate strategy changes
                const subscription = control.valueChanges
                    .pipe(filter((value) => EntityUtils.isNotEmpty(value, 'label')), map((value) => value.label), distinctUntilChanged())
                    .subscribe((value) => (this.strategyLabel = value));
                subscription.add(() => {
                    this.unregisterSubscription(subscription);
                    this._strategySubscription = null;
                });
                this.registerSubscription(subscription);
                this._strategySubscription = subscription;
            }
            return control;
        }
        else {
            (_a = this._strategySubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
            this.form.removeControl('strategy');
            return null;
        }
    }
    initObservedLocationControl(showObservedLocation) {
        var _a, _b;
        if (showObservedLocation) {
            let control = this.observedLocationControl;
            if (!control) {
                // Create control
                control = this.formBuilder.control(((_a = this.data) === null || _a === void 0 ? void 0 : _a.observedLocation) || null, [Validators.required, SharedValidators.entity]);
                this.form.addControl('observedLocation', control);
                // Subscribe to changes, and redirect it to the parent event emitter
                const subscription = control.valueChanges.subscribe((ol) => this.observedLocationChanges.emit(ol));
                subscription.add(() => {
                    this.unregisterSubscription(subscription);
                    this._parentSubscription = null;
                });
                this.registerSubscription(subscription);
                this._parentSubscription = subscription;
            }
            return control;
        }
        else {
            (_b = this._parentSubscription) === null || _b === void 0 ? void 0 : _b.unsubscribe();
            this.form.removeControl('observedLocation');
            return null;
        }
    }
    initMetiersHelper(form) {
        if (!this.metiersHelper) {
            this.metiersHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, form, 'metiers'), (metier) => this.tripValidatorService.getMetierControl(metier), ReferentialUtils.equals, ReferentialUtils.isEmpty, { allowEmptyArray: !this.showMetier });
        }
        else {
            this.metiersHelper.allowEmptyArray = !this.showMetier;
        }
        if (this.showMetier) {
            if (this.metiersHelper.size() === 0) {
                this.metiersHelper.resize(1);
            }
        }
        else if (this.metiersHelper.size() > 0) {
            this.metiersHelper.resize(0);
        }
    }
    initFishingAreas(form) {
        if (!this.fishingAreasHelper) {
            this.fishingAreasHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, form, 'fishingAreas'), (fishingArea) => this.fishingAreaValidatorService.getFormGroup(fishingArea, { required: true }), (o1, o2) => (isNil(o1) && isNil(o2)) || (o1 && o1.equals(o2)), (fishingArea) => !fishingArea || ReferentialUtils.isEmpty(fishingArea.location), { allowEmptyArray: !this.showFishingArea });
        }
        else {
            this.fishingAreasHelper.allowEmptyArray = !this.showFishingArea;
        }
        if (this.showFishingArea) {
            if (this.fishingAreasHelper.size() === 0) {
                this.fishingAreasHelper.resize(1);
            }
        }
        else if (this.fishingAreasHelper.size() > 0) {
            this.fishingAreasHelper.resize(0);
        }
    }
    /**
     * Make sure a pmfmStrategy exists to store the Strategy.label
     */
    mapPmfms(pmfms) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug(`${this._logPrefix} calling mapPmfms()`);
            // Create the missing Pmfm, to hold strategy (if need)
            if (this.showStrategy) {
                const existingIndex = (pmfms || []).findIndex((pmfm) => pmfm.id === PmfmIds.STRATEGY_LABEL);
                let strategyPmfm;
                if (existingIndex !== -1) {
                    // Remove existing, then copy it (to leave original unchanged)
                    strategyPmfm = pmfms.splice(existingIndex, 1)[0].clone();
                }
                else {
                    strategyPmfm = DenormalizedPmfmStrategy.fromObject({
                        id: PmfmIds.STRATEGY_LABEL,
                        type: 'string',
                    });
                }
                strategyPmfm.hidden = true; // Do not display it in measurement
                strategyPmfm.required = false; // Not need to be required, because of strategyControl validator
                // Prepend to list
                pmfms = [strategyPmfm, ...pmfms];
            }
            return pmfms;
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    displayObservedLocation(ol) {
        if (!ol)
            return null;
        const locationAttributes = this.settings.getFieldDisplayAttributes('location');
        const dateTimePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');
        return locationAttributes
            .map((attr) => getPropertyByPath(ol, `location.${attr}`))
            .concat([this.dateAdapter.format(ol.startDateTime, dateTimePattern)])
            .filter(isNotNilOrBlank)
            .join(' - ');
    }
    notHiddenPmfm(pmfm) {
        return !pmfm.hidden;
    }
};
__decorate([
    ViewChildren('fishingAreaField'),
    __metadata("design:type", QueryList)
], LandingForm.prototype, "fishingAreaFields", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], LandingForm.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "required", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "showProgram", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "showVessel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "showDateTime", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "showLocation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "showMeasurements", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "showButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "showMetier", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "showFishingArea", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingForm.prototype, "showTripDepartureDateTime", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], LandingForm.prototype, "locationLevelIds", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], LandingForm.prototype, "allowAddNewVessel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], LandingForm.prototype, "allowManyMetiers", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], LandingForm.prototype, "filteredFishingAreaLocations", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], LandingForm.prototype, "fishingAreaLocationLevelIds", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], LandingForm.prototype, "disabledParent", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingForm.prototype, "showStrategy", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingForm.prototype, "enableFishingAreaFilter", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingForm.prototype, "canEditStrategy", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingForm.prototype, "showObservers", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingForm.prototype, "showParent", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], LandingForm.prototype, "parentAcquisitionLevel", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], LandingForm.prototype, "observedLocationChanges", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], LandingForm.prototype, "openObservedLocation", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], LandingForm.prototype, "strategyChanges", void 0);
LandingForm = __decorate([
    Component({
        selector: 'app-landing-form',
        templateUrl: './landing.form.html',
        styleUrls: ['./landing.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        LandingValidatorService,
        ReferentialRefService,
        PersonService,
        VesselSnapshotService,
        ConfigService,
        TranslateService,
        ModalController,
        TripValidatorService,
        FishingAreaValidatorService,
        NetworkService,
        StrategyService,
        DateAdapter])
], LandingForm);
export { LandingForm };
//# sourceMappingURL=landing.form.js.map