import {Component, Inject, Injector, OnInit} from '@angular/core';
import {AccountService, APP_STORAGE, EntitiesStorage, FilesUtils, isNotNilOrBlank, IStorage, PersonService, sort} from '@sumaris-net/ngx-components';
import {MatTableDataSource} from '@angular/material/table';
import {BehaviorSubject, Subject} from 'rxjs';
import {UserEvent, UserEventTypeEnum} from '@app/social/user-event/user-event.model';
import {UserEventService} from '@app/social/user-event/user-event.service';

type StorageEntities = {
  key: string;
  // type: string;
  // length: number;
  // validJSON: boolean;
  // isEmpty: boolean;
  values?: Array<any>;
};

@Component({
  selector: 'app-entities-storage-explorer',
  templateUrl: './entities-storage-explorer.html',
  styleUrls: ['./entities-storage-explorer.scss'],
})
export class EntitiesStorageExplorer implements OnInit {

  private storage:IStorage;
  private userEvent:UserEventService;
  private accountService:AccountService;
  dataSource:MatTableDataSource<StorageEntities>;

  public displayedColumn = ['key', 'actions'];


  protected $loadingSubject = new BehaviorSubject<boolean>(true);
  get loading(): boolean { return this.$loadingSubject.value };
  get loaded(): boolean { return !this.$loadingSubject.value };

  constructor(
    protected injector:Injector,
  ) {
    this.storage = this.injector.get(APP_STORAGE);
    this.userEvent = this.injector.get(UserEventService);
    this.accountService = this.injector.get(AccountService);
  }

  ngOnInit() {
    this.start();
  }

  public async dumpValue(key:string) {
    const rawValue = await this.storage.get(key, );
    this.userEvent.sendDataForDebug(rawValue);
  }

  private async start() {
    this.storage.keys().then((keys => {
      this.dataSource = new MatTableDataSource<StorageEntities>(
        keys.map(k => {
          return {key: k}
        })
      );
      this.$loadingSubject.next(false);
    }));
  }

}
