import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import { Moment } from 'moment';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { ObservedLocationValidatorOptions, ObservedLocationValidatorService } from '../observed-location.validator';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { FormGroup, UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
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
import { AcquisitionLevelCodes, LocationLevelIds, PmfmIds } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { DateFilterFn } from '@angular/material/datepicker';
import { MeasurementsFormState } from '@app/data/measurement/measurements.utils';
import { RxState } from '@rx-angular/state';
import { OBSERVED_LOCATION_DEFAULT_PROGRAM_FILTER } from '@app/trip/trip.config';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { Observable } from 'rxjs';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';

export interface ObservedLocationFormState extends MeasurementsFormState {
  showObservers: boolean;
}

@Component({
  selector: 'app-form-observed-location',
  templateUrl: './observed-location.form.html',
  styleUrls: ['./observed-location.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class ObservedLocationForm extends MeasurementValuesForm<ObservedLocation, ObservedLocationFormState> implements OnInit {
  private _showSamplingStrata: boolean;
  private _locationSuggestLengthThreshold: number;
  private _lastValidatorOpts: any;

  @RxStateSelect() protected showObservers$: Observable<boolean>;
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

  @Input() set showSamplingStrata(value: boolean) {
    if (this._showSamplingStrata !== value) {
      this._showSamplingStrata = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get showSamplingStrata(): boolean {
    return this._showSamplingStrata;
  }

  @RxStateProperty() @Input() showObservers: boolean;

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
    super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(), {
      onUpdateFormGroup: (form) => this.updateFormGroup(),
      mapPmfms: (pmfms) => this.mapPmfms(pmfms),
    });
    this._enable = false;

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.OBSERVED_LOCATION;

    // FOR DEV ONLY ----
    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.showSamplingStrata = toBoolean(this.showSamplingStrata, false); // Will init the observers helper
    this.showObservers = toBoolean(this.showObservers, false);
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
    if (isEmptyArray(this.locationLevelIds)) this.locationLevelIds = [LocationLevelIds.PORT];

    // Combo: programs
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: OBSERVED_LOCATION_DEFAULT_PROGRAM_FILTER,
      mobile: this.mobile,
      showAllOnFocus: this.mobile,
    });

    // Combo: sampling strata
    this.registerAutocompleteField('samplingStrata', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, { ...filter, levelLabel: this.programLabel }, null, null, {
          withProperties: true,
        }),
      filter: <Partial<ReferentialRefFilter>>{
        entityName: 'DenormalizedSamplingStrata',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      attributes: ['label', 'properties.samplingSchemeLabel'],
      columnNames: ['REFERENTIAL.LABEL', 'TRIP.SAMPLING_SCHEME_LABEL'], // TODO JVF: Changer "TRIP"
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

    this._state.hold(this.showObservers$.pipe(filter(() => this.loaded)), () => this.updateFormGroup());
  }

  protected onApplyingEntity(data: ObservedLocation, opts?: { [p: string]: any }) {
    if (!data) return;

    super.onApplyingEntity(data, opts);

    // Make sure to have (at least) one observer
    // Resize observers array
    if (this.showObservers) {
      data.observers = isNotEmptyArray(data.observers) ? data.observers : [null];
    } else {
      data.observers = [null];
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
    this.updateFormGroup();

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

  updateFormGroup(form?: FormGroup) {
    form = form || this.form;
    const validatorOpts: ObservedLocationValidatorOptions = {
      timezone: this.timezone,
      startDateDay: this.startDateDay,
      withSamplingStrata: this.showSamplingStrata,
      withObservers: this.showObservers,
    };

    if (!equals(validatorOpts, this._lastValidatorOpts)) {
      console.info('[observed-location-form] Updating form group, using opts', validatorOpts);

      this.validatorService.updateFormGroup(form, validatorOpts);

      // Need to refresh the form state  (otherwise the returnLocation is still invalid)
      if (!this.loading) {
        this.updateValueAndValidity();
        // Not need to markForCheck (should be done inside updateValueAndValidity())
        //this.markForCheck();
      } else {
        // Need to toggle date or observers
        this.markForCheck();
      }

      // Remember used opts, for next call
      this._lastValidatorOpts = validatorOpts;
    }
  }

  protected async mapPmfms(pmfms: IPmfm[]): Promise<IPmfm[]> {
    if (!pmfms) return; // Skip if empty

    const saleTypePmfm = pmfms.find((pmfm) => pmfm.id === PmfmIds.SALE_TYPE);

    if (saleTypePmfm) {
      console.debug(`[control] Setting pmfm ${saleTypePmfm.label} qualitative values`);
      const saleTypes = await this.referentialRefService.loadAll(0, 100, null, null, { entityName: 'SaleType' }, { withTotal: false });
      saleTypePmfm.type = 'qualitative_value';
      saleTypePmfm.qualitativeValues = saleTypes.data;
    }

    return pmfms;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
