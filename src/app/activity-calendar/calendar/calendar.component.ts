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
  ReferentialUtils,
  removeDuplicatesFromArray,
  RESERVED_START_COLUMNS,
  setPropertyByPath,
  splitById,
  StatusIds,
  Toasts,
  toBoolean,
  toDateISOString,
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
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { RxState } from '@rx-angular/state';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { fromEvent, Observable, Subscription, tap } from 'rxjs';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AcquisitionLevelCodes, LocationLevelGroups, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { VesselOwner } from '@app/vessel/services/model/vessel-owner.model';
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
export const ACTIVITY_MONTH_START_COLUMNS = ['month', 'vesselOwner', 'registrationLocation', 'isActive', 'basePortLocation'];
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
  toggle?: (event: UIEvent) => void;
}

export interface CalendarComponentState extends BaseMeasurementsTableState {
  metierLevelId: number;
  vesselSnapshots: VesselSnapshot[];
  vesselOwners: VesselOwner[];
  dynamicColumns: ColumnDefinition[];
  metierCount: number;
  validRowCount: number;
  hasClipboard: boolean;
}

export type CalendarComponentStyle = 'table' | 'accordion';

export interface TableCellSelection<T = any> {
  row: AsyncTableElement<T>;
  columnName: string;
  cellElement: HTMLTableCellElement;
  cellRect: { top: number; left: number; width: number; height: number };
  divElement: HTMLDivElement;

  validating?: boolean;
  resizing?: boolean;

  axis?: 'x' | 'y';
  rowspan?: number;
  colspan?: number;
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
  protected vesselSnapshotService = inject(VesselSnapshotService);
  protected referentialRefService = inject(ReferentialRefService);

  @RxStateSelect() protected vesselSnapshots$: Observable<VesselSnapshot[]>;
  @RxStateSelect() protected vesselOwners$: Observable<VesselOwner[]>;
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
  protected originalMouseY: number;
  protected originalMouseX: number;
  protected _children: CalendarComponent[];
  protected showDebugValue = false;

  @RxStateProperty() vesselSnapshots: VesselSnapshot[];
  @RxStateProperty() vesselOwners: VesselOwner[];
  @RxStateProperty() dynamicColumns: ColumnDefinition[];
  @RxStateProperty() metierCount: number;
  @RxStateProperty() validRowCount: number;
  @RxStateProperty() hasClipboard: boolean;

  @Input() @RxStateProperty() months: Moment[];

  @Input() title: string = null;
  @Input() locationDisplayAttributes: string[];
  @Input() basePortLocationLevelIds: number[];
  @Input() fishingAreaLocationLevelIds: number[];
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
  @ViewChild('cellSelectionRect', { read: ElementRef }) cellSelectionDiv: ElementRef;
  @ViewChild('cellClipboardRect', { read: ElementRef }) cellClipboardDiv: ElementRef;

