import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { AccountService, LocalSettingsService, referentialToString, RESERVED_START_COLUMNS } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { VesselOwnerPeriodFilter } from '../services/filter/vessel.filter';
import { VesselOwnerPeriod } from '../services/model/vessel-owner-period.model';
import { VesselOwnerPeridodService } from '../services/vessel-owner-period.service';
import { AppBaseTable } from '@app/shared/table/base.table';

@Component({
  selector: 'app-vessel-owner-history-table',
  templateUrl: './vessel-owner-history.component.html',
  styleUrls: ['./vessel-owner-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VesselOwnerHistoryComponent extends AppBaseTable<VesselOwnerPeriod, VesselOwnerPeriodFilter> implements OnInit {
  protected readonly hiddenColumns = RESERVED_START_COLUMNS;
  protected referentialToString = referentialToString;

  @Input() compact: boolean;
  @Input() title: string;
  @Input() stickyEnd: boolean = false;
  @Input() showPagination = false;

  @Input()
  set showFirstNameColumn(value: boolean) {
    this.setShowColumn('firstName', value);
  }

  get showFirstNameColumn(): boolean {
    return this.getShowColumn('firstName');
  }

  constructor(
    injector: Injector,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    dataService: VesselOwnerPeridodService,
    protected cd: ChangeDetectorRef
  ) {
    super(
      injector,
      VesselOwnerPeriod,
      VesselOwnerPeriodFilter,
      // columns
      ['startDate', 'endDate', 'registrationCode', 'lastName', 'firstName', 'activityStartDate', 'retirementDate'],
      dataService,
      null,
      {
        saveOnlyDirtyRows: true,
      }
    );

    this.i18nColumnPrefix = 'VESSEL.VESSEL_OWNER.';
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
