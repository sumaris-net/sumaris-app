import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { PageHeaderReportChunk } from './page-header-form.report-chunk';
import { PageFooterReportChunk } from './page-footer-form.report-chunk';
import { LoaderReportChunk } from './loader.report-chunk';

@NgModule({
  imports: [AppCoreModule],
  declarations: [PageHeaderReportChunk, PageFooterReportChunk, LoaderReportChunk],
  exports: [PageHeaderReportChunk, PageFooterReportChunk, LoaderReportChunk],
})
export class ReportChunkModule {}
