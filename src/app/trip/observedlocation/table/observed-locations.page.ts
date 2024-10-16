import { ChangeDetectionStrategy, Component, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { UntypedFormArray, UntypedFormBuilder } from '@angular/forms';
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import {
  Alerts,
  ConfigService,
  Configuration,
  HammerSwipeEvent,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  PersonService,
  PersonUtils,
  ReferentialRef,
  SharedValidators,
  slideUpDownAnimation,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { ObservedLocationService } from '../observed-location.service';
import { LocationLevelIds } from '@app/referential/services/model/model.enum';
import { ObservedLocation } from '../observed-location.model';
import { AppRootDataTable, AppRootDataTableState } from '@app/data/table/root-table.class';
import { OBSERVED_LOCATION_DEFAULT_PROGRAM_FILTER, OBSERVED_LOCATION_FEATURE_NAME, TRIP_CONFIG_OPTIONS } from '../../trip.config';
import { Observable } from 'rxjs';
import { ObservedLocationOfflineModal } from '../offline/observed-location-offline.modal';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
import { ObservedLocationFilter, ObservedLocationOfflineFilter } from '../observed-location.filter';
import { filter } from 'rxjs/operators';
import { DataQualityStatusEnum, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { ContextService } from '@app/shared/context.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { LANDING_TABLE_DEFAULT_I18N_PREFIX } from '@app/trip/landing/landings.table';
import { IonSegment } from '@ionic/angular';
import { LandingsPageSettingsEnum } from '@app/trip/landing/landings.page';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';

export const ObservedLocationsPageSettingsEnum = {
  PAGE_ID: 'observedLocations',
  FILTER_KEY: 'filter',
  FEATURE_NAME: OBSERVED_LOCATION_FEATURE_NAME,
};

export interface ObservedLocationsPageState extends AppRootDataTableState {
  landingsTitle: string;
}

@Component({
  selector: 'app-observed-locations-page',
  templateUrl: 'observed-locations.page.html',
  styleUrls: ['observed-locations.page.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideUpDownAnimation],
})
export class ObservedLocationsPage
  extends AppRootDataTable<ObservedLocation, ObservedLocationFilter, ObservedLocationService, any, number, ObservedLocationsPageState>
  implements OnInit
{
  @RxStateSelect() protected landingsTitle$: Observable<string>;
  protected statusList = DataQualityStatusList;
  protected statusById = DataQualityStatusEnum;
  protected selectedSegment = 'observations';

  @RxStateProperty() protected landingsTitle: string;

  @Input() showTitleSegment = false;
  @Input() showFilterProgram = true;
  @Input() showFilterLocation = true;
  @Input() showFilterPeriod = true;
  @Input() showRecorder = true;
  @Input() showObservers = true;
  @Input() allowMultipleSelection = true;
  @Input() inModal = false;
  @Input() enableFilterPanelCompact = false;

  @Input()
  set showProgramColumn(value: boolean) {
    this.setShowColumn('program', value);
  }

  get showProgramColumn(): boolean {
    return this.getShowColumn('program');
  }

  @Input()
  set showEndDateTimeColumn(value: boolean) {
    this.setShowColumn('endDateTime', value);
  }

  get showEndDateTimeColumn(): boolean {
    return this.getShowColumn('endDateTime');
  }

  get filterObserversForm(): UntypedFormArray {
    return this.filterForm.controls.observers as UntypedFormArray;
  }

  @ViewChild('ion-segment', { static: true }) ionSegment: IonSegment;

  constructor(
    injector: Injector,
    _dataService: ObservedLocationService,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService,
    protected formBuilder: UntypedFormBuilder,
    protected configService: ConfigService,
    protected context: ContextService
  ) {
    super(
      injector,
      ObservedLocation,
      ObservedLocationFilter,
      ['quality', 'program', 'location', 'startDateTime', 'endDateTime', 'observers', 'recorderPerson', 'comments'],
      _dataService,
      null
    );
    this.inlineEdition = false;
    this.excludesColumns = ['endDateTime']; // Hide by default
    this.i18nColumnPrefix = 'OBSERVED_LOCATION.TABLE.';
    this.filterForm = formBuilder.group({
      program: [null, SharedValidators.entity],
      location: [null, SharedValidators.entity],
      startDate: [null, SharedValidators.validDate],
      endDate: [null, SharedValidators.validDate],
      synchronizationStatus: [null],
      recorderDepartment: [null, SharedValidators.entity],
      recorderPerson: [null, SharedValidators.entity],
      observers: formBuilder.array([[null, SharedValidators.entity]]),
      dataQualityStatus: [null],
      qualityFlagId: [null, SharedValidators.integer],
    });
    this.autoLoad = false;
    this.defaultSortBy = 'startDateTime';
    this.defaultSortDirection = 'desc';
    this.showToolbar = true;

    this.settingsId = ObservedLocationsPageSettingsEnum.PAGE_ID; // Fixed value, to be able to reuse it in the editor page
    this.featureName = ObservedLocationsPageSettingsEnum.FEATURE_NAME;

    this.registerSubscription(
      this.route.queryParams.subscribe((queryParams) => {
        if (queryParams?.expandFilter && this.filterExpansionPanel) {
          this.filterExpansionPanel.expanded = true;
        }
      })
    );

    // FOR DEV ONLY ----
    //this.debug = !environment.production;
    this.logPrefix = '[observed-locations-page] ';
  }

  ngOnInit() {
    super.ngOnInit();

    // In modal mode: hide update card
    if (this.inModal) {
      this.showInstallUpgradeCard = false;
      this.showUpdateOfflineFeature = false;
    }

    // Programs combo (filter)
    this.registerAutocompleteField('program', {
      service: this.programRefService,
      filter: OBSERVED_LOCATION_DEFAULT_PROGRAM_FILTER,
      mobile: this.mobile,
    });

    // Locations combo (filter)
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('location', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelIds: [LocationLevelIds.AUCTION, LocationLevelIds.PORT],
      },
      mobile: this.mobile,
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

    this.registerSubscription(this.configService.config.pipe(filter(isNotNil)).subscribe((config) => this.onConfigLoaded(config)));

    // Clear the context
    this.resetContext();

    this.filterPanelFloating = !this.enableFilterPanelCompact;
  }

  async setFilter(filter: Partial<ObservedLocationFilter>, opts?: { emitEvent: boolean }) {
    super.setFilter(filter, {
      ...opts,
      emitEvent: this.enableFilterPanelCompact ? true : opts?.emitEvent,
    });
  }

  async openTrashModal(event?: Event) {
    console.debug(`${this.logPrefix}Opening trash modal...`);
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

  async prepareOfflineMode(
    event?: Event,
    opts?: {
      toggleToOfflineMode?: boolean;
      showToast?: boolean;
      filter?: any;
    }
  ): Promise<undefined | boolean> {
    if (this.importing) return; // Skip

    if (event) {
      const feature = this.settings.getOfflineFeature(this._dataService.featureName) || {
        name: this._dataService.featureName,
      };
      const value = <ObservedLocationOfflineFilter>{
        ...this.filter,
        ...feature.filter,
      };
      const modal = await this.modalCtrl.create({
        component: ObservedLocationOfflineModal,
        componentProps: {
          value,
        },
        keyboardClose: true,
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

  async deleteSelection(event: Event, opts?: { interactive?: boolean }): Promise<number> {
    const rowsToDelete = this.selection.selected;

    const observedLocationIds = (rowsToDelete || [])
      .map((row) => row.currentData as ObservedLocation)
      .map(ObservedLocation.fromObject)
      .map((o) => o.id);

    // ask confirmation if one observation has samples (with tagId)
    if (isNotEmptyArray(observedLocationIds) && (!opts || opts.interactive !== false)) {
      const hasSample = await this._dataService.hasSampleWithTagId(observedLocationIds);
      if (hasSample) {
        const messageKey =
          observedLocationIds.length === 1 ? 'OBSERVED_LOCATION.CONFIRM.DELETE_ONE_HAS_SAMPLE' : 'OBSERVED_LOCATION.CONFIRM.DELETE_MANY_HAS_SAMPLE';
        const confirmed = await Alerts.askConfirmation(messageKey, this.alertCtrl, this.translate, event);
        if (!confirmed) return; // skip
      }
    }

    // Use inherited function, when no sample
    return super.deleteSelection(event, { interactive: false /*already confirmed*/ });
  }

  /* -- protected functions -- */

  protected async onConfigLoaded(config: Configuration) {
    console.info(`${this.logPrefix}Init using config`, config);

    // Show title segment ? (always disable on mobile)
    this.showTitleSegment = !this.mobile && config.getPropertyAsBoolean(TRIP_CONFIG_OPTIONS.OBSERVED_LOCATION_LANDINGS_TAB_ENABLE);

    this.title = config.getProperty(TRIP_CONFIG_OPTIONS.OBSERVED_LOCATION_NAME);

    // Quality
    this.showQuality = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.QUALITY_PROCESS_ENABLE);
    this.setShowColumn('quality', this.showQuality, { emitEvent: false });

    // Recorder
    this.showRecorder = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_RECORDER);
    this.setShowColumn('recorderPerson', this.showRecorder, { emitEvent: false });

    // Observer
    this.showObservers = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_OBSERVERS);
    this.setShowColumn('observers', this.showObservers, { emitEvent: false });

    // Manage filters display according to config settings.
    this.showFilterProgram = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_FILTER_PROGRAM);
    this.showFilterLocation = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_FILTER_LOCATION);
    this.showFilterPeriod = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.SHOW_FILTER_PERIOD);

    // Restore filter from settings, or load all
    if (this.enabled) await this.restoreFilterOrLoad();

    this.updateColumns();
  }

  protected async onSegmentChanged(event: CustomEvent) {
    const path = event.detail.value;
    if (isNilOrBlank(path)) return;

    this.markAsLoading();

    // Prepare filter for next page
    const nextFilter = ObservedLocationFilter.toLandingFilter(this.asFilter());
    const json = nextFilter?.asObject({ keepTypename: true }) || {};
    await this.settings.savePageSetting(LandingsPageSettingsEnum.PAGE_ID, json, LandingsPageSettingsEnum.FILTER_KEY);

    setTimeout(async () => {
      await this.navController.navigateRoot(path, {
        animated: false,
        queryParams: {
          expandFilter: this.filterExpansionPanel.expanded,
        },
      });

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
    // if (this.debug) console.debug(`${this.logPrefix}onSwipeTab()`);

    // Skip, if not a valid swipe event
    if (!event || event.defaultPrevented || (event.srcEvent && event.srcEvent.defaultPrevented) || event.pointerType !== 'touch') {
      return false;
    }

    this.toggleSynchronizationStatus();
    return true;
  }

  protected async setProgram(program: Program) {
    await super.setProgram(program);

    // Show endDateTime column, if enable
    this.showEndDateTimeColumn = program.getPropertyAsBoolean(ProgramProperties.OBSERVED_LOCATION_END_DATE_TIME_ENABLE);

    // Title
    this.landingsTitle = this.translateContext.instant(LANDING_TABLE_DEFAULT_I18N_PREFIX + 'TITLE', this.i18nColumnSuffix);
  }

  protected async resetProgram() {
    await super.resetProgram();

    // Show endDateTime
    this.showEndDateTimeColumn = false;

    // Title
    this.landingsTitle = LANDING_TABLE_DEFAULT_I18N_PREFIX + 'TITLE';
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected resetContext() {
    this.context.reset();
  }
}
