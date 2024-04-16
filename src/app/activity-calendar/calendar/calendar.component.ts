import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, Input, OnInit } from '@angular/core';
import {
  DateUtils,
  EntityUtils,
  IEntitiesService,
  InMemoryEntitiesService,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  IStatus,
  LoadResult,
  LocalSettingsService,
  MatAutocompleteFieldConfig,
  Referential,
  ReferentialRef,
  ReferentialUtils,
  sleep,
  splitById,
  StatusIds,
  toDateISOString,
  UsageMode,
} from '@sumaris-net/ngx-components';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { TableElement } from '@e-is/ngx-material-table';
import { ActivityMonth, ActivityMonthFilter } from '@app/activity-calendar/calendar/activity-month.model';
import { ActivityMonthValidatorOptions, ActivityMonthValidatorService } from '@app/activity-calendar/calendar/activity-month.validator';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { RxState } from '@rx-angular/state';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { Observable, Subscription } from 'rxjs';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AcquisitionLevelCodes, LocationLevelGroups, LocationLevelIds, TaxonGroupTypeIds } from '@app/referential/services/model/model.enum';
import { VesselOwner } from '@app/vessel/services/model/vessel-owner.model';
import { GearUseFeatures, GearUseFeaturesComparators } from '@app/activity-calendar/model/gear-use-features.model';
import { UntypedFormGroup } from '@angular/forms';
import { VesselUseFeatures, VesselUseFeaturesIsActiveEnum } from '@app/activity-calendar/model/vessel-use-features.model';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { METIER_DEFAULT_FILTER } from '@app/referential/services/metier.service';
import { BaseMeasurementsTable, BaseMeasurementsTableConfig, BaseMeasurementsTableState } from '@app/data/measurement/measurements-table.class';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { MeasurementsTableValidatorOptions } from '@app/data/measurement/measurements-table.validator';

const MAX_METIER_COUNT = 10;
const MAX_FISHING_AREA_COUNT = 2;
const DYNAMIC_COLUMNS = new Array<string>(MAX_METIER_COUNT)
  .fill(null)
  .flatMap(
    (_, index) =>
      <string[]>[
        `metier${index + 1}`,
        ...new Array<string>(MAX_FISHING_AREA_COUNT).fill(null).flatMap((_, faIndex) => <string[]>[`metier${index + 1}FishingArea${faIndex + 1}`]),
      ]
  );
const ACTIVITY_MONTH_START_COLUMNS = ['month', 'vesselOwner', 'registrationLocation', 'isActive', 'basePortLocation'];
const ACTIVITY_MONTH_END_COLUMNS = [...DYNAMIC_COLUMNS];

export const IsActiveList: Readonly<IStatus[]> = Object.freeze([
  {
    id: 1,
    icon: 'checkmark',
    label: 'ACTIVITY_CALENDAR.EDIT.IS_ACTIVE_ENUM.ENABLE',
  },
  {
    id: 0,
    icon: 'close',
    label: 'ACTIVITY_CALENDAR.EDIT.IS_ACTIVE_ENUM.DISABLE',
  },
  {
    id: 2,
    icon: 'close',
    label: 'ACTIVITY_CALENDAR.EDIT.IS_ACTIVE_ENUM.NOT_EXISTS',
  },
]);

export interface ColumnDefinition {
  blockIndex: number;
  index: number;
  label: string;
  placeholder: string;
  autocomplete: MatAutocompleteFieldConfig;
  key: string;
  path: string;
  rankOrder: number;
  class?: string;
  expanded?: boolean;
  //matIcon?: string;
  //click?: (event?: UIEvent) => void,
  treeIndent?: string;
  hidden?: boolean;
}

