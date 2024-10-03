import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import {
  filterNotNil,
  InMemoryEntitiesService,
  IReferentialRef,
  isNotEmptyArray,
  LoadResult,
  LocalSettingsService,
  referentialToString,
} from '@sumaris-net/ngx-components';
import { BaseMeasurementsTable, BaseMeasurementsTableState } from '@app/data/measurement/measurements-table.class';
import { ProductValidatorService } from './product.validator';
import { IWithProductsEntity, Product, ProductFilter } from './product.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { firstValueFrom, Observable } from 'rxjs';
import { TableElement } from '@e-is/ngx-material-table';
import { IProductSaleModalOptions, ProductSaleModal } from '../sale/product-sale.modal';
import { SaleProductUtils } from '../sale/sale-product.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { environment } from '@environments/environment';
import { ISamplesModalOptions, SamplesModal } from '../sample/samples.modal';
import { IProductModalOptions, ProductModal } from '@app/trip/product/product.modal';
import { mergeMap } from 'rxjs/operators';
import moment from 'moment';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';

export const PRODUCT_RESERVED_START_COLUMNS: string[] = ['parent', 'saleType', 'taxonGroup', 'weight', 'individualCount'];
export const PRODUCT_RESERVED_END_COLUMNS: string[] = []; // ['comments']; // todo

export interface ProductsTableState extends BaseMeasurementsTableState {
  parents: IWithProductsEntity<any>[];
}

