import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import { Moment } from 'moment';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { ObservedLocationValidatorOptions, ObservedLocationValidatorService } from '../observed-location.validator';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import {
  AppFormArray,
  DateUtils,
  equals,
  fromDateISOString,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  Person,
  PersonService,
  PersonUtils,
  ReferentialUtils,
  StatusIds,
  toBoolean,
  toDateISOString,
  UserProfileLabel,
} from '@sumaris-net/ngx-components';
import { ObservedLocation } from '../observed-location.model';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { DateFilterFn } from '@angular/material/datepicker';
import { MeasurementsFormState } from '@app/data/measurement/measurements.utils';
import { RxState } from '@rx-angular/state';

export interface ObservedLocationFormState extends MeasurementsFormState {}

@Component({
  selector: 'app-form-observed-location',
  templateUrl: './observed-location.form.html',
  styleUrls: ['./observed-location.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState]
})
export class ObservedLocationForm extends MeasurementValuesForm<ObservedLocation, ObservedLocationFormState> implements OnInit {

  private _showObservers: boolean;
  private _locationSuggestLengthThreshold: number;
  private _lastValidatorOpts: any;

  protected observerFocusIndex = -1;
  protected startDatePickerFilter: DateFilterFn<Moment>;
  protected isStartDateInTheFuture: boolean;

  @Input() locationLevelIds: number[];
  @Input() required = true;
  @Input() showError = true;
  @Input() showEndDateTime = true;
  @Input() showStartTime = true;
  @Input() showEndTime = true;
  @Input() showComment = true;
  @Input() showButtons = true;
  @Input() showProgram = true;
  @Input() startDateDay: number = null;
  @Input() forceDurationDays: number;
  @Input() timezone: string = null;
  @Input() mobile = false;

  @Input()
  set showObservers(value: boolean) {
    if (this._showObservers !== value) {
      this._showObservers = value;
      if (!this.loading) this.updateFormGroup();
    }
  }
  get showObservers(): boolean {
    return this._showObservers;
  }

  get empty(): any {
    const value = this.value;
    return (!value.location || !value.location.id) && !value.startDateTime && (!value.comments || !value.comments.length);
  }

  get valid(): any {
    return this.form && (this.required ? this.form.valid : this.form.valid || this.empty);
  }

  get observersForm() {
    return this.form.controls.observers as AppFormArray<Person, UntypedFormControl>;
  }

  constructor(
    injector: Injector,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService,
    protected validatorService: ObservedLocationValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected personService: PersonService
  ) {
    super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup());
    this._enable = false;

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.OBSERVED_LOCATION;

    // FOR DEV ONLY ----
    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.showObservers = toBoolean(this.showObservers, false); // Will init the observers helper
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
    if (isEmptyArray(this.locationLevelIds)) this.locationLevelIds = [LocationLevelIds.PORT];

    // Combo: programs
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        acquisitionLevelLabels: [AcquisitionLevelCodes.OBSERVED_LOCATION, AcquisitionLevelCodes.LANDING],
      },
      mobile: this.mobile,
      showAllOnFocus: this.mobile,
    });

    // Combo location
    this.registerAutocompleteField('location', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, {
          ...filter,
          levelIds: this.locationLevelIds,
        }),
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
        userProfiles: <UserProfileLabel[]>['SUPERVISOR', 'USER'],
      },
      attributes: ['lastName', 'firstName', 'department.name'],
      displayWith: PersonUtils.personToString,
      mobile: this.mobile,
    });

    // Propagate program
    this.registerSubscription(
      this.form
        .get('program')
        .valueChanges.pipe(
          debounceTime(250),
          map((value) => (value && typeof value === 'string' ? value : (value && value.label) || undefined)),
          distinctUntilChanged()
        )
        .subscribe((programLabel) => (this.programLabel = programLabel))
    );

    // Copy startDateTime to endDateTime, when endDate is hidden
    const endDateTimeControl = this.form.get('endDateTime');
    this.registerSubscription(
      this.form
        .get('startDateTime')
        .valueChanges.pipe(debounceTime(150))
        .subscribe((startDateTime) => {
          startDateTime = fromDateISOString(startDateTime)?.clone();
          if (!startDateTime) return; // Skip
          if (this.timezone) startDateTime.tz(this.timezone);

          // Compute the end date time
          if (!this.showEndDateTime) {
            // copy start date time + 1ms
            const endDateTime = startDateTime.clone().add(1, 'millisecond');
            endDateTimeControl.patchValue(toDateISOString(endDateTime), { emitEvent: false });
          }
          // Add a offset
          else if (this.forceDurationDays > 0) {
            const endDate = startDateTime.clone().add(this.forceDurationDays, 'day').add(-1, 'second');
            // add expected number of days
            endDateTimeControl.patchValue(toDateISOString(endDate), { emitEvent: false });
          }

          // Warning if date is in the future
          this.isStartDateInTheFuture = startDateTime.isAfter();
          this.markForCheck();
        })
    );
  }

  protected onApplyingEntity(data: ObservedLocation, opts?: { [p: string]: any }) {
    if (!data) return;

    super.onApplyingEntity(data, opts);

    // Make sure to have (at least) one observer
    // Resize observers array
    if (this._showObservers) {
      data.observers = isNotEmptyArray(data.observers) ? data.observers : [null];
    } else {
      data.observers = [];
    }

    // Force to show end date
    if (!this.showEndDateTime && isNotNil(data.endDateTime) && isNotNil(data.startDateTime)) {
      const diffInSeconds = fromDateISOString(data.endDateTime).diff(fromDateISOString(data.startDateTime), 'second');
      if (diffInSeconds !== 0) {
        this.showEndDateTime = true;
        this.markForCheck();
      }
    }

    // Update form group
    this.validatorService.updateFormGroup(this.form, {
      startDateDay: this.startDateDay,
      timezone: this.timezone,
    });

    // Create a filter for start date picker
    this.startDatePickerFilter = (d) => isNil(this.startDateDay) || DateUtils.isAtDay(d, this.startDateDay, this.timezone);
  }

  addObserver() {
    this.observersForm.add();
    if (!this.mobile) {
      this.observerFocusIndex = this.observersForm.length - 1;
    }
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }): void {
    super.enable(opts);

    // Leave program disable once data has been saved
    if (!this.isNewData && !this.programControl.disabled) {
      this.programControl.disable({ emitEvent: false });
      this.markForCheck();
    }
  }

  /* -- protected method -- */

  protected suggestObservers(value: any, filter?: any): Promise<LoadResult<Person>> {
    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
    const newValue = currentControlValue ? '*' : value;

    // Excluded existing observers, BUT keep the current control value
    const excludedIds = (this.observersForm.value || [])
      .filter(ReferentialUtils.isNotEmpty)
      .filter((person) => !currentControlValue || currentControlValue !== person)
      .map((person) => parseInt(person.id));

    return this.personService.suggest(newValue, {
      ...filter,
      excludedIds,
    });
  }

  updateFormGroup() {
    const validatorOpts: ObservedLocationValidatorOptions = {
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
      } else {
        // Need to toggle return date time to required
        this.markForCheck();
      }

      // Remember used opts, for next call
      this._lastValidatorOpts = validatorOpts;
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