export interface ActivityCalendarState extends BaseMeasurementsTableState {
  metierLevelId: number;
  vesselSnapshots: VesselSnapshot[];
  vesselOwners: VesselOwner[];
  dynamicColumns: ColumnDefinition[];
  metierCount: number;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  providers: [
    {
      provide: InMemoryEntitiesService,
      useFactory: () =>
        new InMemoryEntitiesService(ActivityMonth, ActivityMonthFilter, {
          equals: EntityUtils.equals,
          sortByReplacement: { id: 'month' },
        }),
    },
    RxState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent
  extends BaseMeasurementsTable<
    ActivityMonth,
    ActivityMonthFilter,
    IEntitiesService<ActivityMonth, ActivityMonthFilter>,
    ActivityMonthValidatorService,
    ActivityCalendarState,
    BaseMeasurementsTableConfig<ActivityMonth, ActivityCalendarState>,
    ActivityMonthValidatorOptions
  >
  implements OnInit
{
  @RxStateSelect() protected vesselSnapshots$: Observable<VesselSnapshot[]>;
  @RxStateSelect() protected vesselOwners$: Observable<VesselOwner[]>;
  @RxStateSelect() protected dynamicColumns$: Observable<ColumnDefinition[]>;
  readonly isActiveList = IsActiveList;
  readonly isActiveMap = Object.freeze(splitById(IsActiveList));

  protected rowSubscription: Subscription;
  protected data: ActivityCalendar;
  protected hiddenColumns = ['select', 'id'];
  protected resizingCell: {
    validating?: boolean;
    axis?: 'x' | 'y';
    row: TableElement<ActivityMonth>;
    columnName: string;
    cellRect: { top: number; left: number; width: number; height: number };
    shadowElement: HTMLDivElement;
  };
  protected originalMouseY: number;
  protected originalMouseX: number;

  @RxStateProperty() vesselSnapshots: VesselSnapshot[];
  @RxStateProperty() vesselOwners: VesselOwner[];
  @RxStateProperty() dynamicColumns: ColumnDefinition[];
  @RxStateProperty() metierCount: number;

  @Input() locationDisplayAttributes: string[];
  @Input() basePortLocationLevelIds: number[];
  @Input() fishingAreaLocationLevelIds: number[];
  @Input() metierTaxonGroupIds: number[];
  @Input() timezone: string = DateUtils.moment().tz();
  @Input() maxMetierCount = MAX_METIER_COUNT;
  @Input() maxFishingAreaCount = MAX_FISHING_AREA_COUNT;
  @Input() usageMode: UsageMode;
  @Input() showPmfmDetails = false;

  get isOnFieldMode() {
    return this.usageMode === 'FIELD';
  }

  constructor(
    injector: Injector,
    private vesselSnapshotService: VesselSnapshotService,
    private referentialRefService: ReferentialRefService,
    private element: ElementRef
  ) {
    super(
      injector,
      ActivityMonth,
      ActivityMonthFilter,
      new InMemoryEntitiesService(ActivityMonth, ActivityMonthFilter, {
        //onSave: (data) => this.onSave(data),
        equals: ActivityMonth.equals,
        sortByReplacement: { id: 'rankOrder' },
      }),
      injector.get(LocalSettingsService).mobile ? null : injector.get(ActivityMonthValidatorService),
      {
        reservedStartColumns: ACTIVITY_MONTH_START_COLUMNS,
        reservedEndColumns: ACTIVITY_MONTH_END_COLUMNS,
        i18nColumnPrefix: 'ACTIVITY_CALENDAR.TABLE.',
        i18nPmfmPrefix: 'ACTIVITY_CALENDAR.PMFM.',
        // Cannot override mapPmfms (by options)
        //mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        onPrepareRowForm: (form) => this.onPrepareRowForm(form),
        initialState: <ActivityCalendarState>{
          requiredStrategy: true,
          acquisitionLevel: AcquisitionLevelCodes.MONTHLY_ACTIVITY,
          metierCount: 0,
        },
      }
    );
    this.inlineEdition = true;
    this.autoLoad = true;
    this.sticky = true;
    this.errorTranslatorOptions = { separator: '\n', controlPathTranslator: this };
    this.excludesColumns = [...DYNAMIC_COLUMNS];
  }

  async ngOnInit() {
    super.ngOnInit();

    this.locationDisplayAttributes = this.locationDisplayAttributes || this.settings.getFieldDisplayAttributes('location');

    await this.referentialRefService.ready();

    this.registerAutocompleteField('basePortLocation', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, { ...filter, levelIds: this.basePortLocationLevelIds || [LocationLevelIds.PORT] }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      attributes: this.locationDisplayAttributes,
      mobile: this.mobile,
    });

    this.registerAutocompleteField('metier', {
      suggestFn: (value, filter) => this.suggestMetiers(value, filter),
      mobile: this.mobile,
      displayWith: (obj) => obj?.label || '',
    });

    this.registerAutocompleteField('fishingAreaLocation', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, { ...filter, levelIds: this.fishingAreaLocationLevelIds || LocationLevelGroups.FISHING_AREA }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      //attributes: this.locationDisplayAttributes,
      attributes: ['label'],
      mobile: this.mobile,
    });

    // Listen row edition
    // if (this.inlineEdition) {
    //   this.registerSubscription(this.onStartEditingRow.subscribe((row) => this.onStartEditingMonth(row)));
    // }

    //this.markAsReady();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.rowSubscription?.unsubscribe();
  }

