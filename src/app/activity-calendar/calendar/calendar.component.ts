import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, Input, OnInit } from '@angular/core';
import {
  AppFormArray,
  DateUtils,
  EntityUtils,
  IEntitiesService,
  InMemoryEntitiesService,
  isNotEmptyArray,
  isNotNil,
  IStatus,
  MatAutocompleteFieldConfig,
  sleep,
  splitById,
  StatusIds,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { AppBaseTable, BaseTableState } from '@app/shared/table/base.table';
import { TableElement } from '@e-is/ngx-material-table';
import { ActivityMonth, ActivityMonthFilter } from '@app/activity-calendar/calendar/activity-month.model';
import { ActivityMonthValidatorService } from '@app/activity-calendar/calendar/activity-month.validator';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { RxState } from '@rx-angular/state';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { Observable } from 'rxjs';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { LocationLevelGroups, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { VesselOwner } from '@app/vessel/services/model/vessel-owner.model';
import { GearUseFeatures, GearUseFeaturesComparators } from '@app/activity-calendar/model/gear-use-features.model';
import { UntypedFormGroup } from '@angular/forms';
import { VesselUseFeatures, VesselUseFeaturesIsActiveEnum } from '@app/activity-calendar/model/vessel-use-features.model';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';

const DYNAMIC_COLUMNS = [
  'metier1',
  'metier1FishingArea1',
  'metier1FishingArea2',
  'metier2',
  'metier2FishingArea1',
  'metier2FishingArea2',
  'metier3',
  'metier3FishingArea1',
  'metier3FishingArea2',
];
const BASE_COLUMNS = ['month', 'vesselOwner', 'registrationLocation', 'isActive', 'basePortLocation', ...DYNAMIC_COLUMNS];

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
  index: number;
  label: string;
  placeholder: string;
  autocomplete: MatAutocompleteFieldConfig;
  key: string;
  path: string;
  rankOrder: number;
}

export interface ActivityCalendarState extends BaseTableState {
  vesselSnapshots: VesselSnapshot[];
  vesselOwners: VesselOwner[];
  dynamicColumns: ColumnDefinition[];
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
  extends AppBaseTable<
    ActivityMonth,
    ActivityMonthFilter,
    IEntitiesService<ActivityMonth, ActivityMonthFilter>,
    ActivityMonthValidatorService,
    number,
    ActivityCalendarState
  >
  implements OnInit
{
  @RxStateSelect() protected vesselSnapshots$: Observable<VesselSnapshot[]>;
  @RxStateSelect() protected vesselOwners$: Observable<VesselOwner[]>;
  @RxStateSelect() protected dynamicColumns$: Observable<ColumnDefinition[]>;
  readonly isActiveList = IsActiveList;
  readonly isActiveMap = Object.freeze(splitById(IsActiveList));

  data: ActivityCalendar;
  hiddenColumns = ['select', 'id'];
  resizingCell: {
    validating?: boolean;
    axis?: 'x' | 'y';
    row: TableElement<ActivityMonth>;
    columnName: string;
    cellRect: { top: number; left: number; width: number; height: number };
    shadowElement: HTMLDivElement;
  };
  originalMouseY: number;
  originalMouseX: number;

  @RxStateProperty() vesselSnapshots: VesselSnapshot[];
  @RxStateProperty() vesselOwners: VesselOwner[];
  @RxStateProperty() dynamicColumns: ColumnDefinition[];
  @RxStateProperty() @Input() locationDisplayAttributes: string[];
  @RxStateProperty() @Input() basePortLocationLevelIds: number[];
  @RxStateProperty() @Input() fishingAreaLocationLevelIds: number[];

  @Input() timezone: string = DateUtils.moment().tz();
  @Input() maxMetierCount = 3;
  @Input() maxFishingAreaCount = 2;

  get metierCount() {
    return (this.dynamicColumns?.length || 0) / 3;
  }

  constructor(
    injector: Injector,
    validatorService: ActivityMonthValidatorService,
    private vesselSnapshotService: VesselSnapshotService,
    private referentialRefService: ReferentialRefService,
    private element: ElementRef
  ) {
    super(injector, ActivityMonth, ActivityMonthFilter, BASE_COLUMNS, injector.get(InMemoryEntitiesService), validatorService);
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
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
      filter: {
        entityName: 'Metier',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      mobile: this.mobile,
    });

    this.registerAutocompleteField('fishingAreaLocation', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, { ...filter, levelIds: this.fishingAreaLocationLevelIds || LocationLevelGroups.FISHING_AREA }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      attributes: this.locationDisplayAttributes,
      mobile: this.mobile,
    });

    this.markAsReady();
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
    data.vesselUseFeatures = months.filter((month) => isNotNil(month.isActive)).map((month) => VesselUseFeatures.fromObject(month));
    data.gearUseFeatures = months
      .filter((month) => month.isActive === VesselUseFeaturesIsActiveEnum.ACTIVE && isNotEmptyArray(month.gearUseFeatures))
      .reduce((res, month) => res.concat(...month.gearUseFeatures.map(VesselUseFeatures.fromObject)), []);

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

  addMetierBlock(event?: UIEvent) {
    // Skip if reach max
    if (this.metierCount >= this.maxMetierCount) {
      console.warn(this.logPrefix + 'Unable to add metier: max=' + this.maxMetierCount);
      return;
    }

    console.debug(this.logPrefix + 'Adding new metier block...');
    const newBlockCount = this.metierCount + 1;
    const index = newBlockCount - 1;
    const rankOrder = newBlockCount;
    const newColumns: ColumnDefinition[] = [
      {
        index,
        rankOrder,
        label: this.translate.instant('ACTIVITY_CALENDAR.EDIT.METIER_RANKED', { rankOrder }),
        placeholder: this.translate.instant('ACTIVITY_CALENDAR.EDIT.METIER'),
        autocomplete: this.autocompleteFields.metier,
        path: `gearUseFeatures.${index}.metier`,
        key: `metier${rankOrder}`,
      },
      {
        index: 0,
        rankOrder: 1,
        label: this.translate.instant('ACTIVITY_CALENDAR.EDIT.FISHING_AREA_RANKED', { rankOrder: 1 }),
        placeholder: this.translate.instant('ACTIVITY_CALENDAR.EDIT.FISHING_AREA'),
        autocomplete: this.autocompleteFields.fishingAreaLocation,
        path: `gearUseFeatures.${index}.fishingAreas.0.location`,
        key: `metier${rankOrder}FishingArea1`,
      },
      {
        index: 1,
        rankOrder: 2,
        label: this.translate.instant('ACTIVITY_CALENDAR.EDIT.FISHING_AREA_RANKED', { rankOrder: 2 }),
        placeholder: this.translate.instant('ACTIVITY_CALENDAR.EDIT.FISHING_AREA'),
        autocomplete: this.autocompleteFields.fishingAreaLocation,
        path: `gearUseFeatures.${index}.fishingAreas.1.location`,
        key: `metier${rankOrder}FishingArea2`,
      },
    ];

    const rows = this.dataSource.getRows();
    rows.forEach((row) => {
      const startDate = row.validator.get('startDate').value;
      const endDate = row.validator.get('endDate').value;
      let gufArray = row.validator.get('gearUseFeatures') as AppFormArray<GearUseFeatures, UntypedFormGroup>;
      if (!gufArray) {
        gufArray = this.validatorService.getGearUseFeaturesArray();
        row.validator.addControl('gearUseFeatures', gufArray);
      }
      gufArray.resize(newBlockCount);

      gufArray.forEach((guf) => {
        const faArray = guf.get('fishingAreas') as AppFormArray<FishingArea, UntypedFormGroup>;
        if (!faArray.length) faArray.resize(1);
      });

      // Update start/end date
      gufArray.forEach((gufForm) => gufForm.patchValue({ startDate, endDate }));
    });

    this.focusColumn = newColumns[0].key;
    this.dynamicColumns = this.dynamicColumns ? [...this.dynamicColumns, ...newColumns] : newColumns;
    const dynamicColumnKeys = this.dynamicColumns.map((col) => col.key);
    this.excludesColumns = this.excludesColumns.filter((columnName) => !dynamicColumnKeys.includes(columnName));
    this.updateColumns();
  }
}
