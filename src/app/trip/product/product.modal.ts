import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Alerts, isNil, LocalSettingsService, sleep, toBoolean, UsageMode } from '@sumaris-net/ngx-components';
import { AlertController, ModalController } from '@ionic/angular';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { IWithProductsEntity, Product } from '@app/trip/services/model/product.model';
import { ProductForm } from '@app/trip/product/product.form';
import { IDataEntityModalOptions } from '@app/data/table/data-modal.class';

export interface IProductModalOptions extends IDataEntityModalOptions<Product> {
  mobile: boolean;
  parents: IWithProductsEntity<any>[];
  parentAttributes: string[];
}

@Component({
  selector: 'app-product-modal',
  templateUrl: 'product.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductModal implements OnInit, OnDestroy, IProductModalOptions {

  private _subscription = new Subscription();

  debug = false;
  loading = false;
  $title = new BehaviorSubject<string>(undefined);

  @Input() acquisitionLevel: string;
  @Input() programLabel: string;
  @Input() mobile: boolean;
  @Input() disabled: boolean;
  @Input() isNew: boolean;
  @Input() parents: IWithProductsEntity<any>[];
  @Input() parentAttributes: string[];
  @Input() data: Product;
  @Input() pmfms: IPmfm[];
  @Input() usageMode: UsageMode;

  @Input() onDelete: (event: Event, data: Product) => Promise<boolean>;

  @ViewChild('form', { static: true }) form: ProductForm;

  get dirty(): boolean {
    return this.form.dirty;
  }

  get invalid(): boolean {
    return this.form.invalid;
  }

  get valid(): boolean {
    return this.form.valid;
  }

  get pending(): boolean {
    return this.form.pending;
  }

  get enabled(): boolean {
    return !this.disabled;
  }

  enable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }) {
    this.form.enable(opts);
  }

  disable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }) {
    this.form.disable(opts);
  }

  constructor(
    protected injector: Injector,
    protected alertCtrl: AlertController,
    protected modalCtrl: ModalController,
    protected settings: LocalSettingsService,
    protected translate: TranslateService,
    protected cd: ChangeDetectorRef,
  ) {
    // Default value
    this.acquisitionLevel = AcquisitionLevelCodes.PRODUCT;

    // TODO: for DEV only
    this.debug = !environment.production;
  }

  ngOnInit() {
    this.disabled = toBoolean(this.disabled, false);

    this.isNew = toBoolean(this.isNew, !this.data);
    this.data = this.data || new Product();

    this.load();
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  async load() {

    try {

      this.form.markAsReady();
      await this.form.setValue(this.data);

      if (this.disabled) {
        this.disable();
      }
      else {
        this.enable();
      }

      // Compute the title
      await this.computeTitle();

      if (!this.isNew) {
        // Update title each time value changes
        this.form.valueChanges.subscribe(product => this.computeTitle(product));
      }

    }
    catch (err) {
      const error = (err?.message || err);
      this.form.error = error
      console.error(error);
    }
    finally {
      // Workaround to force form to be untouched, even if 'requiredIf' validator force controls as touched
      await sleep(500);
      this.form.markAsUntouched();
      this.form.markAsPristine();
    }
  }

  async cancel(event: Event) {
    await this.saveIfDirtyAndConfirm(event);

    // Continue (if event not cancelled)
    if (!event.defaultPrevented) {
      await this.modalCtrl.dismiss(undefined, undefined);
    }
  }

  async save(event?: Event, role?: string): Promise<boolean> {
    if (!this.form.valid || this.loading) return false;
    this.loading = true;

    // Nothing to save: just leave
    if (!this.isNew && !this.form.dirty) {
      await this.modalCtrl.dismiss(undefined, role);
      return false;
    }

    try {
      this.form.error = null;

      const product = this.form.value;

      return await this.modalCtrl.dismiss(product, role);
    }
    catch (err) {
      this.loading = false;
      this.form.error = err && err.message || err;
      return false;
    }
  }

  async delete(event?: Event) {
    if (!this.onDelete) return; // Skip
    const result = await this.onDelete(event, this.data);
    if (isNil(result) || (event && event.defaultPrevented)) return; // User cancelled

    if (result) {
      await this.modalCtrl.dismiss(this.data, 'delete');
    }
  }

  /* -- protected methods -- */
  protected async saveIfDirtyAndConfirm(event: Event): Promise<void> {
    if (!this.form.dirty) return; // skip, if nothing to save

    const confirmation = await Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);

    // User cancelled
    if (isNil(confirmation) || event && event.defaultPrevented) {
      return;
    }

    if (confirmation === false) {
      return;
    }

    // If user confirm: save
    const saved = await this.save(event);

    // Error while saving: avoid to close
    if (!saved) event.preventDefault();
  }

  protected async computeTitle(data?: Product) {
    data = data || this.data;
    if (this.isNew) {
      this.$title.next(await this.translate.get('TRIP.PRODUCT.NEW.TITLE').toPromise());
    }
    else {
      this.$title.next(await this.translate.get('TRIP.PRODUCT.EDIT.TITLE', {rankOrder: data.rankOrder}).toPromise());
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