  async setValue(data: ActivityCalendar) {
    this.data = ActivityCalendar.fromObject(data);
    const year = data?.year || DateUtils.moment().tz(this.timezone).year() - 1;
    const vesselId = data.vesselSnapshot?.id;

    const baseDate = this.timezone ? DateUtils.moment().tz(this.timezone).year(year).startOf('year') : DateUtils.moment().year(year).startOf('year');
    let metierBlockCount = 0;
    const months = new Array(12).fill(null).map((_, month) => {
      const startDate = baseDate.clone().month(month).startOf('month');
      const endDate = startDate.clone().endOf('month');

      // DEBUG
      if (this.debug) console.debug(this.logPrefix + `month #${month} starting at ${toDateISOString(startDate)}`);

      const source = data.vesselUseFeatures?.find((vuf) => DateUtils.isSame(startDate, vuf.startDate)) || { startDate };
      const target = ActivityMonth.fromObject(source);
      target.gearUseFeatures =
        data.gearUseFeatures
          ?.filter((guf) => DateUtils.isSame(startDate, guf.startDate))
          .sort(GearUseFeaturesComparators.sortRankOrder)
          .map(GearUseFeatures.fromObject) || [];
      metierBlockCount = Math.max(metierBlockCount, target.gearUseFeatures.length);
      // if (isNotNil(target.isActive)) {
      //   switch (target.isActive) {
      //     case VesselUseFeaturesIsActiveEnum.ACTIVE: {
      //       if (isEmptyArray())
      //     }
      //     case VesselUseFeaturesIsActiveEnum.INACTIVE:
      //     case VesselUseFeaturesIsActiveEnum.NOT_EXISTS: {
      //
      //     }
      //   }
      //
      // })
      target.vesselId = vesselId;
      target.endDate = endDate;
      target.month = month + 1;
      return target;
    });

    // DEBUG
    console.debug(this.logPrefix + 'Metier block count=' + metierBlockCount);

    while (this.metierCount < metierBlockCount) {
      this.addMetierBlock();
    }

    this.memoryDataService.value = months;

    // Load vessels
    if (isNotNil(vesselId)) {
      await this.loadVessels(vesselId, year);
    }
  }

  async getValue() {
    const data = this.data?.clone() || ActivityCalendar.fromObject({});

    const months = this.memoryDataService.value;
    data.vesselUseFeatures = months.filter((month) => isNotNil(month.isActive)).map((month) => VesselUseFeatures.fromObject(month.asObject()));
    data.gearUseFeatures = months
      .filter((month) => month.isActive === VesselUseFeaturesIsActiveEnum.ACTIVE && isNotEmptyArray(month.gearUseFeatures))
      .reduce((res, month) => res.concat(...month.gearUseFeatures), []);

    return data;
  }

  async loadVessels(vesselId: number, year: number) {
    const now = this.timezone ? DateUtils.moment().tz(this.timezone) : DateUtils.moment();
    this.vesselSnapshots = await Promise.all(
      new Array(12).fill(null).map(async (_, month) => {
        const date = now.clone().utc(false).year(year).month(month).startOf('month');

        // DEBUG
        if (this.debug) console.debug(this.logPrefix + `Loading vessel for month #${month} using date ${toDateISOString(date)}`);

        const { data } = await this.vesselSnapshotService.loadAll(
          0,
          1,
          null,
          null,
          {
            vesselId,
            date,
            onlyWithRegistration: true,
          },
          { withTotal: false }
        );
        return data?.[0] || null;
      })
    );
  }

