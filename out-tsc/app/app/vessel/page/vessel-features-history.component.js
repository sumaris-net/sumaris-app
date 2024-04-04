import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector } from '@angular/core';
import { AppTable } from '@sumaris-net/ngx-components';
import { VesselFeatures } from '../services/model/vessel.model';
import { AccountService } from '@sumaris-net/ngx-components';
import { LocalSettingsService } from '@sumaris-net/ngx-components';
import { EntitiesTableDataSource } from '@sumaris-net/ngx-components';
import { VesselFeaturesService } from '../services/vessel-features.service';
import { referentialToString } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
let VesselFeaturesHistoryComponent = class VesselFeaturesHistoryComponent extends AppTable {
    constructor(injector, accountService, settings, dataService, cd) {
        super(injector, 
        // columns
        ['id',
            'startDate',
            'endDate',
            'exteriorMarking',
            'name',
            'administrativePower',
            'lengthOverAll',
            'grossTonnageGt',
            'constructionYear',
            'ircs',
            'basePortLocation',
            'comments'], new EntitiesTableDataSource(VesselFeatures, dataService, null, {
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
        this.debug = !environment.production;
    }
    ngOnInit() {
        super.ngOnInit();
        this.isAdmin = this.accountService.isAdmin();
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
VesselFeaturesHistoryComponent = __decorate([
    Component({
        selector: 'app-vessel-features-history-table',
        templateUrl: './vessel-features-history.component.html',
        styleUrls: ['./vessel-features-history.component.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        AccountService,
        LocalSettingsService,
        VesselFeaturesService,
        ChangeDetectorRef])
], VesselFeaturesHistoryComponent);
export { VesselFeaturesHistoryComponent };
//# sourceMappingURL=vessel-features-history.component.js.map