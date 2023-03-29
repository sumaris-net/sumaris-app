import {Component, Injector, OnInit, ViewChild} from '@angular/core';
import {AccountService, APP_STORAGE, isNilOrBlank, isNotNilOrBlank, IStorage, PlatformService} from '@sumaris-net/ngx-components';
import {UserEvent,} from '@app/social/user-event/user-event.model';
import {UserEventService} from '@app/social/user-event/user-event.service';
import {IonModal, ToastController} from '@ionic/angular';

type DumpInfosOfStorageEntities = {
  key: string;
  type: 'array' | 'object' | 'string';
  length: number;
  hasNestedValue: boolean;
};

@Component({
  selector: 'app-entities-storage-explorer',
  templateUrl: './entities-storage-dumper.component.html',
  styleUrls: ['./entities-storage-dumper.component.scss'],
})
export class EntitiesStorageDumper implements OnInit {

  private _logPrefix = '[EntitiesStorageDumper]';
  private storage:IStorage;
  private platformService:PlatformService;
  private userEvent:UserEventService;
  private accountService:AccountService;
  private dumpInfo:DumpInfosOfStorageEntities[] = [];

  private selectedKey:string;

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
    let result:UserEvent;
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
    this.storage.forEach((v, k) => {
      if (Array.isArray(v)) {
        this.dumpInfo.push({
          key: k,
          type: 'array',
          length: v.length,
          hasNestedValue: false,
        });
      } else if (typeof v === "object") {
        let length;
        let hasNestedValue;
        if (v?.type && v?.type == 'object') {
          const nestedValue = JSON.parse(v.value);
          length = (Array.isArray(nestedValue)) ? nestedValue.length : (Object.keys(nestedValue).length > 0 ? 1 : 0);
          hasNestedValue = true;
        } else {
          hasNestedValue = false;
          length = Object.keys(v).length > 0 ? 1 : 0;
        }
        this.dumpInfo.push({
          key: k,
          type: 'object',
          length: length,
          hasNestedValue: hasNestedValue,
        });
      } else {
        this.dumpInfo.push({
          key: k,
          type: 'string',
          length: isNotNilOrBlank(v) ? 1 : 0,
          hasNestedValue: false,
        })
      }
    });
  }

}
