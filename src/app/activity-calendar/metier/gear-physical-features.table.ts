import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import {
  AppFormUtils,
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
  RESERVED_START_COLUMNS,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, GearLevelIds, TaxonGroupTypeIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { RxState } from '@rx-angular/state';
import { GearPhysicalFeatures } from '../model/gear-physical-features.model';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { GearPhysicalFeaturesFilter } from '../model/gear-physical-features-filter';
import { GearPhysicalFeaturesValidatorService } from '../model/gear-physical-features.validator';
import { ActivityCalendarContextService } from '../activity-calendar-context.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { METIER_DEFAULT_FILTER } from '@app/referential/services/metier.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { MeasurementsTableValidatorOptions } from '@app/data/measurement/measurements-table.validator';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { UntypedFormGroup } from '@angular/forms';
import { AppColors } from '@app/shared/colors.utils';
import { TableElement } from '@e-is/ngx-material-table';

export const GEAR_RESERVED_START_COLUMNS: string[] = ['gear', 'metier'];
@Component({
  selector: 'app-gear-physical-features-table',
  templateUrl: 'gear-physical-features.table.html',
  styleUrls: ['./gear-physical-features.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: AppValidatorService, useExisting: GearPhysicalFeaturesValidatorService }, RxState],
})
export class GearPhysicalFeaturesTable extends BaseMeasurementsTable<GearPhysicalFeatures, GearPhysicalFeaturesFilter> implements OnInit, OnDestroy {
  protected gearIds: number[];
  protected _initialPmfms: IPmfm[];
  @Input() metierTaxonGroupIds: number[];
  @Input() canAdd: boolean = false;
  @Input() canDelete: boolean = false;
  @Input() canEditMetier = true;
  @Input() canEditGear = true;
  @Input() timezone: string = DateUtils.moment().tz();
  @Input() year: number;

  @Input() showSelectColumn = true;
  @Input() noResultLabel = 'COMMON.NO_RESULT';
  @Input() noResultColor: AppColors;

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

  set value(data: GearPhysicalFeatures[]) {
    this.setValue(data);
  }

  get value(): GearPhysicalFeatures[] {
    return this.getValue();
  }

  constructor(
    injector: Injector,
    validatorService: GearPhysicalFeaturesValidatorService,
    private referentialRefService: ReferentialRefService,
    protected context: ActivityCalendarContextService
  ) {
    super(
      injector,
      GearPhysicalFeatures,
      GearPhysicalFeaturesFilter,
      new InMemoryEntitiesService<GearPhysicalFeatures, GearPhysicalFeaturesFilter>(GearPhysicalFeatures, GearPhysicalFeaturesFilter, {
        sortByReplacement: { id: 'rankOrder' },
        equals: GearPhysicalFeatures.equals,
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
    this.showSelectColumn = true;
    this.showIdColumn = true;

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES;
    this.logPrefix = '[gear-physical-features-table] ';
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

  confirmAndBackward(event?: Event, row?: TableElement<GearPhysicalFeatures>): boolean | Promise<boolean> {
    const previousRow = this.editedRow;

    event?.stopPropagation();

    if (previousRow) {
      // If cannot confirm previous row
      if (!this.confirmEditCreate(event, previousRow)) {
        // If pending: Wait end of validation, then loop
        if (previousRow.validator?.pending) {
          return AppFormUtils.waitWhilePending(previousRow.validator).then(() => this.confirmAndBackward(event, row));
        }

        // Go back to first column
        this.focusColumn = this.lastUserColumn;
        this.markForCheck();

        return false;
      }
    }

    // Find next available column to focus
    const gearId = row.validator.get('gear')?.value?.id;
    const enabledPmfms = this.pmfms.filter((pmfm: DenormalizedPmfmStrategy) => !(isNotNil(pmfm.gearIds) && !pmfm.gearIds.includes(gearId)));
    const nextPmfmIndex = this.pmfms.indexOf(enabledPmfms.at(-1));
    const focusColumnIndex =
      RESERVED_START_COLUMNS.length +
      (this.showMetierColumn && !this.canEditMetier ? 1 : 0) +
      (this.showGearColumn && !this.canEditGear ? 1 : 0) +
      nextPmfmIndex;
    this.editRow(event, row, {
      focusColumn: this.displayedColumns[focusColumnIndex],
    });

    // Edit previous row
    return true;
  }

  confirmAndForward(event?: Event, row?: TableElement<GearPhysicalFeatures>): boolean | Promise<boolean> {
    if (!this.inlineEdition) return false;
    row = row || this.editedRow;

    event?.stopPropagation();

    if (!this.confirmEditCreate(event, row)) {
      // If pending: Wait end of validation, then loop
      if (row.validator?.pending) {
        return AppFormUtils.waitWhilePending(row.validator).then(() => this.confirmAndForward(event, row));
      }

      // Go back to first column
      this.focusColumn = this.firstUserColumn;
      this.markForCheck();

      return false;
    }

    // Find next available column to focus
    const nextRowId = row.id + 1;
    const nextRow = this.dataSource.getRow(nextRowId);
    const nextRowForm = nextRow.validator;
    const gearId = nextRowForm.get('gear')?.value?.id;
    const nextPmfmIndex = this.pmfms.findIndex((pmfm: DenormalizedPmfmStrategy) => !(isNotNil(pmfm.gearIds) && !pmfm.gearIds.includes(gearId)));
    const focusColumnIndex =
      RESERVED_START_COLUMNS.length +
      (this.showMetierColumn && !this.canEditMetier ? 1 : 0) +
      (this.showGearColumn && !this.canEditGear ? 1 : 0) +
      nextPmfmIndex;
    this.editRow(event, nextRow, {
      focusColumn: this.displayedColumns[focusColumnIndex],
    });
    return true;
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
  setValue(data: GearPhysicalFeatures[]) {
    this.gearIds = removeDuplicatesFromArray(data.map((gph) => toNumber(gph.gear?.id, gph.metier?.gear?.id)));
    if (this._initialPmfms) this.pmfms = this.mapPmfms(this._initialPmfms);
    const dataWithGear = data.map((gph) => {
      gph.gear = gph.metier.gear;
      return gph;
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

  protected async onNewEntity(data: GearPhysicalFeatures): Promise<void> {
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
