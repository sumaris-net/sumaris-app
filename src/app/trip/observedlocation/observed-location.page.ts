import { ChangeDetectionStrategy, Component, Injector, OnInit, ViewChild } from '@angular/core';
import * as momentImported from 'moment';
import { ObservedLocationForm } from './observed-location.form';
import { ObservedLocationService } from '../services/observed-location.service';
import { LandingsTable } from '../landing/landings.table';
import { AppRootDataEditor } from '@app/data/form/root-data-editor.class';
import { FormGroup } from '@angular/forms';
import {
  AccountService,
  Alerts,
  AppTable,
  ConfigService,
  CORE_CONFIG_OPTIONS,
  EntityServiceLoadOptions,
  fadeInOutAnimation,
  firstNotNilPromise,
  HistoryPageReference,
  isNil,
  isNotNil,
  LocalSettingsService,
  NetworkService,
  ReferentialRef,
  ReferentialUtils,
  StatusIds,
  toBoolean,
  TranslateContextService,
  UsageMode
} from '@sumaris-net/ngx-components';
import { ModalController } from '@ionic/angular';
import { SelectVesselsModal, SelectVesselsModalOptions } from './vessels/select-vessel.modal';
import { ObservedLocation } from '../services/model/observed-location.model';
import { Landing } from '../services/model/landing.model';
import { LandingEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { BehaviorSubject } from 'rxjs';
import { filter, first, tap } from 'rxjs/operators';
import { AggregatedLandingsTable } from '../aggregated-landing/aggregated-landings.table';
import { Program } from '@app/referential/services/model/program.model';
import { ObservedLocationsPageSettingsEnum } from './observed-locations.page';
import { environment } from '@environments/environment';
import { DATA_CONFIG_OPTIONS } from 'src/app/data/services/config/data.config';
import { LandingFilter } from '../services/filter/landing.filter';
import { ContextService } from '@app/shared/context.service';
import { VesselFilter } from '@app/vessel/services/filter/vessel.filter';
import { APP_ENTITY_EDITOR } from '@app/data/quality/entity-quality-form.component';

const moment = momentImported;


const ObservedLocationPageTabs = {
  GENERAL: 0,
  LANDINGS: 1
};

type LandingTableType = 'legacy' | 'aggregated';
type ILandingsTable = AppTable<any> & { setParent(value: ObservedLocation | undefined) };

@Component({
  selector: 'app-observed-location-page',
  templateUrl: './observed-location.page.html',
  styleUrls: ['./observed-location.page.scss'],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {provide: APP_ENTITY_EDITOR, useExisting: ObservedLocationPage}
  ],
})
export class ObservedLocationPage extends AppRootDataEditor<ObservedLocation, ObservedLocationService> implements OnInit {

  @ViewChild('observedLocationForm', {static: true}) observedLocationForm: ObservedLocationForm;
  @ViewChild('landingsTable') landingsTable: LandingsTable;
  @ViewChild('aggregatedLandingsTable') aggregatedLandingsTable: AggregatedLandingsTable;

  mobile: boolean;
  showLandingTab = false;
  $landingTableType = new BehaviorSubject<LandingTableType>(undefined);
  $table = new BehaviorSubject<ILandingsTable>(undefined);
  $timezone = new BehaviorSubject<string>(undefined);
  allowAddNewVessel: boolean;
  showVesselType: boolean;
  showVesselBasePortLocation: boolean;
  addLandingUsingHistoryModal: boolean;
  showRecorder = true;
  showObservers = true;
  landingEditor: LandingEditor = undefined;

  get table(): ILandingsTable {
    return this.$table.value;
  }

  constructor(
    injector: Injector,
    dataService: ObservedLocationService,
    protected modalCtrl: ModalController,
    protected settings: LocalSettingsService,
    protected configService: ConfigService,
    protected accountService: AccountService,
    protected translateContext: TranslateContextService,
    protected context: ContextService,
    public network: NetworkService
  ) {
    super(injector,
      ObservedLocation,
      dataService,
      {
        pathIdAttribute: 'observedLocationId',
        tabCount: 2,
        autoOpenNextTab: !settings.mobile,
        i18nPrefix: 'OBSERVED_LOCATION.EDIT.',
        enableListenChanges: true
      });
    this.defaultBackHref = '/observations';
    this.mobile = this.settings.mobile;

    // FOR DEV ONLY ----
    this.debug = !environment.production;

  }

