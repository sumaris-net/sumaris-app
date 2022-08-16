import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit} from '@angular/core';
import {AlertController, ModalController} from '@ionic/angular';
import {
  AccountService,
  AppTable,
  chainPromises,
  EntitiesStorage,
  EntitiesTableDataSource,
  isEmptyArray,
  isNotNil,
  LocalSettingsService,
  PlatformService,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  toBoolean
} from '@sumaris-net/ngx-components';
import {Trip} from '../../services/model/trip.model';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';
import {TripService} from '../../services/trip.service';
import {TripFilter} from '../../services/filter/trip.filter';
import {FormBuilder} from '@angular/forms';
import {TranslateService} from '@ngx-translate/core';
import {TableElement} from '@e-is/ngx-material-table';
import {OperationService} from '../../services/operation.service';
import {environment} from '@environments/environment';
import {TrashRemoteService} from '@app/core/services/trash-remote.service';
import {SynchronizationStatus} from "@app/data/services/model/model.utils";

export interface TripTrashModalOptions {
  synchronizationStatus?: SynchronizationStatus;
}

@Component({
  selector: 'app-trip-trash-modal',
  templateUrl: './trip-trash.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TripTrashModal extends AppTable<Trip, TripFilter> implements OnInit, OnDestroy {


  canDelete: boolean;
  displayedAttributes: {
    [key: string]: string[]
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
    injector: Injector,
    protected accountService: AccountService,
    protected service: TripService,
    protected entities: EntitiesStorage,
    protected operationService: OperationService,
    protected trashRemoteService: TrashRemoteService,
    protected formBuilder: FormBuilder,
    protected cd: ChangeDetectorRef
  ) {

    super(injector,
      RESERVED_START_COLUMNS
        .concat([
          'updateDate',
          'program',
          'vessel',
          'departureLocation',
          'departureDateTime',
          'returnDateTime',
          'observers',
          'comments'])
        .concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource<Trip, TripFilter>(Trip, service, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        dataServiceOptions: {
          saveOnlyDirtyRows: true,
          trash: true
        }
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
      location: this.settings.getFieldDisplayAttributes('location')
    };

    const filter = TripFilter.fromObject({
      ...this.filter,
      synchronizationStatus: this.synchronizationStatus
    });
    this.setFilter(filter, {emitEvent: true});
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  async closeAndRestore(event: UIEvent, rows: TableElement<Trip>[]) {

    const done = await this.restore(event, rows);
    if (done) return this.close();
  }

  async restore(event: UIEvent, rows: TableElement<Trip>[]): Promise<boolean> {
    if (this.loading) return; // Skip

    const confirm = await this.askRestoreConfirmation();
    if (!confirm) return false;

    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.markAsLoading();

    try {
      let entities = (rows || []).map(row => row.currentData).filter(isNotNil);
      if (isEmptyArray(entities)) return; // Skip

      // If online: get trash data full content
      if (this.isOnlineMode) {
        entities = (await chainPromises(entities.map(e => () => this.trashRemoteService.load('Trip', e.id))))
          .map(Trip.fromObject);
      }

      // Copy locally
      await this.service.copyAllLocally(entities, {
        deletedFromTrash: this.isOfflineMode, // Delete from trash, only if local trash
        displaySuccessToast: false
      });

      // Deselect rows
      this.selection.deselect(...rows);

      // Success toast
      setTimeout(() => {
        this.showToast({
          type: "info",
          message: rows.length === 1 ?
            'TRIP.TRASH.INFO.ONE_TRIP_RESTORED' :
            'TRIP.TRASH.INFO.MANY_TRIPS_RESTORED' });
      }, 200);

      return true;
    }
    catch (err) {
      console.error(err && err.message || err, err);
      this.error = err && err.message || err;
      return false;
    }
    finally {
      this.markAsLoaded();
    }
  }


  clickRow(event: MouseEvent|undefined, row: TableElement<Trip>): boolean {
    if (event && event.defaultPrevented) return; // Skip

    if (this.selection.isEmpty()) {
      this.selection.select(row);
    }
    else if (!this.selection.isSelected(row)) {
      if (!event.ctrlKey) {
        this.selection.clear();
      }
      this.selection.select(row);
    }
    else {
      this.selection.toggle(row);
    }
    return true;
  }

  async close(event?: any) {
    await this.modalCtrl.dismiss();
  }

  async cancel() {
    await this.modalCtrl.dismiss();
  }

  async cleanLocalTrash(event?: UIEvent, confirm?: boolean) {

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
        message: 'TRIP.TRASH.INFO.LOCAL_TRASH_CLEANED' });
    }, 200);

  }

  async cleanRemoteTrash(event: UIEvent, rows: TableElement<Trip>[]) {
    if (this.loading) return; // Skip

    if (!(await this.askRestoreConfirmation(event))) return; // User cancelled

    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.markAsLoading();

    try {

      const remoteIds = rows.map(row => row.currentData)
        .map(trip => trip.id)
        .filter(id => isNotNil(id) && id >= 0);

      if (isEmptyArray(remoteIds)) return; // Skip if no remote ids

      await this.trashRemoteService.deleteAll('Trip', remoteIds);

      // Unselect rows, then refresh
      this.selection.deselect(...rows);

      this.onRefresh.emit();
    }
    catch (err) {
      console.error(err && err.message || err, err);
      this.error = err && err.message || err;
    }
    finally {
      this.markAsLoaded();
    }
  }

  /* -- protected method -- */

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
