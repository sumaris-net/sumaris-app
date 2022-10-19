import { Component, Inject, Injector, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { AppRootDataReport } from '@app/data/report/root-data-report.class';
import { Trip } from '@app/trip/services/model/trip.model';
import { TripService } from '@app/trip/services/trip.service';
import { Color, firstTruePromise, isNotNil, sleep, waitFor } from '@sumaris-net/ngx-components';
import { BehaviorSubject } from 'rxjs';
import { OperationService } from '@app/trip/services/operation.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { RevealSlideChangedEvent } from '@app/shared/report/reveal/reveal.utils';
import { ChartJsUtils, ChartJsPluginTresholdLine, ChartJsPluginMedianLine, ChartJsUtilsTresholdLineOptions, ChartJsUtilsMediandLineOptions, ChartJsUtilsBarWithAutoCategHelper, ChartJsUtilsColor } from '@app/shared/chartsjs.utils.ts';
import { Chart, ChartConfiguration, ChartLegendOptions, ChartTitleOptions, ScaleTitleOptions } from 'chart.js';
import { DOCUMENT } from '@angular/common';
import pluginTrendlineLinear from 'chartjs-plugin-trendline';

// TODO : Testing boxplot : (not working, can't load charttype boxplot)
import "@sgratzl/chartjs-chart-boxplot/build/Chart.BoxPlot.js";

@Component({
  selector: 'app-trip-report',
  templateUrl: './trip.report.html',
  styleUrls: ['./trip.report.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TripReport extends AppRootDataReport<Trip> {

  // Landing categories fucntion color variance

  private tripService: TripService;
  private operationService: OperationService;
  mapReadySubject = new BehaviorSubject<boolean>(false);

  @ViewChild('mapContainer', { 'read': ViewContainerRef }) mapContainer;
  @ViewChild('mapTemplate') mapTemplate: TemplateRef<null>;

  constructor(injector: Injector, @Inject(DOCUMENT) private _document: Document) {
    super(injector);
    this.tripService = injector.get(TripService);
    this.operationService = injector.get(OperationService);
    Chart.plugins.register(pluginTrendlineLinear);
    Chart.plugins.register(ChartJsPluginTresholdLine);
    Chart.plugins.register(ChartJsPluginMedianLine);
  }

  protected async loadData(id: number): Promise<Trip> {
    console.debug(`[${this.constructor.name}.loadData]`, arguments);
    const data = await this.tripService.load(id, { withOperation: false });

    const res = await this.operationService.loadAllByTrip({
      tripId: id
    }, { fetchPolicy: 'cache-first', fullLoad: false, withTotal: true /*to make sure cache has been filled*/ });

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
      fontColor: Color.get('secondary').rgba(1),
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
    const charts: { [key: string]: ChartConfiguration & ChartJsUtilsTresholdLineOptions & ChartJsUtilsMediandLineOptions } = {};

    const colorLanding = ChartJsUtilsColor.getDerivativeColor(Color.get('blue'), 2)
    const colorDiscard = ChartJsUtilsColor.getDerivativeColor(Color.get('red'), 2);

    const chart01_data = new ChartJsUtilsBarWithAutoCategHelper(12);
    chart01_data.addSet({
      label: 'Débarquement - Babord',
      color: colorLanding[0],
      data: ChartJsUtils.genDummySamples(300, 9, 70),
      stack: '0',
    });
    chart01_data.addSet({
      label: 'Rejet - Babord',
      color: colorDiscard[0],
      data: ChartJsUtils.genDummySamples(300, 9, 70),
      stack: '0',
    });
    chart01_data.addSet({
      label: 'Débarquement - Tribord',
      color: colorLanding[1],
      data: ChartJsUtils.genDummySamples(300, 9, 70),
      stack: '1',
    });
    chart01_data.addSet({
      label: 'Rejet - Tribord',
      color: colorDiscard[1],
      data: ChartJsUtils.genDummySamples(300, 9, 70),
      stack: '1',
    });
    charts['01'] = {
      type: 'bar',
      options: {
        title: {
          ...defaultTitleOptions,
          text: ['Répartition en taille des langoustines', '- Capture totales -'],
        },
        scales: {
          xAxes: [
            {
              stacked: true,
              scaleLabel: {
                ...scaleLableDefaultOption,
                labelString: 'Taille céphalotoracique (mm)',
              },
            }
          ],
          yAxes: [
            {
              stacked: true,
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
        plugins: {
          tresholdLine: { // NOTE : custom plugin
            color: Color.get('red').rgba(1),
            style: 'dashed',
            width: 3,
            value: 3,
            orientation: 'x',
          },
        },
      },
    }
    chart01_data.computeDataSetsOnChart(charts['01']);

    const chart02_data = new ChartJsUtilsBarWithAutoCategHelper(12);
    chart02_data.addSet({
      label: 'Selectif - Tribord',
      color: colorLanding[0],
      data: ChartJsUtils.genDummySamples(300, 9, 70),
    });
    chart02_data.addSet({
      label: 'Selectif - Babord',
      color: colorLanding[1],
      data: ChartJsUtils.genDummySamples(300, 9, 70),
    });
    charts['02'] = {
      type: 'bar',
      options: {
        title: {
          ...defaultTitleOptions,
          text: ['Répartition en taille des langoustines', '- Débarquement -'],
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
        plugins: {
          tresholdLine: { // NOTE : Custom plugin
            color: Color.get('red').rgba(1),
            style: 'dashed',
            width: 3,
            value: 4,
          },
        },
      },
    }
    chart02_data.computeDataSetsOnChart(charts['02']);

    const chart03_data = new ChartJsUtilsBarWithAutoCategHelper(12);
    chart03_data.addSet({
      label: 'Selectif - Tribord',
      color: colorDiscard[0],
      data: ChartJsUtils.genDummySamples(300, 9, 70),
    });
    chart03_data.addSet({
      label: 'Selectif - Babord',
      color: colorDiscard[1],
      data: ChartJsUtils.genDummySamples(300, 9, 70),
    });
    charts['03'] = {
      type: 'bar',
      options: {
        title: {
          ...defaultTitleOptions,
          text: ['Répartition en taille des langoustines', '- Rejet -'],
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
        plugins: {
          tresholdLine: { // NOTE : Custom plugin
            color: Color.get('red').rgba(1),
            style: 'dashed',
            width: 3,
            value: 4,
          },
        },
      },
    }
    chart03_data.computeDataSetsOnChart(charts['03']);

    charts['04'] = {
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
        plugins: {
          medianLine: {
            color: Color.get('red').rgba(1),
            orientation: 'b',
            style: 'solid',
            width: 3,
          },
        }
      },
    }
    ChartJsUtils.pushDataSetOnChart(charts['04'], {
      label: 'Langoustine G',
      backgroundColor: colorLanding[0].rgba(1),
      data: ChartJsUtils.computeSamplesToChartPoint(ChartJsUtils.genDummySamplesSets(30, 2, 0, 90)),
    })
    ChartJsUtils.pushDataSetOnChart(charts['04'], {
      label: 'Langoustine D',
      backgroundColor: colorLanding[1].rgba(1),
      data: ChartJsUtils.computeSamplesToChartPoint(ChartJsUtils.genDummySamplesSets(30, 2, 0, 90)),
    })
    ChartJsUtils.pushDataSetOnChart(charts['04'], {
      label: 'Langoustine R',
      backgroundColor: colorDiscard[0].rgba(1),
      data: ChartJsUtils.computeSamplesToChartPoint(ChartJsUtils.genDummySamplesSets(30, 2, 0, 90)),
    })

    // TODO : Testing boxplot : (not working, can't load charttype boxplot)
    //charts['04_testboxplot'] = {
    //type: 'boxplot',
    //options: {
    //title: {
    //...defaultTitleOptions,
    //text: ['Comparaison des débarquements et rejets', '(sous trait)'],
    //},
    //legend: {
    //...legendDefaultOption,
    //},
    //scales: {
    //xAxes: [
    //{
    //scaleLabel: {
    //...scaleLableDefaultOption,
    //labelString: 'Quantité dans le chalut sélectif (kg)',
    //},
    //}
    //],
    //yAxes: [
    //{
    //scaleLabel: {
    //...scaleLableDefaultOption,
    //labelString: 'Quantité dans le chalut standard (kg)',
    //},
    //}
    //],
    //},
    //},
    //data: {
    //labels: ["January", "February", "March", "April", "May", "June", "July"],
    //datasets: [
    //{
    //label: "Dataset 1",
    //backgroundColor: "rgba(255,0,0,0.5)",
    //borderColor: "red",
    //borderWidth: 1,
    ////outlierColor: "#999999",
    ////padding: 10,
    ////itemRadius: 0,
    //data: [
    //]
    //},
    //{
    //label: "Dataset 2",
    //backgroundColor: "rgba(0,0,255,0.5)",
    //borderColor: "blue",
    //borderWidth: 1,
    ////outlierColor:
    ////"#999999",
    ////padding:
    ////10,
    ////itemRadius: 0,
    //data: [
    //]
    //}
    //]
    //}
    //}

    return charts;
  }

}
