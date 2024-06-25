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
import { VesselRegistrationPeriodService } from '../services/vessel-registration-period.service';
import { VesselRegistrationPeriod } from '../services/model/vessel.model';
import { environment } from '@environments/environment';
import { VesselRegistrationPeriodFilter } from '../services/filter/vessel.filter';

@Component({
  selector: 'app-vessel-registration-history-table',
  templateUrl: './vessel-registration-history.component.html',
  styleUrls: ['./vessel-registration-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VesselRegistrationHistoryComponent extends AppTable<VesselRegistrationPeriod, VesselRegistrationPeriodFilter> implements OnInit {
  protected readonly hiddenColumns = RESERVED_START_COLUMNS;
  protected referentialToString = referentialToString;

  @Input() compact: boolean;
  @Input() title: string;
  @Input() registrationLocationColumnTitle = '';
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
      // columns
      RESERVED_START_COLUMNS.concat(['startDate', 'endDate', 'registrationCode', 'intRegistrationCode', 'registrationLocation']).concat(
        RESERVED_END_COLUMNS
      ),
      new EntitiesTableDataSource<VesselRegistrationPeriod>(VesselRegistrationPeriod, dataService, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        saveOnlyDirtyRows: true,
      }),
      null
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

  protected getI18nColumnName(columnName: string): string {
    if (columnName === 'registrationLocation') {
      return this.registrationLocationColumnTitle || super.getI18nColumnName(columnName);
    }
    return super.getI18nColumnName(columnName);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
