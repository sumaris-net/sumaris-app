import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnInit, Optional, Output} from '@angular/core';
import {OperationValidatorOptions, OperationValidatorService} from '../services/validator/operation.validator';
import * as momentImported from 'moment';
import {Moment} from 'moment';
import {
  AccountService,
  AppForm,
  DateFormatPipe,
  DateUtils,
  EntityUtils,
  firstNotNilPromise,
  FormArrayHelper,
  fromDateISOString,
  getPropertyByPath,
  IReferentialRef,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  LatLongPattern,
  LoadResult,
  MatAutocompleteField,
  OnReady,
  ReferentialRef,
  ReferentialUtils,
  removeDuplicatesFromArray,
  StatusIds,
  suggestFromArray,
  toBoolean,
  UsageMode
} from '@sumaris-net/ngx-components';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {Operation, PhysicalGear, Trip} from '../services/model/trip.model';
import {BehaviorSubject, combineLatest, merge, Subscription} from 'rxjs';
import {debounceTime, distinctUntilChanged, filter, map, startWith} from 'rxjs/operators';
import {METIER_DEFAULT_FILTER} from '@app/referential/services/metier.service';
import {ReferentialRefService} from '@app/referential/services/referential-ref.service';
import {Geolocation} from '@ionic-native/geolocation/ngx';
import {OperationService} from '@app/trip/services/operation.service';
import {ModalController} from '@ionic/angular';
import {SelectOperationModal, SelectOperationModalOptions} from '@app/trip/operation/select-operation.modal';
import {PmfmService} from '@app/referential/services/pmfm.service';
import {Router} from '@angular/router';
import {PositionUtils} from '@app/trip/services/position.utils';
import {FishingArea} from '@app/data/services/model/fishing-area.model';
import {FishingAreaValidatorService} from '@app/trip/services/validator/fishing-area.validator';
import {LocationLevelIds, PmfmIds, QualityFlagIds} from '@app/referential/services/model/model.enum';
import {TripService} from '@app/trip/services/trip.service';
import {PhysicalGearService} from '@app/trip/services/physicalgear.service';
import {ReferentialRefFilter} from '@app/referential/services/filter/referential-ref.filter';
import {TaxonGroupTypeIds} from '@app/referential/services/model/taxon-group.model';
import { VesselPosition } from "@app/data/services/model/vessel-position.model";

const moment = momentImported;

type FilterableFieldName = 'fishingArea' | 'metier';

type PositionField = 'startPosition' | 'fishingStartPosition' | 'fishingEndPosition' | 'endPosition';

export const IS_CHILD_OPERATION_ITEMS = Object.freeze([
  {
    value: false,
    label: 'TRIP.OPERATION.EDIT.TYPE.PARENT'
  },
  {
    value: true,
    label: 'TRIP.OPERATION.EDIT.TYPE.CHILD'
  }
]);

