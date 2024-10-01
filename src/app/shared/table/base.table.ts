import {
  AfterViewInit,
  booleanAttribute,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  inject,
  Injector,
  Input,
  numberAttribute,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  AppTable,
  changeCaseToUnderscore,
  EntitiesServiceWatchOptions,
  EntitiesTableDataSource,
  EntitiesTableDataSourceConfig,
  Entity,
  EntityUtils,
  Hotkeys,
  IEntitiesService,
  IEntityFilter,
  InMemoryEntitiesService,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  toBoolean,
  TranslateContextService,
} from '@sumaris-net/ngx-components';
import { TableElement } from '@e-is/ngx-material-table';
import { PredefinedColors } from '@ionic/core';
import { UntypedFormGroup } from '@angular/forms';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { MatExpansionPanel } from '@angular/material/expansion';
import { environment } from '@environments/environment';
import { filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { PopoverController } from '@ionic/angular';
import { SubBatch } from '@app/trip/batch/sub/sub-batch.model';
import { Popovers } from '@app/shared/popover/popover.utils';
import { timer } from 'rxjs';
import { RxStateProperty, RxStateRegister } from '@app/shared/state/state.decorator';
import { RxState } from '@rx-angular/state';

export const BASE_TABLE_SETTINGS_ENUM = {
  FILTER_KEY: 'filter',
  COMPACT_ROWS_KEY: 'compactRows',
};

export interface BaseTableState {
  canEdit: boolean;
  canDelete: boolean;
}

export interface BaseTableConfig<
  T extends Entity<T, ID>,
  ID = number,
  ST extends BaseTableState = BaseTableState,
  WO extends EntitiesServiceWatchOptions = EntitiesServiceWatchOptions,
  SO = any,
> extends EntitiesTableDataSourceConfig<T, ID, WO, SO> {
  restoreCompactMode?: boolean;
  restoreColumnWidths?: boolean;
  i18nColumnPrefix?: string;
  initialState?: Partial<ST>;
}
export type AppBaseTableFilterRestoreSource = 'settings' | 'queryParams';

@Directive()
export abstract class AppBaseTable<
    T extends Entity<T, ID>,
    F extends IEntityFilter<F, T, any>,
    S extends IEntitiesService<T, F> = IEntitiesService<T, F>,
    V extends BaseValidatorService<T, ID> = any,
    ID = number,
    ST extends BaseTableState = BaseTableState,
    O extends BaseTableConfig<T, ID, ST> = BaseTableConfig<T, ID, ST>,
  >
  extends AppTable<T, F, ID>
  implements OnInit, AfterViewInit
{
  private _canEdit: boolean;

  protected memoryDataService: InMemoryEntitiesService<T, F, ID>;
  protected translateContext: TranslateContextService;
  protected cd: ChangeDetectorRef;
  protected readonly hotkeys: Hotkeys;
  protected logPrefix: string = null;
  protected popoverController: PopoverController;

  @RxStateRegister() protected readonly _state: RxState<ST> = inject(RxState, { optional: true, self: true });

  @Input({ transform: booleanAttribute }) usePageSettings = true;
  @Input({ transform: booleanAttribute }) canGoBack = false;
  @Input({ transform: booleanAttribute }) showTitle = true;
  @Input({ transform: booleanAttribute }) mobile = false;
  @Input({ transform: booleanAttribute }) showToolbar: boolean;
  @Input({ transform: booleanAttribute }) showPaginator = true;
  @Input({ transform: booleanAttribute }) showFooter = true;
  @Input({ transform: booleanAttribute }) showError = true;
  @Input() toolbarColor: PredefinedColors = 'primary';
  @Input({ transform: booleanAttribute }) sticky = false;
  @Input({ transform: booleanAttribute }) stickyEnd = false;
  @Input({ transform: booleanAttribute }) compact: boolean = null;
  @Input() pressHighlightDuration = 10000; // 10s
  @Input({ transform: numberAttribute }) highlightedRowId: number;
  @Input({ transform: booleanAttribute }) filterPanelFloating = true;
  @Input({ transform: booleanAttribute }) @RxStateProperty() canDelete: boolean;
  @Input({ transform: booleanAttribute }) set canEdit(value: boolean) {
    this._state.set('canEdit', () => value);
  }
  get canEdit(): boolean {
    return this._state.get('canEdit') && !this.readOnly;
  }

  @ViewChild('tableContainer', { read: ElementRef }) tableContainerRef: ElementRef;
  @ViewChild(MatExpansionPanel, { static: true }) filterExpansionPanel: MatExpansionPanel;

  filterForm: UntypedFormGroup = null;
  filterCriteriaCount = 0;

  get filterIsEmpty(): boolean {
    return this.filterCriteriaCount === 0;
  }

  markAsPristine(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    if (this.memoryDataService?.dirty) return; // Skip if service still dirty
    super.markAsPristine(opts);
  }

  protected constructor(
    protected injector: Injector,
    protected dataType: new () => T,
    protected filterType: new () => F,
    columnNames: string[],
    protected _dataService: S,
    protected validatorService?: V,
    protected options?: O
  ) {
    super(
      injector,
      RESERVED_START_COLUMNS.concat(columnNames).concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource<T, F, ID>(dataType, _dataService, validatorService, {
        prependNewElements: false,
        restoreOriginalDataOnCancel: false,
        suppressErrors: environment.production,
        onRowCreated: (row) => this.onDefaultRowCreated(row),
        ...options,
      }),
      null
    );

    this.mobile = this.settings.mobile;
    this.hotkeys = injector.get(Hotkeys);
    this.popoverController = injector.get(PopoverController);
    this.i18nColumnPrefix = options?.i18nColumnPrefix || '';
    this.translateContext = injector.get(TranslateContextService);
    this.cd = injector.get(ChangeDetectorRef);
    this.defaultSortBy = 'label';
    this.inlineEdition = !!this.validatorService;
    this.memoryDataService = this._dataService instanceof InMemoryEntitiesService ? (this._dataService as InMemoryEntitiesService<T, F, ID>) : null;

    // DEBUG
    this.logPrefix = '[base-table] ';
    this.debug = options?.debug && !environment.production;
  }

  ngOnInit() {
    // Set defaults
    this.showToolbar = toBoolean(this.showToolbar, !this.mobile);

    super.ngOnInit();

    // Propagate dirty state of the in-memory service
    if (this.memoryDataService) {
      this.registerSubscription(
        this.memoryDataService.dirtySubject.pipe(filter((dirty) => dirty === true && !this.dirty)).subscribe((_) => this.markAsDirty())
      );
    }

    // Propagate dirty state from the first valueChanges of a row
    if (this.inlineEdition) {
      this.registerSubscription(
        this.onStartEditingRow
          .pipe(
            filter((row) => row.id !== -1 && !!row.validator && !this.dirty),
            switchMap((row) =>
              row.validator.valueChanges.pipe(
                filter(() => row.dirty),
                first(),
                takeUntil(this.onStartEditingRow)
              )
            )
          )
          .subscribe(() => {
            console.debug(this.logPrefix + 'Mark table as dirty, because row is dirty');
            this.markAsDirty();
          })
      );
    }

    // Enable permanent selection (to keep selected rows after reloading)
    // (only on desktop, if not already done)
    if (!this.mobile && !this.permanentSelection) {
      this.initPermanentSelection();
    }

    if (this.options?.restoreCompactMode !== false) {
      this.restoreCompactMode();
    }
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    if (this.tableContainerRef) {
      this.initTableContainer(this.tableContainerRef?.nativeElement);
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._state?.ngOnDestroy();
  }

  initTableContainer(element: any) {
    if (!element) return; // Skip if already done

    if (!this.mobile /* && opts?.defaultShortcuts !== false*/) {
      // Add shortcuts
      console.debug(this.logPrefix + 'Add table shortcuts');
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'control.a', element, preventDefault: false /*will prevent default only if no row editing */ })
          .pipe(
            filter(() => this.canEdit && !this.focusColumn && !this.editedRow),
            tap((event: Event) => event?.preventDefault()),
            map(() => this.dataSource?.getRows()),
            filter(isNotEmptyArray)
          )
          .subscribe((rows) => {
            if (this.isAllSelected()) {
              this.selection.clear();
            } else {
              this.selection.select(...rows);
            }
            this.markForCheck();
          })
      );
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'control.shift.+', description: 'COMMON.BTN_ADD', element })
          .pipe(filter((e) => !this.disabled && this.canEdit))
          .subscribe((event) => this.addRow(event))
      );
    }
  }

  scrollToBottom() {
    if (this.tableContainerRef) {
      // scroll to bottom
      this.tableContainerRef.nativeElement.scroll({
        top: this.tableContainerRef.nativeElement.scrollHeight,
      });
    }
  }

  setFilter(filter: Partial<F>, opts?: { emitEvent: boolean }) {
    filter = this.asFilter(filter);

    // Update criteria count
    const criteriaCount = this.countNotEmptyCriteria(filter as F);
    if (criteriaCount !== this.filterCriteriaCount) {
      this.filterCriteriaCount = criteriaCount;
      this.markForCheck();
    }

    // Update the form content
    if (this.filterForm && (!opts || opts.emitEvent !== false)) {
      this.filterForm.patchValue(filter.asObject(), { emitEvent: false });
    }

    super.setFilter(filter as F, opts);
  }

  toggleFilterPanelFloating() {
    this.filterPanelFloating = !this.filterPanelFloating;
    this.markForCheck();
  }

  applyFilterAndClosePanel(event?: Event) {
    const filter = this.filterForm.value;
    this.setFilter(filter, { emitEvent: false });
    this.onRefresh.emit(event);
    if (this.filterExpansionPanel && this.filterPanelFloating) this.filterExpansionPanel.close();
  }

  closeFilterPanel() {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
  }

  resetFilter(value?: any, opts?: { emitEvent: boolean }) {
    this.filterForm.reset(value, opts);
    this.setFilter(value || null, opts);
    this.filterCriteriaCount = 0;
    if (this.filterExpansionPanel && this.filterPanelFloating) this.filterExpansionPanel.close();
  }

  clickRow(event: Event | undefined, row: TableElement<T>): boolean {
    if (event?.defaultPrevented) return false;
    if (!this.inlineEdition) this.highlightedRowId = row?.id;

    //console.debug('[base-table] click row');
    return super.clickRow(event, row);
  }

  pressRow(event: Event | undefined, row: TableElement<T>): boolean {
    if (!this.mobile) return; // Skip if inline edition, or not mobile

    event?.preventDefault();

    // Toggle row selection
    this.selection.toggle(row);

    // Unselect after 4s
    if (this.pressHighlightDuration > 0) {
      if (this.selection.isSelected(row)) {
        // Highlight the row (only for the first row selected)
        if (this.singleSelectedRow === row) {
          this.highlightedRowId = row.id;
        }

        timer(this.pressHighlightDuration)
          .pipe(
            //takeUntil(this.selection.changed),
            takeUntil(this.destroySubject),
            first()
          )
          .subscribe(() => {
            // Row is still highlighted: remove highlight
            if (this.highlightedRowId === row.id) {
              this.highlightedRowId = null;
            }
            // Unselect, if only this row is selected
            if (this.selection.isSelected(row) && this.selection.selected.length === 1) {
              this.selection.deselect(row);
            }
            this.markForCheck();
          });
      } else {
        // Remove highlight
        if (this.highlightedRowId === row.id) {
          this.highlightedRowId = null;
        }
      }
    }

    this.markForCheck();
  }

  async addOrUpdateEntityToTable(data: T, opts?: { confirmEditCreate?: boolean; editing?: boolean }) {
    // Always try to get the row, even if no ID, because the row can exist (e.g. in memory table)
    // THis find should use a equals() function
    const row = await this.findRowByEntity(data);
    if (!row) {
      return await this.addEntityToTable(data, opts && { confirmCreate: opts.confirmEditCreate, editing: opts.editing });
    } else {
      return await this.updateEntityToTable(data, row, opts && { confirmEdit: opts.confirmEditCreate });
    }
  }

  escapeEditingRow(event?: Event, row?: TableElement<T>) {
    super.escapeEditingRow(event, row);
    if (!this.editedRow) this.focusColumn = null;
  }

  /**
   * Say if the row can be added. Useful to check unique constraints, and warn user
   * is.s physical gear table can check is the rankOrder
   *
   * @param data
   * @param opts
   * @protected
   */
  protected canAddEntity(data: T, opts?: { interactive?: boolean }): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected async canAddEntities(data: T[], opts?: { interactive?: boolean }): Promise<boolean> {
    return (await Promise.all((data || []).map((e) => this.canAddEntity(e, opts)))).every((res) => res === true);
  }

  protected canUpdateEntity(data: T, row: TableElement<T>, opts?: { interactive?: boolean }): Promise<boolean> {
    return Promise.resolve(true);
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
  protected async addEntityToTable(data: T, opts?: { confirmCreate?: boolean; editing?: boolean }): Promise<TableElement<T>> {
    if (!data) throw new Error('Missing data to add');
    if (this.debug) console.debug('[measurement-table] Adding new entity', data);

    // Check entity can be added
    const canAdd = await this.canAddEntity(data);
    if (!canAdd) return undefined;

    // Create a row
    const row = await this.addRowToTable(null, { editing: opts?.editing });
    if (!row) throw new Error('Could not add row to table');

    // Adapt measurement values to row
    this.normalizeEntityToRow(data, row);

    // Affect new row
    if (row.validator) {
      row.validator.patchValue(data);
      row.validator.markAsDirty();
    } else {
      row.currentData = data;
    }

    // Confirm the created row
    if (row.editing && (!opts || opts.confirmCreate !== false)) {
      const confirmed = this.confirmEditCreate(null, row);
      if (confirmed) this.editedRow = null; // Forget the edited row
    } else {
      this.editedRow = row;
    }

    this.markAsDirty();

    return row;
  }

  protected async onNewEntity(data: T): Promise<void> {
    // Can be override by subclasses
  }

  protected async addEntitiesToTable(data: T[], opts?: { editing?: boolean; emitEvent?: boolean }): Promise<TableElement<T>[]> {
    if (!data) throw new Error('Missing data to add');
    if (this.debug) console.debug('[measurement-table] Adding new entities', data);

    // Check entity can be added
    const canAdd = await this.canAddEntities(data);
    if (!canAdd) return undefined;

    // Prepare entities
    await Promise.all(data.map((entity) => this.onNewEntity(entity)));

    // Bulk add
    const rows = await this.dataSource.addMany(data, null, opts);
    if (!rows) throw new Error('Failed to add entities to table');

    this.totalRowCount += rows.length;
    this.visibleRowCount += rows.length;

    if (rows.length !== data.length) throw new Error('Not all entities has been added to table');

    rows.map((row, index) => {
      const entity = data[index];
      // Adapt measurement values to row
      this.normalizeEntityToRow(entity, row);

      // Affect new row
      if (row.validator) {
        row.validator.patchValue(entity);
        row.validator.markAsDirty();
      } else {
        row.currentData = entity;
      }
    });

    this.markAsDirty();

    return rows;
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
  protected async updateEntityToTable(data: T, row: TableElement<T>, opts?: { confirmEdit?: boolean }): Promise<TableElement<T>> {
    if (!data || !row) throw new Error('Missing data, or table row to update');
    if (this.debug) console.debug('[measurement-table] Updating entity to an existing row', data);

    const canUpdate = await this.canUpdateEntity(data, row);
    if (!canUpdate) return undefined;

    // Adapt measurement values to row
    this.normalizeEntityToRow(data, row);

    // Affect new row
    if (row.validator) {
      row.validator.patchValue(data);
      row.validator.markAsDirty();
    } else {
      row.currentData = data;
    }

    // Confirm the created row
    if (!opts || opts.confirmEdit !== false) {
      this.confirmEditCreate(null, row);
      this.editedRow = null;
    } else if (this.inlineEdition) {
      this.editedRow = row;
    }

    this.markAsDirty();

    return row;
  }

  async deleteEntity(event: Event, data: T): Promise<boolean> {
    const row = await this.findRowByEntity(data);

    // Row not exists: OK
    if (!row) return true;

    const confirmed = await this.canDeleteRows([row]);
    if (!confirmed) return false;

    const deleted = await this.deleteRow(null, row, { interactive: false /*already confirmed*/ });
    if (!deleted) event?.preventDefault(); // Mark as cancelled

    return deleted;
  }

  deleteSelection(event: Event, opts?: { interactive?: boolean }): Promise<number> {
    return super.deleteSelection(event, opts);
  }

  /* -- protected function -- */

  protected async restoreFilterOrLoad(opts?: { emitEvent: boolean; sources?: AppBaseTableFilterRestoreSource[] }) {
    this.markAsLoading();

    const json = this.loadFilter(opts?.sources);

    if (json) {
      this.setFilter(json, { emitEvent: true });
    } else if (!opts || opts.emitEvent !== false) {
      this.onRefresh.emit();
    }
  }

  protected loadFilter(sources?: AppBaseTableFilterRestoreSource[]): any | undefined {
    sources = sources || <AppBaseTableFilterRestoreSource[]>['settings', 'queryParams'];
    console.debug(`${this.logPrefix}Loading filter from sources: `, sources);

    return sources
      .map((source) => {
        switch (source) {
          case 'settings':
            if (!this.usePageSettings || isNilOrBlank(this.settingsId)) return; // Skip if settings not usable

            console.debug(this.logPrefix + 'Restoring filter from settings...');
            return this.settings.getPageSettings(this.settingsId, BASE_TABLE_SETTINGS_ENUM.FILTER_KEY);
          case 'queryParams': {
            const { q } = this.route.snapshot.queryParams;
            if (q) {
              console.debug(this.logPrefix + 'Restoring filter from route query param: ', q);
              try {
                return JSON.parse(q);
              } catch (err) {
                console.error(this.logPrefix + 'Failed to parse route query param: ' + q, err);
              }
            }
            break;
          }
        }
        return null;
      })
      .find(isNotNil);
  }

  restoreCompactMode(opts?: { emitEvent?: boolean }) {
    if (!this.usePageSettings || isNilOrBlank(this.settingsId) || isNotNil(this.compact)) return;

    const compact = this.settings.getPageSettings(this.settingsId, BASE_TABLE_SETTINGS_ENUM.COMPACT_ROWS_KEY) || false;
    if (this.compact !== compact) {
      this.compact = compact;

      // Emit event
      if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }
    }
  }

  async toggleCompactMode() {
    this.compact = !this.compact;
    this.markForCheck();
    if (this.usePageSettings && isNotNilOrBlank(this.settingsId)) {
      await this.savePageSettings(this.compact, BASE_TABLE_SETTINGS_ENUM.COMPACT_ROWS_KEY);
    }
  }

  async openCommentPopover(event: Event, row: TableElement<SubBatch>) {
    // Avoid to autofocus
    event?.preventDefault();

    const placeholder = this.translate.instant('REFERENTIAL.COMMENTS');
    const { data } = await Popovers.showText(this.popoverController, event, {
      editing: this.inlineEdition && this.enabled,
      autofocus: this.enabled,
      multiline: true,
      text: row.currentData.comments,
      placeholder,
    });

    // User cancel
    if (isNil(data) || this.disabled) return;

    if (this.inlineEdition) {
      if (row.validator) {
        row.validator.patchValue({ comments: data });
        row.validator.markAsDirty();
      } else {
        row.currentData.comments = data;
      }
      this.markAsDirty({ emitEvent: false });
      this.markForCheck();
    }
  }

  /* -- protected functions -- */

  protected async onDefaultRowCreated(row: TableElement<T>) {
    if (row.validator) {
      row.validator.patchValue(this.defaultNewRowValue());
    } else {
      Object.assign(row.currentData, this.defaultNewRowValue());
    }

    // Start row edition
    if (this.inlineEdition) this.clickRow(undefined, row);
    this.scrollToBottom();
  }

  protected defaultNewRowValue(): any {
    return {};
  }

  protected asFilter(source: Partial<F>): F {
    const target = new this.filterType();
    if (source) target.fromObject(source);
    return target;
  }

  protected countNotEmptyCriteria(filter: F) {
    return filter?.countNotEmptyCriteria() || 0;
  }

  protected clearFilterValue(key: keyof F, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.filterForm.get(key as string).reset(null);
  }

  protected asEntity(source: Partial<T>): T {
    if (EntityUtils.isEntity(source)) return source as unknown as T;
    const target = new this.dataType();
    if (source) target.fromObject(source);
    return target;
  }

  protected async findRowByEntity(data: T): Promise<TableElement<T>> {
    if (!data) throw new Error('Missing argument data');

    // Make sure using an entity class, to be able to use equals()
    data = this.asEntity(data);

    return this.dataSource.getRows().find((r) => data.equals(r.currentData));
  }

  protected normalizeEntityToRow(data: T, row: TableElement<T>, opts?: any) {
    // Can be override by subclasses
  }

  /**
   * Delegate equals to the entity class, instead of simple ID comparison
   *
   * @param d1
   * @param d2
   * @protected
   */
  protected equals(d1: T, d2: T): boolean {
    if (d1) return this.asEntity(d1).equals(d2);
    if (d2) return this.asEntity(d2).equals(d1);
    return false;
  }

  protected markForCheck() {
    this.cd?.markForCheck();
  }

  protected getI18nColumnName(columnName: string): string {
    if (this.i18nColumnSuffix) {
      return this.translateContext.instant((this.i18nColumnPrefix || '') + changeCaseToUnderscore(columnName).toUpperCase(), this.i18nColumnSuffix);
    } else {
      return super.getI18nColumnName(columnName);
    }
  }

  protected async devToggleDebug() {
    this.debug = !this.debug;
    this.markForCheck();
    if (this.usePageSettings && isNotNilOrBlank(this.settingsId)) await this.savePageSettings(this.debug, 'debug');
  }
}
