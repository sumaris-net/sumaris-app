import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { EntitiesTableDataSource, isNotNil } from '@sumaris-net/ngx-components';
import { Operation } from '@app/trip/services/model/trip.model';
import { OperationFilter } from '@app/trip/services/filter/operation.filter';
import { TableElement } from '@e-is/ngx-material-table';
import { SelectOperationByTripTable } from '@app/trip/operation/select-operation-by-trip.table';

export interface ISelectOperationModalOptions {
  filter: OperationFilter;
  programLabel?: string;
  enableGeolocation?: boolean;
  gearIds?: number[];
  parent?: Operation;
}

@Component({
  selector: 'app-select-operation-modal',
  templateUrl: './select-operation.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectOperationModal implements OnInit, ISelectOperationModalOptions {

  selectedTabIndex = 0;
  datasource: EntitiesTableDataSource<Operation, OperationFilter>;

  @ViewChild('table', { static: true }) table: SelectOperationByTripTable;

  @Input() filter: OperationFilter;
  @Input() enableGeolocation: boolean;
  @Input() gearIds: number[];
  @Input() parent: Operation;

  get loading(): boolean {
    return this.table && this.table.loading;
  }

  constructor(
    protected viewCtrl: ModalController,
    protected cd: ChangeDetectorRef
  ) {

  }

  ngOnInit() {
    // Init table
    if (!this.table) throw new Error("Missing table child component");
    if (!this.filter) throw new Error("Missing argument 'filter'");

    this.filter = OperationFilter.fromObject(this.filter);
    this.table.filter = this.filter;

    this.loadData();
  }

  loadData() {
    // Load data
    setTimeout(() => {
      this.table.onRefresh.next("modal");
      this.markForCheck();
    }, 200);
  }

  async selectRow(event: { id?: number; row: TableElement<Operation> }) {
    if (event.row && this.table) {

    // Select the clicked row, then close
      this.table.selection.clear();
      this.table.selection.select(event.row);
      await this.close();
    }
  }

  async close(event?: any): Promise<boolean> {
    try {
      if (this.hasSelection()) {
        const items = (this.table.selection.selected || [])
          .map(row => row.currentData)
          .map(source => Operation.fromObject(source, {withBatchTree: false, withSamples: false}))
          .filter(isNotNil)
        ;
        await this.viewCtrl.dismiss(items[0] || null);
      }
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
    const table = this.table;
    return table && table.selection.hasValue() &&  table.selection.selected.length === 1;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
