import { Component, Input } from '@angular/core';
import { Moment } from 'moment';
import { IReportI18nContext } from '../../base-report.class';

@Component({
  selector: 'page-header-from-report-chunk',
  templateUrl: './page-header-form.report-chunk.html',
  styleUrls: ['./page-header-form.report-chunk.scss'],
})
export class PageHeaderReportChunk {
  @Input({ required: true }) i18nContext: IReportI18nContext;
  @Input({ required: true }) title: string;
  @Input({ required: true }) pageNumber: number;
  @Input() departureDateTime: Moment;
  @Input() vesselName: string;
  @Input() logoRightUrl: string;
  @Input() logoLeftUrl: string;
  @Input() titleParams: string;
}
