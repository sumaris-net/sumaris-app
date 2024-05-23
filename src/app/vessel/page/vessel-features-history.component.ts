import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { AccountService, AppTable, EntitiesTableDataSource, LocalSettingsService, referentialToString } from '@sumaris-net/ngx-components';
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
  referentialToString = referentialToString;
  isAdmin: boolean;
  @Input() compact: boolean;
  @Input() title: string;

  @Input()
  set showIdColumn(value: boolean) {
    this.setShowColumn('id', value);
  }

  get showIdColumn(): boolean {
    return this.getShowColumn('id');
  }

  @Input()
  set showGrossTonnageGrtColumn(value: boolean) {
    this.setShowColumn('grossTonnageGrt', value);
  }

  get showGrossTonnageGrtColumn(): boolean {
    return this.getShowColumn('grossTonnageGrt');
  }

  @Input()
  set showFpcColumn(value: boolean) {
    this.setShowColumn('fpc', value);
  }

  get showFpcColumn(): boolean {
    return this.getShowColumn('fpc');
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
      [
        'id',
        'startDate',
        'endDate',
        'exteriorMarking',
        'name',
        'administrativePower',
        'lengthOverAll',
        'grossTonnageGrt',
        'grossTonnageGt',
        'constructionYear',
        'ircs',
        'fpc',
        'basePortLocation',
        'comments',
      ],
      new EntitiesTableDataSource<VesselFeatures>(VesselFeatures, dataService, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        saveOnlyDirtyRows: true,
      }),
      null
    );

    this.i18nColumnPrefix = 'VESSEL.';
    this.showGrossTonnageGrtColumn = false;
    this.showFpcColumn = false;
    this.autoLoad = false;
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.title = 'VESSEL.HISTORY.FEATURES';
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    this.isAdmin = this.accountService.isAdmin();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