  onMouseDown(event: MouseEvent, cellElement: HTMLTableCellElement, row: TableElement<any>, columnName: string, axis?: 'x' | 'y') {
    if (!cellElement) throw new Error('Missing rectangle element');
    if (this.resizingCell) return; // Skip if already resizing

    event.preventDefault();
    event.stopPropagation();

    const parentRect = this.element.nativeElement.getBoundingClientRect();
    const rect = cellElement.getBoundingClientRect();
    const cellRect = {
      top: rect.y,
      left: rect.x - parentRect.left,
      width: rect.width,
      height: rect.height,
    };
    this.originalMouseX = event.clientX;
    this.originalMouseY = event.clientY;
    const shadowElement = document.createElement('div');
    shadowElement.style.position = 'fixed';
    shadowElement.style.zIndex = '9999';
    shadowElement.style.backgroundColor = 'rgba(var(--ion-color-secondary-rgb), 0.4)';
    shadowElement.style.top = cellRect.top + 'px';
    shadowElement.style.left = cellRect.left + 'px';
    shadowElement.style.width = cellRect.width + 'px';
    shadowElement.style.height = cellRect.height + 'px';
    cellElement.prepend(shadowElement);
    this.resizingCell = { shadowElement, row, columnName, cellRect, axis };
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const shadowElement = this.resizingCell?.shadowElement;
    if (!shadowElement) return;

    // Ignore if waiting validation
    if (this.resizingCell.validating) return;

    const axis = this.resizingCell.axis;
    const movementX = axis !== 'y' ? event.clientX - this.originalMouseX : 0;
    const movementY = axis !== 'x' ? event.clientY - this.originalMouseY : 0;
    const originalRect = this.resizingCell.cellRect;
    const newWidth = originalRect.width + Math.abs(movementX);
    const snapWidth = Math.max(originalRect.width, Math.round(newWidth / originalRect.width) * originalRect.width);
    const newHeight = originalRect.height + Math.abs(movementY);
    const snapHeight = Math.max(originalRect.height, Math.round(newHeight / originalRect.height) * originalRect.height);
    let left = originalRect.left;
    let top = originalRect.top;
    if (movementX < 0) {
      left = originalRect.left + originalRect.width - snapWidth;
    }
    if (movementY < 0) {
      top = originalRect.top + originalRect.height - snapHeight;
    }

    // Resize the shadow element
    shadowElement.style.left = left + 'px';
    shadowElement.style.width = snapWidth + 'px';
    shadowElement.style.top = top + 'px';
    shadowElement.style.height = snapHeight + 'px';
  }

  @HostListener('document:mouseup', ['$event'])
  async onMouseUp(event: MouseEvent) {
    const shadowElement = this.resizingCell?.shadowElement;
    const originalRect = this.resizingCell?.cellRect;
    if (shadowElement && originalRect) {
      event.preventDefault();
      event.stopPropagation();
      if (this.resizingCell.validating) return; // Waiting validation end
      this.resizingCell.validating = true;
      const movementX = this.resizingCell.axis !== 'y' ? event.clientX - this.originalMouseX : 0;
      const movementY = this.resizingCell.axis !== 'x' ? event.clientY - this.originalMouseY : 0;
      const actualRect = shadowElement.getBoundingClientRect();
      const colspan = (actualRect.width / originalRect.width) * (movementX >= 0 ? 1 : -1);
      const rowspan = (actualRect.height / originalRect.height) * (movementY >= 0 ? 1 : -1);
      if (colspan !== 1 || rowspan !== 1) {
        const event = { colspan, rowspan, columnName: this.resizingCell.columnName, row: this.resizingCell.row };
        try {
          const validate = await this.validate(event);
          if (validate) {
            console.debug(`Applying colspan=${colspan} rowspan=${rowspan}`);
            this.onMouseEnd(event);
          }
        } catch (err) {
          console.error(err);
        }
      }
      shadowElement.remove();
    }
    this.resizingCell = null;
    this.originalMouseY = null;
    this.originalMouseX = null;
  }

