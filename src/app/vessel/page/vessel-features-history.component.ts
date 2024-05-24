import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import {
  AccountService,
  AppTable,
  EntitiesTableDataSource,
  LocalSettingsService,
  referentialToString,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
} from '@sumaris-net/ngx-components';
import { VesselFeatures } from '../services/model/vessel.model';
import { VesselFeaturesService } from '../services/vessel-features.service';
import { environment } from '@environments/environment';
import { VesselFeaturesFilter } from '../services/filter/vessel.filter';

@Component({
  selector: 'app-vessel-features-history-table',
  templateUrl: './vessel-features-history.component.html',
  styleUrls: ['./vessel-features-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VesselFeaturesHistoryComponent extends AppTable<VesselFeatures, VesselFeaturesFilter> implements OnInit {
  protected readonly hiddenColumns = RESERVED_START_COLUMNS;
  protected referentialToString = referentialToString;

  @Input() compact: boolean;
  @Input() title: string;
  @Input() basePortLocationColumnTitle: string;
  @Input() stickyEnd: boolean = false;

  @Input()
  set showGrossTonnageGrtColumn(value: boolean) {
    this.setShowColumn('grossTonnageGrt', value);
  }

  get showGrossTonnageGrtColumn(): boolean {
    return this.getShowColumn('grossTonnageGrt');
  }

  @Input()
  set showHullMaterialColumn(value: boolean) {
    this.setShowColumn('hullMaterial', value);
  }

  get showHullMaterialColumn(): boolean {
    return this.getShowColumn('hullMaterial');
  }

  @Input()
  set showFpcColumn(value: boolean) {
    this.setShowColumn('fpc', value);
  }

  get showFpcColumn(): boolean {
    return this.getShowColumn('fpc');
  }

  @Input()
  set showCommentsColumn(value: boolean) {
    this.setShowColumn('comments', value);
  }

  get showCommentsColumn(): boolean {
    return this.getShowColumn('comments');
  }

  constructor(
    injector: Injector,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    dataService: VesselFeaturesService,
    protected cd: ChangeDetectorRef
  ) {
    super(
      injector,
      // columns
      RESERVED_START_COLUMNS.concat([
        'startDate',
        'endDate',
        'exteriorMarking',
        'name',
        'administrativePower',
        'lengthOverAll',
        'grossTonnageGrt',
        'grossTonnageGt',
        'hullMaterial',
        'ircs',
        'basePortLocation',
        'fpc',
        'comments',
      ]).concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource<VesselFeatures>(VesselFeatures, dataService, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        saveOnlyDirtyRows: true,
      }),
      null
    );

    this.i18nColumnPrefix = 'VESSEL.VESSEL_FEATURES.';
    this.showGrossTonnageGrtColumn = false;
    this.showHullMaterialColumn = false;
    this.showFpcColumn = false;
    this.autoLoad = false;
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.title = 'VESSEL.HISTORY.FEATURES';
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected getI18nColumnName(columnName: string): string {
    if (columnName === 'basePortLocation') {
      return this.basePortLocationColumnTitle || super.getI18nColumnName(columnName);
    }
    return super.getI18nColumnName(columnName);
  }
}
