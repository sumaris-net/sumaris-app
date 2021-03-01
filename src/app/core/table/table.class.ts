import {AfterViewInit, Directive, EventEmitter, Injector, Input, OnDestroy, OnInit, Output, ViewChild} from "@angular/core";
import {MatPaginator} from "@angular/material/paginator";
import {MatSort, MatSortable, SortDirection} from "@angular/material/sort";
import {MatTable} from "@angular/material/table";
import {BehaviorSubject, EMPTY, merge, Observable, of, Subject, Subscription} from 'rxjs';
import {catchError, debounceTime, distinctUntilChanged, filter, mergeMap, startWith, switchMap, tap} from "rxjs/operators";
import {TableElement} from "@e-is/ngx-material-table";
import {EntitiesTableDataSource} from "./entities-table-datasource.class";
import {SelectionModel} from "@angular/cdk/collections";
import {Entity} from "../services/model/entity.model";
import {AlertController, ModalController, Platform, ToastController} from "@ionic/angular";
import {ActivatedRoute, Router} from "@angular/router";
import {TableSelectColumnsComponent} from './table-select-columns.component';
import {Location} from '@angular/common';
import {ErrorCodes} from "../services/errors";
import {AppFormUtils, IAppForm} from "../form/form.utils";
import {isNil, isNotNil, toBoolean} from "../../shared/functions";
import {LocalSettingsService} from "../services/local-settings.service";
import {TranslateService} from "@ngx-translate/core";
import {PlatformService} from "../services/platform.service";
import {ShowToastOptions, Toasts} from "../../shared/toasts";
import {Alerts} from "../../shared/alerts";
import {createPromiseEventEmitter, emitPromiseEvent} from "../../shared/events";
import {MatAutocompleteConfigHolder, MatAutocompleteFieldAddOptions, MatAutocompleteFieldConfig} from "../../shared/material/autocomplete/material.autocomplete";

export const SETTINGS_DISPLAY_COLUMNS = "displayColumns";
export const SETTINGS_SORTED_COLUMN = "sortedColumn";
export const DEFAULT_PAGE_SIZE = 20;
export const RESERVED_START_COLUMNS = ['select', 'id'];
export const RESERVED_END_COLUMNS = ['actions'];

export class CellValueChangeListener {
  eventEmitter: EventEmitter<any>;
  subscription: Subscription;
  formPath?: string;
}


export interface IModalDetailOptions<T = any> {
  // Data
  isNew: boolean;
  data: T;
  disabled: boolean;

  // Callback functions
  onDelete: (event: UIEvent, data: T) => Promise<boolean>;
}