  protected async validate(event: { colspan: number; rowspan: number }): Promise<boolean> {
    // TODO display merge menu
    await sleep(500);
    return true;
  }

  protected onMouseEnd(event: { colspan: number; rowspan: number }) {
    const columnName = this.resizingCell.columnName;
    switch (columnName) {
      case 'basePortLocation':
      case 'isActive': {
        if (event.colspan > 0 && event.rowspan === 1) {
          this.confirmEditCreate();
          const sourceRow = this.resizingCell.row;
          const sourceValue = sourceRow.currentData[columnName];
          const minRowId = sourceRow.id + 1;
          const maxRowId = sourceRow.id + (event.colspan - 1);

          const targetRows = this.dataSource.getRows().filter((row) => row.id >= minRowId && row.id <= maxRowId);

          // DEBUG
          if (this.debug) console.debug(this.logPrefix + `Copying ${columnName} to ${targetRows.length} months ...`, targetRows);

          targetRows.forEach((targetRow) => {
            if (targetRow.validator) {
              targetRow.validator.patchValue({ [columnName]: sourceValue });
              targetRow.validator.markAsDirty();
            }
          });
          this.markForCheck();
        }
      }
    }
    return true;
  }

  clickRow(event: Event | undefined, row: TableElement<ActivityMonth>): boolean {
    if (this.resizingCell || event.defaultPrevented) return; // Skip

    return super.clickRow(event, row);
  }

  cancelOrDelete(event: Event, row: TableElement<ActivityMonth>, opts?: { interactive?: boolean; keepEditing?: boolean }) {
    event?.preventDefault();
    super.cancelOrDelete(event, row, { ...opts, keepEditing: false });

    // Update view
    if (!row.editing) this.markForCheck();
  }

  addMetierBlock(event?: UIEvent, opts?: { emitEvent?: boolean }) {
    // Skip if reach max
    if (this.metierCount >= this.maxMetierCount) {
      console.warn(this.logPrefix + 'Unable to add metier: max=' + this.maxMetierCount);
      return;
    }

    console.debug(this.logPrefix + 'Adding new metier block...');
    const index = this.metierCount;
    const newMetierCount = index + 1;
    const newFishingAreaCount = this.maxFishingAreaCount || 2;
    const rankOrder = newMetierCount;
    const pathPrefix = `gearUseFeatures.${index}.`;
    const blockColumns: ColumnDefinition[] = [
      {
        blockIndex: index,
        index,
        rankOrder,
        label: this.translate.instant('ACTIVITY_CALENDAR.EDIT.METIER_RANKED', { rankOrder }),
        placeholder: this.translate.instant('ACTIVITY_CALENDAR.EDIT.METIER'),
        autocomplete: this.autocompleteFields.metier,
        path: `${pathPrefix}metier`,
        key: `metier${rankOrder}`,
        class: 'mat-column-metier',
        expanded: true,
      },
      ...new Array(newFishingAreaCount).fill(null).map((_, faIndex) => {
        const faRankOrder = faIndex + 1;
        return {
          blockIndex: index,
          index: faIndex,
          rankOrder: faRankOrder,
          label: this.translate.instant('ACTIVITY_CALENDAR.EDIT.FISHING_AREA_RANKED', { rankOrder: faRankOrder }),
          placeholder: this.translate.instant('ACTIVITY_CALENDAR.EDIT.FISHING_AREA'),
          autocomplete: this.autocompleteFields.fishingAreaLocation,
          path: `${pathPrefix}fishingAreas.${faIndex}.location`,
          key: `metier${rankOrder}FishingArea${faRankOrder}`,
          treeIndent: '&nbsp;&nbsp;',
        };
      }),
    ];

    this.dataSource.getRows().forEach((row) => this.onPrepareRowForm(row.validator));

    this.focusColumn = blockColumns[0].key;
    this.dynamicColumns = this.dynamicColumns ? [...this.dynamicColumns, ...blockColumns] : blockColumns;
    const dynamicColumnKeys = this.dynamicColumns.map((col) => col.key);
    this.excludesColumns = this.excludesColumns.filter((columnName) => !dynamicColumnKeys.includes(columnName));
    this.metierCount = newMetierCount;

    if (opts?.emitEvent !== false) {
      this.updateColumns();
    }
  }

