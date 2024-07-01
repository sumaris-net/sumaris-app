import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { AccountService, LocalSettingsService, referentialToString, RESERVED_START_COLUMNS } from '@sumaris-net/ngx-components';
import { VesselRegistrationPeriodService } from '../services/vessel-registration-period.service';
import { VesselRegistrationPeriod } from '../services/model/vessel.model';
import { VesselRegistrationPeriodFilter } from '../services/filter/vessel.filter';
import { AppBaseTable } from '@app/shared/table/base.table';

@Component({
  selector: 'app-vessel-registration-history-table',
  templateUrl: './vessel-registration-history.component.html',
  styleUrls: ['./vessel-registration-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VesselRegistrationHistoryComponent extends AppBaseTable<VesselRegistrationPeriod, VesselRegistrationPeriodFilter> implements OnInit {
  protected readonly hiddenColumns = RESERVED_START_COLUMNS;
  protected referentialToString = referentialToString;

  @Input() compact: boolean;
  @Input() title: string;
  @Input() stickyEnd = false;

  @Input()
  set showRegistrationLocationColumn(value: boolean) {
    this.setShowColumn('registrationLocation', value);
  }

  get showRegistrationLocationColumn(): boolean {
    return this.getShowColumn('registrationLocation');
  }

  constructor(
    injector: Injector,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    dataService: VesselRegistrationPeriodService,
    protected cd: ChangeDetectorRef
  ) {
    super(
      injector,
      VesselRegistrationPeriod,
      VesselRegistrationPeriodFilter,
      // columns
      ['startDate', 'endDate', 'registrationCode', 'intRegistrationCode', 'registrationLocation'],
      dataService,
      null,
      {
        saveOnlyDirtyRows: true,
      }
    );

    this.i18nColumnPrefix = 'VESSEL.VESSEL_REGISTRATION_PERIOD.';
    this.showRegistrationLocationColumn = true;
    this.autoLoad = false;
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.title = 'VESSEL.HISTORY.REGISTRATIONS';
  }

  ngOnInit() {
    super.ngOnInit();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
