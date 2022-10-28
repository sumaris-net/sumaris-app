import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Batch} from '../common/batch.model';
import { AppFormUtils, isNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { IonContent, ModalController } from '@ionic/angular';
import { BehaviorSubject, Subscription, TeardownLogic } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { SubBatchForm } from './sub-batch.form';
import { SubBatch } from './sub-batch.model';
import { IBatchModalOptions } from '@app/trip/batch/common/batch.modal';
import { BatchGroup } from '@app/trip/batch/group/batch-group.model';
import { debounceTime } from 'rxjs/operators';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';


export interface ISubBatchModalOptions extends IBatchModalOptions<SubBatch> {

  showParent: boolean;
  availableParents: BatchGroup[];
}

@Component({
  selector: 'app-sub-batch-modal',
  templateUrl: 'sub-batch.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubBatchModal implements OnInit, OnDestroy {

  private _subscription = new Subscription();
  debug = false;
  loading = false;
  mobile: boolean;
  $title = new BehaviorSubject<string>(undefined);

  @Input() disabled: boolean;
  @Input() isNew: boolean;
  @Input() data: SubBatch;
  @Input() acquisitionLevel: string;
  @Input() programLabel: string;

  @Input() showParent = true;
  @Input() showTaxonName = true;
  @Input() showIndividualCount = false;
  @Input() qvPmfm: PmfmStrategy;
  @Input() availableParents: BatchGroup[];

  @ViewChild('form', { static: true }) form: SubBatchForm;
  @ViewChild(IonContent) content: IonContent;

  get dirty(): boolean {
    return this.form.dirty;
  }

  get invalid(): boolean {
    return this.form.invalid;
  }

  get valid(): boolean {
    return this.form.valid;
  }

  constructor(
    protected injector: Injector,
    protected modalCtrl: ModalController,
    protected settings: LocalSettingsService,
    protected translate: TranslateService,
    protected cd: ChangeDetectorRef
  ) {
    // Default value
    this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;
    this.mobile = settings.mobile;

    // TODO: for DEV only
    //this.debug = !environment.production;
  }


  ngOnInit() {
    this.disabled = toBoolean(this.disabled, false);
    this.isNew = toBoolean(this.isNew, false);

    if (this.disabled) {
      this.form.disable();
    }

    // Update title each time value changes
    if (!this.isNew) {
      this._subscription.add(
        this.form.valueChanges
          .pipe(debounceTime(250))
          .subscribe(json => this.computeTitle(json))
      );
    }

    this.setValue(this.data);
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  async cancel() {
    await this.modalCtrl.dismiss();
  }

  async close(event?: Event) {
    if (this.loading) return; // avoid many call

    // Leave without saving
    if (!this.dirty) {
      this.markAsLoading();
      await this.modalCtrl.dismiss();
    }
    // Convert and dismiss
    else {
      const data = this.getDataToSave();
      if (!data) return; // invalid

      this.markAsLoading();
      await this.modalCtrl.dismiss(data);
    }
  }

  /* -- protected methods -- */

  protected async setValue(data: Batch) {
    console.debug('[sub-batch-modal] Applying value to form...', data);
    this.form.markAsReady();
    this.form.error = null;

    try {
      // Set form value
      this.data = this.data || new SubBatch();

      await this.form.setValue(this.data);

      // Call ready callback
      /*if (this.onReady) {
        promiseOrVoid = this.onReady(this);
        if (promiseOrVoid) await promiseOrVoid;
      }*/

      await this.computeTitle();
    }
    finally {
      if (!this.disabled) this.enable();
      this.form.markAsUntouched();
      this.form.markAsPristine();
      this.markForCheck();
    }
  }

  protected getDataToSave(opts?: {disable?: boolean;}): Batch {

    if (this.invalid) {
      if (this.debug) AppFormUtils.logFormErrors(this.form.form, '[sample-modal] ');
      this.form.error = 'COMMON.FORM.HAS_ERROR';
      this.form.markAllAsTouched();
      this.scrollToTop();
      return undefined;
    }

    this.markAsLoading();

    // To force enable, to get computed values
    this.enable();

    try {
      // Get form value
      return this.form.value;
    } finally {
      if (!opts || opts.disable !== false) {
        this.disable();
      }
    }
  }

  protected async computeTitle(data?: SubBatch) {
    data = data || this.data;
    if (this.isNew || !data) {
      this.$title.next(await this.translate.get('TRIP.SUB_BATCH.NEW.TITLE').toPromise());
    }
    else {
      const label = BatchUtils.parentToString(data);
      this.$title.next(await this.translate.get('TRIP.SUB_BATCH.EDIT.TITLE', {label}).toPromise());
    }
  }

  async scrollToTop() {
    return this.content.scrollToTop();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected registerSubscription(teardown: TeardownLogic) {
    this._subscription.add(teardown);
  }

  protected markAsLoading() {
    this.loading = true;
    this.markForCheck();
  }

  protected markAsLoaded() {
    this.loading = false;
    this.markForCheck();
  }

  protected enable() {
    this.form.enable();
  }

  protected disable() {
    this.form.disable();
  }
}
