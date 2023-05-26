import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { ObservedLocationsPage } from '../table/observed-locations.page';
import { ModalController } from '@ionic/angular';
import { AcquisitionLevelCodes, AcquisitionLevelType } from '../../../referential/services/model/model.enum';
import { Observable } from 'rxjs';
import { isNotNil, toBoolean } from '@sumaris-net/ngx-components';
import { TableElement } from '@e-is/ngx-material-table';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { ObservedLocationFilter } from '@app/trip/observedlocation/observed-location.filter';

export interface ISelectObservedLocationsModalOptions {
  programLabel: string;
  acquisitionLevel: AcquisitionLevelType;
  filter: ObservedLocationFilter;
  allowMultipleSelection: boolean;
}

@Component({
  selector: 'app-select-observed-locations-modal',
  templateUrl: './select-observed-locations.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectObservedLocationsModal implements OnInit, ISelectObservedLocationsModalOptions {

  @ViewChild('table', { static: true }) table: ObservedLocationsPage;

  @Input() filter: ObservedLocationFilter|null = null;
  @Input() acquisitionLevel: AcquisitionLevelType;
  @Input() programLabel: string;
  @Input() allowMultipleSelection: boolean;

  get loadingSubject(): Observable<boolean> {
    return this.table.loadingSubject;
  }

  constructor(
    protected viewCtrl: ModalController,
    protected cd: ChangeDetectorRef
  ) {

    // default value
    this.acquisitionLevel = AcquisitionLevelCodes.OBSERVED_LOCATION;
  }

  ngOnInit() {
    // Set defaults
    this.allowMultipleSelection = toBoolean(this.allowMultipleSelection, false);
    this.filter = this.filter || new ObservedLocationFilter();
    this.table.filter = this.filter;
    const programLabel = this.programLabel || this.filter.program && this.filter.program.label;
    this.table.showFilterProgram = !programLabel;
    this.table.showProgramColumn = !programLabel;
    setTimeout(() => {
      this.table.onRefresh.next("modal");
      this.markForCheck();
    }, 200);
  }


  selectRow(row: TableElement<ObservedLocation>) {
    if (this.allowMultipleSelection) {
      this.table.selection.toggle(row);
    }
    else {
      this.table.selection.setSelection(row);
      this.close();
    }
  }

  async close(event?: any): Promise<boolean> {
    try {
      if (this.hasSelection()) {
        const landings = (this.table.selection.selected || [])
          .map(row => row.currentData)
          .map(ObservedLocation.fromObject)
          .filter(isNotNil);
        this.viewCtrl.dismiss(landings);
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
    return this.table.selection.hasValue() && this.table.selection.selected.length === 1;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
