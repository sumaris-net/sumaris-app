import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  Injector,
  Input,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  Alerts,
  AppFormArray,
  changeCaseToUnderscore,
  DateUtils,
  EntityUtils,
  getPropertyByPath,
  IEntitiesService,
  InMemoryEntitiesService,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  IStatus,
  lastArrayValue,
  LoadResult,
  LocalSettingsService,
  MatAutocompleteFieldConfig,
  ReferentialRef,
  ReferentialUtils,
  removeDuplicatesFromArray,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  setPropertyByPath,
  sleep,
  splitById,
  StatusIds,
  Toasts,
  toBoolean,
  toNumber,
  UsageMode,
  waitFor,
  WaitForOptions,
} from '@sumaris-net/ngx-components';
import { ActivityMonth, ActivityMonthFilter } from '@app/activity-calendar/calendar/activity-month.model';
import {
  ActivityMonthValidatorOptions,
  ActivityMonthValidators,
  ActivityMonthValidatorService,
} from '@app/activity-calendar/calendar/activity-month.validator';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { fromEvent, Observable, Subscription, tap } from 'rxjs';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AcquisitionLevelCodes, LocationLevelGroups, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { UntypedFormGroup } from '@angular/forms';
import { VesselUseFeaturesIsActiveEnum } from '@app/activity-calendar/model/vessel-use-features.model';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { METIER_DEFAULT_FILTER } from '@app/referential/services/metier.service';
import { BaseMeasurementsTableConfig, BaseMeasurementsTableState } from '@app/data/measurement/measurements-table.class';
import { MeasurementsTableValidatorOptions } from '@app/data/measurement/measurements-table.validator';
import { CalendarUtils } from '@app/activity-calendar/calendar/calendar.utils';
import { Moment } from 'moment/moment';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { PMFM_ID_REGEXP } from '@app/referential/services/model/pmfm.model';
import { debounceTime, filter, map } from 'rxjs/operators';
import { Metier } from '@app/referential/metier/metier.model';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { ActivityCalendarContextService } from '../activity-calendar-context.service';
import { MatMenuTrigger } from '@angular/material/menu';
import { BaseMeasurementsTable2 } from '@app/data/measurement/measurements-table2.class';
import { AsyncTableElement } from '@e-is/ngx-material-table';
import { VesselOwnerPeridodService } from '@app/vessel/services/vessel-owner-period.service';
import { VesselOwnerPeriodFilter } from '@app/vessel/services/filter/vessel.filter';
import { IUseFeaturesUtils } from '@app/activity-calendar/model/use-features.model';
import { VesselOwner } from '@app/vessel/services/model/vessel-owner.model';
import { VesselRegistrationPeriodService } from '@app/vessel/services/vessel-registration-period.service';

const DEFAULT_METIER_COUNT = 2;
const MAX_METIER_COUNT = 10;
const MAX_FISHING_AREA_COUNT = 2;
const DYNAMIC_COLUMNS = new Array<string>(MAX_METIER_COUNT)
  .fill(null)
  .flatMap(
    (_, index) =>
      <string[]>[
        `metier${index + 1}`,
        ...new Array<string>(MAX_FISHING_AREA_COUNT)
          .fill(null)
          .flatMap(
            (_, faIndex) =>
              <string[]>[
                `metier${index + 1}FishingArea${faIndex + 1}`,
                `metier${index + 1}FishingArea${faIndex + 1}distanceToCoastGradient`,
                `metier${index + 1}FishingArea${faIndex + 1}depthGradient`,
                `metier${index + 1}FishingArea${faIndex + 1}nearbySpecificArea`,
              ]
          ),
      ]
  );
export const ACTIVITY_MONTH_READONLY_COLUMNS = ['month', 'vesselOwner', 'registrationLocation'];
export const ACTIVITY_MONTH_START_COLUMNS = [...ACTIVITY_MONTH_READONLY_COLUMNS, 'isActive', 'basePortLocation'];
export const ACTIVITY_MONTH_END_COLUMNS = [...DYNAMIC_COLUMNS];

