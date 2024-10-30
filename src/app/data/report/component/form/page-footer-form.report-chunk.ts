import { Component, Input } from '@angular/core';

@Component({
  selector: 'page-footer-from-report-chunk',
  templateUrl: './page-footer-form.report-chunk.html',
  styleUrls: ['./page-footer-form.report-chunk.scss', '../../base-form-report.scss'],
})
export class PageFooterReportChunk {
  @Input() help: string;
  @Input() footerText: string;
}
