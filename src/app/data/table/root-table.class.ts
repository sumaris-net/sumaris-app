import { Directive, inject, Injector, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, startWith, tap, throttleTime } from 'rxjs/operators';
import {
  AccountService,
  AppFormUtils,
  arrayDistinct,
  chainPromises,
  ConnectionType,
  FileEvent,
  FileResponse,
  FilesUtils,
  IEntitiesService,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  MatAutocompleteFieldConfig,
  NamedFilter,
  NamedFilterSelector,
  NetworkService,
  PlatformService,
  Property,
  ReferentialRef,
  referentialToString,
  splitByProperty,
  StatusIds,
  toBoolean,
  toDateISOString,
  UsageMode,
} from '@sumaris-net/ngx-components';
import { BehaviorSubject, Observable } from 'rxjs';
import { RootDataEntity, RootDataEntityUtils } from '../services/model/root-data-entity.model';
import { DataQualityStatusEnum, DataQualityStatusList, SynchronizationStatus } from '../services/model/model.utils';
import { IDataSynchroService } from '../services/root-data-synchro-service.class';
import { TableElement } from '@e-is/ngx-material-table';
import { RootDataEntityFilter } from '../services/model/root-data-filter.model';
import { HttpEventType } from '@angular/common/http';
import { AppBaseTable, AppBaseTableFilterRestoreSource, BaseTableConfig, BaseTableState } from '@app/shared/table/base.table';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { UserEventService } from '@app/social/user-event/user-event.service';
import moment from 'moment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IDataEntityQualityService } from '@app/data/services/data-quality-service.class';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ProgramFilter } from '@app/referential/services/filter/program.filter';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';

export const AppRootTableSettingsEnum = {
  FILTER_KEY: 'filter',
};

export type AppRootTableFilterRestoreSource = AppBaseTableFilterRestoreSource;

export interface IRootDataEntitiesService<
  T extends RootDataEntity<T, ID>,
  F extends RootDataEntityFilter<F, T, ID> = RootDataEntityFilter<any, T, any>,
  ID = number,
> extends IEntitiesService<T, F>,
    IDataSynchroService<T, F, ID>,
    IDataEntityQualityService<T, ID> {
  featureName: string;
}

export interface AppRootDataTableState extends BaseTableState {
  title: string;

  programLabel: string;
  program: Program;
  selectionProgramLabels: string[];
  pmfms: IPmfm[];