  protected expandAll(event?: UIEvent, opts?: { emitEvent?: boolean }) {
    for (let i = 0; i < this.metierCount; i++) {
      this.expandBlock(null, i);
    }
  }

  protected collapseAll(event?: UIEvent, opts?: { emitEvent?: boolean }) {
    for (let i = 0; i < this.metierCount; i++) {
      this.collapseBlock(null, i);
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

  protected onPrepareRowForm(
    form: UntypedFormGroup,
    opts?: {
      pmfms?: IPmfm[];
      markForCheck?: () => void;
    }
  ) {
    if (!form) return;

    this.rowSubscription?.unsubscribe();

    const isActiveControl = form.get('isActive');
    this.rowSubscription = isActiveControl.valueChanges.subscribe(() => {
      this.updateRowForm(form, { ...opts, markForCheck: () => this.markForCheck() });
    });

    this.updateRowForm(form, opts);
  }
  protected configureValidator(opts: MeasurementsTableValidatorOptions) {
    super.configureValidator(opts);

    this.validatorService.delegateOptions = {
      maxMetierCount: this.maxMetierCount,
      maxFishingAreaCount: this.maxFishingAreaCount,
    };
  }

  protected updateRowForm(
    form: UntypedFormGroup,
    opts?: ActivityMonthValidatorOptions & {
      markForCheck?: () => void;
    }
  ) {
    const isActive = form.get('isActive').value;

    console.debug(this.logPrefix + 'Preparing row form... isActive=' + isActive, form);

    opts = {
      withMetier: isActive !== VesselUseFeaturesIsActiveEnum.INACTIVE && isActive !== VesselUseFeaturesIsActiveEnum.NOT_EXISTS,
      withFishingAreas: isActive !== VesselUseFeaturesIsActiveEnum.INACTIVE && isActive !== VesselUseFeaturesIsActiveEnum.NOT_EXISTS,
      metierCount: this.metierCount,
      fishingAreaCount: 1, //this.maxFishingAreaCount,
      isOnFieldMode: this.isOnFieldMode,
      ...opts,
    };
    this.validatorService.updateFormGroup(form, opts);

    if (opts?.markForCheck) opts.markForCheck();
  }

  toggleBlock(event: UIEvent, blockIndex: number) {
    if (event?.defaultPrevented) return; // Skip^
    event?.preventDefault();

    const blockColumns = this.dynamicColumns.filter((col) => col.blockIndex === blockIndex);
    if (isEmptyArray(blockColumns)) return; // Skip

    const masterColumn = blockColumns[0];
    if (isNil(masterColumn.expanded)) return; // Skip is not an expandable column

    console.debug(this.logPrefix + 'Toggling block #' + blockIndex);

    // Toggle expanded
    masterColumn.expanded = !masterColumn.expanded;

    // Show/Hide sub columns
    blockColumns.slice(1).forEach((col) => (col.hidden = !masterColumn.expanded));
  }

  expandBlock(event: UIEvent, blockIndex: number) {
    if (event?.defaultPrevented) return; // Skip^
    event?.preventDefault();

    this.setBlockExpanded(blockIndex, true);
  }

  collapseBlock(event: UIEvent, blockIndex: number) {
    if (event?.defaultPrevented) return; // Skip^
    event?.preventDefault();

    this.setBlockExpanded(blockIndex, false);
  }

  protected setBlockExpanded(blockIndex: number, expanded: boolean) {
    const blockColumns = this.dynamicColumns.filter((col) => col.blockIndex === blockIndex);
    if (isEmptyArray(blockColumns)) return;

    const masterColumn = blockColumns[0];
    if (isNil(masterColumn.expanded)) return; // Skip is not an expandable column

    masterColumn.expanded = expanded;

    // Update sub columns
    blockColumns.slice(1).forEach((col) => (col.hidden = !masterColumn.expanded));
  }

  protected setFocusColumn(key: string) {
    this.focusColumn = key;
  }
}
