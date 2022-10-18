import { Component, Inject, Injector, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { AppRootDataReport } from '@app/data/report/root-data-report.class';
import { Trip } from '@app/trip/services/model/trip.model';
import { TripService } from '@app/trip/services/trip.service';
import { Color, ColorScale, ColorScaleOptions, firstTruePromise, isNotNil, sleep, waitFor } from '@sumaris-net/ngx-components';
import { BehaviorSubject } from 'rxjs';
import { OperationService } from '@app/trip/services/operation.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { RevealSlideChangedEvent } from '@app/shared/report/reveal/reveal.utils';
import { ChartUtils, ChartJsPluginTresholdLine, ChartJsStandardColors, ChartJsUtilsTresholdLineOptions } from '@app/shared/chartsjs.utils.ts';
import { Chart, ChartConfiguration, ChartData, ChartDataSets, ChartLegendOptions, ChartPoint, ChartTitleOptions, plugins, ScaleTitleOptions } from 'chart.js';
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
  private graphColors = {
    title: this.getColorFromStyle('secondary'),
    capture: {
      landing: Color.get('primary'),
      discard: Color.get('secondary'),
    },
    grear: {
      selective: new Color([127, 127, 0]),
      standard: new Color([0, 127, 127]),
    },
    landing: Color.get('primary'),
    discard: this.getColorFromStyle('accent'),
    //landingCategories: {}, // scale landing
    //disardCategories: {}, // scale discard
    gearPositions: {
      babord: this.getColorFromStyle('warning'),
      tribord: this.getColorFromStyle('success'),
    },
    median: Color.get('red'),
  }

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
    // NOTE : Begin of a tresholdLine plugin : [wip] (this is a first test)
    Chart.plugins.register(ChartJsPluginTresholdLine);
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
      fontColor: this.graphColors.title.rgba(),
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
    const charts: { [key: string]: ChartConfiguration & ChartJsUtilsTresholdLineOptions } = {};

    // NOTE : Replace this by real data extractors
    var labels = ChartUtils.computeColorsScaleFromLabels(
      ['Débarquement - Babord', 'Rejet - Babord', 'Débarquement - Tribord', 'Rejet - Tribord'],
      { startColor: [255, 0, 0], endColor: [0, 0, 255] },
    );
    charts['01_repartLangouCapture'] = {
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
            color: ChartJsStandardColors.threshold.rgba(1),
            style: 'dashed',
            width: 3,
            value: 16,
            orientation: 'y',
          },
        },
      },
      data: {
        ... ChartUtils.computeDatasetForBar(labels, ChartUtils.genDummySamplesSets((labels.length), 300, 9, 70), 12, [0, 0, 1, 1]),
      }
    }

    // NOTE : Replace this by real data extractors
    var labels = ChartUtils.computeColorsScaleFromLabels(
      ['Selectif - Tribord', 'Selectif - Babord'],
      { mainColor: this.graphColors.discard.rgb },
    );
    charts['02_repartLangouDebarq'] = {
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
            color: this.graphColors.median.rgba(1),
            style: 'dashed',
            width: 3,
            value: 4,
          },
        },
      },
      data: {
        ... ChartUtils.computeDatasetForBar(labels, ChartUtils.genDummySamplesSets(labels.length, 300, 9, 70), 12),
      },
    }

    // NOTE : Replace this by real data extractors
    var labels = ChartUtils.computeColorsScaleFromLabels(
      ['Langoustine G', 'Langoustine P', 'Langoustine R'],
      { startColor: this.graphColors.discard.rgb, endColor: this.graphColors.landing.rgb },
    );
    charts['03_comparDebarqRejet'] = {
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
        ... ChartUtils.computeDatasetForBubble(labels, labels.map(_ => ChartUtils.genDummySamplesSets(30, 2, 0, 90))),
      }
    }
    this.computeTrendLine(charts['03_comparDebarqRejet']);

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

  protected getColorFromStyle(name: string): Color {
    function colorHexaToRgbArr(hexColor: string): number[] {
      const split = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
      return split ? split.slice(1, 4).map(i => parseInt(i, 16)) : [0, 0, 0];
    }
    console.debug(`[${this.constructor.name}.getColorFromStyle]`, arguments);
    const colorHexa: string = getComputedStyle(this._document.documentElement).getPropertyValue(`--ion-color-${name}`)
      || '#000000';
    return new Color(colorHexaToRgbArr(colorHexa), 1, name);
  }

  protected computeTrendLine(chart: ChartConfiguration) {
    // TODO disable show label on hover
    chart.data.datasets.push({
      label: 'Median',
      fill: false,
      hideInLegendAndTooltip: true,
      pointRadius: 0,
      pointHitRadius: 0,
      backgroundColor: this.graphColors.median.rgba(1),
      data: chart.data.datasets.map((d) => d.data).flat(),
      trendlineLinear: {
        style: this.graphColors.median.rgba(1),
        lineStyle: "line",
        width: 2,
      }
    } as any);
  }

}
