import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, OnInit } from '@angular/core';
import { AccountService, AppTable, EntitiesTableDataSource, LocalSettingsService, referentialToString } from '@sumaris-net/ngx-components';
import { VesselRegistrationService } from '../services/vessel-registration.service';
import { VesselRegistrationPeriod } from '../services/model/vessel.model';
import { environment } from '../../../environments/environment';
import { VesselRegistrationFilter } from '../services/filter/vessel.filter';

@Component({
  selector: 'app-vessel-registration-history-table',
  templateUrl: './vessel-registration-history.component.html',
  styleUrls: ['./vessel-registration-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VesselRegistrationHistoryComponent extends AppTable<VesselRegistrationPeriod, VesselRegistrationFilter> implements OnInit {

  referentialToString = referentialToString;
  isAdmin: boolean;

  constructor(
    injector: Injector,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    dataService: VesselRegistrationService,
    protected cd: ChangeDetectorRef
  ) {

    super(injector,
      // columns
      ['id',
        'startDate',
        'endDate',
        'registrationCode',
        'intRegistrationCode',
        'registrationLocation']
      ,
      new EntitiesTableDataSource<VesselRegistrationPeriod>(VesselRegistrationPeriod, dataService, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        saveOnlyDirtyRows: true
      }),
      null
    );

    this.i18nColumnPrefix = 'VESSEL.';

    this.autoLoad = false;
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;

  }

  ngOnInit() {
    super.ngOnInit();

    this.isAdmin = this.accountService.isAdmin();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
