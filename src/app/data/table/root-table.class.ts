import {Directive, Injector, Input, ViewChild} from '@angular/core';
import {ModalController, Platform} from '@ionic/angular';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';
import {FormGroup} from '@angular/forms';
import {catchError, debounceTime, distinctUntilChanged, filter, map, tap, throttleTime} from 'rxjs/operators';
import {
  AccountService, AppFormUtils,
  AppTable,
  chainPromises,
  ConnectionType,
  EntitiesTableDataSource,
  isEmptyArray,
  isNotNil,
  LocalSettingsService,
  NetworkService,
  PlatformService,
  referentialToString,
  toBoolean,
  toDateISOString,
  UserEventService
} from '@sumaris-net/ngx-components';
import {BehaviorSubject} from 'rxjs';
import {DataRootEntityUtils, RootDataEntity} from '../services/model/root-data-entity.model';
import {qualityFlagToColor, SynchronizationStatus} from '../services/model/model.utils';
import {IDataSynchroService} from '../services/root-data-synchro-service.class';
import * as momentImported from 'moment';
import {TableElement} from '@e-is/ngx-material-table';
import {RootDataEntityFilter} from '../services/model/root-data-filter.model';
import {MatExpansionPanel} from '@angular/material/expansion';

const moment = momentImported;

