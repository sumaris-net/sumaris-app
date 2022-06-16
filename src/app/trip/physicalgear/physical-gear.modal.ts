import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { AlertController, IonContent, ModalController } from '@ionic/angular';
import { AcquisitionLevelCodes, PmfmIds } from '../../referential/services/model/model.enum';
import { PhysicalGearForm } from './physical-gear.form';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Alerts, AppFormUtils, createPromiseEventEmitter, emitPromiseEvent, FormErrorTranslator, isNil, LocalSettingsService, TranslateContextService } from '@sumaris-net/ngx-components';
import { MeasurementValuesUtils } from '@app/trip/services/model/measurement.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { environment } from '@environments/environment';
import { debounceTime } from 'rxjs/operators';

export interface IPhysicalGearModalOptions<T extends PhysicalGear = PhysicalGear, M = PhysicalGearModal> {
  acquisitionLevel: string;
  programLabel: string;
  data: T;
  disabled: boolean;
  isNew: boolean;

  canEditGear: boolean;
  canEditRankOrder: boolean;
  allowChildrenGears: boolean;

  onReady: (instance: M) => void;
  onDelete: (event: UIEvent, data: T) => Promise<boolean>;

  // UI
  mobile: boolean;
  maxVisibleButtons?: number;
  i18nSuffix?: string;
}

@Component({
  selector: 'app-physical-gear-modal',
  templateUrl: './physical-gear.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhysicalGearModal implements OnInit, OnDestroy, AfterViewInit, IPhysicalGearModalOptions {

  private readonly _subscription = new Subscription();
  loading = false;
  $title = new BehaviorSubject<string>(undefined);
  debug = false;

  @Input() acquisitionLevel: string;
  @Input() programLabel: string;
  @Input() disabled = false;
  @Input() data: PhysicalGear;
  @Input() isNew = false;
  @Input() canEditGear = false;
  @Input() canEditRankOrder = false;
  @Input() allowChildrenGears: boolean
  @Input() showGear = true;
  @Input() i18nSuffix: string = null;

  @Input() onReady: (instance: PhysicalGearModal) => Promise<void> | void;
  @Input() onDelete: (event: UIEvent, data: PhysicalGear) => Promise<boolean>;

  @Input() mobile: boolean;
  @Input() maxVisibleButtons: number;

  @Output() onSearchButtonClick = createPromiseEventEmitter<PhysicalGear>();

  @ViewChild('form', {static: true}) form: PhysicalGearForm;
  @ViewChild(IonContent, {static: true}) content: IonContent;

  get dirty(): boolean {
    return this.form.dirty;
  }

  get enabled(): boolean {
    return !this.disabled;
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

  constructor(
    protected alertCtrl: AlertController,
    protected modalCtrl: ModalController,
    protected translate: TranslateService,
    protected translateContext: TranslateContextService,
    protected settings: LocalSettingsService,
    protected errorTranslator: FormErrorTranslator,
    protected cd: ChangeDetectorRef
  ) {

    // Default values
    this.acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;
    this.mobile = settings.mobile;

    // TODO: for DEV only
    this.debug = !environment.production;
  }

  async ngOnInit() {
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
    this.onSearchButtonClick?.complete();
    this.onSearchButtonClick?.unsubscribe();
  }

  private async setValue(data: PhysicalGear) {

    console.debug('[physical-gear-modal] Applying value to form...', data);

    this.form.markAsReady();
    await this.form.setValue(this.data);

    // Call ready callback
    if (this.onReady) {
      const promiseOrVoid = this.onReady(this);
      if (promiseOrVoid) await promiseOrVoid;
    }

    // Compute the title
    await this.computeTitle();
  }

  ngAfterViewInit(): void {
    // Focus on the first field, is not in mobile
     if (this.isNew && !this.mobile && this.enabled) {
       setTimeout(() => this.form.focusFirstInput(), 400);
     }

    // Show/Hide children table
    // if (this.allowChildrenGears) {
    //   this.registerSubscription(
    //     this.childrenTable.$pmfms
    //       .subscribe(pmfms => {
    //         const hasChildrenPmfms = (pmfms||[]).filter(p => p.id !== PmfmIds.GEAR_LABEL).length > 0;
    //         if (this._showChildrenTable !== hasChildrenPmfms) {
    //           this._showChildrenTable = hasChildrenPmfms;
    //           this.markForCheck();
    //         }
    //       })
    //   );
    // }
  }

  async openSearchModal(event?: UIEvent) {

    if (this.onSearchButtonClick.observers.length === 0) return; // Skip

    // Emit event, then wait for a result
    try {
      const selectedData = await emitPromiseEvent(this.onSearchButtonClick, 'copyPreviousGear');

      // No result (user cancelled): skip
      if (!selectedData) return;

      // Create a copy
      const data = PhysicalGear.fromObject({
        gear: selectedData.gear,
        rankOrder: selectedData.rankOrder,
        // Convert measurementValues as JSON, in order to force values of not required PMFM to be converted, in the form
        measurementValues: MeasurementValuesUtils.asObject(selectedData.measurementValues, {minify: true}),
        measurements: selectedData.measurements,
      }).asObject();

      if (!this.canEditRankOrder) {
        // Apply computed rankOrder
        data.rankOrder = this.data.rankOrder;
      }

      // Apply to form
      console.debug('[physical-gear-modal] Paste selected gear:', data);
      this.form.reset(data);
      await this.form.waitIdle();
      this.form.markAsDirty();
    }
    catch (err) {
      if (err === 'CANCELLED') return; // Skip
      console.error(err);
      this.form.error = err && err.message || err;
      this.scrollToTop();
    }
  }

  async close(event: UIEvent): Promise<void> {
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

  async onSubmit(event?: UIEvent) {
    if (this.loading) return undefined; // avoid many call

    // No changes: leave
    if (!this.dirty) {
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

  async delete(event?: UIEvent) {
    if (!this.onDelete) return; // Skip
    const result = await this.onDelete(event, this.data);
    if (isNil(result) || (event && event.defaultPrevented)) return; // User cancelled

    if (result) {
      await this.modalCtrl.dismiss(this.data);
    }
  }

  /* -- protected functions -- */

  protected async getDataToSave(opts?: {disable?: boolean;}): Promise<PhysicalGear> {

    if (this.dirty) {
      const saved = await this.form.save();

      if (!saved) {
        if (this.debug) AppFormUtils.logFormErrors(this.form.form, '[physical-gear-modal] ');
        const error = this.errorTranslator.translateFormErrors(this.form.form, {
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
      const json = this.form.value;

      return PhysicalGear.fromObject(json);
    } finally {
      if (!opts || opts.disable !== false) {
        this.disable();
      }
    }
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

  protected setError(error: any) {
    this.form.error = error;
  }

  protected resetError() {
    this.form.error = null;
  }

  protected async scrollToTop(duration?: number) {
    if (this.content) {
      return this.content.scrollToTop(duration);
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async computeTitle(data?: PhysicalGear) {
    data = data || this.data;

    if (this.isNew || !data) {
      this.$title.next(this.translateContext.instant('TRIP.PHYSICAL_GEAR.NEW.TITLE', this.i18nSuffix));
    }
    else {
      const label = data?.measurementValues[PmfmIds.GEAR_LABEL] || ('#' + data.rankOrder);
      this.$title.next(this.translateContext.instant('TRIP.PHYSICAL_GEAR.EDIT.TITLE', this.i18nSuffix, { label }));
    }
  }
}
