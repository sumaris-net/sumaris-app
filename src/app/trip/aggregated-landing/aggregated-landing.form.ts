import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnInit, Output } from '@angular/core';
import { Moment } from 'moment';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import {
  AppForm,
  DateFormatPipe,
  DisplayFn,
  fadeInOutAnimation,
  filterNotNil,
  firstNotNilPromise,
  FormArrayHelper,
  isNil,
  LocalSettingsService,
  NetworkService,
  SharedValidators,
} from '@sumaris-net/ngx-components';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { AggregatedLandingService } from '../services/aggregated-landing.service';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { AggregatedLanding, VesselActivity } from '../services/model/aggregated-landing.model';
import { VesselActivityValidatorService } from '../services/validator/vessel-activity.validator';
import { getMaxRankOrder } from '@app/data/services/model/model.utils';
import { environment } from '@environments/environment';

export class AggregatedLandingFormOption {
  dates: Observable<Moment[]> | Moment[];
  initialDate: Moment | undefined;
  programLabel: string;
  acquisitionLevel: string;
}

@Component({
  selector: 'app-aggregated-landings-form',
  templateUrl: './aggregated-landing.form.html',
  styleUrls: ['./aggregated-landing.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInOutAnimation]
})
export class AggregatedLandingForm extends AppForm<AggregatedLanding> implements OnInit {

  private _options: AggregatedLandingFormOption;
  private _activeDate: Moment;
  private _activityDirty = false;

  @Input() showError = true;

  @Output() onOpenTrip = new EventEmitter<{ activity: VesselActivity }>();

  get dirty(): boolean {
    return super.dirty && this._activityDirty;
  }

  get loading(): boolean {
    return this._loading;
  }

  private $data = new BehaviorSubject<AggregatedLanding>(undefined);

  get data(): AggregatedLanding {
    // Save active form before return data
    this.saveActivitiesAt(this._activeDate);
    return this.$data.getValue();
  }

  set data(data) {
    this.$data.next(data);
  }

  get value(): any {
    throw new Error('The aggregated landing form has no form value accessible from outside');
  }

  set value(value: any) {
    throw new Error('The aggregated landing form has no form value accessible from outside');
  }

  activitiesHelper: FormArrayHelper<VesselActivity>;
  activityFocusIndex = -1;

  get activitiesForm(): FormArray {
    return this.form.controls.activities as FormArray;
  }

  activities: VesselActivity[];

  @Input() set options(option: AggregatedLandingFormOption) {
    this._options = option;
  }

  get options(): AggregatedLandingFormOption {
    return this._options;
  }

  mobile: boolean;
  $loadingControls = new BehaviorSubject<boolean>(false);
  controlsLoaded = false;
  onRefresh = new EventEmitter<any>();
  programLabel: string;
  acquisitionLevel: string;
  dates: Observable<Moment[]> | Moment[];

  constructor(
    injector: Injector,
    protected dateFormatPipe: DateFormatPipe,
    protected formBuilder: FormBuilder,
    protected dataService: AggregatedLandingService,
    protected vesselActivityValidatorService: VesselActivityValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
    protected settings: LocalSettingsService,
    public network: NetworkService,
    protected cd: ChangeDetectorRef,
  ) {
    super(injector, null);
    this.mobile = this.settings.mobile;

    this.acquisitionLevel = AcquisitionLevelCodes.LANDING; // default

    this.debug = !environment.production;
  }

  ngOnInit() {

    if (isNil(this._options)) {
      console.warn('[aggregated-landing-form] No option found, the form will be unusable');
    }

    this.dates = this._options?.dates;
    this.programLabel = this._options?.programLabel;
    this.acquisitionLevel = this._options?.acquisitionLevel;

    const form = this.formBuilder.group({
      'date': [this._options?.initialDate, Validators.compose([Validators.required, SharedValidators.validDate])],
      'activities': this.formBuilder.array([])
    });
    this.setForm(form);

    this.form.controls.activities.valueChanges
      .pipe(
        filter(() => !this._loading),
        // distinctUntilChanged()
        // debounceTime(1000)
      )
      .subscribe(value => {
        if (this.debug) console.debug('[aggregated-landing] activities changes', value);
        this._activityDirty = true;
        this.markForCheck();
      });

    this.initActivitiesHelper();

    const dateControl = this.form.get('date');
    this.registerSubscription(
      combineLatest([
        dateControl.valueChanges
          .pipe(distinctUntilChanged()),
        filterNotNil(this.$data)
      ])
        .subscribe(_ => this.showAtDate(dateControl.value))
    );

    super.ngOnInit();

  }


  addActivity() {
    if (this.debug) console.debug('[aggregated-landing-form] addActivity');
    this.activitiesHelper.add(this.newActivity());
    if (!this.mobile) {
      this.activityFocusIndex = this.activitiesHelper.size() - 1;
    }
  }

  removeActivity(index: number) {
    // TODO check data before remove
    this.activitiesHelper.removeAt(index);
  }

  async ready(): Promise<void> {
    // Wait pmfms load, and controls load
    if (this.$loadingControls.getValue() === true && this.controlsLoaded === false) {
      if (this.debug) console.debug(`[aggregated-landings-form] waiting form to be ready...`);
      await firstNotNilPromise(this.$loadingControls
        .pipe(
          filter((loadingControls) => loadingControls === false && this.controlsLoaded === true)
        ));
    }
  }

  get displayDateFn(): DisplayFn {
    return (obj: any) => this.dateFormatPipe.transform(obj, {pattern: 'dddd L'}).toString();
  }

  compareDateFn(d1: Moment, d2: Moment)  {
    return d1 && d2 && d1.isSame(d2) || false;
  }

  openTrip(activity: VesselActivity) {
    if (!activity || !activity.tripId) {
      console.warn(`Something is missing to open trip: observedLocationId=${activity && activity.observedLocationId}, tripId=${activity && activity.tripId}`);
      return;
    }

    this.onOpenTrip.emit({activity});
  }

  /* -- internal functions -- */

  private initActivitiesHelper() {
    this.activitiesHelper = new FormArrayHelper<VesselActivity>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'activities'),
      (activity) => this.vesselActivityValidatorService.getFormGroup(activity),
      (v1, v2) => v1.rankOrder === v2.rankOrder,
      value => VesselActivity.isEmpty(value),
      {
        allowEmptyArray: true
      }
    );
  }

  private showAtDate(date: Moment) {
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

  private newActivity(): VesselActivity {
    const maxRankOrder = getMaxRankOrder(this.activities);
    const activity = new VesselActivity();
    activity.rankOrder = maxRankOrder + 1;
    activity.date = this.form.value.date;
    this.activities.push(activity);
    return activity;
  }

  private saveActivitiesAt(date: Moment) {
    if (isNil(date)) {
      console.warn('Try to save activities at undefined date');
      return;
    }
    if (this.debug) console.debug(`[aggregated-landing-form] save activities at ${date}`);
    const newActivities = this.$data.value.vesselActivities.filter(value => !value.date.isSame(date)).slice() || [];
    const activities = this.activitiesForm.value.map(v => VesselActivity.fromObject(v));
    newActivities.push(...activities);
    this.$data.getValue().vesselActivities = newActivities;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

}
