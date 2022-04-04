import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { AlertController, IonContent, ModalController } from '@ionic/angular';
import { AcquisitionLevelCodes } from '../../referential/services/model/model.enum';
import { PhysicalGearForm } from './physical-gear.form';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Alerts, AppFormUtils, createPromiseEventEmitter, emitPromiseEvent, isNil, LocalSettingsService } from '@sumaris-net/ngx-components';
import { PhysicalGear } from '../services/model/trip.model';
import { MeasurementValuesUtils } from '@app/trip/services/model/measurement.model';

export interface PhysicalGearModalOptions<T extends PhysicalGear = PhysicalGear, M = PhysicalGearModal> {
  acquisitionLevel: string;
  programLabel: string;
  value: T;
  disabled: boolean;
  isNew: boolean;
  mobile: boolean;
  canEditRankOrder: boolean;
  onInit: (instance: M) => void;
  onDelete: (event: UIEvent, data: T) => Promise<boolean>;
}

@Component({
  selector: 'app-physical-gear-modal',
  templateUrl: './physical-gear.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhysicalGearModal implements OnInit, OnDestroy, AfterViewInit, PhysicalGearModalOptions<PhysicalGear, PhysicalGearModal> {

  loading = false;
  originalData: PhysicalGear;
  $title = new BehaviorSubject<string>(undefined);

  @Input() acquisitionLevel: string;
  @Input() programLabel: string;
  @Input() disabled = false;
  @Input() isNew = false;
  @Input() mobile: boolean;
  @Input() canEditRankOrder = false;
  @Input() onInit: (instance: PhysicalGearModal) => void;
  @Input() onDelete: (event: UIEvent, data: PhysicalGear) => Promise<boolean>;

  @Input() set value(value: PhysicalGear) {
    this.originalData = value;
  }

  @Output() onCopyPreviousGearClick = createPromiseEventEmitter<PhysicalGear>();

  @ViewChild('form', {static: true}) form: PhysicalGearForm;
  @ViewChild(IonContent, {static: true}) content: IonContent;

  get enabled(): boolean {
    return !this.disabled;
  }

  constructor(
    protected alertCtrl: AlertController,
    protected viewCtrl: ModalController,
    protected translate: TranslateService,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef
  ) {

    // Default values
    this.acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;
    this.mobile = settings.mobile;
  }

  ngOnInit() {
    if (this.disabled) {
      this.form.disable();
    }

    this.form.setValue(this.originalData || new PhysicalGear());
    this.form.markAsReady();

    // Compute the title
    this.computeTitle();

    if (this.onInit) {
      this.onInit(this);
    }
  }

  ngAfterViewInit(): void {
    // Focus on the first field, is not in mobile
     if (this.isNew && !this.mobile && this.enabled) {
       setTimeout(() => this.form.focusFirstInput(), 400);
     }
  }

  ngOnDestroy() {
    this.onCopyPreviousGearClick?.complete();
    this.onCopyPreviousGearClick?.unsubscribe();
  }

  async openSearchModal(event?: UIEvent) {

    if (this.onCopyPreviousGearClick.observers.length === 0) return; // Skip

    // Emit event, then wait for a result
    try {
      const selectedData = await emitPromiseEvent(this.onCopyPreviousGearClick, 'copyPreviousGear');

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
        data.rankOrder = this.originalData.rankOrder;
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

  // async close(event?: UIEvent, opts?: {allowInvalid?: boolean; }): Promise<PhysicalGear | undefined> {
  //
  //   const physicalGear = await this.save();
  //   if (!physicalGear) return;
  //   await this.vieCtrl.dismiss(physicalGear);
  //
  //   return physicalGear;
  // }


  async cancel(event: UIEvent) {
    await this.saveIfDirtyAndConfirm(event);

    // Continue (if event not cancelled)
    if (!event.defaultPrevented) {
      await this.viewCtrl.dismiss();
    }
  }

  async save(event?: UIEvent): Promise<boolean> {
    if (this.loading) return false;

    if (!this.form.valid) {
      // Wait validation end
      await AppFormUtils.waitWhilePending(this.form);

      if (this.form.invalid) {
        AppFormUtils.logFormErrors(this.form.form, '[physical-gear-modal] ');
        return false;
      }
    }

    this.loading = true;

    // Nothing to save: just leave
    if (!this.isNew && !this.form.dirty) {
      await this.viewCtrl.dismiss();
      return false;
    }

    try {
      this.form.error = null;

      await this.form.waitIdle();
      const gear = this.form.value;

      return await this.viewCtrl.dismiss(gear);
    }
    catch (err) {
      this.loading = false;
      this.form.error = err && err.message || err;
      this.scrollToTop();
      return false;
    }
  }

  async delete(event?: UIEvent) {
    if (!this.onDelete) return; // Skip
    const result = await this.onDelete(event, this.originalData);
    if (isNil(result) || (event && event.defaultPrevented)) return; // User cancelled

    if (result) {
      await this.viewCtrl.dismiss(this.originalData);
    }
  }

  /* -- protected functions -- */

  protected async saveIfDirtyAndConfirm(event: UIEvent): Promise<void> {
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

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async computeTitle() {
    if (this.isNew || !this.originalData) {
      this.$title.next(await this.translate.get('TRIP.PHYSICAL_GEAR.NEW.TITLE').toPromise());
    }
    else {
      this.$title.next(await this.translate.get('TRIP.PHYSICAL_GEAR.EDIT.TITLE', this.originalData).toPromise());
    }
  }

  protected async scrollToTop(duration?: number) {
    if (this.content) {
      return this.content.scrollToTop(duration);
    }
  }
}
