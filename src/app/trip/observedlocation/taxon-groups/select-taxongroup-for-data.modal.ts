import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { LandingsTable } from '../../landing/landings.table';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ModalController } from '@ionic/angular';
import { Landing } from '../../landing/landing.model';
import { AppTable, isNotNil, ReferentialRef, toBoolean } from '@sumaris-net/ngx-components';
import { Subscription } from 'rxjs';
import { MatTabGroup } from '@angular/material/tabs';
import { LandingFilter } from '../../landing/landing.filter';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { BaseSelectEntityModal } from '@app/referential/table/base-select-entity.modal';

export interface SelectTaxonGroupsForDataModalOptions {
  programLabel: string;
  requiredStrategy: boolean;
  strategyId: number;

  landingFilter: LandingFilter | null;
  filter: Partial<ReferentialRefFilter>;
  allowMultiple: boolean;
  showBasePortLocationColumn?: boolean;
  showSamplesCountColumn: boolean;
  debug?: boolean;
}

@Component({
  selector: 'app-select-taxongroup-for-data-modal',
  templateUrl: 'select-taxongroup-for-data.modal.html',
  styleUrls: ['select-taxongroup-for-data.modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SelectTaxonGroupsForDataModal
  extends BaseSelectEntityModal<ReferentialRef, ReferentialRefFilter>
  implements SelectTaxonGroupsForDataModalOptions, OnInit, OnDestroy
{
  selectedTabIndex = 0;

  protected _subscription = new Subscription();

  @ViewChild(LandingsTable, { static: true }) landingsTable: LandingsTable;
  @ViewChild('tabGroup', { static: true }) tabGroup: MatTabGroup;

  @Input() programLabel: string;
  @Input() requiredStrategy: boolean;
  @Input() strategyId: number;

  @Input() landingFilter: LandingFilter | null = null;
  @Input() allowMultiple: boolean;
  @Input() showBasePortLocationColumn: boolean;
  @Input() showSamplesCountColumn: boolean;

  @Input() debug: boolean;

  get loading(): boolean {
    const table = this.currentTable;
    return table && table.loading;
  }

  get currentTable(): AppTable<any> {
    return (this.showTaxonGroups && this.table) || (this.showLandings && this.landingsTable);
  }

  get showLandings(): boolean {
    return this.selectedTabIndex === 0;
  }

  @Input() set showLandings(value: boolean) {
    if (this.showLandings !== value) {
      this.selectedTabIndex = value ? 0 : 1;
      this.markForCheck();
    }
  }

  get showTaxonGroups(): boolean {
    return this.selectedTabIndex === 1;
  }

  @Input() set showTaxonGroups(value: boolean) {
    if (this.showTaxonGroups !== value) {
      this.selectedTabIndex = value ? 1 : 0;
      this.markForCheck();
    }
  }

  constructor(
    injector: Injector,
    protected viewCtrl: ModalController,
    dataService: ReferentialRefService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, ReferentialRef, ReferentialRefFilter, dataService);
  }

  ngOnInit() {
    // Init landing table
    this.landingFilter = this.landingFilter || new LandingFilter();
    this.landingsTable.filter = this.landingFilter;
    this.landingsTable.programLabel = this.landingFilter.program && this.landingFilter.program.label;
    this.landingsTable.acquisitionLevel = AcquisitionLevelCodes.LANDING;

    // Set defaults
    this.allowMultiple = toBoolean(this.allowMultiple, false);
    this.showBasePortLocationColumn = toBoolean(this.showBasePortLocationColumn, true);

    // Init taxon groups table
    super.ngOnInit();

    // Load data
    setTimeout(async () => {
      // Load landings
      this.landingsTable.onRefresh.next('modal');
      this.selectedTabIndex = 0;
      this.tabGroup.realignInkBar();
      this.markForCheck();
    }, 200);
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  async selectRow(row) {
    const table = this.currentTable;
    if (row && table) {
      if (!this.allowMultiple) {
        table.selection.clear();
        table.selection.select(row);
        await this.close();
      } else {
        table.selection.select(row);
      }
    }
  }

  async close(event?: any): Promise<boolean> {
    try {
      let taxonGroups: ReferentialRef[] | Landing[];
      if (this.hasSelection()) {
        if (this.showLandings) {
          taxonGroups = (this.landingsTable.selection.selected || [])
            .map((row) => row.currentData)
            .map(Landing.fromObject)
            .filter(isNotNil);
        } else if (this.showTaxonGroups) {
          taxonGroups = (this.table.selection.selected || [])
            .map((row) => row.currentData)
            .map(ReferentialRef.fromObject)
            .filter(isNotNil);
        }
      }
      this.viewCtrl.dismiss(taxonGroups);
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
    const table = this.currentTable;
    return table && table.selection.hasValue() && (this.allowMultiple || table.selection.selected.length === 1);
  }

  get canValidate(): boolean {
    return this.hasSelection();
  }

  protected async computeTitle(): Promise<string> {
    return 'OBSERVED_LOCATION.SELECT_TAXONGROUP_MODAL.TITLE';
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