  ngOnInit() {
    super.ngOnInit();

    this.registerSubscription(
      this.configService.config.subscribe(config => {
        if (!config) return;
        this.showRecorder = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_RECORDER);
        const dbTimeZone = config.getProperty(CORE_CONFIG_OPTIONS.DB_TIMEZONE);
        this.$timezone.next(dbTimeZone);
        this.markForCheck();
      })
    );
  }

  canUserWrite(data: ObservedLocation, opts?: any): boolean {
    return isNil(data.validationDate)
      && this.dataService.canUserWrite(data, opts);
  }

  updateViewState(data: ObservedLocation, opts?: {onlySelf?: boolean; emitEvent?: boolean }) {
    super.updateViewState(data);

    // Update tabs state (show/hide)
    this.updateTabsState(data);
  }

  updateTabsState(data: ObservedLocation) {
    // Enable landings tab
    this.showLandingTab = this.showLandingTab || (!this.isNewData || this.isOnFieldMode);

    // INFO CLT : #IMAGINE-614 / Set form to dirty in creation in order to manager errors on silent save (as done for update)
    if (this.isNewData && this.isOnFieldMode) {
      this.markAsDirty();
    }

    // Move to second tab
    if (this.showLandingTab && !this.isNewData && !this.isOnFieldMode && this.selectedTabIndex === 0) {
      this.selectedTabIndex = 1;
      this.tabGroup.realignInkBar();
    }
  }

  async onOpenLanding({id, row}) {
    const savedOrContinue = await this.saveIfDirtyAndConfirm();
    if (savedOrContinue) {
      await this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/${id}`);
    }
  }

  async onNewLanding(event?: any) {

    const savePromise: Promise<boolean> = this.isOnFieldMode && this.dirty
      // If on field mode: try to save silently
      ? this.save(event)
      // If desktop mode: ask before save
      : this.saveIfDirtyAndConfirm();

    const savedOrContinue = await savePromise;
    if (savedOrContinue) {
      this.markAsLoading();

      try {
        // Add landing using vessels modal
        if (this.addLandingUsingHistoryModal) {
          const vessel = await this.openSelectVesselModal();
          if (vessel && this.landingsTable) {
            const rankOrder = (await this.landingsTable.getMaxRankOrderOnVessel(vessel) || 0) + 1;
            await this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/new?vessel=${vessel.id}&rankOrder=${rankOrder}`);
          }
        }
        // Create landing without vessel selection
        else {
          const rankOrder = (await this.landingsTable.getMaxRankOrder() || 0) + 1;
          await this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/new?rankOrder=${rankOrder}`);
        }
      } finally {
        this.markAsLoaded();
      }
    }
  }

  async onNewAggregatedLanding(event?: any) {
    const savePromise: Promise<boolean> = this.isOnFieldMode && this.dirty
      // If on field mode: try to save silently
      ? this.save(event)
      // If desktop mode: ask before save
      : this.saveIfDirtyAndConfirm();

    const savedOrContinue = await savePromise;
    if (savedOrContinue) {
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
  }

  async onNewTrip({id, row}) {
    const savePromise: Promise<boolean> = this.isOnFieldMode && this.dirty
      // If on field mode: try to save silently
      ? this.save(undefined)
      // If desktop mode: ask before save
      : this.saveIfDirtyAndConfirm();

    const savedOrContinue = await savePromise;
    if (savedOrContinue) {
      this.markAsLoading();

      try {
        await this.router.navigateByUrl(`/observations/${this.data.id}/${this.landingEditor}/new?vessel=${row.currentData.vesselSnapshot.id}&landing=${row.currentData.id}`);
      } finally {
        this.markAsLoaded();
      }
    }
  }

  async openSelectVesselModal(excludeExistingVessels?: boolean): Promise<VesselSnapshot | undefined> {
    if (!this.data.startDateTime || !this.data.program) {
      throw new Error('Root entity has no program and start date. Cannot open select vessels modal');
    }

    const startDate = this.data.startDateTime.clone().add(-15, 'days');
    const endDate = this.data.startDateTime.clone();
    const programLabel = (this.aggregatedLandingsTable?.programLabel) || this.data.program.label;
    const excludeVesselIds = (toBoolean(excludeExistingVessels, false) && this.aggregatedLandingsTable
      && (await this.aggregatedLandingsTable.vesselIdsAlreadyPresent())) || [];
    const defaultVesselSynchronizationStatus = this.network.offline ? 'DIRTY' : 'SYNC';

    const landingFilter = LandingFilter.fromObject({
      programLabel,
      startDate,
      endDate,
      locationId: ReferentialUtils.isNotEmpty(this.data.location) ? this.data.location.id : undefined,
      groupByVessel: (this.landingsTable && this.landingsTable.isTripDetailEditor) || (isNotNil(this.aggregatedLandingsTable)),
      excludeVesselIds,
      synchronizationStatus: 'SYNC' // only remote entities. This is required to read 'Remote#LandingVO' local storage
    });

    const modal = await this.modalCtrl.create({
      component: SelectVesselsModal,
      componentProps: <SelectVesselsModalOptions>{
        allowMultiple: false,
        landingFilter,
        vesselFilter: <VesselFilter>{
          statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
          onlyWithRegistration: true
        },
        allowAddNewVessel: this.allowAddNewVessel,
        showVesselTypeColumn: this.showVesselType,
        showBasePortLocationColumn: this.showVesselBasePortLocation,
        defaultVesselSynchronizationStatus,
        maxDateVesselRegistration: endDate,
      },
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();

    // If modal return a landing, use it
    if (data && data[0] instanceof Landing) {
      console.debug('[observed-location] Vessel selection modal result:', data);
      return (data[0] as Landing).vesselSnapshot;
    }
    if (data && data[0] instanceof VesselSnapshot) {
      console.debug('[observed-location] Vessel selection modal result:', data);
      const vessel = data[0] as VesselSnapshot;
      if (excludeVesselIds.includes(data.id)) {
        await Alerts.showError('AGGREGATED_LANDING.VESSEL_ALREADY_PRESENT', this.alertCtrl, this.translate);
        return;
      }
      return vessel;
    } else {
      console.debug('[observed-location] Vessel selection modal was cancelled');
    }
  }

  addRow($event: MouseEvent) {
    if (this.landingsTable) {
      this.landingsTable.addRow($event);
    } else if (this.aggregatedLandingsTable) {
      this.aggregatedLandingsTable.addRow($event);
    }
  }

  get canUserCancelOrDelete(): boolean {
    // IMAGINE-632: User can only delete landings or samples created by himself or on which he is defined as observer

    // When connected user is an admin
    if (this.accountService.isAdmin()) {
      return true;
    }

    const entity = this.data;

    // When observed location has been recorded by connected user
    const recorder = entity.recorderPerson;
    const connectedPerson = this.accountService.person;
    if (connectedPerson.id === recorder?.id) {
      return true;
    }

    // When connected user is in observed location observers
    for (const observer of entity.observers) {
      if (connectedPerson.id === observer.id) {
        return true;
      }
    }
    return false;
  }

  async openReport(event?: UIEvent) {
    if (this.dirty) {
      const data = await this.saveAndGetDataIfValid();
      if (!data) return; // Cancel
    }
    return this.router.navigateByUrl(this.computePageUrl(this.data.id) + '/report');
  }

  /* -- protected methods -- */

  protected async setProgram(program: Program) {
    if (!program) return; // Skip

    await super.setProgram(program);

    try {
      const timezone = await firstNotNilPromise(this.$timezone, {stop: this.destroySubject});
      this.observedLocationForm.showEndDateTime = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_END_DATE_TIME_ENABLE);
      this.observedLocationForm.showStartTime = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_START_TIME_ENABLE);
      this.observedLocationForm.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.OBSERVED_LOCATION_LOCATION_LEVEL_IDS);
      this.observedLocationForm.showObservers = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_OBSERVERS_ENABLE);
      if (!this.observedLocationForm.showObservers && this.data?.observers) {
        this.data.observers = []; // make sure to reset data observers, if any
      }
      const aggregatedLandings = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_ENABLE);
      if (aggregatedLandings) {
        // Force some date properties
        this.observedLocationForm.timezone = timezone;
        this.observedLocationForm.showEndDateTime = true;
        this.observedLocationForm.showStartTime = false;
        this.observedLocationForm.showEndTime = false;
        this.observedLocationForm.startDateDay = program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_START_DAY);
        this.observedLocationForm.forceDurationDays = program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT);
      }
      else {
        this.observedLocationForm.timezone = null; // Use local TZ for dates
      }
      this.allowAddNewVessel = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_CREATE_VESSEL_ENABLE);
      this.addLandingUsingHistoryModal = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_SHOW_LANDINGS_HISTORY);

      let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
      i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
      this.i18nContext.suffix = i18nSuffix;

      this.landingEditor = program.getProperty<LandingEditor>(ProgramProperties.LANDING_EDITOR);
      this.showVesselType = program.getPropertyAsBoolean(ProgramProperties.VESSEL_TYPE_ENABLE);
      this.showVesselBasePortLocation = program.getPropertyAsBoolean(ProgramProperties.LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE);

      this.$landingTableType.next(aggregatedLandings ? 'aggregated' : 'legacy');

      // Wait the expected table (set using ngInit - see template)
      const table$ = this.$table.pipe(
          filter(table => aggregatedLandings ? table instanceof AggregatedLandingsTable : table instanceof LandingsTable));
      const table = await firstNotNilPromise(table$, {stop: this.destroySubject});

      // Configure table
      if (aggregatedLandings) {
        console.debug("[observed-location] Init aggregated landings table:", table);
        const aggregatedLandingsTable = table as AggregatedLandingsTable;
        aggregatedLandingsTable.timeZone = timezone;
        aggregatedLandingsTable.nbDays = program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_DAY_COUNT);
        aggregatedLandingsTable.programLabel = program.getProperty(ProgramProperties.OBSERVED_LOCATION_AGGREGATED_LANDINGS_PROGRAM);
      }
      else {
        console.debug("[observed-location] Init landings table:", table);
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
        this.showLandingTab = true;
      }

      this.addChildForm(() => table);
      this.markAsReady();

      // Listen program, to reload if changes
      this.startListenProgramRemoteChanges(program);
    }
    catch (err) {
      this.setError(err);
    }
  }


  protected async onNewEntity(data: ObservedLocation, options?: EntityServiceLoadOptions): Promise<void> {
    console.debug("[observed-location] New entity: applying defaults...");

    // If is on field mode, fill default values
    if (this.isOnFieldMode) {
      if (!this.observedLocationForm.showStartTime && this.observedLocationForm.timezone) {
        data.startDateTime = moment().tz(this.observedLocationForm.timezone)
          .startOf('day').utc();
      }
      else {
        data.startDateTime = moment();
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
            filter(event => event.index === ObservedLocationPageTabs.LANDINGS),
            first(),
            tap(() => this.save())
          )
          .subscribe()
      );
    }

    // Fill defaults, from table's filter. Implemented for all usage mode, to fix #IMAGINE-648
    const searchFilter = this.settings.getPageSettings<any>(ObservedLocationsPageSettingsEnum.PAGE_ID, ObservedLocationsPageSettingsEnum.FILTER_KEY);
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
    const programLabel = data.program && data.program.label;
    this.$programLabel.next(programLabel);

    // Enable forms (do not wait for program load)
    if (!programLabel) this.markAsReady();
  }

  protected async onEntityLoaded(data: ObservedLocation, options?: EntityServiceLoadOptions): Promise<void> {
    // Propagate program
    const programLabel = data.program && data.program.label;
    this.$programLabel.next(programLabel);
  }

  protected async setValue(data: ObservedLocation) {
    console.info('[observed-location] Setting data', data);

    if (!this.isNewData) {
      // Wait ready only on existing data (must not wait table because program is not set yet)
      await this.ready();
    }

    // Set data to form
    this.observedLocationForm.value = data;

    if (!this.isNewData) {
      // Propagate to table parent
      this.table?.setParent(data);
    }
  }

  protected get form(): FormGroup {
    return this.observedLocationForm.form;
  }

  protected computeUsageMode(data: ObservedLocation): UsageMode {
    return this.settings.isUsageMode('FIELD') || data.synchronizationStatus === 'DIRTY'  ? 'FIELD' : 'DESK';
  }

  protected registerForms() {
    this.addChildForms([
      this.observedLocationForm,
      // Use landings table as child, only if editable
      //() => this.landingsTable?.canEdit && this.landingsTable,
      //() => this.aggregatedLandingsTable
    ]);
  }

  protected async computeTitle(data: ObservedLocation): Promise<string> {

    // new data
    if (this.isNewData) {
      return this.translate.get('OBSERVED_LOCATION.NEW.TITLE').toPromise();
    }

    // Make sure page is ready (e.g. i18nContext has been loaded, in setProgram())
    await this.ready();

    // Existing data
    return this.translateContext.get(`OBSERVED_LOCATION.EDIT.TITLE`, this.i18nContext.suffix, {
      location: data.location && (data.location.name || data.location.label),
      dateTime: data.startDateTime && this.dateFormat.transform(data.startDateTime) as string
    }).toPromise();
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ... (await super.computePageHistory(title)),
      icon: 'location'
    };
  }

  protected async onEntitySaved(data: ObservedLocation): Promise<void> {
    await super.onEntitySaved(data);

    // Save landings table, when editable
    if (this.landingsTable?.dirty && this.landingsTable.canEdit) {
      await this.landingsTable.save();
    }
    else if (this.aggregatedLandingsTable?.dirty) {
      await this.aggregatedLandingsTable.save();
    }
  }

  protected getFirstInvalidTabIndex(): number {
    return this.observedLocationForm.invalid ? 0
      : ((this.table?.invalid) ? 1
        : -1);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
