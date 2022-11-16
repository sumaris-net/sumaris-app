import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {
  Alerts,
  AppFormUtils,
  AudioProvider,
  EntityUtils,
  FormErrorTranslator,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  referentialToString,
  toBoolean,
  TranslateContextService,
  UsageMode
} from '@sumaris-net/ngx-components';
import {environment} from '@environments/environment';
import {AlertController, IonContent, ModalController} from '@ionic/angular';
import {BehaviorSubject, Subscription, TeardownLogic} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import {AcquisitionLevelCodes, AcquisitionLevelType, PmfmIds} from '@app/referential/services/model/model.enum';
import {SampleForm} from './sample.form';
import {Sample} from '../services/model/sample.model';
import {IDataEntityModalOptions} from '@app/data/table/data-modal.class';
import {debounceTime} from 'rxjs/operators';
import {IPmfm} from '@app/referential/services/model/pmfm.model';
import moment, {Moment} from 'moment';
import {TaxonGroupRef} from '@app/referential/services/model/taxon-group.model';
import {AppImageAttachmentGallery} from '@app/data/image/image-attachment-gallery.component';
import {ImageAttachment} from '@app/data/image/image.model';

export type SampleModalRole = 'VALIDATE'| 'DELETE';
export interface ISampleModalOptions<M = SampleModal> extends IDataEntityModalOptions<Sample> {

  // UI Fields show/hide
  mobile: boolean;
  showLabel: boolean;
  requiredLabel?: boolean;
  showSampleDate: boolean;
  showTaxonGroup: boolean;
  showTaxonName: boolean;
  showIndividualReleaseButton: boolean;
  showIndividualMonitoringButton: boolean;
  showPictures: boolean;

  availableTaxonGroups?: TaxonGroupRef[];
  defaultSampleDate?: Moment;

  // UI Options
  maxVisibleButtons: number;
  maxItemCountForButtons: number;
  i18nSuffix?: string;

  // Callback actions
  onSaveAndNew: (data: Sample) => Promise<Sample>;
  onReady: (modal: M) => Promise<void> | void;
  openSubSampleModal: (parent: Sample, acquisitionLevel: AcquisitionLevelType) => Promise<Sample>;
}

