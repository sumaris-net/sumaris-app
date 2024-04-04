import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { RdbPmfmExtractionData } from '@app/trip/trip/report/trip-report.model';
import { BaseTripReport } from '@app/trip/trip/report/base-trip.report';

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
}
