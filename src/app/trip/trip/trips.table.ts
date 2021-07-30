import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, OnDestroy, OnInit} from '@angular/core';
import {TableElement, ValidatorService} from '@e-is/ngx-material-table';
import {TripValidatorService} from '../services/validator/trip.validator';
import {TripService} from '../services/trip.service';
import {TripFilter} from '../services/filter/trip.filter';
import {ModalController} from '@ionic/angular';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';
import {FormBuilder} from '@angular/forms';
import {
  ConfigService,
  EntitiesTableDataSource,
  HammerSwipeEvent,
  isNotNil,
  LocalSettingsService,
  PersonService,
  PersonUtils,
  PlatformService,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  SharedValidators,
  slideUpDownAnimation,
  StatusIds,
  UserEventService
} from '@sumaris-net/ngx-components';
import {VesselSnapshotService} from '@app/referential/services/vessel-snapshot.service';
import {Trip} from '../services/model/trip.model';
import {ReferentialRefService} from '@app/referential/services/referential-ref.service';
import {LocationLevelIds} from '@app/referential/services/model/model.enum';
import {TripTrashModal, TripTrashModalOptions} from './trash/trip-trash.modal';
import {TRIP_CONFIG_OPTIONS, TRIP_FEATURE_NAME} from '../services/config/trip.config';
import {AppRootTable, AppRootTableSettingsEnum} from '@app/data/table/root-table.class';
import {environment} from '@environments/environment';
import {DATA_CONFIG_OPTIONS} from '@app/data/services/config/data.config';
import {filter, tap} from 'rxjs/operators';
import {BehaviorSubject} from 'rxjs';

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
export class TripTable extends AppRootTable<Trip, TripFilter> implements OnInit, OnDestroy {

  $title = new BehaviorSubject<string>('');
  highlightedRow: TableElement<Trip>;
  showRecorder = true;
  showObservers = true;

  constructor(
    protected injector: Injector,
    protected route: ActivatedRoute,
    protected router: Router,
    protected platform: PlatformService,
    protected location: Location,
    protected modalCtrl: ModalController,
    protected settings: LocalSettingsService,
    protected dataService: TripService,
    protected userEventService: UserEventService,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected configService: ConfigService,
    protected formBuilder: FormBuilder,
    protected cd: ChangeDetectorRef
  ) {

    super(route, router, platform, location, modalCtrl, settings,
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
      new EntitiesTableDataSource<Trip, TripFilter>(Trip, dataService),
      null, // Filter
      injector
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
      recorderPerson: [null, SharedValidators.entity]
      // TODO: add observer filter ?
      //,'observer': [null]
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
      service: this.referentialRefService,
      filter: {
        entityName: 'Program'
      },
      mobile: this.mobile
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
    this.registerAutocompleteField('vesselSnapshot', {
      service: this.vesselSnapshotService,
      attributes: this.settings.getFieldDisplayAttributes('vesselSnapshot', ['exteriorMarking', 'name']),
      filter: {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }
    });

    // Combo: recorder department
    this.registerAutocompleteField('department', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Department'
      },
      mobile: this.mobile
    });

    // Combo: recorder person
    this.registerAutocompleteField('person', {
      service: this.personService,
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      attributes: ['lastName', 'firstName', 'department.name'],
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

            this.showRecorder = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_RECORDER);
            this.setShowColumn('recorderPerson', this.showRecorder, {emitEvent: false});

            this.showObservers = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_OBSERVERS);
            this.setShowColumn('observers', this.showObservers, {emitEvent: false});

            this.updateColumns();

            // Restore filter from settings, or load all
            this.restoreFilterOrLoad();
          })
        )
        .subscribe()
    )


  }

  clickRow(event: MouseEvent|undefined, row: TableElement<Trip>): boolean {
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

  /* -- protected methods -- */

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
