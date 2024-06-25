import { AfterViewInit, ChangeDetectionStrategy, Component, Inject, Injector, Input, OnDestroy, OnInit, Self, ViewChild } from '@angular/core';

import { TripService } from './trip.service';
import { TripForm } from './trip.form';
import { SaleForm } from '../sale/sale.form';
import { OperationsTable } from '../operation/operations.table';
import { MeasurementsForm } from '@app/data/measurement/measurements.form.component';
import { PhysicalGearTable } from '../physicalgear/physical-gears.table';
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { AppRootDataEntityEditor, RootDataEntityEditorState } from '@app/data/form/root-data-editor.class';
import { UntypedFormGroup, Validators } from '@angular/forms';
import {
  AccountService,
  Alerts,
  AppErrorWithDetails,
  AppHelpModal,
  AppHelpModalOptions,
  DateUtils,
  EntitiesStorage,
  EntityServiceLoadOptions,
  EntityUtils,
  equals,
  fadeInOutAnimation,
  FilesUtils,
  HistoryPageReference,
  InMemoryEntitiesService,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  MINIFY_ENTITY_FOR_LOCAL_STORAGE,
  PromiseEvent,
  Property,
  ReferentialRef,
  ReferentialUtils,
  sleep,
  toNumber,
} from '@sumaris-net/ngx-components';
import { TripsPageSettingsEnum } from './trips.table';
import { Operation, Trip } from './trip.model';
import { ISelectPhysicalGearModalOptions, SelectPhysicalGearModal } from '../physicalgear/select-physical-gear.modal';
import { ModalController } from '@ionic/angular';
import { PhysicalGearFilter } from '../physicalgear/physical-gear.filter';
import { OperationEditor, ProgramProperties, TripReportType } from '@app/referential/services/config/program.config';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { debounceTime, distinctUntilChanged, filter, first, map, mergeMap, startWith, tap, throttleTime } from 'rxjs/operators';
import { TableElement } from '@e-is/ngx-material-table';
import { Program } from '@app/referential/services/model/program.model';
import { TRIP_FEATURE_NAME } from '@app/trip/trip.config';
import { firstValueFrom, from, merge, Observable, Subscription } from 'rxjs';
import { OperationService } from '@app/trip/operation/operation.service';
import { TripContextService } from '@app/trip/trip-context.service';
import { Sale } from '@app/trip/sale/sale.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN } from '@app/trip/physicalgear/physicalgear.service';

import { Moment } from 'moment';
import { PredefinedColors } from '@ionic/core';
import { ExtractionType } from '@app/extraction/type/extraction-type.model';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
import { TripFilter } from '@app/trip/trip/trip.filter';

