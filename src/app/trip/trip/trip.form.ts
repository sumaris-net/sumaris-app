import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnInit, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { TripValidatorOptions, TripValidatorService } from '../services/validator/trip.validator';
import { ModalController } from '@ionic/angular';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';

import {
  AppForm,
  DateUtils,
  EntityUtils,
  FormArrayHelper,
  fromDateISOString,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LoadResult,
  MatAutocompleteField,
  NetworkService,
  OnReady,
  Person,
  PersonService,
  PersonUtils,
  ReferentialRef,
  referentialToString,
  ReferentialUtils,
  StatusIds,
  toBoolean,
  toDateISOString,
  UserProfileLabel
} from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { FormArray, FormBuilder } from '@angular/forms';

import { Vessel } from '@app/vessel/services/model/vessel.model';
import { METIER_DEFAULT_FILTER, MetierService } from '@app/referential/services/metier.service';
import { Trip } from '../services/model/trip.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { debounceTime, filter } from 'rxjs/operators';
import { VesselModal } from '@app/vessel/modal/vessel-modal';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { MetierFilter } from '@app/referential/services/filter/metier.filter';
import { Metier } from '@app/referential/services/model/metier.model';
import { combineLatest } from 'rxjs';
import { Moment } from 'moment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';

const TRIP_METIER_DEFAULT_FILTER = METIER_DEFAULT_FILTER;

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'form-trip',
  templateUrl: './trip.form.html',
  styleUrls: ['./trip.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TripForm extends AppForm<Trip> implements OnInit, OnReady {

  private _showObservers: boolean;
  private _showMetiers: boolean;
  private _returnFieldsRequired: boolean;
  private _locationSuggestLengthThreshold: number;
  private _lastValidatorOptsStr: any;

  observersHelper: FormArrayHelper<Person>;
  observerFocusIndex = -1;
  enableMetierFilter = false;
  metierFilter: Partial<MetierFilter>;
  metiersHelper: FormArrayHelper<ReferentialRef>;
  metierFocusIndex = -1;
  canFilterMetier = false;
  mobile: boolean;

  @Input() showComment = true;
  @Input() allowAddNewVessel = true;
  @Input() showError = true;
  @Input() vesselDefaultStatus = StatusIds.TEMPORARY;
  @Input() metierHistoryNbDays = 60;

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

  @Input() set showMetiers(value: boolean) {
    if (this._showMetiers !== value) {
      this._showMetiers = value;
      this.initMetiersHelper();
      this.markForCheck();
    }
  }

  get showMetiers(): boolean {
    return this._showMetiers;
  }

  @Input() locationLevelIds = [LocationLevelIds.PORT];
  @Input() minDurationInHours: number;
  @Input() maxDurationInHours: number;

  @Input() set locationSuggestLengthThreshold(value: number) {
    if (this._locationSuggestLengthThreshold !== value) {
      this._locationSuggestLengthThreshold = value;

      // Update fields
      if (this.autocompleteFields.location) {
        this.autocompleteFields.location.suggestLengthThreshold = value;
        this.locationFields.forEach(field => {
          field.suggestLengthThreshold = value;
          field.reloadItems();
        });
      }
    }
  }

  @Input() set returnFieldsRequired(value: boolean){
    this._returnFieldsRequired = value;
    if (!this.loading) this.updateFormGroup();
  };

  get returnFieldsRequired(): boolean {
    return this._returnFieldsRequired;
  }

  get vesselSnapshot(): VesselSnapshot {
    return this.form.get('vesselSnapshot').value as VesselSnapshot;
  }

  get value(): any {
    const json = this.form.value as Partial<Trip>;

    // Add program, because if control disabled the value is missing
    json.program = this.form.get('program').value;

    if (!this._showObservers) json.observers = []; // Remove observers, if hide
    if (!this._showMetiers) json.metiers = []; // Remove metiers, if hide

    return json;
  }

  set value(json: any) {
    this.setValue(json);
  }

  get observersForm(): FormArray {
    return this.form.controls.observers as FormArray;
  }

  get metiersForm(): FormArray {
    return this.form.controls.metiers as FormArray;
  }

  @Output() maxDateChanges = new EventEmitter<Moment>();

  @ViewChild('metierField') metierField: MatAutocompleteField;
  @ViewChildren('locationField') locationFields: QueryList<MatAutocompleteField>;

  constructor(
    injector: Injector,
    protected formBuilder: FormBuilder,
    protected validatorService: TripValidatorService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected metierService: MetierService,
    protected personService: PersonService,
    protected modalCtrl: ModalController,
    public network: NetworkService,
    protected cd: ChangeDetectorRef
  ) {

    super(injector, validatorService.getFormGroup());
    this.mobile = this.settings.mobile;
  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.showObservers = toBoolean(this.showObservers, false); // Will init the observers helper
    this.showMetiers = toBoolean(this.showMetiers, false); // Will init the metiers helper
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
    this.returnFieldsRequired = toBoolean(this.returnFieldsRequired, !this.settings.isOnFieldMode);
    if (isEmptyArray(this.locationLevelIds)) this.locationLevelIds = [LocationLevelIds.PORT];

    // Combo: programs
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        acquisitionLevelLabels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION]
      },
      mobile: this.mobile,
      showAllOnFocus: true
    });

    // Combo: vessels
    this.vesselSnapshotService.getAutocompleteFieldOptions().then(opts =>
      this.registerAutocompleteField('vesselSnapshot', opts)
    );

    // Combo location
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('location', {
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        levelIds: this.locationLevelIds
      }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      suggestLengthThreshold: this._locationSuggestLengthThreshold || 0,
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

    // Combo: metiers
    const metierAttributes = this.settings.getFieldDisplayAttributes('metier');
    this.registerAutocompleteField<ReferentialRef>('metier', {
      // Important, to get the current (focused) control value, in suggestMetiers() function (otherwise it will received '*').
      //showAllOnFocus: false,
      suggestFn: (value, options) => this.suggestMetiers(value, options),
      // Default filter. An excludedIds will be add dynamically
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      // Increase default size (=3) of 'label' column
      columnSizes: metierAttributes.map(a => a === 'label' ? 4 : undefined/*auto*/),
      attributes: metierAttributes,
      mobile: this.mobile
    });

    // Update metier filter when form changed (if filter enable)
    this.registerSubscription(
      this.form.valueChanges
        .pipe(
          debounceTime(250),
          filter(_ => this._showMetiers)
        )
        .subscribe((value) => this.updateMetierFilter(value))
    );


  }

  ngOnReady() {
    this.updateFormGroup();

    this.registerSubscription(
      combineLatest([
        this.form.get('departureDateTime').valueChanges,
        this.form.get('returnDateTime').valueChanges
      ])
      .subscribe(([d1, d2]) => {
        const max = DateUtils.max(fromDateISOString(d1), fromDateISOString(d2));
        this.maxDateChanges.next(max);
      })
    );
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

  reset(data?: Trip, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    this.setValue(data || new Trip(), opts);
  }

  async setValue(data: Trip, opts?: { emitEvent?: boolean; onlySelf?: boolean; }) {
    // Wait ready (= form group updated, by the parent page)
    await this.ready();

    // Make sure to have (at least) one observer
    // Resize observers array
    if (this._showObservers) {
      data.observers = data.observers && data.observers.length ? data.observers : [null];
      this.observersHelper.resize(Math.max(1, data.observers.length));
    }
    else {
      data.observers = [];
      this.observersHelper?.resize(0);
    }

    // Make sure to have (at least) one metier
    this._showMetiers = this._showMetiers || isNotEmptyArray(data?.metiers);
    if (this._showMetiers) {
      data.metiers = data.metiers && data.metiers.length ? data.metiers : [null];
      this.metiersHelper.resize(Math.max(1, data.metiers.length));
    } else {
      data.metiers = [];
      this.metiersHelper?.resize(0);
    }

    this.maxDateChanges.emit(DateUtils.max(data.departureDateTime, data.returnDateTime));

    // Send value for form
    super.setValue(data, opts);
  }

  async addVesselModal(): Promise<any> {
    const maxDate = this.form.get('departureDateTime').value;

    const modal = await this.modalCtrl.create({
      component: VesselModal,
      componentProps: {
        defaultStatus: this.vesselDefaultStatus,
        maxDate: isNotNil(maxDate) ? toDateISOString(maxDate) : undefined
      }
    });

    await modal.present();

    const res = await modal.onDidDismiss();

    // if new vessel added, use it
    const vessel = res && res.data;
    if (vessel) {
      const vesselSnapshot = (vessel instanceof VesselSnapshot)
        ? vessel
        : ((vessel instanceof Vessel) ? VesselSnapshot.fromVessel(vessel) : VesselSnapshot.fromObject(vessel));
      console.debug("[trip-form] New vessel added : updating form...", vesselSnapshot);
      this.form.controls['vesselSnapshot'].setValue(vesselSnapshot);
      this.markForCheck();
    } else {
      console.debug("[trip-form] No vessel added (user cancelled)");
    }
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

  referentialToString = referentialToString;

  /* -- protected methods-- */

  protected updateMetierFilter(value?: Trip) {
    console.debug("[trip-form] Updating metier filter...");
    value = value || this.form.value as Trip;
    const program = value.program || this.form.get('program').value;
    const programLabel = program && program.label;
    const endDate = fromDateISOString(value.returnDateTime || value.departureDateTime);
    const vesselId = value.vesselSnapshot && value.vesselSnapshot.id;

    const canFilterMetier = endDate && isNotNilOrBlank(programLabel) && isNotNil(vesselId);

    let metierFilter: Partial<MetierFilter>;
    if (!this.enableMetierFilter || !canFilterMetier) {
      metierFilter = TRIP_METIER_DEFAULT_FILTER;
    }
    else {
      const startDate = endDate.clone().startOf('day').add(-1 * this.metierHistoryNbDays, 'day');
      const excludedTripId = EntityUtils.isRemote(value) ? value.id : undefined;

      metierFilter = {
        ...TRIP_METIER_DEFAULT_FILTER,
        programLabel,
        vesselId,
        startDate,
        endDate,
        excludedTripId
      };
    }
    if (this.canFilterMetier !== canFilterMetier || this.metierFilter !== metierFilter) {
      this.canFilterMetier = canFilterMetier;
      this.metierFilter = metierFilter;
      this.markForCheck();
      this.metierField.reloadItems();
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

  protected suggestMetiers(value: any, filter?: Partial<MetierFilter>): Promise<LoadResult<Metier>> {
    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
    const newValue = currentControlValue ? '*' : value;

    // Excluded existing observers, BUT keep the current control value
    const excludedIds = (this.metiersForm.value || [])
      .filter(ReferentialUtils.isNotEmpty)
      .filter(item => !currentControlValue || currentControlValue !== item)
      .map(item => parseInt(item.id));

    return this.metierService.suggest(newValue, {
      ...filter,
      ...this.metierFilter,
      excludedIds
    });
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

  protected initMetiersHelper() {
    if (isNil(this._showMetiers)) return; // skip if not loading yet

    if (!this.metiersHelper) {
      this.metiersHelper = new FormArrayHelper<ReferentialRef>(
        FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'metiers'),
        (metier) => this.validatorService.getMetierControl(metier),
        ReferentialUtils.equals,
        ReferentialUtils.isEmpty,
        { allowEmptyArray: !this._showMetiers }
      );
    }
    else {
      this.metiersHelper.allowEmptyArray = !this._showMetiers;
    }
    if (this._showMetiers) {
      if (this.metiersHelper.size() === 0) {
        this.metiersHelper.resize(1);
      }
    }
    else if (this.metiersHelper.size() > 0) {
      this.metiersHelper.resize(0);
    }
  }


  protected updateFormGroup() {
    console.info('[trip-form] Updating form group...');
    const validatorOpts: TripValidatorOptions = {
      returnFieldsRequired: this._returnFieldsRequired,
      minDurationInHours: this.minDurationInHours,
      maxDurationInHours: this.maxDurationInHours
    };
    const validatorOptsStr = JSON.stringify(validatorOpts);

    if (this._lastValidatorOptsStr && validatorOptsStr == this._lastValidatorOptsStr) return; // Skip if same

    this.validatorService.updateFormGroup(this.form, validatorOpts);

    // Remember, for next call
    this._lastValidatorOptsStr = validatorOptsStr;

    this.markForCheck(); // Need to toggle return date time to required
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
