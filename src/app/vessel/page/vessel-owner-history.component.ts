import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { AppTable } from '@sumaris-net/ngx-components';
import { AccountService } from '@sumaris-net/ngx-components';
import { LocalSettingsService } from '@sumaris-net/ngx-components';
import { EntitiesTableDataSource } from '@sumaris-net/ngx-components';
import { referentialToString } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { VesselOwnerPeriodFilter } from '../services/filter/vessel.filter';
import { VesselOwnerPeriod } from '../services/model/vessel-owner-period.model';
import { VesselOwnerPeridodService } from '../services/vessel-owner-period.service';

@Component({
  selector: 'app-vessel-owner-history-table',
  templateUrl: './vessel-owner-history.component.html',
  styleUrls: ['./vessel-owner-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VesselOwnerHistoryComponent extends AppTable<VesselOwnerPeriod, VesselOwnerPeriodFilter> implements OnInit {
  referentialToString = referentialToString;
  isAdmin: boolean;
  @Input() compact: boolean;
  @Input() title: string;

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
      // columns
      ['registrationCode', 'id', 'activityStartDate', 'retirementDate', 'lastName', 'firstName'],
      new EntitiesTableDataSource<VesselOwnerPeriod>(VesselOwnerPeriod, dataService, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        saveOnlyDirtyRows: true,
      }),
      null
    );

    this.i18nColumnPrefix = 'VESSEL.';
    this.autoLoad = false;
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.title = 'VESSEL.HISTORY.OWNER';
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
