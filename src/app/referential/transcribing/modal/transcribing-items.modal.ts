import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {TranscribingItem} from '@app/referential/transcribing/transcribing.model';
import {ModalController} from '@ionic/angular';
import {LocalSettingsService, toBoolean} from '@sumaris-net/ngx-components';
import {TranscribingItemTable} from '@app/referential/transcribing/transcribing-item.table';

export interface TranscribingItemsModalOptions {
  title?: string;
  disabled?: boolean;
  mobile?: boolean;
  data?: TranscribingItem[];
}
@Component({
  selector: 'app-modal',
  templateUrl: './transcribing-items.modal.html',
  styleUrls: ['./transcribing-items.modal.scss']
})
export class TranscribingItemsModal implements OnInit, TranscribingItemsModalOptions {

  @Input() title: string;
  @Input() data: TranscribingItem[];
  @Input() disabled: boolean;
  @Input() mobile: boolean;

  get loading(): boolean {
    return this.table?.loading;
  }

  @ViewChild('table', { static: true }) table: TranscribingItemTable;

  constructor(
    protected modalCtrl: ModalController,
    protected settings: LocalSettingsService
  ) { }

  ngOnInit() {
    this.mobile = toBoolean(this.mobile, this.settings.mobile);

    this.table.value = this.data;
  }

  protected cancel() {
    this.modalCtrl.dismiss();
  }

  async onSubmit(event?: Event) {
    if (this.disabled) return this.cancel();

    if (this.table.dirty) {
      const saved = await this.table.save();
      if (!saved) return; // Stop
    }

    this.data = this.table.value;
    return this.modalCtrl.dismiss(this.data);
  }

}
