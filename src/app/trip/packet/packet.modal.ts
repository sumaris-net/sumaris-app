import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IWithPacketsEntity, Packet } from '../services/model/packet.model';
import { ModalController } from '@ionic/angular';
import { Subject, Subscription } from 'rxjs';
import { PacketForm } from './packet.form';
import { AppFormUtils, isNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '@environments/environment';

export interface PacketModalOptions {
  data: Packet;
  mobile: boolean;
  showParent?: boolean;
  isNew: boolean;
  parents: IWithPacketsEntity<any, any>[];
  parentAttributes: string[];
  onDelete: (event: UIEvent, data: Packet) => Promise<boolean>;
}

@Component({
  selector: 'app-packet-modal',
  templateUrl: './packet.modal.html'
})
export class PacketModal implements OnInit, OnDestroy, PacketModalOptions {

  loading = false;
  readonly debug: boolean;
  subscription = new Subscription();
  $title = new Subject<string>();

  @ViewChild('form', {static: true}) packetForm: PacketForm;

  @Input() data: Packet;
  @Input() mobile: boolean;
  @Input() showParent: boolean;
  @Input() isNew: boolean;
  @Input() parents: IWithPacketsEntity<any, any>[];
  @Input() parentAttributes: string[];
  @Input() onDelete: (event: UIEvent, data: Packet) => Promise<boolean>;

  get disabled() {
    return this.packetForm.disabled;
  }

  get enabled() {
    return this.packetForm.enabled;
  }

  get valid() {
    return this.packetForm && this.packetForm.valid || false;
  }


  constructor(
    protected viewCtrl: ModalController,
    protected translate: TranslateService,
    protected settings: LocalSettingsService
  ) {

    this.mobile = settings.mobile;
    this.debug = !environment.production;
  }

  ngOnInit(): void {
    this.showParent = toBoolean(this.showParent, this.mobile);
    this.enable();
    this.computeTitle(this.data);
    setTimeout(() => this.packetForm.setValue(this.data))
  }

  protected async computeTitle(data?: Packet) {
    data = data || this.data;
    if (this.isNew) {
      this.$title.next(await this.translate.get('PACKET.COMPOSITION.NEW.TITLE').toPromise());
    } else {
      this.$title.next(await this.translate.get('PACKET.COMPOSITION.TITLE', {rankOrder: data.rankOrder}).toPromise());
    }
  }

  async onSave(event: any, role?: string): Promise<any> {

    // Avoid multiple call
    if (this.disabled || this.loading) return;

    await AppFormUtils.waitWhilePending(this.packetForm);

    if (this.packetForm.invalid) {
      if (this.debug) AppFormUtils.logFormErrors(this.packetForm.form);
      this.packetForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      const value = this.packetForm.value;
      this.disable();
      await this.viewCtrl.dismiss(value, role);
      this.packetForm.error = null;
    } catch (err) {
      this.packetForm.error = err && err.message || err;
      this.enable();
      this.loading = false;
    }
  }

  async delete(event?: UIEvent) {
    if (!this.onDelete) return; // Skip
    const result = await this.onDelete(event, this.data as Packet);
    if (isNil(result) || (event && event.defaultPrevented)) return; // User cancelled

    if (result) {
      await this.viewCtrl.dismiss();
    }
  }

  disable() {
    this.packetForm.disable();
  }

  enable() {
    this.packetForm.enable();
  }

  cancel() {
    this.viewCtrl.dismiss();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
