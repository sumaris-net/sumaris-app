import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import {
  AccountService,
  AppTable,
  chainPromises,
  EntitiesStorage,
  EntitiesTableDataSource,
  isEmptyArray,
  isNotNil,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  toBoolean,
} from '@sumaris-net/ngx-components';
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import { Trip } from '../trip.model';
import { TripService } from '../trip.service';
import { TripFilter } from '../trip.filter';
import { UntypedFormBuilder } from '@angular/forms';
import { TableElement } from '@e-is/ngx-material-table';
import { environment } from '@environments/environment';
import { TrashRemoteService } from '@app/core/services/trash-remote.service';
import { SynchronizationStatus } from '@app/data/services/model/model.utils';

export interface TripTrashModalOptions {
  synchronizationStatus?: SynchronizationStatus;
}

@Component({
  selector: 'app-trip-trash-modal',
  templateUrl: './trip-trash.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripTrashModal extends AppTable<Trip, TripFilter> implements OnInit, OnDestroy {
  canDelete: boolean;
  displayedAttributes: {
    [key: string]: string[];
  };

  @Input() showIdColumn: boolean;

  @Input() synchronizationStatus: SynchronizationStatus;

  get isOfflineMode(): boolean {
    return !this.synchronizationStatus || this.synchronizationStatus !== 'SYNC';
  }

  get isOnlineMode(): boolean {
    return !this.isOfflineMode;
  }

  constructor(
    protected accountService: AccountService,
    protected service: TripService,
    protected entities: EntitiesStorage,
    protected trashRemoteService: TrashRemoteService,
    protected formBuilder: UntypedFormBuilder
  ) {
    super(
      RESERVED_START_COLUMNS.concat([
        'updateDate',
        'program',
        'vessel',
        'departureLocation',
        'departureDateTime',
        'returnDateTime',
        'observers',
        'comments',
      ]).concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource<Trip, TripFilter>(Trip, service, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        saveOnlyDirtyRows: true,
        readOnly: true,
        watchAllOptions: {
          trash: true,
        },
      }),
      null // Filter
    );
    this.i18nColumnPrefix = 'TRIP.TABLE.';

    this.readOnly = true;
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.saveBeforeSort = false;
    this.saveBeforeFilter = false;
    this.saveBeforeDelete = false;
    this.autoLoad = false;
    this.defaultSortBy = 'updateDate';
    this.defaultSortDirection = 'desc';

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    this.showIdColumn = toBoolean(this.showIdColumn, this.accountService.isAdmin());
    this.canDelete = this.isOnlineMode && this.accountService.isAdmin();

    this.displayedAttributes = {
      vesselSnapshot: this.settings.getFieldDisplayAttributes('vesselSnapshot'),
      location: this.settings.getFieldDisplayAttributes('location'),
    };

    const filter = TripFilter.fromObject({
      ...this.filter,
      synchronizationStatus: this.synchronizationStatus,
    });
    this.setFilter(filter, { emitEvent: true });
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  async closeAndRestore(event: Event, rows: TableElement<Trip>[]) {
    const data = await this.restore(event, rows);
    if (isEmptyArray(data)) return; // User cancelled

    return this.close(null, data);
  }

  async restore(event: Event, rows: TableElement<Trip>[]): Promise<Trip[] | undefined> {
    if (this.loading) return; // Skip

    const confirm = await this.askRestoreConfirmation();
    if (!confirm) return;

    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.markAsLoading();

    try {
      let entities = (rows || []).map((row) => row.currentData).filter(isNotNil);
      if (isEmptyArray(entities)) return; // Skip

      // If online: get trash data full content
      if (this.isOnlineMode) {
        entities = (await chainPromises(entities.map((e) => () => this.trashRemoteService.load('Trip', e.id)))).map(Trip.fromObject);
      }

      // Copy locally
      entities = await this.service.copyAllLocally(entities, {
        deletedFromTrash: this.isOfflineMode, // Delete from trash, only if local trash
        displaySuccessToast: false,
      });

      // Deselect rows
      this.selection.deselect(...rows);

      // Success toast
      setTimeout(() => {
        this.showToast({
          type: 'info',
          message: rows.length === 1 ? 'TRIP.TRASH.INFO.ONE_TRIP_RESTORED' : 'TRIP.TRASH.INFO.MANY_TRIPS_RESTORED',
        });
      }, 200);

      return entities;
    } catch (err) {
      console.error((err && err.message) || err, err);
      this.error = (err && err.message) || err;
      return;
    } finally {
      this.markAsLoaded();
    }
  }

  async toggleRow(event: MouseEvent, row: TableElement<Trip>): Promise<boolean> {
    if (event && event.defaultPrevented) return; // Skip

    if (this.selection.isEmpty()) {
      this.selection.select(row);
    } else if (!this.selection.isSelected(row)) {
      if (!event.ctrlKey) {
        this.selection.clear();
      }
      this.selection.select(row);
    } else {
      this.selection.toggle(row);
    }
    return true;
  }

  async close(event?: any, data?: Trip[]) {
    await this.modalCtrl.dismiss(data);
  }

  async cancel(event?: any) {
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async cleanLocalTrash(event?: Event, confirm?: boolean) {
    if (!confirm) {
      confirm = await this.askDeleteConfirmation(event);
      if (!confirm) return; // skip
    }

    console.debug('[trip-trash] Cleaning the trash...');
    await this.entities.clearTrash(Trip.TYPENAME);

    await this.close();

    // Success toast
    setTimeout(() => {
      this.showToast({
        type: 'info',
        message: 'TRIP.TRASH.INFO.LOCAL_TRASH_CLEANED',
      });
    }, 200);
  }

  async cleanRemoteTrash(event: Event, rows: TableElement<Trip>[]) {
    if (this.loading) return; // Skip

    if (!(await this.askRestoreConfirmation(event))) return; // User cancelled

    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.markAsLoading();

    try {
      const remoteIds = rows
        .map((row) => row.currentData)
        .map((trip) => trip.id)
        .filter((id) => isNotNil(id) && id >= 0);

      if (isEmptyArray(remoteIds)) return; // Skip if no remote ids

      await this.trashRemoteService.deleteAll(Trip.ENTITY_NAME, remoteIds);

      // Unselect rows, then refresh
      this.selection.deselect(...rows);

      this.onRefresh.emit();
    } catch (err) {
      console.error((err && err.message) || err, err);
      this.error = (err && err.message) || err;
    } finally {
      this.markAsLoaded();
    }
  }
}
