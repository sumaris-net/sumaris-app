import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import {
  arrayDistinct,
  chainPromises,
  ConfigService,
  FilesUtils,
  HammerSwipeEvent,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotNil,
  MINIFY_ENTITY_FOR_LOCAL_STORAGE,
  PersonService,
  PersonUtils,
  ReferentialRef,
  SharedValidators,
  slideUpDownAnimation,
  splitByProperty,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { TripFilter, TripSynchroImportFilter } from '@app/trip/trip/trip.filter';
import { ScientificCruise } from '@app/trip/scientific-cruise/scientific-cruise.model';
import { BehaviorSubject, tap } from 'rxjs';
import { DataQualityStatusEnum, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import { OperationService } from '@app/trip/operation/operation.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/trip-context.service';
import { Operation, Trip } from '@app/trip/trip/trip.model';
import { environment } from '@environments/environment';
import { TRIP_FEATURE_DEFAULT_PROGRAM_FILTER } from '@app/trip/trip.config';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { LocationLevelIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import { TripTrashModal, TripTrashModalOptions } from '@app/trip/trip/trash/trip-trash.modal';
import { TripOfflineModal, TripOfflineModalOptions } from '@app/trip/trip/offline/trip-offline.modal';
import { ExtractionType } from '@app/extraction/type/extraction-type.model';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
import { OperationsMapModal, OperationsMapModalOptions } from '@app/trip/operation/map/operations-map.modal';
import { OperationEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { AppRootDataTable, AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
import { ScientificCruiseFilter } from '@app/trip/scientific-cruise/scientific-cruise.filter';
import { ScientificCruiseComparators, ScientificCruiseService } from '@app/trip/scientific-cruise/scientific-cruise.service';
import { SCIENTIFIC_CRUISE_CONFIG_OPTIONS, SCIENTIFIC_CRUISE_FEATURE_NAME } from '@app/trip/scientific-cruise/scientific-cruise.config';
import { filter } from 'rxjs/operators';
import { TableElement } from '@e-is/ngx-material-table';

export const ScientificCruiseTableSettingsEnum = {
  PAGE_ID: 'scientificCruises',
  FILTER_KEY: AppRootTableSettingsEnum.FILTER_KEY,
  FEATURE_ID: SCIENTIFIC_CRUISE_FEATURE_NAME,
};

@Component({
  selector: 'app-scientific-cruise-table',
  templateUrl: 'scientific-cruise.table.html',
  styleUrls: ['./scientific-cruise.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideUpDownAnimation],
})
export class ScientificCruiseTable extends AppRootDataTable<ScientificCruise, ScientificCruiseFilter> implements OnInit, OnDestroy {
  $title = new BehaviorSubject<string>('');
  statusList = DataQualityStatusList;
  statusById = DataQualityStatusEnum;
  qualityFlags: ReferentialRef[];
  qualityFlagsById: { [id: number]: ReferentialRef };

  @Input() showRecorder = true;
  @Input() showObservers = true;
  @Input() canDownload = false;
  @Input() canUpload = false;
  @Input() canOpenMap = false;

  get filterObserversForm(): UntypedFormArray {
    return this.filterForm.controls.observers as UntypedFormArray;
  }

  get filterDataQualityControl(): UntypedFormControl {
    return this.filterForm.controls.dataQualityStatus as UntypedFormControl;
  }

  constructor(
    injector: Injector,
    protected _dataService: ScientificCruiseService,
    protected operationService: OperationService,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected configService: ConfigService,
    protected context: ContextService,
    protected tripContext: TripContextService,
    protected formBuilder: UntypedFormBuilder,
    protected cd: ChangeDetectorRef
  ) {
    super(
      injector,
      ScientificCruise,
      ScientificCruiseFilter,
      ['quality', 'program', 'name', 'vessel', 'departureLocation', 'departureDateTime', 'returnDateTime', 'managerPerson', 'comments'],
      _dataService,
      null
    );
    this.i18nColumnPrefix = 'TRIP.TABLE.';
    this.filterForm = formBuilder.group({
      program: [null, SharedValidators.entity],
      vesselSnapshot: [null, SharedValidators.entity],
      startDate: [null, SharedValidators.validDate],
      endDate: [null, SharedValidators.validDate],
      synchronizationStatus: [null],
      recorderDepartment: [null, SharedValidators.entity],
      dataQualityStatus: [null],
      qualityFlagId: [null, SharedValidators.integer],
    });

    this.autoLoad = false; // See restoreFilterOrLoad()
    this.inlineEdition = false;
    this.defaultSortBy = 'departureDateTime';
    this.defaultSortDirection = 'desc';
    this.confirmBeforeDelete = true;
    this.canEdit = this.accountService.isUser();

    const showAdvancedFeatures = this.accountService.isAdmin();
    this.canDownload = showAdvancedFeatures;
    this.canUpload = showAdvancedFeatures;
    this.canOpenMap = showAdvancedFeatures;

    this.settingsId = ScientificCruiseTableSettingsEnum.PAGE_ID; // Fixed value, to be able to reuse it in the editor page
    this.featureName = ScientificCruiseTableSettingsEnum.FEATURE_ID;

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
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
    this.vesselSnapshotService.getAutocompleteFieldOptions().then((opts) => this.registerAutocompleteField('vesselSnapshot', opts));

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
      this.configService.config
        .pipe(
          filter(isNotNil),
          tap((config) => {
            console.info('[scientific-cruises] Init from config', config);

            const title = config && config.getProperty(SCIENTIFIC_CRUISE_CONFIG_OPTIONS.SCIENTIFIC_CRUISE_NAME);
            this.$title.next(title);

            this.showQuality = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.QUALITY_PROCESS_ENABLE);
            this.setShowColumn('quality', this.showQuality, { emitEvent: false });

            if (this.showQuality) {
              this.referentialRefService.loadQualityFlags().then((items) => {
                this.qualityFlags = items;
                this.qualityFlagsById = splitByProperty(items, 'id');
              });
            }

            this.updateColumns();

            // Restore filter from settings, or load all
            this.restoreFilterOrLoad();
          })
        )
        .subscribe()
    );

    // Clear the existing trip context
    this.resetContext();
  }

  /**
   * Action triggered when user swipes
   */
  onSwipeTab(event: HammerSwipeEvent): boolean {
    // DEBUG
    // if (this.debug) console.debug("[scientific-cruises] onSwipeTab()");

    // Skip, if not a valid swipe event
    if (!event || event.defaultPrevented || (event.srcEvent && event.srcEvent.defaultPrevented) || event.pointerType !== 'touch') {
      return false;
    }

    this.toggleSynchronizationStatus();
    return true;
  }

  protected async openRow(id: number, row: TableElement<ScientificCruise>): Promise<boolean> {
    const tripId = row.currentData.trip?.id;
    console.log('TODO open data', row.currentData);
    if (isNotNil(tripId)) {
      return this.navController.navigateForward(`trips/${id.toString()}`, {
        queryParams: {}
      });
    }
    else {
      super.openRow(id, row);
    }
  }

  async openTrashModal(event?: Event) {
    console.debug('[scientific-cruises] Opening trash modal...');
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

  async downloadSelectionAsJson(event?: Event) {
    const ids = (this.selection.selected || []).map((row) => row.currentData?.id);
    return this.downloadAsJson(ids);
  }

  async openDownloadPage(type?: ExtractionType) {
    const entities = (this.selection.selected || [])
      .map((row) => row.currentData)
      .filter(isNotNil)
      .sort(ScientificCruiseComparators.sortByDepartureDateFn);
    if (isEmptyArray(entities)) return; // Skip if empty

    const programs = arrayDistinct(
      entities.map((t) => t.program),
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
    const tripIds = entities.map((t) => t.trip?.id);
    const filter = ExtractionUtils.createTripFilter(programLabel, tripIds);
    const queryParams = ExtractionUtils.asQueryParams(type, filter);

    // Open extraction
    await this.router.navigate(['extraction', 'data'], { queryParams });
  }

  async openSelectionMap(event?: Event) {
    const entities = (this.selection.selected || [])
      .map((row) => row.currentData)
      .filter(isNotNil)
      .sort(ScientificCruiseComparators.sortByDepartureDateFn);
    if (isEmptyArray(entities)) return; // Skip if empty

    const programs = arrayDistinct(
      entities.map((t) => t.program),
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
      entities.map(
        (entity) => () =>
          this.operationService
            .loadAllByTrip(
              { tripId: entity.trip.id },
              { fetchPolicy: 'cache-first', fullLoad: false, withTotal: true /*better chance to get a cached value*/ }
            )
            .then((res) => ({ ...entity.trip, operations: res.data } as Trip))
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

  clearFilterValue(key: keyof TripFilter, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.filterForm.get(key).reset(null);
  }

  /* -- protected methods -- */

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

  protected excludeNotQualified(qualityFlag: ReferentialRef): boolean {
    return qualityFlag?.id !== QualityFlagIds.NOT_QUALIFIED;
  }
}
