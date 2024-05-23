import { ChangeDetectionStrategy, Component, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { ActivityCalendarForm } from '../form/activity-calendar.form';
import { ActivityCalendarService } from '../activity-calendar.service';
import { AppRootDataEntityEditor, RootDataEntityEditorState } from '@app/data/form/root-data-editor.class';
import { UntypedFormGroup } from '@angular/forms';
import {
  AccountService,
  AppEditorOptions,
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
  isNotEmptyArray,
  isNotNil,
  isNotNilOrNaN,
  Property,
  ReferentialRef,
  referentialToString,
  ReferentialUtils,
  removeDuplicatesFromArray,
  StatusIds,
  toBoolean,
  toNumber,
  TranslateContextService,
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
import { VesselFeaturesFilter, VesselFilter, VesselOwnerPeriodFilter, VesselRegistrationFilter } from '@app/vessel/services/filter/vessel.filter';
import { PredefinedColors } from '@ionic/core';
import { VesselService } from '@app/vessel/services/vessel-service';
import { ActivityCalendarContextService } from '../activity-calendar-context.service';
import { ActivityCalendarFilter } from '@app/activity-calendar/activity-calendar.filter';
import { APP_DATA_ENTITY_EDITOR, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { OBSERVED_LOCATION_FEATURE_NAME } from '@app/trip/trip.config';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { RxState } from '@rx-angular/state';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { CalendarComponent } from '@app/activity-calendar/calendar/calendar.component';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { ActivityCalendarMapComponent } from '@app/activity-calendar/map/activity-calendar-map/activity-calendar-map.component';
import { Moment } from 'moment';
import { CalendarUtils } from '@app/activity-calendar/calendar/calendar.utils';
import { VesselUseFeatures, VesselUseFeaturesIsActiveEnum } from '@app/activity-calendar/model/vessel-use-features.model';
import { ActivityMonthUtils } from '@app/activity-calendar/calendar/activity-month.utils';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { GearUseFeaturesTable } from '../metier/gear-use-features.table';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';
import { VesselFeaturesHistoryComponent } from '@app/vessel/page/vessel-features-history.component';
import { VesselRegistrationHistoryComponent } from '@app/vessel/page/vessel-registration-history.component';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { IOutputAreaSizes } from 'angular-split/lib/interface';
import { SplitComponent } from 'angular-split';
import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';
import { VesselOwnerHistoryComponent } from '@app/vessel/page/vessel-owner-history.component';
import { AppImageAttachmentGallery } from '@app/data/image/image-attachment-gallery.component';

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
}

@Component({
  selector: 'app-activity-calendar-page',
  templateUrl: './activity-calendar.page.html',
  styleUrls: ['./activity-calendar.page.scss'],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: APP_DATA_ENTITY_EDITOR, useExisting: ActivityCalendarPage },
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
  implements OnInit
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
  @RxStateProperty() protected reportTypes: Property[];
  @RxStateProperty() protected titleMenu: string;

  protected timezone = DateUtils.moment().tz();
  protected allowAddNewVessel: boolean;
  protected showRecorder = true;
  protected showCalendar = true;
  protected showVesselTab = true;
  protected enableReport: boolean;
  protected showMap = true;
  protected _predocPanelSize = 30;
  protected _predocPanelVisible = false;
  protected mapPanelWidth = 30;
  protected showMapPanel = true; // TODO enable
  protected vesselSnapshotAttributes = VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES;
  protected selectedSubTabIndex = 0;
  protected vesselSnapshotAttributes = VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES;

  @Input() showVesselType = false;
  @Input() showVesselBasePortLocation = true;
  @Input() showToolbar = true;
  @Input() showQualityForm = true;
  @Input() showPictures = true;
  @Input() showOptionsMenu = true;
  @Input() toolbarColor: PredefinedColors = 'primary';

  @Input() @RxStateProperty() year: number;
  @Input() @RxStateProperty() vesselCountryId: number;
  @Input() @RxStateProperty() months: Moment[];
  @Input() @RxStateProperty() predocProgramLabels: string[] = null;

  @ViewChild('baseForm', { static: true }) baseForm: ActivityCalendarForm;
  @ViewChild('calendar', { static: true }) calendar: CalendarComponent;

  @ViewChild('predocSplit') predocSplit: SplitComponent;
  @ViewChild('predocCalendar') predocCalendar: CalendarComponent;
  @ViewChild('tableMetier') tableMetier: GearUseFeaturesTable;
  @ViewChild('map') map: ActivityCalendarMapComponent;
  @ViewChild('mapCalendar') mapCalendar: CalendarComponent;
  @ViewChild('featuresHistoryTable', { static: true }) featuresHistoryTable: VesselFeaturesHistoryComponent;
  @ViewChild('registrationHistoryTable', { static: true }) registrationHistoryTable: VesselRegistrationHistoryComponent;
  @ViewChild('ownerHistoryTable', { static: true }) ownerHistoryTable: VesselOwnerHistoryComponent;
  @ViewChild('gallery', { static: true }) gallery: AppImageAttachmentGallery;

  constructor(
    injector: Injector,
    protected modalCtrl: ModalController,
    protected accountService: AccountService,
    protected vesselService: VesselService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected translateContext: TranslateContextService,
    protected activityCalendarContext: ActivityCalendarContextService,
    protected hotkeys: Hotkeys
  ) {
    super(injector, ActivityCalendar, injector.get(ActivityCalendarService), {
      pathIdAttribute: 'calendarId',
      tabCount: 5, // 4 is map is hidden
      i18nPrefix: 'ACTIVITY_CALENDAR.EDIT.',
      enableListenChanges: false, // TODO enable
      acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR,
      settingsId: ActivityCalendarPageSettingsEnum.PAGE_ID,
      canCopyLocally: accountService.isAdmin(),
      autoOpenNextTab: false,
    });
    this.defaultBackHref = '/activity-calendar';

    // FOR DEV ONLY ----
    this.logPrefix = '[activity-calendar-page] ';
  }

  ngOnInit() {
    super.ngOnInit();

    // Listen some field
    this._state.connect('year', this.baseForm.yearChanges.pipe(filter(isNotNil)));

    this._state.connect(
      'reportTypes',
      this.program$.pipe(
        map((program) => {
          return program.getPropertyAsStrings(ProgramProperties.ACTIVITY_CALENDAR_REPORT_TYPE).map((key) => {
            const values = ProgramProperties.ACTIVITY_CALENDAR_REPORT_TYPE.values as Property[];
            return values.find((item) => item.key === key);
          });
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

        this.tableMetier.value = this.getMetierValue(this.calendar.value, this.tableMetier.value);
      })
    );

    // Listen opening the map tab
    this.registerSubscription(
      this.tabGroup.selectedTabChange.pipe(filter((event) => this.showMap && event.index === ActivityCalendarPage.TABS.MAP)).subscribe(async () => {
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
          .addShortcut({ keys: 'control.p', description: 'ACTIVITY_CALENDAR.EDIT.SHOW_PREDOC', preventDefault: true })
          .pipe(filter(() => this.loaded))
          .subscribe(() => this.toggleShowPredoc())
      );
    }

    this.restorePredocPanelSize();
  }
  ngAfterViewInit() {
    super.ngAfterViewInit();

    this.registerSubscription(
      this.onUpdateView.subscribe(() => {
        if (isNotNilOrNaN(this.data.id)) {
          this.featuresHistoryTable.setFilter(VesselFeaturesFilter.fromObject({ vesselId: this.data.vesselSnapshot.id }), { emitEvent: true });
          this.registrationHistoryTable.setFilter(VesselRegistrationFilter.fromObject({ vesselId: this.data.vesselSnapshot.id }), {
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
      this.selectedSubTabIndex = (queryParams['subtab'] && parseInt(queryParams['subtab'])) || 0;
    }
  }

  updateViewState(data: ActivityCalendar, opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.updateViewState(data);

    // Update tabs state (show/hide)
    this.updateTabsState(data);
  }

  updateTabsState(data: ActivityCalendar) {
    // Move to second tab
    if (this.autoOpenNextTab && !this.isNewData && this.selectedTabIndex === 0) {
      this.selectedTabIndex = 1;
      this.tabGroup.realignInkBar();
      this.autoOpenNextTab = false; // Should switch only once
    }
  }

  async saveTable(table: AppTable<any>) {
    if (!table.confirmEditCreate()) return false;
    if (table.dirty) {
      this.markAsDirty();
      return await table.save();
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
    if (this.calendar) {
      this.calendar.addMetierBlock(event);
    }
  }

  async openReport(reportType?: ActivityCalendarReportType) {
    if (this.dirty) {
      const data = await this.saveAndGetDataIfValid();
      if (!data) return; // Cancel
    }

    if (!reportType) reportType = this.reportTypes.length === 1 ? <ActivityCalendarReportType>this.reportTypes[0].key : 'form';

    const reportPath = reportType.split('-');
    return this.router.navigateByUrl([this.computePageUrl(this.data.id), 'report', ...reportPath].join('/'));
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
    if (this.activityCalendarContext.program !== program) {
      this.activityCalendarContext.program = program;
    }

    try {
      this.showVesselType = program.getPropertyAsBoolean(ProgramProperties.VESSEL_TYPE_ENABLE);
      this.showVesselBasePortLocation = program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_VESSEL_BASE_PORT_LOCATION_ENABLE);
      this.vesselCountryId = program.getPropertyAsInt(ProgramProperties.ACTIVITY_CALENDAR_VESSEL_COUNTRY_ID);
      this.allowAddNewVessel = program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_CREATE_VESSEL_ENABLE);
      this.enableReport = program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_REPORT_ENABLE);
      this.predocProgramLabels = program.getPropertyAsStrings(ProgramProperties.ACTIVITY_CALENDAR_PREDOC_PROGRAM_LABELS);

      let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
      i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
      this.i18nContext.suffix = i18nSuffix;

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

  protected async setStrategy(strategy: Strategy): Promise<void> {
    await super.setStrategy(strategy);

    // Update the context
    if (this.activityCalendarContext.strategy !== strategy) {
      if (this.debug) console.debug(this.logPrefix + "Update context's strategy...", strategy);
      this.activityCalendarContext.strategy = strategy;
    }
  }

  protected async onNewEntity(data: ActivityCalendar, options?: EntityServiceLoadOptions): Promise<void> {
    console.debug(this.logPrefix + 'New entity: applying defaults...');

    // If is on field mode, fill default values
    if (this.isOnFieldMode) {
      data.year = DateUtils.moment().utc().year() - 1;

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
      if (searchFilter.startDate) {
        this.year = fromDateISOString(searchFilter.startDate).year();
        data.year = this.year;
        if (this.timezone) {
          data.startDate = DateUtils.moment().tz(this.timezone).year(this.year).startOf('year');
        } else {
          data.startDate = DateUtils.moment().year(this.year).startOf('year');
        }
      }
    }

    // Set contextual program, if any
    if (!data.program) {
      const contextualProgram = this.context.program;
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

  protected async onEntityLoaded(data: ActivityCalendar, options?: EntityServiceLoadOptions): Promise<void> {
    const programLabel = data.program?.label;
    if (programLabel) this.programLabel = programLabel;

    // Year
    if (isNotNil(data.year)) {
      this.year = data.year;

      if (this.timezone) {
        data.startDate = DateUtils.moment().tz(this.timezone).year(this.year).startOf('year');
      } else {
        data.startDate = DateUtils.moment().year(this.year).startOf('year');
      }
    }

    // Hide unused field (for historical data)
    this.baseForm.showEconomicSurvey = isNotNil(data.economicSurvey);
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
    const activityMonths = ActivityMonthUtils.fromActivityCalendar(data);
    this.calendar.value = activityMonths;

    // Set metier table data
    this.tableMetier.value = this.getMetierValue(activityMonths, data.gearUseFeatures);

    // Load pictures
    if (this.showPictures) {
      this.loadPictures(data);
    }

    // Load predoc
    if (this._predocPanelVisible) {
      this.loadPredoc(data);
    }
  }

  getMetierValue(activityMonths: ActivityMonth[], gearUseFeatures: GearUseFeatures[]) {
    // Set metier table data
    // TODO sort by startDate ?
    const monthMetiers = removeDuplicatesFromArray(
      activityMonths.flatMap((month) => month.gearUseFeatures.map((guf) => guf.metier)),
      'id'
    );
    const firstDayOfYear = DateUtils.moment().tz(this.timezone).year(this.year).startOf('year');
    const lastDayOfYear = firstDayOfYear.clone().endOf('year');

    const metiers = monthMetiers
      .map((metier, index) => {
        const existingGuf = (gearUseFeatures || []).find((guf) => {
          //TODO MFA à voir avec ifremer comment filtrer les GUF qui sont à afficher dans le tableau des métiers
          return (
            DateUtils.isSame(firstDayOfYear, guf.startDate, 'day') &&
            DateUtils.isSame(lastDayOfYear, guf.endDate, 'day') &&
            ReferentialUtils.equals(guf.metier, metier)
          );
        });
        if (existingGuf) existingGuf.rankOrder = index + 1;
        return existingGuf || { startDate: firstDayOfYear, endDate: lastDayOfYear, metier, rankOrder: index + 1 };
      })
      .map(GearUseFeatures.fromObject);

    // DEBUG
    console.debug(this.logPrefix + 'Loaded metiers: ', metiers);
    return metiers;
  }

  async getValue(): Promise<ActivityCalendar> {
    if (this.debug) console.debug(this.logPrefix + 'Getting editor value...');

    const value = await super.getValue();

    const activityMonths = this.calendar.value;
    if (activityMonths) {
      value.vesselUseFeatures = activityMonths.map((m) => VesselUseFeatures.fromObject(m.asObject())).filter(VesselUseFeatures.isNotEmpty);
      value.gearUseFeatures = activityMonths.flatMap((m) =>
        ((m.isActive === VesselUseFeaturesIsActiveEnum.ACTIVE && m.gearUseFeatures) || []).filter(GearUseFeatures.isNotEmpty).map((guf, index) => {
          guf.rankOrder = index + 1;
          guf.fishingAreas = guf.fishingAreas?.filter(FishingArea.isNotEmpty) || [];
          return guf;
        })
      );
    }

    // Metiers
    const metierGearUseFeatures = this.tableMetier.value;
    if (isNotEmptyArray(metierGearUseFeatures)) value.gearUseFeatures = [...value.gearUseFeatures, ...metierGearUseFeatures];

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
    this.addForms([this.baseForm, () => this.calendar]);
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
    await super.onEntitySaved(data);
  }

  protected getFirstInvalidTabIndex(): number {
    return this.baseForm.invalid ? ActivityCalendarPage.TABS.GENERAL : this.calendar?.invalid ? ActivityCalendarPage.TABS.CALENDAR : -1;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async loadPredoc(entity: ActivityCalendar) {
    // DEBUG
    const now = Date.now();
    console.debug(`${this.logPrefix}Loading predoc calendars...`);

    const programLabels = await firstValueFrom(this.predocProgramLabels$);

    const lastYearDefer = async () => {
      const { data } = await this.dataService.loadAll(
        0,
        1,
        'updateDate',
        'desc',
        <ActivityCalendarFilter>{
          program: entity.program,
          vesselId: entity.vesselSnapshot?.id,
          year: entity.year - 1,
        },
        { fullLoad: true }
      );
      return data?.[0];
    };
    const otherProgramDefers = (programLabels || []).map((programLabel) => async () => {
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

    const predocCalendars = (await chainPromises<ActivityCalendar>([lastYearDefer, ...otherProgramDefers])).filter(isNotNil);
    console.debug(`${this.logPrefix}${predocCalendars.length} predoc calendars loaded in ${Date.now() - now}ms`);

    if (isNotEmptyArray(predocCalendars)) {
      this.predocCalendar.markAsReady();

      // DEBUG: simulate a previous calendar
      //if (this.debug && predocCalendars.length === 1) predocCalendars = predocCalendars.concat(predocCalendars[0].clone());

      const predocMonths = predocCalendars.flatMap((ac) => ActivityMonthUtils.fromActivityCalendar(ac));
      EntityUtils.sort(predocMonths, 'month', 'asc');

      await this.predocCalendar.setValue(predocMonths);
    }
  }

  protected loadPictures(data: ActivityCalendar) {
    const firstLoad = !this.gallery.loaded;

    // TODO fetch images
    this.gallery.value = [];

    // TODO load images
    // then add gallery into child form
    if (firstLoad) this.addForms([this.gallery]);
  }

  protected toggleShowPredoc(event?: Event) {
    this._predocPanelVisible = !this._predocPanelVisible;
    this.savePredocPanelSize();
    this.markForCheck();

    if (this._predocPanelVisible && !this.predocCalendar.loaded) {
      setTimeout(() => this.loadPredoc(this.data), 500);
    }
  }

  protected restorePredocPanelSize() {
    const { size, visible } = this.settings.getPageSettings(this.settingsId, ActivityCalendarPageSettingsEnum.PREDOC_PANEL_CONFIG) || {};
    this._predocPanelSize = isNotNilOrNaN(toNumber(size)) ? +size : this._predocPanelSize;
    this._predocPanelVisible = toBoolean(visible, this._predocPanelVisible);
  }

  protected savePredocPanelSize(sizes?: IOutputAreaSizes) {
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
    return referentialToString(vessel, this.vesselSnapshotAttributes);
  }
}
