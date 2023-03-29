import { Component, Injector, OnInit, ViewChild } from '@angular/core';
import { AccountService, APP_STORAGE, isNilOrBlank, isNotNilOrBlank, IStorage, PlatformService, ReferentialRef } from '@sumaris-net/ngx-components';
import { UserEventService } from '@app/social/user-event/user-event.service';
import { IonModal, ToastController } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { IPmfm } from '@app/referential/services/model/pmfm.model';

type StorageItemInfo = {
  key: string;
  type: 'array' | 'object' | 'string' | 'number';
  total: number;
};

@Component({
  selector: 'app-storage-explorer',
  templateUrl: './storage-explorer.component.html',
  styleUrls: ['./storage-explorer.component.scss'],
})
export class StorageExplorer implements OnInit {

  private _logPrefix = '[StorageExplorer]';
  private storage: IStorage;
  private platformService: PlatformService;
  private userEvent: UserEventService;
  private accountService: AccountService;

  protected $loading = new BehaviorSubject<boolean>(true);
  protected $items = new BehaviorSubject<StorageItemInfo[]>([]);

  private selectedKey: string;

  @ViewChild(IonModal) ionModal:IonModal;


  constructor(
    protected injector:Injector,
    protected toastController:ToastController,
  ) {
    this.storage = this.injector.get(APP_STORAGE);
    this.userEvent = this.injector.get(UserEventService);
    this.accountService = this.injector.get(AccountService);
    this.platformService = this.injector.get(PlatformService);
  }

  ngOnInit() {
    this.platformService.ready().then(
      () => this.start(),
    )
  }

  public async askToSendData(key:string) {
    this.selectedKey = key;
    this.ionModal.present();
  }

  public async closeModal() {
    this.ionModal.dismiss();
  }

  public async sendData() {
    this.ionModal.dismiss();
    if (isNilOrBlank(this.selectedKey)) {
      console.warn(`${this._logPrefix} : no key selected`);
      const toast = await this.toastController.create({
        color: "accent",
        position: "top",
        message: "No key selected, data was not sent.",
        duration: 3000,
      });
      toast.present();
      return;
    }

    const rawValue = await this.storage.get(this.selectedKey);
    try {
      await this.userEvent.sendDataForDebug(rawValue);
    } catch (e) {
      const toast = await this.toastController.create({
        color: "accent",
        position: "top",
        message: e.message,
        duration: 3000,
      });
      toast.present();
      return;
    }

    const toast = await this.toastController.create({
      color: "primary",
      message: "Data sent",
      position: "top",
      duration: 3000,
    });
    toast.present();

    this.selectedKey = "";
  }

  private async start() {
    const items = [];
    this.storage.forEach((value, key) => {
      if (Array.isArray(value)) {
        items.push({
          key,
          type: 'array',
          total: value.length
        });
      } else if (typeof value === 'object') {
        let total;
        if (value?.type && value?.type == 'object') {
          const nestedValue = JSON.parse(value.value);
          total = (Array.isArray(nestedValue)) ? nestedValue.length : (Object.keys(nestedValue).length > 0 ? 1 : 0);
        } else {
          total = Object.keys(value).length > 0 ? 1 : 0;
        }
        items.push({
          key,
          type: 'object',
          total
        });
      } else {
        const type = (typeof value === 'number') ? 'number' : 'string';
        items.push({
          key,
          type,
          total: isNotNilOrBlank(value) ? 1 : 0
        })
      }

      this.$items.next(items);
    });

    this.$loading.next(false);
  }

  protected async refresh() {
    if (this.$loading.value) return; // SKip if loading

    this.$loading.next(true);
    await this.start();
  }

  trackByFn(index: number, item: StorageItemInfo): any {
    return item.key;
  }
}
