import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import {
  Alerts,
  ConfigService, Configuration,
  HammerSwipeEvent,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  PersonService,
  PersonUtils,
  ReferentialRef,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  SharedValidators, slideUpDownAnimation,
  StatusIds,
  toBoolean,
  toNumber, TranslateContextService
} from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { ObservedLocation } from '../observedlocation/observed-location.model';
import { AppRootDataTable } from '@app/data/table/root-table.class';
import { OBSERVED_LOCATION_FEATURE_NAME, TRIP_CONFIG_OPTIONS } from '../trip.config';
import { environment } from '@environments/environment';
import { BehaviorSubject } from 'rxjs';
import { ObservedLocationOfflineModal } from '../observedlocation/offline/observed-location-offline.modal';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import { ObservedLocationOfflineFilter } from '../observedlocation/observed-location.filter';
import { filter, tap } from 'rxjs/operators';
import { DataQualityStatusEnum, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { ContextService } from '@app/shared/context.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { Landing } from '@app/trip/landing/landing.model';
import { LandingFilter } from '@app/trip/landing/landing.filter';
import { LandingService, LandingServiceLoadOptions, LandingServiceWatchOptions } from '@app/trip/landing/landing.service';
import { LandingEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { TableElement } from '@e-is/ngx-material-table';
import { Program } from '@app/referential/services/model/program.model';
import { ISelectProgramModalOptions, SelectProgramModal } from '@app/referential/program/select-program.modal';
import { LANDING_I18N_PMFM_PREFIX, LANDING_RESERVED_END_COLUMNS, LANDING_RESERVED_START_COLUMNS, LANDING_TABLE_DEFAULT_I18N_PREFIX } from '@app/trip/landing/landings.table';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { TripService } from '@app/trip/trip/trip.service';
import { ObservedLocationService } from '@app/trip/observedlocation/observed-location.service';
import { BaseTableConfig } from '@app/shared/table/base.table';
import { LandingValidatorService } from '@app/trip/landing/landing.validator';
import { TranslateService } from '@ngx-translate/core';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { StrategyRefFilter, StrategyRefService } from '@app/referential/services/strategy-ref.service';


export const LandingsPageSettingsEnum = {
  PAGE_ID: 'landings',
  FILTER_KEY: 'filter',
  FEATURE_NAME: OBSERVED_LOCATION_FEATURE_NAME
};

export const LANDING_PAGE_RESERVED_START_COLUMNS = ['quality', 'program', ...LANDING_RESERVED_START_COLUMNS];
export const LANDING_PAGE_RESERVED_END_COLUMNS = LANDING_RESERVED_END_COLUMNS;

export interface LandingPageConfig extends BaseTableConfig<Landing, number, LandingServiceWatchOptions> {
  reservedStartColumns?: string[];
  reservedEndColumns?: string[];
  i18nPmfmPrefix?: string;
}

@Component({
  selector: 'app-landings-page',
  templateUrl: 'landings.page.html',
  styleUrls: ['landings.page.scss'],
  animations: [slideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingsPage extends AppRootDataTable<
  Landing,
  LandingFilter,
  LandingService,
  LandingValidatorService,
  number,
  LandingPageConfig
> implements OnInit {

  protected $title = new BehaviorSubject<string>(undefined);
  protected $observedLocationTitle = new BehaviorSubject<string>(undefined);
  protected $pmfms = new BehaviorSubject<IPmfm[]>([]);
  protected locationAttributes: string[];
  protected vesselSnapshotAttributes: string[];
  protected i18nPmfmPrefix: string;
  protected statusList = DataQualityStatusList;
  protected statusById = DataQualityStatusEnum;
  protected selectedSegment = '';

  @Input() showFilterProgram = true;
  @Input() showFilterStrategy = true;
  @Input() showFilterVessel = true;
  @Input() showFilterLocation = true;
  @Input() showFilterPeriod = true;
  @Input() showFilterTagId = true;
  @Input() showQuality = true;
  @Input() showRecorder = true;
  @Input() showObservers = true;

  get filterObserversForm(): UntypedFormArray {
    return this.filterForm.controls.observers as UntypedFormArray;
  }

  get filterDataQualityControl(): UntypedFormControl {
    return this.filterForm.controls.dataQualityStatus as UntypedFormControl;
  }

  @Input()
  set showProgramColumn(value: boolean) {
    this.setShowColumn('program', value);
  }

  get showProgramColumn(): boolean {
    return this.getShowColumn('program');
  }

  @Input()
  set showVesselTypeColumn(value: boolean) {
    this.setShowColumn('vesselType', value);
  }

  get showVesselTypeColumn(): boolean {
    return this.getShowColumn('vesselType');
  }

  @Input()
  set showVesselBasePortLocationColumn(value: boolean) {
    this.setShowColumn('vesselBasePortLocation', value);
  }

  get showVesselBasePortLocationColumn(): boolean {
    return this.getShowColumn('vesselBasePortLocation');
  }


  @Input()
  set showObserversColumn(value: boolean) {
    this.setShowColumn('observers', value);
  }

  get showObserversColumn(): boolean {
    return this.getShowColumn('observers');
  }


  @Input()
  set showCreationDateColumn(value: boolean) {
    this.setShowColumn('creationDate', value);
  }

  get showCreationDateColumn(): boolean {
    return this.getShowColumn('creationDate');
  }

  @Input()
  set showRecorderPersonColumn(value: boolean) {
    this.setShowColumn('recorderPerson', value);
  }

  get showRecorderPersonColumn(): boolean {
    return this.getShowColumn('recorderPerson');
  }

  @Input()
  set showDateTimeColumn(value: boolean) {
    this.setShowColumn('dateTime', value);
  }

  get showDateTimeColumn(): boolean {
    return this.getShowColumn('dateTime');
  }

  @Input()
  set showSamplesCountColumn(value: boolean) {
    this.setShowColumn('samplesCount', value);
  }

  get showSamplesCountColumn(): boolean {
    return this.getShowColumn('samplesCount');
  }

  @Input()
  set showLocationColumn(value: boolean) {
    this.setShowColumn('location', value);
  }

  get showLocationColumn(): boolean {
    return this.getShowColumn('location');
  }

  get pmfms(): IPmfm[] {
    return this.$pmfms.value;
  }

  @Input() set pmfms(pmfms: IPmfm[]) {
    this.$pmfms.next(pmfms);
  }

  constructor(
    injector: Injector,
    protected _dataService: LandingService,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected strategyRefService: StrategyRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected observedLocationService: ObservedLocationService,
    protected tripService: TripService,
    protected translateContext: TranslateContextService,
    protected formBuilder: UntypedFormBuilder,
    protected configService: ConfigService,
    protected context: ContextService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector,
      Landing, LandingFilter,
      [...LANDING_PAGE_RESERVED_START_COLUMNS, ...LANDING_RESERVED_END_COLUMNS],
      _dataService,
      null,
      {
        reservedStartColumns:  LANDING_PAGE_RESERVED_START_COLUMNS,
        reservedEndColumns: LANDING_PAGE_RESERVED_END_COLUMNS,
        i18nColumnPrefix: LANDING_TABLE_DEFAULT_I18N_PREFIX,
        i18nPmfmPrefix: LANDING_I18N_PMFM_PREFIX,
        watchAllOptions: <LandingServiceWatchOptions>{
          computeRankOrder: false, // Not need, if id is used
          // TODO: check this
          withObservedLocation: true,
        }
      }
    );
    this.inlineEdition = false;
    this.i18nPmfmPrefix = this.options.i18nPmfmPrefix;
    this.filterForm = formBuilder.group({
      program: [null, SharedValidators.entity],
      strategy: [null, SharedValidators.entity],
      vesselSnapshot: [null, SharedValidators.entity],
      location: [null, SharedValidators.entity],
      startDate: [null, SharedValidators.validDate],
      endDate: [null, SharedValidators.validDate],
      synchronizationStatus: [null],
      recorderDepartment: [null, SharedValidators.entity],
      recorderPerson: [null, SharedValidators.entity],
      observers: formBuilder.array([[null, SharedValidators.entity]]),
      tagId: [null]
    });
    this.autoLoad = false;
    this.defaultSortBy = 'dateTime';
    this.defaultSortDirection = 'desc';

    this.settingsId = LandingsPageSettingsEnum.PAGE_ID; // Fixed value, to be able to reuse it in the editor page
    this.featureName = LandingsPageSettingsEnum.FEATURE_NAME; // Same feature as Observed locations

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }



  ngOnInit() {

    super.ngOnInit();

    // Location display attributes
    this.locationAttributes = this.settings.getFieldDisplayAttributes('location');

    // Programs combo (filter)
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: {
        acquisitionLevelLabels: [AcquisitionLevelCodes.OBSERVED_LOCATION, AcquisitionLevelCodes.LANDING],
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      },
      mobile: this.mobile
    });


    // Strategy combo (filter)
    this.registerAutocompleteField('strategy', {
      suggestFn: (value, filter) => {
        const program = this.filterForm.get('program').value;
        return this.strategyRefService.suggest(value, <StrategyRefFilter>{
          ...filter,
          levelId: program?.id
        });
      },
      attributes: ['label'],
      filter: {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      },
      mobile: this.mobile
    });

    // Combo: vessels
    this.vesselSnapshotAttributes = this.settings.getFieldDisplayAttributes('vesselSnapshot', VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES);
    this.vesselSnapshotService.getAutocompleteFieldOptions().then(opts => {
        this.registerAutocompleteField('vesselSnapshot', opts);
        this.vesselSnapshotAttributes = opts.attributes;
    });

    // Locations combo (filter)
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('location', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelIds: [LocationLevelIds.AUCTION, LocationLevelIds.PORT]
      },
      mobile: this.mobile
    });

    // Combo: recorder department
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('department', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Department'
      },
      mobile: this.mobile
    });

    // Combo: recorder person
    const personAttributes = this.settings.getFieldDisplayAttributes('person', ['lastName', 'firstName', 'department.name'])
    this.registerAutocompleteField('person', {
      service: this.personService,
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      attributes: personAttributes,
      displayWith: PersonUtils.personToString,
      mobile: this.mobile
    });

    // Combo: observers
    this.registerAutocompleteField('observers', {
      service: this.personService,
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      attributes: personAttributes,
      displayWith: PersonUtils.personToString,
      mobile: this.mobile
    });

    this.registerSubscription(
      this.configService.config
        .pipe(
          filter(isNotNil)
        )
        .subscribe(config => this.onConfigLoaded(config)));

    // Clear the context
    this.resetContext();
  }

  async setFilter(filter: Partial<LandingFilter>, opts?: { emitEvent: boolean }) {

    // Program
    const programLabel = filter?.program?.label;
    if (isNotNilOrBlank(programLabel)) {
      this.showProgramColumn = false;
      const program = await this.programRefService.loadByLabel(programLabel);
      await this.setProgram(program);
    }
    else {
      // Check if user can access more than one program
      const {data, total} = await this.programRefService.loadAll(0, 1, null, null, {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }, {withTotal: true});
      if (isNotEmptyArray(data) && total === 1) {
        const program = data[0];
        this.showProgramColumn = false;
        await this.setProgram(program);
      }
      else {
        this.showProgramColumn = true;
        this.$title.next(this.i18nColumnPrefix + 'TITLE');
      }
    }

    super.setFilter(filter, opts);
  }

  /* -- protected function -- */

  protected async onConfigLoaded(config: Configuration) {
    console.info('[landings] Init using config', config);

    // title
    const observedLocationTitle = config.getProperty(TRIP_CONFIG_OPTIONS.OBSERVED_LOCATION_NAME)
    this.$observedLocationTitle.next(observedLocationTitle);

    // Quality
    this.showQuality = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.QUALITY_PROCESS_ENABLE);
    this.setShowColumn('quality', this.showQuality, {emitEvent: false});

    // Recorder
    this.showRecorder = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_RECORDER);
    this.setShowColumn('recorderPerson', this.showRecorder, {emitEvent: false});

    // Observer
    this.showObservers = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_OBSERVERS);
    this.setShowColumn('observers', this.showObservers, {emitEvent: false});

    // Manage filters display according to config settings.
    this.showFilterProgram = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_FILTER_PROGRAM);
    this.showFilterLocation = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_FILTER_LOCATION);
    this.showFilterPeriod = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_FILTER_PERIOD);

    // Restore filter from settings, or load all
    await this.restoreFilterOrLoad();

    this.updateColumns();
  }


  protected async setProgram(program: Program) {
    console.debug('[landings] Init using program', program);

    // I18n suffix
    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nColumnSuffix = i18nSuffix;

    // Title
    const title = this.translateContext.instant(this.i18nColumnPrefix + 'TITLE', this.i18nColumnSuffix);
    this.$title.next(title);

    this.showVesselTypeColumn = program.getPropertyAsBoolean(ProgramProperties.VESSEL_TYPE_ENABLE);
    this.showVesselBasePortLocationColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_VESSEL_BASE_PORT_LOCATION_ENABLE);
    this.showObserversColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_OBSERVERS_ENABLE);
    this.showCreationDateColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_CREATION_DATE_ENABLE);
    this.showRecorderPersonColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_RECORDER_PERSON_ENABLE);
    this.showLocationColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_LOCATION_ENABLE);
    this.showSamplesCountColumn = program.getPropertyAsBoolean(ProgramProperties.LANDING_SAMPLES_COUNT_ENABLE);

    const includedPmfmIds = program.getPropertyAsNumbers(ProgramProperties.LANDING_COLUMNS_PMFM_IDS);
    const pmfms = await this.programRefService.loadProgramPmfms(program?.label, {
      acquisitionLevel: AcquisitionLevelCodes.LANDING
      // TODO add filter date ?
    });
    const columnPmfms = pmfms.filter(p => p.required || includedPmfmIds?.includes(p.id))

    this.$pmfms.next(columnPmfms);
  }

  protected async restoreFilterOrLoad(opts?: { emitEvent?: boolean }): Promise<void> {
    // Load by observed location
    const observedLocationId = this.route.snapshot.paramMap.get('observedLocationId');
    if (isNotNilOrNaN(observedLocationId)) {
      const observedLocation = await this.observedLocationService.load(+observedLocationId);
      await this.setFilter(<Partial<LandingFilter>>{observedLocationId: +observedLocationId, program: observedLocation.program}, {emitEvent: true, ...opts});
      return;
    }

    // Load by trip
    const tripId = this.route.snapshot.paramMap.get('tripId');
    if (isNotNilOrNaN(tripId)) {
      const trip = await this.tripService.load(+tripId);
      await this.setFilter(<Partial<LandingFilter>>{tripId: +tripId, program: trip.program}, {emitEvent: true, ...opts});
      return;
    }

    // Reload last filter
    return super.restoreFilterOrLoad(opts);
  }

  protected getDisplayColumns(): string[] {
    const pmfms = this.pmfms;
    if (!pmfms) return this.columns;

    const userColumns = this.getUserColumns();

    const pmfmColumnNames = pmfms
      //.filter(p => p.isMandatory || !userColumns || userColumns.includes(p.pmfmId.toString()))
      .filter(p => !p.hidden)
      .map(p => p.id.toString());

    const startColumns = (this.options && this.options.reservedStartColumns || []).filter(c => !userColumns || userColumns.includes(c));
    const endColumns = (this.options && this.options.reservedEndColumns || []).filter(c => !userColumns || userColumns.includes(c));

    return RESERVED_START_COLUMNS
      .concat(startColumns)
      .concat(pmfmColumnNames)
      .concat(endColumns)
      .concat(RESERVED_END_COLUMNS)
      // Remove columns to hide
      .filter(column => !this.excludesColumns.includes(column));

    // DEBUG
    //console.debug("[measurement-table] Updating columns: ", this.displayedColumns)
    //if (!this.loading) this.markForCheck();
  }

  protected onSegmentChanged(event: CustomEvent) {
    const path = event.detail.value;
    if (isNilOrBlank(path)) return; // Skip if no path

    // TODO: save filter in context ?

    setTimeout(async () => {
      await this.navController.navigateRoot(path);

      // Reset the selected segment
      this.selectedSegment = '';
      this.markAsLoaded();
    }, 200);
  }

  /**
   * Action triggered when user swipes
   */
  protected onSwipeTab(event: HammerSwipeEvent): boolean {
    // DEBUG
    // if (this.debug) console.debug("[observed-locations] onSwipeTab()");

    // Skip, if not a valid swipe event
    if (!event
      || event.defaultPrevented || (event.srcEvent && event.srcEvent.defaultPrevented)
      || event.pointerType !== 'touch'
    ) {
      return false;
    }

    this.toggleSynchronizationStatus();
    return true;
  }


  protected async openRow(id: number, row: TableElement<Landing>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onOpenRow.observers.length) {
      this.onOpenRow.emit(row);
      return true;
    }

    const data = Landing.fromObject(row.currentData);

    // Get the detail editor
    const detailEditor = await this.getDetailEditor(data);

    if (!detailEditor) return false; // User cancelled

    return await this.router.navigate([detailEditor, id], {
      relativeTo: this.route,
      queryParams: {}
    });
  }


  protected async openNewRowDetail(event?: any): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onNewRow.observers.length) {
      this.onNewRow.emit(event);
      return true;
    }

    // Get the detail editor
    const detailEditor = await this.getDetailEditor();

    if (!detailEditor) return false; // User cancelled

    return await this.router.navigate([detailEditor, 'new'], {
      relativeTo: this.route
    });
  }

  async openTrashModal(event?: Event) {
    console.debug('[observed-locations] Opening trash modal...');
    // TODO BLA
    /*const modal = await this.modalCtrl.create({
      component: TripTrashModal,
      componentProps: {
        synchronizationStatus: this.filter.synchronizationStatus
      },
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const res = await modal.onDidDismiss();
    if (!res) return; // CANCELLED*/
  }

  async prepareOfflineMode(event?: Event, opts?: {
    toggleToOfflineMode?: boolean;
    showToast?: boolean;
    filter?: any;
  }): Promise<undefined | boolean> {
    if (this.importing) return; // Skip

    if (event) {
      const feature = this.settings.getOfflineFeature(this.featureName) || {
        name: this.featureName
      };
      const value = <ObservedLocationOfflineFilter>{
        ...this.filter,
        ...feature.filter
      };
      const modal = await this.modalCtrl.create({
        component: ObservedLocationOfflineModal,
        componentProps: {
          value
        }, keyboardClose: true
      });

      // Open the modal
      modal.present();

      // Wait until closed
      const { data, role } = await modal.onDidDismiss();

      if (!data || role === 'cancel') return; // User cancelled

      // Update feature filter, and save it into settings
      feature.filter = data;
      this.settings.saveOfflineFeature(feature);

      // DEBUG
      console.debug('[observed-location-table] Will prepare offline mode, using filter:', feature.filter);
    }

    return super.prepareOfflineMode(event, opts);
  }

  async deleteSelection(event: Event, opts?: {interactive?: boolean}): Promise<number> {
    const rowsToDelete = this.selection.selected;

    const landingIds = (rowsToDelete || [])
      .map(row => row.currentData as Landing)
      .map(ObservedLocation.fromObject)
      .map(o => o.id);

    // ask confirmation if one landing has samples (with tagId)
    if (isNotEmptyArray(landingIds) && (!opts || opts.interactive !== false)) {
      const hasSample = await this._dataService.hasSampleWithTagId(landingIds);
      if (hasSample) {
        const messageKey = landingIds.length === 1
          ? 'OBSERVED_LOCATION.LANDING.CONFIRM.DELETE_ONE_HAS_SAMPLE'
          : 'OBSERVED_LOCATION.LANDING.CONFIRM.DELETE_MANY_HAS_SAMPLE';
        const confirmed = await Alerts.askConfirmation(messageKey, this.alertCtrl, this.translate, event);
        if (!confirmed) return; // skip
      }
    }

    // Use inherited function, when no sample
    return super.deleteSelection(event, {interactive: false /*already confirmed*/});
  }

  get canUserCancelOrDelete(): boolean {
    // IMAGINE-632: User can only delete landings or samples created by himself or on which he is defined as observer

    // Cannot delete if not connected
    if (!this.accountService.isLogin() || this.selection.isEmpty()) {
      return false;
    }

    // When connected user is an admin
    if (this.accountService.isAdmin()) {
      return true;
    }

    const user = this.accountService.person;

    // Find a row that user CANNOT delete
    const invalidRow = this.selection.selected
      .find(row => {
        const entity = row.currentData;

        // When observed location has been recorded by connected user
        if (user.id === entity?.recorderPerson?.id) {
          return false; // OK
        }

        // When connected user is in observed location observers
        return !(entity.observers || []).some(observer => (user.id === observer?.id));
      });

    //
    return !invalidRow;
  }

  /**
   * Use in ngFor, for trackBy
   * @param index
   * @param pmfm
   */
  trackPmfmFn(index: number, pmfm: IPmfm): any {
    return toNumber(pmfm?.id, index);
  }

  /* -- protected methods -- */

  protected async getDetailEditor(source?: Landing): Promise<LandingEditor> {
    // Find data program
    let programLabel = source?.program?.label || this.filter?.program?.label;
    let program: Program = programLabel && (await this.programRefService.loadByLabel(programLabel));

    // If no data (e.g. new landing): ask user a program
    if (!program) {
      const modal = await this.modalCtrl.create({
        component: SelectProgramModal,
        componentProps: <ISelectProgramModalOptions>{
          filter: {
            statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
            acquisitionLevelLabels: [AcquisitionLevelCodes.LANDING]
          }
        },
        keyboardClose: true,
        cssClass: 'modal-large'
      });
      await modal.present();
      const {data} = await modal.onDidDismiss();
      if (!(data instanceof Program)) return; // User cancelled

      program = data;
    }

    const editor = program.getProperty<LandingEditor>(ProgramProperties.LANDING_EDITOR);

    return editor;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected resetContext() {
    this.context.reset();
  }
}
