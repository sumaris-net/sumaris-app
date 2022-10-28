import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IWithPacketsEntity, Packet } from '../services/model/packet.model';
import { ModalController } from '@ionic/angular';
import { Subject, Subscription } from 'rxjs';
import { PacketForm } from './packet.form';
import { AppFormUtils, isNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '@environments/environment';

export interface IPacketModalOptions {
  data: Packet;
  disabled: boolean;
  mobile: boolean;
  showParent?: boolean;
  isNew: boolean;
  parents: IWithPacketsEntity<any, any>[];
  parentAttributes: string[];
  onDelete: (event: Event, data: Packet) => Promise<boolean>;
}

@Component({
  selector: 'app-packet-modal',
  templateUrl: './packet.modal.html'
})
export class PacketModal implements OnInit, OnDestroy, IPacketModalOptions {

  readonly debug: boolean;
  loading = false;
  subscription = new Subscription();
  $title = new Subject<string>();

  @ViewChild('form', {static: true}) packetForm: PacketForm;

  @Input() data: Packet;
  @Input() disabled: boolean;
  @Input() mobile: boolean;
  @Input() showParent: boolean;
  @Input() isNew: boolean;
  @Input() parents: IWithPacketsEntity<any, any>[];
  @Input() parentAttributes: string[];
  @Input() onDelete: (event: Event, data: Packet) => Promise<boolean>;

  get enabled() {
    return this.packetForm.enabled;
  }

  get valid() {
    return this.packetForm?.valid || false;
  }

  get invalid() {
    return this.packetForm?.invalid || false;
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
    this.updateTitle();
    this.packetForm.markAsReady();
    setTimeout(() => {
      this.packetForm.setValue(this.data)
      if (!this.disabled) this.enable();
    });
  }

  protected updateTitle(data?: Packet) {
    data = data || this.data;
    let title;
    if (this.isNew) {
      title = this.translate.instant('PACKET.COMPOSITION.NEW.TITLE');
    } else {
      title = this.translate.instant('PACKET.COMPOSITION.TITLE', {rankOrder: data.rankOrder});
    }
    this.$title.next(title);
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

      const data = Packet.fromObject(value);
      await this.viewCtrl.dismiss(data, role);
      this.packetForm.error = null;
    } catch (err) {
      this.packetForm.error = err && err.message || err;
      this.enable();
      this.loading = false;
    }
  }

  async delete(event?: Event) {
    if (!this.onDelete) return; // Skip
    const result = await this.onDelete(event, this.data as Packet);
    if (isNil(result) || (event && event.defaultPrevented)) return; // User cancelled

    if (result) {
      await this.viewCtrl.dismiss(this.data, 'delete');
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
