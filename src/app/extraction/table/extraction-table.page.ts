import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {BehaviorSubject, EMPTY, merge, Observable, Subject} from 'rxjs';
import { arrayGroupBy, isNil, isNotNil, LoadResult, propertyComparator, sleep } from '@sumaris-net/ngx-components';
import {TableDataSource} from "@e-is/ngx-material-table";
import { ExtractionCategories, ExtractionColumn, ExtractionResult, ExtractionRow, ExtractionType, ExtractionTypeUtils } from '../type/extraction-type.model';
import {TableSelectColumnsComponent}  from "@sumaris-net/ngx-components";
import {DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS, SETTINGS_DISPLAY_COLUMNS}  from "@sumaris-net/ngx-components";
import {AlertController, ModalController, ToastController} from "@ionic/angular";
import {Location} from "@angular/common";
import {filter, map} from "rxjs/operators";
import {firstNotNilPromise} from "@sumaris-net/ngx-components";
import { DEFAULT_CRITERION_OPERATOR, ExtractionAbstractPage } from '../common/extraction-abstract.page';
import {ActivatedRoute, Router} from "@angular/router";
import {TranslateService} from "@ngx-translate/core";
import {ExtractionService} from "../common/extraction.service";
import {FormBuilder} from "@angular/forms";
import {AccountService}  from "@sumaris-net/ngx-components";
import {LocalSettingsService}  from "@sumaris-net/ngx-components";
import {Alerts} from "@sumaris-net/ngx-components";
import {PlatformService}  from "@sumaris-net/ngx-components";
import {MatTable} from "@angular/material/table";
import {MatPaginator} from "@angular/material/paginator";
import {MatSort} from "@angular/material/sort";
import {MatExpansionPanel} from "@angular/material/expansion";
import { ProductService } from '@app/extraction/product/product.service';
import { ExtractionProduct } from '@app/extraction/product/product.model';
import { ExtractionTypeService } from '@app/extraction/type/extraction-type.service';


