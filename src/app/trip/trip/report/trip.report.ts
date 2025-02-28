import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { RdbPmfmExtractionData } from '@app/trip/trip/report/trip-report.model';
import { BaseTripReport } from '@app/trip/trip/report/base-trip.report';
import { FormReportPageDimensions } from '@app/data/report/common-report.class';

@Component({
  selector: 'app-trip-report',
  templateUrl: './trip.report.html',
  styleUrls: ['./trip.report.scss', '../../../data/report/base-report.scss'],
  providers: [{ provide: TripReportService, useClass: TripReportService }],
  encapsulation: ViewEncapsulation.None,
})
export class TripReport extends BaseTripReport<RdbPmfmExtractionData> {
  constructor(injector: Injector, tripReportService: TripReportService<RdbPmfmExtractionData>) {
    super(injector, tripReportService);
    this.logPrefix = 'trip-report ';
  }

  // TODO: Not used in this report
  protected computePageDimensions(): FormReportPageDimensions {
    const pageWidth = 297 * 4;
    const pageHeight = 210 * 4;
    const pageHorizontalMargin = 50;
    const availableWidthForTablePortrait = pageWidth - pageHorizontalMargin * 2;
    const availableWidthForTableLandscape = pageHeight - pageHorizontalMargin * 2;
    return {
      pageWidth,
      pageHeight,
      pageHorizontalMargin,
      availableWidthForTableLandscape,
      availableWidthForTablePortrait,
    };
  }
}
