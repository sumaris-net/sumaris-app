import { Component, Input } from '@angular/core';
import { IReportI18nContext } from '../base-report.class';

@Component({
  selector: 'page-header-form-report-chunk',
  templateUrl: './page-header-form.report-chunk.html',
  styleUrls: ['./page-header-form.report-chunk.scss'],
})
export class PageHeaderReportChunk {
  @Input({ required: true }) i18nContext: IReportI18nContext;
  @Input({ required: true }) title: string;
  @Input() titleComplement: string;
  @Input() pageNumber: number;
  @Input() items: string[];
  @Input() logoRightUrl: string;
  @Input() logoLeftUrl: string;
  @Input() titleParams: string;
  @Input() titleSuffix: string;
}
