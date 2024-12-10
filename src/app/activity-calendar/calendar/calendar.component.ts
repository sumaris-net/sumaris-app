import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  inject,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  Alerts,
  AppAsyncTable,
  AppFormArray,
  AppFormUtils,
  changeCaseToUnderscore,
  DateUtils,
  EntityUtils,
  equals,
  getPropertyByPath,
  HAMMER_TAP_TIME,
  HammerTapEvent,
  IEntitiesService,
  InMemoryEntitiesService,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  IStatus,
  lastArrayValue,
  LoadResult,
  LocalSettingsService,
  MatAutocompleteFieldConfig,
  PlatformService,
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
import { distinctUntilChanged, fromEvent, Observable, Subject, Subscription, tap } from 'rxjs';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AcquisitionLevelCodes, LocationLevelGroups, LocationLevelIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { UntypedFormGroup } from '@angular/forms';
import { VesselUseFeaturesIsActiveEnum } from '@app/activity-calendar/model/vessel-use-features.model';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { METIER_DEFAULT_FILTER } from '@app/referential/services/metier.service';
import { BaseMeasurementsTableConfig, BaseMeasurementsTableState } from '@app/data/measurement/measurements-table.class';
import { MeasurementsTableValidatorOptions } from '@app/data/measurement/measurements-table.validator';
import { CalendarUtils } from '@app/activity-calendar/calendar/calendar.utils';
import { Moment } from 'moment';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { PMFM_ID_REGEXP, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { debounceTime, filter, map } from 'rxjs/operators';
import { Metier } from '@app/referential/metier/metier.model';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { ActivityCalendarContextService } from '../activity-calendar-context.service';
import { MatMenuTrigger } from '@angular/material/menu';
import { BaseMeasurementsAsyncTable } from '@app/data/measurement/measurements-async-table.class';
import { AsyncTableElement } from '@e-is/ngx-material-table';
import { VesselOwnerPeridodService } from '@app/vessel/services/vessel-owner-period.service';
import { VesselOwner } from '@app/vessel/services/model/vessel-owner.model';
import { IUseFeaturesUtils } from '../model/use-features.model';
import { VesselOwnerPeriodFilter } from '@app/vessel/services/filter/vessel.filter';
import { SelectionModel } from '@angular/cdk/collections';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';
import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import { Mutex } from '@app/shared/async/mutex.class';
import { FetchPolicy } from '@apollo/client/core';
import { ExpertiseAreaUtils } from '@app/referential/expertise-area/expertise-area.utils';
import { IExpertiseAreaProperties } from '@app/referential/expertise-area/expertise-area.model';

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
const NAVIGATION_KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Tab'];
const NUMERIC_KEYS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Backspace'];
const FISHING_AREA_PATH_REGEXP = /^gearUseFeatures\.(\d+)\.fishingAreas\.(\d+)$/;
export const ACTIVITY_MONTH_READONLY_COLUMNS = ['month', 'program', 'vesselOwner', 'registrationLocation'];
export const ACTIVITY_MONTH_START_COLUMNS = [...ACTIVITY_MONTH_READONLY_COLUMNS, 'isActive', 'basePortLocation'];
export const ACTIVITY_MONTH_END_COLUMNS = [...DYNAMIC_COLUMNS];
export const GEAR_USE_FEATURE_INDEX_REGEXP = /gearUseFeatures\.(\d+)/;

export interface IIsActive extends IStatus {
  statusId: number;
}

export const IsActiveList: Readonly<IIsActive[]> = Object.freeze([
  {
    id: VesselUseFeaturesIsActiveEnum.ACTIVE,
    icon: 'checkmark',
    label: 'ACTIVITY_CALENDAR.EDIT.IS_ACTIVE_ENUM.ENABLE',
    statusId: StatusIds.ENABLE,
  },
  {
    id: VesselUseFeaturesIsActiveEnum.INACTIVE,
    icon: 'close',
    label: 'ACTIVITY_CALENDAR.EDIT.IS_ACTIVE_ENUM.DISABLE',
    statusId: StatusIds.ENABLE,
  },
  // The value 'Nonexistent' is not relevant.
  {
    id: VesselUseFeaturesIsActiveEnum.NOT_EXISTS,
    icon: 'close',
    label: 'ACTIVITY_CALENDAR.EDIT.IS_ACTIVE_ENUM.NOT_EXISTS',
    statusId: StatusIds.DISABLE,
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
  vesselOwners: VesselOwner[][];
  dynamicColumns: ColumnDefinition[];
  metierCount: number;
  validRowCount: number;
  hasClipboard: boolean;
  availablePrograms: ReferentialRef[];
  hasConflict: boolean;
  expertiseAreaProperties: IExpertiseAreaProperties;
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

export function isSingleCellSelection(selection: TableCellSelection) {
  return selection && selection.rowspan === 1 && selection.rowspan === 1;
}

export const CALENDAR_SETTINGS_ENUM = {
  COLLAPSE_AFTER_SAVE_KEY: 'collapseAfterSave',
};

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
    { provide: AppAsyncTable, useExisting: forwardRef(() => CalendarComponent) },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent
  extends BaseMeasurementsAsyncTable<
    ActivityMonth,
    ActivityMonthFilter,
    IEntitiesService<ActivityMonth, ActivityMonthFilter>,
    ActivityMonthValidatorService,
    CalendarComponentState,
    BaseMeasurementsTableConfig<ActivityMonth, CalendarComponentState>,
    ActivityMonthValidatorOptions
  >
  implements OnInit, AfterViewInit, OnDestroy
{
  protected referentialRefService = inject(ReferentialRefService);
  protected debouncedExpandCellSelection$ = new Subject<TableCellSelection<ActivityMonth>>();
  protected debouncedCheckExpertiseArea$ = new Subject<ActivityMonth[] | undefined>();
  protected unauthorizedToast$ = new Subject<void | string>();
  protected confirmingRowMutex = new Mutex();

  @RxStateSelect() protected vesselOwners$: Observable<VesselOwner[][]>;
  @RxStateSelect() protected dynamicColumns$: Observable<ColumnDefinition[]>;
  @RxStateSelect() protected months$: Observable<Moment[]>;
  @RxStateSelect() validRowCount$: Observable<number>;
  @RxStateSelect() hasClipboard$: Observable<boolean>;
  @RxStateSelect() availablePrograms$: Observable<ReferentialRef[]>;
  @RxStateSelect() hasConflict$: Observable<boolean>;
  protected readonly isActiveList = IsActiveList;
  protected readonly isActiveMap = Object.freeze(splitById(IsActiveList));
  protected readonly hiddenColumns = RESERVED_START_COLUMNS;
  protected readonly qualityFlagId = Object.freeze(QualityFlagIds);

  protected rowSubscription: Subscription;
  protected cellSelection: TableCellSelection<ActivityMonth>;
  protected cellClipboard: TableCellSelection<ActivityMonth>;
  protected _children: CalendarComponent[];
  protected showDebugValue = false;
  protected editedRowFocusedElement: HTMLElement;
  protected programSelection = new SelectionModel<ReferentialRef>(true);
  protected readonlyColumnCount: number;
  protected collapseAfterSave: boolean = null;

  @RxStateProperty() vesselOwners: VesselOwner[][];
  @RxStateProperty() dynamicColumns: ColumnDefinition[];
  @RxStateProperty() metierCount: number;
  @RxStateProperty() validRowCount: number;
  @RxStateProperty() hasClipboard: boolean;
  @RxStateProperty() availablePrograms: ReferentialRef[];
  @RxStateProperty() hasConflict: boolean;
  @RxStateProperty() hasDataOutsideExpertiseArea: boolean; // TODO use this property to show an indication somewhere...

  @Output() copyAllClick: EventEmitter<ActivityMonth[]> = new EventEmitter<ActivityMonth[]>();
  @Output() startCellSelection: EventEmitter<void> = new EventEmitter();

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
  @Input() programHeaderLabel: string;
  @Input() showError = true;
  @Input() @RxStateProperty() expertiseAreaProperties: IExpertiseAreaProperties;

  @Input() set month(value: number) {
    this.setFilter(ActivityMonthFilter.fromObject({ ...this.filter, month: value }));
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

  @Input() set showProgram(value: boolean) {
    this.setShowColumn('program', value);
  }

  get showProgram(): boolean {
    return this.getShowColumn('program');
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
    return !this.hasConflict && (!this._children || this._children.findIndex((c) => c.enabled && !c.valid) === -1);
  }

  get invalid(): boolean {
    return this.hasConflict || (this._children && this._children.findIndex((c) => c.enabled && c.invalid) !== -1) || false;
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
    protected platform: PlatformService,
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
        onPrepareRowForm: (form) => this.onPrepareRowForm(form),
        initialState: <CalendarComponentState>{
          requiredStrategy: true,
          requiredGear: false,
          acquisitionLevel: AcquisitionLevelCodes.MONTHLY_ACTIVITY,
          metierCount: 0,
          hasConflict: false,
        },
      }
    );
    this.confirmBeforeCancel = false;
    this.inlineEdition = true;
    this.autoLoad = true;
    this.sticky = true;
    this.defaultCompact = !this.mobile; // compact mode enable by default, on desktop
    this.errorTranslateOptions = { separator: '\n', pathTranslator: this };
    this.excludesColumns = ['program', ...DYNAMIC_COLUMNS];
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
    this.enableCellSelection = toBoolean(this.enableCellSelection, this.style === 'table');
    this.readonlyColumnCount = ACTIVITY_MONTH_READONLY_COLUMNS.filter((c) => !this.excludesColumns.includes(c)).length;

    // Wait enumerations to be set
    await this.referentialRefService.ready();

    this.registerSubscription(
      this.unauthorizedToast$
        .pipe(
          debounceTime(100),
          tap((error) =>
            this.showToast({
              icon: 'warning-outline',
              type: 'warning',
              message: error || 'ACTIVITY_CALENDAR.WARNING.UNAUTHORIZED_ACTION',
            })
          )
        )
        .subscribe()
    );

    const autocompleteBaseConfig = <Partial<MatAutocompleteFieldConfig>>{
      selectInputContentOnFocus: true,
      reloadItemsOnFocus: !this.mobile,
      clearInvalidValueOnBlur: !this.mobile,
      // TODO: to test well
      //previewImplicitValue: !this.mobile,
    };

    this.registerAutocompleteField('basePortLocation', {
      ...autocompleteBaseConfig,
      suggestFn: (value, filter) => this.suggestBasePortLocations(value, filter),
      attributes: this.locationDisplayAttributes,
      panelClass: 'min-width-large',
    });

    this.registerAutocompleteField('metier', {
      ...autocompleteBaseConfig,
      suggestFn: (value, filter) => this.suggestMetiers(value, filter),
      displayWith: (obj) => obj?.label || '',
      panelClass: 'min-width-large',
    });

    this.registerAutocompleteField('fishingAreaLocation', {
      ...autocompleteBaseConfig,
      suggestFn: (value, filter) => this.suggestFishingAreaLocations(value, filter),
      displayWith: (obj) => obj?.label || '',
      panelClass: 'mat-select-panel-fit-content',
    });
    this.registerAutocompleteField('distanceToCoastGradient', {
      ...autocompleteBaseConfig,
      suggestFn: (value, filter) => this.suggestDistanceToCoastGradient(value, filter),
      attributes: ['name'],
      panelClass: 'mat-select-panel-fit-content',
    });
    this.registerAutocompleteField('depthGradient', {
      ...autocompleteBaseConfig,
      suggestFn: (value, filter) => this.suggestDepthGradient(value, filter),
      attributes: ['name'],
      panelClass: 'mat-select-panel-fit-content',
    });
    this.registerAutocompleteField('nearbySpecificArea', {
      ...autocompleteBaseConfig,
      suggestFn: (value, filter) => this.suggestNearbySpecificArea(value, filter),
      attributes: ['name'],
      panelClass: 'mat-select-panel-fit-content',
    });

    this._state.connect(
      'validRowCount',
      this._dataSource.rowsSubject.pipe(map((rows) => rows.map((row) => row.currentData).filter((month) => isNotNil(month?.isActive)).length))
    );

    this._state.hold(this.availablePrograms$, (programs: ReferentialRef[]) => {
      this.programSelection.clear(false);
      if (isNotEmptyArray(programs)) this.programSelection.select(...programs);
    });

    this.registerSubscription(
      this.programSelection.changed
        .pipe(
          debounceTime(250),
          map(() => this.programSelection.selected?.map((p) => p?.label).filter(isNotNil)),
          distinctUntilChanged(equals)
        )
        .subscribe((programLabels) => {
          const filter = this.filter || new ActivityMonthFilter();
          if (!equals(filter.programLabels, programLabels)) {
            filter.programLabels = programLabels;
            this.setFilter(filter);
            this.collapseEmptyMetierBlock(programLabels);
            // Hide cell selection, because some columns can have disappeared
            this.removeCellSelection();
            this.clearClipboard(null, { clearContext: false });
          }
        })
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

    this._state.hold(this.debouncedExpandCellSelection$.pipe(debounceTime(250)), (cellSelection) => this.expandCellSelection(cellSelection));

    this._state.hold(this.debouncedCheckExpertiseArea$.pipe(debounceTime(650)), (months) =>
      this.checkDataExpertiseArea(months, { debounced: false })
    );

    // Check data against expertise area, if changed
    this._state.hold(
      this._state.select('expertiseAreaProperties').pipe(
        distinctUntilChanged(),
        filter(() => this.loaded)
      ),
      () => this.checkDataExpertiseArea()
    );

    this._state.hold(this.programLabel$, () => {
      // Update the settings id, as program could have changed
      this.settingsId = this.generateTableId();
      this.restoreCollapseAfterSave();
    });
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
  }

  initTableContainer(element: any) {
    if (this.style === 'accordion') return; // Skip

    super.initTableContainer(element, { defaultShortcuts: false });

    // Add shortcuts
    if (!this.mobile) {
      console.debug(this.logPrefix + `Add table shortcuts`);

      this.registerSubscription(
        this.hotkeys
          .addShortcut({
            keys: `${this.hotkeys.defaultControlKey}.c`,
            description: 'COMMON.BTN_COPY',
            preventDefault: false /*keep copy in <input>*/,
          })
          .pipe(filter(() => this.loaded && !!this.cellSelection))
          .subscribe((event) => this.copy(event))
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({
            keys: `${this.hotkeys.defaultControlKey}.v`,
            description: 'COMMON.BTN_PASTE',
            preventDefault: false /*keep paste in <input>*/,
          })
          .pipe(filter(() => !this.disabled && this.canEdit))
          .subscribe((event) => this.pasteFromClipboard(event))
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: `${this.hotkeys.defaultControlKey}.x`, description: 'COMMON.BTN_CUT', preventDefault: false /*keep past in <input>*/ })
          .pipe(filter(() => !this.disabled && this.canEdit))
          .subscribe((event) => this.cut(event))
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'escape', description: 'COMMON.BTN_CLEAR_CLIPBOARD', preventDefault: true })
          .pipe(filter(() => !!this.cellClipboard))
          .subscribe((event) => this.clearClipboard(event))
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'delete', description: 'COMMON.BTN_CLEAR_SELECTION', preventDefault: false /*keep delete in <input>*/ })
          .subscribe((event) => this.clearCellSelection(event))
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'backspace', description: 'COMMON.BTN_CLEAR_SELECTION', preventDefault: false /*keep delete in <input>*/ })
          .subscribe((event) => this.clearCellSelection(event))
      );

      this.registerSubscription(
        fromEvent(element, 'scroll').subscribe((event: any) => {
          this.onResize();
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
    this.confirmingRowMutex.close();
  }

  async updateView(res: LoadResult<ActivityMonth>, opts?: { emitEvent?: boolean }): Promise<void> {
    await super.updateView(res, opts);

    // Update has conflict
    if (res?.data) this.hasConflict = this.hasSomeConflictualMonth(res?.data);
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
          this.addMetierBlock(null, { emitEvent: true, updateRows: false, scrollToBottom: false });
        }

        // Set data service
        this.memoryDataService.value = data;

        // load vesselOwner
        await this.loadVesselOwner(data);

        // Update has conflict
        this.hasConflict = this.hasSomeConflictualMonth(data);

        // Set flags on referential outside expertise area (#732)
        await this.checkDataExpertiseArea();

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
              month,
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

        // Clear empty blocks
        (months || []).forEach((month) => {
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

  async deleteConflictualMonth(event?: Event, row?: AsyncTableElement<ActivityMonth>): Promise<boolean> {
    row = row || this.editedRow;
    if (!row || event.defaultPrevented) return true; // no row to confirm

    event?.preventDefault();
    event?.stopPropagation();

    if (this.debug) console.debug(this.logPrefix + `Deleting conflictual month #${row.currentData.month}...`, row);

    const confirmed = await Alerts.askConfirmation('ACTIVITY_CALENDAR.CONFIRM.DELETE_CONFLICT', this.alertCtrl, this.translate);
    if (!confirmed) return false; // User cancelled

    // Remove solved row
    const remoteRowId = row.id;
    const remoteUpdateDate = row.currentData.updateDate;
    const deleted = await row.delete();
    if (!deleted) return false;

    // Update month updateDate with remote update date to avoid conflict when save
    await this.dataSource.waitIdle();
    const localRow = this.dataSource.getRow(remoteRowId - 1);
    if (localRow.validator) {
      localRow.validator.patchValue({ updateDate: remoteUpdateDate }, { emitEvent: false });
    } else {
      localRow.currentData.updateDate = remoteUpdateDate;
    }

    if (this.debug) console.debug(this.logPrefix + `Deleting conflictual month #${row.currentData.month} [OK]`);

    this.markAsDirty();
  }

  // TODO This not work
  // async keepRemoteData(_?: Event, row?: AsyncTableElement<ActivityMonth>) {
  //   row = row || this.editedRow;
  //   if (!row || event.defaultPrevented) return true; // no row to confirm

  //   event?.preventDefault();
  //   event?.stopPropagation();

  //   const confirmed = await Alerts.askConfirmation('ACTIVITY_CALENDAR.CONFIRM.KEEP_REMOTE', this.alertCtrl, this.translate);
  //   if (!confirmed) return false; // User cancelled

  //   if (this.debug) console.debug(this.logPrefix + 'Keep remote', row);

  //   const localRowIndex = this.value.findIndex(
  //     (month) => month.month === row.currentData.month && month.qualityFlagId !== QualityFlagIds.CONFLICTUAL
  //   );
  //   const localRow = this.value.splice(localRowIndex, 1)[0];
  //   const data = row.currentData;
  //   data.qualityFlagId = localRow.qualityFlagId;
  //   data.canEdit = localRow.canEdit;
  //   await this.updateEntityToTable(data, row), { confirmEdit: false };

  //   this.onRefresh.emit();
  // }

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

    const { data } = await this.vesselOwnerPeriodService.loadAll(0, 100, 'startDate', 'asc', filter);

    this.vesselOwners = months.map((month) => IUseFeaturesUtils.filterByPeriod(data, month).map((vop) => vop.vesselOwner));
  }

  async waitForChildren(opts?: WaitForOptions) {
    if (this.style === 'accordion' && isEmptyArray(this._children)) {
      await waitFor(() => this.monthCalendars.length === 12, { stop: this.destroySubject, stopError: false, ...opts });
      this._children = this.monthCalendars.toArray();
    }
  }

  async onMouseDown(event: MouseEvent, cellElement: HTMLElement, row: AsyncTableElement<any>, columnName: string, axis?: 'x' | 'y') {
    if (!cellElement) throw new Error('Missing cell element');

    event.preventDefault();
    event.stopPropagation();

    const divElement = this.cellSelectionDivRef.nativeElement as HTMLDivElement;
    const containerElement = this.tableContainerElement;
    if (!divElement || !containerElement) return false;

    this.closeContextMenu();

    // DEBUG
    if (this.debug) console.debug(`${this.logPrefix}Start cell selection... [confirm edited row}`);

    // Confirmed previous edited row
    const confirmed = await this.confirmEditCreate();
    if (!confirmed) return false;

    if (this.cellSelection) {
      if (this.cellSelection.validating) return false;

      // If action comes from the bottom-right cell, then extend the current selection
      if (!axis && this.isRightAndBottomCellSelected(this.cellSelection, row, columnName)) {
        this.cellSelection.resizing = true;
        return true;
      }

      // Else, remove the previous cell selection
      this.removeCellSelection({ emitEvent: false });
    }

    // DEBUG
    if (this.debug) console.debug(`${this.logPrefix}Start cell selection... [row confirmed}`);

    this.cellSelection = {
      divElement,
      cellElement,
      row,
      columnName,
      axis,
      originalMouseX: event.clientX + containerElement.scrollLeft,
      originalMouseY: event.clientY + containerElement.scrollTop,
      colspan: 1,
      rowspan: 1,
      resizing: true,
    };

    // Resize the cell selection
    this.resizeCellSelection(this.cellSelection, 'cell');

    // Emit start cell selection event
    this.startCellSelection.next();

    return true;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const cellSelection = this.cellSelection;
    const containerElement = this.tableContainerElement;
    if (!cellSelection?.resizing || cellSelection.validating || event.defaultPrevented) return; // Ignore

    // DEBUG
    if (this.debug) console.debug(this.logPrefix + `Moving cell selection (validating: ${cellSelection?.validating || false})`);

    const { axis, cellRect, row } = cellSelection;
    if (!cellRect) return; // Missing cellRect

    const movementX = axis !== 'y' ? event.clientX + containerElement.scrollLeft - cellSelection.originalMouseX : 0;
    const movementY = axis !== 'x' ? event.clientY + containerElement.scrollTop - cellSelection.originalMouseY : 0;

    let colspan = Math.max(cellRect.width, Math.round((cellRect.width + Math.abs(movementX)) / cellRect.width) * cellRect.width) / cellRect.width;
    let rowspan =
      Math.max(cellRect.height, Math.round((cellRect.height + Math.abs(movementY)) / cellRect.height) * cellRect.height) / cellRect.height;

    // Manage negative
    if (movementX < 0 && colspan > 1) colspan = -colspan;
    if (movementY < 0 && rowspan > 1) rowspan = -rowspan;

    // Check row limits
    const rowIndex = row.id;
    if (colspan >= 0) {
      // Upper limit
      colspan = Math.min(colspan, this.visibleRowCount - rowIndex);
    } else {
      // Lower limit
      colspan = Math.max(colspan, -1 * (rowIndex + 1));
    }

    // Check col limits
    const columnIndex = this.displayedColumns.indexOf(cellSelection.columnName);
    if (rowspan >= 0) {
      // Upper limit
      rowspan = Math.min(rowspan, this.displayedColumns.length - RESERVED_END_COLUMNS.length - columnIndex);
    } else {
      // Lower limit
      rowspan = Math.max(rowspan, -1 * (columnIndex + 1 - RESERVED_START_COLUMNS.length - this.readonlyColumnCount));
    }

    if (cellSelection.colspan !== colspan || cellSelection.rowspan !== rowspan) {
      cellSelection.colspan = colspan;
      cellSelection.rowspan = rowspan;

      // Apply resize
      this.resizeCellSelection(cellSelection, 'cell', { debouncedExpansion: true });
    }
    // Same cell selection: log if debug
    else if (this.debug) {
      console.debug(this.logPrefix + 'Cell selection unchanged: skipping');
    }
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
    if (this.debug) console.debug(`${this.logPrefix}Validating cell selection`);

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

  @HostListener('document:resize')
  onResize() {
    if (this.debug) console.debug(this.logPrefix + 'Resizing...');
    this.closeContextMenu();
    this.resizeCellSelection(this.cellSelection, 'cell', { emitEvent: false });
    this.resizeCellSelection(this.cellClipboard, 'clipboard', { emitEvent: false });
    this.markForCheck();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.cellSelection || event.defaultPrevented || this.dataSource.hasSomeEditingRow()) return; // Skip

    // Press enter on cell : start editing row
    if (event.key === 'Enter' && isSingleCellSelection(this.cellSelection)) {
      if (this.editedRow) return; // Keep default enter behavior, when editing a row
      return this.dblClickCell(event, this.cellSelection.row, this.cellSelection.columnName);
    }

    // Navigation key (e.g. Tab, etc)
    if (NAVIGATION_KEYS.includes(event.key)) {
      this.onNavigationKeyPress(event, this.cellSelection.row, this.cellSelection.columnName);
      return;
    }

    // Numeric key
    if (NUMERIC_KEYS.includes(event.key) && isSingleCellSelection(this.cellSelection)) {
      this.onNumericKeyPress(event, this.cellSelection.row, this.cellSelection.columnName);
      return;
    }
  }

  protected onNavigationKeyPress(event: KeyboardEvent, row: AsyncTableElement<ActivityMonth>, columnName: string) {
    if (!row || event.defaultPrevented) return; // Skip

    let rowIndex = row.id || 0;
    let columnIndex = Math.max(
      this.displayedColumns.findIndex((col) => col === columnName),
      ACTIVITY_MONTH_READONLY_COLUMNS.length
    );

    let colspan = 1;
    let rowspan = 1;
    if (!event.ctrlKey && !event.shiftKey) {
      switch (event.key) {
        case 'ArrowUp':
          columnIndex -= 1;
          break;
        case 'ArrowDown':
          columnIndex += 1;
          break;
        case 'ArrowLeft':
          rowIndex -= 1;
          break;
        case 'ArrowRight':
          rowIndex += 1;
          break;
        case 'Tab':
          // If editing row, skip (keep default Tab behavior)
          if (this.editedRow) return;

          columnIndex += 1;
          event.preventDefault(); // Avoid to start editing
          break;
        default:
          console.warn(this.logPrefix + 'Unknown navigation event:', event);
          return;
      }
    }

    // Shift + <arrow|tab> => extend the selection
    else if (!event.ctrlKey && event.shiftKey) {
      switch (event.key) {
        case 'ArrowUp':
          colspan = this.cellSelection.colspan;
          rowspan = this.cellSelection.rowspan - 1;
          if (rowspan === 0) {
            rowspan = -2;
          }
          break;
        case 'ArrowDown':
          colspan = this.cellSelection.colspan;
          rowspan = this.cellSelection.rowspan + 1;
          if (rowspan === 0) {
            rowspan = 2;
          }
          break;
        case 'ArrowLeft':
          rowspan = this.cellSelection.rowspan;
          colspan = this.cellSelection.colspan - 1;
          if (colspan === 0) {
            colspan = -2;
          }
          break;
        case 'ArrowRight':
          rowspan = this.cellSelection.rowspan;
          colspan = this.cellSelection.colspan + 1;
          if (colspan === 0) {
            colspan = 2;
          }
          break;
        case 'Tab':
          // If editing row, ignore (keep default Tab behavior)
          if (this.editedRow) return;

          columnIndex -= 1;
          event.preventDefault(); // Avoid to start editing
          break;
        default:
          console.warn(this.logPrefix + 'Unknown navigation event:', event);
          return;
      }
    }

    // Ctrl + <arrow>
    else if (event.ctrlKey) {
      switch (event.key) {
        case 'ArrowUp':
          columnIndex = RESERVED_START_COLUMNS.length + this.readonlyColumnCount;
          break;
        case 'ArrowDown':
          columnIndex = this.displayedColumns.length - 1 - RESERVED_END_COLUMNS.length;
          this.expandAll();
          break;
        case 'ArrowLeft':
          rowIndex = 0; // January
          break;
        case 'ArrowRight':
          rowIndex = 11; // December
          break;
        default:
          // If editing row, ignore
          if (this.editedRow) return;

          console.warn(this.logPrefix + `Unknown navigation key: ${event.key}`);
          return;
      }
    }

    // DEBUG
    console.debug(this.logPrefix + `Navigation keydown: columnIndex=${columnIndex} rowIndex=${rowIndex}`);

    const targetRow = this.dataSource.getRow(rowIndex);
    // eslint-disable-next-line prefer-const
    const { columnName: targetColumnName, cellElement } = this.getCellElement(rowIndex, columnIndex);
    if (!cellElement || !row || ACTIVITY_MONTH_READONLY_COLUMNS.includes(targetColumnName) || RESERVED_END_COLUMNS.includes(targetColumnName)) return;

    this.cellSelection = {
      divElement: this.cellSelectionDivRef.nativeElement,
      cellElement,
      row: targetRow,
      columnName: targetColumnName,
      colspan,
      rowspan,
      resizing: false,
    };

    // Set new focus column
    this.focusColumn = columnName;

    this.expandCellSelection(this.cellSelection);

    this.resizeCellSelection(this.cellSelection, 'cell');

    // Emit cell selection changes
    this.startCellSelection.next();

    // Scroll to selection
    if (event.ctrlKey) {
      sleep(250).then(() => this.scrollToElement(cellElement, 'auto'));
    }
  }

  protected onNumericKeyPress(event: KeyboardEvent, row: AsyncTableElement<ActivityMonth>, columnName: string) {
    if (!this.inlineEdition || !event || !row?.validator || !columnName) return;

    // Check if the selected cell is on a numeric pmfm
    const pmfm = this.pmfms?.find((p) => p.id.toString() === columnName);
    if (!pmfm || !PmfmUtils.isNumeric(pmfm)) return; // Skip if not a numerical pmfm column

    const isActiveControl = row.validator.get('isActive');
    const isActive = isActiveControl?.value === VesselUseFeaturesIsActiveEnum.ACTIVE;
    const pmfmControl = row.validator.get(`measurementValues.${pmfm.id}`);
    if (!pmfmControl) return; // Skip if no control

    // Compute new control's value
    let valueStr: string = pmfmControl.value?.toString() || '';
    if (isNotNilOrNaN(+event.key)) {
      valueStr += event.key;
    } else if (event.key === 'Backspace') {
      if (valueStr.length) {
        // Remove last character
        valueStr = valueStr.substring(0, valueStr.length - 1);
      } else {
        valueStr = null;
      }
    } else return; // Skip (unknown key)

    // Update control's value
    const newValue = isNotNilOrBlank(valueStr) ? toNumber(+valueStr, null) : null;
    if (pmfmControl.value !== newValue) {
      // Check min/max (skip if outside [min,max])
      if (isNotNil(newValue) && event.key !== 'Backspace') {
        if (isNotNilOrNaN(pmfm.minValue) && newValue < pmfm.minValue) return;
        if (isNotNilOrNaN(pmfm.maxValue) && newValue > pmfm.maxValue) return;

        // Force month as active
        if (!isActive) {
          isActiveControl.patchValue(VesselUseFeaturesIsActiveEnum.ACTIVE);
        }
      }

      if (this.debug) console.debug(this.logPrefix + `Updating Pmfm#${pmfm.id} cell value with: ${newValue}`);

      pmfmControl.patchValue(newValue);
      this.markAsDirty();
    }
  }

  async showUnauthorizedToast(error?: string) {
    this.unauthorizedToast$.next(error);
  }

  async shiftClick(event?: Event, row?: AsyncTableElement<ActivityMonth>, columnName?: string): Promise<boolean> {
    row = row || this.editedRow;
    columnName = columnName || this.focusColumn;
    if (!row || !columnName || event?.defaultPrevented) return false; // Skip

    event?.preventDefault();
    event?.stopPropagation();

    // DEBUG
    console.debug(`${this.logPrefix}Shift+click`, event, row, columnName);
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

    this.cellSelection = cellSelection;
    this.resizeCellSelection(cellSelection, 'cell');

    return true;
  }

  protected async clickMonthHeader(event: MouseEvent, row: AsyncTableElement<ActivityMonth>) {
    if (!row || event?.defaultPrevented) return; // Skip

    event?.preventDefault(); // Avoid clickRow

    const isActiveIndex = this.displayedColumns.findIndex((col) => col === 'isActive');
    // eslint-disable-next-line prefer-const
    let { columnName, cellElement } = this.getCellElement(row.id, isActiveIndex);

    const reservedColumnCount = RESERVED_START_COLUMNS.concat(RESERVED_END_COLUMNS).length + this.readonlyColumnCount;
    const rowspan = this.displayedColumns.length - reservedColumnCount;

    let colspan = 1;

    // If Shift+click: expand the existing selection
    if (event?.shiftKey && this.cellSelection?.rowspan === rowspan && this.cellSelection.row.id !== row.id) {
      colspan = (Math.max(1, Math.abs(row.id - this.cellSelection.row.id)) + 1) * (row.id < this.cellSelection.row.id ? -1 : 1);
      cellElement = this.cellSelection.cellElement;
      row = this.cellSelection.row;
    }

    this.cellSelection = {
      divElement: this.cellSelectionDivRef.nativeElement,
      cellElement,
      row,
      columnName,
      colspan,
      rowspan,
      resizing: false,
    };

    this.resizeCellSelection(this.cellSelection, 'cell');

    // Emit cell selection changes
    this.startCellSelection.next();
  }

  protected async selectMonth(event: MouseEvent, columnName: string | number) {
    if (event?.defaultPrevented || isNil(columnName)) return; // Skip

    // Convert column to string
    columnName = '' + columnName;

    // If hidden column: show it
    const hiddenColumn = this.dynamicColumns?.find((col) => col.key === columnName && col.expand && col.hidden);
    if (hiddenColumn) {
      hiddenColumn.expand(event);
      return;
    }

    event?.preventDefault(); // Avoid default click
    const columnIndex = this.displayedColumns.findIndex((c) => c === columnName);

    let row = this.dataSource.getRow(0); // January
    let { cellElement } = this.getCellElement(0, columnIndex);

    const colspan = this.visibleRowCount;
    let rowspan = 1;

    // If Shift+click: expand the existing selection
    if (event?.shiftKey && this.cellSelection?.colspan === colspan && this.cellSelection.columnName !== columnName) {
      const previousColumnIndex = this.displayedColumns.findIndex((c) => c === this.cellSelection.columnName);
      rowspan = (Math.max(1, Math.abs(columnIndex - previousColumnIndex)) + 1) * (columnIndex < previousColumnIndex ? -1 : 1);

      // DEBUG
      console.debug(this.logPrefix + `Expand existing cell selection using rowspan=${rowspan}`);

      cellElement = this.cellSelection.cellElement;
      row = this.cellSelection.row;
      columnName = this.cellSelection.columnName;
    }

    this.cellSelection = {
      divElement: this.cellSelectionDivRef.nativeElement,
      cellElement,
      row,
      columnName,
      colspan,
      rowspan,
      resizing: false,
    };

    this.resizeCellSelection(this.cellSelection, 'cell');

    // Emit cell selection changes
    this.startCellSelection.next();
  }

  async selectCellByClick(event: Event, row?: AsyncTableElement<ActivityMonth>, columnName?: string): Promise<boolean> {
    row = row || this.editedRow;
    columnName = columnName || this.focusColumn;

    if (!row || !columnName || !event) return false; // Skip

    this.closeContextMenu();

    // DEBUG
    console.debug(`${this.logPrefix}Select a cell by click`, event, row, columnName);

    const confirmed = await this.confirmEditCreate();
    if (!confirmed) return false;

    this.selectCell(event, row, columnName);
  }

  async toggleCompactMode() {
    await super.toggleCompactMode();
    setTimeout(() => this.onResize());
  }

  protected resizeCellSelection(cellSelection: TableCellSelection, name = 'cell', opts?: { emitEvent?: boolean; debouncedExpansion?: boolean }) {
    if (!cellSelection) return;

    const containerElement = this.tableContainerElement;
    if (!containerElement) return;

    const { cellElement, divElement } = cellSelection;
    if (!cellElement || !divElement) return;

    // DEBUG
    if (this.debug) console.debug(`${this.logPrefix}Resizing ${name} selection...`);

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

    const colspan = toNumber(cellSelection.colspan, divRect.width / toNumber(previousCellRect?.width, relativeCellRect.width)) || 1;
    const rowspan = toNumber(cellSelection.rowspan, divRect.height / toNumber(previousCellRect?.height, relativeCellRect.width)) || 1;

    let top = relativeCellRect.top;
    let left = relativeCellRect.left - containerRect.left;
    let width = relativeCellRect.width * Math.abs(colspan);
    let height = relativeCellRect.height * Math.abs(rowspan);

    if (rowspan < 0) {
      top = relativeCellRect.top + relativeCellRect.height - height;
    }
    if (colspan < 0) {
      left = relativeCellRect.left + relativeCellRect.width - width - containerRect.left + (containerElement.scrollLeft || 0);
    }

    // Update original mouse x/Y, need for next resizing
    if (isNil(cellSelection.originalMouseX) || isNil(cellSelection.originalMouseY)) {
      // DEBUG
      console.debug(this.logPrefix + 'Computing originalMouseY...');
      cellSelection.originalMouseY = top + relativeCellRect.height + containerElement.scrollTop;
      cellSelection.originalMouseX = left + relativeCellRect.width + containerRect.left + containerElement.scrollLeft;
    }

    // Compute scrollbar dimension
    const scrollbarWidth =
      containerElement.clientWidth < containerElement.scrollWidth ? containerElement.offsetWidth - containerElement.clientWidth : 0;
    const scrollbarHeight =
      containerElement.clientHeight < containerElement.scrollHeight ? containerElement.offsetHeight - containerElement.clientHeight : 0;

    // DEBUG
    console.debug(this.logPrefix + `scrollbarWidth=${scrollbarWidth} scrollbarHeight=${scrollbarHeight}`);
    //console.debug(`${this.logPrefix}containerRect.bottom=${containerRect.bottom} scrollbarHeight=${scrollbarHeight} maxBottom=${maxBottom} bottom=${top + height}`);

    let topCut = false;
    if (top < containerRect.top) {
      height = Math.max(0, height - containerRect.top + top);
      top = containerRect.top;
      topCut = true;
    }

    let bottomCut = false;
    if (top + height > containerRect.bottom - scrollbarHeight) {
      height = Math.max(0, containerRect.bottom - scrollbarHeight - top);
      if (height === 0) {
        top = containerRect.bottom - scrollbarHeight;
      }
      bottomCut = true;
    }

    let rightCut = false;
    if (left + width > containerRect.right - containerRect.left - scrollbarWidth) {
      width = Math.max(0, containerRect.right - containerRect.left - scrollbarWidth - left);
      if (width === 0) {
        left = containerRect.right - containerRect.left - scrollbarWidth;
      }
      rightCut = true;
    }

    // DEBUG
    //console.debug(`${this.logPrefix}Resizing ${name} to top=${top} left=${left} width=${width} height=${height}`);

    // Resize the shadow element
    divElement.style.position = 'fixed';
    //divElement.style.position = 'relative';
    divElement.style.top = top + 'px';
    divElement.style.left = left + 'px';
    divElement.style.width = width + 'px';
    divElement.style.height = height + 'px';
    divElement.classList.toggle('top-no-border', topCut);
    divElement.classList.toggle('bottom-no-border', bottomCut);
    divElement.classList.toggle('right-no-border', rightCut);

    if (opts?.emitEvent !== false) {
      //this.markForCheck();
    }

    // Don't debounce by default
    if (opts?.debouncedExpansion !== true) {
      this.expandCellSelection(cellSelection);
    } else {
      // Expand selection (with a debounce time)
      this.debouncedExpandCellSelection$.next(cellSelection);
    }
  }

  protected async onMouseEnd(cellSelection?: TableCellSelection) {
    // Vertical copy
    if (cellSelection.axis === 'x' && cellSelection?.rowspan === 1 && cellSelection.colspan !== 0) {
      const done = await this.copyVertically(cellSelection.row, cellSelection.columnName, cellSelection.colspan);

      // Reset axis to allow cell selection resize
      this.cellSelection.axis = null;

      return done;
    }

    return true;
  }

  async clickCell(event?: HammerTapEvent | Event, row?: AsyncTableElement<ActivityMonth>, columnName?: string): Promise<boolean> {
    console.debug(this.logPrefix + 'clickCell...');
    columnName = columnName || this.focusColumn;

    if (event?.defaultPrevented) return false; // Skip

    // Add a delay, to allow :
    // - double click to cancel the event
    // - setFocusColumn() to be call
    if (this.inlineEdition && !this.readOnly && this.canEdit) {
      await sleep(HAMMER_TAP_TIME + 10);
    }

    this.closeContextMenu();
    if (event?.defaultPrevented || row.editing) return false; // Skip

    // Wait of resizing or validating
    if (this.cellSelection?.resizing || this.cellSelection?.validating) {
      console.debug(this.logPrefix + 'Waiting end of resizing...');
      await waitFor(() => !this.cellSelection?.resizing && !this.cellSelection?.validating, { stop: this.destroySubject, timeout: 250 });
    }

    // Shift click
    if ((event instanceof PointerEvent || event instanceof MouseEvent) && event.shiftKey === true) {
      return this.shiftClick(event, row, columnName);
    }

    // Select by click
    return this.selectCellByClick(event, row, columnName);
  }

  async confirmEditCell(event: Event, row: AsyncTableElement<ActivityMonth>, columnName?: string): Promise<boolean> {
    if (event?.defaultPrevented) return;
    event?.preventDefault(); // Avoid dual execution - fic issue #766

    console.debug(this.logPrefix + `Confirm cell month #${row.id} ${columnName}`, event);

    const confirmed = await this.confirmEditCreate(event, row);
    if (!confirmed) return;

    // Select the cell
    this.selectCell(event, row, columnName);
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
      if (this.debug) console.debug(`${this.logPrefix} Cannot cancel or delete the row!`);

      this.startListenRow(row.validator);
    } else {
      row.validator.markAsPristine();
      // Update view
      if (opts?.emitEvent !== false) this.markForCheck();
    }
  }

  addMetierBlock(event?: Event, opts?: { emitEvent?: boolean; updateRows?: boolean; scrollToBottom?: boolean }) {
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
            expand: (event: Event) => this.toggleMetierBlock(event, `metier${rankOrder}`, true),
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
            expand: (event: Event) => this.toggleMetierBlock(event, `metier${rankOrder}`, true),
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
            expand: (event: Event) => this.toggleGradientBlock(event, `metier${rankOrder}FishingArea${faRankOrder}`, true),
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
            expand: (event: Event) => this.toggleGradientBlock(event, `metier${rankOrder}FishingArea${faRankOrder}`, true),
            hidden: true,
          },
        ];
      }),
    ];

    this.focusColumn = blockColumns[0].key;
    this.dynamicColumns = this.dynamicColumns ? [...this.dynamicColumns, ...blockColumns] : blockColumns;
    const dynamicColumnKeys = this.dynamicColumns.map((col) => col.key);
    this.excludesColumns = this.excludesColumns.filter((columnName) => !dynamicColumnKeys.includes(columnName));
    this.metierCount = index + 1;

    // Update rows validator
    if (this.loaded && this.inlineEdition && opts?.updateRows !== false) {
      const editedRowId = this.editedRow?.id;
      this.dataSource.getRows().forEach((row) => this.onPrepareRowForm(row.validator, { listenChanges: row.id === editedRowId }));
    }

    if (opts?.emitEvent !== false) {
      // Update columns
      this.updateColumns();

      // Scroll to bottom
      if (opts?.scrollToBottom != false) {
        sleep(250).then(() => this.scrollToBottom());
      }
    }
  }

  protected expandMore(event?: Event) {
    // Get currently collapsed metiers
    const metierBlocksToExpand = [];
    for (let i = 0; i < this.metierCount; i++) {
      const metierColumn = this.dynamicColumns.find((col) => col.blockIndex === i);
      if (metierColumn && !metierColumn.expanded) {
        metierBlocksToExpand.push(i);
      }
    }

    if (isNotEmptyArray(metierBlocksToExpand)) {
      // Expand remaining collapsed metiers
      metierBlocksToExpand.forEach((blockIndex) => this.expandMetierBlock(null, blockIndex, { emitEvent: false, expandChildren: false }));
    } else {
      // Expand all
      this.expandAll(event, { emitEvent: false });
    }

    this.markForCheck();
    setTimeout(() => this.onResize());
  }

  protected expandAll(event?: Event, opts?: { emitEvent?: boolean }) {
    for (let i = 0; i < this.metierCount; i++) {
      this.expandMetierBlock(null, i, { emitEvent: false });
    }

    if (opts?.emitEvent !== false) {
      this.markForCheck();

      setTimeout(() => this.onResize());
    }
  }

  protected async suggestBasePortLocations(value: any, filter?: Partial<ReferentialRefFilter>): Promise<LoadResult<ReferentialRef>> {
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };

    return this.referentialRefService.suggest(value, this.buildBasePortLocationFilter(filter));
  }

  protected buildBasePortLocationFilter(filter?: Partial<ReferentialRefFilter>): Partial<ReferentialRefFilter> {
    return {
      entityName: 'Location',
      statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      ...filter,
      locationIds: this.expertiseAreaProperties?.locationIds,
      levelIds: this.basePortLocationLevelIds || [LocationLevelIds.PORT],
    };
  }

  protected async suggestMetiers(value: any, filter?: Partial<ReferentialRefFilter>): Promise<LoadResult<Metier>> {
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };

    // Get metiers to exclude (already existing)
    const existingMetierIds =
      this.editedRow && removeDuplicatesFromArray((this.editedRow.currentData?.gearUseFeatures || []).map((guf) => guf.metier?.id).filter(isNotNil));

    return await this.referentialRefService.suggest<Metier>(value, this.buildMetierFilter(filter, existingMetierIds), null, null, {
      withProperties: true /* need to fill properties.gear */,
      // Convert to Metier entities (using `properties.gear` to fill the gear)
      toEntity: (source) => Metier.fromObject({ ...source, ...source.properties }),
    });
  }

  protected buildMetierFilter(filter?: Partial<ReferentialRefFilter>, existingMetierIds?: number[]): Partial<ReferentialRefFilter> {
    return {
      ...METIER_DEFAULT_FILTER,
      ...filter,
      excludedIds: existingMetierIds,
      locationIds: this.expertiseAreaProperties?.locationIds,
    };
  }

  protected async suggestFishingAreaLocations(value: any, filter?: Partial<ReferentialRefFilter>): Promise<LoadResult<ReferentialRef>> {
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };

    // Get gearUseFeature index
    const columnName = this.getEditedCell()?.columnName;
    const gearUseFeatureIndex = columnName ? parseInt(columnName.match(/\d/)?.[0], 10) : null;

    // Get fishingArea to exclude (already existing in gearUseFeature)
    const existingFishingAreaLocationIds =
      this.editedRow &&
      isNotNil(gearUseFeatureIndex) &&
      removeDuplicatesFromArray(
        (this.editedRow.currentData?.gearUseFeatures[gearUseFeatureIndex - 1]?.fishingAreas || []).map((guf) => guf.location?.id).filter(isNotNil)
      );

    return await this.referentialRefService.suggest(value, this.buildFishingAreaFilter(filter, existingFishingAreaLocationIds), null, null, {
      toEntity: true,
      withProperties: false,
    });
  }

  protected buildFishingAreaFilter(filter?: Partial<ReferentialRefFilter>, existingFishingAreaLocationIds?: number[]): Partial<ReferentialRefFilter> {
    return {
      entityName: 'Location',
      statusId: StatusIds.ENABLE,
      ...filter,
      excludedIds: existingFishingAreaLocationIds,
      levelIds: isNotEmptyArray(this.expertiseAreaProperties?.locationLevelIds)
        ? this.expertiseAreaProperties.locationLevelIds
        : this.fishingAreaLocationLevelIds || LocationLevelGroups.FISHING_AREA,
      locationIds: this.expertiseAreaProperties?.locationIds,
    };
  }

  protected async suggestDistanceToCoastGradient(value: any, filter?: Partial<ReferentialRefFilter>): Promise<LoadResult<ReferentialRef>> {
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };

    // Get current location
    const fishingAreaLocationId = this.getCurrentFishingAreaLocationId();

    return this.referentialRefService.suggest(value, this.buildDistanceToCoastGradientFilter(filter, fishingAreaLocationId));
  }

  protected buildDistanceToCoastGradientFilter(
    filter?: Partial<ReferentialRefFilter>,
    fishingAreaLocationId?: number
  ): Partial<ReferentialRefFilter> {
    return {
      entityName: 'DistanceToCoastGradient',
      statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      ...filter,
      locationIds: fishingAreaLocationId ? [fishingAreaLocationId] : this.expertiseAreaProperties?.locationIds,
    };
  }

  protected async suggestDepthGradient(value: any, filter?: Partial<ReferentialRefFilter>): Promise<LoadResult<ReferentialRef>> {
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };

    return this.referentialRefService.suggest(value, this.buildDepthGradientFilter(filter), 'rankOrder', 'asc');
  }

  protected buildDepthGradientFilter(filter?: Partial<ReferentialRefFilter>): Partial<ReferentialRefFilter> {
    return {
      entityName: 'DepthGradient',
      statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      ...filter,
    };
  }

  protected async suggestNearbySpecificArea(value: any, filter?: Partial<ReferentialRefFilter>): Promise<LoadResult<ReferentialRef>> {
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };

    // Get current location
    const fishingAreaLocationId = this.getCurrentFishingAreaLocationId();

    return this.referentialRefService.suggest(value, this.buildNearbySpecificAreaFilter(filter, fishingAreaLocationId));
  }

  protected buildNearbySpecificAreaFilter(filter?: Partial<ReferentialRefFilter>, fishingAreaLocationId?: number): Partial<ReferentialRefFilter> {
    return {
      entityName: 'NearbySpecificArea',
      statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      ...filter,
      locationIds: fishingAreaLocationId ? [fishingAreaLocationId] : this.expertiseAreaProperties?.locationIds,
    };
  }

  /**
   * Check if some date are outside expertise area, and mark it (see issue #732)
   * @protected
   */
  protected async checkDataExpertiseArea(months?: ActivityMonth[], opts?: { debounced?: boolean }) {
    // By default, add debounced (avoid multiple call during loading)
    if (opts?.debounced !== false) {
      this.debouncedCheckExpertiseArea$.next(months);
      return;
    }

    // Confirm current row, to apply current changes in the row
    if (this.inlineEdition && this.enabled) {
      const confirmed = await this.confirmEditCreate();
      if (!confirmed) {
        console.warn(`${this.logPrefix}Trying to check data inside expertise areas, BUT an edited row cannot be confirmed!`);
      }
    }

    months = months ?? (this.dirty ? this.dataSource.getData() : this.memoryDataService.value);
    if (isEmptyArray(months)) return; // Skip if nothing to check

    let now: number;
    if (this.debug) {
      console.debug(`${this.logPrefix}Check data inside expertise areas... (locationIds: ${this.expertiseAreaProperties?.locationIds?.join(',')})`);
      now = Date.now();
    }

    try {
      const needCheck = isNotEmptyArray(this.expertiseAreaProperties?.locationIds);
      const invalidBasePortLocationIds: number[] = [];
      const invalidMetierIds: number[] = [];
      const invalidFishingAreaLocationIds: number[] = [];
      const invalidDistanceToCoastGradientIds: number[] = [];
      const invalidNearbySpecificAreaIds: number[] = [];
      const basePortLocationFilter = this.buildBasePortLocationFilter();
      const metierFilter = this.buildMetierFilter();
      const faFilter = this.buildFishingAreaFilter();
      const cacheFirstOptions = { fetchPolicy: <FetchPolicy>'cache-first' };

      for (const month of months) {
        // Flag vesselUseFeature with inconsistent expertise location ids (basePortLocation)
        const basePortLocationId = month.basePortLocation?.id;
        if (isNotNil(basePortLocationId)) {
          if (needCheck && !invalidBasePortLocationIds.includes(basePortLocationId)) {
            if (!(await this.referentialRefService.existsById(basePortLocationId, basePortLocationFilter, cacheFirstOptions))) {
              invalidBasePortLocationIds.push(basePortLocationId);
            }
          }
          // Update marker
          ExpertiseAreaUtils.markAsOutsideExpertiseArea(month.basePortLocation, invalidBasePortLocationIds.includes(basePortLocationId));
        }

        // Flag gearUseFeature with inconsistent expertise location ids (metier, fishingArea & gradients)
        for (const guf of month.gearUseFeatures || []) {
          const metierId = guf.metier?.id;
          if (isNotNil(metierId)) {
            if (needCheck && !invalidMetierIds.includes(metierId)) {
              if (!(await this.referentialRefService.existsById(metierId, metierFilter, cacheFirstOptions))) {
                invalidMetierIds.push(metierId);
              }
            }
            ExpertiseAreaUtils.markAsOutsideExpertiseArea(guf.metier, invalidMetierIds.includes(metierId));
          }

          for (const fa of guf.fishingAreas || []) {
            const faLocationId = fa.location?.id;
            if (isNotNil(faLocationId)) {
              if (needCheck && !invalidFishingAreaLocationIds.includes(faLocationId)) {
                if (!(await this.referentialRefService.existsById(faLocationId, faFilter, cacheFirstOptions))) {
                  invalidFishingAreaLocationIds.push(faLocationId);
                }
              }
              ExpertiseAreaUtils.markAsOutsideExpertiseArea(fa.location, invalidFishingAreaLocationIds.includes(faLocationId));
            }

            const dtcId = fa.distanceToCoastGradient?.id;
            if (isNotNil(dtcId)) {
              if (needCheck && !invalidDistanceToCoastGradientIds.includes(dtcId)) {
                if (
                  !(await this.referentialRefService.existsById(
                    dtcId,
                    this.buildDistanceToCoastGradientFilter(undefined, faLocationId),
                    cacheFirstOptions
                  ))
                ) {
                  invalidDistanceToCoastGradientIds.push(dtcId);
                }
              }
              ExpertiseAreaUtils.markAsOutsideExpertiseArea(fa.distanceToCoastGradient, invalidDistanceToCoastGradientIds.includes(dtcId));
            }

            const nsaId = fa.nearbySpecificArea?.id;
            if (isNotNil(nsaId)) {
              if (needCheck && !invalidNearbySpecificAreaIds.includes(nsaId)) {
                if (
                  !(await this.referentialRefService.existsById(
                    nsaId,
                    this.buildNearbySpecificAreaFilter(undefined, faLocationId),
                    cacheFirstOptions
                  ))
                ) {
                  invalidNearbySpecificAreaIds.push(nsaId);
                }
              }
              ExpertiseAreaUtils.markAsOutsideExpertiseArea(fa.nearbySpecificArea, invalidNearbySpecificAreaIds.includes(nsaId));
            }
          }
        }
      }

      this.hasDataOutsideExpertiseArea =
        isNotEmptyArray(invalidBasePortLocationIds) ||
        isNotEmptyArray(invalidMetierIds) ||
        isNotEmptyArray(invalidFishingAreaLocationIds) ||
        isNotEmptyArray(invalidDistanceToCoastGradientIds) ||
        isNotEmptyArray(invalidNearbySpecificAreaIds);

      if (this.debug) {
        console.debug(`${this.logPrefix}Check data inside expertise areas - done in ${Date.now() - now}ms`);
      }
    } finally {
      this.markForCheck();
    }
  }

  protected getCurrentFishingAreaLocationId(): number {
    const columnName = this.getEditedCell()?.columnName;
    const colPath = columnName && this.dynamicColumns.find((col) => col.key === columnName)?.path;
    if (isNilOrBlank(colPath)) return undefined;
    const fishingAreaLocationPath = `${colPath.substring(0, colPath.lastIndexOf('.'))}.location`;
    const fishingAreaLocation = this.editedRow?.validator?.get(fishingAreaLocationPath)?.value;
    if (this.debug) {
      console.debug(`${this.logPrefix}Selected location`, fishingAreaLocation);
    }
    return fishingAreaLocation?.id;
  }

  protected onPrepareRowForm(
    form: UntypedFormGroup,
    opts?: ActivityMonthValidatorOptions & {
      listenChanges?: boolean;
    }
  ) {
    if (!form || !this.validatorService) return;

    const isActive = form.get('isActive').value;

    opts = this.fillValidatorOptions(isActive, opts);

    if (this.debug) console.debug(this.logPrefix + 'Updating row form...', opts);
    if (this.error) this.resetError();
    this.validatorService.updateFormGroup(form, opts);

    if (opts?.listenChanges !== false) {
      this.startListenRow(form);
    }
  }

  protected fillValidatorOptions(isActive: number, opts?: ActivityMonthValidatorOptions): ActivityMonthValidatorOptions {
    return {
      required: false,
      pmfms: this.pmfms,
      withMeasurements: isActive === VesselUseFeaturesIsActiveEnum.ACTIVE,
      withMetier: isActive !== VesselUseFeaturesIsActiveEnum.INACTIVE && isActive !== VesselUseFeaturesIsActiveEnum.NOT_EXISTS,
      withFishingAreas: isActive !== VesselUseFeaturesIsActiveEnum.INACTIVE && isActive !== VesselUseFeaturesIsActiveEnum.NOT_EXISTS,
      metierCount: this.metierCount,
      fishingAreaCount: this.maxFishingAreaCount,
      isOnFieldMode: this.isOnFieldMode,
      ...opts,
    };
  }

  protected startListenRow(form: UntypedFormGroup) {
    // Stop previous listener
    this.rowSubscription?.unsubscribe();

    // DEBUG
    //if (this.debug)
    console.debug(this.logPrefix + 'Start listening row form...', form);

    this.rowSubscription = new Subscription();
    this.rowSubscription.add(
      ActivityMonthValidators.startListenChanges(form, {
        markForCheck: () => this.markForCheck(),
        debounceTime: 100,
      })
    );

    const qualificationCommentsControl = form.get('qualificationComments');
    const isActiveControl = form.get('isActive');
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
          if (form.dirty && isNotNilOrBlank(qualificationCommentsControl.value)) {
            qualificationCommentsControl.setValue(null, { emitEvent: false });
            this.markAsDirty();
          }

          // Force to update the form group, when enabling row and isActive
          if (isActiveControl.value === VesselUseFeaturesIsActiveEnum.ACTIVE && form.status !== 'DISABLED') {
            const opts = this.fillValidatorOptions(isActiveControl.value);
            this.validatorService.updateFormGroup(form, opts);
          }
        })
    );

    // DEBUG
    if (this.debug) this.rowSubscription.add(() => console.debug(this.logPrefix + 'Stop listening row form'));

    // Listen row focused element
    this.rowSubscription.add(this.startListenFocusedElement());
  }

  async addRow(event?: Event, insertAt?: number, opts?: { focusColumn?: string; editing?: boolean }): Promise<boolean> {
    // Avoid to add new row, by Tab navigation
    const firstRow = this.dataSource
      .getRows()
      .find((row) => row.currentData.readonly !== true && row.currentData.qualityFlagId !== QualityFlagIds.CONFLICTUAL);
    if (firstRow) return this.editRow(event, firstRow);
    return false;
  }

  protected async editRow(event: Event | undefined, row: AsyncTableElement<ActivityMonth>, opts?: { focusColumn?: string }): Promise<boolean> {
    await this.waitIdle({ timeout: 2000 });

    // Avoid to edit readonly month
    const month = row.currentData;
    if (month.readonly === true || month.qualityFlagId === QualityFlagIds.CONFLICTUAL) {
      const confirmed = await this.confirmEditCreate();
      if (!confirmed) return false;

      // Warn user that he cannot edit
      if (month.readonly === true) {
        this.showUnauthorizedToast();
      }
      return false;
    }

    const editing = await super.editRow(event, row, opts);
    if (editing) this.removeCellSelection();
    return editing;
  }

  protected async configureValidator(opts: MeasurementsTableValidatorOptions) {
    await super.configureValidator(opts);

    this.validatorService.delegateOptions = {
      maxMetierCount: this.maxMetierCount,
      maxFishingAreaCount: this.maxFishingAreaCount,
    };
  }

  async confirmAndForward(event?: Event, row?: AsyncTableElement<ActivityMonth>): Promise<boolean> {
    if (this.confirmingRowMutex.locked) return false; // Skip if too many confirmation row event
    return super.confirmAndForward(event, row);
  }

  async confirmAndBackward(event?: Event, row?: AsyncTableElement<ActivityMonth>): Promise<boolean> {
    if (this.confirmingRowMutex.locked) return false; // Skip if too many confirmation row event
    return super.confirmAndBackward(event, row);
  }

  private confirmEditCreateId = 0;

  async confirmEditCreate(event?: Event, row?: AsyncTableElement<ActivityMonth>, opts?: { lock?: boolean }): Promise<boolean> {
    // If not given row: confirm all editing rows
    if (!row) {
      const editingRows = this.dataSource.getEditingRows();
      if (isEmptyArray(editingRows)) return true; // No rows to confirm

      // DEBUG
      // console.debug(this.logPrefix + `lock rows`, editingRows);

      return (await Promise.all(editingRows.map((editedRow) => this.confirmEditCreate(event, editedRow)))).every((c) => c === true);
    }
    const confirmEditCreateId = this.confirmEditCreateId++;

    try {
      // DEBUG
      //console.debug(this.logPrefix + `lock row#${row?.id} - ID #${confirmEditCreateId}`);

      // Lock the row, or wait until can lock
      await this.confirmingRowMutex.lock(row);

      console.debug(this.logPrefix + `lock row#${row?.id} resolved - ID #${confirmEditCreateId}`);

      if (!row || !row.editing) return true; // nothing to confirmed

      // DEBUG
      //console.debug(this.logPrefix + `confirmEditCreate row#${row?.id}`);

      // Allow to confirm when invalid
      const form = row.validator;
      if (form && !form.valid) {
        await AppFormUtils.waitWhilePending(form);

        if (form.invalid && form.touched) {
          const errorMessage = this.formErrorAdapter.translateFormErrors(form, this.errorTranslateOptions);

          // DEBUG
          //console.debug(this.logPrefix + 'Confirm row with error:' + errorMessage);

          // Save error message
          // FIXME this is not working well
          DataEntityUtils.markFormAsInvalid(row.validator, errorMessage, { emitEvent: false });
        }
        if (form.dirty) this.markAsDirty({ emitEvent: false /* because of resetError() */ });
        this.resetError();

        row.originalData = undefined;
        form.disable();

        return true;
      }

      const confirmed = await super.confirmEditCreate(event, row);
      if (confirmed && row.validator?.disabled) {
        row.validator.disable();
      }
      return confirmed === true;
    } catch (err) {
      console.error(this.logPrefix + `Error while confirming row #${row?.id || '?'}`, err);
      return false;
    } finally {
      // Workaround used to avoid to focus the backward button
      setTimeout(() => {
        console.debug(this.logPrefix + `unlock row#${row?.id} - ID #${confirmEditCreateId}`);
        this.confirmingRowMutex.unlock(row);
      }, 250);
    }
  }

  protected setError(error: string, opts?: { emitEvent?: boolean }) {
    super.setError(error, opts);
  }

  async clear(event?: Event, row?: AsyncTableElement<ActivityMonth>, opts?: { interactive?: boolean }) {
    if (event?.defaultPrevented) return false; // skip
    event?.preventDefault();
    event?.stopPropagation();

    row = row || this.editedRow;
    if (!row) return true; // no row to clear

    // Ask user confirmation
    if (opts?.interactive !== false) {
      const confirmed = await Alerts.askConfirmation('ACTIVITY_CALENDAR.CONFIRM.CLEAR_MONTH', this.alertCtrl, this.translate);
      if (!confirmed) return false; // User cancelled
    }

    if (this.debug) console.debug(this.logPrefix + 'Clear row', row);

    const currentData = row.currentData;
    if (ActivityMonth.isEmpty(currentData)) return true; // Nothing to clear

    const { month, startDate, endDate, readonly, registrationLocations, vesselId, id, program, gearUseFeatures } = currentData;

    const data = ActivityMonth.fromObject({
      id,
      vesselId,
      program,
      month,
      startDate,
      endDate,
      readonly,
      registrationLocations,
      measurementValues: MeasurementValuesUtils.normalizeValuesToForm({}, this.pmfms),
      gearUseFeatures: new Array(this.metierCount)
        .fill({
          startDate,
          endDate,
          fishingAreas: new Array(this.maxFishingAreaCount).fill({}),
        })
        .map((guf, index) => {
          guf = { ...guf, id: gearUseFeatures[index].id };
          return guf;
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

  protected collapseMore(event?: Event) {
    // Check if some distanceToCoastGradient are not collapsed
    const blockColumnNames = [`distanceToCoastGradient`, `depthGradient`, `nearbySpecificArea`];
    const blockColumns = this.dynamicColumns.filter((col) => blockColumnNames.some((blockColName) => col.key.includes(blockColName)));

    const masterBlockColumns = blockColumns.filter((col) => isNotNil(col.expanded));
    const childBlockColumns = blockColumns.filter((col) => !isNotNil(col.expanded));

    if (masterBlockColumns.some((col) => col.expanded)) {
      // Collapse remaining
      masterBlockColumns.forEach((col) => (col.expanded = false));
      childBlockColumns.forEach((col) => (col.hidden = true));
    } else {
      // Collapse all
      this.collapseAll(event, { emitEvent: false });
    }

    this.markForCheck();
    setTimeout(() => this.onResize());
  }

  protected collapseAll(event?: Event, opts?: { emitEvent?: boolean }) {
    if (event?.defaultPrevented) return; // Skip

    for (let i = 0; i < this.metierCount; i++) {
      this.collapseMetierBlock(null, i, { emitEvent: false });
    }

    setTimeout(() => {
      this.removeCellSelection(opts);
      this.clearClipboard(null, { clearContext: false });
    });
  }

  async clearAll(event?: Event, opts?: { interactive?: boolean }) {
    if (event?.defaultPrevented) return; // Skip

    // Ask user confirmation
    if (opts?.interactive !== false) {
      const confirmed = await Alerts.askConfirmation('ACTIVITY_CALENDAR.CONFIRM.CLEAR_CALENDAR', this.alertCtrl, this.translate);
      if (!confirmed) return false; // User cancelled
    }

    const rows = this.dataSource.getRows();
    for (const row of rows) {
      if (!row.currentData.readonly) {
        const isActive = row.currentData.isActive;
        if (isNotNil(isActive)) await this.clear(event, row, { interactive: false });
      }
    }

    // Clear valid row counter
    this.validRowCount = 0;
  }

  toggleMetierBlock(event: Event | undefined, key: string, forceExpanded?: boolean) {
    if (event?.defaultPrevented) return; // Skip
    event?.preventDefault();

    if (this.debug) console.debug(this.logPrefix + 'Toggling block #' + key);

    const blockColumns = this.dynamicColumns?.filter((col) => col.key.startsWith(key));
    if (isEmptyArray(blockColumns)) return; // Skip

    const masterColumn = blockColumns[0];
    if (isNil(masterColumn.expanded)) return; // Skip is not an expandable column

    const expanded = toBoolean(forceExpanded, !masterColumn.expanded);
    // If will close: check if allow
    const subColumns = blockColumns.slice(1);
    if (!expanded && !this.onWillHideColumns(subColumns)) return;

    // Toggle expanded
    masterColumn.expanded = expanded;

    subColumns.forEach((col) => {
      // Show/Hide sub columns
      col.hidden = !expanded;
      // Expanded state for all columns to fix divergences states
      if (isNotNil(col.expanded)) {
        col.expanded = expanded;
      }
    });

    this.markForCheck();

    // Resize cell selection (after refresh was done)
    setTimeout(() => this.onResize());
  }

  toggleGradientBlock(event: Event, keyPrefix: string, forceExpanded?: boolean) {
    if (event?.defaultPrevented) return; // Skip
    event?.preventDefault();

    const blockColumnNames = [`${keyPrefix}distanceToCoastGradient`, `${keyPrefix}depthGradient`, `${keyPrefix}nearbySpecificArea`];
    const blockColumns = this.dynamicColumns.filter((col) => blockColumnNames.includes(col.key));

    if (isEmptyArray(blockColumns)) return; // Skip

    const masterColumn = blockColumns[0];
    if (isNil(masterColumn.expanded)) return; // Skip is not an expandable column

    const expanded = toBoolean(forceExpanded, !masterColumn.expanded);

    // If will close: check if allow
    const subColumns = blockColumns.slice(1);
    if (!expanded && !this.onWillHideColumns(subColumns)) return;

    // Toggle expanded
    masterColumn.expanded = expanded;

    // Show/Hide sub columns
    subColumns.forEach((col) => (col.hidden = !expanded));

    this.markForCheck();

    // Resize cell selection (after refresh was done)
    setTimeout(() => this.onResize());
  }

  expandMetierBlock(event: Event, blockIndex: number, opts?: { emitEvent?: boolean; expandChildren?: boolean }) {
    if (event?.defaultPrevented) return; // Skip^
    event?.preventDefault();

    this.setMetierBlockExpanded(blockIndex, true, opts);
  }

  collapseMetierBlock(event: Event, blockIndex: number, opts?: { emitEvent?: boolean }) {
    if (event?.defaultPrevented) return; // Skip^
    event?.preventDefault();

    this.setMetierBlockExpanded(blockIndex, false, opts);
  }

  markAsDirty(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    if (this.loading) return; // Skip while loading
    super.markAsDirty(opts);
  }

  removeCellSelection(opts?: { emitEvent?: boolean }) {
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

  /* -- protected functions -- */

  protected setMetierBlockExpanded(blockIndex: number, expanded: boolean, opts?: { emitEvent?: boolean; expandChildren?: boolean }) {
    const blockColumns = this.dynamicColumns.filter((col) => col.blockIndex === blockIndex);
    if (isEmptyArray(blockColumns)) return;

    const masterColumn = blockColumns[0];
    if (isNil(masterColumn.expanded)) return; // Skip is not an expandable column

    masterColumn.expanded = expanded;

    // Update sub columns
    blockColumns.slice(1).forEach((col) => {
      if (opts?.expandChildren === false) {
        col.hidden = col.key.includes('depthGradient') || col.key.includes('nearbySpecificArea');

        // Collapsed state for all columns
        if (isNotNil(col.expanded)) {
          col.expanded = false;
        }
      } else {
        col.hidden = !expanded;

        // Expanded state for all columns to fix divergences states
        if (isNotNil(col.expanded)) {
          col.expanded = expanded;
        }
      }
    });

    if (opts?.emitEvent !== false) {
      this.markForCheck();
    }
  }

  protected async dblClickCell(event: Event | undefined, row: AsyncTableElement<ActivityMonth>, columnName: string) {
    if (!row.editing) {
      // DEBUG
      //if (this.debug) console.debug(`${this.logPrefix}setFocusColumn() => ${columnName}`);
      this.focusColumn = columnName;
    }

    if (event?.defaultPrevented || !this.inlineEdition || this.readOnly || !this.canEdit) return false; //  if cancelled or cannot edit

    this.closeContextMenu();

    // Wait of resizing or validating
    if (this.cellSelection?.resizing || this.cellSelection?.validating) {
      await waitFor(() => !this.cellSelection?.resizing && !this.cellSelection?.validating, { stop: this.destroySubject });
    }

    // DEBUG
    console.debug(`${this.logPrefix}Double+click`, event, row, columnName);

    // Forget the cell selection
    this.removeCellSelection();

    return super.clickRow(event, row);
  }

  protected getColumnPath(key: string): string | undefined {
    // Get column
    const dynamicColumn = this.dynamicColumns?.find((c) => c.key === key);
    const validColumn = !!dynamicColumn || key === 'isActive' || key === 'basePortLocation' || PMFM_ID_REGEXP.test(key);
    if (!validColumn) return undefined;

    return dynamicColumn?.path || (PMFM_ID_REGEXP.test(key) ? `measurementValues.${key}` : key);
  }

  protected getI18nColumnName(columnName: string): string | undefined {
    if (isNilOrBlank(columnName)) throw new Error('Missing column key');
    // Get column
    const dynamicColumn = this.dynamicColumns?.find((c) => c.path === columnName);
    const validColumn =
      !!dynamicColumn ||
      columnName === 'isActive' ||
      columnName === 'basePortLocation' ||
      PMFM_ID_REGEXP.test(columnName) ||
      FISHING_AREA_PATH_REGEXP.test(columnName);
    if (!validColumn) return undefined;

    if (dynamicColumn?.label) return dynamicColumn.label;

    // Dynamic column not found for this path. Is it a fishing area path?
    const fishingAreaPathIndexes = columnName.match(FISHING_AREA_PATH_REGEXP);
    if (fishingAreaPathIndexes) {
      const gearUseFeatureIndex = fishingAreaPathIndexes[1];
      const fishingAreaIndex = fishingAreaPathIndexes[2];
      const metierColumn = this.dynamicColumns?.find((c) => c.path === `gearUseFeatures.${gearUseFeatureIndex}.metier`);
      const fishingAreaColumn = this.dynamicColumns?.find(
        (c) => c.path === `gearUseFeatures.${gearUseFeatureIndex}.fishingAreas.${fishingAreaIndex}.location`
      );

      if (isNotNil(metierColumn) && isNotNil(fishingAreaColumn)) return `${metierColumn.label} > ${fishingAreaColumn.label} `;
    }

    if (PMFM_ID_REGEXP.test(columnName)) {
      const pmfm = this.pmfms?.find((p) => p.id.toString() === columnName);
      if (pmfm) return this.getI18nPmfmName(pmfm);
    }

    return this.translate.instant(this.i18nColumnPrefix + changeCaseToUnderscore(columnName).toUpperCase());
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
    const targetRows = this.dataSource.getRows().filter((row) => {
      return row.id >= minRowId && row.id <= maxRowId;
    });
    if (isEmptyArray(targetRows)) return false; // Skip if empty

    // DEBUG
    if (this.debug) console.debug(this.logPrefix + `Copying vertically ${columnName} to ${targetRows.length} months ...`, targetRows);

    // Get source value (after confirmed if row is editing)
    await this.confirmEditCreate(); // Row can be NOT confirmed, but it's OK
    const sourceValue = getPropertyByPath(sourceRow.currentData, path);

    let dirty = false;
    targetRows.forEach((row, index) => {
      if (row.currentData.readonly) {
        this.showUnauthorizedToast();
        return;
      }
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
    console.debug(`${this.logPrefix}Copy event`, event);

    if (event?.defaultPrevented) return;

    if (this.cellSelection && (this.cellSelection?.colspan !== 0 || this.cellSelection?.rowspan !== 0)) {
      event?.preventDefault();
      event?.stopPropagation();

      // Copy to clipboard
      await this.copyCellSelectionToClipboard(this.cellSelection);

      // this.removeCellSelection();

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

  protected async cut(event?: Event) {
    console.debug(`${this.logPrefix}Cut event`, event);

    if (event?.defaultPrevented) return;

    if (this.cellSelection && (this.cellSelection?.colspan !== 0 || this.cellSelection?.rowspan !== 0)) {
      event?.preventDefault();
      event?.stopPropagation();

      // Copy to clipboard
      await this.copyCellSelectionToClipboard(this.cellSelection, { emitEvent: false });

      // Clear cells
      await this.clearCellSelection(null, this.cellSelection);

      this.markForCheck();
    } else {
      if (this.editedRowFocusedElement) {
        // Continue
      } else {
        event?.preventDefault();
        event?.stopPropagation();
        await this.cutCellToClipboard(this.editedRow, this.focusColumn);
      }
    }
  }

  protected async copyCellSelectionToClipboard(cellSelection?: TableCellSelection, opts?: { emitEvent?: boolean }): Promise<boolean> {
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

    // Update the clipboard
    this.context.clipboard = {
      data: {
        months: targetMonths,
        paths: sourcePaths,
      },
    };

    // Show clipboard selection
    if (opts?.emitEvent !== false) {
      this.cellClipboard = {
        ...cellSelection,
        divElement: this.cellClipboardDivRef.nativeElement,
      };
      this.resizeCellSelection(this.cellClipboard, 'clipboard');
    } else {
      this.clearClipboard(null, { clearContext: false });
    }
  }

  protected async clearCellSelection(event?: Event | undefined, cellSelection?: TableCellSelection): Promise<boolean> {
    cellSelection = cellSelection || this.cellSelection;
    if (!cellSelection || event?.defaultPrevented) return false;

    event?.preventDefault();
    event?.stopPropagation();

    console.debug(`${this.logPrefix}Clearing cell selection...`);

    const { rows, paths } = this.getRowsFromSelection(cellSelection);

    for (const row of rows) {
      paths.forEach((path) => {
        if (row.currentData.readonly) {
          this.showUnauthorizedToast();
          return;
        }
        setPropertyByPath(row, path, null);
        if (this.error) this.resetError();
        this.validatorService.updateFormGroup(row.validator);
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

  protected async cutCellToClipboard(sourceRow: AsyncTableElement<ActivityMonth>, columnName: string): Promise<boolean> {
    if (!sourceRow || !columnName) return false; // Skip

    console.debug(`${this.logPrefix}Cutting cell '${columnName}' to clipboard`);

    // Get column path
    const path = this.getColumnPath(columnName);
    if (isNilOrBlank(path)) return false;

    const source = sourceRow.currentData;
    const value = getPropertyByPath(source, path);

    const target = setPropertyByPath({}, path, value);
    const targetForm = this.validatorService.getRowValidator();
    targetForm.patchValue(target);

    // Clear source value
    if (sourceRow.validator) {
      const newSource = setPropertyByPath({}, path, null);
      sourceRow.validator.patchValue(newSource);
    } else {
      setPropertyByPath(sourceRow.currentData, path, null);
    }

    console.debug(`${this.logPrefix}Cut data to clipboard`, target);

    this.context.clipboard = {
      data: {
        months: [targetForm.value],
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
    if (this.debug) console.debug(`${this.logPrefix}Paste ${sourceMonths.length} month(s) from clipboard...`, sourcePaths, event);

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

    this.addMetierBlocksForPaste(sourcePaths, targetPaths);

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

    let acceptToPaste = false;

    // Accept to paste into compatible PMFM
    const isPmfmOnly = sourcePaths.every((path) => path.startsWith('measurementValues'));
    const targetIsPmfm = targetPaths.every((path) => path.startsWith('measurementValues'));
    if (isPmfmOnly && targetIsPmfm) {
      const pmfmIds = sourcePaths.concat(targetPaths).map((pmfm) => parseInt(lastArrayValue(pmfm.split('.'))));
      const pmfms = this.pmfms.filter((pmfm) => pmfmIds.includes(pmfm.id));
      const sourcePathUnitLabel = pmfms.find((pmfm) => pmfm.id.toString() === sourcePathSuffix)?.unitLabel;
      acceptToPaste = pmfms.every((pmfm) => pmfm.unitLabel === sourcePathUnitLabel);
    }

    if (sourcePathSuffix !== targetPathSuffix && !acceptToPaste) {
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
      const targetPreviousValue = targetRow.currentData;
      const sourceMonth = sourceMonths[i % sourceMonths.length];

      // Creating a form
      const targetForm = this.validatorService.getFormGroup(targetPreviousValue, { withMeasurements: true, pmfms: this.pmfms });

      if (targetForm.value?.readonly) {
        this.showUnauthorizedToast();
        return;
      }

      //TODO getFormGroup does not return the pmfms, to be fixed with BL
      targetForm.get('measurementValues')?.patchValue(targetRow.currentData.measurementValues);

      this.onPrepareRowForm(targetForm, { listenChanges: false });
      const isActiveControl = targetForm.get('isActive');

      // If source's isActive is equals to NON_EXISTS
      const isNotExists: boolean = toNumber(sourceMonth.isActive, isActiveControl.value) === VesselUseFeaturesIsActiveEnum.NOT_EXISTS;
      if (isNotExists) {
        // Clear the month
        await this.clear(null, targetRow, { interactive: false });
      } else {
        // Read isActive (from the source data, or from the original data) and convert into a boolean
        let isActive: boolean = toNumber(sourceMonth.isActive, isActiveControl.value) === VesselUseFeaturesIsActiveEnum.ACTIVE;
        let sourceHasSomeValue = false;

        // For each path to paste
        sourcePaths.forEach((sourcePath, index) => {
          let sourceValue = getPropertyByPath(sourceMonth, sourcePath);
          sourceHasSomeValue = sourceHasSomeValue || isNotNil(sourceValue);

          // Don't copy value if flagged as outside the expertise are
          if (sourceValue?.properties?.outsideExpertiseArea) {
            sourceValue = undefined;
            this.showUnauthorizedToast('ACTIVITY_CALENDAR.WARNING.OUTSIDE_EXPERTISE_AREA_PASTE');
          }

          // Force isActive if paste some not null value, that is relative to an fishing activity (e.g metier, fishing area, etc.)
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
          const targetControl = targetPath && this.findOrCreateControl(targetForm, targetPath);
          if (targetControl) {
            targetControl.enable({ emitEvent: false });
            targetControl.setValue(sourceValue);
          }
        });

        const targetEntity = targetForm.value;

        // Mark entity as invalid, if form validation failed
        if (!targetForm.valid) {
          await AppFormUtils.waitWhilePending(targetForm);
          if (targetForm.invalid) {
            const errorMessage = this.formErrorAdapter.translateFormErrors(targetForm, this.errorTranslateOptions);
            DataEntityUtils.markAsInvalid(targetEntity, errorMessage);
          }
        }

        // Check if changes (e.g. if some of source or target cell has content) - see issue #840
        const hasChanges = sourceHasSomeValue || targetPaths.some((path) => isNotNil(getPropertyByPath(targetPreviousValue, path)));

        // Update the row, using the computed entity
        if (hasChanges) {
          await this.updateEntityToTable(targetEntity, targetRow, { confirmEdit: true });
        }
      }
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

  protected onCopyAllClick(programLabel: string) {
    const sources = (this.getValue() || []).filter((month) => month?.program?.label === programLabel);
    const targets: ActivityMonth[] = new Array(12).fill(null).map((month) => ActivityMonth.fromObject({ month }));

    // Clone sources to prevent unintended changes to original data
    sources.forEach((source) => {
      const target = source.clone();
      EntityUtils.cleanIdAndUpdateDate(target);
      EntityUtils.cleanIdsAndUpdateDates(target.gearUseFeatures);
      targets[source.month] = target;
    });

    this.copyAllClick.emit(targets);
  }

  protected onWillHideColumns(subColumns: ColumnDefinition[]): boolean {
    if (isEmptyArray(subColumns)) return true;

    if (this.debug) console.debug(`${this.logPrefix}Hide sub columns:`, subColumns);

    if (this.cellSelection) {
      const { paths: cellPaths } = this.getRowsFromSelection(this.cellSelection);
      const shouldHideCellSelection = subColumns.some((c) => cellPaths.includes(c.path));
      if (shouldHideCellSelection) this.removeCellSelection();
    }

    if (this.cellClipboard) {
      const { paths: clipboardPaths } = this.getRowsFromSelection(this.cellClipboard);
      const shouldHideClipboard = subColumns.some((c) => clipboardPaths.includes(c.path));
      if (shouldHideClipboard) this.clearClipboard(null, { clearContext: false });
    }

    return true;
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

  protected async onContextMenu(event: MouseEvent, cell?: HTMLElement, row?: AsyncTableElement<ActivityMonth>, columnName?: string) {
    row = row || this.editedRow;
    columnName = columnName || this.focusColumn;
    if (!row || !columnName) return; // Skip

    // Do not show contextual menu, if row is editing
    if (row.editing) {
      this.closeContextMenu();
      event.preventDefault();
      return;
    }

    // select current row
    if (!this.isInsideCellSelection(this.cellSelection, cell)) {
      await this.confirmEditCell(event, row, columnName);
    }
    event.preventDefault();

    // Stop resizing
    if (this.cellSelection?.resizing) {
      this.cellSelection.resizing = false;
    }

    this.menuTrigger.openMenu();
    const contextMenu = document.querySelector('.context-menu') as HTMLElement;
    contextMenu.style.position = 'fixed';
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
  }

  selectCell(event?: Event, row?: AsyncTableElement<ActivityMonth>, columnName?: string) {
    row = row ?? this.editedRow;
    columnName = columnName ?? this.focusColumn;
    if (!row || !columnName) return; //

    if (row === this.editedRow) {
      this.focusColumn = columnName;
    }

    const cellElement = this.getEventCellElement(event);
    this.cellSelection = {
      divElement: this.cellSelectionDivRef.nativeElement,
      cellElement,
      row,
      columnName,
      colspan: 1,
      rowspan: 1,
      resizing: false,
    };

    // Resize the new cell selection
    this.resizeCellSelection(this.cellSelection, 'cell');

    // Emit start cell selection event
    this.startCellSelection.next();
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
      const columnClasses = (cellElement?.classList.value.split(' ') || []).filter((clazz) => clazz.startsWith('mat-column-'));
      columnName = columnClasses.map((columnClass) => lastArrayValue(columnClass?.split('-'))).find((elem) => this.displayedColumns.includes(elem));
    } else if (this.focusColumn) {
      const rowElement = this.getEditedRowElement();
      cellElement = rowElement?.querySelector(`.mat-mdc-cell.mat-column-${this.focusColumn}`);
      columnName = this.focusColumn;
    }

    if (!cellElement || !columnName) return undefined; // Parent cell not found

    return { cellElement, columnName };
  }

  protected startListenFocusedElement(): Subscription {
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
      //console.debug(`${this.logPrefix}Start listening row focused element...`);

      this.editedRowFocusedElement = this.focusColumn && rowElement?.querySelector(`.mat-mdc-cell.mat-column-${this.focusColumn}`);

      subscription.add(
        fromEvent(rowElement, 'focusin').subscribe((event: Event) => {
          if (rowElement?.contains(event.target as Node)) {
            if (this.editedRowFocusedElement !== event.target) {
              // DEBUG
              //console.debug(`${this.logPrefix}Focused element changed to:`, event.target);
              this.editedRowFocusedElement = event.target as HTMLElement;
            }
          } else {
            // DEBUG
            //console.debug(`${this.logPrefix}Forget the focused element`);
            this.editedRowFocusedElement = null;
          }
        })
      );
      subscription.add(() => {
        // DEBUG
        //console.debug(`${this.logPrefix}Stop listening row focused element`);
        // Forget the focused element
        this.editedRowFocusedElement = null;
      });
    }); // Delay to skip the first focus (should be the focusColumn)

    return subscription;
  }

  protected hasSomeConflictualMonth(data?: ActivityMonth[]) {
    data = data || this.value;
    return data.some((month) => month.qualityFlagId === QualityFlagIds.CONFLICTUAL);
  }

  protected expandCellSelection(cellSelection?: TableCellSelection<ActivityMonth>, opts?: { emitEvent?: boolean }) {
    cellSelection = cellSelection || this.cellSelection;

    if (!cellSelection) return; // Skip

    const { paths } = this.getRowsFromSelection(cellSelection);
    if (isEmptyArray(paths)) return; // Skip

    const hiddenColumns = this.dynamicColumns?.filter((col) => col.expand && col.hidden && paths.includes(col.path));
    if (isEmptyArray(hiddenColumns)) return; // Skip

    // DEBUG
    console.debug(
      this.logPrefix + 'Expand hidden paths:',
      hiddenColumns.map((c) => c.path)
    );

    hiddenColumns.forEach((col) => col.expand());

    if (opts?.emitEvent !== false) {
      this.markForCheck();
    }
  }

  protected isInsideCellSelection(cellSelection: TableCellSelection, cellElement: HTMLElement) {
    cellSelection = cellSelection || this.cellSelection;
    const divElement: HTMLElement = cellSelection?.divElement;
    if (!cellElement || !divElement) return false;

    const divRect = divElement.getBoundingClientRect();
    const cellRect = cellElement.getBoundingClientRect();

    // Vérifier si le coin supérieur gauche de cellElement est à l'intérieur de divElement
    const isTopLeftInside = cellRect.left >= divRect.left && cellRect.top >= divRect.top;

    // Vérifier si le coin inférieur droit de cellElement est à l'intérieur de divElement
    const isBottomRightInside = cellRect.right - 1 <= divRect.right && cellRect.bottom - 1 <= divRect.bottom;

    // Si les deux coins sont à l'intérieur, alors cellElement est entièrement à l'intérieur de divElement
    return isTopLeftInside && isBottomRightInside;
  }

  save() {
    if (!this.hasErrorsInRows()) {
      return super.save();
    }
  }

  onAfterSave() {
    if (this.collapseAfterSave) {
      this.collapseAll();
    }
  }

  getErrorsInRows(): string[] {
    const rows = this.dataSource.getRows();
    const listErrors = [];

    rows.forEach((row) => {
      const form = this.validatorService.getFormGroup(row.currentData, { withMeasurements: true, pmfms: this.pmfms });

      const errorTranslate = this.formErrorAdapter.translateFormErrors(form, this.errorTranslateOptions);

      if (form.errors) {
        DataEntityUtils.markFormAsInvalid(row.validator, errorTranslate, { emitEvent: false });
        listErrors.push(errorTranslate);
      } else {
        DataEntityUtils.resetFormQualification(row.validator, { emitEvent: false });
      }
    });

    this.cd.detectChanges();

    // cannot be placed above the cd.detectChanges()
    if (listErrors.length > 0) {
      this.setError('ACTIVITY_CALENDAR.ERROR.VALID_MONTHS');
    }

    return listErrors;
  }

  hasErrorsInRows(): boolean {
    return this.getErrorsInRows()?.length > 0;
  }

  addMetierBlocksForPaste(sourcePaths: string[], targetPaths: string[]) {
    let targetMetierPath = sourcePaths.filter((path) => path.includes('gearUseFeatures'));
    let sourceMetierPath = targetPaths.filter((path) => path.includes('gearUseFeatures'));

    if (isEmptyArray(targetMetierPath) || isEmptyArray(sourceMetierPath)) return;

    targetMetierPath = this.extractGearUseFeatureIndex(targetMetierPath);
    sourceMetierPath = this.extractGearUseFeatureIndex(sourceMetierPath);

    if (isEmptyArray(targetMetierPath) || isEmptyArray(sourceMetierPath)) return;

    if (parseInt(sourceMetierPath[0]) + targetMetierPath.length < this.metierCount) return;

    const nbAvailableMetier = this.metierCount - parseInt(sourceMetierPath[0]);

    const numberMetierToAdd = Math.abs(nbAvailableMetier - targetMetierPath.length);

    for (let i = 0; i < numberMetierToAdd; i++) {
      this.addMetierBlock(null, { emitEvent: true, updateRows: false, scrollToBottom: false });
      targetPaths.push(`gearUseFeatures.${parseInt(sourceMetierPath.at(-1)) + i + 1}.metier`);
      for (let j = 0; j < MAX_FISHING_AREA_COUNT; j++) {
        targetPaths.push(
          `gearUseFeatures.${parseInt(sourceMetierPath.at(-1)) + i + 1}.fishingAreas.${j}.location`,
          `gearUseFeatures.${parseInt(sourceMetierPath.at(-1)) + i + 1}.fishingAreas.${j}.distanceToCoastGradient`,
          `gearUseFeatures.${parseInt(sourceMetierPath.at(-1)) + i + 1}.fishingAreas.${j}.depthGradient`,
          `gearUseFeatures.${parseInt(sourceMetierPath.at(-1)) + i + 1}.fishingAreas.${j}.nearbySpecificArea`
        );
      }
    }
  }

  extractGearUseFeatureIndex(str: string[]): string[] {
    if (isNil(str)) return [];
    return removeDuplicatesFromArray(
      str
        .map((str) => {
          const match = str.match(GEAR_USE_FEATURE_INDEX_REGEXP);
          return match ? match[1] : null;
        })
        .filter((num) => num !== null)
    );
  }

  collapseEmptyMetierBlock(programLabels: string[]) {
    if (programLabels.length === 1) {
      const rows = this.dataSource.getData()?.filter((row) => row.program.label === programLabels[0]);
      if (!rows || isEmptyArray(rows)) return;

      this.collapseAll();
      const gufNotEmpty = [];

      rows.forEach((row) => {
        row.gearUseFeatures.forEach((guf, index) => {
          if (GearUseFeatures.isNotEmpty(guf)) {
            gufNotEmpty.push('metier' + (index + 1));
          }
        });
      });
      const gufToExpand = removeDuplicatesFromArray(gufNotEmpty);

      gufToExpand.forEach((guf) => {
        this.toggleMetierBlock(event, guf);
      });
    } else {
      this.expandAll();
    }
  }

  protected async toggleCollapseAfterSave() {
    this.collapseAfterSave = !this.collapseAfterSave;
    if (this.usePageSettings && isNotNilOrBlank(this.settingsId)) {
      await this.savePageSettings(this.collapseAfterSave, CALENDAR_SETTINGS_ENUM.COLLAPSE_AFTER_SAVE_KEY);
    }
  }

  protected restoreCollapseAfterSave() {
    if (!this.usePageSettings || isNilOrBlank(this.settingsId)) return;

    const collapseAfterSave = toBoolean(
      this.settings.getPageSettings(this.settingsId, CALENDAR_SETTINGS_ENUM.COLLAPSE_AFTER_SAVE_KEY),
      toBoolean(this.collapseAfterSave, true)
    );
    if (this.collapseAfterSave !== collapseAfterSave) {
      this.collapseAfterSave = collapseAfterSave;
    }
  }
}