export const IsActiveList: Readonly<IStatus[]> = Object.freeze([
  {
    id: VesselUseFeaturesIsActiveEnum.ACTIVE,
    icon: 'checkmark',
    label: 'ACTIVITY_CALENDAR.EDIT.IS_ACTIVE_ENUM.ENABLE',
  },
  {
    id: VesselUseFeaturesIsActiveEnum.INACTIVE,
    icon: 'close',
    label: 'ACTIVITY_CALENDAR.EDIT.IS_ACTIVE_ENUM.DISABLE',
  },
  {
    id: VesselUseFeaturesIsActiveEnum.NOT_EXISTS,
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
  toggle?: (event?: Event) => void;
  expand?: (event?: Event) => void;
}

export interface CalendarComponentState extends BaseMeasurementsTableState {
  metierLevelId: number;
  vesselRegistrations: ReferentialRef[][];
  vesselOwners: VesselOwner[][];
  dynamicColumns: ColumnDefinition[];
  metierCount: number;
  validRowCount: number;
  hasClipboard: boolean;
}

export type CalendarComponentStyle = 'table' | 'accordion';

export interface TableCellSelection<T = any> {
  row: AsyncTableElement<T>;
  columnName: string;
  rowspan: number;
  colspan: number;

  cellElement: HTMLElement;
  divElement: HTMLDivElement;

  axis?: 'x' | 'y';
  cellRect?: { top: number; left: number; width: number; height: number };
  originalMouseX?: number;
  originalMouseY?: number;
  validating?: boolean;
  resizing?: boolean;
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
  extends BaseMeasurementsTable2<
    ActivityMonth,
    ActivityMonthFilter,
    IEntitiesService<ActivityMonth, ActivityMonthFilter>,
    ActivityMonthValidatorService,
    CalendarComponentState,
    BaseMeasurementsTableConfig<ActivityMonth, CalendarComponentState>,
    ActivityMonthValidatorOptions
  >
  implements OnInit, AfterViewInit
{
  protected vesselRegistrationPeriodService = inject(VesselRegistrationPeriodService);
  protected referentialRefService = inject(ReferentialRefService);

  @RxStateSelect() protected vesselRegistrations$: Observable<ReferentialRef[][]>;
  @RxStateSelect() protected vesselOwners$: Observable<VesselOwner[][]>;
  @RxStateSelect() protected dynamicColumns$: Observable<ColumnDefinition[]>;
  @RxStateSelect() protected months$: Observable<Moment[]>;
  @RxStateSelect() validRowCount$: Observable<number>;
  @RxStateSelect() hasClipboard$: Observable<boolean>;
  protected readonly isActiveList = IsActiveList;
  protected readonly isActiveMap = Object.freeze(splitById(IsActiveList));
  protected readonly hiddenColumns = RESERVED_START_COLUMNS;

  protected rowSubscription: Subscription;
  protected cellSelection: TableCellSelection<ActivityMonth>;
  protected cellClipboard: TableCellSelection<ActivityMonth>;
  protected _children: CalendarComponent[];
  protected showDebugValue = false;
  protected editedRowFocusedElement: HTMLElement;

  @RxStateProperty() vesselRegistrations: ReferentialRef[][];
  @RxStateProperty() vesselOwners: VesselOwner[][];
  @RxStateProperty() dynamicColumns: ColumnDefinition[];
  @RxStateProperty() metierCount: number;
  @RxStateProperty() validRowCount: number;
  @RxStateProperty() hasClipboard: boolean;

  @Input() @RxStateProperty() months: Moment[];

  @Input() title: string = null;
  @Input() locationDisplayAttributes: string[];
  @Input() basePortLocationLevelIds: number[];
  @Input() fishingAreaLocationLevelIds: number[];
  @Input() vesselOwnerDisplayAttributes: string[];
  @Input() metierTaxonGroupIds: number[];
  @Input() timezone: string = DateUtils.moment().tz();
  @Input() maxMetierCount = MAX_METIER_COUNT;
  @Input() maxFishingAreaCount = MAX_FISHING_AREA_COUNT;
  @Input() usageMode: UsageMode;
  @Input() showToolbarOptions = true;
  @Input() showPmfmDetails = false;
  @Input() style: CalendarComponentStyle = 'table';
  @Input() enableCellSelection: boolean;

  @Input() set month(value: number) {
    this.filter = ActivityMonthFilter.fromObject({ month: value });
  }
  get month(): number {
    return this.filter?.month;
  }

  @Input() set showVesselOwner(value: boolean) {
    this.setShowColumn('vesselOwner', value);
  }
  get showVesselOwner(): boolean {
    return this.getShowColumn('vesselOwner');
  }

  @Input() set showRegistrationLocation(value: boolean) {
    this.setShowColumn('registrationLocation', value);
  }
  get showRegistrationLocation(): boolean {
    return this.getShowColumn('registrationLocation');
  }
  @Input() set showMonth(value: boolean) {
    this.setShowColumn('month', value);
  }
  get showMonth(): boolean {
    return this.getShowColumn('month');
  }

  get isOnFieldMode() {
    return this.usageMode === 'FIELD';
  }

  get dirty(): boolean {
    return this.dirtySubject.value || (this._children && this._children.findIndex((c) => c.enabled && c.dirty) !== -1) || false;
  }

  /**
   * Is valid (tables and forms)
   */
  get valid(): boolean {
    // Important: Should be not invalid AND not pending, so use '!valid' (DO NOT use 'invalid')
    return !this._children || this._children.findIndex((c) => c.enabled && !c.valid) === -1;
  }

  get invalid(): boolean {
    return (this._children && this._children.findIndex((c) => c.enabled && c.invalid) !== -1) || false;
  }

  get pending(): boolean {
    return (this._children && this._children.findIndex((c) => c.enabled && c.pending) !== -1) || false;
  }

  get loading(): boolean {
    return this.loadingSubject.value || (this._children && this._children.findIndex((c) => c.enabled && c.loading) !== -1) || false;
  }

  get loaded(): boolean {
    return (!this.loadingSubject.value && (!this._children || this._children.findIndex((c) => c.enabled && c.loading) === -1)) || false;
  }

  get touched(): boolean {
    return this.touchedSubject.value || (this._children && this._children.findIndex((c) => c.enabled && c.touched) !== -1) || false;
  }

  get untouched(): boolean {
    return (!this.touchedSubject.value && (!this._children || this._children.findIndex((c) => c.enabled && c.touched) === -1)) || false;
  }

  set value(data: ActivityMonth[]) {
    this.setValue(data);
  }

  get value(): ActivityMonth[] {
    return this.getValue();
  }

  @ViewChildren('monthCalendar', { read: CalendarComponent }) monthCalendars!: QueryList<CalendarComponent>;
  @ViewChild('menuTrigger') menuTrigger: MatMenuTrigger;
  @ViewChild('cellSelectionDiv', { read: ElementRef }) cellSelectionDivRef: ElementRef;
  @ViewChild('cellClipboardDiv', { read: ElementRef }) cellClipboardDivRef: ElementRef;

  constructor(
    injector: Injector,
    protected context: ActivityCalendarContextService,
    private vesselOwnerPeriodService: VesselOwnerPeridodService
  ) {
    super(
      injector,
      ActivityMonth,
      ActivityMonthFilter,
      injector.get(InMemoryEntitiesService) ||
        new InMemoryEntitiesService(ActivityMonth, ActivityMonthFilter, {
          //onSave: (data) => this.onSave(data),
          equals: ActivityMonth.equals,
          sortByReplacement: { id: 'rankOrder' },
        }),
      injector.get(LocalSettingsService).mobile ? null : injector.get(ActivityMonthValidatorService),
      {
        reservedStartColumns: ACTIVITY_MONTH_START_COLUMNS,
        reservedEndColumns: ACTIVITY_MONTH_END_COLUMNS,
        i18nColumnPrefix: 'ACTIVITY_CALENDAR.EDIT.',
        i18nPmfmPrefix: 'ACTIVITY_CALENDAR.PMFM.',
        // Cannot override mapPmfms (by options)
        //mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        onPrepareRowForm: (form) => this.onPrepareRowForm(form),
        initialState: <CalendarComponentState>{
          requiredStrategy: true,
          requiredGear: false,
          acquisitionLevel: AcquisitionLevelCodes.MONTHLY_ACTIVITY,
          metierCount: 0,
        },
      }
    );
    this.confirmBeforeCancel = false;
    this.inlineEdition = true;
    this.autoLoad = true;
    this.sticky = true;
    this.compact = null;
    this.errorTranslatorOptions = { separator: '\n', controlPathTranslator: this };
    this.excludesColumns = [...DYNAMIC_COLUMNS];
    this.toolbarColor = 'medium';
    this.logPrefix = '[activity-calendar] ';
    this.loadingSubject.next(true);
  }

  async ngOnInit() {
    super.ngOnInit();

    this.locationDisplayAttributes = this.locationDisplayAttributes || this.settings.getFieldDisplayAttributes('location');
    this.vesselOwnerDisplayAttributes =
      this.vesselOwnerDisplayAttributes || this.settings.getFieldDisplayAttributes('vesselOwner', ['lastName', 'firstName']);
    this.inlineEdition = this.inlineEdition && this.canEdit;
    this.enableCellSelection = toBoolean(this.enableCellSelection, this.inlineEdition && this.style === 'table' && this.canEdit);

    // Wait enumerations to be set
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
      displayWith: (obj) => obj?.label || '',
      mobile: this.mobile,
    });

    this.registerAutocompleteField('fishingAreaLocation', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, { ...filter, levelIds: this.fishingAreaLocationLevelIds || LocationLevelGroups.FISHING_AREA }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      attributes: ['label'],
      mobile: this.mobile,
    });
    this.registerAutocompleteField('distanceToCoastGradient', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, { ...filter, levelIds: this.fishingAreaLocationLevelIds || LocationLevelGroups.FISHING_AREA }),
      filter: {
        entityName: 'DistanceToCoastGradient',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      attributes: ['label', 'name'],
      mobile: this.mobile,
    });
    this.registerAutocompleteField('depthGradient', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, { ...filter, levelIds: this.fishingAreaLocationLevelIds || LocationLevelGroups.FISHING_AREA }),
      filter: {
        entityName: 'DepthGradient',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      attributes: ['label', 'name'],
      mobile: this.mobile,
    });
    this.registerAutocompleteField('nearbySpecificArea', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, { ...filter, levelIds: this.fishingAreaLocationLevelIds || LocationLevelGroups.FISHING_AREA }),
      filter: {
        entityName: 'NearbySpecificArea',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      attributes: ['label', 'name'],
      mobile: this.mobile,
    });

    this._state.connect(
      'validRowCount',
      this._dataSource.rowsSubject.pipe(
        map((rows) => {
          return rows.map((row) => row.currentData?.isActive).filter(isNotNil).length;
        })
      )
    );

    // Reset cell clipboard, when clipboard cleared or updated
    this.registerSubscription(
      this.context
        .select('clipboard')
        .pipe(
          tap((clipboard) => (this.hasClipboard = isNotEmptyArray(clipboard?.data?.months))),
          filter((clipboard) => isNotEmptyArray(clipboard?.data?.months) && clipboard.source !== this)
        )
        .subscribe(() => this.clearClipboard(null, { clearContext: false }))
    );
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
  }

  initTableContainer(element: any) {
    if (this.style === 'accordion') return; // Skip

    super.initTableContainer(element, { defaultShortcuts: false });

    // Add shortcuts
    if (!this.mobile) {
      console.debug(this.logPrefix + 'Add table shortcuts');

      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'control.c', description: 'COMMON.BTN_COPY', preventDefault: false /*keep copy in <input>*/ })
          .pipe(filter(() => this.loaded && !!this.cellSelection))
          .subscribe((event) => this.copy(event))
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'control.v', description: 'COMMON.BTN_PASTE', preventDefault: false /*keep past in <input>*/ })
          .pipe(filter(() => !this.disabled && this.canEdit))
          .subscribe((event) => this.pasteFromClipboard(event))
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'escape', description: 'COMMON.BTN_CLEAR_CLIPBOARD', preventDefault: true })
          .pipe(filter((e) => !!this.cellClipboard))
          .subscribe((event) => this.clearClipboard(event))
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'delete', description: 'COMMON.BTN_CLEAR_SELECTION', preventDefault: false /*keep delete in <input>*/ })
          .subscribe((event) => this.clearCellSelection(event))
      );

      this.registerSubscription(fromEvent(element, 'scroll').subscribe(() => this.onResize()));
    }
  }

  markAsReady(opts?: { emitEvent?: boolean }) {
    if (this.style === 'accordion') {
      // Set months
      this.months = this.months || CalendarUtils.getMonths(DateUtils.moment().year(), this.timezone);

      this.waitForChildren().then(() => {
        this._children?.forEach((c) => c.markAsReady(opts));
        super.markAsReady(opts);
      });
    } else {
      super.markAsReady(opts);
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.rowSubscription?.unsubscribe();
  }

  async setValue(data: ActivityMonth[]) {
    console.debug(this.logPrefix + 'Setting data', data);

    switch (this.style) {
      // Table
      case 'table': {
        // Get min metier count
        const metierBlockCount = data.reduce(
          (res, month) => Math.max(month.gearUseFeatures?.length || 0, res),
          this.canEdit ? DEFAULT_METIER_COUNT : 0
        );
        console.debug(this.logPrefix + 'Metier block count=' + metierBlockCount);

        // Fill metier block
        data.forEach((month) => {
          month.gearUseFeatures = month.gearUseFeatures || [];
          if (month.gearUseFeatures.length < metierBlockCount) {
            month.gearUseFeatures = month.gearUseFeatures.concat(
              new Array(metierBlockCount - month.gearUseFeatures.length).fill({}).map(GearUseFeatures.fromObject)
            );
          }
          month.gearUseFeatures.forEach((guf) => {
            guf.fishingAreas = guf.fishingAreas || [];
            if (guf.fishingAreas.length < this.maxFishingAreaCount) {
              guf.fishingAreas = guf.fishingAreas.concat(
                new Array(this.maxFishingAreaCount - guf.fishingAreas.length).fill({}).map(FishingArea.fromObject)
              );
            }
          });
        });

        while (this.metierCount < metierBlockCount) {
          this.addMetierBlock(null, { emitEvent: true, updateRows: false });
        }

        // Set data service
        this.memoryDataService.value = data;

        // Load vessels
        await this.loadVessels(data);

        // load vesselOwner
        await this.loadVesselOwner(data);

        break;
      }
      // Accordion
      case 'accordion': {
        await this.waitForChildren();
        const firstDayOfYear = this.months?.[0];
        this._children.map((child, index) => {
          const month = child.month;
          const filteredMonth =
            data.find((am) => am.startDate?.month() === month) ||
            <ActivityMonth>{
              month: month,
              startDate: firstDayOfYear.clone().month(month),
              endDate: firstDayOfYear.clone().month(month).endOf('month'),
            };
          child.value = [filteredMonth];
        });
        this.markAsLoaded();
        this.memoryDataService.value = []; // Not need
        break;
      }
    }
  }

  getValue(): ActivityMonth[] {
    switch (this.style) {
      // Table
      case 'table': {
        const months = this.memoryDataService.value;

        // Clear empty block
        months.forEach((month) => {
          if (month.isActive === VesselUseFeaturesIsActiveEnum.ACTIVE) {
            month.gearUseFeatures = month.gearUseFeatures?.filter(GearUseFeatures.isNotEmpty);
          } else {
            month.gearUseFeatures = []; // Clear gears
            month.measurementValues = {}; // Clear measurements
          }
        });

        return months;
      }

      // Accordion
      case 'accordion': {
        return this._children?.flatMap((child) => child.value) || <ActivityMonth[]>[];
      }
    }
  }

  async loadVessels(months: ActivityMonth[]) {
    if (isEmptyArray(months)) {
      this.vesselRegistrations = [];
      return;
    }
    const vesselId = months[0].vesselId;
    const startDate = months[0]?.startDate.clone().startOf('year');
    const endDate = startDate.clone().endOf('year');
    const { data } = await this.vesselRegistrationPeriodService.loadAll(
      0,
      100, // all
      'startDate',
      'desc',
      {
        vesselId,
        startDate,
        endDate,
      }
    );

    this.vesselRegistrations = months.map((month) => IUseFeaturesUtils.filterByPeriod(data, month).map((vrp) => vrp.registrationLocation));
  }

  async loadVesselOwner(months: ActivityMonth[]) {
    if (isEmptyArray(months)) {
      this.vesselOwners = null;
      return;
    }
    const vesselId = months[0].vesselId;
    const startDate = months[0]?.startDate.clone().startOf('year');
    const endDate = startDate.clone().endOf('year');
    const filter: Partial<VesselOwnerPeriodFilter> = {
      vesselId: vesselId,
      startDate: startDate,
      endDate: endDate,
    };

    const { data } = await this.vesselOwnerPeriodService.loadAll(0, 100, 'startDate', 'desc', filter);

    this.vesselOwners = months.map((month) => IUseFeaturesUtils.filterByPeriod(data, month).map((vop) => vop.vesselOwner));
  }

  async waitForChildren(opts?: WaitForOptions) {
    if (this.style === 'accordion' && isEmptyArray(this._children)) {
      await waitFor(() => this.monthCalendars.length === 12, { stop: this.destroySubject, stopError: false, ...opts });
      this._children = this.monthCalendars.toArray();
    }
  }

  async onMouseDown(event: MouseEvent, cellElement: HTMLTableCellElement, row: AsyncTableElement<any>, columnName: string, axis?: 'x' | 'y') {
    if (!cellElement) throw new Error('Missing cell element');

    event.preventDefault();
    event.stopPropagation();

    const divElement = this.cellSelectionDivRef.nativeElement as HTMLDivElement;
    if (!divElement) return false;

    this.closeContextMenu();

    // DEBUG
    console.debug(`${this.logPrefix}Start cell selection... [confirm edited row}`);

    // Confirmed previous edited row
    const confirmed = await this.confirmEditCreate();
    if (!confirmed) return false;

    if (this.cellSelection) {
      if (this.cellSelection.validating) return false;

      // If action comes from the bottom-right cell, then extend the current selection
      if (this.isRightAndBottomCellSelected(this.cellSelection, row, columnName)) {
        this.cellSelection.resizing = true;
        return true;
      }

      // Else, remove the previous cell selection
      this.removeCellSelection({ emitEvent: false });
    }

    // DEBUG
    console.debug(`${this.logPrefix}Start cell selection... [row confirmed}`);

    this.cellSelection = {
      divElement,
      cellElement,
      row,
      columnName,
      axis,
      originalMouseX: event.clientX,
      originalMouseY: event.clientY,
      colspan: 1,
      rowspan: 1,
      resizing: true,
    };

    this.resizeCellSelection(this.cellSelection, 'cell');

    return true;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const cellSelection = this.cellSelection;

    if (!cellSelection?.resizing || cellSelection.validating || event.defaultPrevented) return; // Ignore

    // DEBUG
    //console.debug(this.logPrefix + 'Moving cell selection validating=' + (cellSelection?.validating || false));

    const { axis, cellRect, row } = cellSelection;
    if (!cellRect) return; // Missing cellRect

    const movementX = axis !== 'y' ? event.clientX - cellSelection.originalMouseX : 0;
    const movementY = axis !== 'x' ? event.clientY - cellSelection.originalMouseY : 0;

    let colspan = Math.max(cellRect.width, Math.round((cellRect.width + Math.abs(movementX)) / cellRect.width) * cellRect.width) / cellRect.width;
    let rowspan =
      Math.max(cellRect.height, Math.round((cellRect.height + Math.abs(movementY)) / cellRect.height) * cellRect.height) / cellRect.height;

    // Manage negative
    if (movementX < 0 && colspan > 1) colspan = -1 * (colspan - 1);
    if (movementY < 0 && rowspan > 1) rowspan = -1 * (rowspan - 1);

    // Check limits
    const rowIndex = row.id;
    if (colspan >= 0) {
      // Upper limit
      colspan = Math.min(colspan, this.visibleRowCount - rowIndex);
    } else {
      // Lower limit
      colspan = Math.max(colspan, -1 * (rowIndex + 1));
    }
    const columnIndex = this.displayedColumns.indexOf(cellSelection.columnName);
    if (rowspan >= 0) {
      // Upper limit
      rowspan = Math.min(rowspan, this.displayedColumns.length - RESERVED_END_COLUMNS.length - columnIndex);
    } else {
      // Lower limit
      rowspan = Math.max(rowspan, -1 * (columnIndex + 1 - RESERVED_START_COLUMNS.length - ACTIVITY_MONTH_READONLY_COLUMNS.length));
    }

    cellSelection.colspan = colspan;
    cellSelection.rowspan = rowspan;

    this.resizeCellSelection(cellSelection);
  }

  @HostListener('document:mouseup', ['$event'])
  async onMouseUp(event?: MouseEvent) {
    const cellSelection = this.cellSelection;
    if (!cellSelection?.resizing || cellSelection.validating || event?.defaultPrevented) return false;

    const { divElement, cellRect } = cellSelection;
    if (!divElement || !cellRect) return false;

    event?.preventDefault();
    event?.stopPropagation();

    // DEBUG
    console.debug(`${this.logPrefix}Validating cell selection`);
    cellSelection.validating = true;
    cellSelection.resizing = false;

    try {
      // Stop if selection is empty
      if (cellSelection.colspan === 0 || cellSelection.rowspan === 0) {
        this.removeCellSelection();
        return;
      }

      await this.onMouseEnd(cellSelection);

      await sleep(250);
    } finally {
      // Mark as not validating
      cellSelection.validating = false;
    }
  }

  async onMouseShiftClick(event?: MouseEvent, row?: AsyncTableElement<ActivityMonth>, columnName?: string): Promise<boolean> {
    row = row || this.editedRow;
    columnName = columnName || this.focusColumn;
    if (!row || !columnName || event?.defaultPrevented) return false; // Skip

    event?.preventDefault();
    event?.stopPropagation();

    // DEBUG
    //console.debug(`${this.logPrefix}Shift+click`, event, row, columnName);
    let cellSelection = this.cellSelection;

    // No existing selection, but edited Row
    const editedRow = this.editedRow;
    if (!cellSelection && editedRow) {
      // Get edited cell
      const editedCell = this.getEditedCell();
      if (editedCell) {
        // Confirmed
        const confirmed = await this.confirmEditCreate();
        if (!confirmed) return false;

        const { cellElement, columnName: sourceColumnName } = editedCell;
        // Creating a selection
        cellSelection = {
          divElement: this.cellSelectionDivRef.nativeElement,
          cellElement,
          row: editedRow,
          columnName: sourceColumnName,
          colspan: 1, // Will be update later (see below)
          rowspan: 1, // Will be update later (see below)
          resizing: false,
        };
      }
    }

    // No existing selection
    if (!cellSelection) {
      const cellElement = this.getEventCellElement(event);
      if (!cellElement) return false;

      // Creating new selection
      cellSelection = {
        divElement: this.cellSelectionDivRef.nativeElement,
        cellElement,
        row,
        columnName,
        colspan: 1,
        rowspan: 1,
        resizing: false,
      };
    }
    // Extend existing cell selection to target cell
    else {
      const { row: sourceRow, columnName: sourceColumnName } = cellSelection;
      const sourceRowIndex = sourceRow.id;
      const sourceColumnNameIndex = this.displayedColumns.indexOf(sourceColumnName);
      const targetRowIndex = row.id;
      const targetColumnIndex = this.displayedColumns.indexOf(columnName);

      cellSelection.colspan = targetRowIndex > sourceRowIndex ? targetRowIndex - sourceRowIndex + 1 : targetRowIndex - sourceRowIndex - 1;
      cellSelection.rowspan =
        targetColumnIndex > sourceColumnNameIndex ? targetColumnIndex - sourceColumnNameIndex + 1 : targetColumnIndex - sourceColumnNameIndex - 1;
    }

    // Expand blocks if need
    const { paths: selectedPaths } = this.getRowsFromSelection(cellSelection);

    // Expand some column, if need
    const collapsedColumns = this.dynamicColumns.filter((col) => col.toggle && !col.expanded && selectedPaths.includes(col.path));
    if (isNotEmptyArray(collapsedColumns)) {
      collapsedColumns.forEach((col) => col.toggle());
      await sleep(100); // Wait end of expansion
    }

    this.cellSelection = cellSelection;
    this.resizeCellSelection(cellSelection, 'cell');

    return true;
  }

  async onMouseCtrlClick(event?: MouseEvent, row?: AsyncTableElement<ActivityMonth>, columnName?: string): Promise<boolean> {
    row = row || this.editedRow;
    columnName = columnName || this.focusColumn;

    if (!row || !columnName) return false; // Skip

    event?.preventDefault();
    event?.stopPropagation();

    // DEBUG
    //console.debug(`${this.logPrefix}Ctrl+click`, event, row, columnName);

    const confirmed = await this.confirmEditCreate();
    if (!confirmed) return false;

    // Select the targeted cell
    const cellElement = this.getEventCellElement(event);
    if (!cellElement) return false;
    this.cellSelection = {
      divElement: this.cellSelectionDivRef.nativeElement,
      cellElement,
      row,
      columnName,
      colspan: 1,
      rowspan: 1,
      resizing: false,
    };
    this.resizeCellSelection(this.cellSelection, 'cell');
  }

  @HostListener('window:resize')
  onResize() {
    this.closeContextMenu();
    this.resizeCellSelection(this.cellSelection, 'cell', { emitEvent: false });
    this.resizeCellSelection(this.cellClipboard, 'clipboard', { emitEvent: false });
    this.markForCheck();
  }

  protected resizeCellSelection(cellSelection: TableCellSelection, name?: string, opts?: { emitEvent?: boolean }) {
    if (!cellSelection) return;

    const containerElement = this.tableContainerElement;
    if (!containerElement) return;

    const { cellElement, divElement } = cellSelection;
    if (!cellElement || !divElement) return;

    // DEBUG
    //console.debug(`${this.logPrefix}Resizing ${name || 'cell'} selection...`);

    const containerRect = containerElement.getBoundingClientRect();
    const relativeCellRect = cellElement.getBoundingClientRect();
    const divRect = divElement.getBoundingClientRect();

    const previousCellRect = cellSelection.cellRect;
    cellSelection.cellRect = {
      top: relativeCellRect.top,
      left: relativeCellRect.left - containerRect.left,
      width: relativeCellRect.width,
      height: relativeCellRect.height,
    };

    const colspan = toNumber(cellSelection.colspan, divRect.width / toNumber(previousCellRect?.width, relativeCellRect.width));
    const rowspan = toNumber(cellSelection.rowspan, divRect.height / toNumber(previousCellRect?.height, relativeCellRect.width));

    let top = relativeCellRect.top;
    let left = relativeCellRect.left + (containerElement.scrollLeft || 0) - containerRect.left;
    const width = relativeCellRect.width * Math.abs(colspan);
    const height = relativeCellRect.height * Math.abs(rowspan);

    if (rowspan < 0) {
      top = relativeCellRect.top + relativeCellRect.height - height;
    }
    if (colspan < 0) {
      left = relativeCellRect.left + relativeCellRect.width - width - containerRect.left + (containerElement.scrollLeft || 0);
    }

    // TODO - Check top limit
    /*const maxTop = containerElement.offsetTop - containerElement.scrollTop;
    //console.log('TODO maxTop=' + maxTop);
    if (top < maxTop) {
      //height -= maxTop - top;
      //top = containerElement.offsetTop + containerElement.scrollTop;
    }
    // Check height limit
    if (top + height > containerElement.clientHeight) {
      //height = top + containerElement.clientHeight;
    }*/

    // DEBUG
    //console.debug(`${this.logPrefix}Resizing to top=${top} left=${left} width=${width} height=${height}`);

    // Resize the shadow element
    divElement.style.position = 'fixed';
    divElement.style.top = top + 'px';
    divElement.style.left = left + 'px';
    divElement.style.width = width + 'px';
    divElement.style.height = height + 'px';

    if (opts?.emitEvent !== false) {
      this.markForCheck();
    }
  }

  protected async onMouseEnd(cellSelection?: TableCellSelection) {
    // Vertical copy
    if (cellSelection.axis === 'x' && cellSelection?.rowspan === 1 && cellSelection.colspan > 1) {
      const done = await this.copyVertically(cellSelection.row, cellSelection.columnName, cellSelection.colspan);

      // Reset axis to allow cell selection resize
      this.cellSelection.axis = null;

      return done;
    }

    return true;
  }

  async clickRow(event: Event | undefined, row: AsyncTableElement<ActivityMonth>): Promise<boolean> {
    if (event?.defaultPrevented) return false; // Skip

    this.closeContextMenu();

    // If cell selection is resizing: skip
    if (this.cellSelection?.resizing || this.cellSelection?.validating) return false;

    // If Click+Shift
    if (event instanceof MouseEvent) {
      if (event.shiftKey === true) return this.onMouseShiftClick(event, row, this.focusColumn);
      if (event.ctrlKey === true) return this.onMouseCtrlClick(event, row, this.focusColumn);
    }

    if (this.disabled) return false; // Skip

    return super.clickRow(event, row);
  }

  async cancelOrDelete(
    event: Event,
    row: AsyncTableElement<ActivityMonth>,
    opts?: { interactive?: boolean; keepEditing?: boolean; emitEvent?: boolean }
  ): Promise<void> {
    event?.preventDefault();
    if (row === this.editedRow) this.rowSubscription?.unsubscribe();

    await super.cancelOrDelete(event, row, { ...opts, keepEditing: false });

    // Restart listen changes, if still editing (e.g. cannot cancel)
    if (row.editing) {
      // DEBUG
      console.debug(`${this.logPrefix} Cannot cancel or delete the row!`);

      this.startListenRow(row.validator);
    } else {
      row.validator.markAsPristine();
      // Update view
      if (opts?.emitEvent !== false) this.markForCheck();
    }
  }

  addMetierBlock(event?: Event, opts?: { emitEvent?: boolean; updateRows?: boolean }) {
    // Skip if reach max
    if (this.metierCount >= this.maxMetierCount) {
      console.warn(this.logPrefix + 'Unable to add metier: max=' + this.maxMetierCount);
      return;
    }

    console.debug(this.logPrefix + 'Adding new metier block...');
    const index = this.metierCount;
    const fishingAreaCount = toNumber(this.maxFishingAreaCount, MAX_FISHING_AREA_COUNT);
    const rankOrder = index + 1;
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
        toggle: (event) => this.toggleMetierBlock(event, `metier${rankOrder}`),
      },
      ...new Array<ColumnDefinition>(fishingAreaCount).fill(null).flatMap((_, faIndex) => {
        const faRankOrder = faIndex + 1;
        return [
          {
            blockIndex: index,
            index: faIndex,
            rankOrder: faRankOrder,
            label: this.translate.instant('ACTIVITY_CALENDAR.EDIT.FISHING_AREA_RANKED', { rankOrder: faRankOrder }),
            placeholder: this.translate.instant('ACTIVITY_CALENDAR.EDIT.FISHING_AREA'),
            autocomplete: this.autocompleteFields.fishingAreaLocation,
            path: `${pathPrefix}fishingAreas.${faIndex}.location`,
            key: `metier${rankOrder}FishingArea${faRankOrder}`,
            class: 'mat-column-fishingArea',
            treeIndent: '&nbsp;&nbsp;',
            expand: (event: Event) => this.toggleMetierBlock(event, `metier${rankOrder}`),
          },
          {
            blockIndex: index,
            index: faIndex,
            rankOrder: faRankOrder,
            label: this.translate.instant('ACTIVITY_CALENDAR.EDIT.DISTANCE_TO_COAST_GRADIENT'),
            placeholder: this.translate.instant('ACTIVITY_CALENDAR.EDIT.DISTANCE_TO_COAST_GRADIENT'),
            autocomplete: this.autocompleteFields.distanceToCoastGradient,
            path: `${pathPrefix}fishingAreas.${faIndex}.distanceToCoastGradient`,
            key: `metier${rankOrder}FishingArea${faRankOrder}distanceToCoastGradient`,
            class: 'mat-column-distanceToCoastGradient',
            treeIndent: '&nbsp;&nbsp',
            expanded: false,
            toggle: (event: Event) => this.toggleGradientBlock(event, `metier${rankOrder}FishingArea${faRankOrder}`),
            expand: (event: Event) => this.toggleMetierBlock(event, `metier${rankOrder}`),
          },
          {
            blockIndex: index,
            index: faIndex,
            rankOrder: faRankOrder,
            label: this.translate.instant('ACTIVITY_CALENDAR.EDIT.DEPTH_GRADIENT'),
            placeholder: this.translate.instant('ACTIVITY_CALENDAR.EDIT.DEPTH_GRADIENT'),
            autocomplete: this.autocompleteFields.depthGradient,
            path: `${pathPrefix}fishingAreas.${faIndex}.depthGradient`,
            key: `metier${rankOrder}FishingArea${faRankOrder}depthGradient`,
            class: 'mat-column-depthGradient',
            treeIndent: '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;',
            expand: (event: Event) => this.toggleGradientBlock(event, `metier${rankOrder}FishingArea${faRankOrder}`),
            hidden: true,
          },
          {
            blockIndex: index,
            index: faIndex,
            rankOrder: faRankOrder,
            label: this.translate.instant('ACTIVITY_CALENDAR.EDIT.NEARBY_SPECIFIC_AREA'),
            placeholder: this.translate.instant('ACTIVITY_CALENDAR.EDIT.NEARBY_SPECIFIC_AREA'),
            autocomplete: this.autocompleteFields.nearbySpecificArea,
            path: `${pathPrefix}fishingAreas.${faIndex}.nearbySpecificArea`,
            key: `metier${rankOrder}FishingArea${faRankOrder}nearbySpecificArea`,
            class: 'mat-column-nearbySpecificArea',
            treeIndent: '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;',
            expand: (event: Event) => this.toggleGradientBlock(event, `metier${rankOrder}FishingArea${faRankOrder}`),
            hidden: true,
          },
        ];
      }),
    ];

    // Update rows validator
    if (this.loaded && this.inlineEdition && opts?.updateRows !== false) {
      this.dataSource.getRows().forEach((row) => this.onPrepareRowForm(row.validator, { listenChanges: false }));
    }

    this.focusColumn = blockColumns[0].key;
    this.dynamicColumns = this.dynamicColumns ? [...this.dynamicColumns, ...blockColumns] : blockColumns;
    const dynamicColumnKeys = this.dynamicColumns.map((col) => col.key);
    this.excludesColumns = this.excludesColumns.filter((columnName) => !dynamicColumnKeys.includes(columnName));
    this.metierCount = index + 1;

    // Force to update the edited row
    if (this.editedRow) {
      this.onPrepareRowForm(this.editedRow.validator, { listenChanges: false });
    }

    if (opts?.emitEvent !== false) {
      this.updateColumns();
    }
  }

  protected expandAll(event?: Event, opts?: { emitEvent?: boolean }) {
    for (let i = 0; i < this.metierCount; i++) {
      this.expandMetierBlock(null, i);
    }
  }

  protected collapseAll(event?: UIEvent, opts?: { emitEvent?: boolean }) {
    for (let i = 0; i < this.metierCount; i++) {
      this.collapseMetierBlock(null, i);
    }
  }

  protected async suggestMetiers(value: any, filter?: Partial<ReferentialRefFilter>): Promise<LoadResult<Metier>> {
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };

    // Get metiers to exclude (already existing)
    const existingMetierIds =
      this.editedRow && removeDuplicatesFromArray((this.editedRow.currentData?.gearUseFeatures || []).map((guf) => guf.metier?.id).filter(isNotNil));

    // eslint-disable-next-line prefer-const
    let { data, total } = await this.referentialRefService.suggest(
      value,
      {
        ...METIER_DEFAULT_FILTER,
        ...filter,
        excludedIds: existingMetierIds,
      },
      null,
      null,
      {
        toEntity: false, // convert manually
        withProperties: true /* need to fill properties.gear */,
      }
    );
    // Convert to Metier entities (using `properties.gear` to fill the gear)
    const entities = ((data || []) as any[]).map((source) => Metier.fromObject({ ...source, ...source.properties }));

    return { data: entities, total };
  }

  protected onPrepareRowForm(
    form: UntypedFormGroup,
    opts?: ActivityMonthValidatorOptions & {
      listenChanges?: boolean;
    }
  ) {
    if (!form || !this.validatorService) return;

    const isActive = form.get('isActive').value;

    opts = {
      required: false,
      withMetier: isActive !== VesselUseFeaturesIsActiveEnum.INACTIVE && isActive !== VesselUseFeaturesIsActiveEnum.NOT_EXISTS,
      withFishingAreas: isActive !== VesselUseFeaturesIsActiveEnum.INACTIVE && isActive !== VesselUseFeaturesIsActiveEnum.NOT_EXISTS,
      metierCount: this.metierCount,
      fishingAreaCount: this.maxFishingAreaCount,
      isOnFieldMode: this.isOnFieldMode,
      ...opts,
    };

    if (this.debug) console.debug(this.logPrefix + 'Updating row form...', opts);
    this.validatorService.updateFormGroup(form, opts);

    if (opts?.listenChanges !== false) {
      this.startListenRow(form);
    }
  }

  protected startListenRow(form: UntypedFormGroup) {
    // Stop previous listener
    this.rowSubscription?.unsubscribe();

    // DEBUG
    console.debug(this.logPrefix + 'Start listening row form...', form);

    this.rowSubscription = new Subscription();
    this.rowSubscription.add(
      ActivityMonthValidators.startListenChanges(form, {
        markForCheck: () => this.markForCheck(),
        debounceTime: 100,
      })
    );
    this.rowSubscription.add(
      form.valueChanges
        .pipe(
          debounceTime(250),
          filter(() => form.touched)
        )
        .subscribe(() => {
          // Clear the clipboard, if content changed
          if (this.isCellSelected(this.cellClipboard, this.editedRow, this.focusColumn)) {
            this.clearClipboard(null, { clearContext: !!this.cellClipboard });
          }

          if (form.dirty) this.markAsDirty();
        })
    );
    // DEBUG
    this.rowSubscription.add(() => console.debug(this.logPrefix + 'Stop listening row form'));

    // Listen row focused element
    this.rowSubscription.add(this.startListenFocusedElement());
  }

  protected async editRow(event: Event | undefined, row: AsyncTableElement<ActivityMonth>, opts?: { focusColumn?: string }): Promise<boolean> {
    const editing = await super.editRow(event, row, opts);
    if (editing) this.removeCellSelection();
    return editing;
  }

  protected configureValidator(opts: MeasurementsTableValidatorOptions) {
    super.configureValidator(opts);

    this.validatorService.delegateOptions = {
      maxMetierCount: this.maxMetierCount,
      maxFishingAreaCount: this.maxFishingAreaCount,
    };
  }

  async confirmEditCreate(event?: Event, row?: AsyncTableElement<ActivityMonth>): Promise<boolean> {
    row = row || this.editedRow;
    if (!row || !row.editing) return true; // nothing to confirmed

    // If pristine, cancel instead of confirmed
    if (row.validator.pristine && !row.validator.valid) {
      await this.cancelOrDelete(event, row);

      this.focusColumn = undefined;

      return true;
    }

    event?.preventDefault();
    event?.stopPropagation();

    const confirmed = await super.confirmEditCreate(event, row);
    if (confirmed) this.focusColumn = undefined;

    return confirmed;
  }

  async clear(event?: Event, row?: AsyncTableElement<ActivityMonth>) {
    row = row || this.editedRow;
    if (!row || event.defaultPrevented) return true; // no row to confirm

    event?.preventDefault();
    event?.stopPropagation();

    const confirmed = await Alerts.askConfirmation('ACTIVITY_CALENDAR.EDIT.CONFIRM_CLEAR_MONTH', this.alertCtrl, this.translate);
    if (!confirmed) return false; // User cancelled

    if (this.debug) console.debug(this.logPrefix + 'Clear row', row);

    const currentData = row.currentData;
    if (ActivityMonth.isEmpty(currentData)) return true; // Nothing to clear

    const { startDate, endDate } = currentData;
    const data = ActivityMonth.fromObject({
      startDate,
      endDate,
      measurementValues: MeasurementValuesUtils.normalizeValuesToForm({}, this.pmfms),
      gearUseFeatures: new Array(this.maxMetierCount).fill({
        startDate,
        endDate,
        fishingAreas: new Array(this.maxFishingAreaCount).fill({}),
      }),
    });

    if (row.validator && row.editing) {
      row.originalData = data;
      await this.cancelOrDelete(event, row, { keepEditing: true });
    } else {
      row.currentData = data;
      this.onCancelOrDeleteRow.next(row);
    }
    this.markAsDirty({ emitEvent: false });
    this.markForCheck();
  }

  toggleMetierBlock(event: Event, key: string) {
    if (event?.defaultPrevented) return; // Skip^
    event?.preventDefault();

    const blockColumns = this.dynamicColumns.filter((col) => col.key.startsWith(key));
    if (isEmptyArray(blockColumns)) return; // Skip

    const masterColumn = blockColumns[0];
    if (isNil(masterColumn.expanded)) return; // Skip is not an expandable column

    console.debug(this.logPrefix + 'Toggling block #' + key);

    // Toggle expanded
    masterColumn.expanded = !masterColumn.expanded;
    const subColumns = blockColumns.slice(1);

    // If close: remove the selection
    if (!masterColumn.expanded && this.cellSelection) {
      const { paths: cellPaths } = this.getRowsFromSelection(this.cellSelection);
      const shouldHideCellSelection = subColumns.some((c) => cellPaths.includes(c.path));
      if (shouldHideCellSelection) this.removeCellSelection();
      const { paths: clipboardPaths } = this.getRowsFromSelection(this.cellClipboard);
      const shouldHideClipboard = subColumns.some((c) => clipboardPaths.includes(c.path));
      if (shouldHideClipboard) this.clearClipboard(null, { clearContext: false });
    }

    // Show/Hide sub columns
    subColumns.forEach((col) => (col.hidden = !masterColumn.expanded));

    // Expanded state for all columns to fix divergences states
    blockColumns.forEach((col) => {
      if (isNotNil(col.expanded)) {
        col.expanded = masterColumn.expanded;
      }
    });

    this.markForCheck();
  }

  toggleGradientBlock(event: Event, keyPrefix: string) {
    if (event?.defaultPrevented) return; // Skip
    event?.preventDefault();

    const blockColumnNames = [`${keyPrefix}distanceToCoastGradient`, `${keyPrefix}depthGradient`, `${keyPrefix}nearbySpecificArea`];
    const blockColumns = this.dynamicColumns.filter((col) => blockColumnNames.includes(col.key));

    if (isEmptyArray(blockColumns)) return; // Skip

    const masterColumn = blockColumns[0];
    if (isNil(masterColumn.expanded)) return; // Skip is not an expandable column

    // Toggle expanded
    masterColumn.expanded = !masterColumn.expanded;

    const subColumns = blockColumns.slice(1);

    // If close: remove the selection
    if (!masterColumn.expanded && this.cellSelection) {
      const { paths: cellPaths } = this.getRowsFromSelection(this.cellSelection);
      const shouldHideCellSelection = subColumns.some((c) => cellPaths.includes(c.path));
      if (shouldHideCellSelection) this.removeCellSelection();
      const { paths: clipboardPaths } = this.getRowsFromSelection(this.cellClipboard);
      const shouldHideClipboard = subColumns.some((c) => clipboardPaths.includes(c.path));
      if (shouldHideClipboard) this.clearClipboard(null, { clearContext: false });
    }

    // Show/Hide sub columns
    subColumns.forEach((col) => (col.hidden = !masterColumn.expanded));

    this.markForCheck();
  }

  expandMetierBlock(event: Event, blockIndex: number) {
    if (event?.defaultPrevented) return; // Skip^
    event?.preventDefault();

    this.setMetierBlockExpanded(blockIndex, true);
  }

  collapseMetierBlock(event: Event, blockIndex: number) {
    if (event?.defaultPrevented) return; // Skip^
    event?.preventDefault();

    this.setMetierBlockExpanded(blockIndex, false);
  }

  markAsDirty(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    if (this.loading) return; // Skip while loading
    super.markAsDirty(opts);
  }

  protected setMetierBlockExpanded(blockIndex: number, expanded: boolean) {
    const blockColumns = this.dynamicColumns.filter((col) => col.blockIndex === blockIndex);
    if (isEmptyArray(blockColumns)) return;

    const masterColumn = blockColumns[0];
    if (isNil(masterColumn.expanded)) return; // Skip is not an expandable column

    masterColumn.expanded = expanded;

    // Update sub columns
    blockColumns.slice(1).forEach((col) => {
      col.hidden = !expanded;

      // Expanded state for all columns to fix divergences states
      if (isNotNil(col.expanded)) {
        col.expanded = expanded;
      }
    });
  }

  protected setFocusColumn(event: Event | undefined, row: AsyncTableElement<ActivityMonth>, columnName: string) {
    if (!row.editing) {
      // DEBUG
      console.debug(`${this.logPrefix}setFocusColumn() => ${columnName}`);
      this.focusColumn = columnName;
    }
  }

  protected getColumnPath(key: string): string | undefined {
    // Get column
    const dynamicColumn = this.dynamicColumns?.find((c) => c.key === key);
    const validColumn = !!dynamicColumn || key === 'isActive' || key === 'basePortLocation' || PMFM_ID_REGEXP.test(key);
    if (!validColumn) return undefined;

    return dynamicColumn?.path || (PMFM_ID_REGEXP.test(key) ? `measurementValues.${key}` : key);
  }

  protected getI18nColumnName(key: string): string | undefined {
    if (isNilOrBlank(key)) throw new Error('Missing column key');
    // Get column
    const dynamicColumn = this.dynamicColumns?.find((c) => c.key === key);
    const validColumn = !!dynamicColumn || key === 'isActive' || key === 'basePortLocation' || PMFM_ID_REGEXP.test(key);
    if (!validColumn) return undefined;

    if (dynamicColumn?.label) return dynamicColumn.label;
    if (PMFM_ID_REGEXP.test(key)) {
      const pmfm = this.pmfms?.find((p) => p.id.toString() === key);
      if (pmfm) return this.getI18nPmfmName(pmfm);
    }

    return this.translate.instant(this.i18nColumnPrefix + changeCaseToUnderscore(key).toUpperCase());
  }

  protected async copyVertically(sourceRow: AsyncTableElement<ActivityMonth>, columnName: string, colspan: number) {
    if (!sourceRow || !columnName || colspan === 0 || !this.enabled) return false;

    console.debug(this.logPrefix + `Copying vertically ${columnName} - colspan=${colspan}`);

    // Get column path
    const path = this.getColumnPath(columnName);
    if (isNilOrBlank(path)) return false;

    // Get target rows
    const minRowId = colspan > 0 ? sourceRow.id + 1 : sourceRow.id + colspan + 1;
    const maxRowId = colspan > 0 ? sourceRow.id + colspan - 1 : sourceRow.id - 1;
    const targetRows = this.dataSource.getRows().filter((row) => row.id >= minRowId && row.id <= maxRowId);
    if (isEmptyArray(targetRows)) return false; // Skip if empty

    // DEBUG
    if (this.debug) console.debug(this.logPrefix + `Copying vertically ${columnName} to ${targetRows.length} months ...`, targetRows);

    // Get source value (after confirmed if row is editing)
    await this.confirmEditCreate(); // Row can be NOT confirmed, but it's OK
    const sourceValue = getPropertyByPath(sourceRow.currentData, path);

    let dirty = false;
    targetRows.forEach((row, index) => {
      const form = row.validator;
      if (form) {
        const isActiveControl = form.get('isActive');
        let isActive = isActiveControl.value;
        if (isNotNil(sourceValue) && columnName !== 'isActive' && columnName !== 'basePortLocation') {
          if (isNil(isActive)) {
            isActive = VesselUseFeaturesIsActiveEnum.ACTIVE;
            isActiveControl.patchValue(isActive, { emitEvent: false });
            dirty = true;
          }
          // Prepare the form
          this.onPrepareRowForm(form, { listenChanges: false });
        }

        const control = form.get(path);
        if (control && (isActive === VesselUseFeaturesIsActiveEnum.ACTIVE || columnName === 'isActive' || columnName === 'basePortLocation')) {
          control.setValue(isNil(sourceValue) ? null : sourceValue);
          form.markAllAsTouched();
          form.markAsDirty();
          dirty = true;
        } else {
          console.debug(`- Skipping copy value to month ${index + 1}`);
        }
      }
    });

    if (dirty) {
      this.markAsDirty({ emitEvent: false });
      this.markForCheck();
    }

    return dirty;
  }

  protected async copy(event?: Event) {
    if (event?.defaultPrevented) return;

    console.debug(`${this.logPrefix}Copy event`, event);

    if (this.cellSelection && (this.cellSelection?.colspan !== 0 || this.cellSelection?.rowspan !== 0)) {
      event?.preventDefault();
      event?.stopPropagation();

      // Copy to clipboard
      await this.copyCellSelectionToClipboard(this.cellSelection);

      this.removeCellSelection();

      this.markForCheck();
    } else {
      if (this.editedRowFocusedElement) {
        // Continue
      } else {
        event?.preventDefault();
        event?.stopPropagation();
        await this.copyCellToClipboard(this.editedRow, this.focusColumn);
      }
    }
  }

  protected async copyCellSelectionToClipboard(cellSelection?: TableCellSelection): Promise<boolean> {
    cellSelection = cellSelection || this.cellSelection;
    if (!cellSelection) return false; // Nothing to copy

    console.debug(`${this.logPrefix}Copy cell selection to clipboard`);

    // Find selected months
    const { months: sourceMonths, paths: sourcePaths } = this.getDataFromSelection(cellSelection);

    // Clone months, on selected paths
    const targetMonths = sourceMonths.map((source) => {
      const form = this.validatorService.getFormGroup();
      form.enable();
      sourcePaths.forEach((path) => {
        const sourceValue = getPropertyByPath(source, path);
        const control = this.findOrCreateControl(form, path);
        control.setValue(sourceValue, { emitEvent: false });
      });
      return form.value;
    });
    console.debug(`${this.logPrefix}Target months:`, targetMonths);
    console.debug(`${this.logPrefix}Target paths:`, sourcePaths);

    this.context.clipboard = {
      data: {
        months: targetMonths,
        paths: sourcePaths,
      },
    };

    this.cellClipboard = {
      ...cellSelection,
      divElement: this.cellClipboardDivRef.nativeElement,
    };
    this.resizeCellSelection(this.cellClipboard, 'clipboard');
  }

  protected async clearCellSelection(event: Event | undefined, cellSelection?: TableCellSelection): Promise<boolean> {
    cellSelection = cellSelection || this.cellSelection;
    if (!cellSelection || event.defaultPrevented) return false;

    event?.preventDefault();
    event?.stopPropagation();

    console.debug(`${this.logPrefix}Clearing cell selection...`);

    const { rows, paths } = this.getRowsFromSelection(cellSelection);

    for (const row of rows) {
      paths.forEach((path) => {
        setPropertyByPath(row, path, null);
        const control = this.findOrCreateControl(row.validator, path);
        if (control) control.setValue(null);
      });
    }

    console.debug(`${this.logPrefix}Clearing cell selection [OK]`);

    this.markAsDirty({ emitEvent: false });
    this.markForCheck();
    return true;
  }

  protected isCellSelected(cellSelection: TableCellSelection, row: AsyncTableElement<ActivityMonth>, columnName: string) {
    if (!cellSelection || !row || !columnName) return false;
    const path = this.getColumnPath(columnName);
    const { rows, paths } = this.getRowsFromSelection(cellSelection);
    return paths.includes(path) && rows.includes(row);
  }

  protected isRightAndBottomCellSelected(cellSelection: TableCellSelection, row: AsyncTableElement<ActivityMonth>, columnName: string) {
    if (!cellSelection || !row || !columnName) return false;
    const path = this.getColumnPath(columnName);
    const { rows, paths } = this.getRowsFromSelection(cellSelection);
    return lastArrayValue(paths) === path && lastArrayValue(rows) === row;
  }

  protected getDataFromSelection(cellSelection: TableCellSelection): { months: ActivityMonth[]; paths: string[] } {
    const { rows, paths } = this.getRowsFromSelection(cellSelection);
    return {
      months: rows.map((row) => row.currentData),
      paths,
    };
  }

  protected getRowsFromSelection(cellSelection: TableCellSelection): { rows: AsyncTableElement<ActivityMonth>[]; paths: string[] } {
    if (!cellSelection) return { paths: [], rows: [] };
    const { row, columnName, rowspan, colspan } = cellSelection;
    if (!row || !columnName) throw new Error('Invalid cell selection');

    // Find selected months
    const startRowIndex = colspan >= 0 ? row.id : row.id + colspan + 1;
    const endRowIndex = colspan >= 0 ? startRowIndex + colspan : row.id + 1;
    const rows = this.dataSource.getRows().slice(startRowIndex, endRowIndex);

    // Find selected paths
    const focusColumnIndex = this.displayedColumns.findIndex((columnName) => columnName === cellSelection.columnName);
    const startColumnIndex = rowspan > 0 ? focusColumnIndex : focusColumnIndex + rowspan;
    const endColumnIndex = rowspan > 0 ? startColumnIndex + rowspan : focusColumnIndex + 1;
    const paths = this.displayedColumns
      .slice(startColumnIndex, endColumnIndex)
      .map((columnName) => this.getColumnPath(columnName))
      .filter(isNotNil);

    // DEBUG
    //console.debug(`${this.logPrefix} Selected rows:`, rows);
    //console.debug(`${this.logPrefix} Selected paths`, paths);

    return { rows, paths };
  }

  protected async copyCellToClipboard(sourceRow: AsyncTableElement<ActivityMonth>, columnName: string): Promise<boolean> {
    if (!sourceRow || !columnName) return false; // Skip

    console.debug(`${this.logPrefix}Copying cell '${columnName}' to clipboard`);

    // Get column path
    const path = this.getColumnPath(columnName);
    if (isNilOrBlank(path)) return false;

    const data = sourceRow.currentData;

    const value = getPropertyByPath(data, path);
    const source = setPropertyByPath({}, path, value);
    const monthForm = this.validatorService.getRowValidator();
    monthForm.patchValue(source);

    console.debug(`${this.logPrefix}Copy data to clipboard`, source);

    this.context.clipboard = {
      data: {
        months: [monthForm.value],
        paths: [path],
      },
      source: this,
    };
    return true;
  }

  protected findOrCreateControl(form: UntypedFormGroup, path: string) {
    let control = form.get(path);
    if (control) return control;

    const pathParts = path.split('.');
    let i = 0;
    while (i < pathParts.length) {
      const property = pathParts[i++];
      if (control instanceof AppFormArray && /\d/.test(property)) {
        const index = +property;
        control.resize(index + 1);
        control = control.at(index);
      } else {
        control = (control || form)?.get(property);
      }
    }
    return control;
  }

  protected paste(event?: Event) {
    return this.pasteFromClipboard(event);
  }

  protected async pasteFromClipboard(event?: Event) {
    let sourceMonths = this.context.clipboard?.data?.months;
    let sourcePaths = this.context.clipboard?.data?.paths;
    if (isEmptyArray(sourceMonths) || isEmptyArray(sourcePaths)) return false; // Empty clipboard

    // DEBUG
    console.debug(`${this.logPrefix}Paste ${sourceMonths.length} month(s) from clipboard...`, sourcePaths, event);

    const targetCellSelection =
      this.cellSelection ||
      <TableCellSelection>{
        row: this.editedRow,
        columnName: this.focusColumn,
        divElement: this.cellSelectionDivRef.nativeElement,
        cellElement: this.getEventCellElement(event),
        colspan: 1,
        resizing: false,
      };

    // Maximize the targeted cells
    targetCellSelection.colspan = Math.max(targetCellSelection.colspan, sourceMonths.length);
    targetCellSelection.rowspan = sourcePaths.length;

    const { rows: targetRows, paths: targetPaths } = this.getRowsFromSelection(targetCellSelection);

    // Empty target rows
    if (isEmptyArray(targetRows) || isEmptyArray(targetPaths)) return false;

    // Confirm (or cancel) all targeted rows
    for (const row of targetRows.filter((row) => row.editing)) {
      const confirmed = await this.confirmEditCreate(null, row);
      if (!confirmed) await this.cancelOrDelete(null, row);
    }

    // Check target path is compatible
    const sourcePathSuffix = lastArrayValue(sourcePaths[0].split('.'));
    const targetPathSuffix = lastArrayValue(targetPaths[0].split('.'));
    if (sourcePathSuffix !== targetPathSuffix) {
      Toasts.show(this.toastController, this.translate, {
        type: 'error',
        message: 'ACTIVITY_CALENDAR.ERROR.CANNOT_PASTE_HERE',
      });
      return false;
    }

    // Limit paths to maximum allowed
    if (targetPaths.length < sourcePaths.length) {
      sourcePaths = sourcePaths.slice(0, targetPaths.length);
      targetCellSelection.rowspan = sourcePaths.length;
    }
    // Reduce rows to maximum allowed
    if (targetRows.length < sourceMonths.length) {
      sourceMonths = sourceMonths.slice(0, targetRows.length);
      targetCellSelection.colspan = targetRows.length;
    }

    for (let i = 0; i < targetRows.length; i++) {
      const targetRow = targetRows[i];
      const sourceMonth = sourceMonths[i % sourceMonths.length];

      // Creating a form
      const targetForm = this.validatorService.getFormGroup(targetRow.currentData);
      this.onPrepareRowForm(targetForm, { listenChanges: false });
      const isActiveControl = targetForm.get('isActive');
      let isActive = toNumber(sourceMonth.isActive, isActiveControl.value) === VesselUseFeaturesIsActiveEnum.ACTIVE;

      sourcePaths.forEach((sourcePath, index) => {
        const sourceValue = getPropertyByPath(sourceMonth, sourcePath);
        isActive = isActive || (isNotNil(sourceValue) && sourcePath !== 'isActive' && sourcePath !== 'basePortLocation');

        // Force IsActive = true, if need
        if (isActive && isActiveControl.value !== VesselUseFeaturesIsActiveEnum.ACTIVE) {
          isActiveControl.enable({ emitEvent: false });
          isActiveControl.setValue(VesselUseFeaturesIsActiveEnum.ACTIVE, { emitEvent: false });

          // Update the form (should enable more controls - e.g. metier, fishing areas)
          this.onPrepareRowForm(targetForm, { listenChanges: false });
        }

        // Update control from the path
        const targetPath = targetPaths[index];
        const control = targetPath && this.findOrCreateControl(targetForm, targetPath);
        if (control) {
          control.enable({ emitEvent: false });
          control.setValue(sourceValue);
        }
      });

      await this.updateEntityToTable(targetForm.value, targetRow, { confirmEdit: true });
    }

    // DEBUG
    console.debug(`${this.logPrefix}Paste clipboard [OK]`);

    // Select targeted cells, if possible
    if (!this.editedRow && targetCellSelection.cellElement) {
      // Resize, and display cell selection
      this.resizeCellSelection(targetCellSelection, 'cell', { emitEvent: false });
      this.cellSelection = targetCellSelection;
    } else {
      this.removeCellSelection({ emitEvent: false });
    }

    this.markAsDirty({ emitEvent: false });
    this.markForCheck();
  }

  protected removeCellSelection(opts?: { emitEvent?: boolean }) {
    if (!this.cellSelection) return;
    const { divElement, cellRect } = this.cellSelection;
    if (!divElement || !cellRect) return;

    // Forget the current selection
    this.cellSelection = null;

    // Reset the div size
    divElement.style.width = cellRect.width + 'px';
    divElement.style.height = cellRect.height + 'px';

    if (opts?.emitEvent !== false) {
      this.markForCheck();
    }
  }

  protected clearClipboard(event?: Event, opts?: { clearContext?: boolean }) {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.cellClipboard) {
      this.cellClipboard = null;
      this.markForCheck();
    }

    if (opts?.clearContext !== false) {
      this.context.clipboard = null;
    }
  }

  protected async onContextMenu(
    event: MouseEvent,
    cell?: HTMLElement | HTMLTableCellElement,
    row?: AsyncTableElement<ActivityMonth>,
    columnName?: string
  ) {
    row = row || this.editedRow;
    columnName = columnName || this.focusColumn;
    if (!row || !columnName) {
      event.preventDefault();
      return; // Skip
    }

    event.preventDefault();

    // Select current cell
    if (this.cellSelection?.row !== row || this.cellSelection?.columnName !== columnName) {
      if (!this.isCellSelected(this.cellSelection, row, columnName)) {
        this.removeCellSelection();
        await this.onMouseDown(event, cell as HTMLTableCellElement, row, columnName);
        await this.onMouseUp(event);
      }
    }

    this.menuTrigger.openMenu();
    const contextMenu = document.querySelector('.context-menu') as HTMLElement;
    contextMenu.style.position = 'fixed';
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
  }

  protected closeContextMenu() {
    if (this.menuTrigger?.menuOpened) {
      this.menuTrigger.closeMenu();
    }
  }

  protected getEventCellElement(event: Event): HTMLElement {
    if (!event?.target) return undefined;
    const element = event.target as HTMLElement;
    return this.getParentCellElement(element);
  }

  protected getParentCellElement(element: HTMLElement): HTMLElement {
    while (element && !element.classList.contains('mat-mdc-cell')) {
      element = element.parentElement;
    }
    return element;
  }

  protected getEditedRowElement(): HTMLElement {
    if (!this.editedRow) return undefined;
    return this.tableContainerElement?.querySelector(`mat-row.mat-mdc-row-selected`);
  }

  protected getEditedCell(): { cellElement: HTMLElement; columnName: string } {
    let cellElement: HTMLElement;
    let columnName: string;
    if (this.editedRowFocusedElement) {
      cellElement = this.getParentCellElement(this.editedRowFocusedElement);
      const columnClass = (cellElement?.classList.value.split(' ') || []).find(
        (clazz) => clazz.startsWith('cdk-column-') || clazz.startsWith('mat-column-')
      );
      columnName = lastArrayValue(columnClass?.split('-'));
    } else if (this.focusColumn) {
      const rowElement = this.getEditedRowElement();
      cellElement = rowElement?.querySelector(`.mat-mdc-cell.mat-column-${this.focusColumn}`);
      columnName = this.focusColumn;
    }

    if (!cellElement || !columnName) return undefined; // Parent cell not found

    return { cellElement, columnName };
  }

  startListenFocusedElement(): Subscription {
    const subscription = new Subscription();

    let rowElement: HTMLElement;
    waitFor(
      () => {
        rowElement = rowElement || this.getEditedRowElement();
        return !!rowElement || subscription.closed;
      },
      { dueTime: 250, timeout: 1000, stopError: false, stop: this.destroySubject }
    ).then(() => {
      if (subscription.closed) return; // Edited row changed

      // DEBUG
      console.debug(`${this.logPrefix}Start listening row focused element...`);
      this.editedRowFocusedElement = this.focusColumn && rowElement?.querySelector(`.mat-mdc-cell.mat-column-${this.focusColumn}`);

      subscription.add(
        fromEvent(rowElement, 'focusin').subscribe((event: Event) => {
          if (rowElement?.contains(event.target as Node)) {
            if (this.editedRowFocusedElement !== event.target) {
              // DEBUG
              //console.debug(`${this.logPrefix}Focused element is now:`, event.target);
              this.editedRowFocusedElement = event.target as HTMLElement;
            }
          } else {
            this.editedRowFocusedElement = null;
          }
        })
      );
      subscription.add(() => {
        // DEBUG
        console.debug(`${this.logPrefix}Stop listening row focused element`);
        // Forget the focused element
        this.editedRowFocusedElement = null;
      });
    }); // Delay to skip the first focus (should be the focusColumn)

    return subscription;
  }
}
