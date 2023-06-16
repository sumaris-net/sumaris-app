import { Directive, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { TableElement } from '@e-is/ngx-material-table';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import {
  Alerts,
  AppFormUtils,
  Entity,
  EntityFilter,
  filterNotNil,
  firstNotNilPromise,
  firstTrue,
  IEntitiesService,
  InMemoryEntitiesService,
  isNil,
  isNotEmptyArray,
  isNotNil,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  toNumber,
  WaitForOptions
} from '@sumaris-net/ngx-components';
import { IEntityWithMeasurement, MeasurementValuesUtils } from '../services/model/measurement.model';
import { AcquisitionLevelType } from '@app/referential/services/model/model.enum';
import { IPmfm, PMFM_ID_REGEXP, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { distinctUntilChanged, filter, map, mergeMap } from 'rxjs/operators';
import { AppBaseTable, BaseTableConfig } from '@app/shared/table/base.table';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { MeasurementsTableEntitiesService } from './measurements-table.service';
import { MeasurementsTableValidatorOptions, MeasurementsTableValidatorService } from './measurements-table.validator';


export interface BaseMeasurementsTableConfig<
  T extends IEntityWithMeasurement<T>>
  extends BaseTableConfig<T> {

  onRowCreated?: undefined; // IMPORTANT: leave 'undefined'. subclasses should use onPrepareRowForm instead
  reservedStartColumns?: string[];
  reservedEndColumns?: string[];
  onPrepareRowForm?: (form: UntypedFormGroup) => void | Promise<void>;
  mapPmfms?: (pmfms: IPmfm[]) => IPmfm[] | Promise<IPmfm[]>;
  requiredStrategy?: boolean;
  requiredGear?: boolean;
  i18nPmfmPrefix?: string;
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class BaseMeasurementsTable<
  T extends IEntityWithMeasurement<T>,
  F extends EntityFilter<any, T, any>,
  S extends IEntitiesService<T, F> = IEntitiesService<T, F>,
  V extends BaseValidatorService<T, number, VO> = any,
  O extends BaseMeasurementsTableConfig<T> = BaseMeasurementsTableConfig<T>,
  VO = any,
  MS extends MeasurementsTableEntitiesService<T, F, S> = MeasurementsTableEntitiesService<T, F, S>,
  MV extends MeasurementsTableValidatorService<T, V, number, VO> = MeasurementsTableValidatorService<T, V, number, VO>
  >
  extends AppBaseTable<T, F, MS, MV, number, O>
  implements OnInit, OnDestroy {

  private _programLabel: string;
  private _autoLoadAfterPmfm = true;
  private _addingRow = false

  protected _acquisitionLevel: AcquisitionLevelType = null;
  protected _strategyLabel: string = null;
  protected _gearId: number = null;
  protected programRefService: ProgramRefService;
  protected pmfmNamePipe: PmfmNamePipe;
  protected formBuilder: UntypedFormBuilder;

  //protected readonly $measurementValuesFormGroupConfig = new BehaviorSubject<{ [key: string]: any }>(null);
  i18nPmfmPrefix: string = null;

  readonly hasRankOrder: boolean;
  readonly hasPmfms$ = this.$pmfms.pipe(
    filter(isNotNil),
    map(isNotEmptyArray),
    distinctUntilChanged()
  );

  /**
   * Allow to override the rankOrder. See physical-gear, on ADAP program
   */
  @Input() canEditRankOrder = false;

  @Input()
  set programLabel(value: string) {
    this._programLabel = value;
    if (this._dataService) {
      this._dataService.programLabel = value;
    }
  }

  get programLabel(): string {
    return this._programLabel;
  }

  @Input()
  set acquisitionLevel(value: AcquisitionLevelType) {
    this._acquisitionLevel = value;
    if (this._dataService) {
      this._dataService.acquisitionLevel = value;
    }
  }

  get acquisitionLevel(): AcquisitionLevelType {
    return this._acquisitionLevel;
  }

  @Input()
  set strategyLabel(value: string) {
    this._strategyLabel = value;
    if (this._dataService) {
      this._dataService.strategyLabel = value;
    }
  }

  get strategyLabel(): string {
    return this._strategyLabel;
  }


  @Input() set requiredStrategy(value: boolean) {
    this.options.requiredStrategy = value;
    if (this._dataService) {
      this._dataService.requiredStrategy = value;
    }
  }

  get requiredStrategy(): boolean {
    return this.options.requiredStrategy;
  }

  @Input() set requiredGear(value: boolean) {
    this.options.requiredGear = value;
    if (this._dataService) {
      this._dataService.requiredGear = value;
    }
  }

  get requiredGear(): boolean {
    return this.options.requiredGear;
  }

  @Input() set gearId(value: number) {
    if (this._gearId !== value) {
      this._gearId = value;
      this._dataService.gearId = this._gearId;
    }
  }

  get gearId(): number {
    return this._gearId;
  }

  @Input()
  set showCommentsColumn(value: boolean) {
    this.setShowColumn('comments', value);
  }

  get showCommentsColumn(): boolean {
    return this.getShowColumn('comments');
  }

  @Input() set $pmfms(pmfms: Observable<IPmfm[]>) {
    this._dataService.$pmfms = pmfms;
  }

  get $pmfms(): Observable<IPmfm[]> {
    return this._dataService.$pmfms;
  }

  get pmfms(): IPmfm[] {
    return this._dataService.pmfms;
  }

  @Input() set pmfms(pmfms: IPmfm[]) {
    this._dataService.pmfms = pmfms;
  }

  get hasPmfms(): boolean {
    return isNotEmptyArray(this.pmfms);
  }

  set dataService(value: S) {
    if (this._dataService.delegate !== value) {
      console.warn('TODO: check if \'get dataService()\' is need', new Error());
      this._dataService.delegate = value;
      if (!this.loading) {
        this.onRefresh.emit("new dataService");
      }
    }
  }

  get loading(): boolean {
    return super.loading || this._dataService.loading;
  }

  protected constructor(
    injector: Injector,
    dataType: new() => T,
    filterType: new() => F,
    dataService?: S,
    validatorService?: V,
    options?: O
  ) {
    super(injector,
      dataType, filterType,
      // Columns:
      (options?.reservedStartColumns || [])
        .concat(options?.reservedEndColumns || []),
      // Use a decorator data service
      new MeasurementsTableEntitiesService(injector, dataType, dataService, {
        mapPmfms: options?.mapPmfms || undefined,
        requiredStrategy: options?.requiredStrategy,
        debug: options?.debug || false
      }) as MS,
      // Use a specific decorator validator
      validatorService ? new MeasurementsTableValidatorService(injector, validatorService) as MV : null,
      {
        ...options,
        // IMPORTANT: Always use our private function onRowCreated()
        onRowCreated: (row) => this._onRowCreated(row)
      }
    );
    this.memoryDataService = (dataService instanceof InMemoryEntitiesService)
      ? dataService as InMemoryEntitiesService<T, F, number> : null;
    this.programRefService = injector.get(ProgramRefService);
    this.pmfmNamePipe = injector.get(PmfmNamePipe);
    this.formBuilder = injector.get(UntypedFormBuilder);
    this.defaultPageSize = -1; // Do not use paginator
    this.hasRankOrder = Object.getOwnPropertyNames(new dataType()).findIndex(key => key === 'rankOrder') !== -1;
    this.markAsLoaded({emitEvent: false});
    this.i18nPmfmPrefix = options?.i18nPmfmPrefix;
    this.defaultSortBy = 'id';
    this.defaultSortDirection = 'asc';
    this.canEdit = true;

    // For DEV only
    //this.debug = !environment.production;
    this.logPrefix = '[measurements-table] ';
  }

  ngOnInit() {
    // Remember the value of autoLoad, but force to false, to make sure pmfm will be loaded before
    this._autoLoadAfterPmfm = this.autoLoad;
    this.autoLoad = false;
    this.i18nPmfmPrefix = this.i18nPmfmPrefix || this.i18nColumnPrefix;
    this.keepEditedRowOnSave = !this.mobile && this.inlineEdition
      // Disable keepEditedRowOnSave, when in memory data service, because rows are reload twice after save - FIXME
      && !this.memoryDataService;

    this._dataService.programLabel = this._programLabel;
    this._dataService.requiredStrategy = this.options.requiredStrategy || false;
    this._dataService.strategyLabel = this._strategyLabel;
    this._dataService.requiredGear = this.options.requiredGear || false;
    this._dataService.gearId = this._gearId;
    this._dataService.acquisitionLevel = this._acquisitionLevel;

    this.registerSubscription(
      firstTrue(this.readySubject)
        .pipe(
          mergeMap(_ => {
            console.debug(this.logPrefix + 'Starting measurements data service...');
            return this._dataService.start();
          })
        ).subscribe());

    super.ngOnInit();

    this.registerSubscription(
      filterNotNil(this.$pmfms)
        .subscribe(pmfms => {
           console.debug(this.logPrefix + "Received PMFMs to applied: ", pmfms);

          if (this.validatorService) {
            this.configureValidator({pmfms});
            this.validatorService.markAsReady();
          }

          // Update the settings id, as program could have changed
          this.settingsId = this.generateTableId();

          // Add pmfm columns
          this.updateColumns();

          // Load (if autoLoad was enabled)
          if (this._autoLoadAfterPmfm) {
            this.onRefresh.emit();
            this._autoLoadAfterPmfm = false; // Avoid new execution
          }
          // Or reload, only if pristine (to avoid to lost not saved data)
          else if (this.dataSource.loaded && !this.dirty){
            this.onRefresh.emit();
          }
        }));

    // Listen row edition
    if (this.inlineEdition) {
      this.registerSubscription(this.onStartEditingRow
        .subscribe(row => this._onRowEditing(row))
      );
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._dataService?.stop();
  }

  protected configureValidator(opts?: MeasurementsTableValidatorOptions) {
    // make sure to confirm editing row, before to change validator
    this.confirmEditCreate();

    // Update validator config
    if (opts) {
      this.validatorService.measurementsOptions = opts;
    }
  }

  setFilter(filterData: F, opts?: { emitEvent: boolean }) {
    opts = opts || {emitEvent: !this.loading};
    super.setFilter(filterData, opts);
  }

  trackByFn(index: number, row: TableElement<T>): any {
    return row.id;
  }

  protected generateTableId(): string {
    // Append the program, if any
    return super.generateTableId() + (isNotNil(this._programLabel) ? ('-' + this._programLabel) : '');
  }

  protected getDisplayColumns(): string[] {

    const pmfms = this.pmfms;
    if (!pmfms) return this.columns;

    const userColumns = this.getUserColumns();

    const pmfmColumnNames = pmfms
      //.filter(p => p.isMandatory || !userColumns || userColumns.includes(p.pmfmId.toString()))
      .filter(p => !p.hidden)
      .map(p => p.id.toString());

    const startColumns = (this.options && this.options.reservedStartColumns || []).filter(c => !userColumns || userColumns.includes(c));
    const endColumns = (this.options && this.options.reservedEndColumns || []).filter(c => !userColumns || userColumns.includes(c));

    return RESERVED_START_COLUMNS
      .concat(startColumns)
      .concat(pmfmColumnNames)
      .concat(endColumns)
      .concat(RESERVED_END_COLUMNS)
      // Remove columns to hide
      .filter(column => !this.excludesColumns.includes(column));

    // DEBUG
    //console.debug("[measurement-table] Updating columns: ", this.displayedColumns)
    //if (!this.loading) this.markForCheck();
  }


  setShowColumn(columnName: string, show: boolean) {
    super.setShowColumn(columnName, show, {emitEvent: false});

    if (!this.loading) this.updateColumns();
  }

  async ready(opts?: WaitForOptions) {
    opts = {
      stop: this.destroySubject,
      ...opts
    }
    await Promise.all([
      super.ready(opts),
      this.validatorService ? this.validatorService.ready(opts) :  firstNotNilPromise(this.$pmfms, opts)
    ]);
  }

  /**
   * Use in ngFor, for trackBy
   * @param index
   * @param pmfm
   */
  trackPmfmFn(index: number, pmfm: IPmfm): any {
    return toNumber(pmfm?.id, index);
  }

  translateControlPath(path: string): string {
    if (path.startsWith('measurementValues.')) {
      const pmfmId = parseInt(path.split('.')[1]);
      const pmfm = (this.pmfms || []).find(p => p.id === pmfmId);
      if (pmfm) return PmfmUtils.getPmfmName(pmfm);
    }
    return super.translateControlPath(path);
  }

  /**
   * Convert (or clone) a row currentData, into <T> instance (that extends Entity)
   * @param row
   * @param clone
   */
  toEntity(row: TableElement<T>, clone?: boolean): T {
    // If no validator, use currentData
    const currentData = row.currentData;

    // Already an entity (e.g. when no validator used): use it
    if (currentData instanceof Entity) {
      return (currentData && clone === true ? currentData.clone() : currentData) as T;
    }

    // If JSON object (e.g. when using validator): create a new entity
    else {
      const target = new this.dataType();
      target.fromObject(currentData);
      return target;
    }
  }

  duplicateRow(event?: Event, row?: TableElement<T>, opts?: {
    skipProperties?: string[];
  }): Promise<boolean> {
    const skipProperties = opts && opts.skipProperties
      || ['id', 'rankOrder', 'updateDate', 'creationDate', 'label'].concat(this.hasRankOrder ? ['rankOrder'] : []);
    return super.duplicateRow(event, row, {...opts, skipProperties});
  }

  async waitIdle(opts?: WaitForOptions): Promise<void> {
    await Promise.all([
      super.waitIdle(opts),
      // Waiting PMFMS to be loaded
      this._dataService.waitIdle(opts)
    ]);
  }

  /* -- protected methods -- */

  protected updateColumns() {
    if (!this.pmfms) return; // skip
    super.updateColumns();
  }

  // Can be override by subclass
  protected async onNewEntity(data: T): Promise<void> {
    await super.onNewEntity(data);

    if (this.hasRankOrder && isNil(data.rankOrder)) {
      data.rankOrder = (await this.getMaxRankOrder()) + 1;
    }
  }

  protected async getMaxRankOrder(): Promise<number> {
    const rows = this.dataSource.getRows();
    return rows.reduce((res, row) => Math.max(res, row.currentData.rankOrder || 0), 0);
  }

  protected async existsRankOrder(rankOrder: number, excludedRows?: TableElement<T>[]): Promise<boolean> {
    const rows = this.dataSource.getRows();
    return rows.some(row => (!excludedRows || !excludedRows.includes(row)) && row.currentData.rankOrder === rankOrder);
  }

  protected async canAddEntity(data: T): Promise<boolean> {
    // Before using the given rankOrder, check if not already exists
    if (this.canEditRankOrder && isNotNil(data.rankOrder)) {
      if (await this.existsRankOrder(data.rankOrder)) {
        const message = this.translate.instant('TRIP.MEASUREMENT.ERROR.DUPLICATE_RANK_ORDER', data);
        await Alerts.showError(message, this.alertCtrl, this.translate);
        return false;
      }
    }
    return true;
  }

  protected async canUpdateEntity(data: T, row: TableElement<T>): Promise<boolean> {
    // Before using the given rankOrder, check if not already exists
    if (this.canEditRankOrder && isNotNil(data.rankOrder)) {
      if (await this.existsRankOrder(data.rankOrder, [row])) {
        const message = this.translate.instant('TRIP.MEASUREMENT.ERROR.DUPLICATE_RANK_ORDER', data);
        await Alerts.showError(message, this.alertCtrl, this.translate);
        return false;
      }
    }
    return true;
  }

  /**
   * Insert an entity into the table. This can be useful when entity is created by a modal (e.g. BatchGroupTable).
   *
   * If hasRankOrder=true, then rankOrder is computed only once.
   * Will call method normalizeEntityToRow().
   * The new row will be the edited row.
   *
   * @param data the entity to insert.
   * @param opts
   */
  protected async addEntityToTable(data: T, opts?: { confirmCreate?: boolean; editing?: boolean; emitEvent?: boolean; }): Promise<TableElement<T>> {

    // Check entity can be added
    const canAdd = await this.canAddEntity(data);
    if (!canAdd) {
      console.warn(this.logPrefix + "Cannot add entity to table");
      return undefined;
    }

    if (this._addingRow) {
      console.warn(this.logPrefix + "Skipping addEntityToTable(). Another add is in progress.");
      return;
    }
    this._addingRow = true;

    try {

      // Create a row
      const row = await this.addRowToTable(null, {editing: opts?.editing, emitEvent: opts?.emitEvent});
      if (!row) throw new Error("Could not add row to table");

      // Override rankOrder (with a computed value)
      if (this.hasRankOrder
        // Do NOT override if can edit it and set
        && (!this.canEditRankOrder || isNil(data.rankOrder))) {
        data.rankOrder = row.currentData.rankOrder;
      }

      await this.onNewEntity(data);

      // Adapt measurement values to row
      this.normalizeEntityToRow(data, row);

      // Set row's data
      row.currentData = data;

      if (row.editing) {
        // Confirm the created row
        if (!opts || opts.confirmCreate !== false) {
          if (row.pending) {
            await AppFormUtils.waitWhilePending(row.validator);
          }
          const confirmed = this.confirmEditCreate(null, row);
          this.editedRow = confirmed ? null : row /*confirmation failed*/;
        }
        // Keep editing
        else {
          this.editedRow = row;
        }
      }
      else if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }

      this.markAsDirty({emitEvent: false});

      return row;
    }
    catch(err) {
      console.error(this.logPrefix + 'Error in addEntityToTable: ', err);
      throw err;
    }
    finally {
      this._addingRow = false;
    }
  }

  /**
   * Update an row, using the given entity. Useful when entity is updated using a modal (e.g. BatchGroupModal)
   *
   * The updated row will be the edited row.
   * Will call method normalizeEntityToRow()
   *
   * @param data the input entity
   * @param row the row to update
   * @param opts
   */
  protected updateEntityToTable(data: T, row: TableElement<T>, opts?: { confirmEdit?: boolean; }): Promise<TableElement<T>> {
    return super.updateEntityToTable(data, row, opts);
  }

  protected getI18nColumnName(columnName: string): string {

    // Try to resolve PMFM column, using the cached pmfm list
    if (PMFM_ID_REGEXP.test(columnName)) {
      const pmfmId = parseInt(columnName);
      const pmfm = (this.pmfms || []).find(p => p.id === pmfmId);
      if (pmfm) return this.getI18nPmfmName(pmfm);
    }

    return super.getI18nColumnName(columnName);
  }

  protected getI18nPmfmName(pmfm: IPmfm) {
    if (pmfm) return this.pmfmNamePipe.transform(pmfm, {
      i18nPrefix: this.i18nPmfmPrefix,
      i18nContext: this.i18nColumnSuffix
    });
  }

  protected normalizeEntityToRow(data: T, row: TableElement<T>, opts?: {
    keepOtherExistingPmfms?: boolean;
    onlyExistingPmfms?: boolean;
  }) {
    if (!data) return; // skip

    // Adapt entity measurement values to reactive form
    MeasurementValuesUtils.normalizeEntityToForm(data, this.pmfms || [], row.validator, opts);
  }

  /* -- private function -- */

  /**
   * /!\ do NOT override this function. Use onPrepareRowForm instead
   * @param row
   * @private
   */
  private async _onRowCreated(row: TableElement<T>) {

    // WARN: must be called BEFORE row.validator.patchValue(), to be able to add group's validators
    if (row.validator && this.options.onPrepareRowForm) {
      await this.options.onPrepareRowForm(row.validator);
    }

    if (this._addingRow) return; // Skip if already adding a row (e.g. when calling addEntityToTable)

    this._addingRow = true;
    try {
      const data = row.currentData; // if validator enable, this will call a getter function

      await this.onNewEntity(data);

      // Normalize measurement values
      this.normalizeEntityToRow(data, row);

      // Set row data
      if (row.validator) {
        row.validator.patchValue(data);
      }
      else {
        row.currentData = data;
      }

      this.markForCheck();
    }
    finally {
      this._addingRow = false;
    }
  }

  private async _onRowEditing(row: TableElement<T>) {
    if (row.id === -1) return; // Skip new row, because already processed by onRowCreated()

    if (row.validator && this.options.onPrepareRowForm) {
      await this.options.onPrepareRowForm(row.validator);
    }
  }
}

