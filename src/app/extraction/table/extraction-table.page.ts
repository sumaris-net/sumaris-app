import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {BehaviorSubject, EMPTY, merge, Observable, Subject} from 'rxjs';
import {
  AccountService,
  Alerts, CompletableEvent,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
  firstNotNilPromise,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  LoadResult,
  LocalSettingsService,
  PlatformService,
  SETTINGS_DISPLAY_COLUMNS,
  sleep,
  StatusIds,
  TableSelectColumnsComponent
} from '@sumaris-net/ngx-components';
import {TableDataSource} from '@e-is/ngx-material-table';
import {
  ExtractionCategories,
  ExtractionColumn,
  ExtractionFilterCriterion,
  ExtractionResult,
  ExtractionRow,
  ExtractionType,
  ExtractionTypeCategory,
  ExtractionTypeUtils
} from '../type/extraction-type.model';
import {AlertController, ModalController, ToastController} from '@ionic/angular';
import {Location} from '@angular/common';
import {debounceTime, filter, map, throttleTime} from 'rxjs/operators';
import {DEFAULT_CRITERION_OPERATOR, ExtractionAbstractPage, ExtractionState} from '../common/extraction-abstract.page';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {CacheDuration, ExtractionService} from '../common/extraction.service';
import {UntypedFormBuilder} from '@angular/forms';
import {MatTable} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatExpansionPanel} from '@angular/material/expansion';
import {ProductService} from '@app/extraction/product/product.service';
import {ExtractionProduct} from '@app/extraction/product/product.model';
import {ExtractionTypeService} from '@app/extraction/type/extraction-type.service';
import {ProgramRefService} from '@app/referential/services/program-ref.service';
import {AcquisitionLevelCodes} from '@app/referential/services/model/model.enum';
import {ProgramFilter} from '@app/referential/services/filter/program.filter';
import {Program} from '@app/referential/services/model/program.model';
import {ExtractionTypeFilter} from '@app/extraction/type/extraction-type.filter';
import {RxState} from '@rx-angular/state';

export interface ExtractionTableState extends ExtractionState<ExtractionType>{
  programs: Program[];
  programLabel: string;
  program: Program;
  categories: ExtractionTypeCategory[];
}

