import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Injector,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { TripValidatorOptions, TripValidatorService } from './trip.validator';
import { ModalController } from '@ionic/angular';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';

import {
  AppForm,
  AppFormArray,
  DateUtils,
  EntityUtils,
  equals,
  fromDateISOString,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LoadResult,
  MatAutocompleteField,
  MatAutocompleteFieldAddOptions,
  MatAutocompleteFieldConfig,
  NetworkService,
  OnReady,
  Person,
  PersonService,
  PersonUtils,
  ReferentialRef,
  ReferentialUtils,
  StatusIds,
  toBoolean,
  toDateISOString,
  UserProfileLabel,
} from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { UntypedFormBuilder, UntypedFormControl } from '@angular/forms';

import { Vessel } from '@app/vessel/services/model/vessel.model';
import { METIER_DEFAULT_FILTER, MetierService } from '@app/referential/services/metier.service';
import { Trip } from './trip.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { debounceTime, filter, map } from 'rxjs/operators';
import { VesselModal, VesselModalOptions } from '@app/vessel/modal/vessel-modal';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { MetierFilter } from '@app/referential/services/filter/metier.filter';
import { Metier } from '@app/referential/metier/metier.model';
import { combineLatest } from 'rxjs';
import { Moment } from 'moment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';

const TRIP_METIER_DEFAULT_FILTER = METIER_DEFAULT_FILTER;

