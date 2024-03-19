import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, OnInit, Output } from '@angular/core';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { ActivityCalendarValidatorOptions, ActivityCalendarValidatorService } from '../model/activity-calendar.validator';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { FormGroup, UntypedFormBuilder } from '@angular/forms';
import {
  DateUtils,
  equals,
  fromDateISOString,
  isNil,
  isNotNil,
  isNotNilOrBlank,
  NetworkService,
  PersonService,
  StatusIds,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { ActivityCalendar } from '../model/activity-calendar.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { MeasurementsFormState } from '@app/data/measurement/measurements.utils';
import { RxState } from '@rx-angular/state';
import { ACTIVITY_CALENDAR_FEATURE_DEFAULT_PROGRAM_FILTER } from '@app/activity-calendar/activity-calendar.config';
import { OnReady } from '@sumaris-net/ngx-components/src/app/core/form/form.utils';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { VesselModal } from '@app/vessel/modal/vessel-modal';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Vessel } from '@app/vessel/services/model/vessel.model';
import { ModalController } from '@ionic/angular';

export interface ActivityCalendarFormState extends MeasurementsFormState {
  showYear: boolean;
}

@Component({
  selector: 'app-form-activity-calendar',
  templateUrl: './activity-calendar.form.html',
  styleUrls: ['./activity-calendar.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class ActivityCalendarForm extends MeasurementValuesForm<ActivityCalendar, ActivityCalendarFormState> implements OnInit, OnReady {
  private _lastValidatorOpts: any;
  protected isYearInTheFuture = false;

  @Input() required = true;
  @Input() showError = true;
  @Input() showYear = true;
  @Input() showComment = true;
  @Input() showButtons = true;
  @Input() showProgram = true;
  @Input() showVessel = true;
  @Input() timezone: string = DateUtils.moment().tz();
  @Input() mobile = false;
  @Input() allowAddNewVessel = true;
  @Input() vesselDefaultStatus = StatusIds.TEMPORARY;

  get empty(): any {
    const value = this.value;
    return isNil(value.vesselSnapshot?.id) && isNil(value.year) && isNotNilOrBlank(value.comments);
  }

  get valid(): any {
    return this.form && (this.required ? this.form.valid : this.form.valid || this.empty);
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
    super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(), {
      onUpdateFormGroup: (form) => this.updateFormGroup(),
    });
    this._enable = false;

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.ACTIVITY_CALENDAR;

    // FOR DEV ONLY ----
    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;

    // Combo: programs
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: ACTIVITY_CALENDAR_FEATURE_DEFAULT_PROGRAM_FILTER,
      mobile: this.mobile,
      showAllOnFocus: this.mobile,
    });

    // Combo: vessels
    this.vesselSnapshotService.getAutocompleteFieldOptions().then((opts) => this.registerAutocompleteField('vesselSnapshot', opts));

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
      this.form
        .get('year')
        .valueChanges.pipe(debounceTime(150))
        .subscribe((year) => {
          // Warning if year is in the future
          this.isYearInTheFuture = isNotNil(year) && year > DateUtils.moment().year();
          this.markForCheck();
        })
    );
  }

  ngOnReady(): any {
    this.registerSubscription(
      this.form
        .get('startDate')
        .valueChanges.pipe(map((startDate) => fromDateISOString(startDate)?.year()))
        .subscribe((year) => this.yearChanges.next(year))
    );
  }

  protected onApplyingEntity(data: ActivityCalendar, opts?: { [p: string]: any }) {
    if (!data) return;

    super.onApplyingEntity(data, opts);

    // Update form group
    this.updateFormGroup();
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

  updateFormGroup(form?: FormGroup) {
    form = form || this.form;
    const validatorOpts: ActivityCalendarValidatorOptions = {
      timezone: this.timezone,
    };

    if (!equals(validatorOpts, this._lastValidatorOpts)) {
      console.info('[trip-form] Updating form group, using opts', validatorOpts);

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
