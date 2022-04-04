import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit} from '@angular/core';
import {TableElement} from '@e-is/ngx-material-table';
import {ActivatedRoute, Router} from '@angular/router';
import {ModalController} from '@ionic/angular';
import {Location} from '@angular/common';
import {ReferentialRefService} from '../../referential/services/referential-ref.service';
import {FormArray, FormBuilder, FormControl} from '@angular/forms';
import {
  Alerts,
  ConfigService,
  EntitiesTableDataSource,
  HammerSwipeEvent,
  isNotEmptyArray,
  isNotNil,
  LocalSettingsService,
  PersonService,
  PersonUtils,
  PlatformService, ReferentialRef,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  SharedValidators,
  StatusIds
} from '@sumaris-net/ngx-components';
import {ObservedLocationService} from '../services/observed-location.service';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import {ObservedLocation} from '../services/model/observed-location.model';
import {AppRootDataTable} from '@app/data/table/root-table.class';
import {OBSERVED_LOCATION_FEATURE_NAME, TRIP_CONFIG_OPTIONS} from '../services/config/trip.config';
import {environment} from '@environments/environment';
import {BehaviorSubject} from 'rxjs';
import {ObservedLocationOfflineModal} from './offline/observed-location-offline.modal';
import {ProgramRefService} from '@app/referential/services/program-ref.service';
import {DATA_CONFIG_OPTIONS} from 'src/app/data/services/config/data.config';
import {ObservedLocationFilter, ObservedLocationOfflineFilter} from '../services/filter/observed-location.filter';
import {filter, tap} from 'rxjs/operators';
import {DataQualityStatusEnum, DataQualityStatusList} from '@app/data/services/model/model.utils';
import {ContextService} from '@app/shared/context.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { ProgramFilter } from '@app/referential/services/filter/program.filter';
import { Program } from '@app/referential/services/model/program.model';


export const ObservedLocationsPageSettingsEnum = {
  PAGE_ID: "observedLocations",
  FILTER_KEY: "filter",
  FEATURE_ID: OBSERVED_LOCATION_FEATURE_NAME
};

@Component({
  selector: 'app-observed-locations-page',
  templateUrl: 'observed-locations.page.html',
  styleUrls: ['observed-locations.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObservedLocationsPage extends
  AppRootDataTable<ObservedLocation, ObservedLocationFilter> implements OnInit {

  highlightedRow: TableElement<ObservedLocation>;
  $title = new BehaviorSubject<string>('');
  statusList = DataQualityStatusList;
  statusById = DataQualityStatusEnum;

  @Input() showFilterProgram = true;
  @Input() showFilterLocation = true;
  @Input() showFilterPeriod = true;
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
    protected dataService: ObservedLocationService,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected formBuilder: FormBuilder,
    protected configService: ConfigService,
    protected context: ContextService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector,
      RESERVED_START_COLUMNS
        .concat([
          'quality',
          'program',
          'location',
          'startDateTime',
          'observers',
          'recorderPerson',
          'comments'])
        .concat(RESERVED_END_COLUMNS),
      dataService,
      new EntitiesTableDataSource(ObservedLocation, dataService),
    );
    this.i18nColumnPrefix = 'OBSERVED_LOCATION.TABLE.';
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
    this.defaultSortBy = 'startDateTime';
    this.defaultSortDirection = 'desc';

    this.settingsId = ObservedLocationsPageSettingsEnum.PAGE_ID; // Fixed value, to be able to reuse it in the editor page
    this.featureId = ObservedLocationsPageSettingsEnum.FEATURE_ID;

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
      }
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

  clickRow(event: MouseEvent|undefined, row: TableElement<ObservedLocation>): boolean {
    this.highlightedRow = row;
    return super.clickRow(event, row);
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

  async openTrashModal(event?: UIEvent) {
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
      const res = await modal.onDidDismiss();
      if (!res || !res.data) return; // User cancelled

      // Update feature filter, and save it into settings
      feature.filter = res && res.data;
      this.settings.saveOfflineFeature(feature);

      // DEBUG
      console.debug('[observed-location-table] Will prepare offline mode, using filter:', feature.filter);
    }

    return super.prepareOfflineMode(event, opts);
  }

  async deleteSelection(event: UIEvent): Promise<number> {
    let oldConfirmBeforeDelete = this.confirmBeforeDelete;
    const rowsToDelete = this.selection.selected;

    const observations = (rowsToDelete || [])
      .map(row => row.currentData as ObservedLocation)
      .map(ObservedLocation.fromObject)
      .map(o => o.id);

    // ask confirmation if one observation has samples
    if (isNotEmptyArray(observations)) {
      const samplesCount = await this.dataService.countSamples(observations);
      if (samplesCount > 0) {
        const messageKey = observations.length === 1
          ? 'OBSERVED_LOCATION.CONFIRM.OBSERVATION_HAS_SAMPLE'
          : 'OBSERVED_LOCATION.CONFIRM.OBSERVATIONS_HAS_SAMPLE';
        let confirm = await Alerts.askConfirmation(messageKey, this.alertCtrl, this.translate, event);
        if (!confirm) return; // skip
        this.confirmBeforeDelete = false;
      }
    }

    // delete if observation have no sample
    await super.deleteSelection(event);
    this.confirmBeforeDelete = oldConfirmBeforeDelete;
  }

  get canUserCancelOrDelete(): boolean {
    // IMAGINE-632: User can only delete landings or samples created by himself or on which he is defined as observer

    // When connected user is an admin
    if (this.accountService.isAdmin()) {
      return true;
    }

    const row = !this.selection.isEmpty() && this.selection.selected[0];
    const entity = row.currentData;

    // When observed location has been recorded by connected user
    const recorder = entity.recorderPerson;
    const connectedPerson = this.accountService.person;
    if (connectedPerson.id === recorder?.id) {
      return true;
    }

    // When connected user is in observed location observers
    for (const observer of entity.observers) {
      if (connectedPerson.id === observer.id) {
        return true;
      }
    }
    return false;
  }


  /* -- protected methods -- */

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected resetContext() {
    this.context.reset();
  }
}