@Component({
  selector: 'app-extraction-table-page',
  templateUrl: './extraction-table.page.html',
  styleUrls: ['./extraction-table.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtractionTablePage extends ExtractionAbstractPage<ExtractionType> implements OnInit {

  defaultPageSize = DEFAULT_PAGE_SIZE;
  defaultPageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;

  data: ExtractionResult;
  $title = new Subject<string>();
  sortedColumns: ExtractionColumn[];
  displayedColumns: string[];
  $columns = new BehaviorSubject<ExtractionColumn[]>(undefined);
  dataSource: TableDataSource<ExtractionRow>;
  settingsId: string;
  showHelp = true;
  canCreateProduct = false;
  isAdmin = false;

  typesByCategory$: Observable<{key: string, value: ExtractionType[]}[]>;
  criteriaCount$: Observable<number>;

  @ViewChild(MatTable, {static: true}) table: MatSort;
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: true}) sort: MatSort;
  @ViewChild(MatExpansionPanel, {static: true}) filterExpansionPanel: MatExpansionPanel;

  constructor(
    route: ActivatedRoute,
    router: Router,
    alertCtrl: AlertController,
    toastController: ToastController,
    translate: TranslateService,
    accountService: AccountService,
    service: ExtractionService,
    settings: LocalSettingsService,
    formBuilder: FormBuilder,
    platform: PlatformService,
    modalCtrl: ModalController,
    protected location: Location,
    protected productService: ProductService,
    protected extractionTypeService: ExtractionTypeService,
    protected cd: ChangeDetectorRef
  ) {
    super(route, router, alertCtrl, toastController, translate, accountService, service, settings, formBuilder, platform, modalCtrl);

    this.displayedColumns = [];
    this.dataSource = new TableDataSource<ExtractionRow>([], ExtractionRow);
    this.isAdmin = this.accountService.isAdmin();
  }

  ngOnInit() {

    super.ngOnInit();

    // Create a types map by category (use for type sub menu)
    this.typesByCategory$ = this.$types
      .pipe(
        map(types => arrayGroupBy(types, 'category')),
        filter(isNotNil),
        map(map => Object.getOwnPropertyNames(map)
            .map(key => ({key, value: map[key]}))
        )
      );

    // If the user changes the sort order, reset back to the first page.
    if (this.sort && this.paginator) this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    merge(
      this.sort && this.sort.sortChange || EMPTY,
      this.paginator && this.paginator.page || EMPTY,
      this.onRefresh
    )
      .subscribe(() => {
        if (this.loading || isNil(this.type)) return; // avoid multiple load

        // Reset paginator if filter change
        if (this.paginator && this.paginator.pageIndex > 0 && this.dirty) {
          this.paginator.pageIndex = 0;
        }

        return this.loadData();
      });

    this.criteriaCount$ = this.criteriaForm.form.valueChanges
      .pipe(
        map(_ => this.criteriaForm.criteriaCount)
      );
  }

  async updateView(data: ExtractionResult) {

    try {
      this.data = data;

      // Translate names
      this.translateColumns(data.columns);

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
      await firstNotNilPromise(this.dataSource.connect(null));

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
    const changed = await super.setType(type, opts);

    if (changed) {
      this.canCreateProduct = this.type && this.accountService.isSupervisor();

      this.resetPaginatorAndSort();

      // Close the filter panel
      if (this.filterExpansionPanel && this.filterExpansionPanel.expanded) {
        this.filterExpansionPanel.close();
      }

      this.markAsReady();
    }

    return changed;

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


  async aggregateAndSave(event?: UIEvent) {
    if (!this.type || !this.canCreateProduct) return; // Skip

    this.markAsLoading();
    this.error = null;
    const filter = this.getFilterValue();
    this.disable();

    try {

      // Compute a new name
      const name = await this.translate.get('EXTRACTION.AGGREGATION.NEW_NAME',
        {name: this.type.name})
        .toPromise();

      const format = `agg_${this.type.format}}`;

      // Create a unique label
      const label = `${format}-${this.accountService.account.id}_${Date.now()}`;

      const entity = ExtractionProduct.fromObject({
        label,
        name,
        format,
        parent: ExtractionTypeUtils.minify(this.type)
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

  async save(event?: UIEvent) {
    if (!this.type) return; // Skip

    this.markAsLoading();
    this.error = null;
    const filter = this.getFilterValue();
    this.disable();

    try {
      // Compute a new name
      const name = await this.translate.get('EXTRACTION.PRODUCT.NEW_NAME',
        {name: this.type.name})
        .toPromise();

      // Create a unique label
      const label = `${this.type.format}-${this.accountService.account.id}_${Date.now()}`;

      const entity = ExtractionProduct.fromObject({
        ...ExtractionTypeUtils.minify(this.type),
        label,
        name
      });

      // Save extraction
      const savedEntity = await this.productService.save(entity, filter);

      // Wait for types cache updates
      await sleep(1000);

      // Change current type
      await this.setType(savedEntity, {emitEvent: true, skipLocationChange: false, sheetName: undefined});

    } catch (err) {
      console.error(err);
      this.error = err && err.message || err;
      this.markAsDirty();
    } finally {
      this.markAsLoaded();
      this.enable();
    }
  }

  async delete(event?: UIEvent) {
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

  async openMap(event?: UIEvent) {
    if (!this.type || !this.type.isSpatial) return; // Skip

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

  openProduct(type?: ExtractionType, event?: UIEvent) {
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

  applyFilterAndClosePanel(event?: UIEvent) {
    this.onRefresh.emit(event);
    this.filterExpansionPanel.close();
  }

  resetFilter(event?: UIEvent) {
    this.criteriaForm.reset();
    this.applyFilterAndClosePanel(event);
  }

  /* -- protected method -- */

  protected watchAllTypes(): Observable<LoadResult<ExtractionType>> {
    return this.extractionTypeService.watchAll(0, 1000);
  }

  protected async loadData() {

    if (!this.type || !this.type.category || !this.type.label) return; // skip

    this.settingsId = this.generateTableId();
    this.error = null;
    console.debug(`[extraction-table] Loading ${this.type.category} ${this.type.label}`);

    this.markAsLoading();
    const filter = this.getFilterValue();
    this.disable();
    this.markForCheck();

    try {
      // Load rows
      const data = await this.service.loadRows(this.type,
        this.paginator && this.paginator.pageIndex * this.paginator.pageSize,
        this.paginator && this.paginator.pageSize || DEFAULT_PAGE_SIZE,
        this.sort && this.sort.active,
        this.sort && this.sort.direction,
        filter
      );

      // Update the view
      await this.updateView(data);
    } catch (err) {
      console.error(err);
      this.error = err && err.message || err;
      this.markAsDirty();
    }
    finally {
      this.markAsLoaded();
      this.enable();
    }
  }

  protected fromObject(json: any): ExtractionType {
    return ExtractionType.fromObject(json);
  }

  protected isEquals(t1: ExtractionType, t2: ExtractionType): boolean {
    return ExtractionType.equals(t1, t2);
  }

  protected askDeleteConfirmation(event?: UIEvent): Promise<boolean> {
    return Alerts.askActionConfirmation(this.alertCtrl, this.translate, true, event);
  }

  /* -- private method -- */

  private async updateTitle() {

    const categoryKey = `EXTRACTION.CATEGORY.${this.type.category.toUpperCase()}`;
    const categoryName = await this.translate.get(categoryKey).toPromise();
    if (categoryName === categoryKey) {
      console.warn("Missing i18n key '" + categoryKey + "'");
      this.$title.next(this.type.name);
    }
    else {
      this.$title.next(`<small>${categoryName}<br/></small>${this.type.name}`);
    }
  }

  private generateTableId() {
    const id = this.location.path(true).replace(/[?].*$/g, '').replace(/\/[\d]+/g, '_id') + "_" + this.constructor.name;
    return id;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
