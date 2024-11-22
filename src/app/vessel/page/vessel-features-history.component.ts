import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import { AccountService, referentialToString, RESERVED_START_COLUMNS } from '@sumaris-net/ngx-components';
import { VesselFeatures } from '../services/model/vessel.model';
import { VesselFeaturesService, VesselFeaturesServiceWatchOptions } from '../services/vessel-features.service';
import { environment } from '@environments/environment';
import { VesselFeaturesFilter } from '../services/filter/vessel.filter';
import { AppBaseTable } from '@app/shared/table/base.table';

@Component({
  selector: 'app-vessel-features-history-table',
  templateUrl: './vessel-features-history.component.html',
  styleUrls: ['./vessel-features-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VesselFeaturesHistoryComponent extends AppBaseTable<VesselFeatures, VesselFeaturesFilter> implements OnInit {
  protected readonly hiddenColumns = RESERVED_START_COLUMNS;
  protected referentialToString = referentialToString;

  @Input() title: string;
  @Input() showPagination: boolean = false;
  @Input() mergeRows: boolean = false;

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
  set showIsFpcColumn(value: boolean) {
    this.setShowColumn('isFpc', value);
  }

  get showIsFpcColumn(): boolean {
    return this.getShowColumn('isFpc');
  }

  @Input()
  set showCommentsColumn(value: boolean) {
    this.setShowColumn('comments', value);
  }

  get showCommentsColumn(): boolean {
    return this.getShowColumn('comments');
  }

  @Input()
  set showIrcsColumn(value: boolean) {
    this.setShowColumn('ircs', value);
  }

  get showIrcsColumn(): boolean {
    return this.getShowColumn('ircs');
  }

  @Input()
  set showExteriorMarkingColumn(value: boolean) {
    this.setShowColumn('exteriorMarking', value);
  }

  get showExteriorMarkingColumn(): boolean {
    return this.getShowColumn('exteriorMarking');
  }

  constructor(
    injector: Injector,
    protected accountService: AccountService,
    dataService: VesselFeaturesService
  ) {
    super(
      injector,
      VesselFeatures,
      VesselFeaturesFilter,
      // columns
      [
        'startDate',
        'endDate',
        'exteriorMarking',
        'name',
        'isFpc',
        'administrativePower',
        'lengthOverAll',
        'grossTonnageGrt',
        'grossTonnageGt',
        'hullMaterial',
        'ircs',
        'basePortLocation',
        'comments',
      ],
      dataService,
      null,

      {
        watchAllOptions: <VesselFeaturesServiceWatchOptions>{
          merge: () => this.mergeRows,
          mergeIgnoreProperties: () => this.excludesColumns,
        },

        saveOnlyDirtyRows: true,
      }
    );

    this.title = 'VESSEL.HISTORY.FEATURES';
    this.i18nColumnPrefix = 'VESSEL.VESSEL_FEATURES.';
    // Default column to hide
    this.excludesColumns = ['grossTonnageGrt', 'hullMaterial', 'isFpc'];
    this.autoLoad = false;
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
