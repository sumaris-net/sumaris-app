import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivityCalendarService } from '../activity-calendar.service';
import { ActivityCalendarFilter, ActivityCalendarSynchroImportFilter } from '../activity-calendar.filter';
import { UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import {
  arrayDistinct,
  ConfigService,
  CORE_CONFIG_OPTIONS,
  DateUtils,
  FilesUtils,
  HammerSwipeEvent,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  MatAutocompleteFieldConfig,
  MINIFY_ENTITY_FOR_LOCAL_STORAGE,
  OfflineFeature,
  PersonService,
  PersonUtils,
  Property,
  ReferentialRef,
  SharedValidators,
  slideUpDownAnimation,
  splitByProperty,
  StatusIds,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AcquisitionLevelCodes, LocationLevelIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
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
import { AppBaseTableFilterRestoreSource, BaseTableState } from '@app/shared/table/base.table';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { isMoment } from 'moment';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { FileTransferService } from '@app/shared/service/file-transfer.service';

export const ActivityCalendarsTableSettingsEnum = {
  PAGE_ID: 'activity-calendars',
  FILTER_KEY: AppRootTableSettingsEnum.FILTER_KEY,
  FEATURE_ID: ACTIVITY_CALENDAR_FEATURE_NAME,
};

export interface ActivityCalendarsPageState extends BaseTableState {
  years: number[];
  canImportCsvFile: boolean;
  reportTypes: Property[];
}

@Component({
  selector: 'app-activity-calendar-table',
  templateUrl: 'activity-calendars.table.html',
  styleUrls: ['./activity-calendars.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideUpDownAnimation],
  providers: [RxState],
})
export class ActivityCalendarsTable
  extends AppRootDataTable<ActivityCalendar, ActivityCalendarFilter, ActivityCalendarService, any, number, ActivityCalendarsPageState>
  implements OnInit, OnDestroy
{
  @RxStateSelect() protected title$: Observable<string>;
  @RxStateSelect() protected years$: Observable<number[]>;
  @RxStateSelect() protected canImportCsvFile$: Observable<boolean>;

  @RxStateProperty() protected years: number[];
  @RxStateProperty() protected canImportCsvFile: boolean;

  protected statusList = DataQualityStatusList;
  protected statusById = DataQualityStatusEnum;
  protected qualityFlags: ReferentialRef[];
  protected qualityFlagsById: { [id: number]: ReferentialRef };
  protected timezone = DateUtils.moment().tz();

  @Input() showRecorder = true;
  @Input() canDownload = false;
  @Input() canUpload = false;
  @Input() canOpenMap = false;
  @Input() registrationLocationLevelIds: number[] = null;
  @Input() basePortLocationLevelIds: number[] = null;
  @Input() @RxStateProperty() title: string;
  @Input() canAdd: boolean;
  @Input() enableReport = false;
  @RxStateProperty() protected reportTypes: Property[];

  @Input()
  set showObservers(value: boolean) {
    this.setShowColumn('observers', value);
  }

  get showObservers(): boolean {
    return this.getShowColumn('observers');
  }

  @Input()
  set showVesselTypeColumn(value: boolean) {
    this.setShowColumn('vesselType', value);
  }

  get showVesselTypeColumn(): boolean {
    return this.getShowColumn('vesselType');
  }

  @Input()
  set showProgram(value: boolean) {
    this.setShowColumn('program', value);
  }

  get showProgram(): boolean {
    return this.getShowColumn('program');
  }

  @Input()
  set showYearColumn(value: boolean) {
    this.setShowColumn('year', value);
  }

  get showYearColumn(): boolean {
    return this.getShowColumn('year');
  }

  get filterYearControl(): UntypedFormControl {
    return this.filterForm.controls.year as UntypedFormControl;
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
    private readonly transferService: FileTransferService,
    protected cd: ChangeDetectorRef
  ) {
    super(
      injector,
      ActivityCalendar,
      ActivityCalendarFilter,
      ['quality', 'program', 'vessel', 'year', 'directSurveyInvestigation', 'economicSurvey', 'observers', 'recorderPerson', 'comments'],
      _dataService,
      null
    );
    this.i18nColumnPrefix = 'ACTIVITY_CALENDAR.TABLE.';
    this.filterForm = formBuilder.group({
      program: [null, SharedValidators.entity],
      vesselSnapshot: [null, SharedValidators.entity],
      year: [null, SharedValidators.integer],
      startDate: [null, SharedValidators.validDate],
      endDate: [null, SharedValidators.validDate],
      registrationLocations: [null],
      basePortLocations: [null],
      synchronizationStatus: [null],
      recorderDepartment: [null, SharedValidators.entity],
      recorderPerson: [null, SharedValidators.entity],
      dataQualityStatus: [null],
      qualityFlagId: [null, SharedValidators.integer],
      directSurveyInvestigation: [null],
      economicSurvey: [null],
      observers: [null, formBuilder.array([null])],
    });

    this.autoLoad = false; // See restoreFilterOrLoad()
    this.inlineEdition = false;
    this.defaultSortBy = 'year';
    this.defaultSortDirection = 'desc';
    this.confirmBeforeDelete = true;
    this.canEdit = false;

    this.settingsId = ActivityCalendarsTableSettingsEnum.PAGE_ID; // Fixed value, to be able to reuse it in the editor page
    this.featureName = ActivityCalendarsTableSettingsEnum.FEATURE_ID;

    // Load years
    {
      this.years = new Array(11).fill(DateUtils.moment().year() + 1).map((year, index) => year - index);
    }

    // FOR DEV ONLY ----
    this.debug = !environment.production;
    this.logPrefix = '[activity-calendar-table] ';
  }

  ngOnInit() {
    super.ngOnInit();

    this.canEdit = this.accountService.isUser();
    const showAdvancedFeatures = this.isAdmin;
    this.canDownload = showAdvancedFeatures;
    this.canUpload = showAdvancedFeatures;
    this.canOpenMap = showAdvancedFeatures;
    this.canAdd = showAdvancedFeatures;

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

    // Combo: observers
    this.registerAutocompleteField('observers', {
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
        console.info(`${this.logPrefix}Init from config`, config);

        this.title = config.getProperty(ACTIVITY_CALENDAR_CONFIG_OPTIONS.ACTIVITY_CALENDAR_NAME);
        this.timezone = config.getProperty(CORE_CONFIG_OPTIONS.DB_TIMEZONE);

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

        // Observer
        this.showObservers = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_OBSERVERS);

        // Locations combo (filter)
        this.registrationLocationLevelIds = [LocationLevelIds.MARITIME_DISTRICT];
        this.basePortLocationLevelIds = [LocationLevelIds.PORT];

        this.updateColumns();

        // Restore filter from settings, or load all
        this.restoreFilterOrLoad();
      })
    );

    // Clear the existing activityCalendar context
    this.resetContext();
  }

  protected loadFilter(sources?: AppBaseTableFilterRestoreSource[]): any | undefined {
    const json = super.loadFilter(sources);
    if (isNil(json)) return { year: DateUtils.moment().year() - 1 };
    return json;
  }

  async setFilter(filter: Partial<ActivityCalendarFilter>, opts?: { emitEvent: boolean }) {
    filter = filter || {};

    // Convert year as number (e.g. when was a moment)
    if (isMoment(filter.year)) {
      filter.year = filter.year.year();
    } else if (isMoment(filter.startDate)) {
      filter.year = filter.startDate.year();
    } else if (isNotNil(filter.year)) {
      filter.year = toNumber(filter.year, null);
    } else {
      filter.year = null;
    }
    filter.startDate = null;
    filter.endDate = null;

    // Program
    const programLabel = filter?.program?.label;
    if (isNotNilOrBlank(programLabel)) {
      const program = await this.programRefService.loadByLabel(programLabel);
      await this.setProgram(program);
    } else {
      // Check if user can access more than one program
      const { data, total } = await this.programRefService.loadAll(
        0,
        1,
        null,
        null,
        {
          statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
          acquisitionLevelLabels: [AcquisitionLevelCodes.ACTIVITY_CALENDAR, AcquisitionLevelCodes.MONTHLY_ACTIVITY],
        },
        { withTotal: true }
      );

      if (isNotEmptyArray(data) && total === 1) {
        const program = data[0];
        await this.setProgram(program);
      } else {
        await this.resetProgram();
      }
    }
    super.setFilter(filter, opts);
  }

  protected async setProgram(program: Program) {
    if (!program?.label) throw new Error('Invalid program');
    console.debug(`${this.logPrefix}Init using program`, program);

    // I18n suffix
    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nColumnSuffix = i18nSuffix;

    this.showVesselTypeColumn = program.getPropertyAsBoolean(ProgramProperties.VESSEL_TYPE_ENABLE);
    this.showProgram = false;
    this.enableReport = program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_REPORT_ENABLE);
    const reportTypeByKey = splitByProperty((ProgramProperties.ACTIVITY_CALENDAR_REPORT_TYPES.values || []) as Property[], 'key');
    this.reportTypes = (program.getPropertyAsStrings(ProgramProperties.ACTIVITY_CALENDAR_REPORT_TYPES) || []).map((key) => reportTypeByKey[key]);
    this.canImportCsvFile = this.isAdmin || this.programRefService.hasUserManagerPrivilege(program);

    if (this.loaded) this.updateColumns();
  }

  protected async resetProgram() {
    console.debug(`${this.logPrefix}Reset filter program`);
    this.showVesselTypeColumn = toBoolean(ProgramProperties.VESSEL_TYPE_ENABLE.defaultValue, false);
    this.showProgram = true;

    this.canImportCsvFile = this.isAdmin;

    if (this.loaded) this.updateColumns();
  }

  protected countNotEmptyCriteria(filter: ActivityCalendarFilter): number {
    const yearOffset = [filter?.year, filter?.startDate, filter?.endDate].filter(isNotNil).length;
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

  async importJsonFile(event: Event): Promise<ActivityCalendar[]> {
    const data = await super.importJsonFile(event);
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

  async openReport(reportPath: string) {
    const urlParams = new URLSearchParams();
    if (this.selection.selected.length > 0) {
      const selectedIds = this.selection.selected.map((s) => s.currentData.id).toString();
      switch (reportPath) {
        case 'form':
        case 'blank-form':
        case 'progress':
          {
            urlParams.set('ids', selectedIds);
            if (reportPath !== 'progress') {
              reportPath = reportPath + 's';
            }
          }
          break;
        default:
          throw new Error(`Report type "${reportPath}" not yet implemented !`);
      }
    }
    const url = ['activity-calendar', 'report', reportPath].join('/') + '?' + urlParams.toString();
    if (url.length > 2048) {
      this.setError('ACTIVITY_CALENDAR.ERROR.MAX_SELECTED_ID');
    } else {
      return this.router.navigateByUrl(url);
    }
  }

  /* -- protected methods -- */

  protected setFilterYear(year: number) {
    if (isNil(year)) {
      this.filterYearControl.reset();
      this.setFilter({ ...this.filter, year: null, startDate: null });
    } else {
      const startDate = (this.timezone ? DateUtils.moment().tz(this.timezone) : DateUtils.moment()).year(year).startOf('year');
      this.filterForm.patchValue({ year, startDate }, { emitEvent: true });
      this.markForCheck();

      this.setFilter({ ...this.filter, year, startDate, endDate: null });
    }
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

  async importFromCsv(event?: UIEvent, format = 'csv') {
    const { data } = await FilesUtils.showUploadPopover(this.popoverController, event, {
      uniqueFile: true,
      fileExtension: '.csv',
      uploadFn: (file) =>
        this.transferService.uploadResource(file, {
          resourceType: ActivityCalendar.ENTITY_NAME,
          resourceId: Date.now().toString(),
          replace: true,
        }),
    });

    console.debug(this.logPrefix + 'CSV file uploaded! Response: ', data);
    const now = Date.now();

    const uploadedFileNames = (data || [])
      .map((file) => file.response?.body)
      .filter(isNotNil)
      .map(({ fileName }) => fileName);
    if (isNotEmptyArray(uploadedFileNames)) {
      const jobs = await Promise.all(uploadedFileNames.map((uploadedFileName) => this._dataService.importCsvFile(uploadedFileName, format)));
      console.info(this.logPrefix + `Activity calendars successfully imported, in ${Date.now() - now}ms`, jobs);
    }
  }
}
