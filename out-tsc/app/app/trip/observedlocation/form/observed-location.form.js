import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { ObservedLocationValidatorService } from '../observed-location.validator';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { UntypedFormBuilder } from '@angular/forms';
import { DateUtils, FormArrayHelper, fromDateISOString, isEmptyArray, isNil, isNotNil, PersonService, PersonUtils, ReferentialUtils, StatusIds, toBoolean, toDateISOString } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { environment } from '@environments/environment';
let ObservedLocationForm = class ObservedLocationForm extends MeasurementValuesForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, validatorService, referentialRefService, personService) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup());
        this.measurementsValidatorService = measurementsValidatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.validatorService = validatorService;
        this.referentialRefService = referentialRefService;
        this.personService = personService;
        this.required = true;
        this.showError = true;
        this.showEndDateTime = true;
        this.showStartTime = true;
        this.showEndTime = true;
        this.showComment = true;
        this.showButtons = true;
        this.showProgram = true;
        this.startDateDay = null;
        this.timezone = null;
        this.observerFocusIndex = -1;
        this._enable = false;
        this.mobile = this.settings.mobile;
        // Set default acquisition level
        this.acquisitionLevel = AcquisitionLevelCodes.OBSERVED_LOCATION;
        // FOR DEV ONLY ----
        this.debug = !environment.production;
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
    get empty() {
        const value = this.value;
        return (!value.location || !value.location.id)
            && (!value.startDateTime)
            && (!value.comments || !value.comments.length);
    }
    get valid() {
        return this.form && (this.required ? this.form.valid : (this.form.valid || this.empty));
    }
    get observersForm() {
        return this.form.controls.observers;
    }
    get measurementValuesForm() {
        return this.form.controls.measurementValues;
    }
    get programControl() {
        return this.form.get('program');
    }
    ngOnInit() {
        super.ngOnInit();
        // Default values
        this.showObservers = toBoolean(this.showObservers, true); // Will init the observers helper
        this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
        if (isEmptyArray(this.locationLevelIds))
            this.locationLevelIds = [LocationLevelIds.PORT];
        // Combo: programs
        this.registerAutocompleteField('program', {
            service: this.programRefService,
            filter: {
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
                acquisitionLevelLabels: [AcquisitionLevelCodes.OBSERVED_LOCATION, AcquisitionLevelCodes.LANDING]
            }
        });
        // Combo location
        this.registerAutocompleteField('location', {
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { levelIds: this.locationLevelIds })),
            filter: {
                entityName: 'Location',
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
            },
            mobile: this.mobile
        });
        // Combo: observers
        this.registerAutocompleteField('person', {
            // Important, to get the current (focused) control value, in suggestObservers() function (otherwise it will received '*').
            showAllOnFocus: false,
            suggestFn: (value, filter) => this.suggestObservers(value, filter),
            // Default filter. An excludedIds will be add dynamically
            filter: {
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
                userProfiles: ['SUPERVISOR', 'USER']
            },
            attributes: ['lastName', 'firstName', 'department.name'],
            displayWith: PersonUtils.personToString,
            mobile: this.mobile
        });
        // Propagate program
        this.registerSubscription(this.form.get('program').valueChanges
            .pipe(debounceTime(250), map(value => (value && typeof value === 'string') ? value : (value && value.label || undefined)), distinctUntilChanged())
            .subscribe(programLabel => this.programLabel = programLabel));
        // Copy startDateTime to endDateTime, when endDate is hidden
        const endDateTimeControl = this.form.get('endDateTime');
        this.registerSubscription(this.form.get('startDateTime').valueChanges
            .pipe(debounceTime(150))
            .subscribe(startDateTime => {
            var _a;
            startDateTime = (_a = fromDateISOString(startDateTime)) === null || _a === void 0 ? void 0 : _a.clone();
            if (!startDateTime)
                return; // Skip
            if (this.timezone)
                startDateTime.tz(this.timezone);
            // Compute the end date time
            if (!this.showEndDateTime) {
                // copy start date time + 1ms
                const endDateTime = startDateTime.clone().add(1, 'millisecond');
                endDateTimeControl.patchValue(toDateISOString(endDateTime), { emitEvent: false });
            }
            // Add a offset
            else if (this.forceDurationDays > 0) {
                const endDate = startDateTime.clone()
                    .add(this.forceDurationDays, 'day')
                    .add(-1, 'second');
                // add expected number of days
                endDateTimeControl.patchValue(toDateISOString(endDate), { emitEvent: false });
            }
        }));
    }
    onApplyingEntity(data, opts) {
        if (!data)
            return;
        super.onApplyingEntity(data, opts);
        // Make sure to have (at least) one observer
        // TODO BLA enable this
        //data.observers = data.observers && data.observers.length ? data.observers : [null];
        // Resize observers array
        if (this._showObservers) {
            this.observersHelper.resize(Math.max(1, data.observers.length));
        }
        else {
            this.observersHelper.removeAllEmpty();
        }
        // Force to show end date
        if (!this.showEndDateTime && isNotNil(data.endDateTime) && isNotNil(data.startDateTime)) {
            const diffInSeconds = fromDateISOString(data.endDateTime)
                .diff(fromDateISOString(data.startDateTime), 'second');
            if (diffInSeconds !== 0) {
                this.showEndDateTime = true;
                this.markForCheck();
            }
        }
        // Update form group
        this.validatorService.updateFormGroup(this.form, {
            startDateDay: this.startDateDay,
            timezone: this.timezone
        });
        // Create a filter for start date picker
        this.startDatePickerFilter = (d) => isNil(this.startDateDay) || DateUtils.isAtDay(d, this.startDateDay, this.timezone);
    }
    addObserver() {
        this.observersHelper.add();
        if (!this.mobile) {
            this.observerFocusIndex = this.observersHelper.size() - 1;
        }
    }
    enable(opts) {
        super.enable(opts);
        // Leave program disable once data has been saved
        if (!this.isNewData && !this.programControl.disabled) {
            this.programControl.disable({ emitEvent: false });
            this.markForCheck();
        }
    }
    /* -- protected method -- */
    initObserversHelper() {
        if (isNil(this._showObservers))
            return; // skip if not loading yet
        this.observersHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'observers'), (person) => this.validatorService.getObserverControl(person), ReferentialUtils.equals, ReferentialUtils.isEmpty, {
            allowEmptyArray: !this._showObservers
        });
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
    suggestObservers(value, filter) {
        const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
        const newValue = currentControlValue ? '*' : value;
        // Excluded existing observers, BUT keep the current control value
        const excludedIds = (this.observersForm.value || [])
            .filter(ReferentialUtils.isNotEmpty)
            .filter(person => !currentControlValue || currentControlValue !== person)
            .map(person => parseInt(person.id));
        return this.personService.suggest(newValue, Object.assign(Object.assign({}, filter), { excludedIds }));
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationForm.prototype, "required", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationForm.prototype, "showEndDateTime", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationForm.prototype, "showStartTime", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationForm.prototype, "showEndTime", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationForm.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationForm.prototype, "showButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationForm.prototype, "showProgram", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], ObservedLocationForm.prototype, "startDateDay", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], ObservedLocationForm.prototype, "forceDurationDays", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], ObservedLocationForm.prototype, "timezone", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], ObservedLocationForm.prototype, "locationLevelIds", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ObservedLocationForm.prototype, "showObservers", null);
ObservedLocationForm = __decorate([
    Component({
        selector: 'app-form-observed-location',
        templateUrl: './observed-location.form.html',
        styleUrls: ['./observed-location.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        ObservedLocationValidatorService,
        ReferentialRefService,
        PersonService])
], ObservedLocationForm);
export { ObservedLocationForm };
//# sourceMappingURL=observed-location.form.js.map