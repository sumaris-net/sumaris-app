import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, OnInit, Output, QueryList, ViewChildren } from '@angular/core';
import { debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { AcquisitionLevelCodes, AcquisitionLevelType, LocationLevelGroups, LocationLevelIds, PmfmIds } from '@app/referential/services/model/model.enum';
import { LandingValidatorService } from './landing.validator';
import { MeasurementValuesForm, MeasurementValuesState } from '../../data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '../../data/measurement/measurement.validator';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import {
  ConfigService,
  DateUtils,
  EntityUtils,
  FormArrayHelper,
  getPropertyByPath,
  IReferentialRef,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LoadResult,
  MatAutocompleteField,
  NetworkService,
  Person,
  PersonService,
  PersonUtils,
  ReferentialRef,
  ReferentialUtils,
  SharedValidators,
  StatusIds,
  suggestFromArray,
  toBoolean,
  toDateISOString,
  UserProfileLabel
} from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Landing } from './landing.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { VesselModal } from '@app/vessel/modal/vessel-modal';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { TranslateService } from '@ngx-translate/core';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { FishingAreaValidatorService } from '@app/data/fishing-area/fishing-area.validator';
import { Trip } from '@app/trip/trip/trip.model';
import { TripValidatorService } from '@app/trip/trip/trip.validator';
import { Metier } from '@app/referential/services/model/metier.model';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { ObservedLocationService } from '@app/trip/observedlocation/observed-location.service';
import { ObservedLocationFilter } from '@app/trip/observedlocation/observed-location.filter';
import { DateAdapter } from '@angular/material/core';
import { Moment } from 'moment/moment';
import { ISelectObservedLocationsModalOptions, SelectObservedLocationsModal } from '@app/trip/observedlocation/select-modal/select-observed-locations.modal';
import { Subscription } from 'rxjs';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { StrategyService } from '@app/referential/services/strategy.service';


const TRIP_FORM_EXCLUDED_FIELD_NAMES = ['program', 'vesselSnapshot', 'departureDateTime', 'departureLocation', 'returnDateTime', 'returnLocation'];

type FilterableFieldName = 'fishingArea';

interface LandingFormState extends MeasurementValuesState {
  showStrategy: boolean;
  canEditStrategy: boolean;
  showParent: boolean
  parentAcquisitionLevel: AcquisitionLevelType
  showObservedLocation: boolean;

  strategyControl: UntypedFormControl;
  observedLocationControl: UntypedFormControl;
  observedLocationLabel: string;
}

