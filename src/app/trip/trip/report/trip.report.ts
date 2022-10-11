import { Component, Injector, ViewChild } from '@angular/core';
import { AppRootDataReport } from '@app/data/report/root-data-report.class';
import { OperationsMap } from '@app/trip/operation/map/operations.map';
import { Trip } from '@app/trip/services/model/trip.model';
import { TripService } from '@app/trip/services/trip.service';
import { waitFor } from '@sumaris-net/ngx-components';

@Component({
  selector: 'app-trip-report',
  templateUrl: './trip.report.html',
  styleUrls: ['./trip.report.scss']
})
export class TripReport extends AppRootDataReport<Trip> {

  private tripService: TripService;

  @ViewChild('operationsMap') _operationsMap!: OperationsMap;

  constructor(injector: Injector) {
    super(injector);
    this.tripService = injector.get(TripService);
  }

  genDummyDataSets(sets: string[], nbSample: number): Object {
    const xData = Array(nbSample).fill(1).map((_,i) => (i+1)*3);
    const yData = sets.map((label) => {
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

    return data;
  }

  async updateView() {
    await waitFor(() => this._operationsMap?.loaded);
    super.updateView();
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
