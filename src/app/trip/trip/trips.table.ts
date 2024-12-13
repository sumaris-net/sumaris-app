import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { TripComparators, TripService } from './trip.service';
import { TripFilter, TripSynchroImportFilter } from './trip.filter';
import { UntypedFormArray, UntypedFormBuilder } from '@angular/forms';
import {
  AppTableUtils,
  arrayDistinct,
  chainPromises,
  ConfigService,
  Configuration,
  FilesUtils,
  HammerSwipeEvent,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  MINIFY_ENTITY_FOR_LOCAL_STORAGE,
  PersonService,
  PersonUtils,
  Property,
  ReferentialRef,
  SharedValidators,
  slideUpDownAnimation,
  splitByProperty,
  StatusIds,
  toBoolean,
} from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Operation, Trip } from './trip.model';
import { LocationLevelIds } from '@app/referential/services/model/model.enum';
import { TripTrashModal, TripTrashModalOptions } from './trash/trip-trash.modal';
import { TRIP_CONFIG_OPTIONS, TRIP_FEATURE_DEFAULT_PROGRAM_FILTER, TRIP_FEATURE_NAME } from '../trip.config';
import { AppRootDataTable, AppRootDataTableState, AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import { filter } from 'rxjs/operators';
import { TripOfflineModal, TripOfflineModalOptions } from '@app/trip/trip/offline/trip-offline.modal';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/trip-context.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { OperationService } from '@app/trip/operation/operation.service';
import { OperationsMapModal, OperationsMapModalOptions } from '@app/trip/operation/map/operations-map.modal';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
import { ExtractionType } from '@app/extraction/type/extraction-type.model';
import { OperationEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { RxState } from '@rx-angular/state';
import { Program } from '@app/referential/services/model/program.model';
import { intersectArrays } from '@app/shared/functions';
import { BASE_TABLE_SETTINGS_ENUM } from '@app/shared/table/base.table';

export const TripsPageSettingsEnum = {
  PAGE_ID: 'trips',
  FILTER_KEY: AppRootTableSettingsEnum.FILTER_KEY,
  FEATURE_ID: TRIP_FEATURE_NAME,
};

export interface TripTableState extends AppRootDataTableState {}

@Component({
  selector: 'app-trips-table',
  templateUrl: 'trips.table.html',
  styleUrls: ['./trips.table.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideUpDownAnimation],
})
export class TripTable extends AppRootDataTable<Trip, TripFilter, TripService, any, number, TripTableState> implements OnInit, OnDestroy {
  protected programVesselTypeIds: number[];

  @Input() showFilterProgram = true;
  @Input() showRecorder = true;
  @Input() showObservers = true;
  @Input() canDownload = false;
  @Input() canUpload = false;
  @Input() canOpenMap = false;
  @Input() cardViewSortableColumns: string[] = ['departureDateTime', 'returnDateTime'];

  get filterObserversForm(): UntypedFormArray {
    return this.filterForm.controls.observers as UntypedFormArray;
  }

  @Input()
  set showProgramColumn(value: boolean) {
    this.setShowColumn('program', value);
  }

  get showProgramColumn(): boolean {
    return this.getShowColumn('program');
  }

  constructor(
    injector: Injector,
    _dataService: TripService,
    protected operationService: OperationService,
    protected personService: PersonService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected configService: ConfigService,
    protected context: ContextService,
    protected tripContext: TripContextService,
    protected formBuilder: UntypedFormBuilder
  ) {
    super(
      injector,
      Trip,
      TripFilter,
      ['quality', 'program', 'vessel', 'departureLocation', 'departureDateTime', 'returnDateTime', 'observers', 'recorderPerson', 'comments'],
      _dataService,
      null
    );
    this.i18nColumnPrefix = 'TRIP.TABLE.';
    this.filterForm = formBuilder.group({
      program: [null, SharedValidators.entity],
      vesselSnapshot: [null, SharedValidators.entity],
      location: [null, SharedValidators.entity],
      startDate: [null, SharedValidators.validDate],
      endDate: [null, SharedValidators.validDate],
      synchronizationStatus: [null],
      recorderDepartment: [null, SharedValidators.entity],
      recorderPerson: [null, SharedValidators.entity],
      observers: formBuilder.array([[null, SharedValidators.entity]]),
      dataQualityStatus: [null],
      qualityFlagId: [null, SharedValidators.integer],
      hasScientificCruise: [null],
      hasObservedLocation: [null],
    });

    this.autoLoad = false; // See restoreFilterOrLoad()
    this.inlineEdition = false;
    this.defaultSortBy = 'departureDateTime';
    this.defaultSortDirection = 'desc';
    this.confirmBeforeDelete = true;
    this.canEdit = this.accountService.isUser();
    this.showToolbar = true;

    const showAdvancedFeatures = this.accountService.isAdmin();
    this.canDownload = showAdvancedFeatures;
    this.canUpload = showAdvancedFeatures;
    this.canOpenMap = showAdvancedFeatures;

    this.settingsId = TripsPageSettingsEnum.PAGE_ID; // Fixed value, to be able to reuse it in the editor page
    this.featureName = TripsPageSettingsEnum.FEATURE_ID;

    // FOR DEV ONLY ----
    //this.debug = !environment.production;
    this.logPrefix = '[trips-table] ';
  }

  ngOnInit() {
    // Init defaults
    this.defaultCardView = this.mobile && !this.platformService.is('tablet');

    super.ngOnInit();

    // Programs combo (filter)
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: TRIP_FEATURE_DEFAULT_PROGRAM_FILTER,
      mobile: this.mobile,
    });

    // Locations combo (filter)
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('location', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelId: LocationLevelIds.PORT,
      },
      mobile: this.mobile,
    });

    // Combo: vessels
    this.vesselSnapshotService.getAutocompleteFieldOptions().then((opts) => {
      this.registerAutocompleteField('vesselSnapshot', {
        ...opts,
        suggestFn: (value, filter) => this.suggestVessels(value, filter),
      });
    });

    // Combo: Vessel type
    this.registerAutocompleteField('vesselType', {
      attributes: ['name'],
      service: this.referentialRefService,
      filter: {
        entityName: 'VesselType',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      },
      mobile: this.mobile,
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, { ...filter, includedIds: this.programVesselTypeIds }),
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

    this.registerSubscription(this.configService.config.pipe(filter(isNotNil)).subscribe((config) => this.onConfigLoaded(config)));

    // Clear the existing trip context
    this.resetContext();

    // Restore card view
    this.restoreCardView();
  }

  /**
   * Action triggered when user swipes
   */
  onSwipeTab(event: HammerSwipeEvent): boolean {
    // DEBUG
    // if (this.debug) console.debug("[trips] onSwipeTab()");

    // Skip, if not a valid swipe event
    if (!event || event.defaultPrevented || (event.srcEvent && event.srcEvent.defaultPrevented) || event.pointerType !== 'touch') {
      return false;
    }

    this.toggleSynchronizationStatus();
    return true;
  }

  setCardView(enable: boolean, opts?: { skipSaveSettings?: boolean }) {
    if (this.cardView === enable) return; // Skip if unchanged
    this.cardView = enable;
    this.updateColumns();

    // Refresh table
    if (this.loaded) {
      this.table?.renderRows();
    }

    // By default, sort on defaults
    if (enable) {
      this.sort.sort({ id: this.defaultSortBy, start: AppTableUtils.inverseDirection(this.defaultSortDirection || 'desc'), disableClear: false });
    }

    // Save to local settings
    if (opts?.skipSaveSettings !== true) {
      this.savePageSettings(enable, BASE_TABLE_SETTINGS_ENUM.CARD_VIEWS_KEY);
    }
  }

  async openTrashModal(event?: Event) {
    console.debug('[trips] Opening trash modal...');
    const modalOptions: TripTrashModalOptions = {
      synchronizationStatus: (this.filter && this.filter.synchronizationStatus) || 'SYNC',
    };
    const modal = await this.modalCtrl.create({
      component: TripTrashModal,
      componentProps: modalOptions,
      keyboardClose: true,
      cssClass: 'modal-large',
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const { data, role } = await modal.onDidDismiss();
    if (role === 'cancel' || isEmptyArray(data)) return; // CANCELLED

    // Select the local trips tab
    this.setSynchronizationStatus('DIRTY');

    // If only one restored: open it
    const trip = data?.length === 1 && data[0];
    if (isNotNil(trip.id)) {
      await this.navController.navigateForward([trip.id], {
        relativeTo: this.route,
      });
    }
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

    const feature = this.settings.getOfflineFeature(this._dataService.featureName) || {
      name: this._dataService.featureName,
    };
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const filter = this.asFilter(this.filterForm.value);
    const synchroFilter = <TripSynchroImportFilter>{
      vesselId: filter.vesselId || (filter.vesselSnapshot && filter.vesselSnapshot.id) || undefined,
      programLabel: (filter.program && filter.program.label) || undefined,
      ...feature.filter,
    };

    // Open offline, if missing program or vesselId
    if (event || isNilOrBlank(synchroFilter?.programLabel) || isNil(synchroFilter?.vesselId)) {
      const modal = await this.modalCtrl.create({
        component: TripOfflineModal,
        componentProps: <TripOfflineModalOptions>{
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
      feature.filter = TripSynchroImportFilter.fromObject(data).asObject();
      this.settings.saveOfflineFeature(feature);

      // DEBUG
      console.debug('[trip-table] Will prepare offline mode, using filter:', feature.filter);
    } else {
      // Saving feature's filter, to order to use it in TripService.runImport()
      feature.filter = TripSynchroImportFilter.fromObject(synchroFilter).asObject();
      this.settings.saveOfflineFeature(feature);
    }

    return super.prepareOfflineMode(event, opts);
  }

  async importJsonFile(event: Event): Promise<Trip[]> {
    const data = await super.importJsonFile(event);
    if (isEmptyArray(data)) return; // Skip

    const entities: Trip[] = [];
    const errors = [];
    for (const json of data) {
      try {
        const entity = Trip.fromObject(json);
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
        message: 'TRIP.TABLE.ERROR.IMPORT_FILE_FAILED',
        messageParams: { error: errors.join('\n') },
      });
    } else if (isNotEmptyArray(errors)) {
      await this.showToast({
        type: 'warning',
        message: 'TRIP.TABLE.INFO.IMPORT_FILE_SUCCEED_WITH_ERRORS',
        messageParams: { inserts: entities.length, errors: errors.length },
      });
    } else {
      await this.showToast({
        type: 'info',
        message: 'TRIP.TABLE.INFO.IMPORT_FILE_SUCCEED',
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
    const trips = (this.selection.selected || [])
      .map((row) => row.currentData)
      .filter(isNotNil)
      .sort(TripComparators.sortByDepartureDateFn);
    if (isEmptyArray(trips)) return; // Skip if empty

    const programs = arrayDistinct(
      trips.map((t) => t.program),
      'label'
    );
    if (programs.length !== 1) {
      this.showToast({
        type: 'warning',
        message: 'TRIP.TABLE.WARNING.NEED_ONE_PROGRAM',
      });
      return; // Skip if no program
    }

    // Clear selection
    this.selection.clear();
    this.markForCheck();

    // Create extraction type and filter
    type = type || ExtractionType.fromLiveLabel('PMFM_TRIP');
    const programLabel = programs[0].label;
    const tripIds = trips.map((t) => t.id);
    const filter = ExtractionUtils.createTripFilter(programLabel, tripIds);
    const queryParams = ExtractionUtils.asQueryParams(type, filter);

    // Open extraction
    await this.router.navigate(['extraction', 'data'], { queryParams });
  }

  async openSelectionMap(event?: Event) {
    const trips = (this.selection.selected || [])
      .map((row) => row.currentData)
      .filter(isNotNil)
      .sort(TripComparators.sortByDepartureDateFn);
    if (isEmptyArray(trips)) return; // Skip if empty

    const programs = arrayDistinct(
      trips.map((t) => t.program),
      'label'
    );
    if (programs.length !== 1) {
      this.showToast({
        type: 'warning',
        message: 'TRIP.TABLE.WARNING.NEED_ONE_PROGRAM',
      });
      return; // Skip if no program
    }
    const programLabel = programs[0].label;

    const operations = await chainPromises(
      trips.map(
        (trip) => () =>
          this.operationService
            .loadAllByTrip(
              { tripId: trip.id },
              { fetchPolicy: 'cache-first', fullLoad: false, withTotal: true /*better chance to get a cached value*/ }
            )
            .then((res) => ({ ...trip, operations: res.data }) as Trip)
      )
    );

    const modal = await this.modalCtrl.create({
      component: OperationsMapModal,
      componentProps: <OperationsMapModalOptions>{
        data: operations,
        programLabel,
        latLongPattern: this.settings.latLongFormat,
      },
      keyboardClose: true,
      cssClass: 'modal-large',
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const { data } = await modal.onDidDismiss();
    if (data instanceof Operation) {
      console.info('[trips-table] User select an operation from the map:', data);

      this.selection.clear();
      this.markForCheck();

      //Full load the program
      const program = await this.programRefService.loadByLabel(programLabel);

      // Build the final path
      const operationEditor = program.getProperty<OperationEditor>(ProgramProperties.TRIP_OPERATION_EDITOR);
      const editorPath = operationEditor !== 'legacy' ? [operationEditor] : [];
      await this.router.navigate(['trips', data.tripId, 'operation', ...editorPath, data.id]);

      return;
    }
  }

  /* -- protected methods -- */

  protected async onConfigLoaded(config: Configuration) {
    console.info(`${this.logPrefix}Init using config`, config);

    this.title = config.getProperty(TRIP_CONFIG_OPTIONS.TRIP_NAME);

    this.showQuality = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.QUALITY_PROCESS_ENABLE);
    // Allow show status column - (see issue #816)
    //this.setShowColumn('quality', this.showQuality, { emitEvent: false });

    // Load quality flags
    if (this.showQuality) this.loadQualityFlags();

    // Recorder
    this.showRecorder = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_RECORDER);
    this.setShowColumn('recorderPerson', this.showRecorder, { emitEvent: false });

    // Observers
    this.showObservers = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_OBSERVERS);
    this.setShowColumn('observers', this.showObservers, { emitEvent: false });

    // Program filter / column
    this.defaultShowFilterProgram = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_FILTER_PROGRAM);

    // Restore filter from settings, or load all
    if (this.enabled) await this.restoreFilterOrLoad();

    this.updateColumns();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected resetContext() {
    // Consume all context data, to avoid reusing it somewhere
    // We should do that at each menu entry point
    this.context.reset();
    this.tripContext.reset();
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
      filename: this.translate.instant('TRIP.TABLE.DOWNLOAD_JSON_FILENAME'),
      type: 'application/json',
    });
  }

  protected async setProgram(program: Program) {
    await super.setProgram(program);

    // Allow to filter on program, if user can access more than one program
    this.showFilterProgram = this.defaultShowFilterProgram && (this.isAdmin || !this.filter?.program?.label);

    // Hide program if cannot change it
    this.showProgramColumn = this.showFilterProgram;
    this.programVesselTypeIds = program.getPropertyAsNumbers(ProgramProperties.VESSEL_FILTER_DEFAULT_TYPE_IDS);

    this.enableReport = program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_ENABLE);
    const reportTypeByKey = splitByProperty((ProgramProperties.TRIP_REPORT_TYPES.values || []) as Property[], 'key');
    this.reportTypes = (program.getPropertyAsStrings(ProgramProperties.TRIP_REPORT_TYPES) || []).map((key) => reportTypeByKey[key]);

    this.markForCheck();
  }

  protected async resetProgram() {
    await super.resetProgram();

    this.showFilterProgram = this.defaultShowFilterProgram;
    this.showProgramColumn = this.defaultShowFilterProgram;
    this.programVesselTypeIds = null;

    this.enableReport = toBoolean(ProgramProperties.TRIP_REPORT_ENABLE.defaultValue, false);
    const reportTypeByKey = splitByProperty((ProgramProperties.TRIP_REPORT_TYPES.values || []) as Property[], 'key');
    this.reportTypes = (ProgramProperties.TRIP_REPORT_TYPES.defaultValue || '').split(',').map((key) => reportTypeByKey[key]);

    this.markForCheck();
  }

  protected suggestVessels(value: any, filter?: any): Promise<LoadResult<VesselSnapshot>> {
    const vesselTypeId = this.filterForm.get('vesselType')?.value?.id;
    let vesselTypeIds = isNotNil(vesselTypeId) ? [vesselTypeId] : undefined;
    if (isNotEmptyArray(this.programVesselTypeIds)) {
      vesselTypeIds = intersectArrays([vesselTypeIds, this.programVesselTypeIds]);
    }

    return this.vesselSnapshotService.suggest(value, {
      vesselTypeIds,
      ...filter,
    });
  }
}