@Component({
  selector: 'app-landing-form',
  templateUrl: './landing.form.html',
  styleUrls: ['./landing.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingForm extends MeasurementValuesForm<Landing, LandingFormState> implements OnInit {

  private _showObservers: boolean; // Disable by default
  private _parentSubscription: Subscription;
  private _strategySubscription: Subscription;

  observersHelper: FormArrayHelper<Person>;
  fishingAreasHelper: FormArrayHelper<FishingArea>;
  metiersHelper: FormArrayHelper<FishingArea>;
  observerFocusIndex = -1;
  metierFocusIndex = -1;
  fishingAreaFocusIndex = -1;
  mobile: boolean;

  strategyControl$ = this._state.select('strategyControl');
  observedLocationLabel$ = this._state.select('observedLocationLabel');
  observedLocationControl$ = this._state.select('observedLocationControl');

  autocompleteFilters = {
    fishingArea: false
  };

  get empty(): any {
    const value = this.value;
    return ReferentialUtils.isEmpty(value.location)
      && (!value.dateTime)
      && (!value.comments || !value.comments.length);
  }

  get valid(): boolean {
    return this.form && (this.required ? this.form.valid : (this.form.valid || this.empty))
  }

  get observersForm(): UntypedFormArray {
    return this.form.controls.observers as UntypedFormArray;
  }

  get tripForm(): UntypedFormGroup {
    return this.form.controls.trip as UntypedFormGroup;
  }

  get observedLocationControl(): UntypedFormControl {
    return this._state.get('observedLocationControl');
  }

  get strategyControl(): UntypedFormControl {
    return this._state.get('strategyControl');
  }

  get metiersForm(): UntypedFormArray {
    return this.tripForm?.controls.metiers as UntypedFormArray;
  }

  get fishingAreasForm(): UntypedFormArray {
    return this.tripForm?.controls.fishingAreas as UntypedFormArray;
  }

  @ViewChildren('fishingAreaField') fishingAreaFields: QueryList<MatAutocompleteField>;

  get showTrip(): boolean {
    return this.showMetier || this.showFishingArea;
  }

  @Input() i18nSuffix: string;
  @Input() required = true;
  @Input() showProgram = true;
  @Input() showVessel = true;
  @Input() showDateTime = false; // Default value of program option LANDING_DATE_TIME_ENABLE
  @Input() showLocation = false; // Default value of program option LANDING_LOCATION_ENABLE
  @Input() showComment = true;
  @Input() showMeasurements = true;
  @Input() showError = true;
  @Input() showButtons = true;
  @Input() showMetier = false;
  @Input() showFishingArea = false;
  @Input() showTripDepartureDateTime = false;
  @Input() locationLevelIds: number[];
  @Input() allowAddNewVessel: boolean;
  @Input() allowManyMetiers: boolean = null;
  @Input() filteredFishingAreaLocations: ReferentialRef[] = null;
  @Input() fishingAreaLocationLevelIds: number[] = LocationLevelGroups.FISHING_AREA;

  @Input() set showStrategy(value: boolean) {
    this._state.set('showStrategy', (_) => value);
  }

  get showStrategy(): boolean {
    return this._state.get('showStrategy');
  }

  @Input() set enableFishingAreaFilter(value: boolean) {
    this.setFieldFilterEnable('fishingArea', value);
    this.fishingAreaFields?.forEach(fishingArea => {
      this.setFieldFilterEnable('fishingArea', value, fishingArea, true);
    });
  }

  @Input() set canEditStrategy(value: boolean) {
    this._state.set('canEditStrategy', _ => value);
  }

  get canEditStrategy(): boolean {
    return this._state.get('canEditStrategy');
  }

  @Input() set showObservers(value: boolean) {
    if (this._showObservers !== value) {
      this._showObservers = value;
      this.initObserversHelper();
      this.markForCheck();
    }
  }

  get showObservers(): boolean {
    return this._showObservers;
  }

  @Input() set showParent(value: boolean) {
    this._state.set('showParent', _ => value);
  }

  get showParent(): boolean {
    return this._state.get('showParent') || false;
  }

  @Input() set parentAcquisitionLevel(value: AcquisitionLevelType) {
    this._state.set('parentAcquisitionLevel', _ => value);
  }

  get parentAcquisitionLevel(): AcquisitionLevelType {
    return this._state.get('parentAcquisitionLevel');
  }

  @Output() onObservedLocationChanges = new EventEmitter<ObservedLocation>();
  @Output() onOpenObservedLocation = new EventEmitter<ObservedLocation>();
  @Output() onStrategyChanges = new EventEmitter<Strategy>();

  constructor(
    injector: Injector,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService,
    protected validatorService: LandingValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected personService: PersonService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected configService: ConfigService,
    protected translate: TranslateService,
    protected modalCtrl: ModalController,
    protected tripValidatorService: TripValidatorService,
    protected fishingAreaValidatorService: FishingAreaValidatorService,
    protected networkService: NetworkService,
    protected observedLocationService: ObservedLocationService,
    protected strategyService: StrategyService,
    protected dateAdapter: DateAdapter<Moment>
  ) {
    super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(), {
      mapPmfms: pmfms => this.mapPmfms(pmfms)
    });

    this._enable = false;
    this.mobile = this.settings.mobile;

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.LANDING;

    this.errorTranslatorOptions = {separator: '<br/>', controlPathTranslator: this};

  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.showStrategy = toBoolean(this.showStrategy, false); // Will init the strategy control, if need
    this.showObservers = toBoolean(this.showObservers, false); // Will init the observers helper, if need
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
    if (isNil(this.locationLevelIds) && this.showLocation) {
      this.locationLevelIds = [LocationLevelIds.PORT];
      console.debug("[landing-form] Location level ids:", this.locationLevelIds);
    }

    // Combo: programs
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        acquisitionLevelLabels: [AcquisitionLevelCodes.LANDING]
      },
      mobile: this.mobile
    });

    // Combo: strategy
    this.registerAutocompleteField('strategy', {
      suggestFn: (value, filter) => this.suggestStrategy(value, filter),
      filter: {
        entityName: 'Strategy',
        searchAttribute: 'label'
      },
      attributes: ['label'],
      columnSizes: [12],
      showAllOnFocus: true, // Show all value, when focus
      mobile: this.mobile
    });

    // Combo: vessels
    this.vesselSnapshotService.getAutocompleteFieldOptions().then(opts =>
      this.registerAutocompleteField('vesselSnapshot', opts)
    );

    // Combo location
    const locationAttributes = this.settings.getFieldDisplayAttributes('location');
    this.registerAutocompleteField('location', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelIds: this.locationLevelIds
      },
      attributes: locationAttributes,
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
        userProfiles: <UserProfileLabel[]>['SUPERVISOR', 'USER', 'GUEST']
      },
      attributes: ['lastName', 'firstName', 'department.name'],
      displayWith: PersonUtils.personToString,
      mobile: this.mobile
    });

    // Combo: metier
    const metierAttributes = this.settings.getFieldDisplayAttributes('qualitativeValue');
    this.registerAutocompleteField('metier', {
      showAllOnFocus: false,
      suggestFn: (value, filter) => this.suggestMetiers(value, filter),
      // Default filter. A excludedIds will be add dynamically
      filter: {
        entityName: 'Metier',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      attributes: metierAttributes,
      mobile: this.mobile
    });

    // Combo: fishingAreas
    const fishingAreaAttributes = this.settings.getFieldDisplayAttributes('fishingAreaLocation', ['label']);
    this.registerAutocompleteField('fishingAreaLocation', {
      showAllOnFocus: false,
      suggestFn: (value, filter) => this.suggestFishingAreaLocations(value, {
        ...filter,
        levelIds: this.fishingAreaLocationLevelIds
      }),
      // Default filter. An excludedIds will be add dynamically
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      attributes: fishingAreaAttributes,
      mobile: this.mobile
    });

    // Propagate program
    this.registerSubscription(
      this.form.get('program').valueChanges
        .pipe(
          debounceTime(250),
          map(value => (value && typeof value === 'string') ? value : (value && value.label || undefined))
        )
        .subscribe(programLabel => this.programLabel = programLabel));

    // Update the strategy filter (if autocomplete field exists. If not, program will set later in ngOnInit())
    this._state.hold(this.programLabel$, programLabel => {
      if (this.autocompleteFields.strategy) {
        this.autocompleteFields.strategy.filter.levelLabel = programLabel;
      }
    });

    this._state.hold(this.strategyLabel$, async (strategyLabel) => {
      // Wait loaded
      await this.waitIdle({stop: this.destroySubject});

      // Get control to store strategy label, in measurements form
      const measControl = this.form.get('measurementValues.' + PmfmIds.STRATEGY_LABEL);
      if (measControl && measControl.value !== strategyLabel) {
        // DEBUG
        console.debug(`[landing-form] Setting measurementValues.${PmfmIds.STRATEGY_LABEL}=${strategyLabel}`);

        measControl.setValue(strategyLabel);
      }

      // Update strategy control
      if (this.showStrategy && this.strategyControl && this.strategyControl.value?.label !== strategyLabel) {
        console.debug('[landing-form] Updating strategy control, with value', {label: strategyLabel});
        this.strategyControl.setValue({label: strategyLabel}, {emitEvent: false});
        this.markForCheck();
      }

      // Refresh fishing areas autocomplete
      this.fishingAreaFields?.forEach(fishingArea => fishingArea.reloadItems());
    });

    // Init trip form (if enable)
    if (this.showTrip) {
      const tripForm = this.initTripForm();
      if (this.showMetier) this.initMetiersHelper(tripForm);
      if (this.showFishingArea) this.initFishingAreas(tripForm);
    }

    // Add strategy control
    this._state.connect('strategyControl', this._state.select('showStrategy'), (_, show) => this.initStrategyControl(show));

    this._state.hold(this._state.select('canEditStrategy'), canEditStrategy => {
      if (canEditStrategy && this.strategyControl?.disabled) {
        this.strategyControl.enable();
      }
      else if (!canEditStrategy && this.strategyControl?.enabled) {
        this.strategyControl.disable();
      }
    })

    // Add observed location control
    this._state.connect('showObservedLocation', this._state.select(['showParent', 'parentAcquisitionLevel'], s => s),
      ({showParent, parentAcquisitionLevel}) => showParent && parentAcquisitionLevel === AcquisitionLevelCodes.OBSERVED_LOCATION
    );
    this._state.connect('observedLocationControl', this._state.select('showObservedLocation'), (_, show) => this.initObservedLocationControl(show));

    this._state.connect('observedLocationLabel', this.onObservedLocationChanges
        .pipe(
          filter(parent => !parent || parent instanceof ObservedLocation),
          distinctUntilChanged(EntityUtils.equals)
      ),
      (_, parent) => this.displayObservedLocation(parent as ObservedLocation))

    this._state.hold(this.strategyControl$.pipe(
      switchMap(control => control.valueChanges),
      distinctUntilChanged(EntityUtils.equals)
    ), (strategy) => this.onStrategyChanges.emit(strategy));
  }

  toggleFilter(fieldName: FilterableFieldName, field?: MatAutocompleteField) {
    this.setFieldFilterEnable(fieldName, !this.isFieldFilterEnable(fieldName), field);
  }


  protected onApplyingEntity(data: Landing, opts?: any) {
    super.onApplyingEntity(data, opts);

    if (!data) return; // Skip

    // Propagate the strategy
    const strategyLabel = data.measurementValues && data.measurementValues[PmfmIds.STRATEGY_LABEL];
    if (strategyLabel) {
      this.strategyControl.patchValue(ReferentialRef.fromObject({label: strategyLabel}));
    }
  }

  protected async updateView(data: Landing, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [p: string]: any }): Promise<void> {
    if (!data) return;

    // Reapplied changed data
    if (this.isNewData && this.form.touched) {
      console.warn('[landing-form] Merging form value and input data, before updateing view')
      const json = this.form.value;
      Object.keys(json).forEach(key => {
        if (isNil(json[key]) && this.form.get(key)?.untouched) delete json[key];
      })

      data = Landing.fromObject({
        ...data.asObject(),
        ...json,
      });
    }

    // Resize observers array
    if (this._showObservers) {
      // Make sure to have (at least) one observer
      data.observers = isNotEmptyArray(data.observers) ? data.observers : [null];
      this.observersHelper.resize(Math.max(1, data.observers.length));
    } else {
      data.observers = [];
      this.observersHelper?.resize(0);
    }

    // Trip
    let trip = (data.trip as Trip);
    this.showMetier = this.showMetier || isNotEmptyArray(trip?.metiers);
    this.showFishingArea = this.showFishingArea || isNotEmptyArray(trip?.fishingAreas);
    if (!trip && (this.showMetier || this.showFishingArea)) {
      trip = new Trip();
      data.trip = trip;
    }

    let tripForm = this.tripForm;
    if (this.showTrip && !tripForm) {
      tripForm = this.initTripForm();
      if (this.showMetier) this.initMetiersHelper(tripForm);
      if (this.showFishingArea) this.initFishingAreas(tripForm);
    }

    // Resize metiers array
    if (this.showMetier) {
      trip.metiers = isNotEmptyArray(trip.metiers) ? trip.metiers : [null];
      this.metiersHelper.resize(Math.max(1, trip.metiers.length));
    } else {
      this.metiersHelper?.removeAllEmpty();
    }

    // Resize fishing areas array
    if (this.showFishingArea) {
      trip.fishingAreas = isNotEmptyArray(trip.fishingAreas) ? trip.fishingAreas : [null];
      this.fishingAreasHelper.resize(Math.max(1, trip.fishingAreas.length));
    } else {
      this.fishingAreasHelper?.removeAllEmpty();
    }

    // DEBUG
    //console.debug('[landing-form] updateView', data);

    await super.updateView(data, opts);
  }


  protected getValue(): Landing {
    // DEBUG
    //console.debug('[landing-form] get value');

    const data = super.getValue();
    if (!data) return;

    // Re add the strategy label
    if (this.showStrategy) {
      const strategyValue = this.strategyControl.value;
      const strategyLabel = EntityUtils.isNotEmpty(strategyValue, 'label') ? strategyValue.label : strategyValue as string;
      data.measurementValues = data.measurementValues || {};
      data.measurementValues[PmfmIds.STRATEGY_LABEL.toString()] = strategyLabel;
    }

    if (this.showTrip) {
      const trip: Trip = Trip.fromObject({
        ...data.trip,
        // Override some editable properties
        program: data.program,
        vesselSnapshot: data.vesselSnapshot,
        returnDateTime: toDateISOString(data.dateTime),
        departureLocation: data.location,
        returnLocation: data.location
      });
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

  enable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }): void {
    super.enable(opts);

    // Leave program disable once data has been saved
    if (!this.isNewData && !this.form.get('program').enabled) {
      this.form.controls['program'].disable({emitEvent: false});
      this.markForCheck();
    }

    if (this.canEditStrategy && this.strategyControl?.disabled) {
      this.strategyControl.enable(opts);
    }
    else if (!this.canEditStrategy && this.strategyControl?.enabled) {
      this.strategyControl.disable({emitEvent: false});
    }
  }

  async addVesselModal(): Promise<any> {
    const modal = await this.modalCtrl.create({ component: VesselModal });
    modal.onDidDismiss().then(res => {
      // if new vessel added, use it
      if (res &&  res.data instanceof VesselSnapshot) {
        console.debug("[landing-form] New vessel added : updating form...", res.data);
        this.form.get('vesselSnapshot').setValue(res.data);
        this.markForCheck();
      }
      else {
        console.debug("[landing-form] No vessel added (user cancelled)");
      }
    });
    return modal.present();
  }

  /* -- protected method -- */

  protected isFieldFilterEnable(fieldName: FilterableFieldName) {
    return this.autocompleteFilters[fieldName];
  }

  protected setFieldFilterEnable(fieldName: FilterableFieldName, value: boolean, field?: MatAutocompleteField, forceReload?: boolean) {
    if (this.autocompleteFilters[fieldName] !== value || forceReload) {
      this.autocompleteFilters[fieldName] = value;
      this.markForCheck();
      if (field) field.reloadItems();
    }
  }

  protected async suggestStrategy(value: any, filter?: any): Promise<LoadResult<ReferentialRef>> {
    // Avoid to reload, when value is already a valid strategy
    if (ReferentialUtils.isNotEmpty(value)) return {data: [value]};

    filter = {
      ...filter,
      levelLabel: this.programLabel
    };
    if (isNilOrBlank(filter.levelLabel)) return undefined; // Program no loaded yet

    // Force network, if possible - fix IMAGINE 302
    const fetchPolicy = this.networkService.online && 'network-only' || undefined /*default*/;

    return this.referentialRefService.suggest(value, filter, undefined, undefined,
      { fetchPolicy }
    );
  }

  protected async openSelectObservedLocationModal(event?: Event) {
    if (event) event.preventDefault();
    const control = this.observedLocationControl;
    if (!control || control.disabled) return;

    try {
      control.disable({emitEvent: false});

      const program = await this.programRefService.loadByLabel(this.programLabel);
      const defaultData = ObservedLocation.fromObject({
        program,
      });
      const filter = ObservedLocationFilter.fromObject({
        program,
      });

      if (this.showStrategy) {
        const strategy = this.strategyControl.value;
        const period = strategy && await this.strategyService.getDateRangeByLabel(this.strategyControl.value.label);
        filter.startDate = strategy && period.startDate || DateUtils.moment().startOf('year');
        filter.endDate = strategy && period.endDate || DateUtils.moment().endOf('year');
      }

      const modal = await this.modalCtrl.create({
        component: SelectObservedLocationsModal,
        componentProps: <ISelectObservedLocationsModalOptions>{
          allowMultipleSelection: false,
          showFilterProgram: false,
          allowNewObservedLocation: true,
          defaultNewObservedLocation: defaultData,
          selectedId: control.value?.id,
          filter,
        },
        keyboardClose: true,
        backdropDismiss: true,
        cssClass: 'modal-large'
      });
      await modal.present();
      const {data} = await modal.onDidDismiss();

      const value = data?.[0];
      if (!value) return; // User cancelled

      console.debug('[landing-form] Selected observed location: ', value);
      control.setValue(value);
      this.form.markAllAsTouched();
    }
    finally {
      control.enable();
    }
  }

  protected suggestObservers(value: any, filter?: any): Promise<LoadResult<Person>> {
    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
    const newValue = currentControlValue ? '*' : value;

    // Excluded existing observers, BUT keep the current control value
    const excludedIds = (this.observersForm.value || [])
      .filter(ReferentialUtils.isNotEmpty)
      .filter(person => !currentControlValue || currentControlValue !== person)
      .map(person => parseInt(person.id));

    return this.personService.suggest(newValue, {
      ...filter,
      excludedIds
    });
  }

  protected suggestMetiers(value: any, filter?: any):  Promise<LoadResult<ReferentialRef>> {
    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;

    // Excluded existing observers, BUT keep the current control value
    const excludedIds = (this.metiersForm.value || [])
      .filter(ReferentialUtils.isNotEmpty)
      .filter(item => !currentControlValue || currentControlValue !== item)
      .map(item => parseInt(item.id));

    return this.referentialRefService.suggest(value, {
      ...filter,
      excludedIds
    });
  }

  protected async suggestFishingAreaLocations(value: string, filter: any): Promise<LoadResult<IReferentialRef>> {
    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;

    // Excluded existing locations, BUT keep the current control value
    const excludedIds = (this.fishingAreasForm.value || [])
      .map(fa => fa.location)
      .filter(ReferentialUtils.isNotEmpty)
      .filter(item => !currentControlValue || currentControlValue !== item)
      .map(item => parseInt(item.id));

    if (this.autocompleteFilters.fishingArea && isNotNil(this.filteredFishingAreaLocations)) {
      return suggestFromArray(this.filteredFishingAreaLocations, value, {
        ...filter,
        excludedIds
      });
    } else {
      return this.referentialRefService.suggest(value, {
        ...filter,
        excludedIds
      });
    }
  }

  protected initObserversHelper() {
    if (isNil(this._showObservers)) return; // skip if not loading yet

    // Create helper, if need
    if (!this.observersHelper) {
      this.observersHelper = new FormArrayHelper<Person>(
        FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'observers'),
        (person) => this.validatorService.getObserverControl(person),
        ReferentialUtils.equals,
        ReferentialUtils.isEmpty,
        { allowEmptyArray: !this._showObservers }
      );
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

  protected initTripForm(): UntypedFormGroup {
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
        departureDateTimeRequired: false
      });

      // Excluded some trip's fields
      TRIP_FORM_EXCLUDED_FIELD_NAMES
        .filter(key => {
          if (!this.showTripDepartureDateTime || key != 'departureDateTime') {
            delete tripFormConfig[key]
          }
        });

      tripForm = this.formBuilder.group(tripFormConfig);

      this.form.addControl('trip', tripForm);
    }

    return tripForm;
  }

  protected initStrategyControl(showStrategy: boolean): UntypedFormControl {
    if (showStrategy) {
      let control = this.strategyControl;
      if (!control) {
        const strategyLabel = this.strategyLabel;
        control = this.formBuilder.control(strategyLabel && {label: strategyLabel} || null, Validators.required);
        this.form.setControl('strategy',  control);

        // Propagate strategy changes
        const subscription = control.valueChanges
            .pipe(
              filter(value => EntityUtils.isNotEmpty(value, 'label')),
              map(value => value.label),
              distinctUntilChanged()
            )
            .subscribe(strategyLabel => this.strategyLabel = strategyLabel);
        subscription.add(() => {
          this.unregisterSubscription(subscription)
          this._strategySubscription = null;
        })
        this.registerSubscription(subscription);
        this._strategySubscription = subscription;
      }
      return control;
    }
    else {
      this._strategySubscription?.unsubscribe();
      this.form.removeControl('strategy');
      return null;
    }
  }

  protected initObservedLocationControl(showObservedLocation: boolean): UntypedFormControl {
    if (showObservedLocation) {
      let control = this.observedLocationControl;
      if (!control) {

        // Create control
        control = this.formBuilder.control(this.data?.observedLocation || null, [Validators.required, SharedValidators.entity]);
        this.form.addControl('observedLocation', control);

        // Subscribe to changes, and redirect it to the parent event emitter
        const subscription = control.valueChanges.subscribe(ol => this.onObservedLocationChanges.emit(ol));
        subscription.add(() => {
          this.unregisterSubscription(subscription)
          this._parentSubscription = null;
        });
        this.registerSubscription(subscription);
        this._parentSubscription = subscription;
      }
      return control;
    }
    else {
      this._parentSubscription?.unsubscribe();
      this.form.removeControl('observedLocation');
      return null;
    }
  }

  protected initMetiersHelper(form: UntypedFormGroup) {

    if (!this.metiersHelper) {
      this.metiersHelper = new FormArrayHelper<FishingArea>(
        FormArrayHelper.getOrCreateArray(this.formBuilder, form, 'metiers'),
        (metier) => this.tripValidatorService.getMetierControl(metier),
        ReferentialUtils.equals,
        ReferentialUtils.isEmpty,
        { allowEmptyArray: !this.showMetier }
      );
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

  protected initFishingAreas(form: UntypedFormGroup) {
    if (!this.fishingAreasHelper) {
      this.fishingAreasHelper = new FormArrayHelper<FishingArea>(
        FormArrayHelper.getOrCreateArray(this.formBuilder, form, 'fishingAreas'),
        (fishingArea) => this.fishingAreaValidatorService.getFormGroup(fishingArea, {required: true}),
        (o1, o2) => isNil(o1) && isNil(o2) || (o1 && o1.equals(o2)),
        (fishingArea) => !fishingArea || ReferentialUtils.isEmpty(fishingArea.location),
      { allowEmptyArray: !this.showFishingArea});
    }
    else {
      this.fishingAreasHelper.allowEmptyArray = !this.showFishingArea;
    }
    if (this.showFishingArea) {
      if (this.fishingAreasHelper.size() === 0) {
        this.fishingAreasHelper.resize(1);
      }
    } else if (this.fishingAreasHelper.size() > 0) {
      this.fishingAreasHelper.resize(0);
    }
  }

  /**
   * Make sure a pmfmStrategy exists to store the Strategy.label
   */
  protected async mapPmfms(pmfms: IPmfm[]): Promise<IPmfm[]> {

    if (this.debug) console.debug(`${this._logPrefix} calling mapPmfms()`);

    // Create the missing Pmfm, to hold strategy (if need)
    if (this.showStrategy) {
      const existingIndex = (pmfms || []).findIndex(pmfm => pmfm.id === PmfmIds.STRATEGY_LABEL);
      let strategyPmfm: IPmfm;
      if (existingIndex !== -1) {
        // Remove existing, then copy it (to leave original unchanged)
        strategyPmfm = pmfms.splice(existingIndex, 1)[0].clone();
      }
      else {
        strategyPmfm = DenormalizedPmfmStrategy.fromObject({
          id: PmfmIds.STRATEGY_LABEL,
          type: 'string'
        });
      }

      strategyPmfm.hidden = true; // Do not display it in measurement
      strategyPmfm.required = false; // Not need to be required, because of strategyControl validator

      // Prepend to list
      pmfms = [strategyPmfm, ...pmfms];
    }

    return pmfms;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected displayObservedLocation(ol: ObservedLocation): string {
    if (!ol) return null;

    const locationAttributes = this.settings.getFieldDisplayAttributes('location');
    const dateTimePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');


    return locationAttributes.map(attr => getPropertyByPath(ol, `location.${attr}`))
      .concat([this.dateAdapter.format(ol.startDateTime, dateTimePattern)])
      .filter(isNotNilOrBlank)
      .join(' - ');
  }

  notHiddenPmfm(pmfm: IPmfm) {
    return !pmfm.hidden;
  }
}
