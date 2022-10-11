import { Component, Injector } from '@angular/core';
import { AppRootDataReport } from '@app/data/report/root-data-report.class';
import { Trip } from '@app/trip/services/model/trip.model';
import { TripService } from '@app/trip/services/trip.service';
import { ChartData, ChartDataSets, ChartType } from 'chart.js';

@Component({
  selector: 'app-trip-report',
  templateUrl: './trip.report.html',
  styleUrls: ['./trip.report.scss']
})
export class TripReport extends AppRootDataReport<Trip> {

  private tripService: TripService;


  constructor(injector: Injector) {
    super(injector);
    this.tripService = injector.get(TripService);
  }

  genDummyDataSets(sets: string[], nbSample: number): Object {
    const xData = Array(nbSample).fill(1).map((_,i) => (i+1)*3);
    const yData = sets.map((label, index) => {
      return {
        label: label,
        data: Array(xData.length).fill(1).map((_) => Math.floor(Math.random() * 300)),
      }
    });
    return {labels: xData, datasets: yData};
  }

  protected async loadData(id: number): Promise<Trip> {
    console.debug(`[${this.constructor.name}.loadData]`, arguments);
    const data = await this.tripService.load(id, { withOperation: true });

    // NOTE : This is a test
    this.stats.chart1 = {
      type: 'bar',
      data: this.genDummyDataSets(['Débarquement', 'Rejet'], 21),
      options: {
        scales: {
        }
      },
    }
    console.debug('MY_CHART_DATA', this.stats.chart1);

    return data;
  }

  protected computeDefaultBackHref(data: Trip): string {
    console.debug(`[${this.constructor.name}.computeDefaultBackHref]`, arguments);
    return `/trips/${data.id}?tab=1`;
  }

  protected async computeTitle(data: Trip): Promise<string> {
    console.debug(`[${this.constructor.name}.computeTitle]`, arguments);
    const title = await this.translate.get('TRIP.REPORT.TITLE', {
      departureDate: this.dateFormatPipe.transform(data.departureDateTime, { time: false }),
      vessel: data.vesselSnapshot.exteriorMarking,
    }).toPromise();
    return title;
  }

}