  constructor(
    injector: Injector,
    protected context: ActivityCalendarContextService
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
          .addShortcut({ keys: 'control.c', description: 'COMMON.BTN_COPY', preventDefault: true })
          .pipe(filter(() => this.loaded && !!this.cellSelection))
          .subscribe((event) => this.copy(event))
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'control.v', description: 'COMMON.BTN_PASTE', preventDefault: true })
          .pipe(filter(() => !this.disabled && this.canEdit))
          .subscribe(() => this.pasteFromClipboard())
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'escape', description: 'COMMON.BTN_CLEAR_CLIPBOARD', preventDefault: true })
          .pipe(filter((e) => !!this.cellClipboard))
          .subscribe((event) => this.clearClipboard(event))
      );

      this.registerSubscription(
        fromEvent(element, 'scroll')
          .pipe(
            //debounceTime(150),
            map((event: Event) => event.target as HTMLElement)
          )
          .subscribe((container: HTMLElement) => {
            // DEBUG
            //console.debug(`${this.logPrefix} scrollTop: ${container.scrollTop} scrollLeft: ${container.scrollLeft}`);

            {
              const rectElement = this.cellSelectionDiv.nativeElement;
              rectElement.style.marginTop = -1 * (container.scrollTop || 0) + 'px';
              rectElement.style.marginLeft = -1 * (container.scrollLeft || 0) + 'px';
            }
            {
              const rectElement = this.cellClipboardDiv.nativeElement;
              rectElement.style.marginTop = -1 * (container.scrollTop || 0) + 'px';
              rectElement.style.marginLeft = -1 * (container.scrollLeft || 0) + 'px';
            }
          })
      );
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
        if (isNotEmptyArray(data)) {
          const year = data[0]?.startDate.year();
          const vesselId = data[0].vesselId;
          if (isNotNil(vesselId)) {
            await this.loadVessels(vesselId, year);
          }
        }
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

  async loadVessels(vesselId: number, year: number) {
    const startDate = (this.timezone ? DateUtils.moment().tz(this.timezone) : DateUtils.moment()).year(year).startOf('year');
    const endDate = startDate.clone().endOf('year');
    const { data } = await this.vesselSnapshotService.loadAll(
      0,
      12, // all
      null,
      null,
      {
        vesselId,
        startDate,
        endDate,
        onlyWithRegistration: true, // TODO Est-ce utilisé ?
      },
      { withTotal: false, withDates: true }
    );
    console.log('TODO vesselSnapshots loaded: ', data);

    this.vesselSnapshots = await Promise.all(
      CalendarUtils.MONTHS.map(async (_, month) => {
        const date = startDate.clone().utc(false).month(month);

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

    this.closeContextMenu();

    // DEBUG
    console.debug(`${this.logPrefix}Start cell selection... [confirm edited row}`);

    // Confirmed previous edited row
    const confirmed = await this.confirmEditCreate();
    if (!confirmed) {
      console.debug(this.logPrefix + 'Cannot confirmed row !');
      //this.cancelOrDelete(null);
    }

    if (this.cellSelection) this.clearCellSelection();

    // DEBUG
    console.debug(`${this.logPrefix}Start cell selection... [row confirmed}`);

    const containerElement = this.tableContainerElement;
    const containerRect = containerElement.getBoundingClientRect();
    const relativeCellRect = cellElement.getBoundingClientRect();
    const cellRect = {
      top: relativeCellRect.top + (containerElement.scrollTop || 0),
      left: relativeCellRect.left + (containerElement.scrollLeft || 0) - containerRect.left,
      width: relativeCellRect.width,
      height: relativeCellRect.height,
    };
    this.originalMouseX = event.clientX;
    this.originalMouseY = event.clientY;
    const divElement = this.cellSelectionDiv.nativeElement as HTMLDivElement;
    divElement.style.marginTop = -1 * (containerElement.scrollTop || 0) + 'px';
    divElement.style.marginLeft = -1 * (containerElement.scrollLeft || 0) + 'px';
    divElement.style.top = cellRect.top + 'px';
    divElement.style.left = cellRect.left + 'px';
    divElement.style.width = cellRect.width + 'px';
    divElement.style.height = cellRect.height + 'px';

    this.cellSelection = { cellElement, cellRect, divElement, row, columnName, axis, resizing: true };
    this.markForCheck();
    return true;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // Resizing the cell selection (and not validating)
    if (this.cellSelection?.resizing && !this.cellSelection.validating) {
      const rectElement = this.cellSelection.divElement;

      const axis = this.cellSelection.axis;
      const movementX = axis !== 'y' ? event.clientX - this.originalMouseX : 0;
      const movementY = axis !== 'x' ? event.clientY - this.originalMouseY : 0;
      const rect = this.cellSelection.cellRect;
      const newWidth = rect.width + Math.abs(movementX);
      const snapWidth = Math.max(rect.width, Math.round(newWidth / rect.width) * rect.width);
      const newHeight = rect.height + Math.abs(movementY);
      const snapHeight = Math.max(rect.height, Math.round(newHeight / rect.height) * rect.height);
      let left = rect.left;
      let top = rect.top;
      if (movementX < 0) {
        left = rect.left + rect.width - snapWidth;
      }
      if (movementY < 0) {
        top = rect.top + rect.height - snapHeight;
      }

      // Resize the shadow element
      rectElement.style.top = top + 'px';
      rectElement.style.left = left + 'px';
      rectElement.style.width = snapWidth + 'px';
      rectElement.style.height = snapHeight + 'px';
    }
  }

  @HostListener('document:mouseup', ['$event'])
  async onMouseUp(event: MouseEvent) {
    // End of cell selection
    if (this.cellSelection) {
      const rectElement = this.cellSelection.divElement;
      const originalRect = this.cellSelection.cellRect;
      if (rectElement && originalRect) {
        event.preventDefault();
        event.stopPropagation();
        if (this.cellSelection.validating) return; // Waiting validation end

        this.cellSelection.validating = true;
        setTimeout(() => {
          this.cellSelection.resizing = false;
        }, 100);

        const movementX = this.cellSelection.axis !== 'y' ? event.clientX - this.originalMouseX : 0;
        const movementY = this.cellSelection.axis !== 'x' ? event.clientY - this.originalMouseY : 0;
        const actualRect = rectElement.getBoundingClientRect();
        const colspan = (actualRect.width / originalRect.width) * (movementX >= 0 ? 1 : -1);
        const rowspan = (actualRect.height / originalRect.height) * (movementY >= 0 ? 1 : -1);
        if (colspan !== 0 || rowspan !== 0) {
          this.cellSelection.colspan = colspan;
          this.cellSelection.rowspan = rowspan;
          const event = { colspan, rowspan, columnName: this.cellSelection.columnName, row: this.cellSelection.row };
          try {
            const validate = await this.validate(event);
            if (validate) {
              console.debug(`Applying colspan=${colspan} rowspan=${rowspan}`);
              this.onMouseEnd(event);
              return;
            }
          } catch (err) {
            console.error(err);
          }
        }
      }

      this.clearCellSelection();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.resizeCellSelection(this.cellSelection, 'cell');
    this.resizeCellSelection(this.cellClipboard, 'clipboard');
  }

  protected resizeCellSelection(cellSelection: TableCellSelection, name: string) {
    if (!cellSelection) return;
    // DEBUG
    console.debug(`${this.logPrefix}Resizing ${name} selection...`);

    const cellElement = cellSelection.cellElement;
    const divElement = cellSelection.divElement;
    const originalRect = cellSelection.cellRect;
    if (cellElement && divElement && originalRect) {
      const colspan = cellSelection.colspan;
      const rowspan = cellSelection.rowspan;
      const containerElement = this.tableContainerElement;
      const containerRect = containerElement.getBoundingClientRect();
      const cellRect = cellElement.getBoundingClientRect();

      const newWidth = cellRect.width * Math.abs(colspan);
      const newHeight = cellRect.height * Math.abs(rowspan);

      let left = cellRect.left + (containerElement.scrollLeft || 0) - containerRect.left;
      let top = cellRect.top + (containerElement.scrollTop || 0);
      if (colspan < 0) {
        left = cellRect.left + cellRect.width - newWidth;
      }
      if (rowspan < 0) {
        top = cellRect.top + cellRect.height - newHeight;
      }

      // DEBUG
      console.debug(`${this.logPrefix}Resizing to top=${top} left=${left} width=${newWidth} height=${newHeight}`);

      // Resize the shadow element
      divElement.style.top = top + 'px';
      divElement.style.left = left + 'px';
      divElement.style.width = newWidth + 'px';
      divElement.style.height = newHeight + 'px';

      // this.cellSelection.rect = {
      //   top: cellRect.top + (containerElement.scrollTop || 0),
      //   left: cellRect.left + (containerElement.scrollLeft || 0) - containerRect.left,
      //   width: cellRect.width,
      //   height: cellRect.height,
      // };
    }
  }

  protected async validate(event: { colspan: number; rowspan: number }): Promise<boolean> {
    // const confirmed = this.confirmEditCreate();
    // if (!confirmed) return false;

    // TODO display merge/opts menu
    //await sleep(100);

    return true;
  }

  protected onMouseEnd(event: { colspan: number; rowspan: number }) {
    // Vertical copy
    if (event.rowspan === 1 && event.colspan > 1 && this.cellSelection.axis === 'x') {
      return this.copyVertically(this.cellSelection?.row, this.cellSelection.columnName, event.colspan);
    }

    return true;
  }

  async clickRow(event: Event | undefined, row: AsyncTableElement<ActivityMonth>): Promise<boolean> {
    this.closeContextMenu();

    if (event?.defaultPrevented || !this.canEdit) return false; // Skip

    // DEBUG
    console.debug(`${this.logPrefix}Click on a row [resizing=${this.cellSelection?.resizing || false}]`);

    // If cell selection is resizing: skip
    if (this.cellSelection?.resizing) return false;

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

      this.startListenRowFormChanges(row.validator);
    } else {
      row.validator.markAsPristine();
      // Update view
      if (opts?.emitEvent !== false) this.markForCheck();
    }
  }

  addMetierBlock(event?: UIEvent, opts?: { emitEvent?: boolean; updateRows?: boolean }) {
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
        toggle: (event: UIEvent) => this.toggleMainBlock(event, `metier${rankOrder}`),
      },
      ...new Array(newFishingAreaCount).fill(null).flatMap((_, faIndex) => {
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
            toggle: (event: UIEvent) => this.toggleMainBlock(event, `metier${rankOrder}FishingArea${faRankOrder}`),
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
            toggle: (event: UIEvent) => this.toggleCoastGradientBlock(event, rankOrder, faRankOrder),
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
    this.metierCount = newMetierCount;

    // Force to update the edited row
    if (this.editedRow) {
      this.onPrepareRowForm(this.editedRow.validator, { listenChanges: false });
    }

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

    this.markAsDirty();

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
      this.startListenRowFormChanges(form);
    }
  }

  protected startListenRowFormChanges(form: UntypedFormGroup) {
    // Stop previous listener
    this.rowSubscription?.unsubscribe();

    // DEBUG
    console.debug(this.logPrefix + 'Start listening row form...', form);

    this.rowSubscription = new Subscription();
    this.rowSubscription.add(
      ActivityMonthValidators.startListenChanges(form, this.pmfms, {
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
          this.clearCellSelection();
          this.clearClipboard(null, { clearContext: !!this.cellClipboard });
          if (form.dirty) this.markAsDirty();
        })
    );
    this.rowSubscription.add(() => console.debug(this.logPrefix + 'Stop listening row form...', form));
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

  toggleMainBlock(event: UIEvent, key: string) {
    if (event?.defaultPrevented) return; // Skip^
    event?.preventDefault();

    const blockColumns = this.dynamicColumns.filter((col) => col.key.startsWith(key));
    if (isEmptyArray(blockColumns)) return; // Skip

    const masterColumn = blockColumns[0];
    if (isNil(masterColumn.expanded)) return; // Skip is not an expandable column

    console.debug(this.logPrefix + 'Toggling block #' + key);

    // Toggle expanded
    masterColumn.expanded = !masterColumn.expanded;

    // Show/Hide sub columns
    blockColumns.slice(1).forEach((col) => (col.hidden = !masterColumn.expanded));

    // Expanded state for all columns to fix divergences states
    blockColumns.forEach((col) => {
      if (isNotNil(col.expanded)) {
        col.expanded = masterColumn.expanded;
      }
    });
  }

  toggleCoastGradientBlock(event: UIEvent, rankOrder: number, faRankOrder: number) {
    if (event?.defaultPrevented) return; // Skip^
    event?.preventDefault();

    const columnsToggle = [
      `metier${rankOrder}FishingArea${faRankOrder}distanceToCoastGradient`,
      `metier${rankOrder}FishingArea${faRankOrder}depthGradient`,
      `metier${rankOrder}FishingArea${faRankOrder}nearbySpecificArea`,
    ];

    const blockColumns = this.dynamicColumns.filter((col) => columnsToggle.some((toggle) => col.key.includes(toggle)));
    if (isEmptyArray(blockColumns)) return; // Skip

    const masterColumn = blockColumns[0];
    if (isNil(masterColumn.expanded)) return; // Skip is not an expandable column

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

  markAsDirty(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    if (this.loading) return; // Skip while loading
    super.markAsDirty(opts);
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
    //if (event?.defaultPrevented) return;
    //event?.stopPropagation();

    console.debug(`${this.logPrefix}Copy event`, event);

    if (this.cellSelection && (this.cellSelection?.colspan !== 0 || this.cellSelection?.rowspan !== 0)) {
      // Copy to clipboard
      await this.copyCellSelectionToClipboard(this.cellSelection);

      this.clearCellSelection();

      this.markForCheck();
    } else {
      this.copyCellToClipboard(this.editedRow, this.focusColumn);
    }
  }

  protected async copyCellSelectionToClipboard(cellSelection?: TableCellSelection): Promise<boolean> {
    cellSelection = cellSelection || this.cellSelection;
    if (!cellSelection) return false; // Nothing to copy

    const { row, columnName, rowspan, colspan } = cellSelection;
    if (!row || !columnName) return false; // Missing row or columnName

    console.debug(`${this.logPrefix}Copy cell selection to clipboard`);

    // Find selected months
    const startRowIndex = colspan >= 0 ? row.id : row.id + colspan + 1;
    const endRowIndex = colspan >= 0 ? startRowIndex + colspan : row.id + 1;
    const sourceMonths = this.dataSource
      .getRows()
      .slice(startRowIndex, endRowIndex)
      .map((row) => row.currentData);

    // Find selected paths
    const focusColumnIndex = this.displayedColumns.findIndex((columnName) => columnName === cellSelection.columnName);
    const startColumnIndex = rowspan > 0 ? focusColumnIndex : focusColumnIndex + rowspan;
    const endColumnIndex = rowspan > 0 ? startColumnIndex + rowspan : focusColumnIndex + 1;
    const sourcePaths = this.displayedColumns
      .slice(startColumnIndex, endColumnIndex)
      .map((columnName) => this.getColumnPath(columnName))
      .filter(isNotNil);

    // DEBUG
    console.debug(`${this.logPrefix}Source months:`, sourceMonths);
    console.debug(`${this.logPrefix}Source paths`, sourcePaths);

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

    this.context.clipboard = {
      data: {
        months: targetMonths,
        paths: sourcePaths,
      },
    };

    const rectElement = this.cellClipboardDiv.nativeElement;
    rectElement.style.top = cellSelection.divElement.style.top;
    rectElement.style.left = cellSelection.divElement.style.left;
    rectElement.style.width = cellSelection.divElement.style.width;
    rectElement.style.height = cellSelection.divElement.style.height;

    this.cellClipboard = {
      cellElement: cellSelection.cellElement,
      divElement: rectElement,
      cellRect: cellSelection.cellRect,
      row,
      columnName,
      rowspan,
      colspan,
    };
    this.markForCheck();
  }

  protected copyCellToClipboard(sourceRow: AsyncTableElement<ActivityMonth>, columnName: string) {
    if (!sourceRow || !columnName) return; // Skip

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
    const months = this.context.clipboard?.data?.months;
    const paths = this.context.clipboard?.data?.paths;
    if (isEmptyArray(months) || isEmptyArray(paths)) return false; // Empty clipboard

    const targetRow = this.cellSelection?.row || this.editedRow;
    const targetColumnName = this.cellSelection?.columnName || this.focusColumn;
    if (!targetRow || isNilOrBlank(targetColumnName)) return false; // Unknown cell target

    const startRowIndex = targetRow.id;
    const endRowIndex = startRowIndex + months.length;

    // DEBUG
    console.debug(`${this.logPrefix}Paste ${months.length} month(s) from clipboard... start=${startRowIndex}, end=${endRowIndex}`, paths);

    const confirmed = await this.confirmEditCreate(null, targetRow);
    if (!confirmed) {
      await this.cancelOrDelete(null, targetRow);
    }

    // Check target column is compatible
    const sourcePath = paths[0];
    const sourcePathSuffix = lastArrayValue(sourcePath.split('.'));
    const targetPathSuffix = lastArrayValue(this.getColumnPath(targetColumnName)?.split('.'));
    if (sourcePathSuffix !== targetPathSuffix) {
      Toasts.show(this.toastController, this.translate, {
        type: 'error',
        message: 'ACTIVITY_CALENDAR.ERROR.CANNOT_PASTE_HERE',
      });
      return;
    }

    const targetRows = this.dataSource.getRows().slice(startRowIndex, endRowIndex);
    for (let i = 0; i < targetRows.length; i++) {
      const source = months[i];
      const row = targetRows[i];
      const form = this.validatorService.getFormGroup(row.currentData);
      this.onPrepareRowForm(form, { listenChanges: false });
      const isActiveControl = form.get('isActive');
      let isActive = toNumber(source.isActive, isActiveControl.value) === VesselUseFeaturesIsActiveEnum.ACTIVE;
      paths.forEach((path) => {
        const sourceValue = getPropertyByPath(source, path);
        isActive = isActive || (isNotNil(sourceValue) && path !== 'isActive' && path !== 'basePortLocation');
        if (isActive) {
          // TODO enable
          isActiveControl.enable({ emitEvent: false });
          isActiveControl.setValue(VesselUseFeaturesIsActiveEnum.ACTIVE, { emitEvent: false });
          this.onPrepareRowForm(form, { listenChanges: false });
        }
        const control = this.findOrCreateControl(form, path);
        control.enable({ emitEvent: false });
        control.setValue(sourceValue);
      });
      //await AppFormUtils.waitWhilePending(form);
      await this.updateEntityToTable(form.value, row, { confirmEdit: true });
    }

    // DEBUG
    console.debug(`${this.logPrefix}Paste clipboard [OK]`);

    this.markAsDirty({ emitEvent: false });
    this.markForCheck();
  }

  protected clearCellSelection() {
    this.cellSelection = null;
    this.originalMouseY = null;
    this.originalMouseX = null;
  }

  protected clearClipboard(event?: Event, opts?: { clearContext?: boolean }) {
    event?.preventDefault();
    event?.stopPropagation();

    this.cellClipboard = null;
    if (opts?.clearContext !== false) {
      this.context.clipboard = null;
    }
    this.markForCheck();
  }

  protected async onContextMenu(
    event: MouseEvent,
    cell?: HTMLElement | HTMLTableCellElement,
    row?: AsyncTableElement<ActivityMonth>,
    columnName?: string
  ) {
    row = row || this.dataSource?.getSingleEditingRow();
    columnName = columnName || this.focusColumn;
    if (!row || !columnName) {
      event.preventDefault();
      return; // Skip
    }

    event.preventDefault();

    // Select current cell
    if (this.cellSelection?.row !== row || this.cellSelection?.columnName !== columnName) {
      this.clearCellSelection();
      await this.onMouseDown(event, cell as HTMLTableCellElement, row, columnName);
      await this.onMouseUp(event);
    }

    this.menuTrigger.openMenu();
    const contextMenu = document.querySelector('.context-menu') as HTMLElement;
    contextMenu.style.position = 'fixed';
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
  }

  protected closeContextMenu() {
    if (this.menuTrigger.menuOpened) {
      this.menuTrigger.closeMenu();
    }
  }
}