@Component({
  selector: 'app-form-trip',
  templateUrl: './trip.form.html',
  styleUrls: ['./trip.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripForm extends AppForm<Trip> implements OnInit, OnReady {
  private _showSamplingStrata: boolean;
  private _showObservers: boolean;
  private _showMetiers: boolean;
  private _returnFieldsRequired: boolean;
  private _locationSuggestLengthThreshold: number;
  private _lastValidatorOpts: any;

  protected observerFocusIndex = -1;
  protected enableMetierFilter = false;
  protected metierFilter: Partial<MetierFilter>;
  protected metierFocusIndex = -1;
  protected canFilterMetier = false;
  protected readonly mobile = this.settings.mobile;

  @Input() showComment = true;
  @Input() allowAddNewVessel = true;
  @Input() showError = true;
  @Input() vesselDefaultStatus = StatusIds.TEMPORARY;
  @Input() metierHistoryNbDays = 60;
  @Input() i18nSuffix = null;

  @Input() set showSamplingStrata(value: boolean) {
    if (this._showSamplingStrata !== value) {
      this._showSamplingStrata = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get showSamplingStrata(): boolean {
    return this._showSamplingStrata;
  }

  @Input() set showObservers(value: boolean) {
    if (this._showObservers !== value) {
      this._showObservers = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get showObservers(): boolean {
    return this._showObservers;
  }

  @Input() set showMetiers(value: boolean) {
    if (this._showMetiers !== value) {
      this._showMetiers = value;
      if (!this.loading) this.updateFormGroup();
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
        this.locationFields.forEach((field) => {
          field.suggestLengthThreshold = value;
          field.reloadItems();
        });
      }
    }
  }

  @Input() set returnFieldsRequired(value: boolean) {
    if (this._returnFieldsRequired !== value) {
      this._returnFieldsRequired = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get returnFieldsRequired(): boolean {
    return this._returnFieldsRequired;
  }

  get vesselSnapshot(): VesselSnapshot {
    return this.form.get('vesselSnapshot').value as VesselSnapshot;
  }

  get programLabel(): string {
    return this.form.get('program').value?.label;
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

  get observersForm() {
    return this.form.controls.observers as AppFormArray<Person, UntypedFormControl>;
  }

  get metiersForm() {
    return this.form.controls.metiers as AppFormArray<ReferentialRef<any>, UntypedFormControl>;
  }

  @Output() departureDateTimeChanges = new EventEmitter<Moment>();
  @Output() departureLocationChanges = new EventEmitter<ReferentialRef>();
  @Output() maxDateChanges = new EventEmitter<Moment>();
  @Output() metiersChanges = new EventEmitter<ReferentialRef[]>();

  @ViewChild('metierField') metierField: MatAutocompleteField;
  @ViewChildren('locationField') locationFields: QueryList<MatAutocompleteField>;

  constructor(
    injector: Injector,
    protected formBuilder: UntypedFormBuilder,
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
  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.showSamplingStrata = toBoolean(this.showSamplingStrata, false); // Will init the observers helper
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
        acquisitionLevelLabels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION],
      },
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
      columnNames: ['REFERENTIAL.LABEL', 'TRIP.SAMPLING_SCHEME_LABEL'],
      mobile: this.mobile,
      showAllOnFocus: this.mobile,
    });

    // Combo: vessels
    this.vesselSnapshotService.getAutocompleteFieldOptions().then((opts) => this.registerAutocompleteField('vesselSnapshot', opts));

    // Combo location
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('location', {
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
        userProfiles: <UserProfileLabel[]>['SUPERVISOR', 'USER', 'GUEST'],
      },
      attributes: ['lastName', 'firstName', 'department.name'],
      displayWith: PersonUtils.personToString,
      mobile: this.mobile,
    });

    // Combo: metiers
    const metierAttributes = this.settings.getFieldDisplayAttributes('metier');
    this.registerAutocompleteField<Metier>('metier', {
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
    this.registerSubscription(
      this.form.valueChanges
        .pipe(
          debounceTime(250),
          filter(() => this._showMetiers)
        )
        .subscribe((value) => this.updateMetierFilter(value))
    );
  }

  ngOnReady() {
    this.updateFormGroup();

    const departureLocation$ = this.form.get('departureLocation').valueChanges;
    const departureDateTime$ = this.form.get('departureDateTime').valueChanges;
    const returnDateTime$ = this.form.get('returnDateTime').valueChanges;

    this.registerSubscription(
      departureLocation$.subscribe((departureLocation) => this.departureLocationChanges.next(ReferentialRef.fromObject(departureLocation)))
    );
    this.registerSubscription(
      departureDateTime$.subscribe((departureDateTime) => this.departureDateTimeChanges.next(fromDateISOString(departureDateTime)))
    );

    this.registerSubscription(
      combineLatest([departureDateTime$, returnDateTime$])
        .pipe(map(([d1, d2]) => DateUtils.max(d1, d2)))
        .subscribe((max) => this.maxDateChanges.next(max))
    );

    if (this.showMetiers) {
      this.registerSubscription(this.form.get('metiers').valueChanges.subscribe((metiers) => this.metiersChanges.next(metiers)));
    }
  }

  registerAutocompleteField<E = any, EF = any>(fieldName: string, opts?: MatAutocompleteFieldAddOptions<E, EF>): MatAutocompleteFieldConfig<E, EF> {
    return super.registerAutocompleteField(fieldName, opts);
  }

  toggleFilteredMetier() {
    if (this.enableMetierFilter) {
      this.enableMetierFilter = false;
    } else {
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

  async setValue(data: Trip, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    // Wait ready (= form group updated, by the parent page)
    await this.ready();

    // Make sure to have (at least) one observer
    // Resize observers array
    if (this._showObservers) {
      // Make sure to have (at least) one observer
      data.observers = isNotEmptyArray(data.observers) ? data.observers : [null];
    } else {
      data.observers = [null];
    }

    // Make sure to have (at least) one metier
    this._showMetiers = this._showMetiers || isNotEmptyArray(data?.metiers);
    if (this._showMetiers) {
      data.metiers = data.metiers && data.metiers.length ? data.metiers : [null];
    } else {
      data.metiers = [];
    }

    this.maxDateChanges.emit(DateUtils.max(data.departureDateTime, data.returnDateTime));

    // Send value for form
    super.setValue(data, opts);
  }

  async addVesselModal(event?: Event): Promise<any> {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const maxDate = this.form.get('departureDateTime').value;

    const modal = await this.modalCtrl.create({
      component: VesselModal,
      componentProps: <VesselModalOptions>{
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
      console.debug('[trip-form] New vessel added : updating form...', vesselSnapshot);
      this.form.controls['vesselSnapshot'].setValue(vesselSnapshot);
      this.markForCheck();
    } else {
      console.debug('[trip-form] No vessel added (user cancelled)');
    }
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

  protected updateMetierFilter(value?: Trip) {
    console.debug('[trip-form] Updating metier filter...');
    value = value || (this.form.value as Trip);
    const program = value.program || this.form.get('program').value;
    const programLabel = program && program.label;
    const endDate = fromDateISOString(value.returnDateTime || value.departureDateTime);
    const vesselId = value.vesselSnapshot && value.vesselSnapshot.id;

    const canFilterMetier = endDate && isNotNilOrBlank(programLabel) && isNotNil(vesselId);

    let metierFilter: Partial<MetierFilter>;
    if (!this.enableMetierFilter || !canFilterMetier) {
      metierFilter = TRIP_METIER_DEFAULT_FILTER;
    } else {
      const startDate = endDate
        .clone()
        .startOf('day')
        .add(-1 * this.metierHistoryNbDays, 'day');
      const excludedTripId = EntityUtils.isRemote(value) ? value.id : undefined;

      metierFilter = {
        ...TRIP_METIER_DEFAULT_FILTER,
        programLabel,
        vesselId,
        startDate,
        endDate,
        excludedTripId,
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
      .filter((person) => !currentControlValue || currentControlValue !== person)
      .map((person) => parseInt(person.id));

    return this.personService.suggest(newValue, {
      ...filter,
      excludedIds,
    });
  }

  protected suggestMetiers(value: any, filter?: Partial<MetierFilter>): Promise<LoadResult<Metier>> {
    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
    const newValue = currentControlValue ? '*' : value;

    // Excluded existing observers, BUT keep the current control value
    const excludedIds = (this.metiersForm.value || [])
      .filter(ReferentialUtils.isNotEmpty)
      .filter((item) => !currentControlValue || currentControlValue !== item)
      .map((item) => parseInt(item.id));

    return this.metierService.suggest(newValue, {
      ...filter,
      ...this.metierFilter,
      excludedIds,
    });
  }

  updateFormGroup() {
    const validatorOpts: TripValidatorOptions = {
      returnFieldsRequired: this._returnFieldsRequired,
      minDurationInHours: this.minDurationInHours,
      maxDurationInHours: this.maxDurationInHours,
      withSamplingStrata: this.showSamplingStrata,
      withMetiers: this.showMetiers,
      withObservers: this.showObservers,
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
