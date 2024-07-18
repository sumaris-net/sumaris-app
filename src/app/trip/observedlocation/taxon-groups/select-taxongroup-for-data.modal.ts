import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { LandingsTable } from '../../landing/landings.table';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ModalController } from '@ionic/angular';
import { Landing } from '../../landing/landing.model';
import { AppTable, EntitiesTableDataSource, isNotNil, ReferentialRef, toBoolean } from '@sumaris-net/ngx-components';
import { Subscription } from 'rxjs';
import { MatTabGroup } from '@angular/material/tabs';
import { LandingFilter } from '../../landing/landing.filter';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ReferentialRefTable } from '@app/referential/table/referential-ref.table';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { environment } from '@environments/environment';

export interface SelectTaxonGroupsForDataModalOptions {
  programLabel: string;
  requiredStrategy: boolean;
  strategyId: number;

  landingFilter: LandingFilter | null;
  taxonGroupFilter: ReferentialRefFilter | null;
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
export class SelectTaxonGroupsForDataModal implements SelectTaxonGroupsForDataModalOptions, OnInit, OnDestroy {
  selectedTabIndex = 0;

  protected _subscription = new Subscription();

  @ViewChild(LandingsTable, { static: true }) landingsTable: LandingsTable;
  @ViewChild(ReferentialRefTable, { static: true }) taxonGroupsTable: ReferentialRefTable<ReferentialRef, ReferentialRefFilter>;
  @ViewChild('tabGroup', { static: true }) tabGroup: MatTabGroup;

  @Input() programLabel: string;
  @Input() requiredStrategy: boolean;
  @Input() strategyId: number;

  @Input() landingFilter: LandingFilter | null = null;
  @Input() taxonGroupFilter: ReferentialRefFilter | null = null;
  @Input() allowMultiple: boolean;
  @Input() showBasePortLocationColumn: boolean;
  @Input() showSamplesCountColumn: boolean;

  @Input() debug: boolean;

  get loading(): boolean {
    const table = this.table;
    return table && table.loading;
  }

  get table(): AppTable<any> {
    return (this.showTaxonGroups && this.taxonGroupsTable) || (this.showLandings && this.landingsTable);
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

  datasource: EntitiesTableDataSource<ReferentialRef, ReferentialRefFilter, any>;

  constructor(
    protected viewCtrl: ModalController,
    protected dataService: ReferentialRefService,
    protected cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Init landing table
    this.landingFilter = this.landingFilter || new LandingFilter();
    this.landingsTable.filter = this.landingFilter;
    this.landingsTable.programLabel = this.landingFilter.program && this.landingFilter.program.label;
    this.landingsTable.acquisitionLevel = AcquisitionLevelCodes.LANDING;

    // Set defaults
    this.allowMultiple = toBoolean(this.allowMultiple, false);
    this.showBasePortLocationColumn = toBoolean(this.showBasePortLocationColumn, true);

    // Init table
    if (!this.taxonGroupsTable) throw new Error('Missing table child component');
    if (!this.dataService) throw new Error("Missing 'dataService'");

    this.datasource = new EntitiesTableDataSource<ReferentialRef, ReferentialRefFilter>(ReferentialRef, this.dataService, null, {
      prependNewElements: false,
      suppressErrors: environment.production,
    });

    this.taxonGroupsTable.setDatasource(this.datasource);
    this.taxonGroupsTable.filter = this.taxonGroupFilter;

    // Load data
    setTimeout(async () => {
      // Load landings
      this.landingsTable.onRefresh.next('modal');
      this.taxonGroupsTable.onRefresh.next('modal');
      this.selectedTabIndex = 0;
      this.tabGroup.realignInkBar();
      this.markForCheck();
    }, 200);
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  async selectRow(row) {
    const table = this.table;
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
          taxonGroups = (this.taxonGroupsTable.selection.selected || [])
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
    const table = this.table;
    return table && table.selection.hasValue() && (this.allowMultiple || table.selection.selected.length === 1);
  }

  get canValidate(): boolean {
    return this.hasSelection();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
