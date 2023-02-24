import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, Injector, Input, OnInit, ViewChild } from '@angular/core';
import {
  AppTable,
  EntitiesServiceWatchOptions,
  EntitiesTableDataSource,
  EntitiesTableDataSourceConfig,
  Entity,
  EntityFilter,
  EntityUtils,
  Hotkeys,
  IEntitiesService,
  InMemoryEntitiesService,
  isNil,
  isNotEmptyArray,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS
} from '@sumaris-net/ngx-components';
import { TableElement } from '@e-is/ngx-material-table';
import { PredefinedColors } from '@ionic/core';
import { UntypedFormGroup } from '@angular/forms';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { MatExpansionPanel } from '@angular/material/expansion';
import { environment } from '@environments/environment';
import {filter, first, map, mergeMap, switchMap, takeUntil} from 'rxjs/operators';
import { PopoverController } from '@ionic/angular';
import { SubBatch } from '@app/trip/batch/sub/sub-batch.model';
import { Popovers } from '@app/shared/popover/popover.utils';
import { BatchGroup } from '@app/trip/batch/group/batch-group.model';
import { timer } from 'rxjs';
import { subscribe } from 'graphql/execution';


export const BASE_TABLE_SETTINGS_ENUM = {
  filterKey: 'filter',
  compactRowsKey: 'compactRows'
};

export interface BaseTableConfig<
  T extends Entity<T, ID>,
  ID = number,
  WO extends EntitiesServiceWatchOptions = EntitiesServiceWatchOptions,
  SO = any>
  extends EntitiesTableDataSourceConfig<T, ID, WO, SO> {

  restoreCompactMode?: boolean;
  restoreColumnWidths?: boolean;
  i18nColumnPrefix?: string;
}

