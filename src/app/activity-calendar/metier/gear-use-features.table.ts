import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import {
  AppValidatorService,
  DateUtils,
  InMemoryEntitiesService,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  Referential,
  ReferentialRef,
  ReferentialUtils,
  removeDuplicatesFromArray,
  slideUpDownAnimation,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, GearLevelIds, PmfmIds, TaxonGroupTypeIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { RxState } from '@rx-angular/state';
import { GearUseFeatures } from '../model/gear-use-features.model';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { GearUseFeaturesFilter } from '../model/gear-use-features-filter';
import { GearUseFeaturesValidatorService } from '../model/gear-use-features.validator';
import { ActivityCalendarContextService } from '../activity-calendar-context.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { METIER_DEFAULT_FILTER } from '@app/referential/services/metier.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { MeasurementsTableValidatorOptions } from '@app/data/measurement/measurements-table.validator';
import { IPmfm, PmfmUtils } from '../../referential/services/model/pmfm.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { UntypedFormGroup } from '@angular/forms';

export const GEAR_RESERVED_START_COLUMNS: string[] = ['gear', 'metier'];
@Component({
  selector: 'app-gear-use-features-table',
  templateUrl: 'gear-use-features.table.html',
  styleUrls: ['./gear-use-features.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideUpDownAnimation],
  providers: [{ provide: AppValidatorService, useExisting: GearUseFeaturesValidatorService }, RxState],
})
export class GearUseFeaturesTable extends BaseMeasurementsTable<GearUseFeatures, GearUseFeaturesFilter> implements OnInit, OnDestroy {
  protected gearIds: number[];
  protected _initialPmfms: IPmfm[];
  @Input() metierTaxonGroupIds: number[];
  @Input() canAdd: boolean = false;
  @Input() canDelete: boolean = false;
  @Input() timezone: string = DateUtils.moment().tz();
  @Input() year: number;
  @Input() canEditMetier: boolean;
  @Input() canEditGear: boolean;

  @Input()
  set showMetierColumn(value: boolean) {
    this.setShowColumn('metier', value);
  }

  get showMetierColumn(): boolean {
    return this.getShowColumn('metier');
  }

  @Input()
  set showGearColumn(value: boolean) {
    this.setShowColumn('gear', value);
  }

  get showGearColumn(): boolean {
    return this.getShowColumn('gear');
  }

  set value(data: GearUseFeatures[]) {
    this.setValue(data);
  }

  get value(): GearUseFeatures[] {
    return this.getValue();
  }

  constructor(
    injector: Injector,
    validatorService: GearUseFeaturesValidatorService,
    private referentialRefService: ReferentialRefService,
    protected context: ActivityCalendarContextService
  ) {
    super(
      injector,
      GearUseFeatures,
      GearUseFeaturesFilter,
      new InMemoryEntitiesService<GearUseFeatures, GearUseFeaturesFilter>(GearUseFeatures, GearUseFeaturesFilter, {
        sortByReplacement: { id: 'rankOrder' },
        equals: GearUseFeatures.equals,
      }),
      validatorService,
      {
        reservedStartColumns: GEAR_RESERVED_START_COLUMNS,
        reservedEndColumns: [],
        mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        onPrepareRowForm: (form) => this.onPrepareRowForm(form),
        initialState: {
          requiredStrategy: true,
        },
      }
    );

    this.inlineEdition = true;
    this.autoLoad = true;
    this.sticky = true;

    this.showMetierColumn = false;
    this.showGearColumn = true;

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES;
    this.logPrefix = '[gear-use-features-table] ';
    this.defaultSortBy = 'id';
    this.defaultSortDirection = 'asc';

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }
  mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    if (!this.gearIds) return pmfms;
    if (!pmfms) return; // Skip if empty
    if (!this._initialPmfms) {
      this._initialPmfms = pmfms; // Copy original pmfms list
    }
    return pmfms.filter(
      (pmfm) => !PmfmUtils.isDenormalizedPmfm(pmfm) || isEmptyArray(pmfm.gearIds) || pmfm.gearIds.some((gearId) => this.gearIds.includes(gearId))
    );
  }

  ngOnInit() {
    super.ngOnInit();
    this.inlineEdition = !this.readOnly && this.validatorService && !this.mobile;
    this.allowRowDetail = !this.inlineEdition;
    this.showToolbar = toBoolean(this.showToolbar, !this.mobile);

    // Always add a confirmation before deletion, if mobile
    if (this.mobile) this.confirmBeforeDelete = true;

    //await this.referentialRefService.ready();
    this.registerAutocompleteField('gear', {
      service: this.referentialRefService,
      filter: <ReferentialRefFilter>{
        entityName: 'Gear',
        levelId: GearLevelIds.FAO,
      },
      mobile: this.mobile,
      displayWith: (obj) => obj?.label || '',
    });

    this.registerAutocompleteField('metier', {
      suggestFn: (value, filter) => this.suggestMetiers(value, filter),
      mobile: this.mobile,
      displayWith: (obj) => obj?.label || '',
    });
  }
  setValue(data: GearUseFeatures[]) {
    this.gearIds = removeDuplicatesFromArray(data.map((guf) => toNumber(guf.gear?.id, guf.metier?.gear?.id)));
    if (this._initialPmfms) this.pmfms = this.mapPmfms(this._initialPmfms);
    const dataWithGear = data.map((guf) => {
      guf.gear = guf.metier.gear;
      return guf;
    });
    this.memoryDataService.value = dataWithGear;
  }

  getValue() {
    return this.memoryDataService.value;
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  /*-------------------------*/
  /* -- protected methods -- */
  /*-------------------------*/

  protected async onNewEntity(data: GearUseFeatures): Promise<void> {
    console.debug(this.logPrefix, ' Initializing new row data...');

    await super.onNewEntity(data);

    // If table is editable
    if (isNotNil(this.year)) {
      data.startDate = (this.timezone != null ? DateUtils.moment().tz(this.timezone) : DateUtils.moment()).year(this.year).startOf('year');
      data.endDate = data.startDate.clone().endOf('year');
    }
  }

  protected async suggestMetiers(value: any, filter?: Partial<ReferentialRefFilter>): Promise<LoadResult<ReferentialRef>> {
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };
    // eslint-disable-next-line prefer-const
    let { data, total } = await this.referentialRefService.suggest(value, {
      ...METIER_DEFAULT_FILTER,
      ...filter,
      searchJoin: 'TaxonGroup',
      searchJoinLevelIds: this.metierTaxonGroupIds || [TaxonGroupTypeIds.NATIONAL_METIER],
    });
    if (isNotEmptyArray(data)) {
      const ids = data.map((item) => item.id);
      const sortBy = (filter?.searchAttribute || filter?.searchAttributes?.[0] || 'label') as keyof Referential;
      data = await this.referentialRefService.loadAllByIds(ids, 'Metier', sortBy, 'asc');
    }
    return { data, total };
  }

  protected configureValidator(opts: MeasurementsTableValidatorOptions) {
    super.configureValidator(opts);
    // Not useful here
    this.validatorService.delegateOptions = { withFishingAreas: false, withMetier: true, withGear: true };
  }

  protected onPrepareRowForm(form: UntypedFormGroup) {
    const gearId = form.get('gear')?.value?.id;
    const measurementValuesForm = form.get('measurementValues');

    this._initialPmfms.map((pmfm: DenormalizedPmfmStrategy) => {
      const control = measurementValuesForm.get(pmfm.id.toString());
      if (isNotNil(pmfm.gearIds) && !pmfm.gearIds.includes(gearId) && control) {
        control.disable();
      }
    });
  }
}