@Component({
  selector: 'app-products-table',
  templateUrl: 'products.table.html',
  styleUrls: ['products.table.scss'],
  providers: [
    {
      provide: InMemoryEntitiesService,
      useFactory: () =>
        new InMemoryEntitiesService(Product, ProductFilter, {
          equals: Product.equals,
        }),
    },
    RxState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsTable
  extends BaseMeasurementsTable<Product, ProductFilter, InMemoryEntitiesService<Product, ProductFilter>, ProductValidatorService, ProductsTableState>
  implements OnInit, OnDestroy
{
  private productSalePmfms: DenormalizedPmfmStrategy[];

  @RxStateSelect() protected parents$: Observable<IWithProductsEntity<any>[]>;

  @Input() @RxStateProperty() parents: IWithProductsEntity<any>[];
  @Input() parentAttributes: string[];
  @Input() showIdColumn = true;
  @Input() showActionButtons = true;

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

  constructor(
    injector: Injector,
    settings: LocalSettingsService,
    dataService: InMemoryEntitiesService<Product, ProductFilter>,
    validatorService: ProductValidatorService
  ) {
    super(injector, Product, ProductFilter, dataService, validatorService, {
      suppressErrors: true,
      reservedStartColumns: PRODUCT_RESERVED_START_COLUMNS,
      reservedEndColumns: settings.mobile ? [] : PRODUCT_RESERVED_END_COLUMNS,
      i18nColumnPrefix: 'TRIP.PRODUCT.LIST.',
    });
    this.autoLoad = false; // waiting parent to be loaded
    this.inlineEdition = this.validatorService && !this.mobile;
    this.confirmBeforeDelete = true;
    this.defaultPageSize = -1; // Do not use paginator

    // Set defaults
    this.acquisitionLevel = AcquisitionLevelCodes.PRODUCT;
    this.defaultSortBy = 'id';
    this.defaultSortDirection = 'asc';
    this.compactFields = false;

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    if (this.showParent && this.parentAttributes) {
      this.registerAutocompleteField('parent', {
        items: this.parents$,
        attributes: this.parentAttributes,
        columnNames: ['RANK_ORDER', 'REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
        columnSizes: this.parentAttributes.map((attr) => (attr === 'metier.label' ? 3 : attr === 'rankOrderOnPeriod' ? 1 : undefined)),
        mobile: this.mobile,
      });
    }

    const taxonGroupAttributes = this.settings.getFieldDisplayAttributes('taxonGroup');
    this.registerAutocompleteField('taxonGroup', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonGroups(value, options),
      columnSizes: taxonGroupAttributes.map((attr) => (attr === 'label' ? 3 : undefined)),
      mobile: this.mobile,
    });

    this.registerSubscription(
      filterNotNil(this.pmfms$)
        // if main pmfms are loaded, then other pmfm can be loaded
        .pipe(mergeMap(() => this.programRefService.loadProgramPmfms(this.programLabel, { acquisitionLevel: AcquisitionLevelCodes.PRODUCT_SALE })))
        .subscribe((productSalePmfms) => {
          this.productSalePmfms = productSalePmfms;
        })
    );

    // TODO pass to constructor's options
    this.registerSubscription(this.onStartEditingRow.subscribe((row) => this.onStartEditProduct(row)));
  }

  confirmEditCreate(event?: any, row?: TableElement<Product>): boolean {
    row = row || this.editedRow;

    const confirmed = super.confirmEditCreate(event, row);

    if (confirmed && row) {
      // update sales if any
      if (isNotEmptyArray(row.currentData.saleProducts)) {
        const updatedSaleProducts = SaleProductUtils.updateSaleProducts(row.currentData, this.productSalePmfms);
        row.validator.patchValue({ saleProducts: updatedSaleProducts }, { emitEvent: true });
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
        productSalePmfms: this.productSalePmfms,
      },
      backdropDismiss: false,
      cssClass: 'modal-large',
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data) {
      // patch saleProducts only
      row.validator.patchValue({ saleProducts: data.saleProducts }, { emitEvent: true });
      this.markAsDirty({ emitEvent: false });
      this.markForCheck();
    }
  }

  async openSampling(event: MouseEvent, row: TableElement<Product>) {
    if (event) event.stopPropagation();

    if (row.editing) {
      const confirmed = await this.confirmEditCreate(event, row);
      if (!confirmed) return; // skip
    }

    const samples = row.currentData.samples || [];
    const taxonGroup = row.currentData.taxonGroup;
    const title = await firstValueFrom(this.translate.get('TRIP.SAMPLE.EDIT.TITLE', { label: referentialToString(taxonGroup) }));

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
        title,
        // onReady: (obj) => this.onInitForm && this.onInitForm.emit({form: obj.form.form, pmfms: obj.$pmfms.getValue()})
      },
      backdropDismiss: false,
      keyboardClose: true,
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const res = await modal.onDidDismiss();

    if (res?.data) {
      if (this.debug) console.debug('[products-table] Modal result: ', res.data);

      // patch samples only
      row.validator.patchValue({ samples: res?.data }, { emitEvent: true });
      this.markAsDirty({ emitEvent: false });
      this.markForCheck();
    }
  }

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail || this.readOnly) return false;

    const { data, role } = await this.openDetailModal();
    if (data && role !== 'delete') {
      const row = await this.addEntityToTable(data);

      // Redirect to another modal
      if (role === 'sampling') {
        await this.openSampling(null, row);
      } else if (role === 'sale') {
        await this.openProductSale(null, row);
      }
    }
    return true;
  }

  protected async openRow(id: number, row: TableElement<Product>): Promise<boolean> {
    if (!this.allowRowDetail || this.readOnly) return false;

    const entity = this.toEntity(row, true);

    const { data, role } = await this.openDetailModal(entity);
    if (data && role !== 'delete') {
      await this.updateEntityToTable(data, row, { confirmEdit: false });
    } else {
      this.editedRow = null;
    }

    if (role) {
      if (role === 'sampling') {
        await this.openSampling(null, row);
      } else if (role === 'sale') {
        await this.openProductSale(null, row);
      }
    }
    return true;
  }

  async openDetailModal(dataToOpen?: Product): Promise<{ data: Product; role: string } | undefined> {
    const isNew = !dataToOpen && true;

    if (isNew) {
      dataToOpen = new this.dataType();
      await this.onNewEntity(dataToOpen);

      if (this.filter?.parent) {
        dataToOpen.parent = this.filter.parent;
      } else if (this.parents?.length === 1) {
        dataToOpen.parent = this.parents[0];
      }
    }

    this.markAsLoading();

    const modal = await this.modalCtrl.create({
      component: ProductModal,
      componentProps: <IProductModalOptions>{
        programLabel: this.programLabel,
        acquisitionLevel: this.acquisitionLevel,
        data: dataToOpen,
        parents: this.parents || null,
        parentAttributes: this.parentAttributes,
        disabled: this.disabled,
        mobile: this.mobile,
        isNew,
        onDelete: (event, data) => this.deleteEntity(event, data),
      },
      cssClass: 'modal-large',
      keyboardClose: true,
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const { data, role } = await modal.onDidDismiss();
    if (data && this.debug) console.debug('[product-table] product modal result: ', data, role);
    this.markAsLoaded();

    return { data: (data as Product) ? (data as Product) : undefined, role };
  }

  /* -- protected methods -- */

  protected async suggestTaxonGroups(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    return this.programRefService.suggestTaxonGroups(value, {
      program: this.programLabel,
      searchAttribute: options && options.searchAttribute,
    });
  }

  private onStartEditProduct(row: TableElement<Product>) {
    if (row.currentData && !row.currentData.parent) {
      if (this.filter?.parent) {
        row.validator.patchValue({ parent: this.filter.parent });
      } else if (this.parents?.length === 1) {
        row.validator.patchValue({ parent: this.parents[0] });
      }
    }
  }
}
