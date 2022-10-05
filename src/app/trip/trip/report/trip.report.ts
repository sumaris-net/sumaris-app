import { Component, Injector } from '@angular/core';
import { AppRootDataReport } from '@app/data/report/root-data-report.class';
import { Trip } from '@app/trip/services/model/trip.model';
import { TripService } from '@app/trip/services/trip.service';

@Component({
  selector: 'app-trip-report',
  templateUrl: './trip.report.html',
  styleUrls: ['./trip.report.scss']
})
export class TripReport extends AppRootDataReport<Trip> {

  private dataService: TripService;

  constructor(injector: Injector) {
    super(injector);
    this.dataService = injector.get(TripService);
  }

  protected async loadData(id: number): Promise<Trip> {
    return await this.dataService.load(id);
  }

  protected computeDefaultBackHref(data: Trip): string {
    return `/trips/${data.id}?tab=1`;
  }

  protected async computeTitle(data: Trip): Promise<string> {
    const title = await this.translate.get('TRIP.REPORT.TITLE', {
      departureDate: this.dateFormatPipe.transform(data.departureDateTime, {time: false}),
      vessel: data.vesselSnapshot.exteriorMarking,
    }).toPromise();
    return title;
  }

}
