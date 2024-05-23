import { Directive, inject, Injector, Input, OnDestroy, OnInit } from '@angular/core';
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
  WaitForOptions,
} from '@sumaris-net/ngx-components';
import { IEntityWithMeasurement, MeasurementValuesUtils } from './measurement.model';
import { AcquisitionLevelType } from '@app/referential/services/model/model.enum';
import { IPmfm, PMFM_ID_REGEXP, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { mergeMap } from 'rxjs/operators';
import { AppBaseTable, BaseTableConfig } from '@app/shared/table/base.table';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { MeasurementsTableEntitiesService } from './measurements-table.service';
import { MeasurementsTableValidatorOptions, MeasurementsTableValidatorService } from './measurements-table.validator';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';

export interface BaseMeasurementsTableState {
  programLabel: string;
  acquisitionLevel: AcquisitionLevelType;
  requiredStrategy: boolean;
  strategyLabel: string;
  strategyId: number;
  requiredGear: boolean;
  gearId: number;

  initialPmfms: IPmfm[];
  filteredPmfms: IPmfm[];
  hasPmfms: boolean;
}

export interface BaseMeasurementsTableConfig<T extends IEntityWithMeasurement<T>, ST extends BaseMeasurementsTableState = BaseMeasurementsTableState>
  extends BaseTableConfig<T, number, ST> {
  onRowCreated?: undefined; // IMPORTANT: leave 'undefined'. subclasses should use onPrepareRowForm instead
  reservedStartColumns?: string[];
  reservedEndColumns?: string[];
  onPrepareRowForm?: (form: UntypedFormGroup) => void | Promise<void>;
  mapPmfms?: (pmfms: IPmfm[]) => IPmfm[] | Promise<IPmfm[]>;
  i18nPmfmPrefix?: string;
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class BaseMeasurementsTable<
    T extends IEntityWithMeasurement<T>,
    F extends EntityFilter<any, T, any>,
    S extends IEntitiesService<T, F> = IEntitiesService<T, F>,
    V extends BaseValidatorService<T, number, VO> = any,
    ST extends BaseMeasurementsTableState = BaseMeasurementsTableState,
    O extends BaseMeasurementsTableConfig<T, ST> = BaseMeasurementsTableConfig<T, ST>,
    VO = any,
    MS extends MeasurementsTableEntitiesService<T, F, S> = MeasurementsTableEntitiesService<T, F, S>,
    MV extends MeasurementsTableValidatorService<T, V, number, VO> = MeasurementsTableValidatorService<T, V, number, VO>,
  >
  extends AppBaseTable<T, F, MS, MV, number, ST, O>
  implements OnInit, OnDestroy
{
  private _autoLoadAfterPmfm = true;
  private _addingRow = false;

  protected generateTableIdWithProgramLabel = true;

  protected readonly programRefService = inject(ProgramRefService);
  protected readonly pmfmNamePipe = inject(PmfmNamePipe);
  protected readonly formBuilder = inject(UntypedFormBuilder);
  @RxStateSelect() protected programLabel$: Observable<string>;
  @RxStateSelect() protected acquisitionLevel$: Observable<AcquisitionLevelType>;
  @RxStateSelect() protected initialPmfms$: Observable<IPmfm[]>;
  @RxStateSelect() protected filteredPmfms$: Observable<IPmfm[]>;
  @RxStateSelect() hasPmfms$: Observable<boolean>;

  @RxStateProperty() protected initialPmfms: IPmfm[];
  @RxStateProperty() protected filteredPmfms: IPmfm[];

  readonly hasRankOrder: boolean;

  /**
   * Allow to override the rankOrder. See physical-gear, on ADAP program
   */
  @Input() canEditRankOrder = false;
  @Input() compactFields = true;
  @Input() i18nPmfmPrefix: string;

  @Input()
  @RxStateProperty()
  programLabel: string;

  @Input()
  @RxStateProperty()
  acquisitionLevel: AcquisitionLevelType;

  @Input()
  @RxStateProperty()
  strategyLabel: string;

  @Input()
  @RxStateProperty()
  strategyId: number;

  @Input()
  @RxStateProperty()
  requiredStrategy: boolean;

  @Input()
  @RxStateProperty()
  requiredGear: boolean;

  @Input()
  @RxStateProperty()
  gearId: number;

  @Input()
  set showCommentsColumn(value: boolean) {
    this.setShowColumn('comments', value);
  }

  get showCommentsColumn(): boolean {
    return this.getShowColumn('comments');
  }

  @RxStateProperty() hasPmfms: boolean;

  @Input() set pmfms(values: IPmfm[]) {
    this.initialPmfms = values;
  }
  get pmfms(): IPmfm[] {
    return this.filteredPmfms;
  }

  get pmfms$(): Observable<IPmfm[]> {
    return this.filteredPmfms$;
  }

  set dataService(value: S) {
    if (this._dataService.delegate !== value) {
      this._dataService.delegate = value;
      if (!this.loading) {
        this.onRefresh.emit('new dataService');
      }
    }
  }

  get dataService(): S {
    return this._dataService.delegate;
  }

  get loading(): boolean {
    return super.loading || this._dataService.loading || false;
  }

  get loaded(): boolean {
    return super.loaded && !this._dataService.loading;
  }

  protected constructor(injector: Injector, dataType: new () => T, filterType: new () => F, dataService?: S, validatorService?: V, options?: O) {
    super(
      injector,
      dataType,
      filterType,
      // Columns:
      (options?.reservedStartColumns || []).concat(options?.reservedEndColumns || []),
      // Use a decorator data service
      new MeasurementsTableEntitiesService(injector, dataType, dataService, {
        mapPmfms: options?.mapPmfms || undefined,
        requiredStrategy: options?.initialState?.requiredStrategy,
        requiredGear: options?.initialState?.requiredGear,
        debug: options?.debug || false,
      }) as MS,
      // Use a specific decorator validator
      validatorService ? (new MeasurementsTableValidatorService(injector, validatorService) as MV) : null,
      {
        ...options,
        // IMPORTANT: Always use our private function onRowCreated()
        onRowCreated: (row: TableElement<T>) => this._onRowCreated(row),
      }
    );
    this.memoryDataService = dataService instanceof InMemoryEntitiesService ? (dataService as InMemoryEntitiesService<T, F, number>) : null;
    this.defaultPageSize = -1; // Do not use paginator
    this.hasRankOrder = Object.getOwnPropertyNames(new dataType()).findIndex((key) => key === 'rankOrder') !== -1;
    this.markAsLoaded({ emitEvent: false });
    this.i18nPmfmPrefix = options?.i18nPmfmPrefix;
    this.defaultSortBy = 'id';
    this.defaultSortDirection = 'asc';
    this.canEdit = true;

    // Copy some properties to the dataService
    this._state.hold(
      this._state.select(['programLabel', 'acquisitionLevel', 'requiredStrategy', 'strategyId', 'strategyLabel', 'requiredGear', 'gearId'], (s) => s),
      (state) => {
        // DEBUG
        //console.debug(this.logPrefix + 'Updating measurement-service state:', state);

        this._dataService.set(state);
      }
    );

    const requiredGear = options?.initialState?.requiredGear === true;
    this._state.set(<Partial<ST>>{
      strategyId: null,
      strategyLabel: null,
      requiredGear,
      gearId: requiredGear ? undefined : null,
      ...options?.initialState,
    });

    // Pmfms
    this._state.connect('filteredPmfms', this._dataService.pmfms$);
    this._state.hold(this.initialPmfms$, (pmfms) => {
      this._dataService.pmfms = pmfms;
    });
    this._state.hold(this.filteredPmfms$, (pmfms) => {
      this.hasPmfms = isNotEmptyArray(pmfms);
    });

    // For DEV only
    //this.debug = !environment.production;
    this.logPrefix = '[measurements-table] ';
  }

  ngOnInit() {
    // Remember the value of autoLoad, but force to false, to make sure pmfm will be loaded before
    this._autoLoadAfterPmfm = this.autoLoad;
    this.autoLoad = false;
    this.i18nPmfmPrefix = this.i18nPmfmPrefix || this.i18nColumnPrefix;
    this.keepEditedRowOnSave =
      !this.mobile &&
      this.inlineEdition &&
      // Disable keepEditedRowOnSave, when in memory data service, because rows are reload twice after save - FIXME
      !this.memoryDataService;

    this.registerSubscription(
      firstTrue(this.readySubject)
        .pipe(
          mergeMap((_) => {
            console.debug(this.logPrefix + 'Starting measurements data service...');
            return this._dataService.start();
          })
        )
        .subscribe()
    );

    super.ngOnInit();

    this.registerSubscription(
      filterNotNil(this.pmfms$).subscribe((pmfms) => {
        console.debug(this.logPrefix + 'Received PMFMs to applied: ', pmfms);

        if (this.validatorService) {
          this.configureValidator({ pmfms });
          this.validatorService.markAsReady();
        }

        // Update the settings id, as program could have changed
        if (this.generateTableIdWithProgramLabel) {
          this.settingsId = this.generateTableId();
        }

        // Add pmfm columns
        this.updateColumns();

        // Load (if autoLoad was enabled)
        if (this._autoLoadAfterPmfm) {
          this.onRefresh.emit();
          this._autoLoadAfterPmfm = false; // Avoid new execution
        }
        // Or reload, only if pristine (to avoid to lost not saved data)
        else if (this.dataSource.loaded && !this.dirty) {
          this.onRefresh.emit();
        }
      })
    );

    if (this.generateTableIdWithProgramLabel) {
      this._state.hold(this.programLabel$, () => {
        // Update the settings id, as program could have changed
        this.settingsId = this.generateTableId();
        this.restoreCompactMode();
      });
    }

    // Listen row edition
    this.registerSubscription(this.onStartEditingRow.subscribe((row) => this._onRowEditing(row)));
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._dataService?.stop();
  }

  restoreCompactMode(opts?: { emitEvent?: boolean }) {
    if (!this.programLabel) return;
    super.restoreCompactMode(opts);
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
    opts = opts || { emitEvent: !this.loading };
    super.setFilter(filterData, opts);
  }

  trackByFn(index: number, row: TableElement<T>): any {
    return row.id;
  }

  protected generateTableId(): string {
    if (this.generateTableIdWithProgramLabel) {
      // Append the program, if any
      return [super.generateTableId(), this.programLabel].filter(isNotNil).join('-');
    }
    return super.generateTableId();
  }

  protected getDisplayColumns(): string[] {
    const pmfms = this.pmfms;

    // Remove columns to hide
    if (!pmfms) return this.columns.filter((column) => !this.excludesColumns.includes(column));

    // DEBUG
    console.debug(this.logPrefix + 'Updating display columns...');

    const userColumns = this.getUserColumns();

    const pmfmColumnNames = pmfms
      //.filter(p => p.isMandatory || !userColumns || userColumns.includes(p.pmfmId.toString()))
      .filter((p) => !p.hidden)
      .map((p) => p.id.toString());

    const startColumns = (this.options?.reservedStartColumns || []).filter((c) => !userColumns || userColumns.includes(c));
    const endColumns = (this.options?.reservedEndColumns || []).filter((c) => !userColumns || userColumns.includes(c));

    return (
      RESERVED_START_COLUMNS.concat(startColumns)
        .concat(pmfmColumnNames)
        .concat(endColumns)
        .concat(RESERVED_END_COLUMNS)
        // Remove columns to hide
        .filter((column) => !this.excludesColumns.includes(column))
    );

    // DEBUG
    //console.debug("[measurement-table] Updating columns: ", this.displayedColumns)
    //if (!this.loading) this.markForCheck();
  }

  setShowColumn(columnName: string, show: boolean, opts?: { emitEvent?: boolean }) {
    super.setShowColumn(columnName, show, { emitEvent: false });

    if (!this.loading && opts?.emitEvent !== false) this.updateColumns();
  }

  async ready(opts?: WaitForOptions) {
    opts = {
      stop: this.destroySubject,
      ...opts,
    };
    await Promise.all([super.ready(opts), this.validatorService ? this.validatorService.ready(opts) : firstNotNilPromise(this.pmfms$, opts)]);
  }

  /**
   * Use in ngFor, for trackBy
   *
   * @param index
   * @param pmfm
   */
  trackPmfmFn(index: number, pmfm: IPmfm): any {
    return toNumber(pmfm?.id, index);
  }

  translateControlPath(path: string): string {
    if (path.startsWith('measurementValues.')) {
      const pmfmId = parseInt(path.split('.')[1]);
      const pmfm = (this.pmfms || []).find((p) => p.id === pmfmId);
      if (pmfm) return PmfmUtils.getPmfmName(pmfm);
    }
    return super.translateControlPath(path);
  }

  /**
   * Convert (or clone) a row currentData, into <T> instance (that extends Entity)
   *
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

  duplicateRow(
    event?: Event,
    row?: TableElement<T>,
    opts?: {
      skipProperties?: string[];
    }
  ): Promise<boolean> {
    const skipProperties =
      (opts && opts.skipProperties) || ['id', 'rankOrder', 'updateDate', 'creationDate', 'label'].concat(this.hasRankOrder ? ['rankOrder'] : []);
    return super.duplicateRow(event, row, { ...opts, skipProperties });
  }

  async waitIdle(opts?: WaitForOptions): Promise<void> {
    await Promise.all([
      super.waitIdle(opts),
      // Waiting PMFMS to be loaded
      this._dataService.waitIdle(opts),
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

  protected async getMaxRankOrder(data?: T[]): Promise<number> {
    data = data || this.dataSource.getData() || [];
    return Math.max(0, ...data.map((entity) => entity.rankOrder || 0));
  }

  protected async existsRankOrder(rankOrder: number, excludedRows?: TableElement<T>[]): Promise<boolean> {
    const rows = this.dataSource.getRows();
    return rows.some((row) => (!excludedRows || !excludedRows.includes(row)) && row.currentData.rankOrder === rankOrder);
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
  protected async addEntityToTable(data: T, opts?: { confirmCreate?: boolean; editing?: boolean; emitEvent?: boolean }): Promise<TableElement<T>> {
    // Check entity can be added
    const canAdd = await this.canAddEntity(data);
    if (!canAdd) {
      console.warn(this.logPrefix + 'Cannot add entity to table');
      return undefined;
    }

    if (this._addingRow) {
      console.warn(this.logPrefix + 'Skipping addEntityToTable(). Another add is in progress.');
      return;
    }
    this._addingRow = true;

    try {
      // Create a row
      const row = await this.addRowToTable(null, { editing: opts?.editing, emitEvent: opts?.emitEvent });
      if (!row) throw new Error('Could not add row to table');

      // Override rankOrder (with a computed value)
      if (
        this.hasRankOrder &&
        // Do NOT override if can edit it and set
        (!this.canEditRankOrder || isNil(data.rankOrder))
      ) {
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
      } else if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }

      this.markAsDirty({ emitEvent: false });

      return row;
    } catch (err) {
      console.error(this.logPrefix + 'Error in addEntityToTable: ', err);
      throw err;
    } finally {
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
  protected updateEntityToTable(data: T, row: TableElement<T>, opts?: { confirmEdit?: boolean }): Promise<TableElement<T>> {
    return super.updateEntityToTable(data, row, opts);
  }

  protected getI18nColumnName(columnName: string): string {
    // Try to resolve PMFM column, using the cached pmfm list
    if (PMFM_ID_REGEXP.test(columnName)) {
      const pmfmId = parseInt(columnName);
      const pmfm = (this.pmfms || []).find((p) => p.id === pmfmId);
      if (pmfm) return this.getI18nPmfmName(pmfm);
    }

    return super.getI18nColumnName(columnName);
  }

  protected getI18nPmfmName(pmfm: IPmfm) {
    if (pmfm)
      return this.pmfmNamePipe.transform(pmfm, {
        i18nPrefix: this.i18nPmfmPrefix,
        i18nContext: this.i18nColumnSuffix,
      });
  }

  protected normalizeEntityToRow(
    data: T,
    row: TableElement<T>,
    opts?: {
      keepOtherExistingPmfms?: boolean;
      onlyExistingPmfms?: boolean;
    }
  ) {
    if (!data) return; // skip

    // Adapt entity measurement values to reactive form
    MeasurementValuesUtils.normalizeEntityToForm(data, this.pmfms || [], row.validator, opts);
  }

  /* -- private function -- */

  /**
   * /!\ do NOT override this function. Use onPrepareRowForm instead
   *
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
      } else {
        row.currentData = data;
      }

      this.markForCheck();
    } finally {
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
