import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, OnInit, Output } from '@angular/core';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { ActivityCalendarValidatorOptions, ActivityCalendarValidatorService } from '../model/activity-calendar.validator';
import { IMeasurementsFormOptions, MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { AbstractControl, FormGroup, UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import {
  AppFormArray,
  DateUtils,
  equals,
  fromDateISOString,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LoadResult,
  NetworkService,
  Person,
  PersonService,
  PersonUtils,
  ReferentialUtils,
  setPropertyByPath,
  StatusIds,
  toBoolean,
  toDateISOString,
  UserProfileLabel,
} from '@sumaris-net/ngx-components';
import { ActivityCalendar } from '../model/activity-calendar.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { MeasurementsFormState } from '@app/data/measurement/measurements.utils';
import { RxState } from '@rx-angular/state';
import { ACTIVITY_CALENDAR_FEATURE_DEFAULT_PROGRAM_FILTER } from '@app/activity-calendar/activity-calendar.config';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { VesselModal } from '@app/vessel/modal/vessel-modal';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Vessel } from '@app/vessel/services/model/vessel.model';
import { ModalController } from '@ionic/angular';
import { merge, Observable, tap } from 'rxjs';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';

export interface ActivityCalendarFormState extends MeasurementsFormState {
  showYear: boolean;
  showObservers: boolean;
  warnFutureYear: boolean;
}

@Component({
  selector: 'app-form-activity-calendar',
  templateUrl: './activity-calendar.form.html',
  styleUrls: ['./activity-calendar.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class ActivityCalendarForm
  extends MeasurementValuesForm<ActivityCalendar, ActivityCalendarFormState, IMeasurementsFormOptions<ActivityCalendarFormState>>
  implements OnInit
{
  private _lastValidatorOpts: any;
  private _readonlyControlNames: (keyof ActivityCalendar)[] = ['program', 'year', 'startDate', 'directSurveyInvestigation', 'economicSurvey', 'year'];
  protected observerFocusIndex = -1;

  @RxStateSelect() protected showObservers$: Observable<boolean>;
  @RxStateSelect() protected warnFutureYear$: Observable<boolean>;

  @Input() required = true;
  @Input() showError = true;
  @Input() showYear = true;
  @Input() showComment = true;
  @Input() showButtons = true;
  @Input() showProgram = true;
  @Input() showVessel = true;
  @Input() showEconomicSurvey = true;
  @Input() timezone: string = DateUtils.moment().tz();
  @Input() mobile = false;
  @Input() allowAddNewVessel = true;
  @Input() vesselDefaultStatus = StatusIds.TEMPORARY;
  @Input() @RxStateProperty() showObservers: boolean;
  @Input() @RxStateProperty() warnFutureYear: boolean;

  get empty(): any {
    const value = this.value;
    return isNil(value.vesselSnapshot?.id) && isNil(value.year) && isNotNilOrBlank(value.comments);
  }

  get valid(): any {
    return this.form && (this.required ? this.form.valid : this.form.valid || this.empty);
  }

  get yearControl(): AbstractControl {
    return this.form.get('year');
  }
  get directSurveyInvestigationControl(): AbstractControl {
    return this.form.get('directSurveyInvestigation');
  }
  get economicSurveyControl(): AbstractControl {
    return this.form.get('economicSurvey');
  }

  get observersForm() {
    return this.form.controls.observers as AppFormArray<Person, UntypedFormControl>;
  }

  @Output() yearChanges = new EventEmitter<number>();

  constructor(
    injector: Injector,
    measurementsValidatorService: MeasurementsValidatorService,
    formBuilder: UntypedFormBuilder,
    programRefService: ProgramRefService,
    protected validatorService: ActivityCalendarValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected personService: PersonService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected network: NetworkService,
    protected modalCtrl: ModalController
  ) {
    super(
      injector,
      measurementsValidatorService,
      formBuilder,
      programRefService,
      validatorService.getFormGroup(null, { withVesselUseFeatures: false, withGearUseFeatures: false }),
      {
        onUpdateFormGroup: (form) => this.updateFormGroup(form),
        initialState: {
          acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR,
          warnFutureYear: false,
        },
      }
    );

    // FOR DEV ONLY ----
    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    // Default values
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
    this.showObservers = toBoolean(this.showObservers, false);

    // Combo qualitative pmfm
    this.registerAutocompleteField('pmfmQualitativeValue', {
      attributes: ['name'],
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

    // Combo: programs
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: ACTIVITY_CALENDAR_FEATURE_DEFAULT_PROGRAM_FILTER,
      mobile: this.mobile,
      showAllOnFocus: this.mobile,
    });

    // Combo: vessels
    this.vesselSnapshotService.getAutocompleteFieldOptions().then((opts) => {
      this.registerAutocompleteField('vesselSnapshot', {
        ...opts,
        suggestFn: (value, filter) => {
          const year = this.yearControl.value;
          if (isNotNil(year)) {
            const startDate = (this.timezone ? DateUtils.moment().tz(this.timezone) : DateUtils.moment()).year(year).startOf('year');
            filter = {
              ...filter,
              date: startDate,
            };
          }
          return this.vesselSnapshotService.suggest(value, filter);
        },
      });
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

    // Listen year
    this.registerSubscription(
      merge(
        this.yearControl.valueChanges,
        this.form.get('startDate').valueChanges.pipe(
          // Convert startDate to year
          map(fromDateISOString),
          map((startDate) => {
            if (!startDate) return null;
            if (this.timezone) startDate = startDate.tz(this.timezone);
            return startDate.year();
          })
        )
      )
        .pipe(
          // Reset warning, if null
          tap((year) => {
            if (isNil(year)) this.warnFutureYear = false;
          }),
          filter(isNotNil),
          distinctUntilChanged()
        )
        .subscribe((year) => {
          console.debug(this._logPrefix + 'Year changes to: ' + year);
          if (this.isNewData && this.yearControl.value !== year) {
            this.yearControl.setValue(year, { emitEvent: false });
            this.yearChanges.next(year);
          }

          // Warning if year is in the future
          this.warnFutureYear = isNotNil(year) && year > DateUtils.moment().year();
        })
    );
  }

  protected onApplyingEntity(data: ActivityCalendar, opts?: { [p: string]: any }) {
    if (!data) return;

    super.onApplyingEntity(data, opts);

    // Make sure to have (at least) one observer
    // Resize observers array
    if (this.showObservers) {
      data.observers = isNotEmptyArray(data.observers) ? data.observers : [null];
    } else {
      data.observers = [null];
    }

    // Update form group
    this.updateFormGroup();
  }

  addObserver() {
    this.observersForm.add();
    if (!this.mobile) {
      this.observerFocusIndex = this.observersForm.length - 1;
    }
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }): void {
    super.enable(opts);

    // Leave readonly properties disabled
    if (!this.isNewData) {
      this._readonlyControlNames.forEach((property) => {
        const control = this.form.get(property);
        control.disable({ emitEvent: false });
      });
      this.markForCheck();
    }
  }

  getValue(): ActivityCalendar {
    const data = super.getValue();

    // Restore disabled properties
    this._readonlyControlNames.forEach((key) => {
      const control = this.form.get(key);
      setPropertyByPath(data, key, control.value);
    });

    if (!this.showEconomicSurvey) {
      data.economicSurvey = null;
    }

    return data;
  }

  updateFormGroup(form?: FormGroup) {
    form = form || this.form;
    const validatorOpts: ActivityCalendarValidatorOptions = {
      timezone: this.timezone,
    };

    if (!equals(validatorOpts, this._lastValidatorOpts)) {
      console.info('[trip-form] Updating form group, using opts', validatorOpts);

      this.validatorService.updateFormGroup(form, validatorOpts);

      // Need to refresh the form state  (otherwise some fields may still be invalid)
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

  protected async addVesselModal(event?: Event): Promise<any> {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const maxDate = this.form.get('startDate').value;

    const modal = await this.modalCtrl.create({
      component: VesselModal,
      componentProps: {
        defaultStatus: this.vesselDefaultStatus,
        maxDate: isNotNil(maxDate) ? toDateISOString(maxDate) : undefined,
      },
    });

    await modal.present();

    const res = await modal.onDidDismiss();

    // if new vessel added, use it
    const vessel = res && res.data;
    if (vessel) {
      const vesselSnapshot =
        vessel instanceof VesselSnapshot ? vessel : vessel instanceof Vessel ? VesselSnapshot.fromVessel(vessel) : VesselSnapshot.fromObject(vessel);
      console.debug(`${this._logPrefix}New vessel added : updating form...`, vesselSnapshot);
      this.form.controls['vesselSnapshot'].setValue(vesselSnapshot);
      this.markForCheck();
    } else {
      console.debug('${this._logPrefix}No vessel added (user cancelled)');
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
