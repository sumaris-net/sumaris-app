import { ChangeDetectionStrategy, Component, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { ActivityCalendarForm } from '../form/activity-calendar.form';
import { ActivityCalendarService } from '../activity-calendar.service';
import { AppRootDataEntityEditor, RootDataEntityEditorState } from '@app/data/form/root-data-editor.class';
import { UntypedFormGroup } from '@angular/forms';
import {
  AccountService,
  AppEditorOptions,
  CORE_CONFIG_OPTIONS,
  DateUtils,
  EntityServiceLoadOptions,
  EntityUtils,
  equals,
  fadeInOutAnimation,
  fromDateISOString,
  HistoryPageReference,
  isNotNil,
  ReferentialRef,
  referentialToString,
  StatusIds,
  toBoolean,
  TranslateContextService,
} from '@sumaris-net/ngx-components';
import { ModalController } from '@ionic/angular';
import { SelectVesselsForDataModal, SelectVesselsForDataModalOptions } from '@app/trip/observedlocation/vessels/select-vessel-for-data.modal';
import { ActivityCalendar } from '../model/activity-calendar.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { firstValueFrom, mergeMap, Observable } from 'rxjs';
import { filter, first, map, tap } from 'rxjs/operators';
import { Program } from '@app/referential/services/model/program.model';
import { ActivityCalendarsTableSettingsEnum } from '../table/activity-calendars.table';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import { VesselFilter } from '@app/vessel/services/filter/vessel.filter';
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
import { RxStateProperty } from '@app/shared/state/state.decorator';
import { ActivityCalendarMapComponent } from '@app/activity-calendar/map/activity-calendar-map/activity-calendar-map.component';
import { ActivityMonthFilter } from '@app/activity-calendar/calendar/activity-month.model';

export const ActivityCalendarPageSettingsEnum = {
  PAGE_ID: 'activityCalendar',
  FEATURE_ID: OBSERVED_LOCATION_FEATURE_NAME,
};

export interface ActivityCalendarPageState extends RootDataEntityEditorState {
  year: number;
  vesselCountryId: number;
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
    RxState,
  ],
})
export class ActivityCalendarPage
  extends AppRootDataEntityEditor<ActivityCalendar, ActivityCalendarService, number, ActivityCalendarPageState>
  implements OnInit
{
  static TABS = {
    GENERAL: 0,
    CALENDAR: 1,
    MAP: 2,
  };

  dbTimeZone = DateUtils.moment().tz();
  allowAddNewVessel: boolean;
  showRecorder = true;
  showCalendar = true;
  showMap = true;
  enableReport: boolean;
  rightPanelWidth = 20;
  rightPanelVisible = true;
  @RxStateProperty() year: number;

  @Input() @RxStateProperty() vesselCountryId: number;
  @Input() showVesselType = false;
  @Input() showVesselBasePortLocation = true;
  @Input() showToolbar = true;
  @Input() showQualityForm = true;
  @Input() showOptionsMenu = true;
  @Input() toolbarColor: PredefinedColors = 'primary';

  @ViewChild('baseForm', { static: true }) baseForm: ActivityCalendarForm;
  @ViewChild('calendar') calendar: CalendarComponent;
  @ViewChild('map') map: ActivityCalendarMapComponent;
  @ViewChild('mapCalendar') mapCalendar: CalendarComponent;

  constructor(
    injector: Injector,
    protected modalCtrl: ModalController,
    protected accountService: AccountService,
    protected vesselService: VesselService,
    protected translateContext: TranslateContextService,
    protected activityCalendarContext: ActivityCalendarContextService
  ) {
    super(injector, ActivityCalendar, injector.get(ActivityCalendarService), {
      pathIdAttribute: 'calendarId',
      tabCount: 3,
      i18nPrefix: 'ACTIVITY_CALENDAR.EDIT.',
      enableListenChanges: false, // TODO enable
      acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR,
      settingsId: ActivityCalendarPageSettingsEnum.PAGE_ID,
      canCopyLocally: accountService.isAdmin(),
    });
    this.defaultBackHref = '/activity-calendar';

    // FOR DEV ONLY ----
    this.logPrefix = '[activity-calendar-page] ';
  }

  ngOnInit() {
    super.ngOnInit();

    // Listen some field
    this._state.connect('year', this.baseForm.yearChanges.pipe(filter(isNotNil)));

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
          this.showOptionsMenu = false;
          this.showQualityForm = false;
          this.autoOpenNextTab = false; // Keep first tab
          this.toolbarColor = 'secondary';
          this.markForCheck();
        }
      })
    );

    // Listen first opening the operations tab, then save
    this.registerSubscription(
      this.tabGroup.selectedTabChange
        .pipe(
          filter((event) => this.showMap && event.index === ActivityCalendarPage.TABS.MAP),
          // Save calendar when opening the map tab (keep editor dirty)
          tap(() => this.calendar.dirty && this.markAsDirty()),
          mergeMap(() => (this.calendar.dirty ? this.calendar.save() : Promise.resolve(true))),
          filter((saved) => saved === true),
          // If save succeed, propage calendar data to map
          mergeMap(async () => {
            const value = await this.getValue();
            await this.mapCalendar.setValue(value);
            this.mapCalendar.setFilter(ActivityMonthFilter.fromObject({ month: 1 }));
          })
        )
        .subscribe()
    );
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
      const vessel = data[0] as VesselSnapshot;
      return vessel;
    } else {
      console.debug(this.logPrefix + 'Vessel selection modal was cancelled');
    }
  }

  addMetier(event: UIEvent) {
    if (this.calendar) {
      this.calendar.addMetierBlock(event);
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
    if (this.activityCalendarContext.program !== program) {
      this.activityCalendarContext.program = program;
    }

    try {
      this.showVesselType = program.getPropertyAsBoolean(ProgramProperties.VESSEL_TYPE_ENABLE);
      this.showVesselBasePortLocation = program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_VESSEL_BASE_PORT_LOCATION_ENABLE);
      this.vesselCountryId = program.getPropertyAsInt(ProgramProperties.ACTIVITY_CALENDAR_VESSEL_COUNTRY_ID);
      this.allowAddNewVessel = program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_CREATE_VESSEL_ENABLE);
      this.enableReport = program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_REPORT_ENABLE);

      let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
      i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
      this.i18nContext.suffix = i18nSuffix;

      if (this.baseForm) {
        this.baseForm.timezone = this.dbTimeZone;
        this.baseForm.allowAddNewVessel = this.allowAddNewVessel;
      }
      if (this.calendar) {
        this.calendar.i18nColumnSuffix = i18nSuffix;
        this.calendar.timezone = this.dbTimeZone;
        this.calendar.basePortLocationLevelIds = program.getPropertyAsNumbers(ProgramProperties.ACTIVITY_CALENDAR_BASE_PORT_LOCATION_LEVEL_IDS);
        this.calendar.fishingAreaLocationLevelIds = program.getPropertyAsNumbers(ProgramProperties.ACTIVITY_CALENDAR_FISHING_AREA_LOCATION_LEVEL_IDS);
        this.calendar.metierTaxonGroupIds = program.getPropertyAsNumbers(ProgramProperties.ACTIVITY_CALENDAR_METIER_TAXON_GROUP_TYPE_IDS);

        this.addChildForm(this.calendar);
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

      // Listen first opening the operations tab, then save
      this.registerSubscription(
        this.tabGroup.selectedTabChange
          .pipe(
            filter((event) => event.index === ActivityCalendarPage.TABS.CALENDAR),
            first(),
            tap(() => this.save())
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
        if (this.dbTimeZone) {
          data.startDate = DateUtils.moment().tz(this.dbTimeZone).year(this.year).startOf('year');
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

      if (this.dbTimeZone) {
        data.startDate = DateUtils.moment().tz(this.dbTimeZone).year(this.year).startOf('year');
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
              const startDate = DateUtils.moment().tz(this.dbTimeZone).utc(false).startOf('year');
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

  protected async setValue(data: ActivityCalendar) {
    console.info(this.logPrefix + 'Setting data', data);

    const isNewData = this.isNewData;
    if (!isNewData) {
      // Wait ready only on existing data (must not wait table because program is not set yet)
      await this.ready();
    }

    // Set data to form
    this.baseForm.value = data;

    // Propagate to calendar
    await this.calendar.setValue(data);
  }

  protected async getValue(): Promise<ActivityCalendar> {
    const value = await super.getValue();

    const calendarData = await this.calendar.getValue();
    if (calendarData) {
      value.vesselUseFeatures = calendarData.vesselUseFeatures;
      value.gearUseFeatures = calendarData.gearUseFeatures;
    }

    console.debug('TODO check value=', value);

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
    this.addChildForms([this.baseForm]);
  }

  protected async computeTitle(data: ActivityCalendar): Promise<string> {
    // new data
    if (this.isNewData) {
      return firstValueFrom(this.translate.get('ACTIVITY_CALENDAR.NEW.TITLE'));
    }

    // Make sure page is ready (e.g. i18nContext has been loaded, in setProgram())
    await this.ready();

    // Existing data
    return firstValueFrom(
      this.translateContext.get(`ACTIVITY_CALENDAR.EDIT.TITLE`, this.i18nContext.suffix, {
        vessel: referentialToString(data.vesselSnapshot, ['exteriorMarking', 'name']),
        year: data.year,
      })
    );
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      icon: 'calendar',
    };
  }

  protected async onEntitySaved(data: ActivityCalendar): Promise<void> {
    await super.onEntitySaved(data);

    // Save landings table, when editable
    if (this.calendar?.dirty && this.calendar.canEdit) {
      await this.calendar.save();
    }
  }

  protected getFirstInvalidTabIndex(): number {
    return this.baseForm.invalid ? ActivityCalendarPage.TABS.GENERAL : this.calendar?.invalid ? ActivityCalendarPage.TABS.CALENDAR : -1;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