  enableReport: boolean;
  reportTypes: Property[];
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AppRootDataTable<
    T extends RootDataEntity<T, ID>,
    F extends RootDataEntityFilter<F, T, ID> = RootDataEntityFilter<any, T, any>,
    S extends IRootDataEntitiesService<T, F, ID> = IRootDataEntitiesService<T, F, any>,
    V extends BaseValidatorService<T, ID> = any,
    ID = number,
    ST extends AppRootDataTableState = AppRootDataTableState,
    O extends BaseTableConfig<T, ID, ST> = BaseTableConfig<T, ID, ST>,
  >
  extends AppBaseTable<T, F, S, V, ID, ST, O>
  implements OnInit, OnDestroy
{
  protected readonly network = inject(NetworkService);
  protected readonly accountService = inject(AccountService);
  protected readonly userEventService = inject(UserEventService);
  protected readonly programRefService = inject(ProgramRefService);
  protected readonly referentialRefService = inject(ReferentialRefService);
  protected readonly platformService = inject(PlatformService);

  @RxStateSelect() protected title$: Observable<string>;
  @RxStateSelect() protected program$: Observable<Program>;
  @RxStateSelect() protected selectionProgramLabels$: Observable<string[]>;
  @RxStateSelect() protected pmfms$: Observable<IPmfm[]>;

  @RxStateProperty() protected programLabel: string;
  @RxStateProperty() protected program: Program;
  @RxStateProperty() protected selectionProgramLabels: string[];
  @RxStateProperty() protected pmfms: IPmfm[];
  @RxStateProperty() protected enableReport: boolean;
  @RxStateProperty() protected reportTypes: Property[];

  protected synchronizationStatus$: Observable<SynchronizationStatus>;
  protected defaultShowFilterProgram: boolean;
  protected qualityFlags: ReferentialRef[];
  protected qualityFlagsById: { [id: number]: ReferentialRef };
  protected dataQualityStatusList = DataQualityStatusList;
  protected dataQualityStatusById = DataQualityStatusEnum;

  @Input() @RxStateProperty() title: string;

  protected namedFilterContentProvider = (): object => this.filterForm.value;
  protected filterImportCallback = async (namedFilter: NamedFilter): Promise<NamedFilter> => {
    delete namedFilter.id;
    delete namedFilter.updateDate;
    return namedFilter;
  };
  protected namedFilterAutocompleteConfig: MatAutocompleteFieldConfig = {
    showAllOnFocus: true,
  };

  isAdmin: boolean;
  needUpdateOfflineFeature = false;
  offline = false;

  importing = false;
  progressionMessage: string = null;
  $progression = new BehaviorSubject<number>(0);
  featureName: string;
  @Input() hasOfflineMode = false;
  @Input() restoreFilterSources: false | AppRootTableFilterRestoreSource[] = ['settings', 'queryParams'];
  @Input() showOfflineMode = true;
  @Input() showQuality = true;

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

  get canDeleteSelection(): boolean {
    // Cannot delete if not connected
    if (!this.isLogin || this.selection.isEmpty()) {
      return false;
    }

    // Find a row that user CANNOT delete
    const invalidRow = this.selection.selected.find((row) => !this._dataService.canUserWrite(row.currentData));

    return !invalidRow;
  }

  @Input() showUpdateOfflineFeature = true;
  @Input() showInstallUpgradeCard = true;

  @ViewChild(NamedFilterSelector, { static: false }) namedFilterSelector: NamedFilterSelector;

  protected constructor(
    injector: Injector,
    dataType: new () => T,
    filterType: new () => F,
    columnNames: string[],
    dataService: S,
    validatorService: V,
    options?: O
  ) {
    super(injector, dataType, filterType, columnNames, dataService, validatorService, options);

    this.readOnly = false;
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.saveBeforeSort = false;
    this.saveBeforeFilter = false;
    this.saveBeforeDelete = false;

    // Load program, from label
    this._state.connect(
      'program',
      this._state.select('programLabel').pipe(
        distinctUntilChanged(),
        mergeMap((label) => this.loadProgram(label))
      )
    );

    // Init program, when loaded (or reset)
    this._state.hold(this._state.select('program'), (program) => {
      if (program?.label) {
        return this.setProgram(program);
      } else {
        return this.resetProgram();
      }
    });

    // Listen checkboxes changes, to known selection's programs (need by extraction button)
    this._state.connect(
      'selectionProgramLabels',
      this.selection.changed.pipe(
        debounceTime(250),
        map((_) => this.selection.selected),
        map((rows) => (rows || []).map((row) => row.currentData?.program?.label).filter(isNotNilOrBlank)),
        map((programLabels) => arrayDistinct(programLabels)),
        // DEBUG
        tap((programLabels) => console.debug(this.logPrefix + `Selection programs: [${programLabels.join(', ')}]`))
      )
    );

    this.logPrefix = '[root-data-table] ';
  }

  ngOnInit() {
    // Default value
    this.isAdmin = this.accountService.isAdmin();
    this.showIdColumn = this.showIdColumn ?? this.isAdmin;
    this.canEdit = toBoolean(this.canEdit, this.isAdmin || this.accountService.isUser());
    this.canDelete = toBoolean(this.canDelete, this.isAdmin);
    if (this.debug) console.debug(`${this.logPrefix}Can edit: ${this.canEdit} - Can delete: ${this.canDelete}`);

    super.ngOnInit();

    if (!this.filterForm) throw new Error(`Missing 'filterForm' in ${this.constructor.name}`);
    if (!this.featureName) throw new Error(`Missing 'dataService.featureName' in ${this.constructor.name}`);

    // Listen synchronizationStatus
    this.synchronizationStatus$ = this.onRefresh.pipe(
      startWith(this.synchronizationStatus),
      map(() => this.synchronizationStatus)
    );

    // Listen network
    this.offline = this.network.offline;
    this.registerSubscription(
      this.network.onNetworkStatusChanges.pipe(filter(isNotNil), distinctUntilChanged()).subscribe((type) => this.onNetworkStatusChanged(type))
    );

    this.registerSubscription(
      this.onRefresh.subscribe(() => {
        this.filterForm.markAsUntouched();
        this.filterForm.markAsPristine();

        // Check if update offline mode is need
        if (this.showUpdateOfflineFeature) {
          this.checkUpdateOfflineNeed();
        }
      })
    );

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
          tap((json) => this.setFilter(json, { emitEvent: false })),
          // Save filter in settings (after a debounce time)
          debounceTime(500),
          filter(() => isNotNilOrBlank(this.settingsId) && this.restoreFilterSources !== false && this.restoreFilterSources.includes('settings')),
          tap((json) => this.settings.savePageSetting(this.settingsId, { ...json }, AppRootTableSettingsEnum.FILTER_KEY))
        )
        .subscribe()
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.$progression.unsubscribe();
  }

