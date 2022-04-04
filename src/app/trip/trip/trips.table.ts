import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { TableElement, ValidatorService } from '@e-is/ngx-material-table';
import { TripValidatorService } from '../services/validator/trip.validator';
import { TripService } from '../services/trip.service';
import { TripFilter, TripSynchroImportFilter } from '../services/filter/trip.filter';
import { FormArray, FormBuilder, FormControl } from '@angular/forms';
import {
  ConfigService,
  EntitiesTableDataSource,
  HammerSwipeEvent,
  isNotNil,
  PersonService,
  PersonUtils,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  SharedValidators,
  slideUpDownAnimation,
  StatusIds,
  UserEventService
} from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Trip } from '../services/model/trip.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { TripTrashModal, TripTrashModalOptions } from './trash/trip-trash.modal';
import { TRIP_CONFIG_OPTIONS, TRIP_FEATURE_NAME } from '../services/config/trip.config';
import { AppRootDataTable, AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
import { environment } from '@environments/environment';
import { DATA_CONFIG_OPTIONS } from '@app/data/services/config/data.config';
import { filter, tap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { TripOfflineModal } from '@app/trip/trip/offline/trip-offline.modal';
import { DataQualityStatusEnum, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ProgramFilter } from '@app/referential/services/filter/program.filter';
import { Program } from '@app/referential/services/model/program.model';

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
  highlightedRow: TableElement<Trip>;
  statusList = DataQualityStatusList;
  statusById = DataQualityStatusEnum;

  @Input() showQuality = true;
  @Input() showRecorder = true;
  @Input() showObservers = true;

  get filterObserversForm(): FormArray {
    return this.filterForm.controls.observers as FormArray;
  }

  get filterDataQualityControl(): FormControl {
    return this.filterForm.controls.dataQualityStatus as FormControl;
  }

  constructor(
    injector: Injector,
    protected dataService: TripService,
    protected userEventService: UserEventService,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected configService: ConfigService,
    protected context: ContextService,
    protected tripContext: TripContextService,
    protected formBuilder: FormBuilder,
    protected cd: ChangeDetectorRef
  ) {

    super(injector,
      RESERVED_START_COLUMNS
        .concat([
          'quality',
          'program',
          'vessel',
          'departureLocation',
          'departureDateTime',
          'returnDateTime',
          'observers',
          'recorderPerson',
          'comments'])
        .concat(RESERVED_END_COLUMNS),
        dataService,
      new EntitiesTableDataSource<Trip, TripFilter>(Trip, dataService)
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
    this.defaultSortBy = 'departureDateTime';
    this.defaultSortDirection = 'desc';
    this.confirmBeforeDelete = true;

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
      filter: <ProgramFilter>{
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        acquisitionLevelLabels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION, AcquisitionLevelCodes.CHILD_OPERATION]
      }
    });

    // Locations combo (filter)
    this.registerAutocompleteField('location', {
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
    this.registerAutocompleteField('department', {
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

    // Clear the existing context
    this.resetContext();
  }

  clickRow(event: MouseEvent|undefined, row: TableElement<Trip>): boolean {
    console.debug('[trips] click row');
    this.highlightedRow = row;
    return super.clickRow(event, row);
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

  async openTrashModal(event?: UIEvent) {
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

  async prepareOfflineMode(event?: UIEvent, opts?: {
    toggleToOfflineMode?: boolean;
    showToast?: boolean;
    filter?: any;
  }): Promise<undefined | boolean> {
    if (this.importing) return; // Skip

    if (event) {
      const feature = this.settings.getOfflineFeature(this.dataService.featureName) || {
        name: this.dataService.featureName
      };
      const filter = this.asFilter(this.filterForm.value);
      const value = <TripSynchroImportFilter>{
        vesselId: filter.vesselId || filter.vesselSnapshot && filter.vesselSnapshot.id || undefined,
        programLabel: filter.program && filter.program.label || undefined,
        ...feature.filter
      };
      const modal = await this.modalCtrl.create({
        component: TripOfflineModal,
        componentProps: {
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

  clearFilterValue(key: keyof TripFilter, event?: UIEvent) {
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
}
