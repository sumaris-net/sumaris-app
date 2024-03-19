import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivityCalendarService } from '../activity-calendar.service';
import { ActivityCalendarFilter, ActivityCalendarSynchroImportFilter } from '../activity-calendar.filter';
import { UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import {
  arrayDistinct,
  ConfigService,
  DateUtils,
  FilesUtils,
  fromDateISOString,
  HammerSwipeEvent,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  MatAutocompleteFieldConfig,
  MINIFY_ENTITY_FOR_LOCAL_STORAGE,
  OfflineFeature,
  PersonService,
  PersonUtils,
  ReferentialRef,
  SharedValidators,
  slideUpDownAnimation,
  splitByProperty,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { LocationLevelIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import {
  ACTIVITY_CALENDAR_CONFIG_OPTIONS,
  ACTIVITY_CALENDAR_FEATURE_DEFAULT_PROGRAM_FILTER,
  ACTIVITY_CALENDAR_FEATURE_NAME,
} from '../activity-calendar.config';
import { AppRootDataTable, AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
import { environment } from '@environments/environment';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import { filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ActivityCalendarOfflineModal, ActivityCalendarOfflineModalOptions } from '../offline/activity-calendar-offline.modal';
import { DataQualityStatusEnum, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { ContextService } from '@app/shared/context.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
import { ExtractionFilter, ExtractionType } from '@app/extraction/type/extraction-type.model';
import { ActivityCalendarValidatorService } from '@app/activity-calendar/model/activity-calendar.validator';
import { BaseTableState } from '@app/shared/table/base.table';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { VESSEL_CONFIG_OPTIONS } from '@app/vessel/services/config/vessel.config';

export const ActivityCalendarsPageSettingsEnum = {
  PAGE_ID: 'activity-calendars',
  FILTER_KEY: AppRootTableSettingsEnum.FILTER_KEY,
  FEATURE_ID: ACTIVITY_CALENDAR_FEATURE_NAME,
};

export interface ActivityCalendarsPageState extends BaseTableState {
  years: number[];
}

@Component({
  selector: 'app-activity-calendar-page',
  templateUrl: 'activity-calendars.page.html',
  styleUrls: ['./activity-calendars.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideUpDownAnimation],
  providers: [RxState],
})
export class ActivityCalendarsPage
  extends AppRootDataTable<
    ActivityCalendar,
    ActivityCalendarFilter,
    ActivityCalendarService,
    ActivityCalendarValidatorService,
    number,
    ActivityCalendarsPageState
  >
  implements OnInit, OnDestroy
{
  @RxStateSelect() protected title$: Observable<string>;
  @RxStateSelect() protected years$: Observable<number>;

  protected statusList = DataQualityStatusList;
  protected statusById = DataQualityStatusEnum;
  protected qualityFlags: ReferentialRef[];
  protected qualityFlagsById: { [id: number]: ReferentialRef };

  @Input() showRecorder = true;
  @Input() canDownload = false;
  @Input() canUpload = false;
  @Input() canOpenMap = false;
  @Input() registrationLocationLevelIds: number[] = null;
  @Input() basePortLocationLevelIds: number[] = null;
  @RxStateProperty() @Input() title: string;

  get filterDataQualityControl(): UntypedFormControl {
    return this.filterForm.controls.dataQualityStatus as UntypedFormControl;
  }

  get filterYearControl(): UntypedFormControl {
    return this.filterForm.controls.startDate as UntypedFormControl;
  }

  constructor(
    injector: Injector,
    protected _dataService: ActivityCalendarService,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected configService: ConfigService,
    protected context: ContextService,
    protected formBuilder: UntypedFormBuilder,
    protected cd: ChangeDetectorRef
  ) {
    super(
      injector,
      ActivityCalendar,
      ActivityCalendarFilter,
      ['quality', 'program', 'vessel', 'year', 'directSurveyInvestigation', 'recorderPerson', 'comments'],
      _dataService,
      null
    );
    this.i18nColumnPrefix = 'ACTIVITY_CALENDAR.TABLE.';
    this.filterForm = formBuilder.group({
      program: [null, SharedValidators.entity],
      vesselSnapshot: [null, SharedValidators.entity],
      startDate: [null, SharedValidators.validDate],
      endDate: [null, SharedValidators.validDate],
      registrationLocations: [null],
      basePortLocations: [null],
      directSurveyInvestigation: [null],
      synchronizationStatus: [null],
      recorderDepartment: [null, SharedValidators.entity],
      recorderPerson: [null, SharedValidators.entity],
      dataQualityStatus: [null],
      qualityFlagId: [null, SharedValidators.integer],
    });

    this.autoLoad = false; // See restoreFilterOrLoad()
    this.inlineEdition = false;
    this.defaultSortBy = 'year';
    this.defaultSortDirection = 'desc';
    this.confirmBeforeDelete = true;
    this.canEdit = this.accountService.isUser();

    const showAdvancedFeatures = this.accountService.isAdmin();
    this.canDownload = showAdvancedFeatures;
    this.canUpload = showAdvancedFeatures;
    this.canOpenMap = showAdvancedFeatures;

    this.settingsId = ActivityCalendarsPageSettingsEnum.PAGE_ID; // Fixed value, to be able to reuse it in the editor page
    this.featureName = ActivityCalendarsPageSettingsEnum.FEATURE_ID;

    // Load years
    {
      const years = new Array(10).fill(DateUtils.moment().year()).map((year, index) => year - index);
      console.log('TODO', years); // Affiche un tableau vide, de 10 éléments, au lieu de 2023,2022,2021...
      this._state.set({ years });
    }

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Programs combo (filter)
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: ACTIVITY_CALENDAR_FEATURE_DEFAULT_PROGRAM_FILTER,
      mobile: this.mobile,
    });

    // Combo: vessels
    this.vesselSnapshotService.getAutocompleteFieldOptions().then((opts) => this.registerAutocompleteField('vesselSnapshot', opts));

    const locationConfig: MatAutocompleteFieldConfig = {
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      attributes: this.settings.getFieldDisplayAttributes('location'),
      mobile: this.mobile,
    };
    // Combo: registration location
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('registrationLocation', {
      ...locationConfig,
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, { ...filter, levelIds: this.registrationLocationLevelIds || [LocationLevelIds.COUNTRY] }),
    });
    // Combo: base port locations
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('basePortLocation', {
      ...locationConfig,
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, { ...filter, levelIds: this.basePortLocationLevelIds || [LocationLevelIds.PORT] }),
    });

    // Combo: recorder department
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('department', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Department',
      },
      mobile: this.mobile,
    });

    // Combo: recorder person
    const personAttributes = this.settings.getFieldDisplayAttributes('person', ['lastName', 'firstName', 'department.name']);
    this.registerAutocompleteField('person', {
      service: this.personService,
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      },
      attributes: personAttributes,
      displayWith: PersonUtils.personToString,
      mobile: this.mobile,
    });

    this.registerSubscription(
      this.configService.config.pipe(filter(isNotNil)).subscribe((config) => {
        console.info('[activity-calendars] Init from config', config);

        this.title = config.getProperty(ACTIVITY_CALENDAR_CONFIG_OPTIONS.ACTIVITY_CALENDAR_NAME);

        this.showQuality = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.QUALITY_PROCESS_ENABLE);
        this.setShowColumn('quality', this.showQuality, { emitEvent: false });

        if (this.showQuality) {
          this.referentialRefService.loadQualityFlags().then((items) => {
            this.qualityFlags = items;
            this.qualityFlagsById = splitByProperty(items, 'id');
          });
        }

        // Recorder
        this.showRecorder = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_RECORDER);
        this.setShowColumn('recorderPerson', this.showRecorder, { emitEvent: false });

        // Locations combo (filter)
        this.registrationLocationLevelIds = config.getPropertyAsNumbers(VESSEL_CONFIG_OPTIONS.VESSEL_REGISTRATION_LOCATION_LEVEL_ID);
        this.basePortLocationLevelIds = [LocationLevelIds.PORT];

        this.updateColumns();

        // Restore filter from settings, or load all
        this.restoreFilterOrLoad();
      })
    );

    // Clear the existing activityCalendar context
    this.resetContext();
  }

  setFilter(filter: Partial<ActivityCalendarFilter>, opts?: { emitEvent: boolean }) {
    filter = filter || {};
    filter.startDate = fromDateISOString(filter.startDate || DateUtils.moment().utc(false).add(-1, 'year')).startOf('year');
    filter.endDate = filter.startDate?.clone().endOf('year');
    super.setFilter(filter, opts);
  }

  protected countNotEmptyCriteria(filter: ActivityCalendarFilter): number {
    const yearOffset = [filter?.startDate, filter?.endDate].filter(isNotNil).length;
    return super.countNotEmptyCriteria(filter) - yearOffset;
  }

  /**
   * Action triggered when user swipes
   */
  onSwipeTab(event: HammerSwipeEvent): boolean {
    // DEBUG
    // if (this.debug) console.debug("[activity-calendars] onSwipeTab()");

    // Skip, if not a valid swipe event
    if (!event || event.defaultPrevented || (event.srcEvent && event.srcEvent.defaultPrevented) || event.pointerType !== 'touch') {
      return false;
    }

    this.toggleSynchronizationStatus();
    return true;
  }

  async prepareOfflineMode(
    event?: Event,
    opts?: {
      toggleToOfflineMode?: boolean;
      showToast?: boolean;
      filter?: any;
    }
  ): Promise<undefined | boolean> {
    if (this.importing) return; // Skip

    const feature =
      this.settings.getOfflineFeature(this._dataService.featureName) ||
      <OfflineFeature>{
        name: this._dataService.featureName,
      };
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const filter = this.asFilter(this.filterForm.value);
    const synchroFilter = <ActivityCalendarSynchroImportFilter>{
      vesselId: filter.vesselId || (filter.vesselSnapshot && filter.vesselSnapshot.id) || undefined,
      programLabel: (filter.program && filter.program.label) || undefined,
      ...feature.filter,
    };

    // Open offline, if missing program or vesselId
    if (event || isNilOrBlank(synchroFilter?.programLabel) || isNil(synchroFilter?.vesselId)) {
      const modal = await this.modalCtrl.create({
        component: ActivityCalendarOfflineModal,
        componentProps: <ActivityCalendarOfflineModalOptions>{
          value: synchroFilter,
        },
        keyboardClose: true,
      });

      // Open the modal
      modal.present();

      // Wait until closed
      const { data, role } = await modal.onDidDismiss();

      if (!data || role === 'cancel') return; // User cancelled

      // Update feature filter, and save it into settings
      feature.filter = ActivityCalendarSynchroImportFilter.fromObject(data).asObject();
      this.settings.saveOfflineFeature(feature);

      // DEBUG
      console.debug('[activityCalendar-table] Will prepare offline mode, using filter:', feature.filter);
    } else {
      // Saving feature's filter, to order to use it in ActivityCalendarService.runImport()
      feature.filter = ActivityCalendarSynchroImportFilter.fromObject(synchroFilter).asObject();
      this.settings.saveOfflineFeature(feature);
    }

    return super.prepareOfflineMode(event, opts);
  }

  async importFromFile(event: Event): Promise<ActivityCalendar[]> {
    const data = await super.importFromFile(event);
    if (isEmptyArray(data)) return; // Skip

    const entities: ActivityCalendar[] = [];
    const errors = [];
    for (const json of data) {
      try {
        const entity = ActivityCalendar.fromObject(json);
        const savedEntity = await this._dataService.copyLocally(entity);
        entities.push(savedEntity);
      } catch (err) {
        const message = (err && err.message) || err;
        errors.push(message);
        console.error(message, err);
      }
    }
    if (isEmptyArray(entities) && isEmptyArray(errors)) {
      // Nothing to import (empty file ?)
      return;
    } else if (isEmptyArray(entities) && isNotEmptyArray(errors)) {
      await this.showToast({
        type: 'error',
        message: 'ACTIVITY_CALENDAR.TABLE.ERROR.IMPORT_FILE_FAILED',
        messageParams: { error: errors.join('\n') },
      });
    } else if (isNotEmptyArray(errors)) {
      await this.showToast({
        type: 'warning',
        message: 'ACTIVITY_CALENDAR.TABLE.INFO.IMPORT_FILE_SUCCEED_WITH_ERRORS',
        messageParams: { inserts: entities.length, errors: errors.length },
      });
    } else {
      await this.showToast({
        type: 'info',
        message: 'ACTIVITY_CALENDAR.TABLE.INFO.IMPORT_FILE_SUCCEED',
        messageParams: { inserts: entities.length },
      });
    }
    return entities;
  }

  async downloadSelectionAsJson(event?: Event) {
    const ids = (this.selection.selected || []).map((row) => row.currentData?.id);
    return this.downloadAsJson(ids);
  }

  async openDownloadPage(type?: ExtractionType) {
    const activityCalendars = (this.selection.selected || []).map((row) => row.currentData).filter(isNotNil);
    if (isEmptyArray(activityCalendars)) return; // Skip if empty

    const programs = arrayDistinct(
      activityCalendars.map((t) => t.program),
      'label'
    );
    if (programs.length !== 1) {
      this.showToast({
        type: 'warning',
        message: 'ACTIVITY_CALENDAR.TABLE.WARNING.NEED_ONE_PROGRAM',
      });
      return; // Skip if no program
    }

    // Clear selection
    this.selection.clear();
    this.markForCheck();

    // Create extraction type and filter
    type = type || ExtractionType.fromLiveLabel('ACTIVITY_CALENDAR');
    const programLabel = programs[0].label;
    const activityCalendarIds = activityCalendars.map((t) => t.id);

    // TODO
    const filter = ExtractionFilter.fromObject({});
    // = ExtractionUtils.createActivityCalendarFilter(programLabel, activityCalendarIds);
    const queryParams = ExtractionUtils.asQueryParams(type, filter);

    // Open extraction
    await this.router.navigate(['extraction', 'data'], { queryParams });
  }

  clearFilterValue(key: keyof ActivityCalendarFilter, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.filterForm.get(key).reset(null);
  }

  /* -- protected methods -- */

  protected setFilterYear(year: number) {
    const startDate = DateUtils.moment().utc(false).year(year).startOf('year');
    this.setFilter({ startDate });
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected resetContext() {
    // Consume all context data, to avoid reusing it somewhere
    // We should do that at each menu entry point
    this.context.reset();
  }

  protected async downloadAsJson(ids: number[]) {
    if (isEmptyArray(ids)) return; // Skip if empty

    // Create file content
    const entities = (await Promise.all(ids.map((id) => this._dataService.load(id, { fullLoad: true, withOperation: true })))).map((entity) =>
      entity.asObject(MINIFY_ENTITY_FOR_LOCAL_STORAGE)
    );
    const content = JSON.stringify(entities);

    // Write to file
    FilesUtils.writeTextToFile(content, {
      filename: this.translate.instant('ACTIVITY_CALENDAR.TABLE.DOWNLOAD_JSON_FILENAME'),
      type: 'application/json',
    });
  }

  protected excludeNotQualified(qualityFlag: ReferentialRef): boolean {
    return qualityFlag?.id !== QualityFlagIds.NOT_QUALIFIED;
  }
}