  onNetworkStatusChanged(type: ConnectionType) {
    const offline = type === 'none';
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
    } else {
      this.network.setForceOffline(true, { showToast: true });
      this.hasOfflineMode = true;
      this.filterForm.patchValue({ synchronizationStatus: 'DIRTY' }, { emitEvent: false /*avoid refresh*/ });
    }
    // Refresh table
    this.onRefresh.emit();
  }

  async prepareOfflineMode(
    event?: Event,
    opts?: {
      toggleToOfflineMode?: boolean; // Switch to offline mode ?
      showToast?: boolean; // Display success toast ?
    }
  ): Promise<undefined | boolean> {
    if (this.importing) return; // skip

    // If offline, warn user and ask to reconnect
    if (this.network.offline) {
      if (opts?.showToast !== false) {
        return this.network.showOfflineToast({
          // Allow to retry to connect
          showRetryButton: true,
          onRetrySuccess: () => this.prepareOfflineMode(null, opts),
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
        this._dataService
          .runImport(null, { maxProgression })
          .pipe(
            filter((value) => value > 0),
            map((progress) => {
              if (!this.importing) {
                this.importing = true;
                this.markForCheck();
              }
              return Math.min(Math.trunc(progress), maxProgression);
            }),
            throttleTime(100),
            tap((progression) => this.$progression.next(progression))
          )
          .subscribe({
            error: (err) => reject(err),
            complete: () => resolve(),
          });
      });

      // Toggle to offline mode
      if (!opts || opts.toggleToOfflineMode !== false) {
        this.setSynchronizationStatus('DIRTY');
      }

      // Display toast
      if (!opts || opts.showToast !== false) {
        this.showToast({ message: 'NETWORK.INFO.IMPORTATION_SUCCEED', showCloseButton: true, type: 'info' });
      }
      success = true;

      // Hide the warning message
      this.needUpdateOfflineFeature = false;
      return success;
    } catch (err) {
      success = false;
      this.setError(err);
      return success;
    } finally {
      this.hasOfflineMode = this.hasOfflineMode || success;
      this.$progression.next(0);
      this.importing = false;
      this.markForCheck();
    }
  }

  async setSynchronizationStatus(value: SynchronizationStatus, opts = { showToast: true }): Promise<boolean> {
    if (!value) return false; // Skip if empty

    // Make sure network is UP
    if (this.offline && value === 'SYNC' && !this.hasOfflineMode) {
      if (opts.showToast) {
        this.network.showOfflineToast({
          // Allow to retry to connect
          showRetryButton: true,
          onRetrySuccess: () => this.setSynchronizationStatus(value), // Loop
        });
      }
      return false;
    }

    console.debug('[trips] Applying filter to synchronization status: ' + value);
    this.resetError();
    this.filterForm.patchValue({ synchronizationStatus: value }, { emitEvent: false });
    const json = { ...this.filter, synchronizationStatus: value };
    this.setFilter(json, { emitEvent: true });

    // Save filter to settings (need to be done here, because entity creation can need it - e.g. to apply Filter as default values)
    if (isNotNilOrBlank(this.settingsId)) {
      await this.settings.savePageSetting(this.settingsId, json, AppRootTableSettingsEnum.FILTER_KEY);
    }
    return true;
  }

  toggleSynchronizationStatus() {
    if (this.offline || this.synchronizationStatus === 'SYNC') {
      this.setSynchronizationStatus('DIRTY');
    } else {
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
          onRetrySuccess: () => this.addRowToSyncStatus(null, value),
        });
      }

      const done = await this.prepareOfflineMode(null, { toggleToOfflineMode: false, showToast: false });
      if (!done || !this.hasOfflineMode) return; // Skip if failed
    }

    // Set the synchronization status, if changed
    if (this.synchronizationStatus !== value) {
      const ok = await this.setSynchronizationStatus(value, { showToast: false });
      if (!ok) return;

      // Make sure status changed
      if (this.synchronizationStatus !== value) {
        console.warn('[root-table] Cannot switch to synchronization status: ' + value + '. Cannot add new row !');
        return;
      }
    }

    // Force settings the expected usageMode
    const forceUsageMode: UsageMode = this.synchronizationStatus === 'SYNC' ? 'DESK' : 'FIELD';
    if (this.settings.usageMode !== forceUsageMode) {
      console.info('[root-table] Changing usage mode to: ' + forceUsageMode);
      await this.settings.applyProperty('usageMode', forceUsageMode);
    }

    // Add new row
    this.addRow(event);
  }

  clickRow(event: Event | undefined, row: TableElement<T>): boolean {
    if (this.importing) return; // Skip
    return super.clickRow(event, row);
  }

  protected async openRow(id: ID, row: TableElement<T>): Promise<boolean> {
    // Force settings the expected usageMode
    if (this.mobile && this.hasOfflineMode) {
      const forceUsageMode: UsageMode = this.synchronizationStatus === 'SYNC' ? 'DESK' : 'FIELD';
      if (this.settings.usageMode !== forceUsageMode) {
        console.info('[root-table] Changing usage mode to: ' + forceUsageMode);
        await this.settings.applyProperty('usageMode', forceUsageMode);
      }
    }

    return super.openRow(id, row);
  }

  closeFilterPanel() {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
    if (!this.filterPanelFloating) {
      this.filterPanelFloating = true;
      this.markForCheck();
    }
  }

  get hasReadyToSyncSelection(): boolean {
    if (!this._enabled || this.loading || this.selection.isEmpty()) return false;
    return this.selection.selected.map((row) => row.currentData).findIndex(RootDataEntityUtils.isReadyToSync) !== -1;
  }

  get hasDirtySelection(): boolean {
    if (!this._enabled || this.loading || this.selection.isEmpty()) return false;
    return this.selection.selected.map((row) => row.currentData).findIndex(RootDataEntityUtils.isLocalAndDirty) !== -1;
  }

  async terminateAndSynchronizeSelection() {
    try {
      this.markAsLoading();
      const rows = this.selection.selected.slice();

      // Terminate
      await this.terminateSelection({
        showSuccessToast: false,
        emitEvent: false,
        rows,
      });

      await this.synchronizeSelection({
        showSuccessToast: true, // display toast when succeed
        emitEvent: false,
        rows,
      });

      // Clean selection
      this.selection.clear();
    } catch (err) {
      console.error(err);
    } finally {
      this.onRefresh.emit();
    }
  }

  async terminateSelection(opts?: { showSuccessToast?: boolean; emitEvent?: boolean; rows?: TableElement<T>[] }) {
    if (!this._enabled) return; // Skip

    const rows = (opts && opts.rows) || (!this.loading && this.selection.selected.slice());
    if (isEmptyArray(rows)) return; // Skip

    if (this.offline) {
      // eslint-disable-next-line no-async-promise-executor
      await new Promise<void>(async (resolve, reject) => {
        const res = await this.network.showOfflineToast({
          showRetryButton: true,
          onRetrySuccess: () => resolve(),
        });
        if (!res) reject('ERROR.NETWORK_REQUIRED');
      });
    }

    if (this.debug) console.debug('[root-table] Starting to terminate data...');

    const ids = rows
      .map((row) => row.currentData)
      .filter(RootDataEntityUtils.isLocalAndDirty)
      .map((entity) => entity.id);

    if (isEmptyArray(ids)) return; // Nothing to terminate

    this.markAsLoading();
    this.error = null;

    try {
      await chainPromises(ids.map((id) => () => this._dataService.terminateById(id)));

      // Update rows, when no refresh will be emitted
      if (opts?.emitEvent === false) {
        rows.map((row) => {
          if (RootDataEntityUtils.isLocalAndDirty(row.currentData)) {
            row.currentData.synchronizationStatus = 'READY_TO_SYNC';
          }
        });
      }

      // Success message
      if (!opts || opts.showSuccessToast !== false) {
        this.showToast({
          message: 'INFO.SYNCHRONIZATION_SUCCEED',
        });
      }
    } catch (error) {
      this.userEventService.showToastErrorWithContext({
        error,
        context: () => chainPromises(ids.map((id) => () => this._dataService.load(id, { withOperation: true, toEntity: false }))),
      });
      throw error;
    } finally {
      if (!opts || opts.emitEvent !== false) {
        // Reset selection
        this.selection.clear();

        // Refresh table
        this.onRefresh.emit();
      }
    }
  }

  async synchronizeSelection(opts?: { showSuccessToast?: boolean; emitEvent?: boolean; rows?: TableElement<T>[] }) {
    return this.synchronizeRows(opts?.rows || (!this.loading && this.selection.selected.slice()), opts);
  }

  async synchronizeRows(rows: TableElement<T>[], opts?: { showSuccessToast?: boolean; emitEvent?: boolean; rows?: TableElement<T>[] }) {
    if (!this._enabled && isEmptyArray(rows)) return; // Skip

    if (this.offline) {
      // eslint-disable-next-line no-async-promise-executor
      await new Promise<void>(async (resolve, reject) => {
        const res = await this.network.showOfflineToast({
          showRetryButton: true,
          onRetrySuccess: () => resolve(),
        });
        if (!res) reject('ERROR.NETWORK_REQUIRED');
      });
    }

    if (this.debug) console.debug('[root-table] Starting to synchronize data...');

    const ids = rows
      .map((row) => row.currentData)
      .filter(RootDataEntityUtils.isReadyToSync)
      .map((entity) => entity.id);

    if (isEmptyArray(ids)) return; // Nothing to sync

    this.markAsLoading();
    this.error = null;

    try {
      await chainPromises(ids.map((id) => () => this._dataService.synchronizeById(id)));
      this.selection.clear();

      // Success message
      if (!opts || opts.showSuccessToast !== false) {
        this.showToast({
          message: 'INFO.SYNCHRONIZATION_SUCCEED',
        });
      }
    } catch (error) {
      this.userEventService.showToastErrorWithContext({
        error,
        context: () => chainPromises(ids.map((id) => () => this._dataService.load(id, { withOperation: true, toEntity: false }))),
      });
      throw error;
    } finally {
      if (!opts || opts.emitEvent !== false) {
        // Clear selection
        this.selection.clear();

        // Refresh table
        this.onRefresh.emit();
      }
    }
  }

  async importJsonFile(event?: Event): Promise<any[]> {
    const { data } = await FilesUtils.showUploadPopover(this.popoverController, event, {
      uniqueFile: true,
      fileExtension: '.json',
      instantUpload: true,
      uploadFn: (file) => this.uploadJsonFile(file),
    });

    const entities = (data || []).flatMap((file) => file.response?.body || []);
    if (isEmptyArray(entities)) return; // No entities: skip

    console.info(this.logPrefix + `Loaded ${entities.length} entities from file`);
    return entities;
  }

  resetFilter(value?: any, opts?: { emitEvent: boolean }) {
    super.resetFilter(value, opts);
    this.namedFilterSelector?.form.reset(null);
  }

  referentialToString = referentialToString;

  /* -- protected methods -- */

  protected asFilter(source?: any): F {
    source = source || this.filterForm.value;

    if (this._dataSource && this._dataSource.dataService) {
      return this._dataSource.dataService.asFilter(source);
    }

    return source as F;
  }

  protected async restoreFilterOrLoad(opts?: { emitEvent?: boolean; sources?: AppRootTableFilterRestoreSource[] }) {
    this.markAsLoading();

    console.debug(`${this.logPrefix}restoreFilterOrLoad()`, opts);
    const json = this.loadFilter(opts?.sources);

    if (json) {
      // Force offline, if no network AND has offline feature
      this.hasOfflineMode = (json.synchronizationStatus && json.synchronizationStatus !== 'SYNC') || (await this._dataService.hasOfflineData());
      if (this.network.offline && this.hasOfflineMode) {
        json.synchronizationStatus = 'DIRTY';
      }

      this.setFilter(json, { emitEvent: true });
    } else {
      // has offline feature
      this.hasOfflineMode = await this._dataService.hasOfflineData();

      if (!opts || opts.emitEvent !== false) {
        this.onRefresh.emit();
      }
    }
  }

  setFilter(filter: Partial<F>, opts?: { emitEvent: boolean }) {
    // Program
    this.programLabel = filter?.program?.label || null;

    super.setFilter(filter as F, opts);
  }

  patchFilter(filter: Partial<F>, opts?: { emitEvent: boolean }) {
    super.setFilter(<F>{ ...this.filter, ...filter }, opts);
  }

  protected async checkUpdateOfflineNeed() {
    let needUpdate = false;

    // If online
    if (this.network.online) {
      // Get last synchro date
      const lastSynchronizationDate = this.settings.getOfflineFeatureLastSyncDate(this.featureName);

      // Check only if last synchro older than 10 min
      if (lastSynchronizationDate && lastSynchronizationDate.isBefore(moment().add(-10, 'minute'))) {
        // Get peer last update date, then compare
        const remoteUpdateDate = await this._dataService.lastUpdateDate();
        if (isNotNil(remoteUpdateDate)) {
          // Compare dates, to known if an update if need
          needUpdate = lastSynchronizationDate.isBefore(remoteUpdateDate);
        }

        console.info(
          `[root-table] Checking referential last update dates: {local: '${toDateISOString(lastSynchronizationDate)}', remote: '${toDateISOString(remoteUpdateDate)}'} - Need upgrade: ${needUpdate}`
        );
      }
    }

    // Update the view
    if (this.needUpdateOfflineFeature !== needUpdate) {
      this.needUpdateOfflineFeature = needUpdate;

      this.markForCheck();
    }
  }

  protected getJsonEncoding(): string {
    const key = 'FILE.JSON.ENCODING';
    const encoding = this.translate.instant(key);
    if (encoding !== key) return encoding;
    return 'UTF-8'; // Default encoding
  }

  protected uploadJsonFile(file: File): Observable<FileEvent<T[]>> {
    console.info(this.logPrefix + `Importing JSON file ${file.name}...`);

    const encoding = this.getJsonEncoding();

    return FilesUtils.readAsText(file, encoding).pipe(
      map((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const loaded = Math.round(event.loaded * 0.8);
          return { ...event, loaded };
        } else if (event instanceof FileResponse) {
          console.debug(this.logPrefix + 'File content: \n' + event.body);
          try {
            const data = JSON.parse(event.body);
            if (Array.isArray(data)) {
              return new FileResponse<T[]>({ body: data });
            }
            return new FileResponse<T[]>({ body: [data] });
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

  protected async openNewRowDetail(event?: any): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onNewRow.observed) {
      this.onNewRow.emit(event);
      return true;
    }

    return this.navController.navigateForward(`${this.router.url}/new`, {
      // Pass the tableId, to be able to use search field as defaults
      queryParams: this.settingsId && { tableId: this.settingsId },
    });
  }

  protected async loadProgram(programLabel?: string, filter?: Partial<ProgramFilter>): Promise<Program | undefined> {
    filter = filter ?? this.autocompleteFields.program?.filter;
    if (isNotNilOrBlank(programLabel)) {
      return this.programRefService.loadByLabel(programLabel);
    }
    // Check if user can access more than one program
    const { data, total } = await this.programRefService.loadAll(
      0,
      1,
      null,
      null,
      {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        ...filter,
      },
      { withTotal: true }
    );

    if (isNotEmptyArray(data) && total === 1) {
      return data[0];
    }

    return null;
  }

  protected async setProgram(program: Program) {
    if (!program?.label) throw new Error('Invalid program');
    console.debug(`${this.logPrefix}Init using program`, program);

    // I18n suffix
    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nColumnSuffix = i18nSuffix;
  }

  protected async resetProgram() {
    console.debug(`${this.logPrefix}Reset filter program`);
    this.i18nColumnSuffix = '';
    this.markForCheck();
  }

  protected excludeNotQualified(qualityFlag: ReferentialRef): boolean {
    return qualityFlag?.id !== QualityFlagIds.NOT_QUALIFIED;
  }

  protected async loadQualityFlags() {
    const items = await this.referentialRefService.loadQualityFlags();
    this.qualityFlags = items;
    this.qualityFlagsById = splitByProperty(items, 'id');
  }
}
