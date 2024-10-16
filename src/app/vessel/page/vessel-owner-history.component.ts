import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import { AccountService, referentialToString, RESERVED_START_COLUMNS } from '@sumaris-net/ngx-components';
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

  @Input() title: string;
  @Input() showPagination = false;

  @Input()
  set showFirstNameColumn(value: boolean) {
    this.setShowColumn('firstName', value);
  }

  get showFirstNameColumn(): boolean {
    return this.getShowColumn('firstName');
  }

  @Input()
  set showActivityStartDateColumn(value: boolean) {
    this.setShowColumn('activityStartDate', value);
  }

  get showActivityStartDateColumn(): boolean {
    return this.getShowColumn('activityStartDate');
  }

  @Input()
  set showRetirementDateColumn(value: boolean) {
    this.setShowColumn('retirementDate', value);
  }

  get showRetirementDateColumn(): boolean {
    return this.getShowColumn('retirementDate');
  }

  constructor(
    injector: Injector,
    protected accountService: AccountService,
    dataService: VesselOwnerPeridodService
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
    this.showRetirementDateColumn = false;
    this.title = 'VESSEL.HISTORY.OWNER';
  }

  ngOnInit() {
    super.ngOnInit();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
