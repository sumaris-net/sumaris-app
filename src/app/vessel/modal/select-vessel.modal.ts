import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { VesselFilter } from '@app/vessel/services/filter/vessel.filter';
import { VesselsTable } from '@app/vessel/list/vessels.table';
import { isEmptyArray, isNotNil, toBoolean } from '@sumaris-net/ngx-components';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Subscription } from 'rxjs';

export interface SelectVesselsModalOptions {
  titleI18n: string;
  vesselFilter: VesselFilter|null;
  disableStatusFilter: boolean;
  showVesselTypeColumn?: boolean;
  showBasePortLocationColumn?: boolean;
}

@Component({
  selector: 'app-select-vessel-modal',
  templateUrl: 'select-vessel.modal.html',
  styleUrls: ['select-vessel.modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class SelectVesselsModal implements SelectVesselsModalOptions, OnInit, AfterViewInit, OnDestroy {

  subscription = new Subscription();

  @ViewChild('vesselsTable', { static: true }) vesselsTable: VesselsTable;

  @Input() titleI18n = 'VESSEL.SELECT_MODAL.TITLE';
  @Input() vesselFilter: VesselFilter|null = null;
  @Input() disableStatusFilter: boolean;
  @Input() showVesselTypeColumn: boolean;
  @Input() showBasePortLocationColumn: boolean;

  get loading(): boolean {
    return this.vesselsTable?.loading;
  }

  constructor(
    protected viewCtrl: ModalController,
    protected cd: ChangeDetectorRef
  ) {
  }

  ngOnInit() {
    // Set defaults
    this.showVesselTypeColumn = toBoolean(this.showVesselTypeColumn, false);
    this.showBasePortLocationColumn = toBoolean(this.showBasePortLocationColumn, true);
    this.disableStatusFilter = toBoolean(this.disableStatusFilter, true);

    this.vesselsTable.dataSource.watchAllOptions = { ...this.vesselsTable.dataSource.watchAllOptions, fetchPolicy: 'no-cache' };
  }

  ngAfterViewInit() {
    setTimeout(() => {
      // Init vessel table filter
      this.vesselsTable.filter = this.vesselFilter;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async selectRow({id, row}) {
    if (row && this.vesselsTable) {
      this.vesselsTable.selection.clear();
      this.vesselsTable.selection.select(row);
    }
  }

  async close(event?: any): Promise<boolean> {
    try {
      let vessels: VesselSnapshot[];
      if (this.hasSelection()) {
          vessels = (this.vesselsTable.selection.selected || [])
            .map(row => row.currentData)
            .map(VesselSnapshot.fromVessel)
            .filter(isNotNil);
      }
      if (isEmptyArray(vessels)) {
        console.warn("[select-vessel-modal] no selection");
      }
      this.viewCtrl.dismiss(vessels);
      return true;
    } catch (err) {
      // nothing to do
      return false;
    }
  }
  async cancel() {
    await this.viewCtrl.dismiss();
  }

  hasSelection(): boolean {
    return this.vesselsTable?.selection.hasValue() && this.vesselsTable?.selection.selected.length === 1;
  }

  get canValidate(): boolean {
    return this.hasSelection();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
