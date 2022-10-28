import { Directive, Injector, Input, ViewChild } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, map, tap, throttleTime } from 'rxjs/operators';
import {
  AccountService,
  AppFormUtils,
  chainPromises,
  ConnectionType,
  FileEvent,
  FileResponse,
  FilesUtils,
  IEntitiesService,
  isEmptyArray,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  NetworkService,
  referentialToString,
  toBoolean,
  toDateISOString,
  UsageMode,
} from '@sumaris-net/ngx-components';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataRootEntityUtils, RootDataEntity } from '../services/model/root-data-entity.model';
import { qualityFlagToColor, SynchronizationStatus } from '../services/model/model.utils';
import { IDataSynchroService } from '../services/root-data-synchro-service.class';
import { moment } from '@app/vendor';
import { TableElement } from '@e-is/ngx-material-table';
import { RootDataEntityFilter } from '../services/model/root-data-filter.model';
import { MatExpansionPanel } from '@angular/material/expansion';
import { HttpEventType } from '@angular/common/http';
import { PopoverController } from '@ionic/angular';
import { AppBaseTable, BaseTableConfig } from '@app/shared/table/base.table';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { UserEventService } from '@app/social/user-event/user-event.service';


export const AppRootTableSettingsEnum = {
  FILTER_KEY: "filter"
};

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AppRootDataTable<
  T extends RootDataEntity<T, ID>,
  F extends RootDataEntityFilter<F, T, ID> = RootDataEntityFilter<any, T, any>,
  V extends BaseValidatorService<T, ID> = any,
  ID = number
  >
  extends AppBaseTable<T, F, V, ID> {


  protected readonly network: NetworkService;
  protected readonly userEventService: UserEventService;
  protected readonly accountService: AccountService;
  protected readonly popoverController: PopoverController;

  canDelete: boolean;
  isAdmin: boolean;
  filterForm: UntypedFormGroup;
  filterCriteriaCount = 0;
  filterPanelFloating = true;
  showUpdateOfflineFeature = false;
  offline = false;
  logPrefix = '[root-data-table] ';

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
    protected dataType: new () => T,
    protected filterType: new () => F,
    columnNames: string[],
    protected dataService: IDataSynchroService<T, F, ID> & IEntitiesService<T, F>,
    protected validatorService: V,
    options?: BaseTableConfig<T, ID>
  ) {
    super(injector,
      dataType, filterType,
      columnNames,
      dataService, validatorService,
      options);
    this.network = injector.get(NetworkService);
    this.accountService = injector.get(AccountService);
    this.userEventService = injector.get(UserEventService);
    this.popoverController = injector.get(PopoverController);

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
          filter(() => isNotNilOrBlank(this.settingsId)),
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

  toggleOfflineMode(event?: Event) {
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

  async prepareOfflineMode(event?: Event, opts?: {
    toggleToOfflineMode?: boolean; // Switch to offline mode ?
    showToast?: boolean; // Display success toast ?
  }): Promise<undefined | boolean> {
    if (this.importing) return; // skip

    // If offline, warn user and ask to reconnect
    if (this.network.offline) {
      if (opts?.showToast !== false) {
        return this.network.showOfflineToast({
          // Allow to retry to connect
          showRetryButton: true,
          onRetrySuccess: () => this.prepareOfflineMode(null, opts)
        });
      }
      return false;
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
      this.$progression.next(0);
      this.importing = false;
      this.markForCheck();
    }
  }

  async setSynchronizationStatus(value: SynchronizationStatus, opts = {showToast : true}): Promise<boolean> {
    if (!value) return false; // Skip if empty

    // Make sure network is UP
    if (this.offline && value === 'SYNC' && !this.hasOfflineMode) {
      if (opts.showToast) {
        this.network.showOfflineToast({
          // Allow to retry to connect
          showRetryButton: true,
          onRetrySuccess: () => this.setSynchronizationStatus(value) // Loop
        });
      }
      return false;
    }

    console.debug("[trips] Applying filter to synchronization status: " + value);
    this.resetError();
    this.filterForm.patchValue({synchronizationStatus: value}, {emitEvent: false});
    const json = { ...this.filter, synchronizationStatus: value};
    this.setFilter(json, {emitEvent: true});

    // Save filter to settings (need to be done here, because entity creation can need it - e.g. to apply Filter as default values)
    if (isNotNilOrBlank(this.settingsId)) {
      await this.settings.savePageSetting(this.settingsId, json, AppRootTableSettingsEnum.FILTER_KEY);
    }
    return true;
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

  async addRowToSyncStatus(event: Event, value: SynchronizationStatus) {
    if (!value || !this.mobile || this.importing) return; // Skip

    // If 'DIRTY' but offline not init : init this mode
    if (value !== 'SYNC' && !this.hasOfflineMode) {

      // If offline, warn user and ask to reconnect
      if (this.network.offline) {
        return this.network.showOfflineToast({
          // Allow to retry to connect
          showRetryButton: true,
          onRetrySuccess: () => this.addRowToSyncStatus(null, value)
        });
      }

      const done = await this.prepareOfflineMode(null, {toggleToOfflineMode: false, showToast: false});
      if (!done || !this.hasOfflineMode) return; // Skip if failed
    }

    // Set the synchronization status, if changed
    if (this.synchronizationStatus !== value) {
      const ok = await this.setSynchronizationStatus(value, {showToast: false});
      if (!ok) return;

      // Make sure status changed
      if (this.synchronizationStatus !== value) {
        console.warn('[root-table] Cannot switch to synchronization status: ' + value + '. Cannot add new row !');
        return;
      }
    }

    // Force settings the expected usageMode
    const forceUsageMode: UsageMode = this.synchronizationStatus === 'SYNC' ? 'DESK': 'FIELD' ;
    if (this.settings.usageMode !== forceUsageMode) {
      console.info('[root-table] Changing usage mode to: ' + forceUsageMode);
      await this.settings.applyProperty('usageMode', forceUsageMode);
    }

    // Add new row
    this.addRow(event);
  }


  clickRow(event: Event|undefined, row: TableElement<T>): boolean {
    if (this.importing) return; // Skip
    return super.clickRow(event, row);
  }

  protected async openRow(id: ID, row: TableElement<T>): Promise<boolean> {

    // Force settings the expected usageMode
    if (this.mobile && this.hasOfflineMode) {
      const forceUsageMode: UsageMode = this.synchronizationStatus === 'SYNC' ? 'DESK': 'FIELD' ;
      if (this.settings.usageMode !== forceUsageMode) {
        console.info('[root-table] Changing usage mode to: ' + forceUsageMode);
        await this.settings.applyProperty('usageMode', forceUsageMode);
      }
    }

    return super.openRow(id, row);
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
      await new Promise<void>(async (resolve, reject) => {
        const res = await this.network.showOfflineToast({
          showRetryButton: true,
          onRetrySuccess: () => resolve()
        });
        if (!res) reject('ERROR.NETWORK_REQUIRED');
      });
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

      // Update rows, when no refresh will be emitted
      if (opts?.emitEvent === false) {
        rows.map(row => {
            if (DataRootEntityUtils.isLocalAndDirty(row.currentData)) {
              row.currentData.synchronizationStatus = 'READY_TO_SYNC';
            }
          });
      }

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
      throw error;
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
      await new Promise<void>(async (resolve, reject) => {
        const res = await this.network.showOfflineToast({
          showRetryButton: true,
          onRetrySuccess: () => resolve()
        });
        if (!res) reject('ERROR.NETWORK_REQUIRED');
      });
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

  async importFromFile(event?: Event): Promise<any[]> {
    const { data } = await FilesUtils.showUploadPopover(this.popoverController, event, {
      uniqueFile: true,
      fileExtension: '.json',
      instantUpload: true,
      uploadFn: (file) => this.uploadFile(file)
    });

    const entities = (data || []).flatMap(file => file.response?.body || []);
    if (isEmptyArray(entities)) return; // No entities: skip

    console.info(this.logPrefix + `Loaded ${entities.length} entities from file`);
    return entities;
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
    if (isNilOrBlank(this.settingsId)) return;
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

  protected getJsonEncoding(): string {
    const key = 'FILE.JSON.ENCODING';
    const encoding = this.translate.instant(key);
    if (encoding !== key) return encoding;
    return 'UTF-8'; // Default encoding
  }

  protected uploadFile(file: File): Observable<FileEvent<T[]>> {
    console.info(this.logPrefix + `Importing JSON file ${file.name}...`);

    const encoding = this.getJsonEncoding();

    return FilesUtils.readAsText(file, encoding)
      .pipe(
        map(event => {
          if (event.type === HttpEventType.UploadProgress) {
            const loaded = Math.round(event.loaded * 0.8);
            return {...event, loaded};
          }
          else if (event instanceof FileResponse){
            console.debug(this.logPrefix + 'File content: \n' + event.body);
            try {
              let data = JSON.parse(event.body);
              if (Array.isArray(data)) {
                return new FileResponse<T[]>({body: data});
              }
              return new FileResponse<T[]>({body: [data]});
            } catch (err) {
              console.error(this.logPrefix + 'Error while parsing JSON file', err);
              throw new Error('Invalid JSON file'); // TODO translate
            }
          }
          // Unknown event: skip
          else {
            return null;
          }
        }),
        filter(isNotNil)
      );
  }
}

