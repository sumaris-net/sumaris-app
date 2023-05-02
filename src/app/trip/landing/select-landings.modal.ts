import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, ViewChild} from "@angular/core";
import {LandingsTable} from "./landings.table";
import {ModalController} from "@ionic/angular";
import {LandingFilter} from "./landing.filter";
import {AcquisitionLevelCodes, AcquisitionLevelType} from "../../referential/services/model/model.enum";
import {Landing} from "./landing.model";
import {Observable} from "rxjs";
import {isNotNil} from "@sumaris-net/ngx-components";
import {TableElement} from '@e-is/ngx-material-table';

@Component({
  selector: 'app-select-landings-modal',
  templateUrl: './select-landings.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectLandingsModal implements OnInit {

  @ViewChild('table', { static: true }) table: LandingsTable;

  @Input() filter: LandingFilter|null = null;
  @Input() acquisitionLevel: AcquisitionLevelType;
  @Input() programLabel: string;

  get loadingSubject(): Observable<boolean> {
    return this.table.loadingSubject;
  }

  constructor(
    protected viewCtrl: ModalController,
    protected cd: ChangeDetectorRef
  ) {

    // default value
    this.acquisitionLevel = AcquisitionLevelCodes.LANDING;
  }

  ngOnInit() {
    this.filter = this.filter || new LandingFilter();
    this.table.filter = this.filter;
    this.table.programLabel = this.programLabel || this.filter.program && this.filter.program.label;
    this.table.acquisitionLevel = this.acquisitionLevel;
    setTimeout(() => {
      this.table.onRefresh.next("modal");
      this.markForCheck();
    }, 200);
  }


  selectRow(row: TableElement<Landing>) {
    if (row) {
      this.table.selection.select(row);
      //this.close();
    }
  }

  async close(event?: any): Promise<boolean> {
    try {
      if (this.hasSelection()) {
        const landings = (this.table.selection.selected || [])
          .map(row => row.currentData)
          .map(Landing.fromObject)
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