@Component({
  selector: 'app-form-operation',
  templateUrl: './operation.form.html',
  styleUrls: ['./operation.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationForm extends AppForm<Operation> implements OnInit, OnReady {

  private _trip: Trip;
  private _physicalGearsSubject = new BehaviorSubject<PhysicalGear[]>(undefined);
  private _metiersSubject = new BehaviorSubject<IReferentialRef[]>(undefined);
  private _showMetierFilter = false;
  private _allowParentOperation = false;
  private _showPosition = true;
  private _showFishingArea = false;
  private _requiredComment = false;
  private _positionSubscription: Subscription;
  private _usageMode: UsageMode;

  startProgram: Date | Moment;
  enableGeolocation: boolean;
  latLongFormat: LatLongPattern;
  mobile: boolean;
  distance: number;
  distanceError: boolean;
  distanceWarning: boolean;

  isParentOperationControl: FormControl;
  canEditType: boolean;
  $parentOperationLabel = new BehaviorSubject<string>('');
  fishingAreasHelper: FormArrayHelper<FishingArea>;
  fishingAreaFocusIndex = -1;
  autocompleteFilters = {
    metier: false,
    fishingArea: false
  };

  @Input() programLabel: string;
  @Input() showError = true;
  @Input() showComment = true;
  @Input() fishingStartDateTimeEnable = false;
  @Input() fishingEndDateTimeEnable = false;
  @Input() endDateTimeEnable = true;
  @Input() defaultLatitudeSign: '+' | '-';
  @Input() defaultLongitudeSign: '+' | '-';
  @Input() filteredFishingAreaLocations: ReferentialRef[] = null;
  @Input() fishingAreaLocationLevelIds: number[] = LocationLevelIds.LOCATIONS_AREA;
  @Input() metierTaxonGroupTypeIds: number[] = [TaxonGroupTypeIds.METIER_DCF_5];
  @Input() maxDistanceWarning: number;
  @Input() maxDistanceError: number;

  @Input() set usageMode(usageMode: UsageMode) {
    if (this._usageMode != usageMode) {
      this._usageMode = usageMode;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get usageMode(): UsageMode {
    return this._usageMode;
  }

  @Input() set showMetierFilter(value: boolean) {
    this._showMetierFilter = value;
    // Change metier filter button
    if (this._showMetierFilter !== this.autocompleteFilters.metier) {
      this.toggleMetierFilter(null);
    }
  }

  get showMetierFilter(): boolean {
    return this._showMetierFilter;
  }

  @Input() set allowParentOperation(value: boolean) {
    if (this._allowParentOperation !== value) {
      this._allowParentOperation = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get allowParentOperation(): boolean {
    return this._allowParentOperation;
  }

  @Input() set showPosition(value: boolean) {
    if (this._showPosition !== value) {
      this._showPosition = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get showPosition(): boolean {
    return this._showPosition;
  }

  @Input() set showFishingArea(value: boolean) {
    if (this._showFishingArea !== value) {
      this._showFishingArea = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get showFishingArea(): boolean {
    return this._showFishingArea;
  }


  @Input() set requiredComment(value: boolean) {
    if (this._requiredComment !== value) {
      this._requiredComment = value;
      const commentControl = this.form.get('comments');
      if (value) {
        commentControl.setValidators(Validators.required);
        commentControl.markAsPending({onlySelf: true});
      } else {
        commentControl.clearValidators();
      }
      commentControl.updateValueAndValidity({emitEvent: !this.loading, onlySelf: true});
    }
  }

  get isCommentRequired(): boolean {
    return this._requiredComment;
  }

  get trip(): Trip {
    return this._trip;
  }

  set trip(value: Trip) {
    this.setTrip(value);
  }

  get parentControl(): FormControl {
    return this.form?.controls.parentOperation as FormControl;
  }

  get childControl(): FormControl {
    return this.form?.controls.childOperation as FormControl;
  }

  get fishingAreasForm(): FormArray {
    return this.form?.controls.fishingAreas as FormArray;
  }

  get qualityFlagControl(): FormControl {
    return this.form?.controls.qualityFlagId as FormControl;
  }

  get physicalGearControl(): FormControl {
    return this.form?.controls.physicalGear as FormControl;
  }

  get isParentOperation(): boolean {
    return this.isParentOperationControl.value === true;
  }

  @Input()
  set isParentOperation(value: boolean) {
    this.setIsParentOperation(value);
  }

  get isChildOperation(): boolean {
    return this.isParentOperationControl.value !== true;
  }

  @Input()
  set isChildOperation(value: boolean) {
    this.setIsParentOperation(!value);
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.enable(opts);
  }

  get formError(): string {
    return this.getFormError(this.form);
  }

  get lastActivePositionControl(): AbstractControl {
    return this.endDateTimeEnable && this.form.get('endPosition')
      || this.fishingEndDateTimeEnable && this.form.get('fishingEndPosition')
      || this.fishingStartDateTimeEnable && this.form.get('fishingStartPosition')
      || this.form.get('startPosition');
  }

  get previousFishingEndDateTimeControl(): AbstractControl {
    return this.fishingStartDateTimeEnable && this.form.get('fishingStartDateTime')
      || this.form.get('startDateTime');
  }

  get lastStartDateTimeControl(): AbstractControl {
    return this.fishingStartDateTimeEnable && this.form.get('fishingStartDateTime')
      || this.form.get('startDateTime');
  }

  get previousEndDateTimeControl(): AbstractControl {
    return this.fishingEndDateTimeEnable && this.form.get('fishingEndDateTime')
    || this.fishingStartDateTimeEnable && this.form.get('fishingStartDateTime')
    || this.form.get('startDateTime');
  }

  get isNewData(): boolean {
    return isNil(this.form?.controls.id.value);
  }


  @Output() onParentChanges = new EventEmitter<Operation>();
  @Output() lastEndDateChanges = new EventEmitter<Moment>();

  constructor(
    injector: Injector,
    protected router: Router,
    protected dateFormat: DateFormatPipe,
    protected validatorService: OperationValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
    protected accountService: AccountService,
    protected operationService: OperationService,
    protected physicalGearService: PhysicalGearService,
    protected tripService: TripService,
    protected pmfmService: PmfmService,
    protected formBuilder: FormBuilder,
    protected fishingAreaValidatorService: FishingAreaValidatorService,
    protected cd: ChangeDetectorRef,
    @Optional() protected geolocation: Geolocation
  ) {
    super(injector, validatorService.getFormGroup());
    this.mobile = this.settings.mobile;
    this.i18nFieldPrefix = 'TRIP.OPERATION.EDIT.';

    // A boolean control, to store if parent is a parent or child operation
    this.isParentOperationControl = new FormControl(true, Validators.required);
  }

  ngOnInit() {
    this.usageMode = this.settings.isOnFieldMode(this.usageMode) ? 'FIELD' : 'DESK';
    this.latLongFormat = this.settings.latLongFormat;

    this.enableGeolocation = (this.usageMode === 'FIELD') && this.settings.mobile;
    this.allowParentOperation = toBoolean(this.allowParentOperation, false);

    super.ngOnInit();

    // Combo: physicalGears
    const physicalGearAttributes = ['rankOrder']
      .concat(this.settings.getFieldDisplayAttributes('gear')
        .map(key => 'gear.' + key));
    this.registerAutocompleteField('physicalGear', {
      items: this._physicalGearsSubject,
      attributes: physicalGearAttributes,
      mobile: this.mobile
    });

    // Combo: fishingAreas
    const fishingAreaAttributes = this.settings.getFieldDisplayAttributes('fishingAreaLocation',
      // TODO: find a way to configure/change this array dynamically (by a set/get input + set by program's option)
      // Est-ce que la SFA a besoin des deux info, label et name ? Par ACSOT/PIFIL non, sur les rect stats
      ['label', 'name']
    );
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('fishingAreaLocation', {
      suggestFn: (value, filter) => this.suggestFishingAreaLocations(value, {
        ...filter,
        levelIds: this.fishingAreaLocationLevelIds
      }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      attributes: fishingAreaAttributes,
      suggestLengthThreshold: 2,
      mobile: this.mobile
    });

    // Taxon group combo
    this.registerAutocompleteField('taxonGroup', {
      suggestFn: (value, filter) => this.suggestMetiers(value, filter),
      mobile: this.mobile
    });

    // Listen physical gear, to enable/disable metier
    this.registerSubscription(
      this.form.get('physicalGear').valueChanges
        .pipe(
          distinctUntilChanged((o1, o2) => EntityUtils.equals(o1, o2, 'id'))
        )
        .subscribe((physicalGear) => this.onPhysicalGearChanged(physicalGear))
    );

    // Listen parent operation
    this.registerSubscription(
      this.parentControl.valueChanges
        .subscribe(value => this.onParentOperationChanged(value))
    );

    const fishingEndDateTimeControl = this.form.get('fishingEndDateTime');
    const endDateTimeControl = this.form.get('endDateTime');
    this.registerSubscription(
      combineLatest([
        fishingEndDateTimeControl
          .valueChanges
          .pipe(
            filter(_ => this.fishingEndDateTimeEnable),
            startWith<any, any>(fishingEndDateTimeControl.value) // Need by combineLatest (must be after filter)
          ),
        endDateTimeControl
          .valueChanges
          .pipe(
            filter(_ => this.endDateTimeEnable),
            startWith<any, any>(endDateTimeControl.value) // Need by combineLatest (must be after filter)
          )
      ])
      .pipe(
        debounceTime(250),
        map(([d1, d2]) => DateUtils.max(fromDateISOString(d1), fromDateISOString(d2))),
        distinctUntilChanged(),
        // DEBUG
        //tap(max => console.debug('[operation-form] max date changed: ' + toDateISOString(max)))
      )
      .subscribe(max => this.lastEndDateChanges.next(max))
    );

    this.registerSubscription(
      this.isParentOperationControl.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe(value => this.setIsParentOperation(value))
    );
  }

  ngOnReady() {
    if (this.debug) console.debug('[operation-form] Form is ready!');
    if (!this.allowParentOperation) this.updateFormGroup();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._physicalGearsSubject.complete();
    this._metiersSubject.complete();
    this.$parentOperationLabel.complete();
    this._positionSubscription?.unsubscribe();
  }

  reset(data?: Operation, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    this.setValue(data || new Operation(), opts);
  }

  async setValue(data: Operation, opts?: { emitEvent?: boolean; onlySelf?: boolean; }): Promise<void> {

    // Wait ready (= form group updated, by the parent page)
    await this.ready();

    const isNew = isNil(data?.id);

    // Use trip physical gear Object (if possible)
    let physicalGear = data.physicalGear;
    const physicalGears = this._physicalGearsSubject.value;
    if (physicalGear && isNotNil(physicalGear.id) && isNotEmptyArray(physicalGears)) {
      data.physicalGear = physicalGears.find(g => g.id === physicalGear.id) || physicalGear;
    }

    // If parent or child operation
    const isChildOperation = data && isNotNil(data.parentOperation?.id);
    const isParentOperation = !isChildOperation && (isNotNil(data.childOperation?.id) || this.allowParentOperation);
    if (isChildOperation || isParentOperation) {
      this._allowParentOperation = true; // do not use setter to not update form group
      this.setIsParentOperation(isParentOperation, {emitEvent: false});
      if (isChildOperation) this.updateFormGroup({emitEvent: false});
    }

    // Use label and name from metier.taxonGroup
    if (!isNew && data?.metier) {
      data.metier = data.metier.clone(); // Leave original object unchanged
      data.metier.label = data.metier.taxonGroup && data.metier.taxonGroup.label || data.metier.label;
      data.metier.name = data.metier.taxonGroup && data.metier.taxonGroup.name || data.metier.name;
    }

    if (!isNew && !this._showPosition) {
      data.positions = [];
      data.startPosition = null;
      data.endPosition = null;
    }

    if (!isNew && !this._showFishingArea) data.fishingAreas = [];
    if (!isNew && this._showFishingArea && data.fishingAreas.length) {
      this.fishingAreasHelper.resize(Math.max(data.fishingAreas.length, 1));
    }

    if (isParentOperation && isNil(data.qualityFlagId)) {
      data.qualityFlagId = QualityFlagIds.NOT_COMPLETED;
    }

    this.canEditType = isNew;

    setTimeout(() => {
      this.lastEndDateChanges.emit(DateUtils.max(
        this.fishingEndDateTimeEnable && data.fishingEndDateTime,
        this.endDateTimeEnable && data.endDateTime));
    });

    // Send value for form
    if (this.debug) console.debug('[operation-form] Updating form (using entity)', data);
    super.setValue(data, opts);
  }

  setTrip(trip: Trip) {
    this._trip = trip;

    if (trip) {
      // Propagate physical gears
      const gearLabelPath = 'measurementValues.' + PmfmIds.GEAR_LABEL;
      const physicalGears = (trip.gears || []).map((ps, i) => {
        const physicalGear = PhysicalGear.fromObject(ps).clone();
        // Use physical gear label, if any (see issue #314)
        const physicalGearLabel = getPropertyByPath(ps, gearLabelPath);
        if (isNotNilOrBlank(physicalGearLabel)) {
          physicalGear.gear.name = physicalGearLabel;
        }
        return physicalGear;
      });
      this._physicalGearsSubject.next(physicalGears);

      // Use trip physical gear Object (if possible)
      const physicalGearControl = this.form.get('physicalGear');
      let physicalGear = physicalGearControl.value;
      if (physicalGear && isNotNil(physicalGear.id)) {
        physicalGear = physicalGears.find(g => g.id === physicalGear.id) || physicalGear;
        if (physicalGear) physicalGearControl.patchValue(physicalGear);
      }

      // Update form group
      if (!this.loading) this.updateFormGroup();
    }
  }

  /**
   * // Fill dates using the trip's dates
   */
  public fillWithTripDates() {
    if (!this.trip) return;

    const endDateTime = fromDateISOString(this.trip.returnDateTime).clone();
    endDateTime.subtract(1, 'second');
    this.form.patchValue({startDateTime: this.trip.departureDateTime, endDateTime: endDateTime});
  }

  setChildOperation(value: Operation, opts?: { emitEvent: boolean }) {
    this.childControl.setValue(value, opts);

    if (!opts || opts.emitEvent !== false) {
      this.updateFormGroup();
    }
  }

  async setParentOperation(value: Operation, opts?: { emitEvent: boolean }) {
    this.parentControl.setValue(value, opts);

    await this.onParentOperationChanged(value, {emitEvent: false});

    if (!opts || opts.emitEvent !== false) {
      this.updateFormGroup();
    }
  }

  /**
   * Get the position by GPS sensor
   * @param fieldName
   */
  async onFillPositionClick(event: UIEvent, fieldName: string) {

    if (event) {
      event.preventDefault();
      event.stopPropagation(); // Avoid focus into the longitude field
    }
    const positionGroup = this.form.controls[fieldName];
    if (positionGroup && positionGroup instanceof FormGroup) {
      const coords = await this.operationService.getCurrentPosition();
      positionGroup.patchValue(coords, {emitEvent: false, onlySelf: true});
    }
    // Set also the end date time
    if (fieldName === 'endPosition') {
      const endDateTimeControlName = this.isChildOperation ? 'endDateTime' : 'fishingStartDateTime';
      this.form.get(endDateTimeControlName).setValue(moment(), {emitEvent: false, onlySelf: true});
    }

    this.form.markAsDirty({onlySelf: true});
    this.form.updateValueAndValidity();

    this.updateDistance({emitEvent: false /* done after */});

    this.markForCheck();
  }

  copyPosition(event: UIEvent, source: PositionField, target?: PositionField) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const value = this.form.get(source).value;

    if (!target && source === 'startPosition') {
      target = (this.fishingStartDateTimeEnable && 'fishingStartPosition')
        || (this.fishingEndDateTimeEnable && 'fishingEndPosition')
        || (this.endDateTimeEnable && 'endPosition') || undefined;
    }
    if (!target) return; // Skip

    this.form.get(target).patchValue({
      latitude: value.latitude,
      longitude: value.longitude
    }, {emitEvent: true});
    this.markAsDirty();
  }

  async openSelectOperationModal(): Promise<Operation> {

    const value = this.form.value as Partial<Operation>;
    const endDate = value.fishingEndDateTime || this.trip && this.trip.returnDateTime || moment();
    const parent = value.parentOperation;
    const trip = this.trip;
    const startDate = trip && fromDateISOString(trip.departureDateTime).clone().add(-15, 'day') || moment().add(-15, 'day');

    const gearIds = removeDuplicatesFromArray((this._physicalGearsSubject.value || []).map(physicalGear => physicalGear.gear.id));

    const modal = await this.modalCtrl.create({
      component: SelectOperationModal,
      componentProps: <SelectOperationModalOptions>{
        filter: {
          programLabel: this.programLabel,
          vesselId: trip.vesselSnapshot?.id,
          excludedIds: isNotNil(value.id) ? [value.id] : null,
          excludeChildOperation: true,
          hasNoChildOperation: true,
          //endDate,
          startDate,
          gearIds
        },
        gearIds,
        parent,
        enableGeolocation: this.enableGeolocation
      },
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    await modal.present();

    const {data} = await modal.onDidDismiss();
    if (data && this.debug) console.debug('[operation-form] Modal result: ', data);

    return (data instanceof Operation) ? data : undefined;
  }

  async onParentOperationChanged(parentOperation?: Operation, opts?: { emitEvent: boolean }) {
    parentOperation = parentOperation || this.parentControl.value;
    if (this.debug) console.debug('[operation-form] Parent operation changed: ', parentOperation);

    if (!opts || opts.emitEvent !== false) {
      this.onParentChanges.emit(parentOperation);
    }

    // Compute parent operation label
    let parentLabel = '';
    if (isNotNil(parentOperation?.id)) {
      parentLabel = await this.translate.get(this.i18nFieldPrefix + 'TITLE_NO_RANK', {
        startDateTime: parentOperation.startDateTime && this.dateFormat.transform(parentOperation.startDateTime, {time: true}) as string
      }).toPromise() as string;

      // Append end time
      if (parentOperation.fishingStartDateTime && !parentOperation.startDateTime.isSame(parentOperation.fishingStartDateTime)) {
        const endSuffix = this.dateFormat.transform(parentOperation.fishingStartDateTime, {pattern: 'HH:mm'});
        parentLabel += ' -> ' + endSuffix;
      }
    }
    this.$parentOperationLabel.next(parentLabel);

  }

  async addParentOperation(): Promise<Operation> {
    const parentOperation = await this.openSelectOperationModal();

    // User cancelled
    if (!parentOperation) {
      this.parentControl.markAsTouched();
      this.parentControl.markAsDirty();
      this.markForCheck();
      return;
    }

    // DEBUG
    console.debug('[operation-form] Set parent operation', parentOperation);

    const form = this.form;
    const metierControl = form.get('metier');
    const physicalGearControl = form.get('physicalGear');
    const startPositionControl = form.get('startPosition');
    const fishingStartPositionControl = form.get('fishingStartPosition');
    const fishingEndPositionControl = form.get('fishingEndPosition');
    const endPositionControl = form.get('endPosition');
    const startDateTimeControl = form.get('startDateTime');
    const fishingStartDateTimeControl = form.get('fishingStartDateTime');
    const qualityFlagIdControl = form.get('qualityFlagId');
    const fishingAreasControl = this._showFishingArea && form.get('fishingAreas');

    this.parentControl.setValue(parentOperation);

    if (this._trip.id === parentOperation.tripId) {
      physicalGearControl.patchValue(parentOperation.physicalGear);
      metierControl.patchValue(parentOperation.metier);
    }
    // Parent is not on the same trip
    else {
      const physicalGears = (await firstNotNilPromise(this._physicalGearsSubject))
        .sort(PhysicalGear.sameAsComparator(parentOperation.physicalGear));

      if (physicalGears.length > 1) {
        if (this.debug) {
          console.warn('[operation-form] several matching physical gear on trip',
            physicalGears,
            physicalGears.map(g => PhysicalGear.computeSameAsScore(parentOperation.physicalGear, g)));
        } else console.warn('[operation-form] several matching physical gear on trip', physicalGears);
      } else if (physicalGears.length === 0) {
        // Make a copy of parent operation physical gear's on current trip
        const physicalGear = await this.physicalGearService.load(parentOperation.physicalGear.id, parentOperation.tripId, {toEntity: false});
        physicalGear.id = undefined;
        physicalGear.trip = undefined;
        physicalGear.tripId = this.trip.id;

        physicalGears.push(physicalGear);
        this._physicalGearsSubject.next(physicalGears);
      }

      const physicalGear = physicalGears[0];
      physicalGearControl.setValue(physicalGear);

      // Use the parent metier
      metierControl.patchValue(parentOperation.metier);

      await this.loadMetiers(physicalGear, true);
    }

    // Copy positions
    if (this._showPosition) {
      // Copy parent's positions
      this.setPosition(startPositionControl, parentOperation.startPosition);
      if (this.fishingStartDateTimeEnable) this.setPosition(fishingStartPositionControl, parentOperation.fishingStartPosition);
      // Init child default position
      if (this.fishingEndDateTimeEnable) this.setPosition(fishingEndPositionControl, parentOperation.startPosition);
      if (this.endDateTimeEnable) this.setPosition(endPositionControl, parentOperation.fishingStartPosition);
    }

    // Copy fishing area
    if (this._showFishingArea && isNotEmptyArray(parentOperation.fishingAreas)) {
      const fishingAreasCopy = parentOperation.fishingAreas
        .filter(fa => ReferentialUtils.isNotEmpty(fa.location))
        .map(fa => <FishingArea>{location: fa.location});
      if (isNotEmptyArray(fishingAreasCopy) && this.fishingAreasHelper.size() <= 1) {
        this.fishingAreasHelper.resize(fishingAreasCopy.length);
        fishingAreasControl.patchValue(fishingAreasCopy);
      }
    }

    startDateTimeControl.patchValue(parentOperation.startDateTime);
    fishingStartDateTimeControl.patchValue(parentOperation.fishingStartDateTime);
    qualityFlagIdControl.patchValue(null); // Reset quality flag, on a child operation


    this.markAsDirty();

    return parentOperation;
  }

  addFishingArea() {
    this.fishingAreasHelper.add();
    if (!this.mobile) {
      this.fishingAreaFocusIndex = this.fishingAreasHelper.size() - 1;
    }
  }

  async toggleMetierFilter(event: UIEvent, field?: MatAutocompleteField) {
    if (event) event.preventDefault();

    this.toggleFilter('metier');

    // Refresh metiers
    const physicalGear = this.form.get('physicalGear').value;
    await this.loadMetiers(physicalGear);

    if (field) field.reloadItems();
  }

  toggleFilter(fieldName: FilterableFieldName, field?: MatAutocompleteField) {
    this.setFieldFilterEnable(fieldName, !this.isFieldFilterEnable(fieldName), field);
  }

  async updateParentOperation() {
    const parent = this.parentControl.value;

    if (parent) {
      await this.router.navigateByUrl(`/trips/${parent.tripId}/operation/${parent.id}`);
    }
  }

  translateControlPath(controlPath: string): string {
    return this.operationService.translateControlPath(controlPath, {i18nPrefix: this.i18nFieldPrefix});
  }

  /* -- protected methods -- */

  protected updateFormGroup(opts?: { emitEvent?: boolean }) {

    const validatorOpts = <OperationValidatorOptions>{
      isOnFieldMode: this.usageMode === 'FIELD',
      trip: this.trip,
      isParent: this.allowParentOperation && this.isParentOperation,
      isChild: this.allowParentOperation && this.isChildOperation,
      withPosition: this.showPosition,
      withFishingAreas: this.showFishingArea,
      withFishingStart: this.fishingStartDateTimeEnable,
      withFishingEnd: this.fishingEndDateTimeEnable,
      withEnd: this.endDateTimeEnable,
      maxDistance: this.maxDistanceError
    };

    // DEBUG
    console.debug(`[operation] Updating form group (validators)`, validatorOpts);

    this.validatorService.updateFormGroup(this.form, validatorOpts);

    if (validatorOpts.withFishingAreas) this.initFishingAreas(this.form);

    this.initPositionSubscription();

    if (!opts || opts.emitEvent !== false) {
      this.form.updateValueAndValidity();
      this.markForCheck();
    }
  }

  protected async onPhysicalGearChanged(physicalGear: PhysicalGear) {
    const metierControl = this.form.get('metier');
    const physicalGearControl = this.form.get('physicalGear');

    const hasPhysicalGear = EntityUtils.isNotEmpty(physicalGear, 'id');
    const gears = this._physicalGearsSubject.getValue() || this._trip && this._trip.gears;
    // Use same trip's gear Object (if found)
    if (hasPhysicalGear && isNotEmptyArray(gears)) {
      physicalGear = (gears || []).find(g => g.id === physicalGear.id);
      physicalGearControl.patchValue(physicalGear, {emitEvent: false});
    }

    // Change metier status, if need
    const enableMetier = hasPhysicalGear && this.form.enabled && isNotEmptyArray(gears) || this.allowParentOperation;
    if (enableMetier) {
      if (metierControl.disabled) metierControl.enable();
    } else {
      if (metierControl.enabled) metierControl.disable();
    }

    if (hasPhysicalGear) {
      // Refresh metiers
      await this.loadMetiers(physicalGear);
    }
  }

  protected async loadMetiers(physicalGear?: PhysicalGear | any, keepExistingMetier?: boolean): Promise<ReferentialRef[]> {
    this._metiersSubject.next(null);

    // No gears selected: skip
    if (EntityUtils.isEmpty(physicalGear, 'id')) {
      return undefined;
    }

    const gear = physicalGear && physicalGear.gear;
    console.debug('[operation-form] Loading Metier ref items for the gear: ' + (gear && gear.label));

    let res;
    if (this.autocompleteFilters.metier) {
      res = await this.operationService.loadPracticedMetier(0, 100, null, null,
        {
          ...METIER_DEFAULT_FILTER,
          searchJoin: 'TaxonGroup',
          vesselId: this.trip.vesselSnapshot.id,
          startDate: this.startProgram as Moment,
          endDate: moment(),
          programLabel: this.programLabel,
          gearIds: gear && [gear.id],
          levelId: gear && gear.id || undefined
        },
        {
          withTotal: false
        });
    } else {
      res = await this.referentialRefService.loadAll(0, 100, null, null,
        <Partial<ReferentialRefFilter>>{
          entityName: 'Metier',
          ...METIER_DEFAULT_FILTER,
          searchJoin: 'TaxonGroup',
          searchJoinLevelIds: this.metierTaxonGroupTypeIds,
          levelId: gear && gear.id || undefined
        },
        {
          withTotal: false
        });
    }

    const metiers = res.data;

    if (this.autocompleteFilters.metier && metiers.length === 0) {
      this.toggleMetierFilter(null);
      return;
    }

    const metierControl = this.form.get('metier');

    const metier = metierControl.value;
    if (ReferentialUtils.isNotEmpty(metier)) {
      // Find new reference, by ID
      let updatedMetier = (metiers || []).find(m => m.id === metier.id);

      // If not found : retry using the label (WARN: because of searchJoin, label = taxonGroup.label)
      updatedMetier = updatedMetier || (metiers || []).find(m => m.label === metier.label);

      // Update the metier, if not found (=reset) or ID changed
      if ((!keepExistingMetier && !updatedMetier) || (updatedMetier && !ReferentialUtils.equals(metier, updatedMetier))) {
        metierControl.patchValue(updatedMetier);
      }
    }
    this._metiersSubject.next(metiers);
    if (metiers.length === 1 && ReferentialUtils.isEmpty(metier)) {
      metierControl.patchValue(metiers[0]);
    }
    return res.data;
  }

  setIsParentOperation(isParent: boolean, opts?: { emitEvent?: boolean; }) {

    if (this.debug) console.debug('[operation-form] Is parent operation ? ', isParent);

    if (this.isParentOperationControl.value !== isParent) {
      this.isParentOperationControl.setValue(isParent, opts);
    }

    const emitEvent = (!opts || opts.emitEvent !== false);

    // Parent operation (= Filage) (or parent not used)
    if (isParent) {
      if (emitEvent) {
        // Clean child fields
        this.form.patchValue({
          fishingEndDateTime: null,
          endDateTime: null,
          physicalGear: null,
          metier: null,
          parentOperation: null
        });

        this.updateFormGroup();
      }

      // Silent mode
      else {
        if (!this.childControl) this.updateFormGroup({emitEvent: false}); // Create the child control

        // Make sure qualityFlag has been set
        this.qualityFlagControl.reset(QualityFlagIds.NOT_COMPLETED, {emitEvent: false});
      }
    }

    // Child operation (=Virage)
    else {
      if (emitEvent) {
        if (!this.parentControl.value) {
          // Copy parent fields -> child fields
          const dates = [this.form.get('startDateTime').value, this.form.get('fishingStartDateTime').value].filter(isNotNil);
          if (this.fishingEndDateTimeEnable && isNotEmptyArray(dates)) {
            this.form.get('fishingEndDateTime').patchValue(dates.shift());
          }
          if (this.endDateTimeEnable && isNotEmptyArray(dates)) {
            this.form.get('endDateTime').patchValue(dates.shift());
          }
          if (this.showFishingArea) this.form.get('fishingAreas')?.patchValue(this.form.get('fishingAreas').value);

          // Clean parent fields (should be filled after parent selection)
          this.form.patchValue({
            startDateTime: null,
            fishingStartDateTime: null,
            physicalGear: null,
            metier: null,
            childOperation: null
          });

          this.updateFormGroup();

          // Select a parent (or same if user cancelled)
          this.addParentOperation();

        }
      }
      // Silent mode
      else {
        // Reset qualityFlag
        this.qualityFlagControl.reset(null, {emitEvent: false});
      }
    }
  }

  protected getI18nFieldName(path: string): string {
    // Replace 'metier' control name, by the UI field name
    if (path === 'metier') path = 'targetSpecies';

    return super.getI18nFieldName(path);
  }

  protected setPosition(positionControl: AbstractControl, position?: VesselPosition) {
    const latitudeControl = positionControl.get('latitude');
    const longitudeControl = positionControl.get('longitude');

    if (isNil(latitudeControl) || isNil(longitudeControl)) {
      console.warn('[operation-form] This control does not contains longitude or latitude field');
      return;
    }
    latitudeControl.patchValue(position && position.latitude || null);
    longitudeControl.patchValue(position && position.longitude || null);
  }

  protected updateDistance(opts?: { emitEvent?: boolean }) {
    if (!this._showPosition) return; // Skip

    this.distanceWarning = false;
    let startPosition = this.form.get('startPosition').value;
    let endPosition = this.lastActivePositionControl?.value;
    if (!startPosition || !endPosition) return;

    const distance = PositionUtils.computeDistanceInMiles(startPosition, endPosition);
    if (this.debug) console.debug('[operation-form] Distance between position: ' + distance);

    // Distance > max warn distance
    if (isNotNilOrNaN(distance) && this.maxDistanceWarning > 0 && distance > this.maxDistanceWarning) {
      console.warn('Too long distance (> ' + this.maxDistanceWarning + ') between start and end positions');
      this.distanceWarning = true;
    }
    this.distance = distance;

    if (!opts || !opts.emitEvent !== false) this.markForCheck();
  }

  protected async suggestMetiers(value: any, filter: any): Promise<LoadResult<IReferentialRef>> {
    if (ReferentialUtils.isNotEmpty(value)) return {data: [value]};

    let metiers = this._metiersSubject.value;
    if (isNil(metiers)) metiers = await firstNotNilPromise(this._metiersSubject);
    return suggestFromArray(metiers, value, filter);
  }

  protected async suggestFishingAreaLocations(value: string, filter: any): Promise<LoadResult<ReferentialRef>> {
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

  protected initFishingAreas(form: FormGroup) {
    this.fishingAreasHelper = new FormArrayHelper<FishingArea>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, form, 'fishingAreas'),
      (fishingArea) => this.fishingAreaValidatorService.getFormGroup(fishingArea, {required: true}),
      (o1, o2) => isNil(o1) && isNil(o2) || (o1 && o1.equals(o2)),
      (fishingArea) => !fishingArea || ReferentialUtils.isEmpty(fishingArea.location),
      {allowEmptyArray: false}
    );
    if (this.fishingAreasHelper.size() === 0) {
      this.fishingAreasHelper.resize(1);
    }
    //this.fishingAreasHelper.formArray.setValidators(SharedFormArrayValidators.requiredArrayMinLength(1));
  }

  protected initPositionSubscription() {
    if (this._positionSubscription) this._positionSubscription.unsubscribe();
    if (!this.showPosition) return;

    this._positionSubscription = (
      merge(
        this.form.get('startPosition').valueChanges,
        this.lastActivePositionControl.valueChanges
      )
        .pipe(debounceTime(200))
        .subscribe(_ => this.updateDistance())
    );
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

}
