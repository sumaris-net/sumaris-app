import { AfterViewInit, ChangeDetectionStrategy, Component, forwardRef, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { ActivityCalendarForm } from '../form/activity-calendar.form';
import { ActivityCalendarService } from '../activity-calendar.service';
import { AppRootDataEntityEditor, RootDataEntityEditorState } from '@app/data/form/root-data-editor.class';
import { UntypedFormGroup } from '@angular/forms';
import {
  AccountService,
  Alerts,
  AppAsyncTable,
  AppEditorOptions,
  AppErrorWithDetails,
  AppTable,
  chainPromises,
  CORE_CONFIG_OPTIONS,
  DateUtils,
  EntityServiceLoadOptions,
  EntityUtils,
  equals,
  fadeInOutAnimation,
  firstNotNilPromise,
  fromDateISOString,
  HistoryPageReference,
  Hotkeys,
  IReferentialRef,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  PlatformService,
  Property,
  ReferentialRef,
  removeDuplicatesFromArray,
  splitByProperty,
  StatusIds,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { ModalController } from '@ionic/angular';
import { SelectVesselsForDataModal, SelectVesselsForDataModalOptions } from '@app/trip/observedlocation/vessels/select-vessel-for-data.modal';
import { ActivityCalendar } from '../model/activity-calendar.model';
import { ActivityCalendarReportType, ProgramProperties } from '@app/referential/services/config/program.config';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { firstValueFrom, from, mergeMap, Observable } from 'rxjs';
import { filter, first, map, tap } from 'rxjs/operators';
import { Program } from '@app/referential/services/model/program.model';
import { ActivityCalendarsTableSettingsEnum } from '../table/activity-calendars.table';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import {
  VesselFeaturesFilter,
  VesselFilter,
  VesselOwnerPeriodFilter,
  VesselRegistrationPeriodFilter,
} from '@app/vessel/services/filter/vessel.filter';
import { PredefinedColors } from '@ionic/core';
import { VesselService } from '@app/vessel/services/vessel-service';
import { ActivityCalendarContextService } from '../activity-calendar-context.service';
import { ActivityCalendarFilter } from '@app/activity-calendar/activity-calendar.filter';
import { APP_DATA_ENTITY_EDITOR, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { OBSERVED_LOCATION_FEATURE_NAME } from '@app/trip/trip.config';
import { AcquisitionLevelCodes, PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { RxState } from '@rx-angular/state';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { CalendarComponent } from '@app/activity-calendar/calendar/calendar.component';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { Moment } from 'moment';
import { CalendarUtils } from '@app/activity-calendar/calendar/calendar.utils';
import { ActivityMonthUtils } from '@app/activity-calendar/calendar/activity-month.utils';
import { VesselFeaturesHistoryComponent } from '@app/vessel/page/vessel-features-history.component';
import { VesselRegistrationHistoryComponent } from '@app/vessel/page/vessel-registration-history.component';
import { SplitAreaSize, SplitComponent } from 'angular-split';
import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';
import { VesselOwnerHistoryComponent } from '@app/vessel/page/vessel-owner-history.component';
import { AppImageAttachmentGallery } from '@app/data/image/image-attachment-gallery.component';
import { GearPhysicalFeaturesTable } from '../metier/gear-physical-features.table';
import { GearPhysicalFeaturesUtils } from '../model/gear-physical-features.utils';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { ActivityCalendarUtils } from '@app/activity-calendar/model/activity-calendar.utils';
import { ActivityMonth } from '../calendar/activity-month.model';
import { ActivityCalendarMapComponent } from '@app/activity-calendar/map/activity-calendar-map/activity-calendar-map.component';
import { EntityQualityFormComponent } from '@app/data/quality/entity-quality-form.component';
import { VesselUseFeaturesIsActiveEnum } from '../model/vessel-use-features.model';
import { GearUseFeatures } from '../model/gear-use-features.model';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ExpertiseAreaUtils } from '@app/referential/expertise-area/expertise-area.utils';

export const ActivityCalendarPageSettingsEnum = {
  PAGE_ID: 'activityCalendar',
  FEATURE_ID: OBSERVED_LOCATION_FEATURE_NAME,
  PREDOC_PANEL_CONFIG: 'predocPanelConfig',
};

export interface ActivityCalendarPageState extends RootDataEntityEditorState {
  year: number;
  vesselCountryId: number;
  reportTypes: Property[];
  months: Moment[];
  predocProgramLabels: string[];
  titleMenu: string;
  hasClipboard: boolean;
}

@Component({
  selector: 'app-activity-calendar-page',
  templateUrl: './activity-calendar.page.html',
  styleUrls: ['./activity-calendar.page.scss'],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: APP_DATA_ENTITY_EDITOR, useExisting: forwardRef(() => ActivityCalendarPage) },
    {
      provide: AppEditorOptions,
      useValue: {
        pathIdAttribute: 'calendarId',
      },
    },
    /*{
      provide: InMemoryEntitiesService,
      useFactory: () =>
        new InMemoryEntitiesService(ActivityMonth, ActivityMonthFilter, {
          equals: EntityUtils.equals,
          sortByReplacement: { id: 'month' },
        }),
    },*/
    RxState,
  ],
})
export class ActivityCalendarPage
  extends AppRootDataEntityEditor<ActivityCalendar, ActivityCalendarService, number, ActivityCalendarPageState>
  implements OnInit, AfterViewInit
{
  static TABS = {
    GENERAL: 0,
    VESSEL: 1,
    CALENDAR: 2,
    METIER: 3,
    MAP: 4,
  };

  @RxStateSelect() protected months$: Observable<Moment[]>;
  @RxStateSelect() protected predocProgramLabels$: Observable<string[]>;
  @RxStateSelect() protected titleMenu$: Observable<string>;
  @RxStateSelect() protected hasClipboard$: Observable<boolean>;

  @RxStateProperty() protected reportTypes: Property[];
  @RxStateProperty() protected titleMenu: string;
  @RxStateProperty() protected hasClipboard: boolean;
  @RxStateProperty() protected timezone = DateUtils.moment().tz();

  protected allowAddNewVessel: boolean;
  protected showRecorder = true;
  protected showCalendar = true;
  protected showVesselTab = true;
  protected enableReport: boolean;
  protected _predocPanelSize = 30;
  protected _predocPanelVisible = false;
  protected showMap = false; // TODO V3 enable
  protected mapPanelWidth = 30;
  protected showMapPanel = true;
  protected selectedSubTabIndex = 0;
  protected vesselSnapshotAttributes = VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES;
  protected isAdmin = this.accountService.isAdmin();
  protected isAdminOrManager = this.accountService.isAdmin();
  protected isSupervisorOrManager = this.accountService.isAdmin();
  protected qualityWarning: string = null;
  protected readonly predocShortcutHelp: string;

  @Input() showVesselType = false;
  @Input() showVesselBasePortLocation = true;
  @Input() showQualityForm = true;
  @Input() showPictures = false;
  @Input() autoFillPictureComments: boolean = true;
  @Input() showOptionsMenu = true;
  @Input() toolbarColor: PredefinedColors = 'primary';
  @Input() yearHistory: number = 3;
  @Input() canEdit: boolean = true;

  @Input() @RxStateProperty() year: number;
  @Input() @RxStateProperty() vesselCountryId: number;
  @Input() @RxStateProperty() months: Moment[];
  @Input() @RxStateProperty() predocProgramLabels: string[] = null;

  @ViewChild('baseForm', { static: true }) baseForm: ActivityCalendarForm;
  @ViewChild('calendar', { static: true }) calendar: CalendarComponent;
  @ViewChild('entityQuality', { static: true }) entityQuality: EntityQualityFormComponent;

  @ViewChild('predocSplit') predocSplit: SplitComponent;
  @ViewChild('predocCalendar') predocCalendar: CalendarComponent;
  @ViewChild('tableMetier') tableMetier: GearPhysicalFeaturesTable;
  @ViewChild('map') map: ActivityCalendarMapComponent;
  @ViewChild('mapCalendar') mapCalendar: CalendarComponent;
  @ViewChild('featuresHistoryTable', { static: true }) featuresHistoryTable: VesselFeaturesHistoryComponent;
  @ViewChild('registrationHistoryTable', { static: true }) registrationHistoryTable: VesselRegistrationHistoryComponent;
  @ViewChild('ownerHistoryTable', { static: true }) ownerHistoryTable: VesselOwnerHistoryComponent;
  @ViewChild('galleryHistory', { static: true }) galleryHistory: AppImageAttachmentGallery;
  @ViewChild('gallery', { static: false }) gallery: AppImageAttachmentGallery;

  constructor(
    injector: Injector,
    protected modalCtrl: ModalController,
    protected accountService: AccountService,
    protected vesselService: VesselService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected context: ActivityCalendarContextService,
    protected hotkeys: Hotkeys,
    protected platform: PlatformService
  ) {
    super(injector, ActivityCalendar, injector.get(ActivityCalendarService), {
      pathIdAttribute: 'calendarId',
      tabCount: 5, // will be 4 when map is hidden
      i18nPrefix: 'ACTIVITY_CALENDAR.EDIT.',
      enableListenChanges: true,
      acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR,
      settingsId: ActivityCalendarPageSettingsEnum.PAGE_ID,
      canCopyLocally: accountService.isAdmin(),
      autoOpenNextTab: false,
      canUseExpertiseArea: true, // Enable expertise area
    });
    this.defaultBackHref = '/activity-calendar';
    this.predocShortcutHelp = `(${hotkeys.defaultControlKeyName}+P)`;

    // FOR DEV ONLY ----
    this.logPrefix = '[activity-calendar-page] ';
  }

  ngOnInit() {
    super.ngOnInit();

    this.showMap = this.showMap || this.debug;

    // Listen some field
    this._state.connect('year', this.baseForm.yearChanges.pipe(filter(isNotNil)));

    this._state.connect(
      'reportTypes',
      this.program$.pipe(
        map((program) => {
          const reportTypes = (ProgramProperties.ACTIVITY_CALENDAR_REPORT_TYPES.values as Property[])
            // Exclude the progress report
            .filter((type) => type.key !== <ActivityCalendarReportType>'progress');
          const reportTypeByKey = splitByProperty(reportTypes, 'key');
          return (program.getPropertyAsStrings(ProgramProperties.ACTIVITY_CALENDAR_REPORT_TYPES) || [])
            .map((key) => reportTypeByKey[key])
            .filter(isNotNil);
        })
      )
    );

    this._state.connect(
      'months',
      this._state.select('year').pipe(
        filter(isNotNil),
        map((year) => CalendarUtils.getMonths(year, this.timezone))
      )
    );

    this._state.connect('hasClipboard', this.context.select('clipboard', 'data').pipe(map(isNotNil)));

    // Connect pmfms (used by translateFormPath)
    this._state.connect('pmfms', this.baseForm.pmfms$);

    this.registerSubscription(
      this.configService.config.subscribe((config) => {
        if (!config) return;
        this.showRecorder = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_RECORDER);
        this.timezone = config.getProperty(CORE_CONFIG_OPTIONS.DB_TIMEZONE);
        this.markForCheck();
      })
    );

    // Detect embedded mode, from route params
    this.registerSubscription(
      this.route.queryParams.pipe(first()).subscribe((queryParams) => {
        // Manage embedded mode
        const embedded = toBoolean(queryParams['embedded'], false);
        if (embedded) {
          this.showOptionsMenu = false;
          this.showQualityForm = false;
          this.autoOpenNextTab = false; // Keep first tab
          this.toolbarColor = 'secondary';
          this.markForCheck();
        }
      })
    );

    // Listen opening the metier tab
    this.registerSubscription(
      this.tabGroup.selectedTabChange.pipe(filter((event) => event.index === ActivityCalendarPage.TABS.METIER)).subscribe(async () => {
        console.debug(this.logPrefix + 'Updating metier table...');
        this.tableMetier.markAsLoading();

        // Save calendar when opening the map tab (keep editor dirty)
        const dirty = this.calendar.dirty || this.tableMetier.dirty;
        if (dirty && (!(await this.saveTable(this.calendar)) || !(await this.saveTable(this.tableMetier)))) {
          this.selectedTabIndex = ActivityCalendarPage.TABS.CALENDAR;
          this.tableMetier.markAsLoaded();
          return;
        }

        this.tableMetier.value = GearPhysicalFeaturesUtils.updateFromActivityMonths(this.data, this.calendar.value, this.tableMetier.value, {
          timezone: this.timezone,
        });
      })
    );

    // Listen opening the map tab
    this.registerSubscription(
      this.tabGroup.selectedTabChange
        .pipe(filter((event) => this.showMap && this.mapCalendar && event.index === ActivityCalendarPage.TABS.MAP))
        .subscribe(async () => {
          console.debug(this.logPrefix + 'Updating map calendar...');
          this.mapCalendar.markAsLoading();
          this.mapCalendar.markAsReady();
          const saved = await this.saveTable(this.calendar);
          if (!saved) {
            this.selectedTabIndex = ActivityCalendarPage.TABS.CALENDAR;
            this.mapCalendar.markAsLoaded();
            return;
          }
          this.mapCalendar.value = this.calendar.value;
        })
    );

    this.registerSubscription(
      from(this.vesselSnapshotService.getAutocompleteFieldOptions()).subscribe((config) => {
        this.vesselSnapshotAttributes = config.attributes;

        // Reload the title
        if (this.loaded) this.updateTitle(this.data);
      })
    );

    /// Add desktop shortcuts
    if (!this.mobile) {
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: `${this.hotkeys.defaultControlKey}.p`, description: 'ACTIVITY_CALENDAR.EDIT.SHOW_PREDOC', preventDefault: true })
          .pipe(filter(() => this.loaded))
          .subscribe(() => this.toggleShowPredoc())
      );

      this.restorePredocPanelSize();
    } else {
      this._predocPanelVisible = false;
      this._predocPanelSize = 0;
    }
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    this.registerSubscription(
      this.onUpdateView.subscribe(() => {
        if (isNotNilOrNaN(this.data.id)) {
          this.featuresHistoryTable.setFilter(VesselFeaturesFilter.fromObject({ vesselId: this.data.vesselSnapshot.id }), { emitEvent: true });
          this.registrationHistoryTable.setFilter(VesselRegistrationPeriodFilter.fromObject({ vesselId: this.data.vesselSnapshot.id }), {
            emitEvent: true,
          });
          this.ownerHistoryTable.setFilter(VesselOwnerPeriodFilter.fromObject({ vesselId: this.data.vesselSnapshot.id }), {
            emitEvent: true,
          });
        }
      })
    );

    // Manage tab group
    {
      const queryParams = this.route.snapshot.queryParams;
      this.selectedSubTabIndex = toNumber(queryParams['subtab'], 0);
    }
  }

  updateViewState(data: ActivityCalendar, opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.updateViewState(data);

    // Update tabs state (show/hide)
    this.updateTabsState(data);
  }

  updateTabsState(data: ActivityCalendar) {
    const isNewData = isNil(data?.id);
    if (isNewData) {
      this.showVesselTab = false;
    } else {
      // Show tab
      this.showVesselTab = true;

      // Move to calendar tab
      if (this.autoOpenNextTab && this.selectedTabIndex === ActivityCalendarPage.TABS.GENERAL) {
        this.selectedTabIndex = ActivityCalendarPage.TABS.CALENDAR;
        this.tabGroup.realignInkBar();
        this.autoOpenNextTab = false; // Should switch only once
      }
    }
  }

  async saveTable(table: AppTable<any> | AppAsyncTable<any>) {
    if (!table.confirmEditCreate()) return false;
    if (table.dirty) {
      this.markAsDirty();
      return table.save();
    }
    return true;
  }

  async openSelectVesselModal(excludeExistingVessels?: boolean): Promise<VesselSnapshot | undefined> {
    const programLabel = this.baseForm?.programLabel || this.programLabel || this.data.program.label;
    if (!this.data.year || !programLabel) {
      throw new Error('Root entity has no program and year. Cannot open select vessels modal');
    }

    // Prepare vessel filter's value
    const showOfflineVessels = EntityUtils.isLocal(this.data) && (await this.vesselService.countAll({ synchronizationStatus: 'DIRTY' })) > 0;
    const defaultVesselSynchronizationStatus = this.network.offline || showOfflineVessels ? 'DIRTY' : 'SYNC';

    // Prepare landing's filter
    const startDate = DateUtils.moment().set('year', this.data.year).utc(false).startOf('year');
    const endDate = startDate.clone().endOf('year');

    const modal = await this.modalCtrl.create({
      component: SelectVesselsForDataModal,
      componentProps: <SelectVesselsForDataModalOptions>{
        programLabel: this.programLabel,
        requiredStrategy: this.requiredStrategy,
        strategyId: this.strategy?.id,
        allowMultiple: false,
        vesselFilter: <VesselFilter>{
          statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
          onlyWithRegistration: true,
        },
        allowAddNewVessel: this.allowAddNewVessel,
        showVesselTypeColumn: this.showVesselType,
        showBasePortLocationColumn: this.showVesselBasePortLocation,
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

    if (data && data[0] instanceof VesselSnapshot) {
      console.debug(this.logPrefix + 'Vessel selection modal result:', data);
      return data[0] as VesselSnapshot;
    } else {
      console.debug(this.logPrefix + 'Vessel selection modal was cancelled');
    }
  }

  addMetier(event: UIEvent) {
    this.calendar?.addMetierBlock(event);
  }

  async openReport(reportType: ActivityCalendarReportType | string) {
    if (!reportType) return; // Skip
    if (this.dirty) {
      const data = await this.saveAndGetDataIfValid();
      if (!data) return; // Cancel
    }

    return this.router.navigateByUrl([this.computePageUrl(this.data.id), 'report', reportType].join('/'));
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
    if (this.context.program !== program) {
      this.context.program = program;
    }

    try {
      this.showVesselType = program.getPropertyAsBoolean(ProgramProperties.VESSEL_TYPE_ENABLE);
      this.showVesselBasePortLocation = program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_VESSEL_BASE_PORT_LOCATION_ENABLE);
      this.vesselCountryId = program.getPropertyAsInt(ProgramProperties.ACTIVITY_CALENDAR_VESSEL_COUNTRY_ID);
      this.allowAddNewVessel = program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_CREATE_VESSEL_ENABLE);
      this.enableReport = program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_REPORT_ENABLE);
      this.predocProgramLabels = program.getPropertyAsStrings(ProgramProperties.ACTIVITY_CALENDAR_PREDOC_PROGRAM_LABELS);
      this.showPictures = program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_IMAGES_ENABLE);

      let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
      i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
      this.i18nContext.suffix = i18nSuffix;

      const isManager = this.programRefService.hasUserManagerPrivilege(program);
      this.isAdminOrManager = isManager || this.accountService.isAdmin();
      this.isSupervisorOrManager = isManager || this.accountService.isSupervisor();
      this.baseForm.showObservers = this.isAdminOrManager && program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_OBSERVERS_ENABLE);

      if (this.baseForm) {
        this.baseForm.timezone = this.timezone;
        this.baseForm.allowAddNewVessel = this.allowAddNewVessel;
      }
      if (this.calendar) {
        this.calendar.i18nColumnSuffix = i18nSuffix;
        this.calendar.timezone = this.timezone;
        this.calendar.basePortLocationLevelIds = program.getPropertyAsNumbers(ProgramProperties.ACTIVITY_CALENDAR_BASE_PORT_LOCATION_LEVEL_IDS);
        this.calendar.fishingAreaLocationLevelIds = program.getPropertyAsNumbers(ProgramProperties.ACTIVITY_CALENDAR_FISHING_AREA_LOCATION_LEVEL_IDS);
        this.calendar.metierTaxonGroupIds = program.getPropertyAsNumbers(ProgramProperties.ACTIVITY_CALENDAR_METIER_TAXON_GROUP_TYPE_IDS);

        this.addForms([this.calendar]);
      }
      if (this.tableMetier) {
        this.tableMetier.metierTaxonGroupIds = program.getPropertyAsNumbers(ProgramProperties.ACTIVITY_CALENDAR_METIER_TAXON_GROUP_TYPE_IDS);
        this.tableMetier.acquisitionLevels = [
          AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES,
          AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_USE_FEATURES,
        ];
        this.addForms([this.tableMetier]);
      }

      // If new data: update trip form (need to update validator, with showObservers)
      if (this.isNewData) this.baseForm.updateFormGroup();

      this.markAsReady();

      // Listen program, to reload if changes
      if (this.network.online) this.startListenProgramRemoteChanges(program);
    } catch (err) {
      this.setError(err);
    }
  }

  async setError(error: string | AppErrorWithDetails, opts?: { emitEvent?: boolean; detailsCssClass?: string }) {
    const detailsErrors = error && typeof error === 'object' && error.details?.errors;

    // Conflictual error: show remote conflictual data
    if (detailsErrors?.conflict instanceof ActivityCalendar) {
      const remoteCalendar = detailsErrors.conflict;
      await this.showRemoteConflict(remoteCalendar);
      super.setError(undefined, opts);
      return;
    }

    if (detailsErrors?.months) {
      this.calendar.error = 'ACTIVITY_CALENDAR.ERROR.VALID_MONTHS';
      this.selectedTabIndex = ActivityCalendarPage.TABS.CALENDAR;
      super.setError(undefined, opts);
      return;
    }

    if (detailsErrors?.metiers) {
      this.tableMetier.error = 'ACTIVITY_CALENDAR.ERROR.VALID_METIERS';
      this.selectedTabIndex = ActivityCalendarPage.TABS.METIER;
      super.setError(undefined, opts);
      return;
    }

    // Clear child component error
    if (!error) {
      this.calendar.error = undefined;
      this.tableMetier.error = undefined;
    }

    super.setError(error, opts);
  }

  protected async showRemoteConflict(remoteCalendar: ActivityCalendar) {
    if (!remoteCalendar) return;

    console.debug(this.logPrefix + 'Detecting conflicts, from remote calendar:', remoteCalendar);
    const localCalendar = await this.getValue();
    const sortedMetierIds = ActivityMonthUtils.getSortedMetierIds((localCalendar.gearUseFeatures || []).concat(remoteCalendar.gearUseFeatures || []));
    const months = ActivityMonthUtils.fromActivityCalendar(localCalendar, { sortedMetierIds, fillEmptyGuf: true }).concat(
      ActivityMonthUtils.fromActivityCalendar(remoteCalendar, { sortedMetierIds, fillEmptyGuf: true, fillEmptyMonth: false })
    );
    EntityUtils.sort(months, 'month', 'asc');

    this.calendar.error = 'ACTIVITY_CALENDAR.ERROR.CONFLICTUAL_MONTH';
    await this.calendar.setValue(months);
    this._selectedTabIndex = ActivityCalendarPage.TABS.CALENDAR;
  }

  protected async setStrategy(strategy: Strategy): Promise<void> {
    await super.setStrategy(strategy);

    // Update the context
    if (this.context.strategy !== strategy) {
      if (this.debug) console.debug(this.logPrefix + "Update context's strategy...", strategy);
      this.context.strategy = strategy;
    }
  }

  protected async onNewEntity(data: ActivityCalendar, options?: EntityServiceLoadOptions): Promise<void> {
    console.debug(this.logPrefix + 'New entity: applying defaults...');

    // If is on field mode, fill default values
    if (this.isOnFieldMode) {
      data.year = DateUtils.moment().year() - 1;

      // Listen first opening the calendar tab, then save
      this.registerSubscription(
        this.tabGroup.selectedTabChange
          .pipe(
            filter((event) => event.index === ActivityCalendarPage.TABS.CALENDAR),
            mergeMap(() => this.save()),
            filter((saved) => saved === true),
            first()
          )
          .subscribe()
      );
    }

    // Fill defaults, from table's filter. Implemented for all usage mode, to fix #IMAGINE-648
    const tableId = this.queryParams['tableId'];
    const searchFilter = tableId && this.settings.getPageSettings<ActivityCalendarFilter>(tableId, ActivityCalendarsTableSettingsEnum.FILTER_KEY);
    if (searchFilter) {
      // Synchronization status
      if (searchFilter.synchronizationStatus && searchFilter.synchronizationStatus !== 'SYNC') {
        data.synchronizationStatus = 'DIRTY';
      }

      // Program
      if (searchFilter.program && searchFilter.program.label) {
        data.program = ReferentialRef.fromObject(searchFilter.program);
      }

      // Year
      this.year = searchFilter.year || fromDateISOString(searchFilter.startDate)?.year();
      if (isNotNil(this.year)) console.debug(`${this.logPrefix}Found year from table filter: ${this.year}`);
      if (this.year) {
        data.year = this.year;
        data.startDate = (this.timezone ? DateUtils.moment().tz(this.timezone) : DateUtils.moment()).year(this.year).startOf('year');
      }
    }

    // Set contextual program, if any
    if (!data.program) {
      const contextualProgram = this.context?.program;
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

  devToggleDebug() {
    super.devToggleDebug();

    setTimeout(() => {
      this.calendar?.onResize();
      this.predocCalendar?.onResize();

      this.showMap = this.debug;
      this.markForCheck();
    }, 250);
  }

  protected async onEntityLoaded(data: ActivityCalendar, options?: EntityServiceLoadOptions): Promise<void> {
    const programLabel = data.program?.label;
    if (programLabel) this.programLabel = programLabel;

    this.setDataStartDate(data);

    // Hide unused field (for historical data)
    this.baseForm.showEconomicSurvey = isNotNil(data.economicSurvey);
  }

  protected setDataStartDate(data: ActivityCalendar) {
    // Year
    if (isNotNil(data.year)) {
      this.year = data.year;

      if (this.timezone) {
        data.startDate = DateUtils.moment().tz(this.timezone).year(this.year).startOf('year');
      } else {
        data.startDate = DateUtils.moment().year(this.year).startOf('year');
      }
    }
  }

  protected watchStrategyFilter(program: Program): Observable<Partial<StrategyFilter>> {
    switch (this.strategyResolution) {
      // Spatio-temporal
      case DataStrategyResolutions.SPATIO_TEMPORAL:
        return this._state
          .select(['acquisitionLevel', 'year', 'vesselCountryId'], (_) => _, {
            acquisitionLevel: equals,
            year: equals,
            vesselCountryId: equals,
          })
          .pipe(
            map(({ acquisitionLevel, year, vesselCountryId }) => {
              const startDate = DateUtils.moment().tz(this.timezone).utc(false).startOf('year');
              const endDate = startDate.clone().endOf('year');
              return <Partial<StrategyFilter>>{
                acquisitionLevel,
                programId: program.id,
                startDate: startDate.add(1, 'day'),
                //endDate,
                location: { id: vesselCountryId, entityName: 'Location' },
              };
            }),
            // DEBUG
            tap((values) => console.debug(this.logPrefix + 'Strategy filter changed:', values))
          );
      default:
        return super.watchStrategyFilter(program);
    }
  }

  async setValue(data: ActivityCalendar) {
    console.info(this.logPrefix + 'Setting data', data);

    const isNewData = this.isNewData;
    if (!isNewData) {
      // Wait ready only on existing data (must not wait table because program is not set yet)
      await this.ready();
    }

    // Set data to form
    this.baseForm.value = data;

    // Set data to calendar
    this.calendar.value = ActivityMonthUtils.fromActivityCalendar(data, {
      fillEmptyGuf: true,
      timezone: this.timezone,
    });

    // Set metier table data
    this.tableMetier.value = GearPhysicalFeaturesUtils.fromActivityCalendar(data, { timezone: this.timezone });

    // Load pictures
    if (this.showPictures && !isNewData) {
      this.loadPictures(data);
    }

    // Load predoc
    if (this._predocPanelVisible && !isNewData) {
      this.loadPredoc(data);
    }

    if (!this.isNewData) {
      this.updateQualityWarning(data);
    }
  }

  async getValue(): Promise<ActivityCalendar> {
    if (this.debug) console.debug(this.logPrefix + 'Getting editor value...');

    const value = await super.getValue();

    const activityMonths = this.calendar.value;
    if (activityMonths) ActivityMonthUtils.fillActivityCalendar(value, activityMonths);

    // Metiers
    value.gearPhysicalFeatures = GearPhysicalFeaturesUtils.updateFromCalendar(value, this.tableMetier.value, { timezone: this.timezone });

    // Pictures
    if (this.showPictures) {
      value.images = this.gallery.value || [];

      if (this.autoFillPictureComments) {
        (value.images || [])
          .filter((img) => isNilOrBlank(img.comments))
          .forEach((img) => {
            img.comments = value.year.toString();
          });
      }
    }

    // Restore vesselRegistrationPeriods
    value.vesselRegistrationPeriods = this.data.vesselRegistrationPeriods;

    // Add current user as observer
    const currentPerson = this.accountService.person;
    if (!this.isAdminOrManager && isNotEmptyArray(value.observers) && !value.observers.map((observer) => observer.id).includes(currentPerson.id)) {
      value.observers = [...value.observers, currentPerson];
    }

    return value;
  }

  protected async getJsonValueToSave(): Promise<any> {
    const json = this.form.getRawValue();
    return json;
  }

  protected get form(): UntypedFormGroup {
    return this.baseForm.form;
  }

  protected registerForms() {
    this.addForms([this.baseForm]);
  }

  protected async computeTitle(data: ActivityCalendar): Promise<string> {
    // new data
    if (this.isNewData) {
      this.titleMenu = null;
      return firstValueFrom(this.translate.get('ACTIVITY_CALENDAR.NEW.TITLE'));
    }
    const vessel = this.vesselToString(this.data.vesselSnapshot);

    this.titleMenu = this.translate.instant(`ACTIVITY_CALENDAR.EDIT.TITLE_MENU`, {
      vessel,
      year: this.data.year,
    });

    return this.translate.instant(`ACTIVITY_CALENDAR.EDIT.TITLE`, {
      vessel,
      year: data.year,
    });
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      title: await firstNotNilPromise(this.titleMenu$),
      icon: 'calendar',
    };
  }

  protected async onEntitySaved(data: ActivityCalendar): Promise<void> {
    this.calendar?.onAfterSave();
    await super.onEntitySaved(data);
    this.setDataStartDate(data);
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.baseForm.invalid) return ActivityCalendarPage.TABS.GENERAL;
    if (this.showPictures && this.gallery?.invalid) return ActivityCalendarPage.TABS.VESSEL;
    if (this.calendar && (this.calendar.invalid || this.calendar.hasErrorsInRows() || this.calendar.visibleRowCount !== 12))
      return ActivityCalendarPage.TABS.CALENDAR;
    if (this.tableMetier.invalid) return ActivityCalendarPage.TABS.METIER;
    if (this.showMap && this.mapCalendar.invalid) return ActivityCalendarPage.TABS.MAP;
    return -1;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async loadPredoc(entity: ActivityCalendar) {
    // DEBUG
    const now = Date.now();
    console.debug(`${this.logPrefix}Loading predoc calendars...`);

    // Job to load <Survey N-1>
    const loadPreviousYearCalendar = async () => {
      const { data } = await this.dataService.loadAll(
        0,
        1,
        'updateDate',
        'desc',
        <ActivityCalendarFilter>{
          program: entity.program,
          vesselId: entity.vesselSnapshot?.id,
          year: entity.year - 1,
          excludedIds: isNotNil(entity.id) ? [entity.id] : undefined,
        },
        { fullLoad: true }
      );
      return data?.[0];
    };

    // Job to load predoc calendar
    const predocProgramLabels = (await firstValueFrom(this.predocProgramLabels$)).filter((program) => program !== entity.program?.label); // Exclude self program - see issue #

    const loadPredocProgramCalendars = (predocProgramLabels || []).map((programLabel) => async () => {
      const { data } = await this.dataService.loadAll(
        0,
        1,
        'updateDate',
        'desc',
        <ActivityCalendarFilter>{
          program: { label: programLabel },
          vesselId: entity.vesselSnapshot?.id,
          year: entity.year,
        },
        { fullLoad: true }
      );
      return data?.[0];
    });

    let data = (await chainPromises<ActivityCalendar>([loadPreviousYearCalendar, ...loadPredocProgramCalendars])).filter(isNotNil);

    // DEBUG: simulate a N-1 calendar
    if (this.debug && data.length === 1) {
      const fakeCalendar = data[0].clone();
      ActivityCalendarUtils.setYear(fakeCalendar, entity.year - 1);
      ActivityCalendarUtils.setProgram(fakeCalendar, entity.program);
      data = [fakeCalendar, data[0]];
    }

    this.predocCalendar.pmfms = await firstNotNilPromise(this.calendar.pmfms$);
    this.predocCalendar.availablePrograms = removeDuplicatesFromArray(data.map((ac) => ac.program).filter(isNotNil), 'label');
    this.predocCalendar.markAsReady();

    if (isNotEmptyArray(data)) {
      console.debug(`${this.logPrefix}${data.length} predoc calendars loaded in ${Date.now() - now}ms`);

      // Convert to months, then sort
      const months = ActivityMonthUtils.fromActivityCalendars(data, { fillEmptyGuf: true, timezone: this.timezone });
      EntityUtils.sort(months, 'month', 'asc');

      await this.predocCalendar.setValue(months || []);
    } else {
      await this.predocCalendar.setValue([]);
    }
  }

  protected async loadPictures(data: ActivityCalendar) {
    //Filter
    const filter: Partial<ActivityCalendarFilter> = {
      vesselId: data.vesselSnapshot.id,
      program: data.program,
      startDate: data.startDate.subtract(this.yearHistory, 'years').startOf('year'),
    };

    const imageAttachments = await this.dataService.loadImages(0, 100, null, null, filter);
    const firstLoadHistory = !this.galleryHistory.loaded;
    const firstLoadGallery = isNotNil(this.gallery) && !this.gallery.loaded;

    if (firstLoadHistory) this.galleryHistory.markAsReady();
    if (firstLoadGallery) this.gallery.markAsReady();

    // fetch images
    if (this.canEdit) {
      this.galleryHistory.value = imageAttachments.filter((img) => img.objectId != data.id);
      this.gallery.value = imageAttachments.filter((img) => img.objectId === data.id);
    } else {
      this.galleryHistory.value = imageAttachments;
    }
    // then add gallery into child form
    if (firstLoadHistory) this.addForms([this.galleryHistory]);
    if (firstLoadGallery) this.addForms([this.gallery]);
  }

  protected toggleShowPredoc(event?: Event) {
    this._predocPanelVisible = !this._predocPanelVisible;
    this.savePredocPanelSize();
    this.markForCheck();

    if (this._predocPanelVisible && !this.predocCalendar.value) {
      setTimeout(() => this.loadPredoc(this.data), 500);
    }
  }

  protected restorePredocPanelSize() {
    const { size, visible } = this.settings.getPageSettings(this.settingsId, ActivityCalendarPageSettingsEnum.PREDOC_PANEL_CONFIG) || {};
    this._predocPanelSize = isNotNilOrNaN(toNumber(size)) ? +size : this._predocPanelSize;
    this._predocPanelVisible = toBoolean(visible, this._predocPanelVisible);
  }

  protected onPredocResize(sizes?: SplitAreaSize) {
    this.calendar.onResize();
    this.predocCalendar.onResize();

    this.savePredocPanelSize(sizes);
  }

  protected savePredocPanelSize(sizes?: SplitAreaSize) {
    const previousConfig = this.settings.getPageSettings(this.settingsId, ActivityCalendarPageSettingsEnum.PREDOC_PANEL_CONFIG);

    const config = {
      size: isNotNilOrNaN(+sizes?.[1]) ? +sizes[1] : this._predocPanelSize,
      visible: this._predocPanelVisible,
    };
    if (!equals(config, previousConfig)) {
      this.settings.savePageSetting(this.settingsId, config, ActivityCalendarPageSettingsEnum.PREDOC_PANEL_CONFIG);
    }
  }

  protected vesselToString(vessel: VesselSnapshot) {
    return `${vessel.registrationLocation.label} ${vessel.registrationLocation.name} - ${vessel.registrationCode} - ${vessel.name}`;
  }

  protected clearCalendar(event?: Event) {
    this.calendar.clearAll();
  }

  protected async updateQualityWarning(data?: ActivityCalendar) {
    data = data || this.data;

    if (!data.directSurveyInvestigation) {
      this.qualityWarning = null;
    } else {
      const pmfms = await firstNotNilPromise(this.baseForm.pmfms$, { stop: this.destroySubject, stopError: false });
      const surveyQualificationPmfm = (pmfms || []).find((pmfm) => pmfm.id === PmfmIds.SURVEY_QUALIFICATION);
      if (!surveyQualificationPmfm) {
        console.warn(this.logPrefix + "Cannot find PMFM 'SURVEY_QUALIFICATION' need to compute quality warning");
        return;
      }

      const surveyQualificationValue = PmfmValueUtils.fromModelValue(
        data.measurementValues?.[PmfmIds.SURVEY_QUALIFICATION],
        surveyQualificationPmfm
      ) as IReferentialRef;

      if (isNotNilOrBlank(surveyQualificationValue?.name) && surveyQualificationValue.id !== QualitativeValueIds.SURVEY_QUALIFICATION.DIRECT) {
        this.qualityWarning = this.translate.instant('ACTIVITY_CALENDAR.WARNING.INCONSISTENT_DIRECT_SURVEY_QUALIFICATION', {
          surveyQualification: surveyQualificationValue.name,
        });
      } else {
        this.qualityWarning = null;
      }
    }
  }

  async copyAndPastePredoc(sources: ActivityMonth[]) {
    if (isEmptyArray(sources)) return; // Skip if empty

    const existingMonths = this.calendar.getValue();

    // Ask user confirmation if calendar is not empty
    const hasSomeData = existingMonths.some((month) => isNotNil(month.isActive));
    if (hasSomeData) {
      const confirmed = await Alerts.askConfirmation('ACTIVITY_CALENDAR.CONFIRM.COPY_PASTE', this.alertCtrl, this.translate);
      if (!confirmed) return false; // User cancelled
    }

    const target = existingMonths.map((existingMonth, index) => {
      const source = sources[index];
      if (!source) return target; // Keep original, if missing a month

      if (existingMonth.readonly) {
        this.calendar.showUnauthorizedToast('ACTIVITY_CALENDAR.WARNING.UNAUTHORIZED_PREDOC_PASTE');
        return existingMonth;
      }

      // Clean isActive if equals to not exists (see issue #687)
      if (source.isActive === VesselUseFeaturesIsActiveEnum.NOT_EXISTS) {
        source.isActive = null;
      }

      return ActivityMonth.fromObject(<Partial<ActivityMonth>>{
        ...source,
        // Preserved some properties
        id: existingMonth.id,
        program: existingMonth.program,
        startDate: existingMonth.startDate,
        endDate: existingMonth.endDate,
        registrationLocations: existingMonth.registrationLocations,
        readonly: existingMonth.readonly,
        updateDate: existingMonth.updateDate,
        // Don't copy basePortLocation if flagged as outside the expertise area
        basePortLocation: ExpertiseAreaUtils.isOutsideExpertiseArea(source.basePortLocation) ? undefined : source.basePortLocation,
        // Preserve gearUseFeatures start and end dates
        gearUseFeatures: source?.gearUseFeatures.map((guf) =>
          GearUseFeatures.fromObject({
            ...guf,
            // Don't copy metier if flagged as outside the expertise area
            metier: ExpertiseAreaUtils.isOutsideExpertiseArea(guf.metier) ? undefined : guf.metier,
            fishingAreas: guf.fishingAreas.map((fa) => ({
              // Don't copy fishing area's location and gradients if flagged as outside the expertise are
              location: ExpertiseAreaUtils.isOutsideExpertiseArea(fa.location) ? undefined : fa.location,
              distanceToCoastGradient: ExpertiseAreaUtils.isOutsideExpertiseArea(fa.distanceToCoastGradient) ? undefined : fa.distanceToCoastGradient,
              depthGradient: ExpertiseAreaUtils.isOutsideExpertiseArea(fa.depthGradient) ? undefined : fa.depthGradient,
              nearbySpecificArea: ExpertiseAreaUtils.isOutsideExpertiseArea(fa.nearbySpecificArea) ? undefined : fa.nearbySpecificArea,
            })),
            startDate: existingMonth.startDate,
            endDate: existingMonth.endDate,
          })
        ),
      });
    });

    // Apply result
    await this.calendar.setValue(target);

    // Mark as dirty
    this.markAsDirty();
  }

  saveAndGetDataIfValid() {
    if (this.calendar.hasErrorsInRows()) {
      this.selectedTabIndex = ActivityCalendarPage.TABS.CALENDAR;
      return;
    }
    return super.saveAndGetDataIfValid();
  }

  onTabChange(event: MatTabChangeEvent, queryTabIndexParamName?: string) {
    super.onTabChange(event);
    if (event.index === ActivityCalendarPage.TABS.CALENDAR) {
      this.calendar.onResize();
    }
    return true;
  }

  protected readonly equals = equals;
}
