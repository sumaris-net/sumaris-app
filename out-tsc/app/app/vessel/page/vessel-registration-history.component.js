import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector } from '@angular/core';
import { AccountService, AppTable, EntitiesTableDataSource, LocalSettingsService, referentialToString } from '@sumaris-net/ngx-components';
import { VesselRegistrationService } from '../services/vessel-registration.service';
import { VesselRegistrationPeriod } from '../services/model/vessel.model';
import { environment } from '@environments/environment';
let VesselRegistrationHistoryComponent = class VesselRegistrationHistoryComponent extends AppTable {
    constructor(injector, accountService, settings, dataService, cd) {
        super(injector, 
        // columns
        ['id',
            'startDate',
            'endDate',
            'registrationCode',
            'intRegistrationCode',
            'registrationLocation'], new EntitiesTableDataSource(VesselRegistrationPeriod, dataService, null, {
            prependNewElements: false,
            suppressErrors: environment.production,
            saveOnlyDirtyRows: true
        }), null);
        this.accountService = accountService;
        this.settings = settings;
        this.cd = cd;
        this.referentialToString = referentialToString;
        this.i18nColumnPrefix = 'VESSEL.';
        this.autoLoad = false;
        this.inlineEdition = false;
        this.confirmBeforeDelete = true;
    }
    ngOnInit() {
        super.ngOnInit();
        this.isAdmin = this.accountService.isAdmin();
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
VesselRegistrationHistoryComponent = __decorate([
    Component({
        selector: 'app-vessel-registration-history-table',
        templateUrl: './vessel-registration-history.component.html',
        styleUrls: ['./vessel-registration-history.component.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        AccountService,
        LocalSettingsService,
        VesselRegistrationService,
        ChangeDetectorRef])
], VesselRegistrationHistoryComponent);
export { VesselRegistrationHistoryComponent };
//# sourceMappingURL=vessel-registration-history.component.js.map