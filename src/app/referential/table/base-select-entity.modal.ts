import { Directive, Injector, Input, OnInit, Optional, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AppTable, EntitiesTableDataSource, EntitiesTableDataSourceConfig, IEntitiesService, IEntity, isNotEmptyArray, isNotNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { Subject } from 'rxjs';
import { environment } from '@environments/environment';
import { TableElement } from '@e-is/ngx-material-table';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';

export interface IBaseSelectEntityModalOptions<T = any, F = any> {
  entityName: string;
  filter: Partial<F>;
  showFilter: boolean;
  allowMultipleSelection: boolean;
  mobile?: boolean;
  dataService?: IEntitiesService<T, F>;
  filterType?: new() => F;
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class BaseSelectEntityModal<
  T extends IEntity<T, ID>,
  F = any,
  ID = number
  > implements OnInit, IBaseSelectEntityModalOptions<T, F> {

  $title = new Subject<string>();
  datasource: EntitiesTableDataSource<T, F, ID>;

  protected readonly modalCtrl: ModalController;

  @ViewChild('table', { static: true }) table: AppTable<T, F, ID>;

  @Input() mobile: boolean;
  @Input() showFilter = true;
  @Input() filter: F;
  @Input() entityName: string;
  @Input() allowMultipleSelection: boolean;
  @Input() dataService: IEntitiesService<T, F>;
  @Input() filterType: new() => F;

  get loading(): boolean {
    return this.table && this.table.loading;
  }

  protected constructor(
    protected injector: Injector,
    protected dataType: new() => T,
    filterType: new() => F,
    @Optional() dataService: IEntitiesService<T, F>,
    @Optional() protected options?: Partial<EntitiesTableDataSourceConfig<T, ID>>
  ) {
    this.modalCtrl = injector.get(ModalController);
    this.dataService = dataService;
    this.filterType = filterType;
  }

  ngOnInit() {

    // Init table
    if (!this.table) throw new Error('Missing table child component');
    if (!this.filter) throw new Error('Missing \'filter\'');
    if (!this.dataService) throw new Error('Missing \'dataService\'');

    // Set defaults
    this.allowMultipleSelection = toBoolean(this.allowMultipleSelection, false);
    this.mobile = isNotNil(this.mobile) ? this.mobile : this.injector.get(LocalSettingsService).mobile;

    this.datasource = new EntitiesTableDataSource<T, F, ID>(this.dataType,
      this.dataService,
      null,
      {
        prependNewElements: false,
        suppressErrors: environment.production,
        ...this.options
      });

    this.table.setDatasource(this.datasource);
    this.table.filter = this.filter;

    // Compute title
    this.updateTitle();

    this.loadData();

  }

  loadData() {
    // Load data
    setTimeout(() => {

      this.table.onRefresh.next("modal");
      this.markForCheck();
    }, 200);
  }

  async selectRow(row: TableElement<T>) {
    const table = this.table;
    if (row && table) {
      if (!this.allowMultipleSelection) {
        table.selection.clear();
        table.selection.select(row);
        await this.close();
      }
      else {
        table.selection.toggle(row);
      }
    }
  }

  async close(event?: any): Promise<boolean> {
    try {
      const items = this.table.selectedEntities;

      // Leave, only if there is content
      if (isNotEmptyArray(items)) {
        this.modalCtrl.dismiss(items);
      }
      return true;
    } catch (err) {
      // nothing to do
      return false;
    }
  }

  async cancel() {
    await this.modalCtrl.dismiss();
  }

  hasSelection(): boolean {
    const selectionCount = this.table.selectedEntities?.length || 0;
    return selectionCount > 0 && (this.allowMultipleSelection || selectionCount === 1);
  }

  private async updateTitle(){
    const title = await this.computeTitle();
    this.$title.next(title);
  }

  protected abstract computeTitle(): Promise<string>;

  protected markForCheck() {
    // Can be override by subclasses
  }
}
