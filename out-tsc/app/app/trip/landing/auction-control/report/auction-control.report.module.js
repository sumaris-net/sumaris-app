import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { AuctionControlReport } from './auction-control.report';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedReportModule } from '@app/shared/report/report.module';
let AuctionControlReportModule = class AuctionControlReportModule {
};
AuctionControlReportModule = __decorate([
    NgModule({
        declarations: [
            AuctionControlReport,
        ],
        imports: [
            AppCoreModule,
            AppDataModule,
            TranslateModule.forChild(),
            AppSharedReportModule,
            AppReferentialModule,
        ],
        exports: [
            AuctionControlReport,
        ]
    })
], AuctionControlReportModule);
export { AuctionControlReportModule };
//# sourceMappingURL=auction-control.report.module.js.map