@Component({
  selector: 'app-extraction-table-page',
  templateUrl: './extraction-table.page.html',
  styleUrls: ['./extraction-table.page.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtractionTablePage extends ExtractionAbstractPage<ExtractionType, ExtractionTableState> implements OnInit, OnDestroy {

  private $cancel = new Subject<boolean>();

  protected readonly $programLabel = this._state.select('programLabel');
  protected readonly $programs = this._state.select('programs');
  protected readonly $program = this._state.select('program');
  protected readonly $categories = this._state.select('categories');

  defaultPageSize = DEFAULT_PAGE_SIZE;
  defaultPageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
  cacheDuration: CacheDuration = null; // = default

  data: ExtractionResult;
  $title = new BehaviorSubject<string>('EXTRACTION.TABLE.TITLE');
  sortedColumns: ExtractionColumn[];
  displayedColumns: string[];
  $columns = new BehaviorSubject<ExtractionColumn[]>(undefined);
  dataSource: TableDataSource<ExtractionRow>;
  settingsId: string;
  canCreateProduct = false;
  isAdmin = false;

  filterCriteriaCount$: Observable<number>;
  filterPanelFloating = true;
  stickyEnd = true;

  @ViewChild(MatTable, {static: true}) table: MatSort;
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: true}) sort: MatSort;
  @ViewChild(MatExpansionPanel, {static: true}) filterExpansionPanel: MatExpansionPanel;

  protected set programLabel(value: string) {
    this._state.set('programLabel', (_) => value);
  }
  protected get programLabel(): string {
    return this._state.get('programLabel') || this.program?.label;
  }

  protected set program(value: Program) {
    this._state.set('program', (_) => value);
  }
  protected get program(): Program {
    return this._state.get('program');
  }

  constructor(
    route: ActivatedRoute,
    router: Router,
    alertCtrl: AlertController,
    toastController: ToastController,
    translate: TranslateService,
    accountService: AccountService,
    service: ExtractionService,
    settings: LocalSettingsService,
    formBuilder: UntypedFormBuilder,
    platform: PlatformService,
    modalCtrl: ModalController,
    state: RxState<ExtractionTableState>,
    protected location: Location,
    protected productService: ProductService,
    protected programRefService: ProgramRefService,
    protected extractionTypeService: ExtractionTypeService,
    protected cd: ChangeDetectorRef
  ) {
    super(route, router, alertCtrl, toastController, translate, accountService, service, settings, formBuilder, platform, modalCtrl, state);

    this.displayedColumns = [];
    this.dataSource = new TableDataSource<ExtractionRow>([], ExtractionRow);
    this.isAdmin = this.accountService.isAdmin();
    this.stickyEnd = !this.mobile;

  }

  ngOnInit() {

    super.ngOnInit();

    // If the user changes the sort order, reset back to the first page.
    if (this.sort && this.paginator) {
      this.registerSubscription(
        this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0)
      );
    }

    this.registerSubscription(
      merge(
        this.sort?.sortChange || EMPTY,
        this.paginator?.page || EMPTY,
        this.onRefresh
      )
      .pipe(
        debounceTime(100),
        throttleTime(500) // Need because of 'this.paginator.pageIndex = 0' later
      )
      .subscribe(() => {
        if (isNil(this.type)) return; // Skip if no type
        // If already loading: skip
        if (this.loading) {
          // Warn user that he should wait
          if (this.started) this.showToast({type: 'warning', message: 'EXTRACTION.INFO.PLEASE_WAIT_WHILE_RUNNING'})
          return;
        }

        // Reset paginator if filter change
        if (this.paginator && this.paginator.pageIndex > 0 && this.dirty) {
          this.paginator.pageIndex = 0;
        }

        return this.loadData();
      }));

    this.filterCriteriaCount$ = this.criteriaForm.form.valueChanges
      .pipe(
        map(_ => this.criteriaForm.criteriaCount)
      );

    this._state.connect('programs', this.programRefService.watchAll(0, 100, 'label', 'asc', <ProgramFilter>{
      statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      acquisitionLevelLabels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION, AcquisitionLevelCodes.CHILD_OPERATION]
    }), (s, res) => res.data);

    this._state.connect('program', this._state.select(['programLabel', 'programs'], res => res)
      .pipe(
        map(({programLabel, programs}) => {
          return (programs || []).find(p => p.label === programLabel);
        })
      ));

    this._state.connect('categories', this.$types
      .pipe(
        filter(isNotNil),
        map(ExtractionTypeCategory.fromTypes)
      ));
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.$cancel.next(true);
  }

  async updateView(data: ExtractionResult) {

    try {
      this.data = data;

      // Translate names
      super.translateColumns(data.columns);

      // Sort columns, by rankOrder
      this.sortedColumns = data.columns.slice()
        // Sort by rankOder
        .sort((col1, col2) => col1.rankOrder - col2.rankOrder);

      this.displayedColumns = this.sortedColumns
        .map(column => column.columnName)
        // Remove id
        .filter(columnName => columnName !== "id")
        // Add actions column
        .concat(['actions']);

      this.$columns.next(data.columns); // WARN: must keep the original column order

      // Update rows
      this.dataSource.updateDatasource(data.rows || []);

      // Update title
      await this.updateTitle();

      // Wait end of datasource loading
      //await firstFalsePromise(this.dataSource.loadingSubject);

      setTimeout(() => this.updateQueryParams());
    }
    catch(err) {
      console.error('Error while updating the view', err);
    }
    finally {
      this.markAsLoaded({ emitEvent: false });
      this.markAsUntouched({ emitEvent: false });
      this.markAsPristine({ emitEvent: false });
      this.enable({ emitEvent: false });
      this.markForCheck();
    }
  }

  async setType(type: ExtractionType, opts?: { emitEvent?: boolean; skipLocationChange?: boolean; sheetName?: string }): Promise<boolean> {

    const changed = await super.setType(type, {...opts, emitEvent: false});

    if (changed) {
      this.$cancel.next(); // Cancelled existing load process

      this.canCreateProduct = this.type && this.accountService.isSupervisor();

      this.resetPaginatorAndSort();
      this.updateTitle();

      // Close the filter panel
      if (this.filterExpansionPanel && this.filterExpansionPanel.expanded) {
        this.filterExpansionPanel.close();
      }

      // Reset program
      this.resetProgram();

      this.markAsReady();

      if (!opts || opts.emitEvent !== true) {
        this.onRefresh.emit();
      }
    }

    return changed;

  }

  async setTypeAndProgram(type: ExtractionType, programLabel: string, opts = {emitEvent: true}) {

    // Apply type
    await this.setType(type, {emitEvent: false});

    // Apply filter
    if (this.criteriaForm.sheetName && isNotNilOrBlank(programLabel)) {
      await this.criteriaForm.setValue([
        ExtractionFilterCriterion.fromObject({
          sheetName: this.criteriaForm.sheetName,
          name: 'project',
          operator: '=',
          value: programLabel,
          hidden: true // Hide
        }),
        ExtractionFilterCriterion.fromObject({operator: '='})
      ], {emitEvent: false});
    }

    // Apply program label
    this.setProgramLabel(programLabel);

    // Refresh data
    if (opts.emitEvent !== false) {
      this.onRefresh.emit();
    }
  }

  setSheetName(sheetName: string, opts?: { emitEvent?: boolean; skipLocationChange?: boolean; }) {
    opts = {
      emitEvent: !this.loading,
        ...opts
    };

    // Reset sort and paginator
    const resetPaginator = (opts.emitEvent !== false && isNotNil(sheetName) && this.sheetName !== sheetName);

    super.setSheetName(sheetName, opts);

    if (resetPaginator) {
      this.resetPaginatorAndSort();
    }
  }

  resetPaginatorAndSort() {
    if (this.sort) this.sort.active = undefined;
    if (this.paginator) this.paginator.pageIndex = 0;
  }

  async openSelectColumnsModal(event?: any): Promise<any> {
    const columns = this.sortedColumns
      .map((column) => {
        return {
          name: column.columnName,
          label: column.name,
          visible: this.displayedColumns.indexOf(column.columnName) !== -1
        };
      });

    const modal = await this.modalCtrl.create({
      component: TableSelectColumnsComponent,
      componentProps: {columns: columns}
    });

    // On dismiss
    modal.onDidDismiss()
      .then(res => {
        if (!res) return; // CANCELLED

        // Apply columns
        this.displayedColumns = (columns && columns.filter(c => c.visible).map(c => c.name) || [])
          // Add actions column
          .concat(['actions']);

        // Update local settings
        return this.settings.savePageSetting(this.settingsId, this.displayedColumns, SETTINGS_DISPLAY_COLUMNS);
      });
    return modal.present();
  }

  onCellValueClick(event: MouseEvent, column: ExtractionColumn, value: string) {
    const hasChanged = this.criteriaForm.addFilterCriterion({
      name: column.columnName,
      operator: DEFAULT_CRITERION_OPERATOR,
      value: value,
      sheetName: this.sheetName
    }, {
      appendValue: event.ctrlKey
    });
    if (!hasChanged) return;

    const openExpansionPanel = this.filterExpansionPanel && !this.filterExpansionPanel.expanded;
    if (openExpansionPanel) {
      this.filterExpansionPanel.open();
    }

    if (!event.ctrlKey) {
      this.onRefresh.emit();

      if (openExpansionPanel) {
        setTimeout(() => this.filterExpansionPanel.close(), 500);
      }
    }
  }

  async aggregateAndSave(event?: Event) {
    if (!this.type || !this.canCreateProduct) return; // Skip

    this.markAsLoading();
    this.error = null;
    const filter = this.getFilterValue();
    this.disable();

    try {
      console.info('[extraction-table] Aggregating and saving as new product...');

      // Compute format, label and name
      const parentFormat = this.type.format.toUpperCase();
      const format = parentFormat.startsWith('AGG_') ? parentFormat : `AGG_${parentFormat}`;
      const [label, name] = await Promise.all([
        this.productService.computeNextLabel(format, this.types),
        this.computeNextProductName(format)
      ]);

      const entity = ExtractionProduct.fromObject({
        label,
        name,
        format,
        isSpatial: this.type.isSpatial,
        parent: this.type.id >= 0 ? ExtractionTypeUtils.minify(this.type) : null
      });

      // Save aggregation
      const savedEntity = await this.productService.save(entity, filter);

      // Wait for types cache updates
      await sleep(1000);

      // Open the new aggregation (no wait)
      await this.openProduct(savedEntity);

      // Change current type
      await this.setType(savedEntity, {emitEvent: true, skipLocationChange: false, sheetName: undefined});


    } catch (err) {
      console.error(err);
      this.error = err && err.message || err;
      this.markAsDirty();
    } finally {
      this.markAsLoaded()
      this.enable();
    }
  }

  async save(event?: Event) {
    if (!this.type) return; // Skip

    this.markAsLoading();
    this.error = null;
    const filter = this.getFilterValue();
    this.disable();

    let newType: ExtractionType;
    try {
      console.info('[extraction-table] Saving as new product...');

      // Compute label and name
      const [label, name] = await Promise.all([
        this.productService.computeNextLabel(this.type.format, this.types),
        this.computeNextProductName(this.type.format)
        ]);
      const entity = ExtractionProduct.fromObject({
        label,
        name,
        format: this.type.format,
        version: this.type.version,
        parent: this.type.id >= 0 ? ExtractionTypeUtils.minify(this.type) : null
      });

      // Save extraction
      const savedEntity = await this.productService.save(entity, filter);

      // Wait for types cache updates
      await sleep(1000);

      // Change current type
      newType = await this.findTypeByFilter(ExtractionTypeUtils.minify(savedEntity));

    } catch (err) {
      console.error(err);
      this.error = err && err.message || err;
      this.markAsDirty();
    } finally {
      this.markAsLoaded();
      this.enable();
    }

    if (newType) {
      await this.setType(newType, {emitEvent: true, skipLocationChange: false, sheetName: undefined});
    }
  }

  async delete(event?: Event) {
    if (!this.type || isNil(this.type.id)) return;

    if (this.type.category !== ExtractionCategories.PRODUCT) {
      console.warn("[extraction-table] Only product extraction can be deleted !");
      return;
    }

    const confirm = await this.askDeleteConfirmation(event);
    if (!confirm) return; // user cancelled

    // Mark as loading, and disable
    this.markAsLoading();
    this.error = null;
    this.disable();

    try {
      const aggType = ExtractionProduct.fromObject(this.type.asObject());
      await this.productService.delete(aggType);

      // Wait propagation to types
      await sleep(4000);

      // Change type, to the first one
      const types = await firstNotNilPromise(this.$types);
      if (types && types.length) {
        await this.setType(types[0], {emitEvent: false, skipLocationChange: false, sheetName: undefined});
      }
    }
    catch (err) {
      console.error(err);
      this.error = err && err.message || err;
      this.markAsDirty();
    }
    finally {
      this.markAsLoaded({emitEvent: false});
      this.enable();
      this.markForCheck();
    }

  }

  async openMap(event?: Event) {
    if (this.type?.isSpatial !== true) return; // Skip

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    return setTimeout(() => {
      // open the map
      return this.router.navigate(['extraction', 'map'],
        {
          queryParams: {
            category: this.type.category,
            label: this.type.label,
            ...this.getFilterAsQueryParams()
          }
        });
    }, 200); // Add a delay need by matTooltip to be hide
  }

  openProduct(type?: ExtractionType, event?: Event) {
    type = type || this.type;

    if (event) {
      // Need, to close mat tooltip
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    if (!type) return; // skip if not a aggregation type

    console.debug(`[extraction-table] Opening product {${type.label}`);

    return setTimeout(() => {
      // open the aggregation type
      return this.router.navigate(['extraction', 'product', type.id]);
    }, 100);
  }

  applyFilterAndClosePanel(event?: Event) {
    this.onRefresh.emit(event);
    this.filterExpansionPanel.close();
  }

  async resetFilter(event?: Event) {

    if (this.programLabel) {
      // Keep program (reapply type + program)
      await this.setTypeAndProgram(this.type, this.programLabel, {emitEvent: false})
    }
    else {
      // Clear all filter
      this.criteriaForm.reset();
    }

    // Apply filter
    this.applyFilterAndClosePanel(event);
  }

  doRefresh(event?: CompletableEvent) {
    this.cacheDuration = 'none';
    this.onRefresh.emit(event);

    // Wait end
    setTimeout(async () => {
      await this.waitIdle();

      // complete (e.g. IonRefresher)
      if (event?.target && event.target.complete) {
        event.target.complete();
      }

      // Refresh cache duration
      this.cacheDuration = null;
    }, 650);
  }

  /* -- protected method -- */

  protected resetProgram() {
    this._state.set('programLabel', (_) => null);
    this._state.set('program', (_) => null);
  }

  protected watchAllTypes(): Observable<LoadResult<ExtractionType>> {
    return this.extractionTypeService.watchAll(0, 1000, 'label', 'asc', <ExtractionTypeFilter>{
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        // Exclude spatial because we cannot load columns yet
        isSpatial: false
      });
  }

  protected async loadData() {

    if (!this.type?.label) return; // skip

    // To many call
    if (this.$cancel.observers.length >= 1) throw new Error("Too many call of loadData()");

    const typeLabel = this.type.label;
    this.settingsId = this.generateTableId();
    this.markAsLoading();
    this.resetError();

    let cancelled = false;
    const cancelSubscription = this.$cancel
      .subscribe(() => {
        if (this.type?.label !== typeLabel) {
          console.debug(`[extraction-table] Loading ${typeLabel} [CANCELLED]`);
          cancelled = true;
        }
      });

    const filter = this.getFilterValue();
    this.disable();
    this.markForCheck();

    const now = Date.now();
    console.info(`[extraction-table] Loading ${typeLabel} (sheet: ${filter.sheetName}, cacheDuration: ${this.cacheDuration})...`);

    try {

      // Load rows
      const data = await this.service.loadRows(this.type,
        this.paginator ? this.paginator.pageIndex * this.paginator.pageSize : null,
        this.paginator?.pageSize || DEFAULT_PAGE_SIZE,
        this.sort?.active,
        this.sort?.direction,
        filter,
        { cacheDuration: this.cacheDuration }
      );

      if (cancelled) return; // Stop if cancelled

      console.info(`[extraction-table] Loading ${typeLabel} (sheet: ${filter.sheetName}) [OK] in ${Date.now()-now}ms`);

      // Update the view
      await this.updateView(data);

    } catch (err) {
      if (!cancelled) {
        console.error(err);
        this.error = err && err.message || err;
        this.markAsDirty();
      }
    }
    finally {
      if (!cancelled) {
        this.markAsLoaded();
        this.enable();
      }

      cancelSubscription?.unsubscribe();
    }
  }

  protected fromObject(json: any): ExtractionType {
    return ExtractionType.fromObject(json);
  }

  protected isEquals(t1: ExtractionType, t2: ExtractionType): boolean {
    return ExtractionType.equals(t1, t2);
  }

  protected askDeleteConfirmation(event?: Event): Promise<boolean> {
    return Alerts.askActionConfirmation(this.alertCtrl, this.translate, true, event);
  }

  protected parseCriteriaFromString(queryString: string, sheet?: string): ExtractionFilterCriterion[] {
    const criteria = super.parseCriteriaFromString(queryString, sheet);

    const programIndex = (criteria || []).findIndex(criterion =>
      (!sheet || criterion.sheetName == sheet)
      && criterion.operator === '='
      && criterion.name === 'project'
      && isNotNilOrBlank(criterion.value));
    if (programIndex !== -1) {
      const programLabel = criteria[programIndex]?.value;
      this.setProgramLabel(programLabel);

      criteria[programIndex].hidden = true;
    }

    return criteria;
  }

  protected setProgramLabel(value?: string) {
    this.programLabel = value;
  }

  /* -- private method -- */

  private async computeNextProductName(format: string): Promise<string> {
    if (!format) return null;

    // Use program as format, if any
    const program = this.program;
    if (isNotNilOrBlank(program?.label)) {
      format = program.label;
    }

    const i18nPrefix = format?.startsWith('AGG_') ? 'EXTRACTION.AGGREGATION.NEW.' : 'EXTRACTION.PRODUCT.NEW.';
    const defaultName = await this.translate.get(i18nPrefix + 'DEFAULT_NAME', { format }).toPromise();

    return this.productService.computeNextName(defaultName, this.types);
  }

  private async updateTitle() {
    if (!this.type) {
      this.$title.next('EXTRACTION.TABLE.TITLE');
      return;
    }

    const categoryKey = `EXTRACTION.CATEGORY.${this.type.category.toUpperCase()}`;
    const categoryName = await this.translate.get(categoryKey).toPromise();
    const titlePrefix = (categoryName !== categoryKey) ? `<small>${categoryName}<br/></small>` : '';
    if (isNilOrBlank(titlePrefix)) {
      console.warn("Missing i18n key '" + categoryKey + "'");
    }

    // Try to get a title with the program
    const program = this.program;
    if (isNotNilOrBlank(program?.label)) {
      const titleKey = `EXTRACTION.LIVE.${this.type.format.toUpperCase()}.TITLE_PROGRAM`;
      const title = await this.translate.get(titleKey, program).toPromise();
      if (title !== titleKey) {
        this.$title.next(titlePrefix + title);
        return;
      }
    }

    // By default: use type name (should have been translated before)
    this.$title.next(titlePrefix + this.type.name);
  }

  private generateTableId() {
    const id = this.location.path(true).replace(/[?].*$/g, '').replace(/\/[\d]+/g, '_id') + "_" + this.constructor.name;
    return id;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }



}
