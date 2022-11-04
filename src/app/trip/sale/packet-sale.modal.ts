import { Component, Injector, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { AppFormUtils, LocalSettingsService } from '@sumaris-net/ngx-components';
import { Packet } from '../services/model/packet.model';
import { PacketSaleForm } from './packet-sale.form';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { TranslateService } from '@ngx-translate/core';

export interface IPacketSaleModalOptions {
  disabled: boolean;
  data: Packet;
  packetSalePmfms: DenormalizedPmfmStrategy[];
  mobile: boolean;
}

@Component({
  selector: 'app-packet-sale-modal',
  templateUrl: './packet-sale.modal.html'
})
export class PacketSaleModal implements OnInit, OnDestroy, IPacketSaleModalOptions {

  loading = false;
  subscription = new Subscription();
  $title = new BehaviorSubject<string>(null);

  @ViewChild('packetSaleForm', {static: true}) packetSaleForm: PacketSaleForm;

  @Input() data: Packet;
  @Input() mobile: boolean;
  @Input() packetSalePmfms: DenormalizedPmfmStrategy[];
  @Input() disabled: boolean;

  get enabled() {
    return this.packetSaleForm.enabled;
  }

  get valid(): boolean {
    return this.packetSaleForm?.valid || false;
  }

  get invalid(): boolean {
    return this.packetSaleForm?.invalid || false;
  }

  constructor(
    injector: Injector,
    protected viewCtrl: ModalController,
    protected translate: TranslateService
  ) {
    this.mobile = injector.get(LocalSettingsService).mobile;
  }

  ngOnInit() {
    this.updateTitle();
    this.packetSaleForm.markAsReady();
    setTimeout(async () => {
      await this.packetSaleForm.setValue(Packet.fromObject(this.data))
      if (!this.disabled) this.enable();
    });
  }

  protected updateTitle() {
    const title = this.translate.instant('PACKET.SALE.TITLE', {rankOrder: this.data?.rankOrder});
    this.$title.next(title);
  }

  async onSave(event: any): Promise<any> {

    // Avoid multiple call
    if (this.disabled) return;

    await AppFormUtils.waitWhilePending(this.packetSaleForm);

    if (this.packetSaleForm.invalid) {
      AppFormUtils.logFormErrors(this.packetSaleForm.form);
      this.packetSaleForm.markAllAsTouched({emitEvent: true});
      return;
    }

    this.loading = true;

    try {
      const value = this.packetSaleForm.value;
      this.disable();
      await this.viewCtrl.dismiss(value);
    } catch (err) {
      console.error(err);
      this.packetSaleForm.error = err && err.message || err;
      this.enable();
      this.loading = false;
    }
  }

  disable() {
    this.disabled = true;
    this.packetSaleForm.disable();
  }

  enable() {
    this.disabled = false;
    this.packetSaleForm.enable();
  }

  cancel() {
    this.viewCtrl.dismiss();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
