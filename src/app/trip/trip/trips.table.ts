import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { TripValidatorService } from '../services/validator/trip.validator';
import { TripComparators, TripService } from '../services/trip.service';
import { TripFilter, TripSynchroImportFilter } from '../services/filter/trip.filter';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import {
  arrayDistinct,
  chainPromises,
  ConfigService,
  FilesUtils,
  HammerSwipeEvent,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  MINIFY_ENTITY_FOR_LOCAL_STORAGE,
  PersonService,
  PersonUtils,
  ReferentialRef,
  SharedValidators,
  slideUpDownAnimation,
  StatusIds
} from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Operation, Trip } from '../services/model/trip.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { TripTrashModal, TripTrashModalOptions } from './trash/trip-trash.modal';
import { TRIP_CONFIG_OPTIONS, TRIP_FEATURE_NAME } from '../services/config/trip.config';
import { AppRootDataTable, AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
import { environment } from '@environments/environment';
import { DATA_CONFIG_OPTIONS } from '@app/data/services/config/data.config';
import { filter, tap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { TripOfflineModal, TripOfflineModalOptions } from '@app/trip/trip/offline/trip-offline.modal';
import { DataQualityStatusEnum, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { OperationService } from '@app/trip/services/operation.service';
import { OperationsMapModal, OperationsMapModalOptions } from '@app/trip/operation/map/operations-map.modal';

export const TripsPageSettingsEnum = {
  PAGE_ID: "trips",
  FILTER_KEY: AppRootTableSettingsEnum.FILTER_KEY,
  FEATURE_ID: TRIP_FEATURE_NAME
};

@Component({
  selector: 'app-trips-table',
  templateUrl: 'trips.table.html',
  styleUrls: ['./trips.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: TripValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideUpDownAnimation]
})
export class TripTable extends AppRootDataTable<Trip, TripFilter> implements OnInit, OnDestroy {

  $title = new BehaviorSubject<string>('');
  statusList = DataQualityStatusList;
  statusById = DataQualityStatusEnum;

  @Input() showQuality = true;
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
    protected _dataService: TripService,
    protected operationService: OperationService,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected configService: ConfigService,
    protected context: ContextService,
    protected tripContext: TripContextService,
    protected formBuilder: UntypedFormBuilder,
    protected cd: ChangeDetectorRef
  ) {

    super(injector,
      Trip, TripFilter,
      ['quality',
      'program',
      'vessel',
      'departureLocation',
      'departureDateTime',
      'returnDateTime',
      'observers',
      'recorderPerson',
      'comments'],
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
      dataQualityStatus: [null]
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

    this.settingsId = TripsPageSettingsEnum.PAGE_ID; // Fixed value, to be able to reuse it in the editor page
    this.featureId = TripsPageSettingsEnum.FEATURE_ID;

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Programs combo (filter)
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        acquisitionLevelLabels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION, AcquisitionLevelCodes.CHILD_OPERATION]
      },
      mobile: this.mobile
    });

    // Locations combo (filter)
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('location', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelId: LocationLevelIds.PORT
      },
      mobile: this.mobile
    });

    // Combo: vessels
    this.vesselSnapshotService.getAutocompleteFieldOptions().then(opts =>
      this.registerAutocompleteField('vesselSnapshot', opts)
    );

    // Combo: recorder department
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('department', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Department'
      },
      mobile: this.mobile
    });

    // Combo: recorder person
    const personAttributes = this.settings.getFieldDisplayAttributes('person', ['lastName', 'firstName', 'department.name']);
    this.registerAutocompleteField('person', {
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
          filter(isNotNil),
          tap(config => {
            console.info('[trips] Init from config', config);

            const title = config && config.getProperty(TRIP_CONFIG_OPTIONS.TRIP_NAME);
            this.$title.next(title);

            this.showQuality = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.QUALITY_PROCESS_ENABLE);
            this.setShowColumn('quality', this.showQuality, {emitEvent: false});

            // Recorder
            this.showRecorder = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_RECORDER);
            this.setShowColumn('recorderPerson', this.showRecorder, {emitEvent: false});

            // Observers
            this.showObservers = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_OBSERVERS);
            this.setShowColumn('observers', this.showObservers, {emitEvent: false});

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
    // if (this.debug) console.debug("[trips] onSwipeTab()");

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

  async openTrashModal(event?: Event) {
    console.debug('[trips] Opening trash modal...');
    const modalOptions: TripTrashModalOptions = {
      synchronizationStatus: this.filter && this.filter.synchronizationStatus || 'SYNC'
    };
    const modal = await this.modalCtrl.create({
      component: TripTrashModal,
      componentProps: modalOptions,
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const res = await modal.onDidDismiss();
    if (!res) return; // CANCELLED
  }

  async prepareOfflineMode(event?: Event, opts?: {
    toggleToOfflineMode?: boolean;
    showToast?: boolean;
    filter?: any;
  }): Promise<undefined | boolean> {
    if (this.importing) return; // Skip

    if (event) {
      const feature = this.settings.getOfflineFeature(this._dataService.featureName) || {
        name: this._dataService.featureName
      };
      const filter = this.asFilter(this.filterForm.value);
      const value = <TripSynchroImportFilter>{
        vesselId: filter.vesselId || filter.vesselSnapshot && filter.vesselSnapshot.id || undefined,
        programLabel: filter.program && filter.program.label || undefined,
        ...feature.filter
      };
      const modal = await this.modalCtrl.create({
        component: TripOfflineModal,
        componentProps: <TripOfflineModalOptions>{
          value
        }, keyboardClose: true
      });

      // Open the modal
      modal.present();

      // Wait until closed
      const res = await modal.onDidDismiss();
      if (!res || !res.data) return; // User cancelled

      // Update feature filter, and save it into settings
      feature.filter = res && res.data;
      this.settings.saveOfflineFeature(feature);

      // DEBUG
      console.debug('[trip-table] Will prepare offline mode, using filter:', feature.filter);
    }

    return super.prepareOfflineMode(event, opts);
  }

  async importFromFile(event: Event): Promise<Trip[]> {
    const data = await super.importFromFile(event);
    if (isEmptyArray(data)) return; // Skip

    let entities: Trip[] = [];
    let errors = [];
    for (let json of data) {
      try {
        const entity = Trip.fromObject(json);
        const savedEntity = await this._dataService.copyLocally(entity);
        entities.push(savedEntity);
      } catch (err) {
        const message = err && err.message || err;
        errors.push(message);
        console.error(message, err);
      }
    }
    if (isEmptyArray(entities) && isEmptyArray(errors)) {
      // Nothing to import (empty file ?)
      return;
    }
    else if (isEmptyArray(entities) && isNotEmptyArray(errors)) {
      await this.showToast({
        type: 'error',
        message: 'TRIP.TABLE.ERROR.IMPORT_FILE_FAILED', messageParams: {error: errors.join('\n')}});
    }
    else if (isNotEmptyArray(errors)) {
      await this.showToast({
        type: 'warning',
        message: 'TRIP.TABLE.INFO.IMPORT_FILE_SUCCEED_WITH_ERRORS', messageParams: {inserts: entities.length, errors: errors.length}});
    }
    else {
      await this.showToast({
        type: 'info',
        message: 'TRIP.TABLE.INFO.IMPORT_FILE_SUCCEED', messageParams: {inserts: entities.length}});
    }
    return entities;
  }

  async downloadSelectionAsJson(event?: Event) {
    const ids = (this.selection.selected || [])
      .map(row => row.currentData?.id);
    return this.downloadAsJson(ids);
  }

  async openDownloadPage(event?: Event) {
    const trips = (this.selection.selected || [])
      .map(row => row.currentData).filter(isNotNil)
      .sort(TripComparators.sortByDepartureDateFn);
    if (isEmptyArray(trips)) return // Skip if empty

    const programs = arrayDistinct(trips.map(t => t.program), 'label');
    if (programs.length == 1) {
      this.showToast({
        type: 'warning',
        message: 'TRIP.TABLE.WARNING.NEED_ONE_PROGRAM'
      });
      return; // Skip if no program
    }
    const programLabel = programs[0].label;

  }

  async openSelectionMap(event?: Event) {
    const trips = (this.selection.selected || [])
      .map(row => row.currentData).filter(isNotNil)
      .sort(TripComparators.sortByDepartureDateFn);
    if (isEmptyArray(trips)) return // Skip if empty

    const programs = arrayDistinct(trips.map(t => t.program), 'label');
    if (programs.length > 1) {
      this.showToast({
        type: 'warning',
        message: 'TRIP.TABLE.WARNING.NEED_ONE_PROGRAM'
      });
      return; // Skip if no program
    }
    const programLabel = programs[0].label;


    const operations = await chainPromises(trips.map(
      trip => () =>
        this.operationService.loadAllByTrip({tripId: trip.id},{fetchPolicy: 'cache-first', fullLoad: false, withTotal: true/*better chance to get a cached value*/})
          .then(res => ({...trip, operations: res.data} as Trip))
      ));

    const modal = await this.modalCtrl.create({
      component: OperationsMapModal,
      componentProps: <OperationsMapModalOptions>{
        data: operations,
        programLabel,
        latLongPattern: this.settings.latLongFormat
      },
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();
    if (data instanceof Operation) {
      console.info('[trips-table] User select an operation from the map:', data);

      // Open the operation
      return this.router.navigate([data.tripId, 'operation', data.id], {
        relativeTo: this.route
      });
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
    this.context.reset();
    this.tripContext.reset();
  }

  protected async downloadAsJson(ids: number[]) {
    if (isEmptyArray(ids)) return; // Skip if empty

    // Create file content
    const entities = (await Promise.all(ids.map(id => this._dataService.load(id, {fullLoad: true, withOperation: true}))))
      .map(entity => entity.asObject(MINIFY_ENTITY_FOR_LOCAL_STORAGE));
    const content = JSON.stringify(entities);

    // Write to file
    FilesUtils.writeTextToFile(content, {
      filename: this.translate.instant("TRIP.TABLE.DOWNLOAD_JSON_FILENAME"),
      type: 'application/json'
    });
  }
}
