import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import {
  Alerts,
  ConfigService,
  HammerSwipeEvent,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrNaN,
  PersonService,
  PersonUtils,
  ReferentialRef,
  SharedValidators,
  StatusIds
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
import { LandingService } from '@app/trip/landing/landing.service';


export const LandingsPageSettingsEnum = {
  PAGE_ID: "landings",
  FILTER_KEY: "filter",
  FEATURE_NAME: OBSERVED_LOCATION_FEATURE_NAME
};

@Component({
  selector: 'app-landings-page',
  templateUrl: 'landings.page.html',
  styleUrls: ['landings.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingsPage extends
  AppRootDataTable<Landing, LandingFilter> implements OnInit {

  $title = new BehaviorSubject<string>('');
  statusList = DataQualityStatusList;
  statusById = DataQualityStatusEnum;

  @Input() showFilterProgram = true;
  @Input() showFilterLocation = true;
  @Input() showFilterPeriod = true;
  @Input() showQuality = true;
  @Input() showRecorder = true;
  @Input() showObservers = true;

  get filterObserversForm(): UntypedFormArray {
    return this.filterForm.controls.observers as UntypedFormArray;
  }

  get filterDataQualityControl(): UntypedFormControl {
    return this.filterForm.controls.dataQualityStatus as UntypedFormControl;
  }

  constructor(
    injector: Injector,
    protected _dataService: LandingService,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected formBuilder: UntypedFormBuilder,
    protected configService: ConfigService,
    protected context: ContextService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector,
      Landing, LandingFilter,
      ['quality',
      'program',
      'location',
      'startDateTime',
      'observers',
      'recorderPerson',
      'comments'],
      _dataService,
      null
    );
    this.inlineEdition = false;
    this.i18nColumnPrefix = 'OBSERVED_LOCATION.LANDING.TABLE.';
    this.filterForm = formBuilder.group({
      program: [null, SharedValidators.entity],
      location: [null, SharedValidators.entity],
      startDate: [null, SharedValidators.validDate],
      endDate: [null, SharedValidators.validDate],
      synchronizationStatus: [null],
      recorderDepartment: [null, SharedValidators.entity],
      recorderPerson: [null, SharedValidators.entity],
      observers: formBuilder.array([[null, SharedValidators.entity]])
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

    // Programs combo (filter)
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: {
        acquisitionLevelLabels: [AcquisitionLevelCodes.OBSERVED_LOCATION, AcquisitionLevelCodes.LANDING],
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      },
      mobile: this.mobile
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
          filter(isNotNil),
          tap(config => {
            console.info('[observed-locations] Init from config', config);
            const title = config.getProperty(TRIP_CONFIG_OPTIONS.OBSERVED_LOCATION_NAME);
            this.$title.next(title);

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

            this.updateColumns();

            // Restore filter from settings, or load all
            this.restoreFilterOrLoad();
          })
        )
        .subscribe());

    // Clear the context
    this.resetContext();
  }

  protected async restoreFilterOrLoad(opts?: { emitEvent?: boolean }): Promise<void> {
    // Load by observed location
    const observedLocationId = this.route.snapshot.paramMap.get('observedLocationId');
    if (isNotNilOrNaN(observedLocationId)) {
      this.setFilter(<Partial<LandingFilter>>{observedLocationId: +observedLocationId}, {emitEvent: true, ...opts});
      return
    }
    // Load by trip
    const tripId = this.route.snapshot.paramMap.get('tripId');
    if (isNotNilOrNaN(tripId)) {
      this.setFilter(<Partial<LandingFilter>>{tripId: +tripId}, {emitEvent: true, ...opts});
      return
    }
    return super.restoreFilterOrLoad(opts);
  }

  /**
   * Action triggered when user swipes
   */
  onSwipeTab(event: HammerSwipeEvent): boolean {
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


  /* -- protected methods -- */

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected resetContext() {
    this.context.reset();
  }
}