@Component({
  selector: 'app-sample-modal',
  templateUrl: 'sample.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleModal implements OnInit, OnDestroy, ISampleModalOptions {

  private readonly _subscription = new Subscription();
  private isOnFieldMode: boolean;
  $title = new BehaviorSubject<string>(undefined);
  debug = false;
  loading = false;
  tagIdPmfm: IPmfm;

  @Input() mobile: boolean;
  @Input() isNew: boolean;
  @Input() data: Sample;
  @Input() disabled: boolean;
  @Input() acquisitionLevel: string;
  @Input() programLabel: string;
  @Input() usageMode: UsageMode;
  @Input() pmfms: IPmfm[];

  // UI options
  @Input() i18nSuffix: string;
  @Input() requiredLabel = true;
  @Input() showLabel = true;
  @Input() showSampleDate = true;
  @Input() showTaxonGroup = true;
  @Input() showTaxonName = true;
  @Input() showComment: boolean;
  @Input() showIndividualReleaseButton: boolean;
  @Input() showIndividualMonitoringButton: boolean;
  @Input() showPictures: boolean;
  @Input() maxVisibleButtons: number;
  @Input() maxItemCountForButtons: number;
  @Input() availableTaxonGroups: TaxonGroupRef[] = null;
  @Input() defaultSampleDate: Moment;

  @Input() onReady: (modal: SampleModal) => Promise<void> | void;
  @Input() onSaveAndNew: (data: Sample) => Promise<Sample>;
  @Input() onDelete: (event: Event, data: Sample) => Promise<boolean>;
  @Input() openSubSampleModal: (parent: Sample, acquisitionLevel: AcquisitionLevelType) => Promise<Sample>;

  @ViewChild('form', {static: true}) form: SampleForm;
  @ViewChild('gallery', {static: true}) gallery: AppImageAttachmentGallery;
  @ViewChild(IonContent) content: IonContent;

  get dirty(): boolean {
    return this.form.dirty || this.gallery.dirty;
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
    protected formErrorTranslator: FormErrorTranslator,
    protected audio: AudioProvider,
    protected cd: ChangeDetectorRef
  ) {
    // Default value
    this.mobile = settings.mobile;
    this.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;

    // TODO: for DEV only
    this.debug = !environment.production;
  }

  ngOnInit() {
    // Default values
    this.isNew = toBoolean(this.isNew, !this.data);
    this.usageMode = this.usageMode || this.settings.usageMode;
    this.isOnFieldMode = this.settings.isOnFieldMode(this.usageMode);
    this.disabled = toBoolean(this.disabled, false);
    this.i18nSuffix = this.i18nSuffix || '';
    this.showComment = !this.mobile || isNotNil(this.data.comments);
    this.showPictures = toBoolean(this.showPictures, isNotEmptyArray(this.data?.images));

    // Show/Hide individual release button
    this.tagIdPmfm = this.pmfms?.find(p => p.id === PmfmIds.TAG_ID);
    if (this.tagIdPmfm) {
      this.showIndividualMonitoringButton =  !!this.openSubSampleModal && toBoolean(this.showIndividualMonitoringButton, false);
      this.showIndividualReleaseButton =  !!this.openSubSampleModal && toBoolean(this.showIndividualReleaseButton, false);

      this.form.ready().then(() => {
        this.registerSubscription(
          this.form.form.get('measurementValues.' + this.tagIdPmfm.id)
            .valueChanges
            .subscribe(tagId => {
              this.showIndividualReleaseButton = isNotNilOrBlank(tagId);
              this.markForCheck();
            })
        );
      });
    }
    else {
      this.showIndividualMonitoringButton = !!this.openSubSampleModal && toBoolean(this.showIndividualMonitoringButton, false);
      this.showIndividualReleaseButton = !!this.openSubSampleModal && toBoolean(this.showIndividualReleaseButton, false);
    }

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

  async close(event?: Event) {
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
   * Add and reset form
   */
  async onSubmitAndNext(event?: Event) {
    if (this.loading) return undefined; // avoid many call
    // DEBUG
    //console.debug('[sample-modal] Calling onSubmitAndNext()');

    // If new AND pristine BUT valud (e.g. all PMFMs are optional): avoid to validate
    if (this.isNew && !this.dirty && this.valid) {
      return; // skip
    }

    const data = await this.getDataToSave();
    // invalid
    if (!data) {
      if (this.isOnFieldMode) this.audio.playBeepError();
      return;
    }

    this.markAsLoading();

    try {
      const newData = await this.onSaveAndNew(data);
      await this.reset(newData);
      this.isNew = true;
      if (this.isOnFieldMode) this.audio.playBeepConfirm();

      await this.scrollToTop();
    } finally {
      this.markAsLoaded();
    }
  }

  /**
   * Validate and close
   * @param event
   */
  async onSubmitIfDirty(event?: Event) {
    if (!this.dirty) {
      await this.modalCtrl.dismiss();
    }
    else {
      return this.onSubmit(event);
    }
  }

  /**
   * Validate and close
   * @param event
   */
  async onSubmit(event?: Event) {
    if (this.loading) return undefined; // avoid many call

    // No changes: leave
    if ((!this.dirty && !this.isNew)
      // If new, not changed but valid (e.g. if all PMFM are optional) : avoid to save an empty entity => skip
      || (this.isNew && !this.dirty && this.valid)) {
      this.markAsLoading();
      await this.modalCtrl.dismiss();
    }
    // Convert then dismiss
    else {
      const data = await this.getDataToSave();
      if (!data) return; // invalid

      this.markAsLoading();
      await this.modalCtrl.dismiss(data);
    }
  }

  async delete(event?: Event) {
    if (this.onDelete) {
      const deleted = await this.onDelete(event, this.data);
      if (isNil(deleted) || (event && event.defaultPrevented)) return; // User cancelled
      if (deleted) await this.modalCtrl.dismiss();
    }
    else {
      await this.modalCtrl.dismiss(this.data, 'DELETE');
    }
  }

  onIndividualMonitoringClick(event?: Event) {
    return this.doOpenSubSampleModal(AcquisitionLevelCodes.INDIVIDUAL_MONITORING)
  }

  onIndividualReleaseClick(event?: Event) {
    return this.doOpenSubSampleModal(AcquisitionLevelCodes.INDIVIDUAL_RELEASE)
  }

  toggleImageGallery() {
    this.showPictures = !this.showPictures;
    this.markForCheck();
  }

  /* -- protected methods -- */

  private async setValue(data: Sample) {

    console.debug('[sample-modal] Applying value to form...', data);
    this.form.markAsReady();
    this.gallery.markAsReady();
    this.resetError();

    try {
      // Set form value
      this.data = data || new Sample();
      const isNew = isNil(this.data.id);

      if (isNew && !this.data.sampleDate) {
        if (this.defaultSampleDate) {
          this.data.sampleDate = this.defaultSampleDate.clone();
        }
        else if (this.isOnFieldMode) {
          this.data.sampleDate = moment();
        }
      }

      // Set form value
      await this.form.setValue(this.data);

      // Set gallery's images
      // this.gallery.value =
      //   [
      //     {id: 0, url: 'https://test.sumaris.net/assets/img/bg/ray-1.jpg', title: 'ray #1'},
      //     {id: 1, url: 'https://test.sumaris.net/assets/img/bg/ray-2.jpg', title: 'ray #2'}
      //   ].map(ImageAttachment.fromObject);
      this.showPictures = this.showPictures || isNotEmptyArray(this.data.images);
      this.gallery.value = this.showPictures && this.data.images || [];

      // Call ready callback
      if (this.onReady) await this.onReady(this);

      await this.computeTitle();
    }
    finally {
      if (!this.disabled) this.enable();
      this.form.markAsUntouched();
      this.form.markAsPristine();
      this.markForCheck();
    }
  }

  protected async getDataToSave(opts?: {disable?: boolean;}): Promise<Sample> {

    if (!this.valid) {
      // Wait validation end
      await AppFormUtils.waitWhilePending(this.form);

      if (this.invalid) {
        if (this.debug) AppFormUtils.logFormErrors(this.form.form, '[sample-modal] ');
        const error = this.formErrorTranslator.translateFormErrors(this.form.form, {
          controlPathTranslator: this.form,
          separator: '<br/>'
        })
        this.setError(error || 'COMMON.FORM.HAS_ERROR');
        this.form.markAllAsTouched();
        this.scrollToTop();
        return;
      }
    }

    this.markAsLoading();
    this.resetError();

    // To force enable, to get computed values
    this.enable();

    try {
      // Get form value
      const data: Sample = this.form.value;

      // Add images
      if (this.showPictures) {
        if (this.gallery.dirty) {
          await this.gallery.save();
        }
        const images = this.gallery.value;
        data.images = images && images.map(ImageAttachment.fromObject) || undefined;
      }

      return data;
    } finally {
      if (!opts || opts.disable !== false) {
        //this.disable();
      }
    }
  }

  protected async reset(data?: Sample) {
    await this.setValue(data || new Sample());
  }

  protected async computeTitle(data?: Sample) {

    data = data || this.data;

    // Compute prefix
    let prefix = '';
    const prefixItems = [];
    if (data && !this.showTaxonGroup && EntityUtils.isNotEmpty(data.taxonGroup, 'id')) {
      prefixItems.push(referentialToString(data.taxonGroup, this.settings.getFieldDisplayAttributes('taxonGroup')));
    }
    if (data && !this.showTaxonName && data && EntityUtils.isNotEmpty(data.taxonName, 'id')) {
      prefixItems.push(referentialToString(data.taxonName, this.settings.getFieldDisplayAttributes('taxonName')));
    }
    if (isNotEmptyArray(prefixItems)) {
      prefix = this.translateContext.instant('TRIP.SAMPLE.TITLE_PREFIX', this.i18nSuffix,
        {prefix: prefixItems.join(' / ')});
    }

    if (this.isNew || !data) {
      this.$title.next(prefix + this.translateContext.instant('TRIP.SAMPLE.NEW.TITLE', this.i18nSuffix));
    } else {
      // Label can be optional (e.g. in auction control)
      const label = this.showLabel && data.label || ('#' + data.rankOrder);
      this.$title.next(prefix + this.translateContext.instant('TRIP.SAMPLE.EDIT.TITLE', this.i18nSuffix, {label}));
    }
  }

  protected async doOpenSubSampleModal(acquisitionLevel: AcquisitionLevelType) {
    if (!this.openSubSampleModal) return; // Skip

    // Save
    const savedSample = await this.getDataToSave({disable: false});
    if (!savedSample) return;

    try {

      // Execute the callback
      const updatedParent = await this.openSubSampleModal(savedSample, acquisitionLevel);

      if (!updatedParent) return; // User cancelled

      this.form.setChildren(updatedParent.children);

      this.form.markAsDirty();
    } finally {
      this.loading = false;
      this.form.enable();
    }
  }

  async scrollToTop() {
    return this.content.scrollToTop();
  }

  markForCheck() {
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

  protected enable(opts?: {emitEvent?: boolean}) {
    this.form.enable(opts);
    this.gallery.enable(opts);
  }

  protected disable(opts?: {emitEvent?: boolean}) {
    this.form.disable(opts);
    this.gallery.disable(opts);
  }

  protected setError(error: any) {
    this.form.error = error;
  }

  protected resetError() {
    this.form.error = null;
  }

}
