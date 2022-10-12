import { Component, Injector, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { AppRootDataReport } from '@app/data/report/root-data-report.class';
import { Trip } from '@app/trip/services/model/trip.model';
import { TripService } from '@app/trip/services/trip.service';
import { firstTruePromise, isNotNil, sleep, waitFor } from '@sumaris-net/ngx-components';
import { BehaviorSubject } from 'rxjs';
import { OperationService } from '@app/trip/services/operation.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { RevealSlideChangedEvent } from '@app/shared/report/reveal/reveal.utils';
import { ChartConfiguration, ChartData, ChartLegendOptions, ChartTitleOptions, ScaleTitleOptions } from 'chart.js';

@Component({
  selector: 'app-trip-report',
  templateUrl: './trip.report.html',
  styleUrls: ['./trip.report.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TripReport extends AppRootDataReport<Trip> {

  private tripService: TripService;
  private operationService: OperationService;
  mapReadySubject = new BehaviorSubject<boolean>(false);

  @ViewChild('mapContainer', {'read': ViewContainerRef}) mapContainer;
  @ViewChild('mapTemplate') mapTemplate: TemplateRef<null>;

  constructor(injector: Injector) {
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

    // NOTE : This may be done in another place
    this.stats.charts = this.computeDummyCharts();

    return data;
  }

  onMapReady() {
    this.mapReadySubject.next(true);
  }

  protected computeSlidesOptions(): Partial<IRevealExtendedOptions> {
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

    await waitFor(() => !!this.reveal);
    await this.reveal.initialize();


    if (this.reveal.printing) {
      await sleep(500);
      await this.showMap();
      await sleep(500);
      await this.reveal.print();
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

  async showMap() {
    this.mapContainer.createEmbeddedView(this.mapTemplate);
    await firstTruePromise(this.mapReadySubject);
  }

  /* -- DEBUG only -- */

  protected computeDummyCharts(): { [key: string]: ChartConfiguration } {
    const defaultTitleOptions: ChartTitleOptions = {
      fontColor: this.getColorFromStyle('secondary'),
      fontSize: 42,
      display: true,
    };
    const scaleLableDefaultOption: ScaleTitleOptions = {
      display: true,
      fontStyle: 'bold',
      fontSize: 18,
    };
    const legendDefaultOption: ChartLegendOptions = {
      position: 'right',
    };
    const charts: { [key: string]: ChartConfiguration } = {
      '00_sousTrait': {
        type: 'bubble',
        options: {
          title: {
            ...defaultTitleOptions,
            text: ['Comparaison des débarquements et rejets', '(sous trait)'],
          },
          legend: {
            ...legendDefaultOption,
          },
          scales: {
            xAxes: [
              {
                scaleLabel: {
                  ...scaleLableDefaultOption,
                  labelString: 'Quantité dans le chalut sélectif (kg)',
                },
              }
            ],
            yAxes: [
              {
                scaleLabel: {
                  ...scaleLableDefaultOption,
                  labelString: 'Quantité dans le chalut standard (kg)',
                },
              }
            ],
          },
        },
        data: {
          ... this.genDummyDataSetsForBuble(['Langoustine G', 'Langoustine P', 'Langoustine R'], 21),
        }
      },
      '01_repartTailleMerlu': {
        type: 'bar',
        options: {
          title: {
            ...defaultTitleOptions,
            text: ['Répartition en taille des Merlu'],
          },
          scales: {
            xAxes: [
              {
                scaleLabel: {
                  ...scaleLableDefaultOption,
                  labelString: 'Taille (cm)',
                },
              }
            ],
            yAxes: [
              {
                scaleLabel: {
                  ...scaleLableDefaultOption,
                  labelString: 'Nb individus',
                },
              }
            ],
          },
          legend: {
            ...legendDefaultOption,
          },
        },
        data: {
          ... this.genDummyDataSetsForBar(['Selectif - Tribord', 'Selectif - Babord'], 21),
        }
      },
      '02_repartTailleLangoustine': {
        type: 'bar',
        options: {
          title: {
            ...defaultTitleOptions,
            text: ['Répartition en taille des langoustines', '- Capture totales -'],
          },
          scales: {
            xAxes: [
              {
                scaleLabel: {
                  ...scaleLableDefaultOption,
                  labelString: 'Taille céphalotoracique (mm)',
                },
              }
            ],
            yAxes: [
              {
                scaleLabel: {
                  ...scaleLableDefaultOption,
                  labelString: 'Nb individus',
                },
              }
            ],
          },
          legend: {
            ...legendDefaultOption,
          },

        },
        data: {
          ... this.genDummyDataSetsForBar(['Selectif - Tribord', 'Selectif - Babord'], 21),
        }
      },
    };
    Object.entries(charts).map(item => this.compouteMedianLineOnChart(item[1]));
    return charts;
  }

  protected genDummyDataSetsForBar(sets: string[], nbSample: number): ChartData {
    const colors = this.getColorArrForChar();
    const xData = Array(nbSample).fill(1).map((_, i) => (i + 1) * 3);
    const yData = sets.map((label, index) => {
      return {
        label: label,
        data: Array(xData.length).fill(1).map((_) => Math.floor(Math.random() * 300)),
        backgroundColor: colors[index],
      }
    });
    return {
      labels: xData,
      datasets: yData,
    };
  }

  protected genDummyDataSetsForBuble(sets: string[], nbSample: number): ChartData {
    const maxX = 90;
    const maxY = 90;
    const r = 8;
    const colors = this.getColorArrForChar();
    const datasets = sets.map((label, index) => {
      return {
        label: label,
        backgroundColor: colors[index],
        data: Array(nbSample).fill(1).map((_) => {
          return {
            x: Math.floor(Math.random() * maxX),
            y: Math.floor(Math.random() * maxY),
            r: r,
          }
        }),
      }
    });
    return { datasets: datasets }
  }

  protected getColorFromStyle(name: string): string {
    console.debug(`[${this.constructor.name}.getColorFromStyle]`, arguments);
    const color: string = getComputedStyle(document.documentElement).getPropertyValue(`--ion-color-${name}`);
    return color || '#000000';
  }

  protected getColorArrForChar(): string[] {
    let colorsNames: string[] = [
      'primary',
      'secondary',
      'tertiary',
      'accent',
      'warning',
      'primary-tint',
    ]
    return colorsNames.map((cName) => {
      return this.getColorFromStyle(cName);
    });
  }

  protected compouteMedianLineOnChart(chart: ChartConfiguration) {
    // NOTE : This is dummy median only for testing purpose
    switch (chart.type) {
      case 'bar':
        chart.data.datasets.push({
          type: 'line',
          label: 'Median',
          borderDash: [5, 5],
          data: [{ x: 6, y: 0 }, { x: 6, y: 300 }],
          backgroundColor: '#FF0000',
        });
        break;
      case 'bubble':
        //chart.data.datasets.push({
          //type: 'line',
          //label: 'Median',
          //borderDash: [5, 5],
          //data: [{ x: 0, y: 0 }, { x: 90, y: 90 }],
          //backgroundColor: '#FF0000',
        //});
        break;
    }
  }

}
