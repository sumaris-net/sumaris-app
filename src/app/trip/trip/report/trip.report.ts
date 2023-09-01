import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import {  RdbPmfmExtractionData } from '@app/trip/trip/report/trip-report.model';
import { ExtractionFilter, ExtractionType } from '@app/extraction/type/extraction-type.model';
import {BaseTripReport} from '@app/trip/trip/report/base-trip.report';

@Component({
  selector: 'app-trip-report',
  templateUrl: './trip.report.html',
  styleUrls: [
    './trip.report.scss',
    '../../../data/report/base-report.scss',
  ],
  providers: [
    {provide: TripReportService, useClass: TripReportService}
  ],
  encapsulation: ViewEncapsulation.None
})
export class TripReport extends BaseTripReport<RdbPmfmExtractionData> {

  protected logPrefix = 'trip-report ';

  constructor(injector: Injector,
              tripReportService: TripReportService<RdbPmfmExtractionData>) {
    super(injector, tripReportService);
  }

  protected loadData(filter: ExtractionFilter,
                     opts?: {
                       type?: ExtractionType;
                       cache?: boolean;
                     }): Promise<RdbPmfmExtractionData> {
    return this.tripReportService.loadAll(filter, {
      ...opts,
      formatLabel: this.type?.label || undefined,
      fetchPolicy: 'no-cache'
    });
  }

}
