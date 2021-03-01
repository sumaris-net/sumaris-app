import {Directive, Injector} from "@angular/core";
import {ModalController, Platform} from "@ionic/angular";
import {ActivatedRoute, Router} from "@angular/router";
import {Location} from '@angular/common';
import {FormGroup} from "@angular/forms";
import {catchError, distinctUntilChanged, filter, map, throttleTime} from "rxjs/operators";
import {PlatformService} from "../../core/services/platform.service";
import {LocalSettingsService} from "../../core/services/local-settings.service";
import {AccountService} from "../../core/services/account.service";
import {ConnectionType, NetworkService} from "../../core/services/network.service";
import {BehaviorSubject} from "rxjs";
import {personsToString} from "../../core/services/model/person.model";
import {chainPromises} from "../../shared/observables";
import {isEmptyArray, isNotNil} from "../../shared/functions";
import {RootDataEntity, SynchronizationStatus} from "../services/model/root-data-entity.model";
import {qualityFlagToColor} from "../services/model/model.utils";
import {UserEventService} from "../../social/services/user-event.service";
import {IDataSynchroService} from "../services/root-data-synchro-service.class";
import {EntitiesTableDataSource} from "../../core/table/entities-table-datasource.class";
import {referentialToString} from "../../core/services/model/referential.model";
import {AppTable} from "../../core/table/table.class";
import {toDateISOString} from "../../shared/dates";
import * as momentImported from "moment";
import {EntityServiceLoadOptions} from "../../shared/services/entity-service.class";
const moment = momentImported;