// @dynamic
@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AppTable<T extends Entity<T>, F = any>
  implements OnInit, OnDestroy, AfterViewInit, IAppForm {

  private _initialized = false;
  private _subscription = new Subscription();
  private _dataSourceSubscription: Subscription = null;

  private _cellValueChangesDefs: {
    [key: string]: CellValueChangeListener
  } = {};

  protected _enabled = true;
  protected _dirty = false;
  protected _destroy$ = new Subject();
  protected _autocompleteConfigHolder: MatAutocompleteConfigHolder;
  protected allowRowDetail = true;
  protected translate: TranslateService;
  protected alertCtrl: AlertController;
  protected toastController: ToastController;

  excludesColumns: string[] = [];
  displayedColumns: string[] = [];
  resultsLength = 0;
  visibleRowCount = 0;
  loadingSubject = new BehaviorSubject<boolean>(true);
  error?: string;
  isRateLimitReached = false;
  selection = new SelectionModel<TableElement<T>>(true, []);
  editedRow?: TableElement<T> = undefined;
  onRefresh = new EventEmitter<any>();
  settingsId?: string;
  autocompleteFields: {[key: string]: MatAutocompleteFieldConfig};
  mobile: boolean;

  // Table options
  @Input() i18nColumnPrefix = 'COMMON.';
  @Input() i18nColumnSuffix: string;
  @Input() autoLoad = true;
  @Input() readOnly: boolean;
  @Input() inlineEdition: boolean;
  @Input() focusFirstColumn = false;
  @Input() confirmBeforeDelete = false;
  @Input() saveBeforeDelete: boolean;
  @Input() saveBeforeSort: boolean;
  @Input() saveBeforeFilter: boolean;
  @Input() debug: boolean;

  @Input() defaultSortBy: string;
  @Input() defaultSortDirection: SortDirection;
  @Input() defaultPageSize = 20;

  @Input() set dataSource(value: EntitiesTableDataSource<T, F>) {
    this.setDatasource(value);
  }

  get dataSource(): EntitiesTableDataSource<T, F> {
    return this._dataSource;
  }

  @Input() set filter(value: F) {
    this.setFilter(value);
  }

  get filter(): F {
    return this._filter;
  }

  get empty(): boolean {
    return this.loading || this.resultsLength === 0;
  }

  @Output() onOpenRow = new EventEmitter<{ id?: number; row: TableElement<T> }>();
  @Output() onNewRow = new EventEmitter<any>();
  @Output() onStartEditingRow = new EventEmitter<TableElement<T>>();
  @Output() onConfirmEditCreateRow = new EventEmitter<TableElement<T>>();
  @Output() onCancelOrDeleteRow = new EventEmitter<TableElement<T>>();
  @Output() onBeforeDeleteRows = createPromiseEventEmitter<boolean, {rows: TableElement<T>[]}>();
  @Output() onAfterDeletedRows = new EventEmitter<TableElement<T>[]>();

  @Output()
  get dirty(): boolean {
    return this._dirty;
  }

  @Output()
  get valid(): boolean {
    return this.editedRow && this.editedRow.editing ? (!this.editedRow.validator || this.editedRow.validator.valid) : true;
  }

  @Output()
  get invalid(): boolean {
    return this.editedRow && this.editedRow.editing ? (this.editedRow.validator && this.editedRow.validator.invalid) : false;
  }

  @Output()
  get pending(): boolean {
    return this.editedRow && this.editedRow.editing ? (this.editedRow.validator && this.editedRow.validator.pending) : false;
  }

  disable(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    if (this.sort) this.sort.disabled = true;
    this._enabled = false;
  }

  enable(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    if (this.sort) this.sort.disabled = false;
    this._enabled = true;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  // FIXME: need to hidden buttons (in HTML), etc. when disabled
  @Input() set disabled(disabled: boolean) {
    if (disabled !== !this._enabled) {
      if (disabled) this.disable({emitEvent: false});
      else this.enable({emitEvent: false});
    }
  }

  get disabled(): boolean {
    return !this._enabled;
  }

  markAsDirty(opts?: {onlySelf?: boolean; emitEvent?: boolean; }) {
    if (this._dirty !== true) {
      this._dirty = true;
      if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }
    }
  }

  markAsPristine(opts?: {onlySelf?: boolean; emitEvent?: boolean; }) {
    if (this._dirty !== false) {
      this._dirty = false;
      if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }
    }
  }

  markAsUntouched(opts?: {onlySelf?: boolean; emitEvent?: boolean; }) {
    if (this._dirty !== false || this.editedRow) {
      this._dirty = false;
      this.editedRow = null;
      if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }
    }
  }

  markAsTouched(opts?: {onlySelf?: boolean; emitEvent?: boolean; }) {
    if (this.editedRow && this.editedRow.editing) {
      this.editedRow.validator.markAllAsTouched();
      //AppFormUtils.markAsTouched(this.editedRow.validator, opts);
      if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }
    }
  }

  markAsLoading(opts?: {emitEvent?: boolean}) {
    this.setLoading(true, opts);
  }

  markAsLoaded(opts?: {emitEvent?: boolean}) {
    this.setLoading(false, opts);
  }

  get loading(): boolean {
    return this.loadingSubject.getValue();
  }

  get loaded(): boolean {
    return !this.loadingSubject.getValue();
  }

  enableSort() {
    if (this.sort) this.sort.disabled = false;
  }

  disableSort() {
    if (this.sort) this.sort.disabled = true;
  }

  set pageSize(value: number) {
    this.defaultPageSize = value;
    if (this.paginator) {
      this.paginator.pageSize = value;
    }
  }

  get pageSize(): number {
    return this.paginator && this.paginator.pageSize || this.defaultPageSize || DEFAULT_PAGE_SIZE;
  }

  get pageOffset(): number {
    return this.paginator && this.paginator.pageIndex * this.paginator.pageSize || 0;
  }

  get sortActive(): string {
    return this.sort && this.sort.active;
  }
  get sortDirection(): 'asc' | 'desc' {
    return this.sort && this.sort.direction && (this.sort.direction === 'desc' ? 'desc' : 'asc') || undefined;
  }

  @ViewChild(MatTable, {static: false}) table: MatTable<T>;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: false}) sort: MatSort;

  protected constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected platform: Platform | PlatformService,
    protected location: Location,
    protected modalCtrl: ModalController,
    protected settings: LocalSettingsService,
    protected columns: string[],
    protected _dataSource?: EntitiesTableDataSource<T, F>,
    private _filter?: F,
    injector?: Injector
  ) {
    this.mobile = this.platform.is('mobile');
    this.translate = injector && injector.get(TranslateService);
    this.alertCtrl = injector && injector.get(AlertController);
    this.toastController = injector && injector.get(ToastController);
    this._autocompleteConfigHolder = new MatAutocompleteConfigHolder({
      getUserAttributes: (a, b) => settings.getFieldDisplayAttributes(a, b)
    });
    this.autocompleteFields = this._autocompleteConfigHolder.fields;
  }

  ngOnInit() {
    if (this._initialized) return; // Init only once
    this._initialized = true;

    // Set defaults
    this.readOnly = toBoolean(this.readOnly, false); // read/write by default
    this.inlineEdition = !this.readOnly && toBoolean(this.inlineEdition, false); // force to false when readonly
    this.saveBeforeDelete = toBoolean(this.saveBeforeDelete, !this.readOnly); // force to false when readonly
    this.saveBeforeSort = toBoolean(this.saveBeforeSort, !this.readOnly); // force to false when readonly
    this.saveBeforeFilter = toBoolean(this.saveBeforeFilter, !this.readOnly); // force to false when readonly

    // Check ask user confirmation is possible
    if (this.confirmBeforeDelete && !this.alertCtrl) throw Error("Missing 'alertCtrl' or 'injector' in component's constructor.");

    // Defined unique id for settings for the page
    this.settingsId = this.settingsId || this.generateTableId();

    this.displayedColumns = this.getDisplayColumns();

    const sortedColumn = this.getSortedColumn();
    this.defaultSortBy = sortedColumn.id;
    this.defaultSortDirection = sortedColumn.start;


    this.registerSubscription(
      this.onRefresh
        .pipe(
          startWith<any, any>(this.autoLoad ? {} : 'skip'),
          switchMap(
            (any: any) => {
              this._dirty = false;
              this.selection.clear();
              this.editedRow = undefined;
              if (any === 'skip' || !this._dataSource) {
                return of(undefined);
              }
              if (!this._dataSource) {
                if (this.debug) console.debug("[table] Skipping data load: no dataSource defined");
                return of(undefined);
              }
              if (this.debug) console.debug("[table] Calling dataSource.watchAll()...");
              this.selection.clear();
              return this._dataSource.watchAll(
                this.pageOffset,
                this.pageSize,
                this.sortActive,
                this.sortDirection,
                this._filter
              );
            }),
          catchError(err => {
            this.error = err && err.message || err;
            if (this.debug) console.error(err);
            return of(undefined);
          })
        )
        .subscribe(res => {
          if (res && res.data) {
            this.isRateLimitReached = !this.paginator || (res.data.length < this.paginator.pageSize);
            this.visibleRowCount = res.data.length;
            this.resultsLength = isNotNil(res.total) ? res.total : ((this.paginator && this.paginator.pageIndex * (this.paginator.pageSize || DEFAULT_PAGE_SIZE) || 0) + this.visibleRowCount);
            if (this.debug) console.debug(`[table] ${res.data.length} rows loaded`);
          } else {
            //if (this.debug) console.debug('[table] NO rows loaded');
            this.isRateLimitReached = true;
            this.resultsLength = 0;
            this.visibleRowCount = 0;
          }
          this.markAsUntouched();
          this.markAsPristine();
          this.markForCheck();
        }));

    // Listen dataSource events
    if (this._dataSource) this.listenDatasource(this._dataSource);
  }

  ngAfterViewInit() {
    if (this.debug) {
      // Warn if table not exists
      if (!this.table) {
        setTimeout(() => {
          if (!this.table) {
            console.warn(`[table] Missing <mat-table> in the HTML template (after waiting 500ms)! Component: ${this.constructor.name}`);
          }
        }, 500);
      }

      if (!this.displayedColumns) console.warn(`[table] Missing 'displayedColumns'. Did you call super.ngOnInit() in component ${this.constructor.name} ?`);
    }

    merge(
      // Listen sort events
      this.sort && this.sort.sortChange
        .pipe(
          mergeMap(async () => {
            if (this._dirty && this.saveBeforeSort) {
              const saved = await this.save();
              this.markAsDirty(); // restore dirty flag
              return saved;
            }
            return true;
          }),
          filter(res => res === true),
          // Save sort in settings
          tap(() => {
            const value = [this.sort.active, this.sort.direction || 'asc'].join(':');
            this.settings.savePageSetting(this.settingsId, value, SETTINGS_SORTED_COLUMN);
          })
        )
      || EMPTY,

      // Listen paginator events
      this.paginator && this.paginator.page
        .pipe(
          mergeMap(async () => {
            if (this._dirty && this.saveBeforeSort) {
              const saved = await this.save();
              this.markAsDirty(); // restore dirty flag
              return saved;
            }
            return true;
          }),
          filter(res => res === true)
        ) || EMPTY
    ).subscribe(value => this.onRefresh.emit(value));

    // If the user changes the sort order, reset back to the first page.
    if (this.sort && this.paginator) {
      this.registerSubscription(
        this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0)
      );
    }
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();

    // Unsubscribe column value changes
    Object.getOwnPropertyNames(this._cellValueChangesDefs)
      .forEach(col => this.stopCellValueChanges(col));
    this._cellValueChangesDefs = {};

    this._destroy$.next();
    this._destroy$.unsubscribe();

    if (this._dataSource) {
      this._dataSource.ngOnDestroy();
    }
  }

  setDatasource(datasource: EntitiesTableDataSource<T, F>) {
    if (this._dataSource) throw new Error("[table] dataSource already set !");
    if (datasource && this._dataSource !== datasource) {
      this._dataSource = datasource;
      if (this._initialized) this.listenDatasource(datasource);
    }
  }

  setFilter(filter: F, opts?: { emitEvent: boolean; }) {
    opts = opts || {emitEvent: true};

    if (this.saveBeforeFilter) {

      // if a dirty table is to be saved before filter
      if (this.dirty) {

        // Save
        this.save().then(() => {
          // Then apply filter
          this.applyFilter(filter, opts);
          // Restore dirty state
          this.markAsDirty();
        });
      } else {
        // apply filter on non dirty table
        this.applyFilter(filter, opts);
      }

    } else {

      // apply filter directly
      this.applyFilter(filter, opts);
    }
  }

  /* -- internal method -- */

  private applyFilter(filter: F, opts: { emitEvent: boolean; }) {
    if (this.debug) console.debug('[table] Applying filter', filter);
    this._filter = filter;
    if (opts.emitEvent) {
      if (this.paginator && this.paginator.pageIndex > 0) {
        this.paginator.pageIndex = 0;
      }
      this.onRefresh.emit();
    }
  }


  protected listenDatasource(dataSource: EntitiesTableDataSource<T, F>) {
    if (!dataSource) throw new Error("[table] dataSource not set !");

    // Cleaning previous subscription on datasource
    if (isNotNil(this._dataSourceSubscription)) {
      //if (this.debug)
      console.debug("[table] Many call to listenDatasource(): Cleaning previous subscriptions...");
      this._dataSourceSubscription.unsubscribe();
      this._subscription.remove(this._dataSourceSubscription);
    }
    this._dataSourceSubscription = this._dataSource.$busy
        .pipe(
            distinctUntilChanged(),

            // If changed to True: propagate as soon as possible
            tap((loading) => loading && !this.loadingSubject.getValue() && this.loadingSubject.next(true)),

            // If changed to False: wait 250ms before propagate (to make sure the spinner has been displayed)
            debounceTime(250),
            tap(loading => !loading && this.loadingSubject.getValue() && this.loadingSubject.next(false))
        )
        .subscribe();

    this._subscription.add(this._dataSourceSubscription);
  }

  confirmAndAddRow(event?: any, row?: TableElement<T>): boolean {
    if (!this.confirmEditCreate(event, row)) {
      return false;
    }

    // Add row
    return this.addRow(event);
  }

  /**
   * Confirm the creation of the given row, or if not specified the currently edited row
   * @param event
   * @param row
   */
  confirmEditCreate(event?: any, row?: TableElement<T>): boolean {
    row = row || this.editedRow;
    if (row && row.editing) {
      if (event) event.stopPropagation();
      // confirmation edition or creation
      if (!row.confirmEditCreate()) {
        if (row.validator) {
          // If pending, wait end of validation, then loop
          if (row.validator.pending) {
            AppFormUtils.waitWhilePending(row.validator)
              .then(() => this.confirmEditCreate(event, row));
          }
          else {
            if (this.debug) {
              console.warn("[table] Row not valid: unable to confirm", row);
              AppFormUtils.logFormErrors(row.validator, '[table] ');
            }
          }
          // fix: mark all controls as touched to show errors
          row.validator.markAllAsTouched();
        }
        return false;
      }
      // If edit finished, forget edited row
      if (row === this.editedRow) {
        this.editedRow = undefined; // unselect row
      }
      if (row.validator && row.validator.dirty) {
        // Mark table as dirty only if row is dirty
        this.markAsDirty();
      }
      this.onConfirmEditCreateRow.next(row);
    }
    return true;
  }

  cancelOrDelete(event: any, row: TableElement<T>, confirm?: boolean) {
    this.editedRow = undefined; // unselect row


    // Check confirmation
    if (!confirm && row.id !== -1 && (this.confirmBeforeDelete || this.onBeforeDeleteRows.observers.length > 0)) {
      event.stopPropagation();
      this.canDeleteRows([row])
        .then(canDelete => {
          if (!canDelete) return; // Skip
          // Loop with confirmation
          this.cancelOrDelete(event, row, true);
        });
      return;
    }

    this.onCancelOrDeleteRow.next(row);
    event.stopPropagation();

    this._dataSource.cancelOrDelete(row);

    // If delete (if new row): update counter
    if (row.id === -1) {
      this.resultsLength--;
      this.visibleRowCount--;
    }
  }

  addRow(event?: any): boolean {
    /*if (this.debug) */console.debug("[table] Asking for new row...");
    if (!this._enabled) return false;

    // Use modal if inline edition is disabled
    if (!this.inlineEdition) {
      this.openNewRowDetail(event);
      return false;
    }

    // Try to finish edited row first
    if (!this.confirmEditCreate()) {
      return false;
    }

    // Add new row
    this.addRowToTable();
    return true;
  }

  async save(): Promise<boolean> {
    if (this.readOnly) {
      throw {code: ErrorCodes.TABLE_READ_ONLY, message: 'ERROR.TABLE_READ_ONLY'};
    }

    this.resetError();
    if (!this.confirmEditCreate()) {
      throw {code: ErrorCodes.TABLE_INVALID_ROW_ERROR, message: 'ERROR.TABLE_INVALID_ROW_ERROR'};
    }

    if (this.debug) console.debug("[table] Calling dataSource.save()...");
    try {
      const isOK = await this._dataSource.save();
      if (isOK) this._dirty = false;
      return isOK;
    } catch (err) {
      if (this.debug) console.debug("[table] dataSource.save() return an error:", err);
      this.error = err && err.message || err;
      this.markForCheck();
      throw err;
    }
  }

  cancel(event?: UIEvent) {
    this.onRefresh.emit();
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    // DEBUG
    //console.debug('isAllSelected. lengths', this.selection.selected.length, this.resultsLength);

    return this.selection.selected.length === this.resultsLength ||
      this.selection.selected.length === this.visibleRowCount;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  async masterToggle() {

    if (this.loading) return;
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      const rows = await this._dataSource.getRows();
      rows.forEach(row => this.selection.select(row));
    }
  }

  async deleteSelection(event: UIEvent): Promise<number> {
    if (this.readOnly) {
      throw {code: ErrorCodes.TABLE_READ_ONLY, message: 'ERROR.TABLE_READ_ONLY'};
    }
    if (!this._enabled) return 0;
    if (this.loading || this.selection.isEmpty()) return 0;

    // Check if can delete
    const canDelete = await this.canDeleteRows(this.selection.selected);
    if (!canDelete) return 0; // Cannot delete

    // If data need to be saved first: do it
    if (this._dirty && this.saveBeforeDelete) {
      if (this.debug) console.debug("[table] Saving (before deletion)...");
      const saved = await this.save();
      this.markAsDirty();
      if (!saved) return; // Stop if cannot save
    }

    if (this.debug) console.debug("[table] Delete selection...");

    const rowsToDelete = this.selection.selected.slice()
    // Reverse row order
    // This is a workaround, need because row.delete() has async execution
    // and index cache is updated with a delay)
      .sort((a, b) => a.id > b.id ? -1 : 1);

    try {
      const deleteCount = rowsToDelete.length;
      await this._dataSource.deleteAll(rowsToDelete);

      // Not need to update manually, because watchALl().subscribe() will update this count
      //this.resultsLength -= deleteCount;
      //this.visibleRowCount -= deleteCount;
      this.selection.clear();
      this.editedRow = undefined;
      this.markAsDirty({emitEvent: false /*markForCheck() is called just after*/});
      this.markForCheck();
      this.onAfterDeletedRows.next(rowsToDelete);
      return deleteCount;
    } catch (err) {
      this.error = err && err.message || err;
      return 0;
    }
  }

  onEditRow(event: MouseEvent|undefined, row: TableElement<T>): boolean {
    if (!this._enabled) return false;
    if (this.editedRow === row) return true; // Already the edited row
    if (event && event.defaultPrevented) return false;

    if (!this.confirmEditCreate()) {
      return false;
    }

    if (!row.editing && !this.loading) {
      this._dataSource.startEdit(row);
    }
    this.editedRow = row;
    this.onStartEditingRow.emit(row);
    return true;
  }

  clickRow(event: MouseEvent|undefined, row: TableElement<T>): boolean {
    // DEBUG
    //console.debug("[table] Detect click on row");
    if (row.id === -1 || row.editing) return true; // Already in edition
    if (event && event.defaultPrevented || this.loading) return false; // Cancelled by event

    // Open the detail page (if not inline editing)
    if (!this.inlineEdition) {
      if (this._dirty && this.debug) {
        console.warn("[table] Opening row details, but table has unsaved changes!");
      }

      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      // No ID defined: unable to open details
      if (isNil(row.currentData.id)) {
        console.warn("[table] Opening row details, but missing currentData.id!");
        //return false;
      }

      this.markAsLoading();
      this.openRow(row.currentData.id, row)
        .then(() => {
          this.markAsLoaded();
        });

      return true;
    }

    return this.onEditRow(event, row);
  }

  getCurrentColumns(): { visible: boolean; name: string; label: string }[] {
    const fixedColumns = this.columns.slice(0, RESERVED_START_COLUMNS.length);
    const hiddenColumns = this.columns.slice(fixedColumns.length)
      .filter(name => this.displayedColumns.indexOf(name) === -1);
    return this.displayedColumns.slice(fixedColumns.length)
      .concat(hiddenColumns)
      .filter(name => name !== "actions")
      .filter(name => !this.excludesColumns.includes(name))
      .map(name => {
        return {
          name,
          label: this.getI18nColumnName(name),
          visible: this.displayedColumns.indexOf(name) !== -1
        };
      });
  }

  async openSelectColumnsModal(event?: UIEvent): Promise<any> {

    const columns = this.getCurrentColumns();

    const modal = await this.modalCtrl.create({
      component: TableSelectColumnsComponent,
      componentProps: {columns: columns}
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const res = await modal.onDidDismiss();
    if (!res) return; // CANCELLED

    // Apply columns
    const userColumns = columns && columns.filter(c => c.visible).map(c => c.name) || [];
    this.displayedColumns = RESERVED_START_COLUMNS.concat(userColumns).concat(RESERVED_END_COLUMNS);
    this.markForCheck();

    // Update user settings
    await this.settings.savePageSetting(this.settingsId, userColumns, SETTINGS_DISPLAY_COLUMNS);
  }

  trackByFn(index: number, row: TableElement<T>) {
    return row.id;
  }


  /* -- protected method -- */

  protected async canDeleteRows(rows: TableElement<T>[]): Promise<boolean> {

    // Check using emitter
    if (this.onBeforeDeleteRows.observers.length > 0) {
      try {
        const canDelete = await emitPromiseEvent(this.onBeforeDeleteRows, 'canDelete', {
          detail: {rows}
        });
        if (!canDelete) return false;
      }
      catch (err) {
        if (err === 'CANCELLED') return false; // User cancel
        console.error("Error while checking if can delete rows", err);
        throw err;
      }
    }

    // Ask user confirmation
    if (this.confirmBeforeDelete) {
      return this.askDeleteConfirmation();
    }
    return true;
  }

  protected async openRow(id: number, row: TableElement<T>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onOpenRow.observers.length) {
      this.onOpenRow.emit({id, row});
      return true;
    }

    return await this.router.navigate([id], {
      relativeTo: this.route,
      queryParams: {}
    });
  }

  protected async openNewRowDetail(event?: any): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onNewRow.observers.length) {
      this.onNewRow.emit(event);
      return true;
    }

    return await this.router.navigate(['new'], {
      relativeTo: this.route
    });
  }

  protected getUserColumns(): string[] {
    return this.settings.getPageSettings(this.settingsId, SETTINGS_DISPLAY_COLUMNS);
  }

  protected getSortedColumn(): MatSortable {
    const data = this.settings.getPageSettings(this.settingsId, SETTINGS_SORTED_COLUMN);
    const parts = data && data.split(':');
    if (parts && parts.length === 2 && this.columns.includes(parts[0])) {
      return {id: parts[0], start: parts[1] === 'desc' ? 'desc' : 'asc', disableClear: false};
    }
    if (this.defaultSortBy) {
       return {id: this.defaultSortBy, start: this.defaultSortDirection || 'asc', disableClear: false};
    }
    return {id: 'id', start: 'asc', disableClear: false};
  }

  protected getDisplayColumns(): string[] {
    let userColumns = this.getUserColumns();

    // No user override
    if (!userColumns) {
      // Return default, without columns to hide
      return this.columns.filter(column => !this.excludesColumns.includes(column));
    }

    // Get fixed start columns
    const fixedStartColumns = this.columns.filter(c => RESERVED_START_COLUMNS.includes(c));

    // Remove end columns
    const fixedEndColumns = this.columns.filter(c => RESERVED_END_COLUMNS.includes(c));

    // Remove fixed columns from user columns
    userColumns = userColumns.filter(c => (!fixedStartColumns.includes(c) && !fixedEndColumns.includes(c) && this.columns.includes(c)));

    return fixedStartColumns
      .concat(userColumns)
      .concat(fixedEndColumns)
      // Remove columns to hide
      .filter(column => !this.excludesColumns.includes(column));
  }

  /**
   * Recompute display columns
   * @protected
   */
  protected updateColumns() {
    this.displayedColumns = this.getDisplayColumns();
    if (!this.loading) this.markForCheck();
  }

  protected registerSubscription(sub: Subscription) {
    this._subscription.add(sub);
  }

  protected unregisterSubscription(sub: Subscription) {
    this._subscription.remove(sub);
  }

  protected registerAutocompleteField(fieldName: string, options?: MatAutocompleteFieldAddOptions): MatAutocompleteFieldConfig {
    return this._autocompleteConfigHolder.add(fieldName, options);
  }

  protected getI18nColumnName(columnName: string) {
    return this.i18nColumnPrefix + columnName.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
  }

  protected generateTableId() {
    const id = this.location.path(true).replace(/[?].*$/g, '').replace(/\/[\d]+/g, '_id') + "_" + this.constructor.name;
    //if (this.debug) console.debug("[table] id = " + id);
    return id;
  }

  protected async addRowToTable(): Promise<TableElement<T>> {
    this.focusFirstColumn = true;
    await this._dataSource.asyncCreateNew();
    this.editedRow = this._dataSource.getRow(-1);
    // Emit start editing event
    this.onStartEditingRow.emit(this.editedRow);
    this.resultsLength++;
    this.visibleRowCount++;
    this.markAsDirty({emitEvent: false /*markForCheck() is called just after*/});
    this.markForCheck();
    return this.editedRow;
  }

  protected registerCellValueChanges(name: string, formPath?: string): Observable<any> {
    formPath = formPath || name;
    if (this.debug) console.debug(`[table] New listener {${name}} for value changes on path ${formPath}`);
    this._cellValueChangesDefs[name] = this._cellValueChangesDefs[name] || {
      eventEmitter: new EventEmitter<any>(),
      subscription: null,
      formPath: formPath
    };

    // Start the listener, when editing starts
    this.registerSubscription(
      this.onStartEditingRow.subscribe(row => this.startCellValueChanges(name, row)));

    return this._cellValueChangesDefs[name].eventEmitter;
  }

  protected startCellValueChanges(name: string, row: TableElement<T>) {
    const def = this._cellValueChangesDefs[name];
    if (!def) {
      console.warn("[table] Listener with name {" + name + "} not registered! Please call registerCellValueChanges() before;");
      return;
    }
    // Stop previous subscription
    if (def.subscription) {
      def.subscription.unsubscribe();
      def.subscription = null;
    } else {
      if (this.debug) console.debug(`[table] Start values changes on row path {${def.formPath}}`);
    }

    // Listen value changes, and redirect to event emitter
    const control = row.validator && AppFormUtils.getControlFromPath(row.validator, def.formPath);
    if (!control) {
      console.warn(`[table] Could not listen cell changes: no validator or invalid form path {${def.formPath}}`);
    } else {
      def.subscription = control.valueChanges
        .subscribe((value) => {
          def.eventEmitter.emit(value);
        });

      // Emit the actual value
      def.eventEmitter.emit(control.value);
    }
  }

  protected stopCellValueChanges(name: string) {
    const def = this._cellValueChangesDefs[name];
    if (def && def.subscription) {
      if (this.debug) console.debug("[table] Stop value changes on row path {" + def.formPath + "}");
      def.subscription.unsubscribe();
      def.subscription = null;
    }
  }

  protected setShowColumn(columnName: string, show: boolean, opts?: { emitEvent?: boolean; }) {
    if (!this.excludesColumns.includes(columnName) !== show) {
      if (!show) {
        this.excludesColumns.push(columnName);
      } else {
        const index = this.excludesColumns.findIndex(value => value === columnName);
        if (index >= 0) this.excludesColumns.splice(index, 1);
      }

      // Recompute display columns
      if (this.displayedColumns && (!opts || opts.emitEvent !== false)) {
        this.updateColumns();
      }
    }
  }

  protected getShowColumn(columnName: string): boolean {
    return !this.excludesColumns.includes(columnName);
  }

  protected startsWithUpperCase(input: string, search: string): boolean {
    return input && input.toUpperCase().startsWith(search);
  }

  protected markForCheck() {
    // Should be override by subclasses, depending on ChangeDetectionStrategy
  }

  protected setLoading(value: boolean, opts?: {emitEvent?: boolean}) {
    if (this.loadingSubject.getValue() !== value)  {

      this.loadingSubject.next(value);

      if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }
    }
  }

  protected async askDeleteConfirmation(event?: UIEvent): Promise<boolean> {
    return Alerts.askActionConfirmation(this.alertCtrl, this.translate, true, event);
  }

  protected async askRestoreConfirmation(event?: UIEvent): Promise<boolean> {
    return Alerts.askActionConfirmation(this.alertCtrl, this.translate, false, event);
  }

  protected async showToast(opts: ShowToastOptions) {
    if (!this.toastController) throw new Error("Missing toastController in component's constructor");
    return Toasts.show(this.toastController, this.translate, opts);
  }

  /**
   * Reset error
   */
  protected resetError() {
    if (this.error) {
      this.error = undefined;
      this.markForCheck();
    }
  }


}

