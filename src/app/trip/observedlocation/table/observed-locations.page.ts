import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import {
  Alerts,
  ConfigService,
  Configuration,
  HammerSwipeEvent,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  PersonService,
  PersonUtils,
  ReferentialRef,
  SharedValidators,
  StatusIds,
  TranslateContextService
} from '@sumaris-net/ngx-components';
import { ObservedLocationService } from '../observed-location.service';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { ObservedLocation } from '../observed-location.model';
import { AppRootDataTable } from '@app/data/table/root-table.class';
import { OBSERVED_LOCATION_FEATURE_NAME, TRIP_CONFIG_OPTIONS } from '../../trip.config';
import { environment } from '@environments/environment';
import { BehaviorSubject } from 'rxjs';
import { ObservedLocationOfflineModal } from '../offline/observed-location-offline.modal';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import { ObservedLocationFilter, ObservedLocationOfflineFilter } from '../observed-location.filter';
import { filter } from 'rxjs/operators';
import { DataQualityStatusEnum, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { ContextService } from '@app/shared/context.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { LANDING_TABLE_DEFAULT_I18N_PREFIX } from '@app/trip/landing/landings.table';
import { AnimationController, IonSegment } from '@ionic/angular';
import { LandingsPageSettingsEnum } from '@app/trip/landing/landings.page';


export const ObservedLocationsPageSettingsEnum = {
  PAGE_ID: "observedLocations",
  FILTER_KEY: "filter",
  FEATURE_NAME: OBSERVED_LOCATION_FEATURE_NAME
};

@Component({
  selector: 'app-observed-locations-page',
  templateUrl: 'observed-locations.page.html',
  styleUrls: ['observed-locations.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObservedLocationsPage extends
  AppRootDataTable<ObservedLocation, ObservedLocationFilter> implements OnInit {

  protected $title = new BehaviorSubject<string>('');
  protected $landingsTitle = new BehaviorSubject<string>('');
  protected statusList = DataQualityStatusList;
  protected statusById = DataQualityStatusEnum;
  protected selectedSegment = 'observations';

  @Input() showTitleSegment = false;
  @Input() showFilterProgram = true;
  @Input() showFilterLocation = true;
  @Input() showFilterPeriod = true;
  @Input() showQuality = true;
  @Input() showRecorder = true;
  @Input() showObservers = true;
  @Input() allowMultipleSelection = true;

  @Input()
  set showProgramColumn(value: boolean) {
    this.setShowColumn('program', value);
  }

  get showProgramColumn(): boolean {
    return this.getShowColumn('program');
  }

  get filterObserversForm(): UntypedFormArray {
    return this.filterForm.controls.observers as UntypedFormArray;
  }

  get filterDataQualityControl(): UntypedFormControl {
    return this.filterForm.controls.dataQualityStatus as UntypedFormControl;
  }

  @ViewChild('ion-segment', {static: true}) ionSegment: IonSegment;

  constructor(
    injector: Injector,
    protected _dataService: ObservedLocationService,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected formBuilder: UntypedFormBuilder,
    protected configService: ConfigService,
    protected translateContext: TranslateContextService,
    protected animationCtrl: AnimationController,
    protected context: ContextService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector,
      ObservedLocation, ObservedLocationFilter,
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
    this.featureName = ObservedLocationsPageSettingsEnum.FEATURE_NAME;

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
          filter(isNotNil)
        )
        .subscribe(config => this.onConfigLoaded(config)));

    // Clear the context
    this.resetContext();
  }


  async setFilter(filter: Partial<ObservedLocationFilter>, opts?: { emitEvent: boolean }) {
    // Program
    const programLabel = filter?.program?.label;
    if (isNotNilOrBlank(programLabel)) {
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
        await this.setProgram(program);
      }
      else {
        await this.resetProgram();
      }
    }

    super.setFilter(filter, opts);
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
      const feature = this.settings.getOfflineFeature(this._dataService.featureName) || {
        name: this._dataService.featureName
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

    const observedLocationIds = (rowsToDelete || [])
      .map(row => row.currentData as ObservedLocation)
      .map(ObservedLocation.fromObject)
      .map(o => o.id);

    // ask confirmation if one observation has samples (with tagId)
    if (isNotEmptyArray(observedLocationIds) && (!opts || opts.interactive !== false)) {
      const hasSample = await this._dataService.hasSampleWithTagId(observedLocationIds);
      if (hasSample) {
        const messageKey = observedLocationIds.length === 1
          ? 'OBSERVED_LOCATION.CONFIRM.DELETE_ONE_HAS_SAMPLE'
          : 'OBSERVED_LOCATION.CONFIRM.DELETE_MANY_HAS_SAMPLE';
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


  /* -- protected functions -- */

  protected async onConfigLoaded(config: Configuration) {
    console.info('[observed-locations] Init using config', config);

    // Show title segment ? (always disable on mobile)
    this.showTitleSegment = !this.mobile && config.getPropertyAsBoolean(TRIP_CONFIG_OPTIONS.OBSERVED_LOCATION_LANDINGS_TAB_ENABLE);

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

    // Restore filter from settings, or load all
    await this.restoreFilterOrLoad();

    this.updateColumns();
  }

  protected async onSegmentChanged(event: CustomEvent) {
    const path = event.detail.value;
    if (isNilOrBlank(path)) return;

    this.markAsLoading();

    // Prepare filter for next page
    const nextFilter = ObservedLocationFilter.toLandingFilter(this.asFilter());
    const json = nextFilter?.asObject({keepTypename: true}) || {};
    await this.settings.savePageSetting(LandingsPageSettingsEnum.PAGE_ID, json, LandingsPageSettingsEnum.FILTER_KEY);

    setTimeout(async () => {
      await this.navController.navigateRoot(path, {animated: false});

      // Reset the selected segment
      this.selectedSegment = '';
      this.markAsLoaded();
    }, 200)
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

  protected async setProgram(program: Program) {
    console.debug('[observed-location] Init using program', program);

    // I18n suffix
    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nColumnSuffix = i18nSuffix;

    // Title
    const landingsTitle = this.translateContext.instant(LANDING_TABLE_DEFAULT_I18N_PREFIX + 'TITLE', this.i18nColumnSuffix);
    this.$landingsTitle.next(landingsTitle);

    // Hide program column
    this.showProgramColumn = false;
    //this.showObservers
  }

  protected async resetProgram() {
    console.debug('[observed-location] Reset program');

    // I18n suffix
    this.i18nColumnSuffix = '';

    // Title
    this.$landingsTitle.next(LANDING_TABLE_DEFAULT_I18N_PREFIX + 'TITLE');

    // Show program column
    this.showProgramColumn = true;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected resetContext() {
    this.context.reset();
  }
}
