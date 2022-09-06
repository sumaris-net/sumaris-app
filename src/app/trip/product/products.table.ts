import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { filterNotNil, InMemoryEntitiesService, IReferentialRef, isNotEmptyArray, LoadResult, referentialToString } from '@sumaris-net/ngx-components';
import { BaseMeasurementsTable } from '../measurement/measurements.table.class';
import { ProductValidatorService } from '../services/validator/product.validator';
import { IWithProductsEntity, Product, ProductFilter } from '../services/model/product.model';
import { Platform } from '@ionic/angular';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { BehaviorSubject } from 'rxjs';
import { TableElement } from '@e-is/ngx-material-table';
import { IProductSaleModalOptions, ProductSaleModal } from '../sale/product-sale.modal';
import { SaleProductUtils } from '../services/model/sale-product.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { environment } from '@environments/environment';
import { ISamplesModalOptions, SamplesModal } from '../sample/samples.modal';
import { IProductModalOptions, ProductModal } from '@app/trip/product/product.modal';
import { mergeMap } from 'rxjs/operators';
import moment from 'moment';

export const PRODUCT_RESERVED_START_COLUMNS: string[] = ['parent', 'saleType', 'taxonGroup', 'weight', 'individualCount'];
export const PRODUCT_RESERVED_END_COLUMNS: string[] = []; // ['comments']; // todo

