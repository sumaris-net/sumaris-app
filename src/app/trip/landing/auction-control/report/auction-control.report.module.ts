import { NgModule } from '@angular/core';
import { AuctionControlReport } from './auction-control.report';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedReportModule } from '@app/shared/report/report.module';



@NgModule({
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
export class AuctionControlReportModule {}
