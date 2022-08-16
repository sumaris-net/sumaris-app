import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Alerts, AppFormUtils, isNil, isNotNilOrBlank, LocalSettingsService, toBoolean, TranslateContextService, UsageMode } from '@sumaris-net/ngx-components';
import { environment } from '../../../environments/environment';
import { AlertController, IonContent, ModalController } from '@ionic/angular';
import { BehaviorSubject, Subscription, TeardownLogic } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { Sample } from '../services/model/sample.model';
import { IDataEntityModalOptions } from '@app/data/table/data-modal.class';
import { debounceTime } from 'rxjs/operators';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { SubSampleForm } from '@app/trip/sample/sub-sample.form';

export interface ISubSampleModalOptions<M = SubSampleModal> extends IDataEntityModalOptions<Sample> {

  //Data
  availableParents: Sample[];

  // UI Fields show/hide
  showParent: boolean;

  // UI Options
  maxVisibleButtons: number;
  i18nPrefix?: string;
  i18nSuffix?: string;
  defaultLatitudeSign: '+' | '-';
  defaultLongitudeSign: '+' | '-';

  onReady: (modal: M) => Promise<void> | void;
}

@Component({
  selector: 'app-sub-sample-modal',
  templateUrl: 'sub-sample.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubSampleModal implements OnInit, OnDestroy, ISubSampleModalOptions {

  private _subscription = new Subscription();
  $title = new BehaviorSubject<string>(undefined);
  debug = false;
  loading = false;
  readonly mobile: boolean;
  i18nFullSuffix: string;

  @Input() isNew: boolean;
  @Input() data: Sample;
  @Input() disabled: boolean;
  @Input() acquisitionLevel: string;
  @Input() programLabel: string;
  @Input() usageMode: UsageMode;
  @Input() pmfms: IPmfm[];

  @Input() availableParents: Sample[];

  // UI options
  @Input() i18nSuffix: string;
  @Input() showLabel: boolean;
  @Input() showParent: boolean;
  @Input() showComment: boolean;
  @Input() maxVisibleButtons: number;
  @Input() defaultLatitudeSign: '+' | '-';
  @Input() defaultLongitudeSign: '+' | '-';

  @Input() onReady: (modal: SubSampleModal) => Promise<void> | void;
  @Input() onDelete: (event: UIEvent, data: Sample) => Promise<boolean>;

  @ViewChild('form', { static: true }) form: SubSampleForm;
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
    protected alertCtrl: AlertController,
    protected settings: LocalSettingsService,
    protected translate: TranslateService,
    protected translateContext: TranslateContextService,
    protected cd: ChangeDetectorRef
  ) {
    // Default value
    this.mobile = settings.mobile;

    // TODO: for DEV only
    this.debug = !environment.production;
    this.showComment = !this.mobile;
  }

  ngOnInit() {
    this.isNew = toBoolean(this.isNew, !this.data);
    this.usageMode = this.usageMode || this.settings.usageMode;
    this.disabled = toBoolean(this.disabled, false);
    this.acquisitionLevel = this.acquisitionLevel || AcquisitionLevelCodes.INDIVIDUAL_MONITORING;
    this.i18nSuffix = this.i18nSuffix || '';
    this.i18nFullSuffix = `${this.acquisitionLevel}.${this.i18nSuffix}`;

    if (this.disabled) {
      this.form.disable();
    }
    else {
      // Change rankOrder validator, to optional
      this.form.form.get('rankOrder').setValidators(null);
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

  async setValue(data: Sample) {

    console.debug('[sample-modal] Applying value to form...', data);
    this.form.markAsReady();
    this.form.error = null;

    try {

      // Set form value
      this.data = data || new Sample();
      let promiseOrVoid = this.form.setValue(this.data);
      if (promiseOrVoid) await promiseOrVoid;

      // Call ready callback
      /*if (this.onReady) {
        promiseOrVoid = this.onReady(this);
        if (promiseOrVoid) await promiseOrVoid;
      }*/

      // Compute the title
      await this.computeTitle();

    }
    finally {
      if (!this.disabled) this.enable();
      this.form.markAsUntouched();
      this.form.markAsPristine();
      this.markForCheck();
    }
  }

  async close(event?: UIEvent) {
    if (this.dirty) {
      const saveBeforeLeave = await Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);

      // User cancelled
      if (isNil(saveBeforeLeave) || event && event.defaultPrevented) {
        return;
      }

      // Is user confirm: close normally
      if (saveBeforeLeave === true) {
        await this.onSubmit(event);
        return;
      }
    }

    await this.modalCtrl.dismiss();
  }

  /**
   * Validate and close
   * @param event
   */
  async onSubmit(event?: UIEvent) {
    if (this.loading) return undefined; // avoid many call

    // Leave without saving
    if (!this.dirty) {
      this.loading = true;
      await this.modalCtrl.dismiss();
    }
    // Convert and dismiss
    else {
      const data = this.dirty ? this.getDataToSave() : this.data;
      if (!data) return; // invalid

      this.loading = true;
      await this.modalCtrl.dismiss(data);
    }
  }

  async delete(event?: UIEvent) {
    let canDelete = true;
    if (this.onDelete) {
      canDelete = await this.onDelete(event, this.data);
      if (isNil(canDelete) || (event && event.defaultPrevented)) return; // User cancelled
    }

    if (canDelete) {
      await this.modalCtrl.dismiss(this.data, 'DELETE');
    }
  }

  toggleComment() {
    this.showComment = !this.showComment;
    this.markForCheck();
  }

  /* -- protected methods -- */

  protected enable() {
    this.form.enable();
  }

  protected getDataToSave(): Sample {

    if (this.invalid) {
      if (this.debug) AppFormUtils.logFormErrors(this.form.form, "[sub-sample-modal] ");
      this.form.error = "COMMON.FORM.HAS_ERROR";
      this.form.markAllAsTouched();
      this.scrollToTop();
      return undefined;
    }

    this.loading = true;

    // To force enable, to get computed values
    this.form.form.enable();

    try {
      // Get form value
      return this.form.value;
    }
    finally {
      this.form.form.disable();
    }
  }

  protected reset(data?: Sample) {

    this.data = data || new Sample();
    this.form.error = null;

    try {
      this.form.value = this.data;

      this.form.enable();

      // Compute the title
      this.computeTitle();
    }
    finally {
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.markForCheck();
    }
  }

  protected async computeTitle(data?: Sample) {

    // Make sure form is ready, before accessing to autocomplete config
    await this.form.ready();

    // DEBUG
    console.debug('[sub-sample-modal] Computing title');

    data = data || this.data;

    // Compute prefix, from parent
    const parentStr = data.parent && this.form?.autocompleteFields.parent.displayWith(data.parent);
    const prefix = isNotNilOrBlank(parentStr)
      ? this.translateContext.instant(`TRIP.SUB_SAMPLE.TITLE_PREFIX`, this.i18nFullSuffix,{ prefix: parentStr })
      : '';

    if (this.isNew || !data) {
      this.$title.next(prefix + this.translateContext.instant( `TRIP.SUB_SAMPLE.NEW.TITLE`, this.i18nFullSuffix));
    }
    else {
      // Label can be optional (e.g. in auction control)
      const label = this.showLabel && data.label || ('#' + data.rankOrder);
      this.$title.next(prefix + this.translateContext.instant(`TRIP.SUB_SAMPLE.EDIT.TITLE`, this.i18nFullSuffix, {label}));
    }
  }

  async scrollToTop() {
    return this.content.scrollToTop();
  }

  protected registerSubscription(teardown: TeardownLogic) {
    this._subscription.add(teardown);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
