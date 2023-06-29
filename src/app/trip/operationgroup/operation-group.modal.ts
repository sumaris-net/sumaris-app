import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Alerts, isNil, LocalSettingsService, ReferentialRef, toBoolean, UsageMode } from '@sumaris-net/ngx-components';
import { AlertController, ModalController } from '@ionic/angular';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { OperationGroup } from '@app/trip/trip/trip.model';
import { OperationGroupForm } from '@app/trip/operationgroup/operation-group.form';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { IDataEntityModalOptions } from '@app/data/table/data-modal.class';

export interface IOperationGroupModalOptions extends IDataEntityModalOptions<OperationGroup> {
  mobile: boolean;
  metiers: Observable<ReferentialRef[]> | ReferentialRef[];
}

@Component({
  selector: 'app-operation-group-modal',
  templateUrl: 'operation-group.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationGroupModal implements OnInit, OnDestroy, IOperationGroupModalOptions {

  private _subscription = new Subscription();

  readonly debug = !environment.production;
  loading = false;
  $title = new BehaviorSubject<string>(undefined);

  @Input() mobile = this.settings.mobile;
  @Input() acquisitionLevel: string;
  @Input() programLabel: string;
  @Input() disabled: boolean;
  @Input() isNew: boolean;
  @Input() data: OperationGroup;
  @Input() pmfms: IPmfm[];
  @Input() usageMode: UsageMode;
  @Input() onDelete: (event: Event, data: OperationGroup) => Promise<boolean>;
  @Input() metiers: Observable<ReferentialRef[]> | ReferentialRef[];

  @ViewChild('form', { static: true }) form: OperationGroupForm;

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
    this.acquisitionLevel = AcquisitionLevelCodes.OPERATION;
  }

  ngOnInit() {

    this.isNew = toBoolean(this.isNew, !this.data);
    this.data = this.data || new OperationGroup();

    this.form.setValue(this.data);

    this.disabled = toBoolean(this.disabled, false);

    if (this.disabled) {
      this.disable();
    }
    else {
      this.enable();
    }

    // Compute the title
    this.computeTitle();

    this.form.markAsReady();

    if (!this.isNew) {
      // Update title each time value changes
      this.form.valueChanges.subscribe(operationGroup => this.computeTitle(operationGroup));
    }

  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  async cancel(event: Event) {
    await this.saveIfDirtyAndConfirm(event);

    // Continue (if event not cancelled)
    if (!event.defaultPrevented) {
      await this.modalCtrl.dismiss();
    }
  }

  async save(event?: Event): Promise<boolean> {
    if (!this.form.valid || this.loading) return false;
    this.loading = true;

    // Nothing to save: just leave
    if (!this.isNew && !this.form.dirty) {
      await this.modalCtrl.dismiss();
      return false;
    }

    try {
      this.form.error = null;

      const operationGroup = this.form.value;
      if (operationGroup.metier && !operationGroup.metier.taxonGroup){
        operationGroup.metier.taxonGroup = this.form.metier.taxonGroup;
      }
      if (operationGroup.metier && ! operationGroup.metier.gear){
        operationGroup.metier.gear = this.form.metier.gear;
      }
      return await this.modalCtrl.dismiss(operationGroup);
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

  protected async computeTitle(data?: OperationGroup) {
    data = data || this.data;
    if (this.isNew) {
      this.$title.next(await this.translate.get('TRIP.OPERATION_GROUP.NEW.TITLE').toPromise());
    }
    else {
      this.$title.next(await this.translate.get('TRIP.OPERATION_GROUP.EDIT.TITLE', this.data).toPromise());
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
