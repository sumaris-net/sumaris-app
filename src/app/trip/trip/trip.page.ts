import { ChangeDetectionStrategy, Component, Inject, Injector, OnDestroy, Self, ViewChild } from '@angular/core';

import { TripService } from '../services/trip.service';
import { TripForm } from './trip.form';
import { SaleForm } from '../sale/sale.form';
import { OperationsTable } from '../operation/operations.table';
import { MeasurementsForm } from '../measurement/measurements.form.component';
import { PhysicalGearTable } from '../physicalgear/physical-gears.table';

import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { AppRootDataEditor } from '@app/data/form/root-data-editor.class';
import { FormGroup, Validators } from '@angular/forms';
import {
  Alerts,
  DateUtils,
  EntitiesStorage,
  EntityServiceLoadOptions,
  EntityUtils,
  fadeInOutAnimation,
  HistoryPageReference,
  InMemoryEntitiesService,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  NetworkService,
  PromiseEvent,
  ReferentialRef,
  UsageMode
} from '@sumaris-net/ngx-components';
import { TripsPageSettingsEnum } from './trips.table';
import { Operation, Trip } from '../services/model/trip.model';
import { ISelectPhysicalGearModalOptions, SelectPhysicalGearModal } from '../physicalgear/select-physical-gear.modal';
import { ModalController } from '@ionic/angular';
import { PhysicalGearFilter } from '../physicalgear/physical-gear.filter';
import { OperationEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { debounceTime, distinctUntilChanged, filter, first, mergeMap, startWith, tap } from 'rxjs/operators';
import { TableElement } from '@e-is/ngx-material-table';
import { Program } from '@app/referential/services/model/program.model';
import { environment } from '@environments/environment';
import { TRIP_FEATURE_NAME } from '@app/trip/services/config/trip.config';
import { Subscription } from 'rxjs';
import { OperationService } from '@app/trip/services/operation.service';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { APP_ENTITY_EDITOR } from '@app/data/quality/entity-quality-form.component';
import { Sale } from '@app/trip/services/model/sale.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN } from '@app/trip/physicalgear/physicalgear.service';

import { moment } from '@app/vendor';

const TripPageTabs = {
  GENERAL: 0,
  PHYSICAL_GEARS: 1,
  OPERATIONS: 2
};
export const TripPageSettingsEnum = {
  PAGE_ID: 'trip',
  FEATURE_ID: TRIP_FEATURE_NAME
};

@Component({
  selector: 'app-trip-page',
  templateUrl: './trip.page.html',
  styleUrls: ['./trip.page.scss'],
  animations: [fadeInOutAnimation],
  providers: [
    {provide: APP_ENTITY_EDITOR, useExisting: TripPage},
    {
      provide: PHYSICAL_GEAR_DATA_SERVICE_TOKEN,
      useFactory: () => new InMemoryEntitiesService(PhysicalGear, PhysicalGearFilter, {
        equals: PhysicalGear.equals,
        sortByReplacement: {'id': 'rankOrder'}
      })
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TripPage extends AppRootDataEditor<Trip, TripService> implements OnDestroy {

  readonly acquisitionLevel = AcquisitionLevelCodes.TRIP;
  showSaleForm = false;
  showGearTable = false;
  showOperationTable = false;
  mobile = false;
  settingsId: string;
  devAutoFillData = false;
  enableReport: boolean;
  operationEditor: OperationEditor;
  operationPasteFlags: number;

  private _forceMeasurementAsOptionalOnFieldMode = false;
  private _measurementSubscription: Subscription;

  @ViewChild('tripForm', {static: true}) tripForm: TripForm;
  @ViewChild('saleForm', {static: true}) saleForm: SaleForm;
  @ViewChild('physicalGearsTable', {static: true}) physicalGearsTable: PhysicalGearTable;
  @ViewChild('measurementsForm', {static: true}) measurementsForm: MeasurementsForm;
  @ViewChild('operationsTable', {static: true}) operationsTable: OperationsTable;

  get dirty(): boolean {
    return this.dirtySubject.value
      // Ignore operation table, when computing dirty state
      || (this.children?.filter(form => form !== this.operationsTable).findIndex(c => c.dirty) !== -1);
  }

  get forceMeasurementAsOptional(): boolean {
    return this._forceMeasurementAsOptionalOnFieldMode && this.isOnFieldMode;
  }

  constructor(
    injector: Injector,
    protected entities: EntitiesStorage,
    protected modalCtrl: ModalController,
    protected settings: LocalSettingsService,
    protected operationService: OperationService,
    protected context: ContextService,
    protected tripContext: TripContextService,
    public network: NetworkService,
    @Self() @Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN) public physicalGearService: InMemoryEntitiesService<PhysicalGear, PhysicalGearFilter>
  ) {
    super(injector,
      Trip,
      injector.get(TripService),
      {
        pathIdAttribute: 'tripId',
        tabCount: 3,
        autoOpenNextTab: !settings.mobile,
        enableListenChanges: true,
        i18nPrefix: 'TRIP.'
      });
    this.defaultBackHref = "/trips";
    this.mobile = settings.mobile;
    this.settingsId = TripPageSettingsEnum.PAGE_ID;
    this.operationPasteFlags = this.operationPasteFlags || 0;

    // FOR DEV ONLY ----
    this.debug = !environment.production;
    this.devAutoFillData = this.debug && (this.settings.getPageSettings(this.settingsId, 'devAutoFillData') == true) || false;
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    // Cascade refresh to operation tables
    this.registerSubscription(
      this.onUpdateView
        .pipe(
          filter(_ => !this.loading),
          debounceTime(200)
        )
        .subscribe(() => this.operationsTable.onRefresh.emit()));

    // Before delete gears, check if used in operations
    this.registerSubscription(
      this.physicalGearsTable.onBeforeDeleteRows
        .subscribe(async (event) => {
          const rows = (event.detail.rows as TableElement<PhysicalGear>[]);
          const canDelete = await this.operationService.areUsedPhysicalGears(this.data.id,  rows.map(row => row.currentData.id));
          event.detail.success(canDelete);
          if (!canDelete) {
            await Alerts.showError('TRIP.PHYSICAL_GEAR.ERROR.CANNOT_DELETE_USED_GEAR_HELP',
              this.alertCtrl, this.translate, {
                titleKey: 'TRIP.PHYSICAL_GEAR.ERROR.CANNOT_DELETE'
              });
          }
        }));

    // Allow to show operations tab, when add gear
    this.registerSubscription(
      this.physicalGearsTable.onConfirmEditCreateRow
        .subscribe((_) => this.showOperationTable = true));

    if (this.measurementsForm) {
      this.registerSubscription(
        this.measurementsForm.$pmfms
          .pipe(
            //debounceTime(400),
            filter(isNotNil),
            mergeMap(_ => this.measurementsForm.ready())
          )
          .subscribe(_ => this.onMeasurementsFormReady())
      );
    }

    // Auto fill form, in DEV mode
    if (!environment.production) {
      this.registerSubscription(
        this.$program
          .pipe(
            filter(isNotNil),
            filter(() => this.isNewData && this.devAutoFillData)
          )
          .subscribe(program => this.setTestValue(program))
      );
    }

  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._measurementSubscription?.unsubscribe();
  }

  setError(error: any, opts?: { emitEvent?: boolean; }) {

    // If errors in operations
    if (error?.operations) {
      // Show error in operation table
      this.operationsTable.setError('TRIP.ERROR.INVALID_OPERATIONS', {
        showOnlyInvalidRows: true
      });

      // Open the operation tab
      this.tabGroup.selectedIndex = TripPageTabs.OPERATIONS;
    } else {
      super.setError(error);

      // Reset operation filter and error
      this.operationsTable.resetError(opts);
    }
  }

  // change visibility
  resetError(opts?:  {emitEvent?: boolean}) {
    this.setError(undefined, opts);
  }

  translateControlPath(controlPath: string): string {
    return this.dataService.translateControlPath(controlPath, {i18nPrefix: this.i18nContext.prefix});
  }

  protected registerForms() {
    this.addChildForms([
      this.tripForm,
      this.saleForm,
      this.measurementsForm,
      this.physicalGearsTable,
      this.operationsTable
    ]);
  }

  protected async setProgram(program: Program) {
    if (!program) return; // Skip load Trip

    if (this.debug) console.debug(`[trip] Program ${program.label} loaded, with properties: `, program.properties);

    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nContext.suffix = i18nSuffix;
    this.operationEditor = program.getProperty<OperationEditor>(ProgramProperties.TRIP_OPERATION_EDITOR);
    this.enableReport = program.getPropertyAsBoolean(ProgramProperties.REPORT_ENABLE);

    // Trip form
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
    this.measurementsForm.forceOptional = this._forceMeasurementAsOptionalOnFieldMode

    // Physical gears
    this.physicalGearsTable.canEditRankOrder = program.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEAR_RANK_ORDER_ENABLE);
    this.physicalGearsTable.allowChildrenGears = program.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN);
    this.physicalGearsTable.showSubGearsCountColumn = this.physicalGearsTable.allowChildrenGears;
    this.physicalGearsTable.setModalOption('helpMessage', program.getProperty(ProgramProperties.TRIP_PHYSICAL_GEAR_HELP_MESSAGE));
    this.physicalGearsTable.setModalOption('maxVisibleButtons', program.getPropertyAsInt(ProgramProperties.MEASUREMENTS_MAX_VISIBLE_BUTTONS));
    this.physicalGearsTable.i18nColumnSuffix = i18nSuffix;

    // Operation table
    const positionEnabled = program.getPropertyAsBoolean(ProgramProperties.TRIP_POSITION_ENABLE);
    this.operationsTable.showPosition = positionEnabled;
    this.operationsTable.showFishingArea = !positionEnabled;
    const allowParentOperation = program.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION);
    this.operationsTable.allowParentOperation = allowParentOperation;
    this.operationsTable.showMap = this.network.online && program.getPropertyAsBoolean(ProgramProperties.TRIP_MAP_ENABLE);
    this.operationsTable.showEndDateTime = program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE);
    this.operationsTable.showFishingEndDateTime = !this.operationsTable.showEndDateTime && program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE);
    this.operationsTable.i18nColumnSuffix = i18nSuffix;
    this.operationsTable.detailEditor = this.operationEditor;
    this.operationPasteFlags = program.getPropertyAsInt(ProgramProperties.TRIP_OPERATION_PASTE_FLAGS);

    // Toggle showMap to false, when offline
    if (this.operationsTable.showMap) {
      const subscription = this.network.onNetworkStatusChanges
        .pipe(filter(status => status === 'none'))
        .subscribe(_ => {
          this.operationsTable.showMap = false;
          this.markForCheck();
          subscription.unsubscribe(); // Remove the subscription (not need anymore)
        });
      this.registerSubscription(subscription);
    }

    // If new data, enable gears tab
    if (this.isNewData) {
      this.showGearTable = true;
    }

    // Disabled operations tab, while no gear
    // But enable anyway, when parent operation allowed
    this.showOperationTable = this.showOperationTable || allowParentOperation;

    this.markAsReady();
    this.markForCheck();

    // Listen program, to reload if changes
    if (this.network.online) this.startListenProgramRemoteChanges(program);
  }

  protected async onNewEntity(data: Trip, options?: EntityServiceLoadOptions): Promise<void> {
    console.debug("[trip] New entity: applying defaults...");

    if (this.isOnFieldMode) {
      data.departureDateTime = moment();

      // Listen first opening the operations tab, then save
      this.registerSubscription(
        this.tabGroup.selectedTabChange
          .pipe(
            filter(event => this.showOperationTable && event.index === TripPageTabs.OPERATIONS),
            // Save trip when opening the operation tab
            mergeMap(_ => this.save()),
            filter(saved => saved === true),
            first(),
            // If save succeed, propagate the tripId to the table
            tap(_ => this.operationsTable.setTripId(this.data.id))
          )
          .subscribe()
        );
    }

    // Fill defaults, from table's filter
    const searchFilter = this.settings.getPageSettings<any>(TripsPageSettingsEnum.PAGE_ID, TripsPageSettingsEnum.FILTER_KEY);
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
      const contextualProgram = this.context.getValue('program') as Program;
      if (contextualProgram?.label) {
        data.program = ReferentialRef.fromObject(contextualProgram);
      }
    }

    this.showGearTable = false;
    this.showOperationTable = false;

    // Propagate program
    const programLabel = data.program && data.program.label;
    this.$programLabel.next(programLabel);

    // Enable forms (do not wait for program load)
    if (!programLabel) this.markAsReady();
  }

  protected async onEntityLoaded(data: Trip, options?: EntityServiceLoadOptions): Promise<void> {
    // program
    const programLabel =  data.program?.label;
    if (programLabel) this.$programLabel.next(programLabel);
  }

  updateViewState(data: Trip, opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    super.updateViewState(data, opts);

    // Update tabs state (show/hide)
    this.updateTabsState(data);
  }

  updateTabsState(data: Trip) {
    // Enable gears tab if a program has been selected
    this.showGearTable = !this.isNewData || isNotNilOrBlank(this.$programLabel.getValue());

    // Enable operations tab if has gears
    this.showOperationTable = this.showOperationTable || (this.showGearTable && isNotEmptyArray(data.gears));
  }

  async openReport(event?: UIEvent) {
    if (this.dirty) {
      const data = await this.saveAndGetDataIfValid();
      if (!data) return; // Cancel
    }
    return this.router.navigateByUrl(this.computePageUrl(this.data.id) + '/report');
  }

  protected async setValue(data: Trip) {
    try {
      const isNewData = isNil(data.id);

      const jobs: Promise<any>[] = [];

      // Set data to form
      jobs.push(this.tripForm.setValue(data));

      this.saleForm.value = data && data.sale || new Sale();

      // Measurements
      if (isNewData) {
        this.measurementsForm.value = data?.measurements || [];
      }
      else {
        this.measurementsForm.programLabel = data.program?.label;
        jobs.push(this.measurementsForm.setValue(data?.measurements || []));
      }

      // Set physical gears
      this.physicalGearsTable.tripId = data.id;
      this.physicalGearService.value = data && data.gears || [];
      jobs.push(this.physicalGearsTable.waitIdle({ timeout: 2000 }));

      // Operations table
      if (!isNewData && this.operationsTable) this.operationsTable.setTripId(data.id);

      await Promise.all(jobs);

      console.debug('[trip] setValue() [OK]');
    }
    catch (err) {
      const error = err?.message || err;
      console.debug('[trip] Error during setValue(): ' + error, err);
      this.setError(error);
    }
  }

  async onOpenOperation({id, row}: { id?: number; row: TableElement<any>; }) {

    const savedOrContinue = await this.saveIfDirtyAndConfirm();
    if (savedOrContinue) {
      this.markAsLoading();

      // Store the trip in context
      this.tripContext?.setValue('trip', this.data.clone());

      // Propagate the usage mode (e.g. when try to 'terminate' the trip)
      this.tripContext?.setValue('usageMode', this.usageMode);

      // Store the selected operation (e.g. useful to avoid rankOrder computation, in the operation page)
      this.tripContext?.setValue('operation', row.currentData);

      // Propagate the past flags to clipboard
      this.tripContext?.setValue('clipboard', {
        data: new Operation(),
        pasteFlags: this.operationPasteFlags
      });

      setTimeout(async () => {
        const editorPath = this.operationEditor !== 'legacy' ? [this.operationEditor] : [];
        await this.router.navigate(['trips', this.data.id, 'operation', ...editorPath, id], {queryParams: {} /*reset query params*/ });

        this.markAsLoaded();
      });
    }
  }

  async onNewOperation(event?: any) {
    const savePromise: Promise<boolean> = this.isOnFieldMode && this.dirty
      // If on field mode: try to save silently
      ? this.save(event)
      // If desktop mode: ask before save
      : this.saveIfDirtyAndConfirm();

    const savedOrContinue = await savePromise;
    if (savedOrContinue) {
      this.markAsLoading();

      // Store the trip in context
      this.tripContext?.setValue('trip', this.data.clone());

      // Propagate the usage mode (e.g. when try to 'terminate' the trip)
      this.tripContext?.setValue('usageMode', this.usageMode);

      // OPen the operation editor
      setTimeout(async () => {
        const editor = this.operationEditor !== 'legacy' ? [this.operationEditor] : [];
        await this.router.navigate(['trips', this.data.id, 'operation', ...editor, 'new'], {
          queryParams: {}
        });
        this.markAsLoaded();
      });
    }
  }

  async onDuplicateOperation(event?: { data: Operation }) {
    if (!event?.data) return; // Skip

    // Fill clipboard
    this.tripContext?.setValue('clipboard', {
      data: event.data.clone(),
      pasteFlags: this.operationPasteFlags
    });

    await this.onNewOperation(event);
  }

  // For DEV only
  setTestValue(program: Program) {
    const departureDate = moment().startOf('minutes');
    const returnDate = departureDate.clone().add(15, 'day');
    const trip = Trip.fromObject({
      program,
      departureDateTime: departureDate,
      departureLocation: {id: 11, label: 'FRDRZ', name: 'Douarnenez', entityName: 'Location', __typename: 'ReferentialVO'},
      returnDateTime: returnDate,
      returnLocation: {id: 11, label: 'FRDRZ', name: 'Douarnenez', entityName: 'Location', __typename: 'ReferentialVO'},
      vesselSnapshot: {id: 1, vesselId: 1, name: 'Vessel 1', basePortLocation: {id: 11, label: 'FRDRZ', name: 'Douarnenez', __typename: 'ReferentialVO'} , __typename: 'VesselSnapshotVO'},
      measurements: [
        { numericalValue: 1, pmfmId: 21}, // NB fisherman
        { numericalValue: 1, pmfmId: 188} // GPS_USED
      ]
    });

    this.measurementsForm.value = trip.measurements;
    this.form.patchValue(trip);
  }

  devToggleAutoFillData() {
    this.devAutoFillData = !this.devAutoFillData;
    this.settings.savePageSetting(this.settingsId, this.devAutoFillData, 'devAutoFillData');
  }

  devToggleOfflineMode() {
    if (this.network.offline) {
      this.network.setForceOffline(false);
    }
    else {
      this.network.setForceOffline();
    }
  }

  async copyLocally() {
    if (!this.data) return;

    // Copy the trip
    await this.dataService.copyLocallyById(this.data.id, { withOperations: true });

  }

  /**
   * Open a modal to select a previous gear
   * @param event
   */
  async openSearchPhysicalGearModal(event: PromiseEvent<PhysicalGear>) {
    if (!event || !event.detail.success) return; // Skip (missing callback)

    const trip = Trip.fromObject(this.tripForm.value);
    const vessel = trip.vesselSnapshot;
    const date = trip.departureDateTime || trip.returnDateTime;
    const withOffline = EntityUtils.isLocal(trip) || trip.synchronizationStatus === 'DIRTY';
    if (!vessel || !date) return; // Skip

    const programLabel = this.$programLabel.getValue();
    const acquisitionLevel = event.type || this.physicalGearsTable.acquisitionLevel;
    const filter = <PhysicalGearFilter>{
      program: {label: programLabel},
      vesselId: vessel.id,
      excludeTripId: trip.id,
      startDate: DateUtils.min(moment(), date && date.clone()).add(-1, 'month'),
      endDate: date && date.clone(),
      excludeChildGear: (acquisitionLevel === AcquisitionLevelCodes.PHYSICAL_GEAR),
      excludeParentGear: (acquisitionLevel === AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR)
    };
    const distinctBy = ['gear.id', 'rankOrder',
      ...(this.physicalGearsTable.pmfms||[])
        .filter(p => p.required && !p.hidden)
        .map(p => `measurementValues.${p.id}`)
    ];

    const hasTopModal = !!(await this.modalCtrl.getTop());
    const modal = await this.modalCtrl.create({
      component: SelectPhysicalGearModal,
      componentProps: <ISelectPhysicalGearModalOptions>{
        allowMultiple: false,
        programLabel,
        acquisitionLevel,
        filter,
        distinctBy,
        withOffline
      },
      backdropDismiss: false,
      keyboardClose: true,
      cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large'
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
    }
    else {
      // User cancelled
      event.detail.error('CANCELLED');
    }
  }

  canUserWrite(data: Trip, opts?: any): boolean {
    return isNil(data.validationDate) && this.dataService.canUserWrite(data, opts);
  }

  /* -- protected methods -- */

  protected get form(): FormGroup {
    return this.tripForm.form;
  }

  protected computeUsageMode(data: Trip): UsageMode {
    return this.settings.isUsageMode('FIELD') || data.synchronizationStatus === 'DIRTY' ? 'FIELD' : 'DESK';
  }

  protected computeNextTabIndex(): number | undefined {
    return super.computeNextTabIndex() || this.selectedTabIndex;
  }

  protected computeTitle(data: Trip): Promise<string> {

    // new data
    if (!data || isNil(data.id)) {
      return this.translate.get('TRIP.NEW.TITLE').toPromise();
    }

    // Existing data
    return this.translate.get('TRIP.EDIT.TITLE', {
      vessel: data.vesselSnapshot && (data.vesselSnapshot.exteriorMarking || data.vesselSnapshot.name),
      departureDateTime: data.departureDateTime && this.dateFormat.transform(data.departureDateTime) as string
    }).toPromise();
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      icon: 'boat'
    };
  }

  protected async getJsonValueToSave(): Promise<any> {
    const json = await super.getJsonValueToSave();

    json.sale = !this.saleForm.empty ? this.saleForm.value : null;

    return json;
  }

  protected async getValue(): Promise<Trip> {
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
      this.showOperationTable && this.operationsTable.invalid
    ];

    return invalidTabs.findIndex(invalid => invalid === true);
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

    const formGroup = this.measurementsForm.form as FormGroup;

    // If PMFM "Use of a GPS ?" exists, then use to enable/disable positions or fishing area
    const isGPSUsed = formGroup?.controls[PmfmIds.GPS_USED];
    if (isNotNil(isGPSUsed)) {
      isGPSUsed.setValidators(Validators.required);
      this._measurementSubscription.add(
        isGPSUsed.valueChanges
          .pipe(
            debounceTime(400),
            startWith<any, any>(isGPSUsed.value),
            filter(isNotNil),
            distinctUntilChanged()
          )
          .subscribe(isGPSUsed => {

            if (this.debug) console.debug('[trip] Enable/Disable positions or fishing area, because GPS_USED=' + isGPSUsed);

            // Enable positions, when has gps
            this.operationsTable.showPosition = isGPSUsed;
            // Enable fishing area, when has not gps
            this.operationsTable.showFishingArea = !isGPSUsed;

            this.markForCheck();
          })
      );
    }

  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
