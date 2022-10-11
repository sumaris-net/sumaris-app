import { ApplicationRef, Component, ElementRef, Injector, QueryList, Renderer2, TemplateRef, ViewChild, ViewChildren, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { AppRootDataReport } from '@app/data/report/root-data-report.class';
import { OperationsMap } from '@app/trip/operation/map/operations.map';
import { Trip } from '@app/trip/services/model/trip.model';
import { TripService } from '@app/trip/services/trip.service';
import { firstTruePromise, isNotNil, sleep, waitFor } from '@sumaris-net/ngx-components';
import { BehaviorSubject, Subject } from 'rxjs';
import { L } from '@app/shared/map/leaflet';
import { MapOptions } from 'leaflet';
import { LeafletControlLayersConfig } from '@asymmetrik/ngx-leaflet';
import { OperationService } from '@app/trip/services/operation.service';
import { ISlidesOptions } from '@app/shared/report/slides/slides.component';
import { RevealSlideChangedEvent } from '@app/shared/report/reveal';

@Component({
  selector: 'app-trip-report',
  templateUrl: './trip.report.html',
  styleUrls: ['./trip.report.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TripReport extends AppRootDataReport<Trip> {

  private tripService: TripService;
  private operationService: OperationService;
  mapReadySubject = new BehaviorSubject<boolean>(false)


  @ViewChild('mapContainer', {'read': ViewContainerRef}) mapContainer;
  @ViewChild('mapTemplate') mapTemplate: TemplateRef<null>;

  constructor(injector: Injector, private appRef: ApplicationRef) {
    super(injector);
    this.tripService = injector.get(TripService);
    this.operationService = injector.get(OperationService);
  }

  protected async loadData(id: number): Promise<Trip> {
    console.debug(`[${this.constructor.name}.loadData]`, arguments);
    const data = await this.tripService.load(id, { withOperation: false });

    const res = await this.operationService.loadAllByTrip({
      tripId: id
    }, {fetchPolicy: 'cache-first', fullLoad: false, withTotal: true /*to make sure cache has been filled*/});

    data.operations = res.data;

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

  onMapReady() {
    this.mapReadySubject.next(true);
  }

  protected computeSlidesOptions(): Partial<ISlidesOptions> {
    return {
      ...super.computeSlidesOptions(),
      printHref: isNotNil(this.id) ? `/trips/${this.id}/report` : undefined
    };
  }

  onSlideChanged(event: RevealSlideChangedEvent) {
    console.debug(`[${this.constructor.name}.onSlideChanged]`, event);
  }

  async updateView() {

    console.debug(`[${this.constructor.name}.updateView]`);
    this.cd.detectChanges();

    await waitFor(() => !!this.slides);
    await this.slides.initialize();
    await sleep(500);

    // Insert the map
    this.mapContainer.createEmbeddedView(this.mapTemplate);
    await firstTruePromise(this.mapReadySubject);

    this.cd.detectChanges();
    this.slides.sync();
    this.slides.layout();
    await sleep(1000);

    if (this.slides.printing) {
      await sleep(1000);
      await this.slides.print();
    }
  }

  protected computeDefaultBackHref(data: Trip): string {
    console.debug(`[${this.constructor.name}.computeDefaultBackHref]`, arguments);
    const baseTripPath = `/trips/${data.id}`;
    return `${baseTripPath}?tab=1`;
  }

  protected computePrintHref(data: Trip): string {
    console.debug(`[${this.constructor.name}.computePrintHref]`, arguments);
    const baseTripPath = `/trips/${data.id}`;
    return `${baseTripPath}/report`;
  }

  protected async computeTitle(data: Trip): Promise<string> {
    console.debug(`[${this.constructor.name}.computeTitle]`, arguments);
    const title = await this.translate.get('TRIP.REPORT.TITLE', {
      departureDate: this.dateFormatPipe.transform(data.departureDateTime, { time: false }),
      vessel: data.vesselSnapshot.exteriorMarking,
    }).toPromise();
    return title;
  }

  /* -- DEBUG only -- */
  private genDummyDataSets(sets: string[], nbSample: number): Object {
    const xData = Array(nbSample).fill(1).map((_,i) => (i+1)*3);
    const yData = sets.map((label) => {
      return {
        label: label,
        data: Array(xData.length).fill(1).map((_) => Math.floor(Math.random() * 300)),
      }
    });
    return {labels: xData, datasets: yData};
  }
}
