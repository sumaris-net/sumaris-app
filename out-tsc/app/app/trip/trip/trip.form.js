import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, Output, QueryList, ViewChild, ViewChildren, } from '@angular/core';
import { TripValidatorService } from './trip.validator';
import { ModalController } from '@ionic/angular';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { AppForm, DateUtils, EntityUtils, equals, fromDateISOString, isEmptyArray, isNotEmptyArray, isNotNil, isNotNilOrBlank, MatAutocompleteField, NetworkService, PersonService, PersonUtils, ReferentialRef, referentialToString, ReferentialUtils, StatusIds, toBoolean, toDateISOString, } from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { UntypedFormBuilder } from '@angular/forms';
import { Vessel } from '@app/vessel/services/model/vessel.model';
import { METIER_DEFAULT_FILTER, MetierService } from '@app/referential/services/metier.service';
import { Trip } from './trip.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { debounceTime, filter, map } from 'rxjs/operators';
import { VesselModal } from '@app/vessel/modal/vessel-modal';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { combineLatest } from 'rxjs';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
const TRIP_METIER_DEFAULT_FILTER = METIER_DEFAULT_FILTER;
let TripForm = class TripForm extends AppForm {
    constructor(injector, formBuilder, validatorService, vesselSnapshotService, referentialRefService, programRefService, metierService, personService, modalCtrl, network, cd) {
        super(injector, validatorService.getFormGroup());
        this.formBuilder = formBuilder;
        this.validatorService = validatorService;
        this.vesselSnapshotService = vesselSnapshotService;
        this.referentialRefService = referentialRefService;
        this.programRefService = programRefService;
        this.metierService = metierService;
        this.personService = personService;
        this.modalCtrl = modalCtrl;
        this.network = network;
        this.cd = cd;
        this.mobile = this.settings.mobile;
        //readonly appearance = this.mobile ? 'outline' : 'legacy';
        this.observerFocusIndex = -1;
        this.enableMetierFilter = false;
        this.metierFocusIndex = -1;
        this.canFilterMetier = false;
        this.showComment = true;
        this.allowAddNewVessel = true;
        this.showError = true;
        this.vesselDefaultStatus = StatusIds.TEMPORARY;
        this.metierHistoryNbDays = 60;
        this.locationLevelIds = [LocationLevelIds.PORT];
        this.departureDateTimeChanges = new EventEmitter();
        this.departureLocationChanges = new EventEmitter();
        this.maxDateChanges = new EventEmitter();
        this.referentialToString = referentialToString;
    }
    set showObservers(value) {
        if (this._showObservers !== value) {
            this._showObservers = value;
            if (!this.loading)
                this.updateFormGroup();
        }
    }
    get showObservers() {
        return this._showObservers;
    }
    set showMetiers(value) {
        if (this._showMetiers !== value) {
            this._showMetiers = value;
            if (!this.loading)
                this.updateFormGroup();
        }
    }
    get showMetiers() {
        return this._showMetiers;
    }
    set locationSuggestLengthThreshold(value) {
        if (this._locationSuggestLengthThreshold !== value) {
            this._locationSuggestLengthThreshold = value;
            // Update fields
            if (this.autocompleteFields.location) {
                this.autocompleteFields.location.suggestLengthThreshold = value;
                this.locationFields.forEach((field) => {
                    field.suggestLengthThreshold = value;
                    field.reloadItems();
                });
            }
        }
    }
    set returnFieldsRequired(value) {
        if (this._returnFieldsRequired !== value) {
            this._returnFieldsRequired = value;
            if (!this.loading)
                this.updateFormGroup();
        }
    }
    get returnFieldsRequired() {
        return this._returnFieldsRequired;
    }
    get vesselSnapshot() {
        return this.form.get('vesselSnapshot').value;
    }
    get value() {
        const json = this.form.value;
        // Add program, because if control disabled the value is missing
        json.program = this.form.get('program').value;
        if (!this._showObservers)
            json.observers = []; // Remove observers, if hide
        if (!this._showMetiers)
            json.metiers = []; // Remove metiers, if hide
        return json;
    }
    set value(json) {
        this.setValue(json);
    }
    get observersForm() {
        return this.form.controls.observers;
    }
    get metiersForm() {
        return this.form.controls.metiers;
    }
    ngOnInit() {
        super.ngOnInit();
        // Default values
        this.showObservers = toBoolean(this.showObservers, false); // Will init the observers helper
        this.showMetiers = toBoolean(this.showMetiers, false); // Will init the metiers helper
        this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
        this.returnFieldsRequired = toBoolean(this.returnFieldsRequired, !this.settings.isOnFieldMode);
        if (isEmptyArray(this.locationLevelIds))
            this.locationLevelIds = [LocationLevelIds.PORT];
        // Combo: programs
        this.registerAutocompleteField('program', {
            service: this.programRefService,
            filter: {
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
                acquisitionLevelLabels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION],
            },
            mobile: this.mobile,
            showAllOnFocus: this.mobile,
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
            suggestLengthThreshold: this._locationSuggestLengthThreshold || 0,
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
        // Combo: metiers
        const metierAttributes = this.settings.getFieldDisplayAttributes('metier');
        this.registerAutocompleteField('metier', {
            // Important, to get the current (focused) control value, in suggestMetiers() function (otherwise it will received '*').
            //showAllOnFocus: false,
            suggestFn: (value, options) => this.suggestMetiers(value, options),
            // Default filter. An excludedIds will be add dynamically
            filter: {
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
            },
            // Increase default size (=3) of 'label' column
            columnSizes: metierAttributes.map((a) => (a === 'label' ? 4 : undefined) /*auto*/),
            attributes: metierAttributes,
            mobile: this.mobile,
        });
        // Update metier filter when form changed (if filter enable)
        this.registerSubscription(this.form.valueChanges
            .pipe(debounceTime(250), filter((_) => this._showMetiers))
            .subscribe((value) => this.updateMetierFilter(value)));
    }
    ngOnReady() {
        this.updateFormGroup();
        const departureLocation$ = this.form.get('departureLocation').valueChanges;
        const departureDateTime$ = this.form.get('departureDateTime').valueChanges;
        const returnDateTime$ = this.form.get('returnDateTime').valueChanges;
        this.registerSubscription(departureLocation$.subscribe(departureLocation => this.departureLocationChanges.next(ReferentialRef.fromObject(departureLocation))));
        this.registerSubscription(departureDateTime$
            .subscribe(departureDateTime => this.departureDateTimeChanges.next(fromDateISOString(departureDateTime))));
        this.registerSubscription(combineLatest([departureDateTime$, returnDateTime$])
            .pipe(map(([d1, d2]) => DateUtils.max(d1, d2)))
            .subscribe(max => this.maxDateChanges.next(max)));
    }
    registerAutocompleteField(fieldName, opts) {
        return super.registerAutocompleteField(fieldName, opts);
    }
    toggleFilteredMetier() {
        if (this.enableMetierFilter) {
            this.enableMetierFilter = false;
        }
        else {
            const value = this.form.value;
            const date = value.returnDateTime || value.departureDateTime;
            const vesselId = value.vesselSnapshot && value.vesselSnapshot.id;
            this.enableMetierFilter = date && isNotNil(vesselId);
        }
        // Update the metier filter
        this.updateMetierFilter();
    }
    reset(data, opts) {
        this.setValue(data || new Trip(), opts);
    }
    setValue(data, opts) {
        const _super = Object.create(null, {
            setValue: { get: () => super.setValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Wait ready (= form group updated, by the parent page)
            yield this.ready();
            // Make sure to have (at least) one observer
            // Resize observers array
            if (this._showObservers) {
                data.observers = data.observers && data.observers.length ? data.observers : [null];
            }
            else {
                data.observers = [];
            }
            // Make sure to have (at least) one metier
            this._showMetiers = this._showMetiers || isNotEmptyArray(data === null || data === void 0 ? void 0 : data.metiers);
            if (this._showMetiers) {
                data.metiers = data.metiers && data.metiers.length ? data.metiers : [null];
            }
            else {
                data.metiers = [];
            }
            this.maxDateChanges.emit(DateUtils.max(data.departureDateTime, data.returnDateTime));
            // Send value for form
            _super.setValue.call(this, data, opts);
        });
    }
    addVesselModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const maxDate = this.form.get('departureDateTime').value;
            const modal = yield this.modalCtrl.create({
                component: VesselModal,
                componentProps: {
                    defaultStatus: this.vesselDefaultStatus,
                    maxDate: isNotNil(maxDate) ? toDateISOString(maxDate) : undefined,
                },
            });
            yield modal.present();
            const res = yield modal.onDidDismiss();
            // if new vessel added, use it
            const vessel = res && res.data;
            if (vessel) {
                const vesselSnapshot = vessel instanceof VesselSnapshot ? vessel : vessel instanceof Vessel ? VesselSnapshot.fromVessel(vessel) : VesselSnapshot.fromObject(vessel);
                console.debug('[trip-form] New vessel added : updating form...', vesselSnapshot);
                this.form.controls['vesselSnapshot'].setValue(vesselSnapshot);
                this.markForCheck();
            }
            else {
                console.debug('[trip-form] No vessel added (user cancelled)');
            }
        });
    }
    addObserver() {
        this.observersForm.add();
        if (!this.mobile) {
            this.observerFocusIndex = this.observersForm.length - 1;
        }
    }
    addMetier() {
        this.metiersForm.add();
        if (!this.mobile) {
            this.metierFocusIndex = this.metiersForm.length - 1;
        }
    }
    /* -- protected methods-- */
    updateMetierFilter(value) {
        console.debug('[trip-form] Updating metier filter...');
        value = value || this.form.value;
        const program = value.program || this.form.get('program').value;
        const programLabel = program && program.label;
        const endDate = fromDateISOString(value.returnDateTime || value.departureDateTime);
        const vesselId = value.vesselSnapshot && value.vesselSnapshot.id;
        const canFilterMetier = endDate && isNotNilOrBlank(programLabel) && isNotNil(vesselId);
        let metierFilter;
        if (!this.enableMetierFilter || !canFilterMetier) {
            metierFilter = TRIP_METIER_DEFAULT_FILTER;
        }
        else {
            const startDate = endDate
                .clone()
                .startOf('day')
                .add(-1 * this.metierHistoryNbDays, 'day');
            const excludedTripId = EntityUtils.isRemote(value) ? value.id : undefined;
            metierFilter = Object.assign(Object.assign({}, TRIP_METIER_DEFAULT_FILTER), { programLabel,
                vesselId,
                startDate,
                endDate,
                excludedTripId });
        }
        if (this.canFilterMetier !== canFilterMetier || this.metierFilter !== metierFilter) {
            this.canFilterMetier = canFilterMetier;
            this.metierFilter = metierFilter;
            this.markForCheck();
            this.metierField.reloadItems();
        }
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
        const newValue = currentControlValue ? '*' : value;
        // Excluded existing observers, BUT keep the current control value
        const excludedIds = (this.metiersForm.value || [])
            .filter(ReferentialUtils.isNotEmpty)
            .filter((item) => !currentControlValue || currentControlValue !== item)
            .map((item) => parseInt(item.id));
        return this.metierService.suggest(newValue, Object.assign(Object.assign(Object.assign({}, filter), this.metierFilter), { excludedIds }));
    }
    updateFormGroup() {
        const validatorOpts = {
            returnFieldsRequired: this._returnFieldsRequired,
            minDurationInHours: this.minDurationInHours,
            maxDurationInHours: this.maxDurationInHours,
            withMetiers: this.showMetiers,
            withObservers: this.showObservers
        };
        if (!equals(validatorOpts, this._lastValidatorOpts)) {
            console.info('[trip-form] Updating form group, using opts', validatorOpts);
            this.validatorService.updateFormGroup(this.form, validatorOpts);
            // Need to refresh the form state  (otherwise the returnLocation is still invalid)
            if (!this.loading) {
                this.updateValueAndValidity();
                // Not need to markForCheck (should be done inside updateValueAndValidity())
                //this.markForCheck();
            }
            else {
                // Need to toggle return date time to required
                this.markForCheck();
            }
            // Remember used opts, for next call
            this._lastValidatorOpts = validatorOpts;
        }
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], TripForm.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], TripForm.prototype, "allowAddNewVessel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], TripForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], TripForm.prototype, "vesselDefaultStatus", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], TripForm.prototype, "metierHistoryNbDays", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TripForm.prototype, "showObservers", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TripForm.prototype, "showMetiers", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], TripForm.prototype, "locationLevelIds", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], TripForm.prototype, "minDurationInHours", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], TripForm.prototype, "maxDurationInHours", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], TripForm.prototype, "locationSuggestLengthThreshold", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], TripForm.prototype, "returnFieldsRequired", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], TripForm.prototype, "departureDateTimeChanges", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], TripForm.prototype, "departureLocationChanges", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], TripForm.prototype, "maxDateChanges", void 0);
__decorate([
    ViewChild('metierField'),
    __metadata("design:type", MatAutocompleteField)
], TripForm.prototype, "metierField", void 0);
__decorate([
    ViewChildren('locationField'),
    __metadata("design:type", QueryList)
], TripForm.prototype, "locationFields", void 0);
TripForm = __decorate([
    Component({
        selector: 'app-form-trip',
        templateUrl: './trip.form.html',
        styleUrls: ['./trip.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        TripValidatorService,
        VesselSnapshotService,
        ReferentialRefService,
        ProgramRefService,
        MetierService,
        PersonService,
        ModalController,
        NetworkService,
        ChangeDetectorRef])
], TripForm);
export { TripForm };
//# sourceMappingURL=trip.form.js.map