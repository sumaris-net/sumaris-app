import { Component, Inject, Injector, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { AppRootDataReport } from '@app/data/report/root-data-report.class';
import { Trip } from '@app/trip/services/model/trip.model';
import { TripService } from '@app/trip/services/trip.service';
import { collectByProperty, Color, EntityUtils, firstTruePromise, isEmptyArray, isNil, isNotEmptyArray, isNotNil, removeDuplicatesFromArray, sleep, waitFor } from '@sumaris-net/ngx-components';
import { BehaviorSubject } from 'rxjs';
import { OperationService } from '@app/trip/services/operation.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { RevealSlideChangedEvent } from '@app/shared/report/reveal/reveal.utils';
import { ChartJsPluginMedianLine, ChartJsPluginTresholdLine, ChartJsUtils, ChartJsUtilsColor, ChartJsUtilsMediandLineOptions, ChartJsUtilsTresholdLineOptions } from '@app/shared/chartsjs.utils';
import { Chart, ChartConfiguration, ChartLegendOptions, ChartTitleOptions, ScaleTitleOptions } from 'chart.js';
import { DOCUMENT } from '@angular/common';
import pluginTrendlineLinear from 'chartjs-plugin-trendline';
import '@sgratzl/chartjs-chart-boxplot/build/Chart.BoxPlot.js';
import { SpeciesLength, TripReportService } from '@app/trip/trip/report/trip-report.service';
import { IDenormalizedPmfm, IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';

export declare type TripChart = ChartConfiguration & ChartJsUtilsTresholdLineOptions & ChartJsUtilsMediandLineOptions;
export declare type TripCharts = { [key: string]: TripChart };
export declare type TripReportStats = { charts: TripCharts };

@Component({
  selector: 'app-trip-report',
  templateUrl: './trip.report.html',
  styleUrls: ['./trip.report.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TripReport extends AppRootDataReport<Trip, number, TripReportStats> {

  defaultTitleOptions: ChartTitleOptions = {
    fontColor: Color.get('secondary').rgba(1),
    fontSize: 42,
    display: true
  };
  scaleLabelDefaultOption: ScaleTitleOptions = {
    display: true,
    fontStyle: 'bold',
    fontSize: 18
  };
  legendDefaultOption: ChartLegendOptions = {
    position: 'right'
  };
  defaultOpacity = 0.8;
  colorLanding = ChartJsUtilsColor.getDerivativeColor(Color.get('tertiary'), 2);
  colorDiscard = ChartJsUtilsColor.getDerivativeColor(Color.get('danger'), 2);

  protected readonly tripService: TripService;
  protected readonly operationService: OperationService;
  protected readonly tripReportService: TripReportService;
  protected readonly pmfmNamePipe: PmfmNamePipe;

  mapReadySubject = new BehaviorSubject<boolean>(false);

  @ViewChild('mapContainer', { 'read': ViewContainerRef }) mapContainer;
  @ViewChild('mapTemplate') mapTemplate: TemplateRef<null>;

  constructor(injector: Injector,
              @Inject(DOCUMENT) private _document: Document) {
    super(injector);
    this.tripService = injector.get(TripService);
    this.operationService = injector.get(OperationService);
    this.tripReportService = injector.get(TripReportService);
    this.pmfmNamePipe = injector.get(PmfmNamePipe);
    Chart.plugins.register(pluginTrendlineLinear);
    Chart.plugins.register(ChartJsPluginTresholdLine);
    Chart.plugins.register(ChartJsPluginMedianLine);
  }

  protected async loadData(id: number): Promise<Trip> {
    console.debug(`[${this.constructor.name}.loadData]`, arguments);
    const data = await this.tripService.load(id, { withOperation: false });

    const { data: operations } = await this.operationService.loadAllByTrip({
      tripId: id
    }, { fetchPolicy: 'cache-first', fullLoad: false, withTotal: true /*to make sure cache has been filled*/ });

    data.operations = operations;

    const speciesLength = await this.tripReportService.loadSpeciesLength({
      program: data.program,
      includedIds: [data.id]
    }, {
      fetchPolicy: 'no-cache',
      cache: false // TODO: enable cache
    })

    // Load pmfms
    const pmfms = await this.programRefService.loadProgramPmfms(data.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL
    });

    // NOTE : This may be done in another place
    this.stats.charts = {
      //...this.computeDummySpeciesCharts(),
      ...this.computeSpeciesCharts(pmfms, speciesLength)
    };

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
    // DEBUG
    //console.debug(`[${this.constructor.name}.onSlideChanged]`, event);
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
      departureDate: this.dateFormat.transform(data.departureDateTime, { time: false }),
      vessel: data.vesselSnapshot.exteriorMarking
    }).toPromise();
    return title;
  }

  async showMap() {
    this.mapContainer.createEmbeddedView(this.mapTemplate);
    await firstTruePromise(this.mapReadySubject);
  }

  protected computeSpeciesCharts(pmfms: IDenormalizedPmfm[],
                                 data: SpeciesLength[]): TripCharts {

    // For each species
    const dataBySpecies = collectByProperty(data, 'species');
    return Object.keys(dataBySpecies).reduce((charts, species) => {

      // Get data
      const speciesData = dataBySpecies[species];
      const taxonGroupId = speciesData.find(sl => isNotNil(sl.taxonGroupId))?.taxonGroupId;

      // Search the right length pmfms
      const lengthPmfm = (pmfms || []).find(p => PmfmUtils.isLength(p)
        && (isNil(taxonGroupId) || isEmptyArray(p.taxonGroupIds) || p.taxonGroupIds.includes(taxonGroupId))
      );

      let speciesChartIndex = 0;

      const catchChart = this.computeSpeciesBarChart(species, lengthPmfm, speciesData);
      if (catchChart) charts[species + '-' + speciesChartIndex++] = catchChart;

      const landingChart = this.computeSpeciesBarChart(species, lengthPmfm, speciesData, 'LAN');
      if (landingChart) charts[species + '-' + speciesChartIndex++] = landingChart;

      const discardChart = this.computeSpeciesBarChart(species, lengthPmfm, speciesData, 'DIS');
      if (discardChart) charts[species + '-' + speciesChartIndex++] = discardChart;

      const bubbleChart = this.computeSpeciesBubbleChart(species, lengthPmfm, speciesData);
      if (bubbleChart) charts[species + '-' + speciesChartIndex++] = bubbleChart;

      return charts;
    }, {});
  }

  protected computeSpeciesBarChart(species: string,
                                   lengthPmfm: IDenormalizedPmfm,
                                   data: SpeciesLength[],
                                   catchCategoryFilter?: 'LAN' | 'DIS',
                                   ): TripChart {
    const pmfmName = lengthPmfm && this.pmfmNamePipe.transform(lengthPmfm, {withUnit: true, html: false})
       || this.translate.instant('TRIP.REPORT.CHART.LENGTH');
    const unitConversion =  lengthPmfm?.unitLabel === 'cm' ? 0.1 : 1;

    // Filter data
    if (catchCategoryFilter) {
      data = data.filter(sl => sl.catchCategory === catchCategoryFilter);
    }

    // if no data: skip
    if (isEmptyArray(data)) return null;

    const translations = this.translate.instant([
      'TRIP.REPORT.CHART.SPECIES_LENGTH',
      'TRIP.REPORT.CHART.TOTAL_CATCH',
      'TRIP.REPORT.CHART.GEAR_POSITION_T',
      'TRIP.REPORT.CHART.GEAR_POSITION_B',
      'TRIP.REPORT.CHART.DISCARD',
      'TRIP.REPORT.CHART.LANDING',
    ]);
    const subtitle = catchCategoryFilter
      ? translations[catchCategoryFilter === 'DIS' ? 'TRIP.REPORT.CHART.DISCARD' : 'TRIP.REPORT.CHART.LANDING']
      : translations['TRIP.REPORT.CHART.TOTAL_CATCH'];
    const chart: TripChart = {
      type: 'bar',
      options: {
        title: {
          ...this.defaultTitleOptions,
          text: [
            species,
            translations['TRIP.REPORT.CHART.SPECIES_LENGTH'],
            `- ${subtitle} -`
          ]
        },
        scales: {
          xAxes: [
            {
              stacked: true,
              scaleLabel: {
                ...this.scaleLabelDefaultOption,
                labelString: pmfmName
              }
            }
          ],
          yAxes: [
            {
              stacked: true,
              scaleLabel: {
                ...this.scaleLabelDefaultOption,
                labelString: this.translate.instant('TRIP.REPORT.CHART.INDIVIDUAL_COUNT')
              }
            }
          ]
        },
        legend: {
          ...this.legendDefaultOption
        },
        plugins: {
          tresholdLine: { // NOTE : custom plugin
            color: Color.get('red').rgba(this.defaultOpacity),
            style: 'dashed',
            width: 3,
            value: 3, // TODO
            orientation: 'x'
          }
        }
      }
    };


    // Add labels
    const min = data.reduce((max, sl) => Math.min(max, sl.lengthClass), 99999) * unitConversion;
    const max = data.reduce((max, sl) => Math.max(max, sl.lengthClass), 0) * unitConversion;
    const xAxisLabels = Array(max - min + 1)
      .fill(min)
      .map((v, index) => (v + index).toString());
    ChartJsUtils.pushLabels(chart, xAxisLabels);

    const createCathCategorySeries = (data: SpeciesLength[], stackIndex = 0, suffix = '' ) => {
      const dataByCatchCategory = collectByProperty(data, 'catchCategory');

      // For each LAN, DIS
      const catchCategories = !catchCategoryFilter
        ? removeDuplicatesFromArray(['LAN', 'DIS', ...Object.keys(dataByCatchCategory)])
        : Object.keys(dataByCatchCategory);
      catchCategories
        .filter(cat => !catchCategoryFilter || catchCategoryFilter === cat)
        .forEach(catchCategory => {
          const data = Array(xAxisLabels.length).fill(0);
          (dataByCatchCategory[catchCategory] || []).forEach(sl => {
            const labelIndex = sl.lengthClass * unitConversion - min;
            data[labelIndex] += (sl.numberAtLength || 0);
          });

          const color = catchCategory === 'DIS' ? this.colorDiscard[stackIndex] : this.colorLanding[stackIndex];
          const label = translations[catchCategory === 'DIS' ? 'TRIP.REPORT.CHART.DISCARD' : 'TRIP.REPORT.CHART.LANDING'] + suffix;
          ChartJsUtils.pushDataSetOnChart(chart, {
            label,
            backgroundColor: color.rgba(this.defaultOpacity),
            stack: `${stackIndex}`,
            data
          });
        });
    }

    const dataByGearPosition = collectByProperty(data, 'subGearPosition');
    let gearPositions = Object.keys(dataByGearPosition);
    if (isNotEmptyArray(gearPositions)) {
      // For each T, B
      gearPositions = removeDuplicatesFromArray(['B', 'T', ...gearPositions]);
      gearPositions.forEach((gearPosition, stackIndex) => {
        const seriesNameSuffix = ' - ' + translations['TRIP.REPORT.CHART.GEAR_POSITION_' + gearPosition.toUpperCase()];
        createCathCategorySeries(dataByGearPosition[gearPosition], stackIndex, seriesNameSuffix)
      })
    }
    else {
      createCathCategorySeries(data);
    }

    return chart;
  }

  protected computeSpeciesBubbleChart(species: string,
                                      lengthPmfm: IDenormalizedPmfm,
                                      data: SpeciesLength[]): TripChart {
    const pmfmName = lengthPmfm && this.pmfmNamePipe.transform(lengthPmfm, {withUnit: true, html: false})
    || this.translate.instant('TRIP.REPORT.CHART.LENGTH');
    const unitConversion =  lengthPmfm?.unitLabel === 'cm' ? 0.1 : 1;
    const chart: TripChart = {
      type: 'bubble',
      options: {
        title: {
          ...this.defaultTitleOptions,
          text: [species,
            this.translate.instant('TRIP.REPORT.CHART.LANDING_AND_DISCARD_COMPARISON'),
            //'(sous trait)'
          ]
        },
        legend: {
          ...this.legendDefaultOption
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                ...this.scaleLabelDefaultOption,
                labelString: 'Quantité dans le chalut sélectif (kg)'
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                ...this.scaleLabelDefaultOption,
                labelString: 'Quantité dans le chalut standard (kg)'
              }
            }
          ]
        },
        plugins: {
          medianLine: {
            color: Color.get('red').rgba(this.defaultOpacity),
            orientation: 'b',
            style: 'solid',
            width: 3
          }
        }
      }
    };
    ChartJsUtils.pushDataSetOnChart(chart, {
      label: 'Langoustine G',
      backgroundColor: this.colorLanding[0].rgba(this.defaultOpacity),
      data: ChartJsUtils.computeSamplesToChartPoint(ChartJsUtils.genDummySamplesSets(30, 2, 0, 90))
    });
    ChartJsUtils.pushDataSetOnChart(chart, {
      label: 'Langoustine D',
      backgroundColor: this.colorLanding[1].rgba(this.defaultOpacity),
      data: ChartJsUtils.computeSamplesToChartPoint(ChartJsUtils.genDummySamplesSets(30, 2, 0, 90))
    });
    ChartJsUtils.pushDataSetOnChart(chart, {
      label: 'Langoustine R',
      backgroundColor: this.colorDiscard[0].rgba(this.defaultOpacity),
      data: ChartJsUtils.computeSamplesToChartPoint(ChartJsUtils.genDummySamplesSets(30, 2, 0, 90))
    });

    return chart;
  }

  /* -- DEBUG only -- */

  protected computeDummySpeciesCharts(): { [key: string]: ChartConfiguration } {
    const defaultTitleOptions: ChartTitleOptions = {
      fontColor: Color.get('secondary').rgba(1),
      fontSize: 42,
      display: true
    };
    const scaleLableDefaultOption: ScaleTitleOptions = {
      display: true,
      fontStyle: 'bold',
      fontSize: 18
    };
    const legendDefaultOption: ChartLegendOptions = {
      position: 'right'
    };
    const charts: { [key: string]: ChartConfiguration & ChartJsUtilsTresholdLineOptions & ChartJsUtilsMediandLineOptions } = {};

    const defaultOpacity = 0.8;
    const colorLanding = ChartJsUtilsColor.getDerivativeColor(Color.get('tertiary'), 2);
    const colorDiscard = ChartJsUtilsColor.getDerivativeColor(Color.get('danger'), 2);


    charts['02'] = {
      type: 'bar',
      options: {
        title: {
          ...defaultTitleOptions,
          text: ['Répartition en taille des langoustines', '- Débarquement -']
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                ...scaleLableDefaultOption,
                labelString: 'Taille céphalotoracique (mm)'
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                ...scaleLableDefaultOption,
                labelString: 'Nb individus'
              }
            }
          ]
        },
        legend: {
          ...legendDefaultOption
        },
        plugins: {
          tresholdLine: { // NOTE : Custom plugin
            color: Color.get('red').rgba(defaultOpacity),
            style: 'dashed',
            width: 3,
            value: 4
          }
        }
      }
    };
    const chart02_label = Array(12).fill(3).map((v, i) => (v * (i + 1)).toString());
    ChartJsUtils.pushLabels(charts['02'], chart02_label);
    ChartJsUtils.pushDataSetOnChart(charts['02'], {
      label: 'Selectif - Tribord',
      backgroundColor: colorLanding[0].rgba(defaultOpacity),
      data: ChartJsUtils.genDummySampleFromLabelsWithWeight(chart02_label, 70, 20, 4, 1.2)
    });
    ChartJsUtils.pushDataSetOnChart(charts['02'], {
      label: 'Selectif - Babord',
      backgroundColor: colorLanding[1].rgba(defaultOpacity),
      data: ChartJsUtils.genDummySampleFromLabelsWithWeight(chart02_label, 60, 20, 4, 2)
    });

    charts['03'] = {
      type: 'bar',
      options: {
        title: {
          ...defaultTitleOptions,
          text: ['Répartition en taille des langoustines', '- Rejet -']
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                ...scaleLableDefaultOption,
                labelString: 'Taille céphalotoracique (mm)'
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                ...scaleLableDefaultOption,
                labelString: 'Nb individus'
              }
            }
          ]
        },
        legend: {
          ...legendDefaultOption
        },
        plugins: {
          tresholdLine: { // NOTE : Custom plugin
            color: Color.get('red').rgba(defaultOpacity),
            style: 'dashed',
            width: 3,
            value: 4
          }
        }
      }
    };
    const chart03_label = Array(12).fill(3).map((v, i) => (v * (i + 1)).toString());
    ChartJsUtils.pushLabels(charts['03'], chart03_label);
    ChartJsUtils.pushDataSetOnChart(charts['03'], {
      label: 'Selectif - Tribord',
      backgroundColor: colorDiscard[0].rgba(defaultOpacity),
      data: ChartJsUtils.genDummySampleFromLabelsWithWeight(chart03_label, 90, 30, 4, 1.2)
    });
    ChartJsUtils.pushDataSetOnChart(charts['03'], {
      label: 'Selectif - Babord',
      backgroundColor: colorDiscard[1].rgba(defaultOpacity),
      data: ChartJsUtils.genDummySampleFromLabelsWithWeight(chart03_label, 70, 30, 4, 1.2)
    });

    charts['04'] = {
      type: 'bubble',
      options: {
        title: {
          ...defaultTitleOptions,
          text: ['Comparaison des débarquements et rejets', '(sous trait)']
        },
        legend: {
          ...legendDefaultOption
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                ...scaleLableDefaultOption,
                labelString: 'Quantité dans le chalut sélectif (kg)'
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                ...scaleLableDefaultOption,
                labelString: 'Quantité dans le chalut standard (kg)'
              }
            }
          ]
        },
        plugins: {
          medianLine: {
            color: Color.get('red').rgba(defaultOpacity),
            orientation: 'b',
            style: 'solid',
            width: 3
          }
        }
      }
    };
    ChartJsUtils.pushDataSetOnChart(charts['04'], {
      label: 'Langoustine G',
      backgroundColor: colorLanding[0].rgba(defaultOpacity),
      data: ChartJsUtils.computeSamplesToChartPoint(ChartJsUtils.genDummySamplesSets(30, 2, 0, 90))
    });
    ChartJsUtils.pushDataSetOnChart(charts['04'], {
      label: 'Langoustine D',
      backgroundColor: colorLanding[1].rgba(defaultOpacity),
      data: ChartJsUtils.computeSamplesToChartPoint(ChartJsUtils.genDummySamplesSets(30, 2, 0, 90))
    });
    ChartJsUtils.pushDataSetOnChart(charts['04'], {
      label: 'Langoustine R',
      backgroundColor: colorDiscard[0].rgba(defaultOpacity),
      data: ChartJsUtils.computeSamplesToChartPoint(ChartJsUtils.genDummySamplesSets(30, 2, 0, 90))
    });

    // Box plot
    charts['04_testboxplot'] = <ChartConfiguration>{
      type: 'boxplot',
      colors: [
        // Color should be specified, in order to works well
        colorDiscard[0].rgba(defaultOpacity),
        colorDiscard[1].rgba(defaultOpacity),
        colorLanding[0].rgba(defaultOpacity),
        colorLanding[1].rgba(defaultOpacity),
      ],
      options: {
        title: {
          ...defaultTitleOptions,
          text: ['Comparaison des débarquements et rejets', '(sous trait)']
        },
        legend: {
          ...legendDefaultOption
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                ...scaleLableDefaultOption,
                labelString: 'Quantité dans le chalut sélectif (kg)'
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                ...scaleLableDefaultOption,
                labelString: 'Quantité dans le chalut standard (kg)'
              }
            }
          ]
        }
      },
      data: {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
        datasets: [
          {
            label: 'Dataset 1',
            backgroundColor: 'rgba(255,0,0,0.5)',
            borderColor: 'red',
            borderWidth: 1,
            //outlierColor: "#999999",
            //padding: 10,
            //itemRadius: 0,
            data: [
              [1000, 2000, 3000,1000, 2000, 3000, 5000]
            ]
          },
          {
            label: 'Dataset 2',
            backgroundColor: 'rgba(0,0,255,0.5)',
            borderColor: 'blue',
            borderWidth: 1,
            //outlierColor:
            //"#999999",
            //padding:
            //10,
            //itemRadius: 0,
            data: [
              [1000, 2000, 3000,1000, 2000, 3000, 5000]
            ]
          }
        ]
      }
    };

    return charts;
  }

}
