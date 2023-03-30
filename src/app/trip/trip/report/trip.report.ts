import { Component, EventEmitter, Inject, Injector, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { Operation, Trip } from '@app/trip/services/model/trip.model';
import { TripService } from '@app/trip/services/trip.service';
import {
  arrayDistinct,
  collectByProperty,
  Color,
  DateUtils,
  FilterFn,
  firstTruePromise,
  getProperty,
  isEmptyArray,
  isNil, isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  removeDuplicatesFromArray,
  sleep,
  waitFor
} from '@sumaris-net/ngx-components';
import { BehaviorSubject } from 'rxjs';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { ChartJsPluginMedianLine, ChartJsPluginTresholdLine, ChartJsUtils, ChartJsUtilsColor, ChartJsUtilsMediandLineOptions, ChartJsUtilsTresholdLineOptions } from '@app/shared/chartsjs.utils';
import { Chart, ChartConfiguration, ChartLegendOptions, ChartTitleOptions, ScaleTitleOptions } from 'chart.js';
import { DOCUMENT } from '@angular/common';
import pluginTrendlineLinear from 'chartjs-plugin-trendline';
import '@sgratzl/chartjs-chart-boxplot/build/Chart.BoxPlot.js';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { IDenormalizedPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { ArrayElementType, collectByFunction, Function } from '@app/shared/functions';
import { CatchCategoryType, RdbPmfmExtractionData, RdbSpeciesLength } from '@app/trip/trip/report/trip-report.model';
import { filter } from 'rxjs/operators';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
import { ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { AppExtractionReport } from '@app/data/report/extraction-report.class';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Moment } from 'moment';

export declare type BaseNumericStats = {min: number; max: number; avg: number};
export declare type SpeciesChart = ChartConfiguration & ChartJsUtilsTresholdLineOptions & ChartJsUtilsMediandLineOptions;
export declare class TripReportStats {
  programLabel: string;
  startDate: Moment;
  endDate: Moment;
  trips: Trip[];
  operations: Operation[];
  vesselSnapshots: VesselSnapshot[];
  species: {
    label: string;
    charts: SpeciesChart[];
  }[];
}

@Component({
  selector: 'app-trip-report',
  templateUrl: './trip.report.html',
  styleUrls: ['./trip.report.scss'],
  providers: [
    {provide: TripReportService, useClass: TripReportService}
  ],
  encapsulation: ViewEncapsulation.None
})
export class TripReport<
  R extends RdbPmfmExtractionData,
  S extends TripReportStats,
  HL extends ArrayElementType<R['HL']> = ArrayElementType<R['HL']>
  >
  extends AppExtractionReport<R, S> {

  defaultTitleOptions: ChartTitleOptions = {
    fontColor: Color.get('secondary').rgba(1),
    fontSize: 26,
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
  landingColor = Color.get('tertiary');
  discardColor = Color.get('danger');

  protected readonly tripService: TripService;
  protected readonly tripReportService: TripReportService<R>;
  protected readonly vesselSnapshotService: VesselSnapshotService;
  protected readonly pmfmNamePipe: PmfmNamePipe;

  protected mapReadySubject = new BehaviorSubject<boolean>(false);
  protected onRefresh = new EventEmitter<void>();

  @ViewChild('mapContainer', { 'read': ViewContainerRef }) protected mapContainer;
  @ViewChild('mapTemplate') protected mapTemplate: TemplateRef<null>;

  constructor(injector: Injector,
              tripReportService: TripReportService<R>,
              @Inject(DOCUMENT) private _document: Document) {
    super(injector);
    this.tripReportService = tripReportService;
    this.tripService = injector.get(TripService);
    this.vesselSnapshotService = injector.get(VesselSnapshotService);
    this.pmfmNamePipe = injector.get(PmfmNamePipe);
    Chart.plugins.register(pluginTrendlineLinear);
    Chart.plugins.register(ChartJsPluginTresholdLine);
    Chart.plugins.register(ChartJsPluginMedianLine);

    this.onRefresh
      .pipe(filter(_ => this.loaded))
      .subscribe(() => this.reload({cache: false}));
  }

  protected async loadFromRoute(opts?: any): Promise<R> {

    const id: number = this.getIdFromPathIdAttribute(this._pathIdAttribute);
    if (isNotNil(id)) {
      const trip = await this.tripService.load(id, { withOperation: false });

      // Load report data
      this.filter = ExtractionUtils.createTripFilter(trip.program.label, [trip.id]);
    }
    else {
      // TODO parse query params
    }

    if (!this.filter || this.filter.isEmpty())  throw { message:  'ERROR.LOAD_DATA_ERROR' };

    return this.load(this.filter, opts);
  }

  protected async load(filter: ExtractionFilter, opts?: {
    cache?: boolean
  }): Promise<R> {
    console.debug(`[${this.constructor.name}.load]`, arguments);

    // Load data
    const data = await this.loadData(filter, opts);

    // Compute stats
    this.stats = await this.computeStats(data, opts);


    return data;
  }

  protected loadData(filter: ExtractionFilter,
                     opts?: {
                                cache?: boolean
                              }): Promise<R> {
    return this.tripReportService.loadAll(filter, {
      ...opts,
      fetchPolicy: 'no-cache'
    });
  }


  protected async computeStats(data: R, opts?: {
    getSubCategory?: Function<any, string>;
    stats?: S;
    cache?: boolean;
  }): Promise<S> {
    const stats = opts?.stats || <S>{};

    // Fill trips and operations
    stats.trips = (data.TR || []).map(tr => tr.asTrip());
    stats.operations = (data.HH || []).map(s => s.asOperation());
    stats.programLabel = stats.trips.map(t => t.program?.label).find(isNotNil);
    stats.vesselSnapshots = await this.computeVesselSnapshots(data.TR);

    stats.startDate = stats.trips.reduce((date, t) => DateUtils.min(date, t.departureDateTime), DateUtils.moment());
    stats.endDate = stats.trips.reduce((date, t) => DateUtils.max(date, t.departureDateTime), DateUtils.moment(0));

    // Split SL and HL by species
    const slMap = collectByProperty(data.SL, 'species');
    const hlMap = collectByProperty(data.HL, 'species');

    // For each species (found in SL, because HL is not always filled)
    const speciesNames = Object.keys(slMap);
    stats.species = (await Promise.all(speciesNames.map(async (species) => {
        const speciesData = {
          ...data,
          SL: slMap[species],
          HL: hlMap[species]
        }

        const speciesOpts = {getSubCategory: undefined, ...opts, stats};
        const charts = await this.computeSpeciesCharts(species, speciesData, speciesOpts);
        if (isNotEmptyArray(charts)) {
          return { label: species, charts};
        }
      })
    )).filter(isNotNil);

    return stats;
  }

  protected async computeVesselSnapshots(data: R['TR']): Promise<VesselSnapshot[]> {
    const vesselIds = (data || []).map(tr => tr.vesselIdentifier);
    const vessels = await Promise.all(vesselIds.map(id => this.vesselSnapshotService.load(id, {toEntity: false, fetchPolicy: 'cache-first'})));
    return vessels;
  }

  protected async computeSpeciesCharts(
    species: string,
    data: R,
    opts: {
      stats: S;
      getSubCategory: Function<any, string>|undefined;
      subCategories?: string[];
    }): Promise<SpeciesChart[]> {

    return this.computeSpeciesLengthCharts(species, data.HL as HL[], opts);
  }

  protected async computeSpeciesLengthCharts(
    species: string,
    data: HL[],
    opts: {
      stats: S;
      getSubCategory: Function<any, string>|undefined;
      subCategories?: string[];
    }): Promise<SpeciesChart[]> {
    if (isEmptyArray(data) || !opts?.stats?.programLabel) return [];

    // Load individual batch pmfms
    const lengthPmfms = (await this.programRefService.loadProgramPmfms(opts.stats.programLabel, {
      acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL
    })).filter(PmfmUtils.isLength);

    // Get data
    const taxonGroupId = (data || []).map(hl => hl.taxonGroupId).find(isNotNil);

    // Get sub categories
    const subCategories = opts.getSubCategory && this.computeSubCategories(data, opts);

    // Create landing/discard colors for each sub categories
    const landingColors = ChartJsUtilsColor.getDerivativeColor(this.landingColor, Math.max(2, subCategories?.length || 0));
    const discardColors = ChartJsUtilsColor.getDerivativeColor(this.discardColor, Math.max(2, subCategories?.length || 0));

    // Search the right length pmfms
    const lengthPmfm = (lengthPmfms || []).find(p => isNil(taxonGroupId) || isEmptyArray(p.taxonGroupIds) || p.taxonGroupIds.includes(taxonGroupId));

    let threshold = undefined; // TODO load threshold by species
    const charts: SpeciesChart[] = [];

    // Total catch
    {
      const catchChart = this.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
        subtitle: this.translate.instant('TRIP.REPORT.CHART.TOTAL_CATCH'),
        threshold,
        catchCategories: ['LAN', 'DIS'],
        catchCategoryColors: [landingColors, discardColors],
        subCategories,
        getSubCategory: opts?.getSubCategory
      });
      if (catchChart) charts.push(catchChart);
    }

    // Landing
    {
      const landingChart = this.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
        subtitle: this.translate.instant('TRIP.REPORT.LANDING'),
        filter: (sl: RdbSpeciesLength) => sl.catchCategory === 'LAN',
        catchCategoryColors: [landingColors],
        subCategories,
        getSubCategory: opts?.getSubCategory
      });
      if (landingChart) charts.push(landingChart);
    }

    // Discard
    {
      const discardFilter: (SpeciesLength) => boolean = (sl: RdbSpeciesLength) => sl.catchCategory === 'DIS';
      const discardChart = this.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
        subtitle: this.translate.instant('TRIP.REPORT.LANDING'),
        filter: discardFilter,
        catchCategoryColors: [discardColors],
        subCategories,
        getSubCategory: opts?.getSubCategory
      });
      if (discardChart) charts.push(discardChart);
    }

    return charts;
  }

  protected computeSpeciesLengthBarChart(
    species: string,
    data: HL[],
    lengthPmfm: IDenormalizedPmfm,
    opts?: {
      subtitle: string;
      filter?: FilterFn<HL>;
      catchCategories?: CatchCategoryType[],
      catchCategoryColors?: Color[][],
      subCategories?: string[],
      getSubCategory?: Function<any, string>;
      getNumberAtLength?: Function<HL, number>;
      threshold?: number;
    }): SpeciesChart {
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
      'TRIP.REPORT.DISCARD',
      'TRIP.REPORT.LANDING',
    ]);
    const chart: SpeciesChart = {
      type: 'bar',
      options: {
        title: {
          ...this.defaultTitleOptions,
          text: [species,
            [translations['TRIP.REPORT.CHART.SPECIES_LENGTH'], opts?.subtitle].filter(isNotNilOrNaN).join(' - ')
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
          },
          labels: {
            render: function (args) {
              const lines = args.text.split('\n');
              const fontSize = args.index === 0 ? 18 : 14;
              const lineHeight = args.index === 0 ? 1.2 : 1.5;

              return lines
                .map(
                  (line) =>
                    `<div style="font-size: ${fontSize}px; line-height: ${lineHeight}">${line}</div>`
                )
                .join('');
            }
          }
        }
      }
    };

    // FInd min/max (and check if can used elevatedNumberAtLength)
    let min = 99999;
    let max = 0;
    let hasElevateNumberAtLength = true;
    data.forEach(sl => {
      const length = sl.lengthClass * unitConversion;
      min = Math.min(min, length);
      max = Math.max(max, length);
      if (isNil(sl.elevateNumberAtLength) && hasElevateNumberAtLength) hasElevateNumberAtLength = false;
    }) ;

    // Add labels
    const labelCount = Math.max(1, Math.abs(max - min) + 1)
    const xAxisLabels = new Array(labelCount)
      .fill(Math.min(min, max))
      .map((v, index) => (v + index).toString());
    ChartJsUtils.pushLabels(chart, xAxisLabels);

    if (!hasElevateNumberAtLength) {
      console.warn(`[${this.constructor.name}] Cannot used elevateNumberAtLength, for species '${species}'`);
    }
    const getNumberAtLength = opts?.getNumberAtLength
      || (hasElevateNumberAtLength &&  ((hl) => hl.elevateNumberAtLength))
      || ((hl) => hl.numberAtLength);

    const createCatchCategorySeries = (data: HL[], seriesIndex = 0, subCategory?: string) => {
      const dataByCatchCategory = collectByProperty(data, 'catchCategory');

      // For each LAN, DIS
      const catchCategories = opts?.catchCategories || Object.keys(dataByCatchCategory);
      catchCategories
        .forEach((catchCategory, index) => {
          const data = new Array(xAxisLabels.length).fill(0);
          (dataByCatchCategory[catchCategory] || []).forEach(hl => {
            const labelIndex = hl.lengthClass * unitConversion - min;
            data[labelIndex] += (getNumberAtLength(hl) || 0);
          });

          const color = opts.catchCategoryColors[index][seriesIndex];
          const label = (!opts.filter || isNil(subCategory))
            ? [translations[catchCategory === 'DIS' ? 'TRIP.REPORT.DISCARD' : 'TRIP.REPORT.LANDING'], subCategory].filter(isNotNil).join(' - ')
            : subCategory;
          ChartJsUtils.pushDataSetOnChart(chart, {
            label,
            backgroundColor: color.rgba(this.defaultOpacity),
            stack: `${seriesIndex}`,
            data
          });
        });
    }

    if (opts.getSubCategory) {
      const dataBySubCategory = collectByFunction<HL>(data, opts.getSubCategory);
      const subCategories = removeDuplicatesFromArray([...opts?.subCategories, ...Object.keys(dataBySubCategory)]);
      if (isNotEmptyArray(subCategories)) {
        console.warn(`[${this.constructor.name}] No sub categories found for species '${species}'`);
        subCategories.forEach((subCategory, index) => {
          createCatchCategorySeries(dataBySubCategory[subCategory], index, subCategory)
        })
      }
      else {
          createCatchCategorySeries(data);
      }
    }
    else {
      createCatchCategorySeries(data);
    }

    return chart;
  }

  protected computeSubCategories<T extends {meta?: {[key: string]: any}}>(data: T[], opts: {
    subCategories?: string[];
    firstSubCategory?: string;
    getSubCategory: Function<any, string>;
  }): string[] {

    if (isNotEmptyArray(opts?.subCategories)) return opts.subCategories; // Skip if already computed

    // Compute sub category, in meta
    opts.subCategories = [];
    let getSubCategory = opts.getSubCategory;
    data.forEach(sl => {
      sl.meta = sl.meta || {};
      sl.meta.subCategory = sl.meta.subCategory || getSubCategory(sl);
      // Append to list
      if (sl.meta.subCategory && !opts.subCategories.includes(sl.meta.subCategory)) opts.subCategories.push(sl.meta.subCategory);
    });

    // Make to keep sub category first
    if (opts.firstSubCategory) {
      return removeDuplicatesFromArray([opts.firstSubCategory, ...opts.subCategories].filter(isNotNilOrBlank));
    }

    return opts.subCategories;
  }

  onMapReady() {
    this.mapReadySubject.next(true);
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

  protected computeDefaultBackHref(data: R, stats: S): string {
    if (stats.trips?.length === 1) {
      const baseTripPath = `/trips/${stats.trips[0].id}`;
      return `${baseTripPath}?tab=1`;
    }
  }

  protected computePrintHref(data: R, stats: S): string {
    if (stats.trips?.length === 1) {
      const baseTripPath = `/trips/${stats.trips[0].id}`;
      return `${baseTripPath}/report`;
    }

    // TODO serialize into queryParams, and redirect to extraction
  }

  protected async computeTitle(data: R, stats: S): Promise<string> {

    if (stats.vesselSnapshots?.length === 1) {
      return this.translate.instant('TRIP.REPORT.TITLE', {
        departureDate: this.dateFormat.transform(stats.startDate, {time: false}),
        vessel: stats.vesselSnapshots[0].exteriorMarking
      });
    }

    return this.translate.instant('TRIP.REPORT.TITLE_SLIDE');
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

  isNotEmptySpecies(species: {label: string; charts: SpeciesChart[];}) {
    return isNotEmptyArray(species?.charts);
  }
}