export const AppRootTableSettingsEnum = {
  FILTER_KEY: "filter"
};

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AppRootDataTable<
  T extends RootDataEntity<T, ID>,
  F extends RootDataEntityFilter<F, T, ID> = RootDataEntityFilter<any, T, any>,
  ID = number
  >
  extends AppTable<T, F, ID> {

  protected network: NetworkService;
  protected userEventService: UserEventService;
  protected accountService: AccountService;

  canEdit: boolean;
  canDelete: boolean;
  isAdmin: boolean;
  filterForm: FormGroup;
  filterCriteriaCount = 0;
  filterPanelFloating = true;
  showUpdateOfflineFeature = false;
  offline = false;

  importing = false;
  progressionMessage: string = null;
  $progression = new BehaviorSubject<number>(0);
  hasOfflineMode = false;
  featureId: string;

  get filterIsEmpty(): boolean {
    return this.filterCriteriaCount === 0;
  }

  get synchronizationStatus(): SynchronizationStatus {
    return this.filterForm.controls.synchronizationStatus.value || 'SYNC' /*= the default status*/;
  }

  @Input()
  set synchronizationStatus(value: SynchronizationStatus) {
    this.setSynchronizationStatus(value);
  }

  get isLogin(): boolean {
    return this.accountService.isLogin();
  }

  @ViewChild(MatExpansionPanel, {static: true}) filterExpansionPanel: MatExpansionPanel;

  protected constructor(
    injector: Injector,
    columns: string[],
    protected dataService: IDataSynchroService<T, F, ID>,
    dataSource?: EntitiesTableDataSource<T, F, ID>,
    filter?: F
  ) {

    super(injector, columns, dataSource, filter || null);
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
    this.canEdit = toBoolean(this.canEdit, this.isAdmin || this.accountService.isUser());
    this.canDelete = toBoolean(this.canDelete, this.isAdmin);
    if (this.debug) console.debug("[root-table] Can user edit table ? " + this.canEdit);

    if (!this.filterForm) throw new Error(`Missing 'filterForm' in ${this.constructor.name}`);
    if (!this.featureId) throw new Error(`Missing 'featureId' in ${this.constructor.name}`);

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
        this.filterForm.markAsUntouched();
        this.filterForm.markAsPristine();

        // Check if update offline mode is need
        this.checkUpdateOfflineNeed();
      }));

    // Update filter when changes
    this.registerSubscription(
      this.filterForm.valueChanges
        .pipe(
          debounceTime(250),
          filter((_) => {
            const valid = this.filterForm.valid;
            if (!valid && this.debug) AppFormUtils.logFormErrors(this.filterForm);
            return valid;
          }),
          // Update the filter, without reloading the content
          tap(json => this.setFilter(json, {emitEvent: false})),
          // Save filter in settings (after a debounce time)
          debounceTime(500),
          tap(json => this.settings.savePageSetting(this.settingsId, json, AppRootTableSettingsEnum.FILTER_KEY))
        )
        .subscribe());
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.$progression.unsubscribe();

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

    this.progressionMessage = 'NETWORK.INFO.IMPORTATION_PCT_DOTS';
    const maxProgression = 100;
    this.$progression.next(0);
    this.resetError();

    let success = false;
    try {

      await new Promise<void>((resolve, reject) => {
        // Run the import
        this.dataService.executeImport(null, {maxProgression})
          .pipe(
            filter(value => value > 0),
            map((progress) => {
              if (!this.importing) {
                this.importing = true;
                this.markForCheck();
              }
              return Math.min(Math.trunc(progress), maxProgression);
            }),
            throttleTime(100),
            tap(progression => this.$progression.next(progression))
          )
          .subscribe({
            error: (err) => reject(err),
            complete: () => resolve()
          });
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
      this.setError(err);
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

  toggleSynchronizationStatus() {
    if (this.offline || this.synchronizationStatus === 'SYNC') {
      this.setSynchronizationStatus('DIRTY');
    }
    else {
      this.setSynchronizationStatus('SYNC');
    }
  }

  toggleFilterPanelFloating() {
    this.filterPanelFloating = !this.filterPanelFloating;
    this.markForCheck();
  }

  closeFilterPanel() {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
    this.filterPanelFloating = true;
  }

  get hasReadyToSyncSelection(): boolean {
    if (!this._enabled || this.loading || this.selection.isEmpty()) return false;
    return this.selection.selected
      .map(row => row.currentData)
      .findIndex(DataRootEntityUtils.isReadyToSync) !== -1;
  }

  get hasDirtySelection(): boolean {
    if (!this._enabled || this.loading || this.selection.isEmpty()) return false;
    return this.selection.selected
      .map(row => row.currentData)
      .findIndex(DataRootEntityUtils.isLocalAndDirty) !== -1;
  }

  async terminateAndSynchronizeSelection() {
    try {
      this.markAsLoading();
      const rows = this.selection.selected.slice();

      // Terminate
      await this.terminateSelection({
        showSuccessToast: false,
        emitEvent: false,
        rows
      });

      await this.synchronizeSelection( {
        showSuccessToast: true, // display toast when succeed
        emitEvent: false,
        rows
      });

      // Clean selection
      this.selection.clear();

    } catch (err) {
      console.error(err);
    }
    finally {
      this.onRefresh.emit();
    }
  }

  async terminateSelection(opts?: {
    showSuccessToast?: boolean;
    emitEvent?: boolean;
    rows?: TableElement<T>[]
  }) {
    if (!this._enabled) return; // Skip

    const rows = opts && opts.rows || (!this.loading && this.selection.selected.slice());
    if (isEmptyArray(rows)) return; // Skip

    if (this.offline) {
      this.network.showOfflineToast({
        showRetryButton: true,
        onRetrySuccess: () => this.terminateSelection()
      });
      return;
    }

    if (this.debug) console.debug("[root-table] Starting to terminate data...");

    const ids = rows
      .map(row => row.currentData)
      .filter(DataRootEntityUtils.isLocalAndDirty)
      .map(entity => entity.id);

    if (isEmptyArray(ids)) return; // Nothing to terminate

    this.markAsLoading();
    this.error = null;

    try {
      await chainPromises(ids.map(id => () => this.dataService.terminateById(id)));

      // Success message
      if (!opts || opts.showSuccessToast !== false) {
        this.showToast({
          message: 'INFO.SYNCHRONIZATION_SUCCEED'
        });
      }

    } catch (error) {
      this.userEventService.showToastErrorWithContext({
        error,
        context: () => chainPromises(ids.map(id => () => this.dataService.load(id, {withOperation: true, toEntity: false})))
      });
    }
    finally {
      if (!opts || opts.emitEvent !== false) {
        // Reset selection
        this.selection.clear();

        // Refresh table
        this.onRefresh.emit();
      }
    }
  }


  async synchronizeSelection(opts?: {
    showSuccessToast?: boolean;
    cleanPageHistory?: boolean;
    emitEvent?: boolean;
    rows?: TableElement<T>[]
  }) {
    if (!this._enabled) return; // Skip

    const rows = opts && opts.rows || (!this.loading && this.selection.selected.slice());
    if (isEmptyArray(rows)) return; // Skip

    if (this.offline) {
      this.network.showOfflineToast({
        showRetryButton: true,
        onRetrySuccess: () => this.synchronizeSelection()
      });
      return;
    }

    if (this.debug) console.debug("[root-table] Starting to synchronize data...");

    const ids = rows
      .map(row => row.currentData)
      .filter(DataRootEntityUtils.isReadyToSync)
      .map(entity => entity.id);

    if (isEmptyArray(ids)) return; // Nothing to sync

    this.markAsLoading();
    this.error = null;

    try {
      await chainPromises(ids.map(id => () => this.dataService.synchronizeById(id)));
      this.selection.clear();

      // Success message
      if (!opts || opts.showSuccessToast !== false) {
        this.showToast({
          message: 'INFO.SYNCHRONIZATION_SUCCEED'
        });
      }

      // Clean history
      if (!opts || opts.cleanPageHistory) {
        // FIXME: find a way o clean only synchronized data ?
        this.settings.clearPageHistory();
      }

    } catch (error) {
      this.userEventService.showToastErrorWithContext({
        error,
        context: () => chainPromises(ids.map(id => () => this.dataService.load(id, {withOperation: true, toEntity: false})))
      });
      throw error;
    }
    finally {
      if (!opts || opts.emitEvent !== false) {
        // Clear selection
        this.selection.clear();

        // Refresh table
        this.onRefresh.emit();
      }
    }
  }

  applyFilterAndClosePanel(event?: UIEvent) {
    this.onRefresh.emit(event);
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
  }

  resetFilter(event?: UIEvent) {
    this.filterForm.reset();
    this.setFilter(null, {emitEvent: true});
    this.filterCriteriaCount = 0;
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
  }

  referentialToString = referentialToString;
  qualityFlagToColor = qualityFlagToColor;

  /* -- protected methods -- */

  protected asFilter(source?: any): F {
    source = source || this.filterForm.value;

    if (this._dataSource && this._dataSource.dataService) {
      return this._dataSource.dataService.asFilter(source);
    }

    return source as F;
  }

  protected async restoreFilterOrLoad(opts?: { emitEvent?: boolean; }) {
    this.markAsLoading();

    console.debug("[root-table] Restoring filter from settings...", opts);

    const json = this.settings.getPageSettings(this.settingsId, AppRootTableSettingsEnum.FILTER_KEY) || {};

    this.hasOfflineMode = (json.synchronizationStatus && json.synchronizationStatus !== 'SYNC') || (await this.dataService.hasOfflineData());

    // Force offline, if no network AND has offline feature
    if (this.network.offline && this.hasOfflineMode) {
      json.synchronizationStatus = 'DIRTY';
    }

    this.setFilter(json, {emitEvent: true, ...opts});
  }

  setFilter(filter: Partial<F>, opts?: { emitEvent: boolean }) {

    filter = this.asFilter(filter);

    // Update criteria count
    const criteriaCount = filter.countNotEmptyCriteria();
    if (criteriaCount !== this.filterCriteriaCount) {
      this.filterCriteriaCount = criteriaCount;
      this.markForCheck();
    }

    // Update the form content
    if (!opts || opts.emitEvent !== false) {
      this.filterForm.patchValue(filter.asObject(), {emitEvent: false});
    }

    super.setFilter(filter as F, opts);
  }

  protected async checkUpdateOfflineNeed() {
    let needUpdate = false;

    // If online
    if (this.network.online) {

      // Get last synchro date
      const lastSynchronizationDate = this.settings.getOfflineFeatureLastSyncDate(this.featureId);

      // Check only if last synchro older than 10 min
      if (lastSynchronizationDate && lastSynchronizationDate.isBefore(moment().add(-10, 'minute'))) {

        // Get peer last update date, then compare
        const remoteUpdateDate = await this.dataService.lastUpdateDate();
        if (isNotNil(remoteUpdateDate)) {
          // Compare dates, to known if an update if need
          needUpdate = lastSynchronizationDate.isBefore(remoteUpdateDate);
        }

        console.info(`[root-table] Checking referential last update dates: {local: '${toDateISOString(lastSynchronizationDate)}', remote: '${toDateISOString(remoteUpdateDate)}'} - Need upgrade: ${needUpdate}`);
      }
    }

    // Update the view
    if (this.showUpdateOfflineFeature !== needUpdate) {
      this.showUpdateOfflineFeature = needUpdate;

      this.markForCheck();
    }
  }

}

