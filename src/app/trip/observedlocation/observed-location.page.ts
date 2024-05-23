import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ObservedLocationForm } from './form/observed-location.form';
import { ObservedLocationService } from './observed-location.service';
import { LandingsTable } from '../landing/landings.table';
import { AppRootDataEntityEditor, RootDataEntityEditorState } from '@app/data/form/root-data-editor.class';
import { UntypedFormGroup } from '@angular/forms';
import {
  AccountService,
  Alerts,
  AppErrorWithDetails,
  AppTable,
  CORE_CONFIG_OPTIONS,
  DateUtils,
  EntityServiceLoadOptions,
  EntityUtils,
  fadeInOutAnimation,
  firstNotNilPromise,
  HistoryPageReference,
  isNil,
  isNotNil,
  ReferentialRef,
  ReferentialUtils,
  StatusIds,
  toBoolean,
  TranslateContextService,
} from '@sumaris-net/ngx-components';
import { ModalController } from '@ionic/angular';
import { SelectVesselsForDataModal, SelectVesselsForDataModalOptions } from './vessels/select-vessel-for-data.modal';
import { ObservedLocation } from './observed-location.model';
import { Landing } from '../landing/landing.model';
import { LandingEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Observable, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, first, mergeMap, startWith, tap } from 'rxjs/operators';
import { AggregatedLandingsTable } from '../aggregated-landing/aggregated-landings.table';
import { Program } from '@app/referential/services/model/program.model';
import { ObservedLocationsPageSettingsEnum } from './table/observed-locations.page';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import { LandingFilter } from '../landing/landing.filter';
import { VesselFilter } from '@app/vessel/services/filter/vessel.filter';
import { TableElement } from '@e-is/ngx-material-table';
import { PredefinedColors } from '@ionic/core';
import { VesselService } from '@app/vessel/services/vessel-service';
import { ObservedLocationContextService } from '@app/trip/observedlocation/observed-location-context.service';
import { ObservedLocationFilter } from '@app/trip/observedlocation/observed-location.filter';

import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
import { OBSERVED_LOCATION_FEATURE_NAME } from '@app/trip/trip.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { Strategy } from '@app/referential/services/model/strategy.model';
import moment from 'moment';

export const ObservedLocationPageSettingsEnum = {
  PAGE_ID: 'observedLocation',
  FEATURE_ID: OBSERVED_LOCATION_FEATURE_NAME,
};

type LandingTableType = 'legacy' | 'aggregated';
type ILandingsTable = AppTable<any> & { setParent: (value: ObservedLocation | undefined) => void };

export interface ObservedLocationPageState extends RootDataEntityEditorState {
  landingTableType: LandingTableType;
  landingTable: ILandingsTable;
}

