import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { ExtractionCategories, ExtractionColumn, ExtractionFilter } from '../type/extraction-type.model';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { ValidatorService } from '@e-is/ngx-material-table';
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import {
  AccountService,
  Alerts,
  AppEntityEditor,
  EntityServiceLoadOptions,
  equals,
  HistoryPageReference,
  isEmptyArray,
  isNil,
  isNotNil,
  Toasts,
} from '@sumaris-net/ngx-components';
import { ProductForm } from './product.form';
import { ExtractionProduct } from '@app/extraction/product/product.model';
import { ExtractionProductValidatorService } from '@app/extraction/product/product.validator';
import { ProductService } from '@app/extraction/product/product.service';
import { ExtractionTablePage } from '@app/extraction/table/extraction-table.page';
import { debounceTime, filter } from 'rxjs/operators';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { environment } from '@environments/environment';

export const ProductPageTabs = {
  GENERAL: 0,
  DATASOURCE: 1,
  RESULT: 2,
};

@Component({
  selector: 'app-product-page',
  templateUrl: './product.page.html',
  styleUrls: ['./product.page.scss'],
  providers: [{ provide: ValidatorService, useExisting: ExtractionProductValidatorService }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPage extends AppEntityEditor<ExtractionProduct> implements OnInit {
  columns: ExtractionColumn[];

  @ViewChild('productForm', { static: true }) productForm: ProductForm;
  @ViewChild('datasourceTable', { static: true }) datasourceTable: ExtractionTablePage;
  @ViewChild('resultTable', { static: true }) resultTable: ExtractionTablePage;

  get form(): UntypedFormGroup {
    return this.productForm.form;
  }

  constructor(
    protected formBuilder: UntypedFormBuilder,
    protected productService: ProductService,
    protected accountService: AccountService,
    protected validatorService: ExtractionProductValidatorService
  ) {
    super(
      ExtractionProduct,
      // Data service
      {
        load: (id: number, options) => productService.load(id, options),
        canUserWrite: (data: ExtractionProduct, opts?: any) => productService.canUserWrite(data, opts),
        save: (data, _) => productService.save(data),
        delete: (data, _) => productService.deleteAll([data]),
        listenChanges: (id, opts) => productService.listenChanges(id, opts),
      },
      // Editor options
      {
        pathIdAttribute: 'productId',
        tabCount: 3,
      }
    );

    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.registerSubscription(
      this.datasourceTable.filterChanges
        .pipe(
          filter((_) => !this.loading && !this.saving),
          debounceTime(450)
        )
        .subscribe((filter) => {
          const json = filter.asObject({ minify: true });
          const filterControl = this.form.get('filter');
          const previousJson = ExtractionFilter.fromObject(filterControl?.value)?.asObject({ minify: true });
          if (!equals(json, previousJson)) {
            this.form.patchValue({ filter: json });
            this.markAsDirty();
          }
        })
    );
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.enable(opts);

    // Label always disable is saved
    if (!this.isNewData) {
      this.form.get('label').disable();
    }
  }

  async openMap(event?: Event) {
    if (this.dirty) {
      // Ask user confirmation
      const { confirmed, save } = await Alerts.askSaveBeforeAction(this.alertCtrl, this.translate);
      if (!confirmed) return;
      if (save) await this.save(event);
    }

    if (!this.data || isEmptyArray(this.data.stratum)) return; // Unable to load the map

    return setTimeout(
      () =>
        // open the map
        this.router.navigate(['../../map'], {
          relativeTo: this.route,
          queryParams: {
            category: this.data.category,
            label: this.data.label,
            sheet: this.data.stratum[0].sheetName,
          },
        }),
      200
    ); // Add a delay need by matTooltip to be hide
  }

  async updateProduct(event?: Event) {
    if (this.dirty) {
      // Ask user confirmation
      const { confirmed, save } = await Alerts.askSaveBeforeAction(this.alertCtrl, this.translate, { valid: this.valid });
      if (!confirmed) return;
      if (save) await this.save(event);
    }

    this.markAsLoading();

    try {
      const updatedEntity = await this.productService.updateProduct(this.data.id);
      await this.onEntityLoaded(updatedEntity);
      await this.updateView(updatedEntity);

      Toasts.show(this.toastController, this.translate, {
        type: 'info',
        message: 'EXTRACTION.PRODUCT.INFO.UPDATED_SUCCEED',
      });
    } catch (err) {
      this.setError(err);
    } finally {
      this.markAsLoaded();
    }

    // Switch to result tab
    if (!this.data.isSpatial) {
      this.selectedTabIndex = ProductPageTabs.RESULT;
    }
  }

  async setValue(data: ExtractionProduct) {
    // Apply data to form
    await this.productForm.setValue(data.asObject());

    await this.initDatasourceTable(data);

    if (!data.isSpatial) {
      await this.initResultTable(data);
    }
  }

  /* -- protected -- */

  async initDatasourceTable(data: ExtractionProduct) {
    // Apply to table
    try {
      let sourceTypeId: number;
      if (isNotNil(data.parentId)) {
        sourceTypeId = data.parentId;
      } else {
        await this.datasourceTable.ready();
        const types = this.datasourceTable.types;

        // Resolve by format + version
        const format = data.format?.startsWith('AGG_') ? data.format.substring(4) : data.format;
        sourceTypeId = types.find((t) => t.format === format && t.version === data.version)?.id;

        // Or resolve by format only, if not found
        if (isNil(sourceTypeId)) {
          sourceTypeId = types.find((t) => t.format === format)?.id;
        }

        // Types not found: stop here
        if (isNil(sourceTypeId)) {
          console.warn(`[product] Unknown datasource type: unable to find the format '${data.format}' in types [${types.join(',')}]`);
          this.datasourceTable.markAsLoaded();
          return;
        }
      }

      const filter = data.filter || (data.filterContent && JSON.parse(data.filterContent));

      // Load data
      await this.datasourceTable.load(sourceTypeId, {
        filter,
        // Should load data, if current tab
        emitEvent: this.selectedTabIndex === ProductPageTabs.DATASOURCE,
      });
    } catch (err) {
      console.error(err);
    }
  }

  async initResultTable(data: ExtractionProduct) {
    this.resultTable.types = [data];
    // Apply to table
    try {
      await this.resultTable.load(data.id, {
        filter: {
          sheetName: data.sheetNames?.[0],
        },
        // Should load data, if current tab
        emitEvent: this.selectedTabIndex === ProductPageTabs.RESULT,
      });
    } catch (err) {
      console.error(err);
    }
  }

  onTabChange(event: MatTabChangeEvent, queryTabIndexParamName?: string): boolean {
    // If changed to dataset tab, make sure table has been loaded
    switch (event?.index) {
      case ProductPageTabs.DATASOURCE:
        this.datasourceTable.onRefresh.emit();
        break;
      case ProductPageTabs.RESULT:
        this.resultTable.onRefresh.emit();
        break;
    }

    return super.onTabChange(event, queryTabIndexParamName);
  }

  async getValue(): Promise<ExtractionProduct> {
    const data = await super.getValue();

    // Re add label, because missing when field disable
    data.label = this.form.get('label').value;

    // Re add columns
    data.columns = this.columns;

    // Set default strata
    if (data.isSpatial) {
      (data.stratum || []).forEach((strata, index) => (strata.isDefault = index === 0));
    } else {
      // No strata is not a spatial product
      data.stratum = null;
    }

    // Update filter
    data.filter = this.datasourceTable.getFilterValue();

    return data;
  }

  protected async computeTitle(data: ExtractionProduct): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return await this.translate.get('EXTRACTION.AGGREGATION.NEW.TITLE').toPromise();
    }

    // Existing data
    return await this.translate.get('EXTRACTION.AGGREGATION.EDIT.TITLE', data).toPromise();
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    if (this.debug) console.debug('[entity-editor] Computing page history, using url: ' + this.router.url);
    return {
      title,
      subtitle: this.translate.instant('EXTRACTION.TYPES_MENU.PRODUCT_DIVIDER'),
      icon: 'cloud-download-outline',
      path: `/extraction/product/${this.data.id}`,
    };
  }

  protected getFirstInvalidTabIndex(): number {
    return 0;
  }

  protected registerForms() {
    this.addChildForm(this.productForm);
    //this.addChildForm(this.datasourceTable);
  }

  protected async onNewEntity(data: ExtractionProduct, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onNewEntity(data, options);
    this.markAsReady();
  }

  protected async onEntityLoaded(data: ExtractionProduct, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onEntityLoaded(data, options);

    await this.productForm.updateLists(data);

    // Define default back link
    this.defaultBackHref = `̀/extraction/data?category=${ExtractionCategories.PRODUCT}&label=${data.label}`;

    this.markAsReady();
  }

  protected async onEntityDeleted(data: ExtractionProduct): Promise<void> {
    // Change back href
    this.defaultBackHref = '/extraction/data';
  }
}
