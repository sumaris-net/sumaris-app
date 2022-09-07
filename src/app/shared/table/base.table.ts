import { AfterViewInit, Directive, ElementRef, Injector, Input, OnInit, ViewChild } from '@angular/core';
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
  isNil,
  isNotEmptyArray,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS
} from '@sumaris-net/ngx-components';
import { TableElement } from '@e-is/ngx-material-table';
import { PredefinedColors } from '@ionic/core';
import { FormGroup } from '@angular/forms';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { MatExpansionPanel } from '@angular/material/expansion';
import { environment } from '@environments/environment';
import { filter, map } from 'rxjs/operators';


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

}

@Directive()
export abstract class AppBaseTable<E extends Entity<E, ID>,
  F extends EntityFilter<any, E, any>,
  V extends BaseValidatorService<E, ID> = any,
  ID = number,
  O extends BaseTableConfig<E, ID> = BaseTableConfig<E, ID>>
  extends AppTable<E, F, ID> implements OnInit, AfterViewInit {


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

  @Input() set canEdit(value: boolean) {
    this._canEdit = value;
  }

  get canEdit(): boolean {
    return this._canEdit && !this.readOnly;
  }

  @ViewChild('tableContainer', { read: ElementRef }) tableContainerRef: ElementRef;
  @ViewChild(MatExpansionPanel, {static: true}) filterExpansionPanel: MatExpansionPanel;

  filterForm: FormGroup = null;
  filterCriteriaCount = 0;
  filterPanelFloating = true;

  get filterIsEmpty(): boolean {
    return this.filterCriteriaCount === 0;
  }

  protected readonly hotkeys: Hotkeys;
  protected logPrefix: string = null;

  private _canEdit: boolean;

  constructor(
    protected injector: Injector,
    protected dataType: new () => E,
    protected filterType: new () => F,
    columnNames: string[],
    protected entityService: IEntitiesService<E, F>,
    protected validatorService?: V,
    protected options?: O
  ) {
    super(
      injector,
      RESERVED_START_COLUMNS
        .concat(columnNames)
        .concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource<E, F, ID>(dataType, entityService, validatorService, {
          prependNewElements: false,
          restoreOriginalDataOnCancel: false,
          saveOnlyDirtyRows: true,
          suppressErrors: environment.production,
          onRowCreated: (row) => this.onDefaultRowCreated(row),
          ...options
        }),
        null
    );

    this.hotkeys = injector.get(Hotkeys);
    this.i18nColumnPrefix = options?.i18nColumnPrefix || '';
    this.logPrefix = '[base-table]';
    this.defaultSortBy = 'label';
    this.inlineEdition = !!this.validatorService;
    this.debug = options?.debug && !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

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

  applyFilterAndClosePanel(event?: UIEvent) {
    this.onRefresh.emit(event);
    if (this.filterExpansionPanel && this.filterPanelFloating) this.filterExpansionPanel.close();
  }

  closeFilterPanel() {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
  }

  resetFilter(event?: UIEvent) {
    this.filterForm.reset();
    this.setFilter(null, {emitEvent: true});
    this.filterCriteriaCount = 0;
    if (this.filterExpansionPanel && this.filterPanelFloating) this.filterExpansionPanel.close();
  }


  async addOrUpdateEntityToTable(data: E){
    if (isNil(data.id)){
      await this.addEntityToTable(data);
    }
    else {
      const row = await this.findRowByEntity(data);
      await this.updateEntityToTable(data, row);
    }
  }


  /**
   * Insert an entity into the table. This can be usefull when entity is created by a modal (e.g. BatchGroupTable).
   *
   * If hasRankOrder=true, then rankOrder is computed only once.
   * Will call method normalizeEntityToRow().
   * The new row will be the edited row.
   *
   * @param data the entity to insert.
   * @param opts
   */
  protected async addEntityToTable(data: E, opts?: { confirmCreate?: boolean; }): Promise<TableElement<E>> {
    if (!data) throw new Error("Missing data to add");
    if (this.debug) console.debug("[measurement-table] Adding new entity", data);

    const row = await this.addRowToTable();
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
    if (!opts || opts.confirmCreate !== false) {
      this.confirmEditCreate(null, row);
      this.editedRow = null;
    }
    else {
      this.editedRow = row;
    }

    this.markAsDirty();

    return row;
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
  protected async updateEntityToTable(data: E, row: TableElement<E>, opts?: { confirmCreate?: boolean; }): Promise<TableElement<E>> {
    if (!data || !row) throw new Error("Missing data, or table row to update");
    if (this.debug) console.debug("[measurement-table] Updating entity to an existing row", data);

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
    if (!opts || opts.confirmCreate !== false) {
      this.confirmEditCreate(null, row);
      this.editedRow = null;
    }
    else if (this.inlineEdition) {
      this.editedRow = row;
    }

    this.markAsDirty();

    return row;
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
    if (!this.compact) {
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

  /* -- protected functions -- */

  protected onDefaultRowCreated(row: TableElement<E>) {
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

  protected asEntity(source: Partial<E>): E {
    if (EntityUtils.isEntity(source)) return source as unknown as E;
    const target = new this.dataType();
    if (source) target.fromObject(source);
    return target;
  }

  protected async findRowByEntity(data: E): Promise<TableElement<E>> {
    if (!data) throw new Error('Missing argument data');

    // Make sure using an entity class, to be able to use equals()
    data = this.asEntity(data);

    return (await this.dataSource.getRows())
      .find(r => data.equals(r.currentData));
  }

  protected normalizeEntityToRow(data: E, row: TableElement<E>, opts?: any) {
    // Can be override by subclasses
  }

  /**
   * Delegate equals to the entity class, instead of simple ID comparison
   * @param d1
   * @param d2
   * @protected
   */
  protected equals(d1: E, d2: E): boolean {
    return EntityUtils.isEntity(d1) ? d1.equals(d2)
      : (EntityUtils.isEntity(d2) ? d2.equals(d1)
        : super.equals(d1, d2));
  }
}