@Component({
  selector: 'app-observed-location-page',
  templateUrl: './observed-location.page.html',
  styleUrls: ['./observed-location.page.scss'],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: APP_DATA_ENTITY_EDITOR, useExisting: ObservedLocationPage }, RxState],
})
export class ObservedLocationPage
  extends AppRootDataEntityEditor<ObservedLocation, ObservedLocationService, number, ObservedLocationPageState>
  implements OnInit, OnDestroy
{
  static TABS = {
    GENERAL: 0,
    LANDINGS: 1,
    PETS: 2,
  };

  private _measurementSubscription: Subscription;

  @RxStateSelect() landingTableType$: Observable<LandingTableType>;
  @RxStateSelect() landingTable$: Observable<ILandingsTable>;
  dbTimeZone = DateUtils.moment().tz();

  allowAddNewVessel: boolean;
  showLandingTab = false;
  showPETSTab = false;
  showVesselType: boolean;
  showVesselBasePortLocation: boolean;
  addLandingUsingHistoryModal: boolean;
  showRecorder = true;
  showObservers = true;
  showStrategyCard = false;
  enableReport: boolean;
  landingEditor: LandingEditor;

  @RxStateProperty() landingTableType: LandingTableType;
  @RxStateProperty() landingTable: ILandingsTable;

  @Input() showToolbar = true;
  @Input() showQualityForm = true;
  @Input() showOptionsMenu = true;
  @Input() toolbarColor: PredefinedColors = 'primary';

  @ViewChild('observedLocationForm', { static: true }) observedLocationForm: ObservedLocationForm;
  @ViewChild('landingsTable') landingsTable: LandingsTable;
  @ViewChild('aggregatedLandingsTable') aggregatedLandingsTable: AggregatedLandingsTable;

  constructor(
    injector: Injector,
    protected modalCtrl: ModalController,
    protected accountService: AccountService,
    protected vesselService: VesselService,
    protected translateContext: TranslateContextService,
    protected observedLocationContext: ObservedLocationContextService
  ) {
    super(injector, ObservedLocation, injector.get(ObservedLocationService), {
      pathIdAttribute: 'observedLocationId',
      tabCount: 2,
      i18nPrefix: 'OBSERVED_LOCATION.EDIT.',
      enableListenChanges: true,
      acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION,
      settingsId: ObservedLocationPageSettingsEnum.PAGE_ID,
      canCopyLocally: accountService.isAdmin(),
    });
    this.defaultBackHref = '/observations';

    // FOR DEV ONLY ----
    this.logPrefix = '[observed-location-page] ';
  }

  ngOnInit() {
    super.ngOnInit();

    this.registerSubscription(
      this.configService.config.subscribe((config) => {
        if (!config) return;
        this.showRecorder = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_RECORDER);
        this.dbTimeZone = config.getProperty(CORE_CONFIG_OPTIONS.DB_TIMEZONE);
        this.markForCheck();
      })
    );

    // Detect embedded mode, from route params
    this.registerSubscription(
      this.route.queryParams.pipe(first()).subscribe((queryParams) => {
        // Manage embedded mode
        const embedded = toBoolean(queryParams['embedded'], false);
        if (embedded) {
          this.showLandingTab = false;
          this.showOptionsMenu = false;
          this.showQualityForm = false;
          this.autoOpenNextTab = false; // Keep first tab
          this.toolbarColor = 'secondary';
          this.markForCheck();
        }
      })
    );

    if (this.observedLocationForm) {
      this.registerSubscription(
        this.observedLocationForm.pmfms$
          .pipe(
            //debounceTime(400),
            filter(isNotNil),
            mergeMap(() => this.observedLocationForm.ready())
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
    // If errors in landings
    if (typeof error !== 'string' && error?.details?.errors?.landings) {
      // Show error in landing table
      this.landingsTable.setError('OBSERVED_LOCATION.ERROR.INVALID_LANDINGS', {
        showOnlyInvalidRows: true,
      });

      // Open the landing tab
      this.tabGroup.selectedIndex = ObservedLocationPage.TABS.LANDINGS;

      // Reset other errors
      super.setError(undefined, opts);
    }

    // If other errors in landings
    else if (typeof error !== 'string' && error?.details?.errors?.observations) {
      // Show error in landing table
      this.landingsTable.setError(error.message, {
        showOnlyInvalidRows: false,
        errorDetails: error.details.errors.observations,
      });

      // Open the landing tab
      this.tabGroup.selectedIndex = ObservedLocationPage.TABS.LANDINGS;

      // Reset other errors
      super.setError(undefined, opts);
    }

    // Error in the main form
    else {
      super.setError(error, opts);

      // Reset error in table (and filter in op table)
      this.landingsTable?.resetError(opts);
    }
  }

  /**
   * Configure specific behavior
   */
  protected async onMeasurementsFormReady() {
    // Wait program to be loaded
    //await this.ready();

    // DEBUG
    console.debug('[observed-location-page] Measurement form is ready');

    // Clean existing subscription (e.g. when acquisition level change, this function can= be called many times)
    this._measurementSubscription?.unsubscribe();
    this._measurementSubscription = new Subscription();

    const formGroup = this.observedLocationForm?.measurementValuesForm as UntypedFormGroup;

    // If PMFM "PETS" exists, then use to enable/disable PETS tab
    const petsControl = formGroup?.controls[PmfmIds.PETS];
    if (isNotNil(petsControl)) {
      this._measurementSubscription.add(
        petsControl.valueChanges
          .pipe(debounceTime(400), startWith<any, any>(petsControl.value), filter(isNotNil), distinctUntilChanged())
          .subscribe((value) => {
            if (this.debug) console.debug('[observed-location-page] Enable/Disable PETS tab, because PETS=' + value);

            // Enable tab, when has PETS
            this.showPETSTab = value;
            this.tabCount = this.showPETSTab ? 3 : 2;

            this.markForCheck();
          })
      );
    }
  }

  updateView(data: ObservedLocation | null, opts?: { emitEvent?: boolean; openTabIndex?: number; updateRoute?: boolean }): Promise<void> {
    //return super.updateView(Object.freeze(data), opts);
    return super.updateView(data, opts);
  }

  updateViewState(data: ObservedLocation, opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.updateViewState(data);

    // Update tabs state (show/hide)
    this.updateTabsState(data);

    if (this.aggregatedLandingsTable) this.aggregatedLandingsTable.updateCanEditDelete(isNotNil(data.validationDate));
  }

  updateTabsState(data: ObservedLocation) {
    // Enable landings tab
    this.showLandingTab = this.showLandingTab || !this.isNewData || this.isOnFieldMode;

    // INFO CLT : #IMAGINE-614 / Set form to dirty in creation in order to manager errors on silent save (as done for update)
    if (this.isNewData && this.isOnFieldMode) {
      this.markAsDirty();
    }

    // Move to second tab
    if (this.showLandingTab && this.autoOpenNextTab && !this.isNewData && this.selectedTabIndex === 0) {
      this.selectedTabIndex = 1;
      this.tabGroup.realignInkBar();
      this.autoOpenNextTab = false; // Should switch only once
    }
  }

  async onOpenLanding(row) {
    if (!row) return;

    const saved =
      this.isOnFieldMode && this.dirty
        ? // If on field mode: try to save silently
          await this.save(undefined)
        : // If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm();

    if (!saved) return; // Cannot save

    this.markAsLoading();

    try {
      await this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/${row.currentData.id}`);
    } finally {
      this.markAsLoaded();
    }
  }

  async onNewLanding(event?: any) {
    const saved =
      this.isOnFieldMode && this.dirty
        ? // If on field mode: try to save silently
          await this.save(event)
        : // If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm();

    if (!saved) return; // Cannot save

    this.markAsLoading();

    try {
      // Add landing using vessels modal
      if (this.addLandingUsingHistoryModal) {
        const vessel = await this.openSelectVesselModal();
        if (vessel && this.landingsTable) {
          const rankOrder = ((await this.landingsTable.getMaxRankOrderOnVessel(vessel)) || 0) + 1;
          await this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/new?vessel=${vessel.id}&rankOrder=${rankOrder}`);
        }
      }
      // Create landing without vessel selection
      else {
        const rankOrder = ((await this.landingsTable.getMaxRankOrder()) || 0) + 1;
        await this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/new?rankOrder=${rankOrder}`);
      }
    } finally {
      this.markAsLoaded();
    }
  }

  async onNewAggregatedLanding(event?: any) {
    const saved =
      this.isOnFieldMode && this.dirty
        ? // If on field mode: try to save silently
          await this.save(event)
        : // If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm();

    if (!saved) return; // Cannot save

    this.markAsLoading();

    try {
      const vessel = await this.openSelectVesselModal(true);
      if (vessel && this.aggregatedLandingsTable) {
        await this.aggregatedLandingsTable.addAggregatedRow(vessel);
      }
    } finally {
      this.markAsLoaded();
    }
  }

  async onNewTrip<T extends Landing>(row: TableElement<T>) {
    const saved =
      this.isOnFieldMode && this.dirty
        ? // If on field mode: try to save silently
          await this.save(undefined)
        : // If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm();

    if (!saved) return; // Cannot save

    this.markAsLoading();

    try {
      const landing = row.currentData;
      await this.router.navigateByUrl(
        `/observations/${this.data.id}/${this.landingEditor}/new?vessel=${landing.vesselSnapshot.id}&landing=${landing.id}`
      );
    } finally {
      this.markAsLoaded();
    }
  }

  async onNewSale(event?: any) {
    await this.onNewLanding(event);
  }

  async onOpenTrip<T extends Landing>(row: TableElement<T>) {
    const saved =
      this.isOnFieldMode && this.dirty
        ? // If on field mode: try to save silently
          await this.save(undefined)
        : // If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm();

    if (!saved) return; // Cannot save

    this.markAsLoading();

    try {
      await this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/${row.currentData.tripId}`);
    } finally {
      this.markAsLoaded();
    }
  }

  async onOpenSale<T extends Landing>(row: TableElement<T>) {
    const saved =
      this.isOnFieldMode && this.dirty
        ? // If on field mode: try to save silently
          await this.save(undefined)
        : // If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm();

    if (!saved) return; // Cannot save

    this.markAsLoading();

    try {
      await this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/${row.currentData.saleIds[0]}`);
    } finally {
      this.markAsLoaded();
    }
  }

  async openSelectVesselModal(excludeExistingVessels?: boolean): Promise<VesselSnapshot | undefined> {
    const programLabel = this.aggregatedLandingsTable?.programLabel || this.programLabel || this.data.program.label;
    if (!this.data.startDateTime || !programLabel) {
      throw new Error('Root entity has no program and start date. Cannot open select vessels modal');
    }

    // Prepare vessel filter's value
    const excludeVesselIds =
      (toBoolean(excludeExistingVessels, false) && this.aggregatedLandingsTable && (await this.aggregatedLandingsTable.vesselIdsAlreadyPresent())) ||
      [];
    const showOfflineVessels = EntityUtils.isLocal(this.data) && (await this.vesselService.countAll({ synchronizationStatus: 'DIRTY' })) > 0;
    const defaultVesselSynchronizationStatus = this.network.offline || showOfflineVessels ? 'DIRTY' : 'SYNC';

    // Prepare landing's filter
    const startDate = this.data.startDateTime.clone().add(-15, 'days');
    const endDate = this.data.startDateTime.clone();
    const landingFilter = LandingFilter.fromObject({
      programLabel,
      startDate,
      endDate,
      locationId: ReferentialUtils.isNotEmpty(this.data.location) ? this.data.location.id : undefined,
      groupByVessel: (this.landingsTable && this.landingsTable.isTripDetailEditor) || isNotNil(this.aggregatedLandingsTable),
      excludeVesselIds,
      synchronizationStatus: 'SYNC', // only remote entities. This is required to read 'Remote#LandingVO' local storage
    });

    const modal = await this.modalCtrl.create({
      component: SelectVesselsForDataModal,
      componentProps: <SelectVesselsForDataModalOptions>{
        programLabel: this.programLabel,
        requiredStrategy: this.requiredStrategy,
        strategyId: this.strategy?.id,
        allowMultiple: false,
        landingFilter,
        vesselFilter: <VesselFilter>{
          statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
          onlyWithRegistration: true,
        },
        allowAddNewVessel: this.allowAddNewVessel,
        showVesselTypeColumn: this.showVesselType,
        showBasePortLocationColumn: this.showVesselBasePortLocation,
        showSamplesCountColumn: this.landingsTable?.showSamplesCountColumn,
        defaultVesselSynchronizationStatus,
        showOfflineVessels,
        maxDateVesselRegistration: endDate,
      },
      keyboardClose: true,
      cssClass: 'modal-large',
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const { data } = await modal.onDidDismiss();

    // If modal return a landing, use it
    if (data && data[0] instanceof Landing) {
      console.debug(this.logPrefix + 'Vessel selection modal result:', data);
      return (data[0] as Landing).vesselSnapshot;
    }
    if (data && data[0] instanceof VesselSnapshot) {
      console.debug(this.logPrefix + 'Vessel selection modal result:', data);
      const vessel = data[0] as VesselSnapshot;
      if (excludeVesselIds.includes(data.id)) {
        await Alerts.showError('AGGREGATED_LANDING.VESSEL_ALREADY_PRESENT', this.alertCtrl, this.translate);
        return;
      }
      return vessel;
    } else {
      console.debug(this.logPrefix + 'Vessel selection modal was cancelled');
    }
  }

  addRow(event: MouseEvent) {
    if (this.landingsTable) {
      this.landingsTable.addRow(event);
    } else if (this.aggregatedLandingsTable) {
      this.aggregatedLandingsTable.addRow(event);
    }
  }

  async openReport() {
    if (this.dirty) {
      const data = await this.saveAndGetDataIfValid();
      if (!data) return; // Cancel
    }
    return this.router.navigateByUrl(this.computePageUrl(this.data.id) + '/report');
  }

  async copyLocally() {
    if (!this.data) return;
    // Copy the trip
    await this.dataService.copyLocallyById(this.data.id, { withLanding: true, displaySuccessToast: true });
  }

  /* -- protected methods -- */

  protected async setProgram(program: Program) {
    if (!program) return; // Skip
    await super.setProgram(program);

    // Update the context
    if (this.observedLocationContext.program !== program) {
      this.observedLocationContext.program = program;
    }

    try {
      this.observedLocationForm.showSamplingStrata = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_SAMPLING_STRATA_ENABLE);
      this.observedLocationForm.showEndDateTime = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_END_DATE_TIME_ENABLE);
      this.observedLocationForm.withEndDateRequired = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_END_DATE_REQUIRED);
      this.observedLocationForm.showStartTime = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_START_TIME_ENABLE);
      this.observedLocationForm.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.OBSERVED_LOCATION_LOCATION_LEVEL_IDS);
      this.observedLocationForm.showObservers = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_OBSERVERS_ENABLE);
      if (!this.observedLocationForm.showObservers && this.data?.observers) {
        this.data.observers = []; // make sure to reset data observers, if any
      }
      const aggregatedLandings = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_ENABLE);
      if (aggregatedLandings) {
        // Force some date properties
        this.observedLocationForm.timezone = this.dbTimeZone;
        this.observedLocationForm.showEndDateTime = true;
        this.observedLocationForm.showStartTime = false;
        this.observedLocationForm.showEndTime = false;
        this.observedLocationForm.startDateDay = program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_START_DAY);
        this.observedLocationForm.forceDurationDays = program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT);
      } else {
        this.observedLocationForm.timezone = null; // Use local TZ for dates
      }
      this.allowAddNewVessel = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_CREATE_VESSEL_ENABLE);
      this.addLandingUsingHistoryModal = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_SHOW_LANDINGS_HISTORY);

      let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
      i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
      this.i18nContext.suffix = i18nSuffix;

      this.enableReport = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_REPORT_ENABLE);
      this.landingEditor = program.getProperty<LandingEditor>(ProgramProperties.LANDING_EDITOR);
      this.showVesselType = program.getPropertyAsBoolean(ProgramProperties.VESSEL_TYPE_ENABLE);
      this.showVesselBasePortLocation = program.getPropertyAsBoolean(ProgramProperties.LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE);
      this.showStrategyCard = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_STRATEGY_CARD_ENABLE);

      this.landingTableType = aggregatedLandings ? 'aggregated' : 'legacy';

      // Wait the expected table (set using ngInit - see template)
      const landingTable$ = this.landingTable$.pipe(
        filter((t) => (aggregatedLandings ? t instanceof AggregatedLandingsTable : t instanceof LandingsTable))
      );
      const table = await firstNotNilPromise(landingTable$, { stop: this.destroySubject });

      // Configure table
      if (aggregatedLandings) {
        console.debug(this.logPrefix + 'Init aggregated landings table:', table);
        const aggregatedLandingsTable = table as AggregatedLandingsTable;
        aggregatedLandingsTable.timezone = this.dbTimeZone;
        aggregatedLandingsTable.nbDays = program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT);
        aggregatedLandingsTable.programLabel = program.getProperty(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM);
      } else {
        console.debug(this.logPrefix + 'Init landings table:', table);
        const landingsTable = table as LandingsTable;
        landingsTable.i18nColumnSuffix = i18nSuffix;
        landingsTable.detailEditor = this.landingEditor;

        landingsTable.showDateTimeColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_DATE_TIME_ENABLE);
        landingsTable.showVesselTypeColumn = this.showVesselType;
        landingsTable.showVesselBasePortLocationColumn = this.showVesselBasePortLocation;
        landingsTable.showObserversColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_OBSERVERS_ENABLE);
        landingsTable.showCreationDateColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_CREATION_DATE_ENABLE);
        landingsTable.showRecorderPersonColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_RECORDER_PERSON_ENABLE);
        landingsTable.showLocationColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_LOCATION_ENABLE);
        landingsTable.showSamplesCountColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_SAMPLES_COUNT_ENABLE);
        landingsTable.includedPmfmIds = program.getPropertyAsNumbers(ProgramProperties.LANDING_COLUMNS_PMFM_IDS);
        landingsTable.minObservedSpeciesCount = program.getPropertyAsInt(ProgramProperties.LANDING_MIN_OBSERVED_SPECIES_COUNT);
        landingsTable.maxObservedSpeciesCount = program.getPropertyAsInt(ProgramProperties.LANDING_MAX_OBSERVED_SPECIES_COUNT);
        landingsTable.dividerPmfmId = PmfmIds.SPECIES_LIST_ORIGIN;
        this.showLandingTab = true;

        if (landingsTable.inlineEdition) {
          // Set landings table as child when inline edition is enabled, so it saves correctly
          this.addChildForm(landingsTable);
        }
      }

      // If new data: update trip form (need to update validator, with showObservers)
      if (this.isNewData) this.observedLocationForm.updateFormGroup();

      this.addChildForm(() => table);
      this.markAsReady();

      // Listen program, to reload if changes
      if (this.network.online) this.startListenProgramRemoteChanges(program);
    } catch (err) {
      this.setError(err);
    }
  }

  protected async setStrategy(strategy: Strategy): Promise<void> {
    await super.setStrategy(strategy);

    // Update the context
    if (this.observedLocationContext.strategy !== strategy) {
      if (this.debug) console.debug(this.logPrefix + "Update context's strategy...", strategy);
      this.observedLocationContext.strategy = strategy;
    }
  }

  protected async onNewEntity(data: ObservedLocation, options?: EntityServiceLoadOptions): Promise<void> {
    console.debug(this.logPrefix + 'New entity: applying defaults...');

    // If is on field mode, fill default values
    if (this.isOnFieldMode) {
      if (!this.observedLocationForm.showStartTime && this.observedLocationForm.timezone) {
        data.startDateTime = DateUtils.moment().tz(this.observedLocationForm.timezone).startOf('day').utc();
      } else {
        data.startDateTime = DateUtils.moment();
      }

      // Set current user as observers (if enable)
      if (this.showObservers) {
        const user = this.accountService.account.asPerson();
        data.observers.push(user);
      }

      this.showLandingTab = true;

      // Listen first opening the operations tab, then save
      this.registerSubscription(
        this.tabGroup.selectedTabChange
          .pipe(
            filter((event) => event.index === ObservedLocationPage.TABS.LANDINGS),
            first(),
            tap(() => this.save())
          )
          .subscribe()
      );
    }

    // Fill defaults, from table's filter. Implemented for all usage mode, to fix #IMAGINE-648
    const tableId = this.queryParams['tableId'];
    const searchFilter = tableId && this.settings.getPageSettings<ObservedLocationFilter>(tableId, ObservedLocationsPageSettingsEnum.FILTER_KEY);
    if (searchFilter) {
      // Synchronization status
      if (searchFilter.synchronizationStatus && searchFilter.synchronizationStatus !== 'SYNC') {
        data.synchronizationStatus = 'DIRTY';
      }

      // program
      if (searchFilter.program && searchFilter.program.label) {
        data.program = ReferentialRef.fromObject(searchFilter.program);
      }

      // Location
      if (searchFilter.location) {
        data.location = ReferentialRef.fromObject(searchFilter.location);
      }
    }

    // Set contextual program, if any
    if (!data.program) {
      const contextualProgram = this.context.getValue('program') as Program;
      if (contextualProgram?.label) {
        data.program = ReferentialRef.fromObject(contextualProgram);
      }
    }

    // Propagate program
    const programLabel = data.program?.label;
    this.programLabel = programLabel;

    // Enable forms (do not wait for program load)
    if (!programLabel) this.markAsReady();
  }

  protected async onEntityLoaded(data: ObservedLocation, options?: EntityServiceLoadOptions): Promise<void> {
    const programLabel = data.program?.label;
    if (programLabel) this.programLabel = programLabel;
  }

  async setValue(data: ObservedLocation) {
    console.info(this.logPrefix + 'Setting data', data);

    if (!this.isNewData) {
      // Wait ready only on existing data (must not wait table because program is not set yet)
      await this.ready();
    }

    // Set data to form
    this.observedLocationForm.value = data;

    if (!this.isNewData) {
      // Propagate to table parent
      this.landingTable?.setParent(data);
    }
  }

  async getValue(): Promise<ObservedLocation> {
    return this.observedLocationForm.value;
  }

  protected get form(): UntypedFormGroup {
    return this.observedLocationForm.form;
  }

  protected registerForms() {
    this.addForms([
      this.observedLocationForm,
      // Use landings table as child, only if editable
      //() => this.landingsTable?.canEdit && this.landingsTable,
      //() => this.aggregatedLandingsTable
    ]);
  }

  protected async computeTitle(data: ObservedLocation): Promise<string> {
    // new data
    if (this.isNewData) {
      return this.translate.instant('OBSERVED_LOCATION.NEW.TITLE');
    }

    // Make sure page is ready (e.g. i18nContext has been loaded, in setProgram())
    await this.ready();

    // Existing data
    return this.translateContext.instant(`OBSERVED_LOCATION.EDIT.TITLE`, this.i18nContext.suffix, {
      location: data.location && (data.location.name || data.location.label),
      dateTime: data.startDateTime && (this.dateFormat.transform(data.startDateTime) as string),
    });
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      icon: 'location',
    };
  }

  protected async onEntitySaved(data: ObservedLocation): Promise<void> {
    await super.onEntitySaved(data);

    if (this.landingEditor === 'sale' && isNil(this.previousDataId)) {
      // TODO JVF: Retrieve species based on data.samplingStrata

      const landing = new Landing();
      landing.rankOrder = 1;
      landing.vesselSnapshot = new VesselSnapshot();
      landing.vesselSnapshot.id = 5;
      landing.vesselSnapshot.name = `Unknown vessel`;
      landing.program = this.program;
      landing.dateTime = moment();
      landing.location = new ReferentialRef();
      landing.location.id = 1;
      landing.location.name = `Location 1`;
      // Update landings' observed location so it saves correctly
      landing.observedLocation = data;
      landing.observedLocationId = data.id;
      landing.measurementValues = {
        [PmfmIds.CONTROLLED_SPECIES]: 304, // LANGOUSTINE
        [PmfmIds.IS_OBSERVED]: false,
      };
      await this.landingsTable.addOrUpdateEntityToTable(landing, { editing: false });

      const landing2 = new Landing();
      landing2.rankOrder = 2;
      landing2.vesselSnapshot = new VesselSnapshot();
      landing2.vesselSnapshot.id = 1;
      landing2.vesselSnapshot.name = `Vessel 1`;
      landing2.program = this.program;
      landing2.dateTime = moment();
      landing2.location = new ReferentialRef();
      landing2.location.id = 1;
      landing2.location.name = `Location 1`;
      // Update landings' observed location so it saves correctly
      landing2.observedLocation = data;
      landing2.observedLocationId = data.id;
      landing2.measurementValues = {
        [PmfmIds.CONTROLLED_SPECIES]: 300, // ANCHOIS
        [PmfmIds.IS_OBSERVED]: false,
      };
      await this.landingsTable.addOrUpdateEntityToTable(landing2, { editing: false });

      const landing3 = new Landing();
      landing3.rankOrder = 3;
      landing3.vesselSnapshot = new VesselSnapshot();
      landing3.vesselSnapshot.id = 1;
      landing3.vesselSnapshot.name = `Vessel 1`;
      landing3.program = this.program;
      landing3.dateTime = moment();
      landing3.location = new ReferentialRef();
      landing3.location.id = 1;
      landing3.location.name = `Location 1`;
      // Update landings' observed location so it saves correctly
      landing3.observedLocation = data;
      landing3.observedLocationId = data.id;
      landing3.measurementValues = {
        [PmfmIds.CONTROLLED_SPECIES]: 302, // BAR
        [PmfmIds.IS_OBSERVED]: false,
      };
      await this.landingsTable.addOrUpdateEntityToTable(landing3, { editing: false });
    }

    // Save landings table, when editable
    if (this.landingsTable?.dirty && this.landingsTable.canEdit) {
      await this.landingsTable.save();
    } else if (this.aggregatedLandingsTable?.dirty) {
      await this.aggregatedLandingsTable.save();
    }
  }

  protected getFirstInvalidTabIndex(): number {
    return this.observedLocationForm.invalid
      ? ObservedLocationPage.TABS.GENERAL
      : this.landingTable?.invalid
        ? ObservedLocationPage.TABS.LANDINGS
        : -1;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