@Directive()
export abstract class AppBaseTable<T extends Entity<T, ID>,
  F extends EntityFilter<any, T, any>,
  S extends IEntitiesService<T, F> = IEntitiesService<T, F>,
  V extends BaseValidatorService<T, ID> = any,
  ID = number,
  O extends BaseTableConfig<T, ID> = BaseTableConfig<T, ID>>
  extends AppTable<T, F, ID> implements OnInit, AfterViewInit {

  private _canEdit: boolean;

  protected memoryDataService: InMemoryEntitiesService<T, F, ID>;
  protected cd: ChangeDetectorRef;
  protected readonly hotkeys: Hotkeys;
  protected logPrefix: string = null;
  protected popoverController: PopoverController;

  @Input() canGoBack = false;
  @Input() showTitle = true;
  @Input() showToolbar = true;
  @Input() showPaginator = true;
  @Input() showFooter = true;
  @Input() showError = true;
  @Input() toolbarColor: PredefinedColors = 'primary';
  @Input() sticky = false;
  @Input() stickyEnd = false;
  @Input() compact = false;
  @Input() mobile = false;
  @Input() pressHighlightDuration = 4000; // 4s


  @Input() set canEdit(value: boolean) {
    this._canEdit = value;
  }

  get canEdit(): boolean {
    return this._canEdit && !this.readOnly;
  }

  @ViewChild('tableContainer', { read: ElementRef }) tableContainerRef: ElementRef;
  @ViewChild(MatExpansionPanel, {static: true}) filterExpansionPanel: MatExpansionPanel;

  filterForm: UntypedFormGroup = null;
  filterCriteriaCount = 0;
  filterPanelFloating = true;
  highlightedRowId: number;

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
      RESERVED_START_COLUMNS
        .concat(columnNames)
        .concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource<T, F, ID>(dataType, _dataService, validatorService, {
          prependNewElements: false,
          restoreOriginalDataOnCancel: false,
          suppressErrors: environment.production,
          onRowCreated: (row) => this.onDefaultRowCreated(row),
          ...options
        }),
        null
    );

    this.mobile = this.settings.mobile;
    this.hotkeys = injector.get(Hotkeys);
    this.popoverController = injector.get(PopoverController);
    this.i18nColumnPrefix = options?.i18nColumnPrefix || '';
    this.cd = injector.get(ChangeDetectorRef);
    this.defaultSortBy = 'label';
    this.inlineEdition = !!this.validatorService;
    this.memoryDataService = (this._dataService instanceof InMemoryEntitiesService)
      ? this._dataService as InMemoryEntitiesService<T, F, ID> : null;

    // DEBUG
    this.logPrefix = '[base-table] ';
    this.debug = options?.debug && !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Propagate dirty state of the in-memory service
    if (this.memoryDataService) {
      this.registerSubscription(
        this.memoryDataService.dirtySubject
          .pipe(
            filter(dirty => dirty === true && !this.dirty)
          )
          .subscribe(_ => this.markAsDirty())
      );
    }

    // Propagate dirty state from the first valueChanges of a row
    if (this.inlineEdition) {
      this.registerSubscription(
        this.onStartEditingRow
          .pipe(
            filter(row => row.id !== -1 && !!row.validator && !this.dirty),
            switchMap(row => row.validator.valueChanges
              .pipe(
                filter(() => row.dirty),
                first(),
                takeUntil(this.onStartEditingRow)
              ))
          )
          .subscribe(() => {
            console.debug(this.logPrefix + 'Mark table as dirty, because row is dirty');
            this.markAsDirty();
          })
      );
    }

    this.restoreCompactMode();
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    // Add shortcut
    if (!this.mobile && this.tableContainerRef) {
      this.registerSubscription(
        this.hotkeys
          .addShortcut({ keys: 'control.a', element: this.tableContainerRef.nativeElement })
          .pipe(
            filter(() => this.canEdit),
            map(() => this.dataSource?.getRows()),
            filter(isNotEmptyArray)
          )
          .subscribe(rows => {
            this.selection.select(...rows);
            this.markForCheck();
          })
      );
      this.registerSubscription(
        this.hotkeys.addShortcut({keys: 'control.shift.+', element: this.tableContainerRef.nativeElement, description: 'COMMON.BTN_ADD'})
          .pipe(filter(e => !this.disabled && this.canEdit))
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
    const criteriaCount = filter.countNotEmptyCriteria();
    if (criteriaCount !== this.filterCriteriaCount) {
      this.filterCriteriaCount = criteriaCount;
      this.markForCheck();
    }

    // Update the form content
    if (this.filterForm && (!opts || opts.emitEvent !== false)) {
      this.filterForm.patchValue(filter.asObject(), {emitEvent: false});
    }

    super.setFilter(filter as F, opts);
  }

  toggleFilterPanelFloating() {
    this.filterPanelFloating = !this.filterPanelFloating;
    this.markForCheck();
  }

  applyFilterAndClosePanel(event?: Event) {
    const filter = this.filterForm.value;
    this.setFilter(filter, {emitEvent: false});
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

  clickRow(event: Event|undefined, row: TableElement<T>): boolean {
    if (!this.inlineEdition) this.highlightedRowId = row?.id;

    //console.debug('[base-table] click row');
    return super.clickRow(event, row);
  }

  pressRow(event: Event|undefined, row: TableElement<T>): boolean {
    if (!this.mobile) return; // Skip if inline edition, or not mobile

    event?.preventDefault();

    // Toggle row selection
    this.selection.toggle(row);

    // Unselect after 4s
    if (this.pressHighlightDuration > 0) {
      if (this.selection.isSelected(row)) {

        // Hightlight the row (only for the first row selected)
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

  async addOrUpdateEntityToTable(data: T, opts?: {confirmEditCreate?: boolean}){
    // Always try to get the row, even if no ID, because the row can exists (e.g. in memory table)
    // THis find should use a equals() function
    const row = await this.findRowByEntity(data);
    if (!row){
      await this.addEntityToTable(data, opts && {confirmCreate: opts.confirmEditCreate});
    }
    else {
      await this.updateEntityToTable(data, row, opts && {confirmEdit: opts.confirmEditCreate});
    }
  }

  /**
   * Say if the row can be added. Useful to check unique constraints, and warn user
   * is.s physical gear table can check is the rankOrder
   * @param data
   * @protected
   */
  protected canAddEntity(data: T): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected canAddEntities(data: T[]): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected canUpdateEntity(data: T, row: TableElement<T>): Promise<boolean> {
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
    if (!data) throw new Error("Missing data to add");
    if (this.debug) console.debug("[measurement-table] Adding new entity", data);

    // Check entity can be added
    const canAdd = await this.canAddEntity(data);
    if (!canAdd) return undefined;

    // Create a row
    const row = await this.addRowToTable(null, {editing: opts?.editing});
    if (!row) throw new Error("Could not add row to table");

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
    }
    else {
      this.editedRow = row;
    }

    this.markAsDirty();

    return row;
  }

  protected async onNewEntity(data: T): Promise<void> {
    // Can be overrided by subclasses
  }

  protected async addEntitiesToTable(data: T[], opts?: { editing?: boolean; emitEvent?: boolean }): Promise<TableElement<T>[]> {
    if (!data) throw new Error("Missing data to add");
    if (this.debug) console.debug("[measurement-table] Adding new entities", data);

    // Check entity can be added
    const canAdd = await this.canAddEntities(data);
    if (!canAdd) return undefined;

    // Prepare entities
    await Promise.all(data.map(entity => this.onNewEntity(entity)));

    // Bulk add
    const rows = await this.dataSource.addMany(data, null, opts);
    if (!rows) throw new Error("Failed to add entities to table");

    this.totalRowCount += rows.length;
    this.visibleRowCount += rows.length;

    if (rows.length !== data.length) throw new Error("Not all entities has been added to table");

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
    })

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
  protected async updateEntityToTable(data: T, row: TableElement<T>, opts?: { confirmEdit?: boolean; }): Promise<TableElement<T>> {
    if (!data || !row) throw new Error("Missing data, or table row to update");
    if (this.debug) console.debug("[measurement-table] Updating entity to an existing row", data);

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
    }
    else if (this.inlineEdition) {
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

    const deleted = await this.deleteRow(null, row, {interactive: false /*already confirmed*/});
    if (!deleted) event?.preventDefault(); // Mark as cancelled

    return deleted;
  }

  /* -- protected function -- */

  protected restoreFilterOrLoad(opts?: { emitEvent: boolean }) {
    this.markAsLoading();

    let json = this.settings.getPageSettings(this.settingsId, BASE_TABLE_SETTINGS_ENUM.filterKey);
    if (json) {
      console.debug(this.logPrefix + 'Restoring filter from settings...', json);
    }
    else {
      const {q} = this.route.snapshot.queryParams;
      if (q) {
        console.debug(this.logPrefix + 'Restoring filter from route query param: ', q);
        json = JSON.parse(q);
      }
    }

    if (json) {
      this.setFilter(json, opts);
    }
    else if (!opts || opts.emitEvent !== false){
      this.onRefresh.emit();
    }
  }

  restoreCompactMode() {
    if (!this.compact && this.settingsId) {
      const compact = this.settings.getPageSettings(this.settingsId, BASE_TABLE_SETTINGS_ENUM.compactRowsKey) || false;
      if (this.compact !== compact) {
        this.compact = compact;
        this.markForCheck();
      }
    }
  }

  toggleCompactMode() {
    this.compact = !this.compact;
    this.markForCheck();
    this.settings.savePageSetting(this.settingsId, this.compact, BASE_TABLE_SETTINGS_ENUM.compactRowsKey);
  }

  async openCommentPopover(event: Event, row: TableElement<SubBatch>) {

    const placeholder = this.translate.instant('REFERENTIAL.COMMENTS');
    const {data} = await Popovers.showText(this.popoverController, event, {
      editing: this.inlineEdition && this.enabled,
      autofocus: this.enabled,
      multiline: true,
      text: row.currentData.comments,
      placeholder
    });

    // User cancel
    if (isNil(data) || this.disabled) return;

    if (this.inlineEdition) {
      if (row.validator) {
        row.validator.patchValue({comments: data});
        row.validator.markAsDirty();
      }
      else {
        row.currentData.comments = data;
      }
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

    return this.dataSource.getRows()
      .find(r => data.equals(r.currentData));
  }

  protected normalizeEntityToRow(data: T, row: TableElement<T>, opts?: any) {
    // Can be override by subclasses
  }

  /**
   * Delegate equals to the entity class, instead of simple ID comparison
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
    this.cd.markForCheck();
  }
}