import { APP_DATA_ENTITY_EDITOR, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';

export const TripPageSettingsEnum = {
  PAGE_ID: 'trip',
  FEATURE_ID: TRIP_FEATURE_NAME,
};

export interface TripPageState extends RootDataEntityEditorState {
  departureDateTime: Moment;
  departureLocation: ReferentialRef;
  reportTypes: Property[];
  returnDateTime: Moment;
}

@Component({
  selector: 'app-trip-page',
  templateUrl: './trip.page.html',
  styleUrls: ['./trip.page.scss'],
  animations: [fadeInOutAnimation],
  providers: [
    { provide: APP_DATA_ENTITY_EDITOR, useExisting: TripPage },
    {
      provide: PHYSICAL_GEAR_DATA_SERVICE_TOKEN,
      useFactory: () =>
        new InMemoryEntitiesService(PhysicalGear, PhysicalGearFilter, {
          equals: PhysicalGear.equals,
          sortByReplacement: { id: 'rankOrder' },
        }),
    },
    RxState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripPage extends AppRootDataEntityEditor<Trip, TripService, number, TripPageState> implements OnInit, OnDestroy, AfterViewInit {
  static TABS = {
    GENERAL: 0,
    PHYSICAL_GEARS: 1,
    OPERATIONS: 2,
  };

  private _forceMeasurementAsOptionalOnFieldMode = false;
  private _measurementSubscription: Subscription;

  @RxStateSelect() protected returnDateTime$: Observable<Moment>;

  @RxStateProperty() protected reportTypes: Property[];

  showSaleForm = false;
  showGearTable = false;
  showOperationTable = false;
  enableReport: boolean;
  operationEditor: OperationEditor;
  operationPasteFlags: number;
  canDownload = false;
  helpUrl: string;

  @Input() toolbarColor: PredefinedColors = 'primary';

  @ViewChild('tripForm', { static: true }) tripForm: TripForm;
  @ViewChild('saleForm', { static: true }) saleForm: SaleForm;
  @ViewChild('physicalGearsTable', { static: true }) physicalGearsTable: PhysicalGearTable;
  @ViewChild('measurementsForm', { static: true }) measurementsForm: MeasurementsForm;
  @ViewChild('operationsTable', { static: true }) operationsTable: OperationsTable;

  get dirty(): boolean {
    return (
      this.dirtySubject.value ||
      // Ignore operation table, when computing dirty state
      this.children?.filter((form) => form !== this.operationsTable).findIndex((c) => c.dirty) !== -1
    );
  }

  get forceMeasurementAsOptional(): boolean {
    return this._forceMeasurementAsOptionalOnFieldMode && this.isOnFieldMode;
  }

  constructor(
    injector: Injector,
    protected entities: EntitiesStorage,
    protected modalCtrl: ModalController,
    protected operationService: OperationService,
    protected tripContext: TripContextService,
    protected accountService: AccountService,
    @Self() @Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN) public physicalGearService: InMemoryEntitiesService<PhysicalGear, PhysicalGearFilter>
  ) {
    super(injector, Trip, injector.get(TripService), {
      pathIdAttribute: 'tripId',
      tabCount: 3,
      enableListenChanges: true,
      i18nPrefix: 'TRIP.',
      acquisitionLevel: AcquisitionLevelCodes.TRIP,
      settingsId: TripPageSettingsEnum.PAGE_ID,
      canCopyLocally: accountService.isAdmin(),
    });
    this.defaultBackHref = '/trips';
    this.operationPasteFlags = this.operationPasteFlags || 0;

    // FOR DEV ONLY ----
    this.logPrefix = '[trip-page] ';
  }

  ngOnInit() {
    super.ngOnInit();

    // Listen some field
    this._state.connect('departureDateTime', this.tripForm.departureDateTimeChanges.pipe(filter((d) => d?.isValid())));
    this._state.connect('returnDateTime', this.tripForm.maxDateChanges.pipe(filter((d) => d?.isValid())));
    this._state.connect('departureLocation', this.tripForm.departureLocationChanges);
    this._state.connect(
      'reportTypes',
      this.program$.pipe(
        map((program) => {
          return program.getPropertyAsStrings(ProgramProperties.TRIP_REPORT_TYPE).map((key) => {
            const values = ProgramProperties.TRIP_REPORT_TYPE.values as Property[];
            return values.find((item) => item.key === key);
          });
        })
      )
    );

    // Update the data context
    this.registerSubscription(
      merge(
        this.selectedTabIndexChange.pipe(filter((tabIndex) => tabIndex === TripPage.TABS.OPERATIONS && this.showOperationTable)),
        from(this.ready())
      )
        .pipe(debounceTime(500), throttleTime(500))
        .subscribe(() => this.updateDataContext())
    );
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    // Cascade refresh to operation tables
    this.registerSubscription(
      this.onUpdateView
        .pipe(
          filter(() => !this.loading),
          debounceTime(250)
        )
        .subscribe(() => this.operationsTable.onRefresh.emit())
    );

    // Before delete gears, check if used in operations
    this.registerSubscription(
      this.physicalGearsTable.onBeforeDeleteRows.subscribe(async (event) => {
        const rows = event.detail.rows as TableElement<PhysicalGear>[];
        const canDelete = await this.operationService.areUsedPhysicalGears(
          this.data.id,
          rows.map((row) => row.currentData.id)
        );
        event.detail.success(canDelete);
        if (!canDelete) {
          await Alerts.showError('TRIP.PHYSICAL_GEAR.ERROR.CANNOT_DELETE_USED_GEAR_HELP', this.alertCtrl, this.translate, {
            titleKey: 'TRIP.PHYSICAL_GEAR.ERROR.CANNOT_DELETE',
          });
        }
      })
    );

    // Allow to show operations tab, when add gear
    this.registerSubscription(this.physicalGearsTable.onConfirmEditCreateRow.subscribe(() => (this.showOperationTable = true)));

    if (this.measurementsForm) {
      this.registerSubscription(
        this.measurementsForm.pmfms$
          .pipe(
            //debounceTime(400),
            filter(isNotNil),
            mergeMap(() => this.measurementsForm.ready())
          )
          .subscribe(() => this.onMeasurementsFormReady())
      );
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._measurementSubscription?.unsubscribe();
  }

  setError(error: string | AppErrorWithDetails, opts?: { emitEvent?: boolean; detailsCssClass?: string }) {
    // If errors in operations
    if (typeof error !== 'string' && error?.details?.errors?.operations) {
      // Show error in operation table
      this.operationsTable.setError('TRIP.ERROR.INVALID_OPERATIONS', {
        showOnlyInvalidRows: true,
      });

      // Open the operation tab
      this.tabGroup.selectedIndex = TripPage.TABS.OPERATIONS;

      // Reset other errors
      this.physicalGearsTable.resetError(opts);
      super.setError(undefined, opts);
    }

    // If errors in gears
    else if (typeof error !== 'string' && error?.details?.errors?.gears) {
      // Show error in operation table
      this.physicalGearsTable.setError('TRIP.ERROR.INVALID_GEARS');

      // Open the operation tab
      this.tabGroup.selectedIndex = TripPage.TABS.PHYSICAL_GEARS;

      // Reset other errors
      this.operationsTable.resetError(opts);
      super.setError(undefined, opts);
    }

    // Error in the main form
    else {
      super.setError(error, opts);

      // Reset error in table (and filter in op table)
      this.physicalGearsTable.resetError(opts);
      this.operationsTable.resetError(opts);
    }
  }

  // change visibility to public
  resetError(opts?: { emitEvent?: boolean }) {
    this.setError(undefined, opts);
  }

  translateControlPath(controlPath: string): string {
    return this.dataService.translateControlPath(controlPath, { i18nPrefix: this.i18nContext.prefix });
  }

  protected registerForms() {
    this.addForms([this.tripForm, this.saleForm, this.measurementsForm, this.physicalGearsTable, this.operationsTable]);
  }

  protected async setProgram(program: Program) {
    if (!program) return; // Skip load Trip

    // Important: should load the strategy resolution
    await super.setProgram(program);

    // Update the context
    if (this.tripContext.program !== program) {
      this.tripContext.setValue('program', program);
    }

    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nContext.suffix = i18nSuffix;
    this.operationEditor = program.getProperty<OperationEditor>(ProgramProperties.TRIP_OPERATION_EDITOR);
    this.enableReport = program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_ENABLE);

    // Trip form
    this.tripForm.i18nSuffix = i18nSuffix;
    this.tripForm.showSamplingStrata = program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLING_STRATA_ENABLE);
    this.tripForm.showObservers = program.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE);
    if (!this.tripForm.showObservers && this.data?.observers) {
      this.data.observers = []; // make sure to reset data observers, if any
    }
    this.tripForm.showMetiers = program.getPropertyAsBoolean(ProgramProperties.TRIP_METIERS_ENABLE);
    if (!this.tripForm.showMetiers && this.data?.metiers) {
      this.data.metiers = []; // make sure to reset data metiers, if any
    }
    this.tripForm.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.TRIP_LOCATION_LEVEL_IDS);
    this.tripForm.locationSuggestLengthThreshold = program.getPropertyAsInt(ProgramProperties.TRIP_LOCATION_FILTER_MIN_LENGTH);
    this.tripForm.minDurationInHours = program.getPropertyAsInt(ProgramProperties.TRIP_MIN_DURATION_HOURS);
    this.tripForm.maxDurationInHours = program.getPropertyAsInt(ProgramProperties.TRIP_MAX_DURATION_HOURS);

    // Sale form
    this.showSaleForm = program.getPropertyAsBoolean(ProgramProperties.TRIP_SALE_ENABLE);

    // Measurement form
    this._forceMeasurementAsOptionalOnFieldMode = program.getPropertyAsBoolean(ProgramProperties.TRIP_MEASUREMENTS_OPTIONAL_ON_FIELD_MODE);
    this.measurementsForm.forceOptional = this._forceMeasurementAsOptionalOnFieldMode;
    this.measurementsForm.maxVisibleButtons = program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS);
    this.measurementsForm.maxItemCountForButtons = program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS);

    // Physical gears
    this.physicalGearsTable.canEditRankOrder = program.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEAR_RANK_ORDER_ENABLE);
    this.physicalGearsTable.allowChildrenGears = program.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN);
    this.physicalGearsTable.showSubGearsCountColumn = this.physicalGearsTable.allowChildrenGears;
    this.physicalGearsTable.setModalOption('helpMessage', program.getProperty(ProgramProperties.TRIP_PHYSICAL_GEAR_HELP_MESSAGE));
    this.physicalGearsTable.setModalOption('maxVisibleButtons', program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS));
    this.physicalGearsTable.setModalOption(
      'maxItemCountForButtons',
      program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_ITEM_COUNT_FOR_BUTTONS)
    );
    this.physicalGearsTable.setModalOption('minChildrenCount', program.getPropertyAsInt(ProgramProperties.TRIP_PHYSICAL_GEAR_MIN_CHILDREN_COUNT));
    this.physicalGearsTable.i18nColumnSuffix = i18nSuffix;
    this.physicalGearsTable.hideEmptyPmfmColumn = program.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEARS_COLUMNS_PMFM_HIDE_EMPTY);
    this.physicalGearsTable.includedPmfmIds = program.getPropertyAsNumbers(ProgramProperties.TRIP_PHYSICAL_GEARS_COLUMNS_PMFM_IDS);

    // Operation table
    const positionEnabled = program.getPropertyAsBoolean(ProgramProperties.TRIP_POSITION_ENABLE);
    this.operationsTable.showPosition = positionEnabled;
    this.operationsTable.showFishingArea = !positionEnabled;
    const allowParentOperation = program.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION);
    this.operationsTable.allowParentOperation = allowParentOperation;
    this.operationsTable.showMap = this.network.online && program.getPropertyAsBoolean(ProgramProperties.TRIP_MAP_ENABLE);
    this.operationsTable.showEndDateTime = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE);
    this.operationsTable.showFishingEndDateTime =
      !this.operationsTable.showEndDateTime && program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE);
    this.operationsTable.i18nColumnSuffix = i18nSuffix;
    this.operationsTable.detailEditor = this.operationEditor;
    this.operationPasteFlags = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_PASTE_FLAGS);
    this.helpUrl = program.getProperty(ProgramProperties.TRIP_HELP_URL);

    // Toggle showMap to false, when offline
    if (this.operationsTable.showMap) {
      const subscription = this.network.onNetworkStatusChanges.pipe(filter((status) => status === 'none')).subscribe(() => {
        this.operationsTable.showMap = false;
        this.markForCheck();
        subscription.unsubscribe(); // Remove the subscription (not need anymore)
      });
      this.registerSubscription(subscription);
    }

    // If new data, enable gears tab
    if (this.isNewData) this.showGearTable = true;

    // If new data: update trip form (need to update validator, with min/maxDurationInHours)
    if (this.isNewData) this.tripForm.updateFormGroup();

    // Disabled operations tab, while no gear
    // But enable anyway, when parent operation allowed
    this.showOperationTable = this.showOperationTable || allowParentOperation;

    this.markAsReady();
    this.markForCheck();

    // Listen program, to reload if changes
    if (this.network.online) this.startListenProgramRemoteChanges(program);
  }

  protected watchStrategyFilter(program: Program): Observable<Partial<StrategyFilter>> {
    console.debug(this.logPrefix + 'Computing strategy filter, using resolution: ' + this.strategyResolution);

    switch (this.strategyResolution) {
      // Spatio-temporal
      case DataStrategyResolutions.SPATIO_TEMPORAL:
        return this._state
          .select(['acquisitionLevel', 'departureDateTime', 'departureLocation'], (_) => _, {
            acquisitionLevel: equals,
            departureDateTime: DateUtils.equals,
            departureLocation: ReferentialUtils.equals,
          })
          .pipe(
            map(({ acquisitionLevel, departureDateTime, departureLocation }) => {
              return <Partial<StrategyFilter>>{
                acquisitionLevel,
                programId: program.id,
                startDate: departureDateTime,
                endDate: departureDateTime,
                location: departureLocation,
              };
            }),
            // DEBUG
            tap((values) => console.debug(this.logPrefix + 'Strategy filter changed:', values))
          );
      default:
        return super.watchStrategyFilter(program);
    }
  }

  protected canLoadStrategy(program: Program, strategyFilter: Partial<StrategyFilter>): boolean {
    switch (this.strategyResolution) {
      case DataStrategyResolutions.SPATIO_TEMPORAL:
        return (
          super.canLoadStrategy(program, strategyFilter) &&
          ReferentialUtils.isNotEmpty(strategyFilter?.location) &&
          isNotNil(strategyFilter?.startDate)
        );
      default:
        return super.canLoadStrategy(program, strategyFilter);
    }
  }

  protected async setStrategy(strategy: Strategy): Promise<void> {
    await super.setStrategy(strategy);

    // Update the context
    if (this.tripContext.strategy !== strategy) {
      if (this.debug) console.debug(this.logPrefix + "Update context's strategy...", strategy);
      this.tripContext.strategy = strategy;
    }
  }

  protected async onNewEntity(data: Trip, options?: EntityServiceLoadOptions): Promise<void> {
    console.debug('[trip] New entity: applying defaults...');

    if (this.isOnFieldMode) {
      data.departureDateTime = DateUtils.moment();

      // Listen first opening the operations tab, then save
      this.registerSubscription(
        this.tabGroup.selectedTabChange
          .pipe(
            filter((event) => this.showOperationTable && event.index === TripPage.TABS.OPERATIONS),
            // Save trip when opening the operation tab
            mergeMap(() => this.save()),
            filter((saved) => saved === true),
            first(),
            // If save succeed, propagate the tripId to the table
            tap(() => this.operationsTable.setTripId(this.data.id))
          )
          .subscribe()
      );
    }

    // Fill defaults, from table's filter
    const tableId = this.queryParams['tableId'];
    const searchFilter = tableId && this.settings.getPageSettings<TripFilter>(tableId, TripsPageSettingsEnum.FILTER_KEY);
    if (searchFilter) {
      // Synchronization status
      if (searchFilter.synchronizationStatus && searchFilter.synchronizationStatus !== 'SYNC') {
        data.synchronizationStatus = 'DIRTY';
      }

      // program
      if (searchFilter.program && searchFilter.program.label) {
        data.program = ReferentialRef.fromObject(searchFilter.program);
      }

      // Vessel
      if (searchFilter.vesselSnapshot) {
        data.vesselSnapshot = VesselSnapshot.fromObject(searchFilter.vesselSnapshot);
      }

      // Location
      if (searchFilter.location) {
        data.departureLocation = ReferentialRef.fromObject(searchFilter.location);
      }
    }

    // Set contextual program, if any
    if (!data.program) {
      const contextualProgram = this.tripContext.getValue('program') as Program;
      if (contextualProgram?.label) {
        data.program = ReferentialRef.fromObject(contextualProgram);
      }
    }

    this.showGearTable = false;
    this.showOperationTable = false;

    // Propagate program
    const programLabel = data.program && data.program.label;
    this.programLabel = programLabel;

    // Enable forms (do not wait for program load)
    if (!programLabel) this.markAsReady();
  }

  protected async onEntityLoaded(data: Trip, options?: EntityServiceLoadOptions): Promise<void> {
    const programLabel = data.program?.label;
    if (programLabel) this.programLabel = programLabel;
    this.canDownload = !this.mobile && EntityUtils.isRemoteId(data?.id);

    this._state.set({ departureDateTime: data.departureDateTime, departureLocation: data.departureLocation });
  }

  updateViewState(data: Trip, opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.updateViewState(data, opts);

    // Update tabs state (show/hide)
    this.updateTabsState(data);
  }

  updateTabsState(data: Trip) {
    // Enable gears tab if a program has been selected
    this.showGearTable = !this.isNewData || isNotNilOrBlank(this.programLabel);

    // Enable operations tab if has gears
    this.showOperationTable = this.showOperationTable || (this.showGearTable && isNotEmptyArray(data.gears));
  }

  async openReport(reportType?: TripReportType) {
    if (this.dirty) {
      const data = await this.saveAndGetDataIfValid();
      if (!data) return; // Cancel
    }

    if (!reportType) reportType = this.reportTypes.length === 1 ? <TripReportType>this.reportTypes[0].key : 'legacy';

    const reportPath = reportType !== <TripReportType>'legacy' ? reportType.split('-') : [];
    return this.router.navigateByUrl([this.computePageUrl(this.data.id), 'report', ...reportPath].join('/'));
  }

  async setValue(data: Trip) {
    try {
      const isNewData = isNil(data.id);

      const jobs: Promise<any>[] = [];

      // Set data to form
      jobs.push(this.tripForm.setValue(data));

      this.saleForm.value = (data && data.sale) || new Sale();

      // Measurements
      if (isNewData) {
        this.measurementsForm.value = data?.measurements || [];
      } else {
        this.measurementsForm.programLabel = data.program?.label;
        jobs.push(this.measurementsForm.setValue(data?.measurements || []));
      }

      // Set physical gears
      this.physicalGearsTable.tripId = data.id;
      this.physicalGearService.value = (data && data.gears) || [];
      if (!isNewData) jobs.push(this.physicalGearsTable.waitIdle({ timeout: 2000 }));

      // Operations table
      if (!isNewData && this.operationsTable) this.operationsTable.setTripId(data.id);

      await Promise.all(jobs);

      // DEBUG
      //console.debug('[trip] setValue() [OK]');
    } catch (err) {
      const error = err?.message || err;
      console.debug('[trip] Error during setValue(): ' + error, err);
      this.setError(error);
    }
  }

  async onOpenOperation(row: TableElement<Operation>) {
    const saved = this.isOnFieldMode && this.dirty ? await this.save(undefined) : await this.saveIfDirtyAndConfirm();
    if (!saved) return; // Cannot saved

    this.markAsLoading();

    // Propagate the usage mode (e.g. when try to 'terminate' the trip)
    this.tripContext.setValue('usageMode', this.usageMode);

    // Store the trip in context
    this.tripContext.setValue('trip', this.data.clone());

    // Store the selected operation (e.g. useful to avoid rankOrder computation, in the operation page)
    this.tripContext.setValue('operation', row.currentData);

    // Propagate the past flags to clipboard
    this.tripContext.setValue('clipboard', {
      data: null, // Reset data
      pasteFlags: this.operationPasteFlags, // Keep flags
    });

    setTimeout(async () => {
      const editorPath = this.operationEditor !== 'legacy' ? [this.operationEditor] : [];
      await this.router.navigate(['trips', this.data.id, 'operation', ...editorPath, row.currentData.id], { queryParams: {} /*reset query params*/ });

      this.markAsLoaded();
    });
  }

  async onNewOperation(event?: any, operationQueryParams?: any) {
    const saved =
      this.isOnFieldMode && this.dirty
        ? // If on field mode: try to save silently
          await this.save(event)
        : // If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm();

    if (!saved) return; // Cannot save

    this.markAsLoading();

    // Store the trip in context
    this.tripContext.setValue('trip', this.data.clone());

    // Propagate the usage mode (e.g. when try to 'terminate' the trip)
    this.tripContext.setValue('usageMode', this.usageMode);

    // Reset operation
    this.tripContext.resetValue('operation');

    // Open the operation editor
    setTimeout(async () => {
      const editorPath = this.operationEditor !== 'legacy' ? [this.operationEditor] : [];
      await this.router.navigate(['trips', this.data.id, 'operation', ...editorPath, 'new'], {
        queryParams: operationQueryParams || {},
      });
      this.markAsLoaded();
    });
  }

  async onDuplicateOperation(event?: { data: Operation }) {
    if (!event?.data) return; // Skip

    // Fill clipboard
    this.tripContext.setValue('clipboard', {
      data: event.data.clone(),
      pasteFlags: this.operationPasteFlags,
    });

    await this.onNewOperation(event);
  }

  async copyLocally() {
    if (!this.data) return;

    // Copy the trip
    await this.dataService.copyLocallyById(this.data.id, { withOperations: true, displaySuccessToast: true });
  }

  /**
   * Open a modal to select a previous gear
   *
   * @param event
   */
  async openSearchPhysicalGearModal(event: PromiseEvent<PhysicalGear>) {
    if (!event || !event.detail.success) return; // Skip (missing callback)

    const trip = Trip.fromObject(this.tripForm.value);
    const vessel = trip.vesselSnapshot;
    const date = trip.departureDateTime || trip.returnDateTime;
    const withOffline = EntityUtils.isLocal(trip) || trip.synchronizationStatus === 'DIRTY';
    if (!vessel || !date) return; // Skip

    const acquisitionLevel = event.type || this.physicalGearsTable.acquisitionLevel;
    const programLabel = this.programLabel;
    const strategyId = toNumber(this.strategy?.id, this.physicalGearsTable.strategyId);
    const filter = <PhysicalGearFilter>{
      program: { label: programLabel },
      vesselId: vessel.id,
      excludeTripId: trip.id,
      startDate: DateUtils.min(DateUtils.moment(), date && date.clone()).add(-1, 'month'),
      endDate: date && date.clone(),
      excludeChildGear: acquisitionLevel === AcquisitionLevelCodes.PHYSICAL_GEAR,
      excludeParentGear: acquisitionLevel === AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR,
    };
    const showGearColumn = acquisitionLevel === AcquisitionLevelCodes.PHYSICAL_GEAR;
    const includedPmfmIds = this.tripContext.program?.getPropertyAsNumbers(ProgramProperties.TRIP_PHYSICAL_GEARS_COLUMNS_PMFM_IDS);
    const distinctBy = [
      'gear.id',
      'rankOrder',
      ...(this.physicalGearsTable.pmfms || [])
        .filter((p) => (p.required && !p.hidden) || includedPmfmIds?.includes(p.id))
        .map((p) => `measurementValues.${p.id}`),
    ];

    const hasTopModal = !!(await this.modalCtrl.getTop());
    const modal = await this.modalCtrl.create({
      component: SelectPhysicalGearModal,
      componentProps: <ISelectPhysicalGearModalOptions>{
        allowMultiple: false,
        acquisitionLevel,
        programLabel,
        strategyId,
        filter,
        distinctBy,
        withOffline,
        showGearColumn,
      },
      backdropDismiss: false,
      keyboardClose: true,
      cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large',
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const { data } = await modal.onDidDismiss();

    if (isNotEmptyArray(data)) {
      const gearToCopy = PhysicalGear.fromObject(data[0]);
      console.debug('[trip] Result of select gear modal:', gearToCopy);
      // Call resolve callback
      event.detail.success(gearToCopy);
    } else {
      // User cancelled
      event.detail.error('CANCELLED');
    }
  }

  async save(event?: Event, opts?: any): Promise<boolean> {
    if (this.saving || this.loading) return false;

    // Workaround to avoid the option menu to be selected
    if (this.mobile) await sleep(50);

    return super.save(event, opts);
  }

  /* -- protected methods -- */

  protected get form(): UntypedFormGroup {
    return this.tripForm.form;
  }

  protected computeNextTabIndex(): number | undefined {
    return super.computeNextTabIndex() || this.selectedTabIndex;
  }

  protected computeTitle(data: Trip): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return firstValueFrom(this.translate.get('TRIP.NEW.TITLE'));
    }

    // Existing data
    return firstValueFrom(
      this.translate.get('TRIP.EDIT.TITLE', {
        vessel: data.vesselSnapshot && (data.vesselSnapshot.exteriorMarking || data.vesselSnapshot.name),
        departureDateTime: data.departureDateTime && (this.dateFormat.transform(data.departureDateTime) as string),
      })
    );
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    await this.ready();
    return {
      ...(await super.computePageHistory(title)),
      icon: 'boat',
    };
  }

  protected async getJsonValueToSave(): Promise<any> {
    const json = await super.getJsonValueToSave();

    json.sale = !this.saleForm.empty ? this.saleForm.value : null;

    return json;
  }

  async getValue(): Promise<Trip> {
    const data = await super.getValue();

    data.measurements = this.measurementsForm.value;

    if (this.physicalGearsTable.dirty) {
      await this.physicalGearsTable.save();
    }
    data.gears = this.physicalGearService.value;

    return data;
  }

  protected getFirstInvalidTabIndex(): number {
    const invalidTabs = [
      this.tripForm.invalid || this.measurementsForm.invalid,
      this.showGearTable && this.physicalGearsTable.invalid,
      this.showOperationTable && this.operationsTable.invalid,
    ];

    return invalidTabs.findIndex((invalid) => invalid === true);
  }

  /**
   * Configure specific behavior
   */
  protected async onMeasurementsFormReady() {
    // Wait program to be loaded
    await this.ready();

    // DEBUG
    //console.debug('[operation-page] Measurement form is ready');

    // Clean existing subscription (e.g. when acquisition level change, this function can= be called many times)
    this._measurementSubscription?.unsubscribe();
    this._measurementSubscription = new Subscription();

    const formGroup = this.measurementsForm.form as UntypedFormGroup;

    // If PMFM "Use of a GPS ?" exists, then use to enable/disable positions or fishing area
    const isGPSUsed = formGroup?.controls[PmfmIds.GPS_USED];
    if (isNotNil(isGPSUsed)) {
      isGPSUsed.setValidators(Validators.required);
      this._measurementSubscription.add(
        isGPSUsed.valueChanges
          .pipe(debounceTime(400), startWith<any, any>(isGPSUsed.value), filter(isNotNil), distinctUntilChanged())
          .subscribe((value) => {
            if (this.debug) console.debug('[trip] Enable/Disable positions or fishing area, because GPS_USED=' + value);

            // Enable positions, when has gps
            this.operationsTable.showPosition = value;
            // Enable fishing area, when has not gps
            this.operationsTable.showFishingArea = !value;

            this.markForCheck();
          })
      );
    }
  }

  /**
   * Update data context
   *
   * @protected
   */
  protected updateDataContext() {
    console.debug(this.logPrefix + 'Updating data context...');

    // Program
    const program = this.program;
    if (this.tripContext.program !== program) {
      this.tripContext.setValue('program', program);
    }

    // Strategy
    const strategy = this.strategy;
    if (this.tripContext.strategy !== strategy) {
      this.tripContext.setValue('strategy', strategy);
    }
  }

  protected async downloadAsJson(event?: UIEvent) {
    const confirmed = await this.saveIfDirtyAndConfirm(event);
    if (confirmed === false) return;

    if (!EntityUtils.isRemoteId(this.data?.id)) return; // Skip

    // Create file content
    const data = await this.dataService.load(this.data.id, { fullLoad: true, withOperation: true });
    const json = data.asObject(MINIFY_ENTITY_FOR_LOCAL_STORAGE);
    const content = JSON.stringify([json]);

    // Write to file
    FilesUtils.writeTextToFile(content, {
      filename: this.translate.instant('TRIP.TABLE.DOWNLOAD_JSON_FILENAME'),
      type: 'application/json',
    });
  }

  protected async openDownloadPage(type: ExtractionType) {
    const confirmed = await this.saveIfDirtyAndConfirm();
    if (confirmed === false) return;

    if (!EntityUtils.isRemoteId(this.data?.id)) return; // Skip

    // Create extraction type and filter
    type = type || ExtractionType.fromLiveLabel('PMFM_TRIP');
    const programLabel = this.data.program?.label;
    const tripId = this.data.id;
    const filter = ExtractionUtils.createTripFilter(programLabel, [tripId]);
    const queryParams = ExtractionUtils.asQueryParams(type, filter);

    // Open extraction
    await this.router.navigate(['extraction', 'data'], { queryParams });
  }

  async openHelpModal(event) {
    if (event) event.preventDefault();

    if (!this.helpUrl) {
      await Alerts.showError(
        'TRIP.WARNING.NO_HELP_URL',
        this.alertCtrl,
        this.translate,
        {
          titleKey: 'WARNING.OOPS_DOTS',
        },
        {
          programLabel: this.programLabel,
        }
      );
      return;
    }

    console.debug(`[trip-page] Open help page {${this.helpUrl}}...`);
    const modal = await this.modalCtrl.create({
      component: AppHelpModal,
      componentProps: <AppHelpModalOptions>{
        title: this.translate.instant('COMMON.HELP.TITLE'),
        markdownUrl: this.helpUrl,
      },
      backdropDismiss: true,
    });
    return modal.present();
  }

  // For DEV only
  async devFillTestValue(program: Program) {
    console.debug(this.logPrefix + 'DEV auto fill data');
    const departureDateTime = DateUtils.moment().startOf('minutes');
    const returnDateTime = departureDateTime.clone().add(15, 'day');
    const trip = Trip.fromObject({
      program,
      departureDateTime,
      departureLocation: <ReferentialRef>{ id: 11, label: 'FRDRZ', name: 'Douarnenez', entityName: 'Location', __typename: 'ReferentialVO' },
      returnDateTime,
      returnLocation: <ReferentialRef>{ id: 11, label: 'FRDRZ', name: 'Douarnenez', entityName: 'Location', __typename: 'ReferentialVO' },
      vesselSnapshot: {
        id: 1,
        vesselId: 1,
        name: 'Vessel 1',
        basePortLocation: { id: 11, label: 'FRDRZ', name: 'Douarnenez', __typename: 'ReferentialVO' },
        __typename: 'VesselSnapshotVO',
      },
      measurements: [
        { numericalValue: 1, pmfmId: PmfmIds.NB_FISHERMEN }, // NB fisherman
        { numericalValue: 1, pmfmId: 188 }, // GPS_USED
      ],
      // Keep existing synchronizationStatus
      synchronizationStatus: this.data?.synchronizationStatus,
    });

    this.measurementsForm.value = trip.measurements;
    this.form.patchValue(trip);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