@Component({
  selector: 'app-products-table',
  templateUrl: 'products.table.html',
  styleUrls: ['products.table.scss'],
  providers: [
    {
      provide: InMemoryEntitiesService,
      useFactory: () => new InMemoryEntitiesService(Product, ProductFilter, {
        equals: Product.equals
      })
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsTable extends BaseMeasurementsTable<Product, ProductFilter> implements OnInit, OnDestroy {

  @Input() $parents: BehaviorSubject<IWithProductsEntity<any>[]>;
  @Input() parentAttributes: string[];

  @Input() showToolbar = true;
  @Input() showIdColumn = true;
  @Input() useSticky = false;

  @Input()
  set showParent(value: boolean) {
    this.setShowColumn('parent', value);
  }

  get showParent(): boolean {
    return this.getShowColumn('parent');
  }

  @Input()
  set showSaleType(value: boolean) {
    this.setShowColumn('saleType', value);
  }

  get showSaleType(): boolean {
    return this.getShowColumn('saleType');
  }

  @Input() set parentFilter(productFilter: ProductFilter) {
    this.setFilter(productFilter);
  }

  @Input()
  set value(data: Product[]) {
    this.memoryDataService.value = data;
  }

  get value(): Product[] {
    return this.memoryDataService.value;
  }

  get dirty(): boolean {
    return super.dirty || this.memoryDataService.dirty;
  }

  private productSalePmfms: DenormalizedPmfmStrategy[];

  constructor(
    injector: Injector,
    protected platform: Platform,
    protected validatorService: ProductValidatorService,
    protected memoryDataService: InMemoryEntitiesService<Product, ProductFilter>,
    protected cd: ChangeDetectorRef,
  ) {
    super(injector,
      Product, ProductFilter,
      memoryDataService,
      validatorService,
      {
        reservedStartColumns: PRODUCT_RESERVED_START_COLUMNS,
        reservedEndColumns: platform.is('mobile') ? [] : PRODUCT_RESERVED_END_COLUMNS,
        i18nColumnPrefix: 'TRIP.PRODUCT.LIST.'
      });
    this.autoLoad = false; // waiting parent to be loaded
    this.inlineEdition = this.validatorService && !this.mobile;
    this.confirmBeforeDelete = true;
    this.defaultPageSize = -1; // Do not use paginator

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.PRODUCT;
    this.defaultSortBy = 'id'
    this.defaultSortDirection = 'asc';

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    if (this.showParent && this.parentAttributes) {
      this.registerAutocompleteField('parent', {
        items: this.$parents,
        attributes: this.parentAttributes,
        columnNames: ['RANK_ORDER', 'REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
        columnSizes: this.parentAttributes.map(attr => attr === 'metier.label' ? 3 : (attr === 'rankOrderOnPeriod' ? 1 : undefined)),
        mobile: this.mobile
      });
    }

    const taxonGroupAttributes = this.settings.getFieldDisplayAttributes('taxonGroup');
    this.registerAutocompleteField('taxonGroup', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonGroups(value, options),
      columnSizes: taxonGroupAttributes.map(attr => attr === 'label' ? 3 : undefined),
      mobile: this.mobile
    });

    this.registerSubscription(
      filterNotNil(this.$pmfms)
        // if main pmfms are loaded, then other pmfm can be loaded
        .pipe(
          mergeMap(() => this.programRefService.loadProgramPmfms(this.programLabel, {acquisitionLevel: AcquisitionLevelCodes.PRODUCT_SALE}))
        )
        .subscribe((productSalePmfms) => {
           this.productSalePmfms = productSalePmfms;
        }));

    this.registerSubscription(this.onStartEditingRow.subscribe(row => this.onStartEditProduct(row)));
  }

  confirmEditCreate(event?: any, row?: TableElement<Product>): boolean {
    row = row || this.editedRow;

    const confirmed = super.confirmEditCreate(event, row);

    if (confirmed && row) {
      // update sales if any
      if (isNotEmptyArray(row.currentData.saleProducts)) {
        const updatedSaleProducts = SaleProductUtils.updateSaleProducts(row.currentData, this.productSalePmfms);
        row.validator.patchValue({saleProducts: updatedSaleProducts}, {emitEvent: true});
      }
    }
    return confirmed;
  }

  async openProductSale(event: MouseEvent, row: TableElement<Product>) {
    if (event) event.stopPropagation();

    const modal = await this.modalCtrl.create({
      component: ProductSaleModal,
      componentProps: <IProductSaleModalOptions>{
        disabled: this.disabled,
        mobile: this.mobile,
        data: row.currentData,
        productSalePmfms: this.productSalePmfms
      },
      backdropDismiss: false,
      cssClass: 'modal-large'
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data) {
      // patch saleProducts only
      row.validator.patchValue({saleProducts: data.saleProducts}, {emitEvent: true});
      this.markAsDirty({emitEvent: false});
      this.markForCheck();
    }
  }

  async openSampling(event: MouseEvent, row: TableElement<Product>) {
    if (event) event.stopPropagation();

    const samples = row.currentData.samples || [];
    const taxonGroup = row.currentData.taxonGroup;
    const title = await this.translate.get('TRIP.SAMPLE.EDIT.TITLE', {label: referentialToString(taxonGroup)}).toPromise();

    const modal = await this.modalCtrl.create({
      component: SamplesModal,
      componentProps: <ISamplesModalOptions>{
        programLabel: this.programLabel,
        disabled: this.disabled,
        data: samples,
        defaultSampleDate: moment(), // trick to valid sample row, should be set with correct date
        defaultTaxonGroup: taxonGroup,
        showLabel: false,
        showTaxonGroup: false,
        showTaxonName: false,
        title
        // onReady: (obj) => this.onInitForm && this.onInitForm.emit({form: obj.form.form, pmfms: obj.$pmfms.getValue()})
      },
      backdropDismiss: false,
      keyboardClose: true
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const res = await modal.onDidDismiss();

    if (res?.data) {
      if (this.debug) console.debug('[products-table] Modal result: ', res.data);

      // patch samples only
      row.validator.patchValue({samples: res?.data}, {emitEvent: true});
      this.markAsDirty({emitEvent: false});
      this.markForCheck();
    }
  }

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail || this.readOnly) return false;

    const res = await this.openDetailModal();
    if (res && res.data) {
      const row = await this.addEntityToTable(res.data);
      if (res.role === 'sampling') {
        await this.openSampling(null, row);
      } else if (res.role === 'sale') {
        await this.openProductSale(null, row);
      }
    }
    return true;
  }


  protected async openRow(id: number, row: TableElement<Product>): Promise<boolean> {
    if (!this.allowRowDetail || this.readOnly) return false;

    const data = this.toEntity(row, true);

    const res = await this.openDetailModal(data);
    if (res && res.data) {
      await this.updateEntityToTable(res.data, row, {confirmCreate: false});
    } else {
      this.editedRow = null;
    }

    if (res && res.role) {
      if (res.role === 'sampling') {
        await this.openSampling(null, row);
      } else if (res.role === 'sale') {
        await this.openProductSale(null, row);
      }
    }
    return true;
  }

  async openDetailModal(product?: Product): Promise<{ data: Product, role: string } | undefined> {
    const isNew = !product && true;
    if (isNew) {
      product = new this.dataType();
      await this.onNewEntity(product);

      if (this.filter?.parent) {
       product.parent = this.filter.parent;
      } else if (this.$parents.value?.length === 1) {
        product.parent =  this.$parents.value[0];
      }
    }

    this.markAsLoading();

    const modal = await this.modalCtrl.create({
      component: ProductModal,
      componentProps: <IProductModalOptions>{
        programLabel: this.programLabel,
        acquisitionLevel: this.acquisitionLevel,
        data: product,
        parents: this.$parents && this.$parents.getValue() || null,
        parentAttributes: this.parentAttributes,
        disabled: this.disabled,
        mobile: this.mobile,
        isNew,
        onDelete: (event, Product) => this.deleteProduct(event, Product)
      },
      cssClass: 'modal-large',
      keyboardClose: true
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data, role} = await modal.onDidDismiss();
    if (data && this.debug) console.debug('[product-table] product modal result: ', data, role);
    this.markAsLoaded();

    if (data) {
      return {data: data as Product, role};
    } else if (role) {
      return {data: undefined, role};
    }

    // Exit if empty
    return undefined;
  }

  async deleteProduct(event: UIEvent, data: Product): Promise<boolean> {
    const row = await this.findRowByProduct(data);

    // Row not exists: OK
    if (!row) return true;

    const canDeleteRow = await this.canDeleteRows([row]);
    if (canDeleteRow === true) {
      this.cancelOrDelete(event, row, {interactive: false /*already confirmed*/});
    }
    return canDeleteRow;
  }

  /* -- protected methods -- */

  protected async suggestTaxonGroups(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    return this.programRefService.suggestTaxonGroups(value,
      {
        program: this.programLabel,
        searchAttribute: options && options.searchAttribute
      });
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async findRowByProduct(product: Product): Promise<TableElement<Product>> {
    return Product && (await this.dataSource.getRows()).find(r => product.equals(r.currentData));
  }

  private onStartEditProduct(row: TableElement<Product>) {
    if (row.currentData && !row.currentData.parent) {
      if (this.filter?.parent) {
        row.validator.patchValue({parent: this.filter.parent});
      } else if (this.$parents.value?.length === 1) {
        row.validator.patchValue({parent: this.$parents.value[0]});
      }
    }
  }
}
