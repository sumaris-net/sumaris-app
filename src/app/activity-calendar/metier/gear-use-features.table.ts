import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import {
  AppValidatorService,
  DateUtils,
  InMemoryEntitiesService,
  LoadResult,
  Referential,
  ReferentialRef,
  ReferentialUtils,
  isEmptyArray,
  isNotEmptyArray,
  slideUpDownAnimation,
  toBoolean,
} from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, GearLevelIds, TaxonGroupTypeIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { RxState } from '@rx-angular/state';
import { GearUseFeatures } from '../model/gear-use-features.model';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { GearUseFeaturesFilter } from '../model/gear-use-features-filter';
import { GearUseFeaturesValidatorService } from '../model/gear-use-features.validator';
import { ActivityCalendarContextService } from '../activity-calendar-context.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { METIER_DEFAULT_FILTER } from '@app/referential/services/metier.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { MeasurementsTableValidatorOptions } from '@app/data/measurement/measurements-table.validator';

export const GEAR_RESERVED_START_COLUMNS: string[] = ['metier', 'gear'];
@Component({
  selector: 'app-gear-use-features-table',
  templateUrl: 'gear-use-features.table.html',
  styleUrls: ['./gear-use-features.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideUpDownAnimation],
  providers: [{ provide: AppValidatorService, useExisting: GearUseFeaturesValidatorService }, RxState],
})
export class GearUseFeaturesTable extends BaseMeasurementsTable<GearUseFeatures, GearUseFeaturesFilter> implements OnInit, OnDestroy {
  private _qvPmfm: IPmfm;
  protected _initialPmfms: IPmfm[];

  @Input() metierTaxonGroupIds: number[];
  @Input() canAdd: boolean = true;
  @Input() canDelete: boolean = true;

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
      }),
      validatorService,
      {
        reservedStartColumns: GEAR_RESERVED_START_COLUMNS,
        reservedEndColumns: [],
        mapPmfms: (pmfms) => this.mapPmfms(pmfms),
      }
    );
    //this.referentialRefService = injector.get(ReferentialRefService);

    this.inlineEdition = true;
    this.autoLoad = true;
    this.sticky = true;

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.MONTHLY_ACTIVITY;
    this.logPrefix = '[gear-use-features-table] ';

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  async ngOnInit() {
    super.ngOnInit();
    this.inlineEdition = !this.readOnly && this.validatorService && !this.mobile;
    this.allowRowDetail = !this.inlineEdition;
    this.showToolbar = toBoolean(this.showToolbar);
    this.showMetierColumn = true;
    this.showGearColumn = false;

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

  async setValue(data: GearUseFeatures[]) {
    this.memoryDataService.value = data;
  }

  async getValue() {
    return this.memoryDataService.value;
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.memoryDataService.stop();
  }

  /*-------------------------*/
  /* -- protected methods -- */
  /*-------------------------*/

  protected async onNewEntity(data: GearUseFeatures): Promise<void> {
    await super.onNewEntity(data);
    console.debug(this.logPrefix, ' Initializing new row data...');
    // If table is editable
    data.startDate = DateUtils.moment().startOf('year');
    data.endDate = DateUtils.moment().endOf('year');
  }

  protected mapPmfms(pmfms: IPmfm[]) {
    if (isEmptyArray(pmfms)) return pmfms; // Nothing to map

    this._initialPmfms = pmfms; // Copy original pmfms list

    if (this._qvPmfm) {
      // Make sure QV Pmfm is required (need to link with parent batch)
      const index = pmfms.findIndex((pmfm) => pmfm.id === this._qvPmfm.id);
      if (index !== -1) {
        // Replace original pmfm by a clone, with hidden=true
        const qvPmfm = this._qvPmfm.clone();
        qvPmfm.hidden = false;
        qvPmfm.required = true;
        pmfms[index] = qvPmfm;
      }
    }
    return pmfms;
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
    this.validatorService.delegateOptions = { withFishingAreas: false };
  }
}