export const AppRootTableSettingsEnum = {
  FILTER_KEY: "filter"
};

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AppRootTable<T extends RootDataEntity<T>, F = any, O extends EntityServiceLoadOptions = EntityServiceLoadOptions>
  extends AppTable<T, F> {

  protected network: NetworkService;
  protected userEventService: UserEventService;
  protected accountService: AccountService;

  canEdit: boolean;
  canDelete: boolean;
  isAdmin: boolean;
  filterForm: FormGroup;
  filterIsEmpty = true;
  showUpdateOfflineFeature = false;
  offline = false;

  importing = false;
  $importProgression = new BehaviorSubject<number>(0);
  hasOfflineMode = false;
  featureId: string;

  synchronizationStatusList: SynchronizationStatus[] = ['DIRTY', 'SYNC'];

  get synchronizationStatus(): SynchronizationStatus {
    return this.filterForm.controls.synchronizationStatus.value || 'SYNC' /*= the default status*/;
  }

  set synchronizationStatus(value: SynchronizationStatus) {
    this.setSynchronizationStatus(value);
  }

  get isLogin(): boolean {
    return this.accountService.isLogin();
  }

  protected constructor(
    route: ActivatedRoute,
    router: Router,
    platform: Platform | PlatformService,
    location: Location,
    modalCtrl: ModalController,
    settings: LocalSettingsService,
    columns: string[],
    protected dataService: IDataSynchroService<T, O>,
    _dataSource?: EntitiesTableDataSource<T, F>,
    _filter?: F,
    injector?: Injector
  ) {

    super(route, router, platform, location, modalCtrl, settings,
      columns,
      _dataSource,
      _filter, injector
    );
    this.network = injector && injector.get(NetworkService);
    this.accountService = injector && injector.get(AccountService);
    this.userEventService = injector && injector.get(UserEventService);

    this.readOnly = false;
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.saveBeforeSort = false;
    this.saveBeforeFilter = false;
    this.saveBeforeDelete = false;
  }

  ngOnInit() {
    super.ngOnInit();

    this.isAdmin = this.accountService.isAdmin();
    this.canEdit = this.isAdmin || this.accountService.isUser();
    this.canDelete = this.isAdmin;

    if (!this.filterForm) throw new Error("Missing 'filterForm'");
    if (!this.featureId) throw new Error("Missing 'featureId'");

    // Listen network
    this.offline = this.network.offline;
    this.registerSubscription(
      this.network.onNetworkStatusChanges
        .pipe(
          filter(isNotNil),
          distinctUntilChanged()
        )
        .subscribe((type) => this.onNetworkStatusChanged(type)));


    this.registerSubscription(
      this.onRefresh.subscribe(() => {
        this.filterIsEmpty = this.isFilterEmpty(this.filter);
        this.filterForm.markAsUntouched();
        this.filterForm.markAsPristine();
        this.markForCheck();

        // Check if update offline mode is need
        this.checkUpdateOfflineNeed();
      }));
  }

  onNetworkStatusChanged(type: ConnectionType) {
    const offline = type === "none";
    if (this.offline !== offline) {

      // Update the property used in template
      this.offline = offline;
      this.markForCheck();

      // When offline, change synchronization status to DIRTY
      if (this.offline && this.synchronizationStatus === 'SYNC') {
        this.setSynchronizationStatus('DIRTY');
      }
    }
  }

  toggleOfflineMode(event?: UIEvent) {
    if (this.network.offline) {
      this.network.setForceOffline(false);
    }
    else {
      this.network.setForceOffline(true, {showToast: true});
      this.filterForm.patchValue({synchronizationStatus: 'DIRTY'}, {emitEvent: false/*avoid refresh*/});
      this.hasOfflineMode = true;
    }
    // Refresh table
    this.onRefresh.emit();
  }

  async prepareOfflineMode(event?: UIEvent, opts?: {
    toggleToOfflineMode?: boolean; // Switch to offline mode ?
    showToast?: boolean; // Display success toast ?
  }): Promise<undefined | boolean> {
    if (this.importing) return; // skip

    // If offline, warn user and ask to reconnect
    if (this.network.offline) {
      return this.network.showOfflineToast({
        // Allow to retry to connect
        showRetryButton: true,
        onRetrySuccess: () => this.prepareOfflineMode(null, opts)
      });
    }

    this.$importProgression.next(0);

    let success = false;
    try {

      await new Promise((resolve, reject) => {
        // Run the import
        this.dataService.executeImport({maxProgression: 100})
          .pipe(
            filter(value => value > 0),
            map((progress) => {
              if (!this.importing) {
                this.importing = true;
                this.markForCheck();
              }
              return Math.min(Math.trunc(progress), 100);
            }),
            catchError(err => {
              reject(err);
              throw err;
            }),
            throttleTime(100)
          )
          .subscribe(progression => this.$importProgression.next(progression))
          .add(() => resolve());
      });

      // Toggle to offline mode
      if (!opts || opts.toggleToOfflineMode !== false) {
        this.setSynchronizationStatus('DIRTY');
      }

      // Display toast
      if (!opts || opts.showToast !== false) {
        this.showToast({message: 'NETWORK.INFO.IMPORTATION_SUCCEED', showCloseButton: true, type: 'info'});
      }
      success = true;

      // Hide the warning message
      this.showUpdateOfflineFeature = false;
      return success;
    }
    catch (err) {
      success = false;
      this.error = err && err.message || err;
      return success;
    }
    finally {
      this.hasOfflineMode = this.hasOfflineMode || success;
      this.importing = false;
      this.markForCheck();
    }
  }

  async setSynchronizationStatus(value: SynchronizationStatus) {
    if (!value) return; // Skip if empty

    // Make sure network is UP
    if (this.offline && value === 'SYNC') {
      this.network.showOfflineToast({
        // Allow to retry to connect
        showRetryButton: true,
        onRetrySuccess: () => this.setSynchronizationStatus(value) // Loop
      });
      return;
    }

    console.debug("[trips] Applying filter to synchronization status: " + value);
    this.error = null;
    this.filterForm.patchValue({synchronizationStatus: value}, {emitEvent: false});
    const json = { ...this.filter, synchronizationStatus: value};
    this.setFilter(json, {emitEvent: true});

    // Save filter to settings (need to be done here, because entity creation can need it - e.g. to apply Filter as default values)
    await this.settings.savePageSetting(this.settingsId, json, AppRootTableSettingsEnum.FILTER_KEY);
  }

  hasReadyToSyncSelection(): boolean {
    if (!this._enabled) return false;
    if (this.loading || this.selection.isEmpty()) return false;
    return (this.selection.selected || [])
      .findIndex(row => row.currentData.id < 0 && row.currentData.synchronizationStatus === 'READY_TO_SYNC') !== -1;
  }

  async synchronizeSelection() {
    if (!this._enabled) return;
    if (this.loading || this.selection.isEmpty()) return;

    if (this.offline) {
      this.network.showOfflineToast({
        showRetryButton: true,
        onRetrySuccess: () => this.synchronizeSelection()
      });
      return;
    }

    if (this.debug) console.debug("[trips] Starting synchronization...");

    const rowsToSync = this.selection.selected.slice();
    const ids = rowsToSync
      .filter(row => row.currentData.id < 0 && row.currentData.synchronizationStatus === 'READY_TO_SYNC')
      .map(row => row.currentData.id);

    if (isEmptyArray(ids)) return; // Nothing to sync

    this.markAsLoading();
    this.error = null;

    try {
      await chainPromises(ids.map(tripId => () => this.dataService.synchronizeById(tripId)));
      this.selection.clear();

      // Success message
      this.showToast({
        message: 'INFO.SYNCHRONIZATION_SUCCEED'
      });

      // Clean history
      // FIXME: find a way o clean only synchronized data ?
      this.settings.clearPageHistory();

    } catch (error) {
      this.userEventService.showToastErrorWithContext({
        error,
        context: () => chainPromises(ids.map(tripId => () => this.dataService.load(tripId, {withOperation: true, toEntity: false})))
      });
    }
    finally {
      this.onRefresh.emit();
    }
  }

  referentialToString = referentialToString;
  personsToString = personsToString;
  qualityFlagToColor = qualityFlagToColor;

  /* -- protected methods -- */

  protected abstract isFilterEmpty(filter: F): boolean;

  protected async restoreFilterOrLoad() {
    console.debug("[root-table] Restoring filter from settings...");
    const jsonFilter = this.settings.getPageSettings(this.settingsId, AppRootTableSettingsEnum.FILTER_KEY);

    const synchronizationStatus = jsonFilter && jsonFilter.synchronizationStatus;
    const filter = jsonFilter && typeof jsonFilter === 'object' && {...jsonFilter, synchronizationStatus: undefined} || undefined;

    this.hasOfflineMode = (synchronizationStatus && synchronizationStatus !== 'SYNC') ||
      (await this.dataService.hasOfflineData());

    // No default filter, nor synchronizationStatus
    if (this.isFilterEmpty(filter) && !synchronizationStatus) {
      // If offline data, show it (will refresh)
      if (this.hasOfflineMode) {
        this.filterForm.patchValue({
          synchronizationStatus: 'DIRTY'
        });
      }
      // No offline data: default load (online data)
      else {
        // To avoid a delay (caused by debounceTime in a previous pipe), to refresh content manually
        this.onRefresh.emit();
        // But set a empty filter, to avoid automatic apply of next filter changes (caused by condition '|| isNil()' in a previous pipe)
        this.filterForm.patchValue({}, {emitEvent: false});
      }
    }
    // Restore the filter (will apply it)
    else {
      // Force offline
      if (this.network.offline && this.hasOfflineMode && synchronizationStatus === 'SYNC') {
        this.filterForm.patchValue({
          ...filter,
          synchronizationStatus: 'DIRTY'
        });
      }
      else {
        this.filterForm.patchValue({...filter, synchronizationStatus});
      }
    }
  }

  protected async checkUpdateOfflineNeed() {
    let needUpdate = false;

    // If online
    if (this.network.online) {

      // Get last synchro date
      const lastSynchronizationDate = this.settings.getOfflineFeatureLastSyncDate(this.featureId);

      // Check only if last synchro older than 10 min
      if (lastSynchronizationDate && lastSynchronizationDate
        .isBefore(moment().add(-10, 'minute'))) {

        // Get peer last update date, then compare
        const remoteUpdateDate = await this.dataService.lastUpdateDate();
        if (isNotNil(remoteUpdateDate)) {
          // Compare dates, to known if an update if need
          needUpdate = lastSynchronizationDate.isBefore(remoteUpdateDate);
        }

        console.info(`[trips] Checking referential last update dates: {local: '${toDateISOString(lastSynchronizationDate)}', remote: '${toDateISOString(remoteUpdateDate)}'} - Need upgrade: ${needUpdate}`);
      }
    }

    // Update the view
    if (this.showUpdateOfflineFeature !== needUpdate) {
      this.showUpdateOfflineFeature = needUpdate;

      this.markForCheck();
    }
  }

}

