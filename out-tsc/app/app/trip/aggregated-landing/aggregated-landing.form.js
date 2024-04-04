import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, Output } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import { AppForm, DateFormatService, fadeInOutAnimation, filterNotNil, firstNotNilPromise, FormArrayHelper, isNil, LocalSettingsService, NetworkService, SharedValidators, } from '@sumaris-net/ngx-components';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { AggregatedLandingService } from './aggregated-landing.service';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { VesselActivity } from './aggregated-landing.model';
import { VesselActivityValidatorService } from './vessel-activity.validator';
import { getMaxRankOrder } from '@app/data/services/model/model.utils';
import { environment } from '@environments/environment';
export class AggregatedLandingFormOption {
}
let AggregatedLandingForm = class AggregatedLandingForm extends AppForm {
    constructor(injector, dateFormat, formBuilder, dataService, vesselActivityValidatorService, referentialRefService, modalCtrl, settings, network, cd) {
        super(injector, null);
        this.dateFormat = dateFormat;
        this.formBuilder = formBuilder;
        this.dataService = dataService;
        this.vesselActivityValidatorService = vesselActivityValidatorService;
        this.referentialRefService = referentialRefService;
        this.modalCtrl = modalCtrl;
        this.settings = settings;
        this.network = network;
        this.cd = cd;
        this._activityDirty = false;
        this.showError = true;
        this.openTrip = new EventEmitter();
        this.$data = new BehaviorSubject(undefined);
        this.activityFocusIndex = -1;
        this.$loadingControls = new BehaviorSubject(false);
        this.controlsLoaded = false;
        this.onRefresh = new EventEmitter();
        this.console = console;
        this.mobile = this.settings.mobile;
        this.acquisitionLevel = AcquisitionLevelCodes.LANDING; // default
        this.debug = !environment.production;
    }
    get dirty() {
        return super.dirty && this._activityDirty;
    }
    get loading() {
        return this._loading;
    }
    get data() {
        // Save active form before return data
        this.saveActivitiesAt(this._activeDate);
        return this.$data.getValue();
    }
    set data(data) {
        this.$data.next(data);
    }
    get value() {
        throw new Error('The aggregated landing form has no form value accessible from outside');
    }
    set value(value) {
        throw new Error('The aggregated landing form has no form value accessible from outside');
    }
    get activitiesForm() {
        return this.form.controls.activities;
    }
    set options(option) {
        this._options = option;
    }
    get options() {
        return this._options;
    }
    ngOnInit() {
        var _a, _b, _c, _d;
        if (isNil(this._options)) {
            console.warn('[aggregated-landing-form] No option found, the form will be unusable');
        }
        this.dates = (_a = this._options) === null || _a === void 0 ? void 0 : _a.dates;
        this.programLabel = (_b = this._options) === null || _b === void 0 ? void 0 : _b.programLabel;
        this.acquisitionLevel = (_c = this._options) === null || _c === void 0 ? void 0 : _c.acquisitionLevel;
        const form = this.formBuilder.group({
            date: [(_d = this._options) === null || _d === void 0 ? void 0 : _d.initialDate, Validators.compose([Validators.required, SharedValidators.validDate])],
            activities: this.formBuilder.array([])
        });
        this.setForm(form);
        this.form.controls.activities.valueChanges
            .pipe(filter(() => !this._loading))
            .subscribe(value => {
            if (this.debug)
                console.debug('[aggregated-landing] activities changes', value);
            this._activityDirty = true;
            this.markForCheck();
        });
        this.initActivitiesHelper();
        const dateControl = this.form.get('date');
        this.registerSubscription(combineLatest([
            dateControl.valueChanges
                .pipe(distinctUntilChanged()),
            filterNotNil(this.$data)
        ])
            .subscribe(_ => this.showAtDate(dateControl.value)));
        super.ngOnInit();
    }
    addActivity() {
        if (this.debug)
            console.debug('[aggregated-landing-form] addActivity');
        this.activitiesHelper.add(this.newActivity());
        if (!this.mobile) {
            this.activityFocusIndex = this.activitiesHelper.size() - 1;
        }
    }
    removeActivity(index) {
        // TODO check data before remove
        this.activitiesHelper.removeAt(index);
    }
    ready() {
        return __awaiter(this, void 0, void 0, function* () {
            // Wait pmfms load, and controls load
            if (this.$loadingControls.getValue() === true && this.controlsLoaded === false) {
                if (this.debug)
                    console.debug(`[aggregated-landings-form] waiting form to be ready...`);
                yield firstNotNilPromise(this.$loadingControls
                    .pipe(filter((loadingControls) => loadingControls === false && this.controlsLoaded === true)), { stop: this.destroySubject });
            }
        });
    }
    get displayDateFn() {
        return (obj) => this.dateFormat.transform(obj, { pattern: 'dddd L' }).toString();
    }
    compareDateFn(d1, d2) {
        return d1 && d2 && d1.isSame(d2) || false;
    }
    openTripClick(activity) {
        if (!activity || !activity.tripId) {
            console.warn(`Something is missing to open trip: observedLocationId=${activity && activity.observedLocationId}, tripId=${activity && activity.tripId}`);
            return;
        }
        this.openTrip.emit({ activity });
    }
    /* -- internal functions -- */
    initActivitiesHelper() {
        this.activitiesHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'activities'), (activity) => this.vesselActivityValidatorService.getFormGroup(activity), (v1, v2) => v1.rankOrder === v2.rankOrder, value => VesselActivity.isEmpty(value), {
            allowEmptyArray: true
        });
    }
    showAtDate(date) {
        if (!date)
            throw new Error('[aggregated-landing-form] No date provided');
        console.debug(`[aggregated-landing-form] Show vessel activity at ${date}`);
        this.markAsLoading();
        this.disable();
        if (this._activeDate && !date.isSame(this._activeDate)) {
            // Save activities into data
            this.saveActivitiesAt(this._activeDate);
        }
        // Load activities for this date
        this._activeDate = date;
        this.activities = this.$data.getValue().vesselActivities.filter(value => value.date.isSame(date)).slice() || [null];
        // remove all previous forms
        this.activitiesForm.clear();
        // Add each activity with helper.add()
        for (const activity of this.activities) {
            this.activitiesHelper.add(activity);
        }
        this.enable();
        this.markAsLoaded();
        //setTimeout(() => this.markAsLoaded(), 500);
    }
    newActivity() {
        const maxRankOrder = getMaxRankOrder(this.activities);
        const activity = new VesselActivity();
        activity.rankOrder = maxRankOrder + 1;
        activity.date = this.form.value.date;
        this.activities.push(activity);
        return activity;
    }
    saveActivitiesAt(date) {
        if (isNil(date)) {
            console.warn('Try to save activities at undefined date');
            return;
        }
        if (this.debug)
            console.debug(`[aggregated-landing-form] save activities at ${date}`);
        const newActivities = this.$data.value.vesselActivities.filter(value => !value.date.isSame(date)).slice() || [];
        const activities = this.activitiesForm.value.map(v => VesselActivity.fromObject(v));
        newActivities.push(...activities);
        this.$data.getValue().vesselActivities = newActivities;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], AggregatedLandingForm.prototype, "showError", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], AggregatedLandingForm.prototype, "openTrip", void 0);
__decorate([
    Input(),
    __metadata("design:type", AggregatedLandingFormOption),
    __metadata("design:paramtypes", [AggregatedLandingFormOption])
], AggregatedLandingForm.prototype, "options", null);
AggregatedLandingForm = __decorate([
    Component({
        selector: 'app-aggregated-landings-form',
        templateUrl: './aggregated-landing.form.html',
        styleUrls: ['./aggregated-landing.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
        animations: [fadeInOutAnimation]
    }),
    __metadata("design:paramtypes", [Injector,
        DateFormatService,
        UntypedFormBuilder,
        AggregatedLandingService,
        VesselActivityValidatorService,
        ReferentialRefService,
        ModalController,
        LocalSettingsService,
        NetworkService,
        ChangeDetectorRef])
], AggregatedLandingForm);
export { AggregatedLandingForm };
//# sourceMappingURL=aggregated-landing.form.js.map