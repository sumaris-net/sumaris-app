import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { SaleValidatorOptions, SaleValidatorService } from './sale.validator';
import { Moment } from 'moment';
import {
  AppForm,
  AppFormArray,
  IReferentialRef,
  isEmptyArray,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  MatAutocompleteField,
  OnReady,
  ReferentialRef,
  referentialToString,
  ReferentialUtils,
  StatusIds,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Sale } from './sale.model';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { IExpertiseAreaProperties } from '@app/referential/expertise-area/expertise-area.model';
import { FetchPolicy } from '@apollo/client/core';

@Component({
  selector: 'app-form-sale',
  templateUrl: './sale.form.html',
  styleUrls: ['./sale.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleForm extends AppForm<Sale> implements OnInit, OnReady {
  private _minDate: Moment = null;
  private _required: boolean;
  private _locationSuggestLengthThreshold: number;
  private _enableExpertiseArea = false;
  private _expertiseAreaProperties: IExpertiseAreaProperties;

  protected readonly mobile = this.settings.mobile;
  protected metierFocusIndex = -1;
  protected fishingAreaFocusIndex = -1;
  protected invalidMetierIds: number[] = [];
  protected invalidFishingAreaLocationIds: number[] = [];

  @Input() showError = true;
  @Input() showProgram = true;
  @Input() showVessel = true;
  @Input() showLocation = true;
  @Input() showEndDateTime = true;
  @Input() showComment = true;
  @Input() showButtons = true;
  @Input() i18nSuffix: string;
  @Input() showParent = false;
  @Input() locationLevelIds: number[];
  @Input() showMetiers = false;
  @Input() showFishingAreas = false;
  @Input() allowManyMetiers: boolean = null;

  @Input()
  set enableExpertiseArea(value: boolean) {
    this._enableExpertiseArea = value;
    this.checkDataExpertiseArea();
  }

  get enableExpertiseArea(): boolean {
    return this._enableExpertiseArea;
  }

  @Input()
  set expertiseAreaProperties(value: IExpertiseAreaProperties) {
    this._expertiseAreaProperties = value;
    this.checkDataExpertiseArea();
  }

  get expertiseAreaProperties(): IExpertiseAreaProperties {
    return this._expertiseAreaProperties;
  }

  @Input() set required(value: boolean) {
    if (this._required !== value) {
      this._required = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get required(): boolean {
    return this._required;
  }

  @Input() set minDate(value: Moment) {
    if (value && (!this._minDate || !this._minDate.isSame(value))) {
      this._minDate = value;
      if (!this.loading) this.updateFormGroup();
    }
  }

  get minDate(): Moment {
    return this._minDate;
  }

  @Input() set locationSuggestLengthThreshold(value: number) {
    if (this._locationSuggestLengthThreshold !== value) {
      this._locationSuggestLengthThreshold = value;

      // Update location field
      if (this.autocompleteFields.location) {
        this.autocompleteFields.location.suggestLengthThreshold = value;
        if (this.locationField) {
          this.locationField.suggestLengthThreshold = value;
          this.locationField.reloadItems();
        }
      }
    }
  }

  get locationSuggestLengthThreshold() {
    return this._locationSuggestLengthThreshold;
  }

  get empty(): any {
    const value = this.value;
    return (
      ReferentialUtils.isEmpty(value.saleLocation) &&
      !value.startDateTime &&
      !value.endDateTime &&
      ReferentialUtils.isEmpty(value.saleType) &&
      isNilOrBlank(value.comments)
    );
  }

  get valid(): any {
    return this.form && (this.required ? this.form.valid : this.form.valid || this.empty);
  }

  get startDateTimeControl(): UntypedFormControl {
    return this._form.get('startDateTime') as UntypedFormControl;
  }

  @ViewChild('locationField', { static: false }) locationField: MatAutocompleteField;

  get metiersForm() {
    return this.form.controls.metiers as AppFormArray<ReferentialRef<any>, UntypedFormControl>;
  }

  get fishingAreasForm() {
    return this.form?.controls.fishingAreas as AppFormArray<FishingArea, UntypedFormGroup>;
  }

  constructor(
    injector: Injector,
    protected validatorService: SaleValidatorService,
    protected programRefService: ProgramRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected referentialRefService: ReferentialRefService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, validatorService.getFormGroup(null, { required: false }));
  }

  ngOnInit() {
    super.ngOnInit();

    // Set defaults
    this.tabindex = toNumber(this.tabindex, 1);
    this._required = toBoolean(this._required, this.showProgram);
    if (isEmptyArray(this.locationLevelIds)) this.locationLevelIds = [LocationLevelIds.PORT];

    // Combo: programs
    if (this.showProgram) {
      this.registerAutocompleteField('program', {
        service: this.programRefService,
        filter: {
          statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
          acquisitionLevelLabels: [AcquisitionLevelCodes.SALE, AcquisitionLevelCodes.PRODUCT_SALE, AcquisitionLevelCodes.PACKET_SALE],
        },
        mobile: this.mobile,
        showAllOnFocus: this.mobile,
      });
    }

    // Combo: vessels (if need)
    if (this.showVessel) {
      // Combo: vessels
      this.vesselSnapshotService.getAutocompleteFieldOptions().then((opts) => this.registerAutocompleteField('vesselSnapshot', opts));
    } else {
      this.form.get('vesselSnapshot').clearValidators();
    }

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

    // Combo: sale types
    this.registerAutocompleteField('saleType', {
      service: this.referentialRefService,
      attributes: ['name'],
      filter: {
        entityName: 'SaleType',
      },
    });

    // Combo: metier
    const metierAttributes = this.settings.getFieldDisplayAttributes('qualitativeValue');
    this.registerAutocompleteField('metier', {
      reloadItemsOnFocus: true,
      suggestFn: (value, filter) => this.suggestMetiers(value, filter),
      // Default filter. A excludedIds will be add dynamically
      filter: {
        entityName: 'Metier',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      },
      attributes: metierAttributes,
      mobile: this.mobile,
    });

    // Combo: fishingAreas
    const fishingAreaAttributes = this.settings.getFieldDisplayAttributes('fishingAreaLocation', ['label', 'name']);
    this.registerAutocompleteField('fishingAreaLocation', {
      reloadItemsOnFocus: true,
      suggestFn: (value, filter) =>
        this.suggestFishingAreaLocations(value, {
          ...filter,
        }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      },
      attributes: fishingAreaAttributes,
      showAllOnFocus: false,
      suggestLengthThreshold: 2,
      mobile: this.mobile,
    });
  }

  async ngOnReady() {
    this.updateFormGroup();
  }

  protected buildMetierFilter(filter?: Partial<ReferentialRefFilter>, existingMetierIds?: number[]): Partial<ReferentialRefFilter> {
    return {
      entityName: 'Metier',
      statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      ...filter,
      excludedIds: existingMetierIds,
      locationIds: this.enableExpertiseArea ? this.expertiseAreaProperties?.locationIds : filter?.locationIds,
    };
  }

  protected buildFishingAreaFilter(filter?: Partial<ReferentialRefFilter>, existingFishingAreaLocationIds?: number[]): Partial<ReferentialRefFilter> {
    return {
      entityName: 'Location',
      statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      ...filter,
      excludedIds: existingFishingAreaLocationIds,
      levelIds: this.enableExpertiseArea ? this.expertiseAreaProperties?.locationLevelIds : undefined,
      locationIds: this.enableExpertiseArea ? this.expertiseAreaProperties?.locationIds : filter?.locationIds,
    };
  }

  protected async checkDataExpertiseArea() {
    const needCheck = this.enableExpertiseArea && isNotEmptyArray(this.expertiseAreaProperties?.locationIds);
    const invalidMetierIds = [];
    const invalidFishingAreaLocationIds = [];
    const cacheFirstOptions = { fetchPolicy: <FetchPolicy>'cache-first' };

    if (needCheck) {
      // Metiers
      for (const metierControl of this.metiersForm?.controls || []) {
        const metierId = metierControl.value?.id;
        if (isNotNil(metierId) && !invalidMetierIds.includes(metierId)) {
          if (!(await this.referentialRefService.existsById(metierId, this.buildMetierFilter(), cacheFirstOptions))) {
            invalidMetierIds.push(metierId);
          }
        }
      }

      // Fishing areas
      for (const fishingAreaControl of this.fishingAreasForm?.controls || []) {
        const faLocationId = fishingAreaControl.value.location?.id;
        if (isNotNil(faLocationId) && !invalidFishingAreaLocationIds.includes(faLocationId)) {
          if (!(await this.referentialRefService.existsById(faLocationId, this.buildFishingAreaFilter(), cacheFirstOptions))) {
            invalidFishingAreaLocationIds.push(faLocationId);
          }
        }
      }
    }
    this.invalidMetierIds = invalidMetierIds;
    this.invalidFishingAreaLocationIds = invalidFishingAreaLocationIds;
    this.markForCheck();
  }

  protected suggestMetiers(value: any, filter?: any): Promise<LoadResult<ReferentialRef>> {
    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;

    // Excluded existing metiers, BUT keep the current control value
    const excludedIds = (this.metiersForm.value || [])
      .filter(ReferentialUtils.isNotEmpty)
      .filter((item) => !currentControlValue || currentControlValue !== item)
      .map((item) => parseInt(item.id));

    return this.referentialRefService.suggest(value, this.buildMetierFilter(filter, excludedIds));
  }

  protected async suggestFishingAreaLocations(value: any, filter: any): Promise<LoadResult<IReferentialRef>> {
    const currentControlValue: ReferentialRef = ReferentialUtils.isNotEmpty(value) ? value : null;
    // Excluded existing locations, BUT keep the current control value
    const excludedIds = (this.fishingAreasForm.value || <FishingArea[]>[])
      .map((fa: FishingArea) => fa?.location)
      .filter(ReferentialUtils.isNotEmpty)
      .filter((item: ReferentialRef) => !currentControlValue || currentControlValue !== item)
      .map((item: ReferentialRef) => +item.id);

    return await this.referentialRefService.suggest(value, this.buildFishingAreaFilter(filter, excludedIds));
  }

  addMetier() {
    this.metiersForm.add();
    if (!this.mobile) {
      this.metierFocusIndex = this.metiersForm.length - 1;
    }
  }

  addFishingArea() {
    this.fishingAreasForm.add();
    if (!this.mobile) {
      this.fishingAreaFocusIndex = this.fishingAreasForm.length - 1;
    }
  }

  removeMetierAt(index: number) {
    const removed = this.metiersForm.removeAt(index);
    if (removed) {
      this.metiersForm.markAsDirty();
    }
  }

  async setValue(data: Sale, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    // Make sure to have (at least) one metier
    this.showMetiers = this.showMetiers || isNotEmptyArray(data?.metiers);
    if (this.showMetiers) {
      data.metiers = data.metiers && data.metiers.length ? data.metiers : [null];
    } else {
      data.metiers = [];
    }

    // Make sure to have (at least) one fishing area
    this.showFishingAreas = this.showFishingAreas || isNotEmptyArray(data?.fishingAreas);
    if (this.showFishingAreas) {
      data.fishingAreas = data.fishingAreas && data.fishingAreas.length ? data.fishingAreas : [null];
    } else {
      data.fishingAreas = [];
    }

    // Send value for form
    super.setValue(data, opts);

    await this.checkDataExpertiseArea();
  }

  protected updateFormGroup(opts?: { emitEvent?: boolean }) {
    const validatorOpts: SaleValidatorOptions = {
      required: this._required, // Set if required or not
      minDate: this._minDate,
      withProgram: this.showProgram,
      withVessel: this.showVessel,
      withMetiers: this.showMetiers,
      withFishingAreas: this.showFishingAreas,
    };

    console.info('[sale-form] Updating form group...', validatorOpts);
    this.validatorService.updateFormGroup(this.form, validatorOpts);

    if (!opts || opts.emitEvent !== false) {
      this.form.updateValueAndValidity();
      this.markForCheck();
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  referentialToString = referentialToString;
}
