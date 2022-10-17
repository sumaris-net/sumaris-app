import { Component, Inject, Injector, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { AppRootDataReport } from '@app/data/report/root-data-report.class';
import { Trip } from '@app/trip/services/model/trip.model';
import { TripService } from '@app/trip/services/trip.service';
import { Color, ColorScale, ColorScaleOptions, firstTruePromise, isNotNil, sleep, waitFor } from '@sumaris-net/ngx-components';
import { BehaviorSubject } from 'rxjs';
import { OperationService } from '@app/trip/services/operation.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { RevealSlideChangedEvent } from '@app/shared/report/reveal/reveal.utils';
import { Chart, ChartConfiguration, ChartData, ChartDataSets, ChartLegendOptions, ChartPoint, ChartTitleOptions, ScaleTitleOptions } from 'chart.js';
import { DOCUMENT } from '@angular/common';
import chartTrendline from 'chartjs-plugin-trendline';
import annotationPlugin from 'chartjs-plugin-annotation';

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
    landing: this.getColorFromStyle('secondary'),
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
    Chart.plugins.register(chartTrendline);
    Chart.plugins.register(annotationPlugin);
  }

  protected async loadData(id: number): Promise<Trip> {
    console.debug(`[${this.constructor.name}.loadData]`, arguments);
    const data = await this.tripService.load(id, { withOperation: false });

    const res = await this.operationService.loadAllByTrip({
      tripId: id
    }, { fetchPolicy: 'cache-first', fullLoad: false, withTotal: true /*to make sure cache has been filled*/ });

    data.operations = res.data;

    // NOTE : Replace this by real data extractors
    const labels = [
      { label: 'Débarquement', color: this.graphColors.landing },
      { label: 'Rejet', color: this.graphColors.discard },
    ];
    const samples = this.genDummySamplesSets(2, 300, 9, 70);
    this.computeChartDataSetForBar(labels, samples, 7);

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
    const charts: { [key: string]: ChartConfiguration } = {};

    // NOTE : Replace this by real data extractors
    var labels = this.computeChartColorsScaleFromLabels(
      ['Selectif - Tribord', 'Selectif - Babord'],
      { mainColor: this.graphColors.landing.rgb },
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
          // TODO : This not work
          annotations: {
            line1: {
              type: 'line',
              yMin: 60,
              yMax: 60,
              borderColor: 'rgb(255, 99, 132)',
              borderWidth: 2,
            },
            box1: {
              type: 'box',
              xMin: 1,
              xMax: 2,
              yMin: 50,
              yMax: 70,
              backgroundColor: 'rgba(255, 99, 132, 0.25)'
            }
          }
        }
      },
      data: {
        ... this.computeChartDataSetForBar(labels, this.genDummySamplesSets(labels.length, 300, 9, 70), 12),
      }
    }
    //this.computeTresholdCateg(charts['01_repartLangouCapture'], 3);

    // NOTE : Replace this by real data extractors
    var labels = this.computeChartColorsScaleFromLabels(
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

      },
      data: {
        ... this.computeChartDataSetForBar(labels, this.genDummySamplesSets(labels.length, 300, 9, 70), 12),
      }
    }

    // NOTE : Replace this by real data extractors
    var labels = this.computeChartColorsScaleFromLabels(
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
        ... this.computeChartDataSetsForBubule(labels, labels.map(_ => this.genDummySamplesSets(30, 2, 0, 90))),
      }
    }

    this.computeTrendLine(charts['03_comparDebarqRejet']);
    //Object.entries(charts).map(item => this.compouteMedianLineOnChart(item[1]));
    return charts;
  }

  protected computeCategsForCharts(nbCategs: number, values: number[]): { start: number, stop: number, label: string }[] {
    console.debug(`[${this.constructor.name}.computeCategsForCharts]`, arguments);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const diffMaxMin = (max - min);
    const interval = Math.trunc(diffMaxMin / nbCategs);
    return Array(nbCategs).fill(0).map((_, index) => {
      const next = (interval * (index + 1)) + min;
      const start = (next - interval);
      var stop = 0;
      var label = '';
      if ((index + 1) === nbCategs) { // This is the last categorie
        stop = max + 1; // The last categorie must include the max value
        label = `>=${start} - <=${max}`;
      } else {
        stop = next;
        label = `>=${start} - <${stop}`;
      }
      return ({
        start: start,
        stop: stop,
        label: label,
      });
    });
  }

  protected genDummySamplesSets(nbSets: number, nbSamples: number, minVal: number, maxVal: number): number[][] {
    console.debug(`[${this.constructor.name}.genDummySamples]`, arguments);
    return Array(nbSets).fill([]).map(_ => {
      return Array(nbSamples).fill(0).map((_) => {
        return Math.floor(minVal + (Math.random() * (maxVal - minVal + 1)));
      });
    });
  }

  protected computeChartDataSetForBar(labels: { label: string, color: Color }[], samples: number[][], nbCategs: number): ChartData {
    console.debug(`[${this.constructor.name}.computeChartDataSetForBar]`, arguments);
    const categs = this.computeCategsForCharts(nbCategs, samples.flat());
    // Gen data for chart
    const dataForChart = Array(samples.length).fill({}).map((_, index) => {
      var res = new Map();
      // Gen the map first with categs to get ordered map (smallest to largest)
      categs.forEach(c => res.set(c.label, 0));
      // Count the nb of sample that fit into a given categorie
      samples[index].forEach(s => {
        //NOTE : For the last categ, stop is the max + 1
        const currentCateg = categs.find(c => (s >= c.start && s < c.stop)).label;
        res.set(currentCateg, res.get(currentCateg) + 1);
      });
      return Array.from(res.values());
    });
    return {
      labels: categs.map(c => c.label),
      datasets: dataForChart.map((_d, i) => {
        return {
          label: labels[i].label,
          data: dataForChart[i],
          backgroundColor: labels[i].color.rgba(1),
        }
      }),
    };
  }

  protected computeChartDataSetsForBubule(labels: { label: string, color: Color }[], samples: number[][][]): ChartData {
    console.debug(`[${this.constructor.name}.computeChartDataSetsForBubule]`, arguments);
    const bubuleRadius = 6;
    return {
      datasets: labels.map((l, i) => {
        return {
          label: l.label,
          backgroundColor: l.color.rgba(1),
          data: samples[i].map(s => { return { x: s[0], y: s[1], r: bubuleRadius } }),
        };
      })
    };
  }

  protected computeChartColorsScaleFromLabels(labels: string[], options?: ColorScaleOptions): { label: string, color: Color }[] {
    const count = labels.length;
    const colorScale = ColorScale.custom(count, { min: 1, max: labels.length, ...options });
    return labels.map((label, index) => {
      return {
        label: label,
        color: colorScale.getLegendAtIndex(index).color,
      }
    })
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

  protected computeTresholdCateg(chart: ChartConfiguration, categIndex: number) {
    chart.data.datasets.push({
      type: 'line',
      label: 'Seuil',
      borderDash: [5, 5],
      // TODO : this is dummy value for testing purpose
      data: [{ x: 3, y: 0 }, { x: 4, y: 300 }],
      borderColor: this.graphColors.median.rgba(1),
      backgroundColor: this.graphColors.median.rgba(1),
      hideInLegendAndTooltip: true,
      fill: false,
    });
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
