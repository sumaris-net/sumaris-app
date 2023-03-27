import { Component, EventEmitter, Inject, Injector, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { AppRootDataReport } from '@app/data/report/root-data-report.class';
import { Trip } from '@app/trip/services/model/trip.model';
import { TripService } from '@app/trip/services/trip.service';
import {
  arrayDistinct,
  collectByProperty,
  Color,
  FilterFn,
  firstTruePromise,
  getProperty,
  IReferentialRef,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrNaN,
  removeDuplicatesFromArray,
  sleep,
  waitFor
} from '@sumaris-net/ngx-components';
import { BehaviorSubject } from 'rxjs';
import { OperationService } from '@app/trip/services/operation.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { RevealSlideChangedEvent } from '@app/shared/report/reveal/reveal.utils';
import { ChartJsPluginMedianLine, ChartJsPluginTresholdLine, ChartJsUtils, ChartJsUtilsColor, ChartJsUtilsMediandLineOptions, ChartJsUtilsTresholdLineOptions } from '@app/shared/chartsjs.utils';
import { Chart, ChartConfiguration, ChartLegendOptions, ChartTitleOptions, ScaleTitleOptions } from 'chart.js';
import { DOCUMENT } from '@angular/common';
import pluginTrendlineLinear from 'chartjs-plugin-trendline';
import '@sgratzl/chartjs-chart-boxplot/build/Chart.BoxPlot.js';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { IDenormalizedPmfm, IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { collectByFunction, Function } from '@app/shared/functions';
import { ApaseSpeciesLength, ApaseSpeciesList, ApaseStation, CatchCategoryType, SpeciesLength, SpeciesList } from '@app/trip/trip/report/trip-report.model';
import { environment } from '@environments/environment';
import { filter } from 'rxjs/operators';

export declare type AppChart = ChartConfiguration & ChartJsUtilsTresholdLineOptions & ChartJsUtilsMediandLineOptions;
export declare type BaseNumericStats = {min: number; max: number; avg: number};
export declare type TripReportStats = {
  gearByOperationId: {[key: string]: PhysicalGear};
  selectivityDeviceMap: {[key: string]: IReferentialRef};
  selectivityDevices: string[];
  species: {
    label: string;
    charts: AppChart[];
  }[];
  seaStates: string[];
  seabedFeatures: string[];
  gearSpeed: BaseNumericStats;
};

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
  colorLanding = ChartJsUtilsColor.getDerivativeColor(Color.get('tertiary'), 3);
  colorDiscard = ChartJsUtilsColor.getDerivativeColor(Color.get('danger'), 3);

  protected readonly tripService: TripService;
  protected readonly operationService: OperationService;
  protected readonly tripReportService: TripReportService;
  protected readonly pmfmNamePipe: PmfmNamePipe;

  mapReadySubject = new BehaviorSubject<boolean>(false);
  onRefresh = new EventEmitter<void>();

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

    this.onRefresh
      .pipe(filter(_ => this.loaded))
      .subscribe(() => this.reload({cache: false}));
  }

  protected async loadData(id: number, opts?: {
    cache?: boolean
  }): Promise<Trip> {
    const enableCache = !opts || opts.cache !== false;
    console.debug(`[${this.constructor.name}.loadData]`, arguments);

    const trip = await this.tripService.load(id, { withOperation: false });

    const stations = await this.tripReportService.loadStations({
      program: trip.program,
      includedIds: [trip.id]
    }, {
      formatLabel: 'apase',
      dataType: ApaseStation,
      fetchPolicy: 'no-cache',
      cache: enableCache
    });
    trip.operations = stations.map(s => s.asOperation());

    this.stats.gearSpeed = this.computeNumericStats(stations, 'gearSpeed');
    this.stats.seaStates = this.collectDistinctQualitativeValue(stations, 'seaState');
    this.stats.seabedFeatures = this.collectDistinctQualitativeValue(stations, 'seabedFeatures');

    // Load selectivity devices, by gear or sub gear
    this.stats.gearByOperationId = stations.reduce((res, s) => {
      res[s.stationNumber] = s.gearIdentifier;
      return res;
    }, {})
    const gearPmfms = await this.programRefService.loadProgramPmfms(trip.program.label, {
      acquisitionLevels: [AcquisitionLevelCodes.PHYSICAL_GEAR, AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR]
    });
    this.stats.selectivityDeviceMap = this.computeSelectivityDevices(trip, gearPmfms);
    this.stats.selectivityDevices = arrayDistinct(Object.values(this.stats.selectivityDeviceMap).filter(r => r.label !== 'NA').map(r => r.name));
    // Translate
    Object.values(this.stats.selectivityDeviceMap)
      .filter(isNotNil)
      .forEach(selectiveDevice => {
        if (selectiveDevice.label === 'NA') {
          selectiveDevice.name = this.translate.instant('TRIP.REPORT.CHART.SELECTIVITY.STANDARD');
        }
        else {
          selectiveDevice.description = selectiveDevice.name;
          selectiveDevice.name = this.translate.instant('TRIP.REPORT.CHART.SELECTIVITY.SELECTIVE', {label: selectiveDevice.name});
        }
      });

    const speciesList = await this.tripReportService.loadSpeciesList({
      program: trip.program,
      includedIds: [trip.id]
    }, {
      formatLabel: 'apase',
      dataType: ApaseSpeciesList,
      fetchPolicy: 'no-cache',
      cache: enableCache
    });

    const speciesLength = await this.tripReportService.loadSpeciesLength({
      program: trip.program,
      includedIds: [trip.id]
    }, {
      formatLabel: 'apase',
      dataType: ApaseSpeciesLength,
      fetchPolicy: 'no-cache',
      cache: enableCache
    });

    const getSubCategory = (sl: {stationNumber: number; subGearIdentifier: number}) => {
      const gearRankOrder = this.stats.gearByOperationId[+sl.stationNumber];
      const gearKey = isNotNil(sl.subGearIdentifier) ? `${gearRankOrder}|${sl.subGearIdentifier}` : `${gearRankOrder}`;
      const selectiveDevice: IReferentialRef = this.stats.selectivityDeviceMap[gearKey];
      return selectiveDevice && selectiveDevice.name;
    };

    // Load individual batch pmfms
    const lengthPmfms = (await this.programRefService.loadProgramPmfms(trip.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL
    })).filter(PmfmUtils.isLength);

    //this.stats.charts = this.computeDummySpeciesCharts();
    // For each species
    const speciesListDataBySpecies = collectByProperty(speciesList, 'species');
    const speciesLengthBySpecies = collectByProperty(speciesLength, 'species');
    this.stats.species = Object.keys(speciesListDataBySpecies)
      .map(species => {
         return {
           label: species,
           charts: [
             ...this.computeSpeciesLengthCharts(species, speciesLengthBySpecies[species], lengthPmfms, {getSubCategory}),
             ...(getSubCategory
               ? this.computeSpeciesBubbleChart(species, speciesListDataBySpecies[species], {
                catchCategories: ['LAN', 'DIS'],
                getSubCategory
                })
               : [])
           ]
         };
      });

    return trip;
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

  protected collectDistinctStringPropertyValues<T = any, K extends keyof T = any>(data: T[], propertyName: K): string[] {
    return arrayDistinct(
      data.map(v => getProperty(v, propertyName)).filter(v => typeof v === 'string') as unknown as string[]);
  }


  protected collectNumericPropertyValues<T = any, K extends keyof T = any>(data: T[], propertyName: K): number[] {
    return data.map(v => +getProperty(v, propertyName))
        .filter(isNotNilOrNaN) as number[];
  }


  protected computeNumericStats<T = any, K extends keyof T = any>(data: T[], propertyName: K): BaseNumericStats {
    const values = this.collectNumericPropertyValues(data, propertyName);
    if (isEmptyArray(values)) return undefined; // SKip if cannot compute min/max/avg
    return <BaseNumericStats>{
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a,b) => a+b, 0) / values.length
    }
  }
  protected collectDistinctQualitativeValue<T = any, K extends keyof T = any>(data: T[], propertyName: K): string[] {
    return this.collectDistinctStringPropertyValues(data, propertyName)
      .map(value => value.indexOf(' - ') !== -1 ? value.split(' - ')[1] : value as unknown as string);
  }

  /**
   * Extract selectivity devices, by gear or sub gear
   * @param trip
   * @param gearPmfms
   * @protected
   */
  protected computeSelectivityDevices(trip: Trip, gearPmfms: IPmfm[]): {[key: string]: IReferentialRef} {
    const selectivityDevicePmfmIds = (gearPmfms || []).filter(PmfmUtils.isSelectivityDevice);
    if (isEmptyArray(selectivityDevicePmfmIds)) return { };

    const getSelectivityDevice = (gear: PhysicalGear) => {
      const value = selectivityDevicePmfmIds.map(p => PmfmValueUtils.fromModelValue(gear.measurementValues[p.id], p))
        .find(PmfmValueUtils.isNotEmpty);
      const selectiveDevice = (Array.isArray(value) ? value[0] : value) as IReferentialRef;
      return selectiveDevice;
    }

    const result: {[key: string]: IReferentialRef} = {};
    (trip.gears || []).forEach(gear  => {
      if (isNotEmptyArray(gear.children)) {
        gear.children.forEach(subGear => {
          result[`${gear.rankOrder}|${subGear.rankOrder}`] = getSelectivityDevice(subGear);
        });
      }
      else {
        result[`${gear.rankOrder}`] = getSelectivityDevice(gear);
      }
    });

    return result;
  }


  protected computeSpeciesLengthCharts<HL extends SpeciesLength<HL>>(
          species: string,
          data: HL[],
          lengthPmfms: IDenormalizedPmfm[],
          opts?: {
            getSubCategory?: Function<Partial<HL>, string>
          }): AppChart[] {
    opts = opts || {};
    if (isEmptyArray(data)) return [];

    // Get data
    const taxonGroupId = (data || []).find(sl => isNotNil(sl.taxonGroupId))?.taxonGroupId;

    // Compute sub category, in meta
    const subCategories = [];
    let getSubCategory = opts.getSubCategory;
    if (getSubCategory) {
      data.forEach(sl => {
        sl.meta = sl.meta || {};
        sl.meta.subCategory = getSubCategory(sl);
        // Append to list
        if (sl.meta.subCategory && !subCategories.includes(sl.meta.subCategory)) subCategories.push(sl.meta.subCategory);
      });
      // Simplify original getCategory, by using meta
      getSubCategory = (sl: HL) => sl.meta?.subCategory;
    }

    // Search the right length pmfms
    const lengthPmfm = (lengthPmfms || []).find(p => isNil(taxonGroupId) || isEmptyArray(p.taxonGroupIds) || p.taxonGroupIds.includes(taxonGroupId));

    let threshold = undefined; // TODO get seuil by species
    let chartIndex = 0;
    const charts: AppChart[] = [];

    // Total catch
    {
      const catchChart = this.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
        subtitle: this.translate.instant('TRIP.REPORT.CHART.TOTAL_CATCH'),
        threshold,
        catchCategories: ['LAN', 'DIS'],
        subCategories,
        getSubCategory
      });
      if (catchChart) charts.push(catchChart);
    }

    // Landing
    {
      const landingChart = this.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
        subtitle: this.translate.instant('TRIP.REPORT.CHART.LANDING'),
        filter: (sl: SpeciesLength) => sl.catchCategory === 'LAN',
        subCategories,
        getSubCategory: opts?.getSubCategory
      });
      if (landingChart) charts.push(landingChart);
    }

    // Discard
    {
      const discardFilter: (SpeciesLength) => boolean = (sl: SpeciesLength) => sl.catchCategory === 'DIS';
      const discardChart = this.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
        subtitle: this.translate.instant('TRIP.REPORT.CHART.LANDING'),
        filter: discardFilter,
        subCategories,
        getSubCategory: opts?.getSubCategory
      });
      if (discardChart) charts.push(discardChart);
    }

    return charts;
  }

  protected computeSpeciesLengthBarChart<HL extends SpeciesLength<HL>>(
                                   species: string,
                                   data: HL[],
                                   lengthPmfm: IDenormalizedPmfm,
                                   opts?: {
                                     subtitle: string;
                                     filter?: FilterFn<HL>;
                                     catchCategories?: CatchCategoryType[],
                                     subCategories?: string[],
                                     getSubCategory?: Function<Partial<HL>, string>;
                                     threshold?: number;
                                   }): AppChart {
    const pmfmName = lengthPmfm && this.pmfmNamePipe.transform(lengthPmfm, {withUnit: true, html: false})
       || this.translate.instant('TRIP.REPORT.CHART.LENGTH');
    const unitConversion =  lengthPmfm?.unitLabel === 'cm' ? 0.1 : 1;

    // Filter data
    if (opts?.filter) data = data.filter(opts.filter);

    // if no data: skip
    if (isEmptyArray(data)) return null;

    const translations = this.translate.instant([
      'TRIP.REPORT.CHART.SPECIES_LENGTH',
      'TRIP.REPORT.CHART.TOTAL_CATCH',
      'TRIP.REPORT.CHART.DISCARD',
      'TRIP.REPORT.CHART.LANDING',
    ]);
    const chart: AppChart = {
      type: 'bar',
      options: {
        title: {
          ...this.defaultTitleOptions,
          text: [
            species,
            translations['TRIP.REPORT.CHART.SPECIES_LENGTH'],
            `- ${opts?.subtitle} -`
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
        plugins: (opts?.threshold > 0) && {
          tresholdLine: { // NOTE : custom plugin
            color: Color.get('red').rgba(this.defaultOpacity),
            style: 'dashed',
            width: opts.threshold,
            value: opts.threshold,
            orientation: 'x'
          }
        }
      }
    };

    // Add labels
    const min = data.reduce((max, sl) => Math.min(max, sl.lengthClass), 99999) * unitConversion;
    const max = data.reduce((max, sl) => Math.max(max, sl.lengthClass), 0) * unitConversion;
    const xAxisLabels = new Array(max - min + 1)
      .fill(min)
      .map((v, index) => (v + index).toString());
    ChartJsUtils.pushLabels(chart, xAxisLabels);

    const createCatchCategorySeries = (data: SpeciesLength[], stackIndex = 0, seriesLabelSuffix = '' ) => {
      const dataByCatchCategory = collectByProperty(data, 'catchCategory');

      // For each LAN, DIS
      const catchCategories = opts?.catchCategories || Object.keys(dataByCatchCategory);
      catchCategories
        .forEach(catchCategory => {
          const data = new Array(xAxisLabels.length).fill(0);
          (dataByCatchCategory[catchCategory] || []).forEach(sl => {
            const labelIndex = sl.lengthClass * unitConversion - min;
            data[labelIndex] += (sl.elevateNumberAtLength || 0);
          });

          const color = catchCategory === 'DIS' ? this.colorDiscard[stackIndex] : this.colorLanding[stackIndex];
          const label = !opts.filter
            ? [translations[catchCategory === 'DIS' ? 'TRIP.REPORT.CHART.DISCARD' : 'TRIP.REPORT.CHART.LANDING'], seriesLabelSuffix].join(' - ')
            : seriesLabelSuffix;
          ChartJsUtils.pushDataSetOnChart(chart, {
            label,
            backgroundColor: color.rgba(this.defaultOpacity),
            stack: `${stackIndex}`,
            data
          });
        });
    }

    if (opts.getSubCategory) {
      const dataBySubCategory = collectByFunction<HL>(data, opts.getSubCategory);
      const subCategories: string[] = removeDuplicatesFromArray([...opts?.subCategories, ...Object.keys(dataBySubCategory)]);
      subCategories.forEach((subCategory, stackIndex) => {
        createCatchCategorySeries(dataBySubCategory[subCategory], stackIndex, subCategory)
      })
    }
    else {
      createCatchCategorySeries(data);
    }

    return chart;
  }

  protected computeSpeciesBubbleChart<SL extends SpeciesList<SL>>(species: string,
                                                                  data: SL[],
                                                                  opts?: {
                                                                    catchCategories: CatchCategoryType[],
                                                                    subCategories?: string[];
                                                                    getSubCategory: Function<Partial<SL>, string>
                                                                  }): AppChart[] {
    const translations = this.translate.instant([
      'TRIP.REPORT.CHART.SELECTIVITY.STANDARD',
      'TRIP.REPORT.CHART.SELECTIVITY.QUANTITY_IN_STANDARD',
      'TRIP.REPORT.CHART.SELECTIVITY.QUANTITY_IN_SELECTIVE',
      'TRIP.REPORT.CHART.DISCARD',
      'TRIP.REPORT.CHART.LANDING',
    ]);

    const dataByCatchCategory = collectByProperty(data, 'catchCategory');
    const catchCategories = opts.catchCategories
      ? arrayDistinct([...opts.catchCategories, ...Object.keys(dataByCatchCategory)])
      : Object.keys(dataByCatchCategory);

    // Compute sub category, in meta
    let subCategories = [];
    let getSubCategory = opts.getSubCategory;
    data.forEach(sl => {
      sl.meta = sl.meta || {};
      sl.meta.subCategory = getSubCategory(sl);
      // Append to list
      if (sl.meta.subCategory && !subCategories.includes(sl.meta.subCategory)) subCategories.push(sl.meta.subCategory);
    });
    if (subCategories.length !== 2) return []; // Skip

    subCategories = arrayDistinct([translations['TRIP.REPORT.CHART.SELECTIVITY.STANDARD'], ...subCategories])

    const chart: AppChart = {
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
                labelString: translations['TRIP.REPORT.CHART.SELECTIVITY.QUANTITY_IN_SELECTIVE']
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                ...this.scaleLabelDefaultOption,
                labelString: translations['TRIP.REPORT.CHART.SELECTIVITY.QUANTITY_IN_STANDARD']
              }
            }
          ]
        },
        plugins: {
          medianLine: {
            color: Color.get('red').rgba(this.defaultOpacity),
            orientation: 'b',
            style: 'solid',
            width: 2
          }
        }
      }
    };

    // For each LAN, DIS
    catchCategories.forEach(catchCategory => {
      const label = [species, translations[catchCategory === 'DIS' ? 'TRIP.REPORT.CHART.DISCARD' : 'TRIP.REPORT.CHART.LANDING']].join(' - ')
      const color = catchCategory === 'DIS' ? this.colorDiscard[0] : this.colorLanding[0];
      const dataByStation = collectByProperty(dataByCatchCategory[catchCategory] , 'stationNumber');
      const values = Object.keys(dataByStation).map(station => {
        return dataByStation[station].reduce((res, sl) => {
          const index = subCategories.indexOf(sl.meta.subCategory);
          if (index != -1) res[index] += sl.weight / 1000; // Convert to kg
          return res;
        }, new Array(subCategories.length).fill(0));
      });
      ChartJsUtils.pushDataSetOnChart(chart, {
        label,
        backgroundColor: color.rgba(this.defaultOpacity),
        data: ChartJsUtils.computeChartPoints(values)
      });
    });

    return [chart];
  }

}
