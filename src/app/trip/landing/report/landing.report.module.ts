import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingReport } from './landing.report';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    LandingReport,
  ],
  imports: [
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    TranslateModule.forChild(),
    AppSharedReportModule,
  ],
  exports: [
    LandingReport,
  ],
})
export class AppLandingReportModule { }
