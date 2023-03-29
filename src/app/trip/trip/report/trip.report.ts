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
  isEmptyArray,
  isNil,
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
import { RevealSlideChangedEvent } from '@app/shared/report/reveal/reveal.utils';
import { ChartJsPluginMedianLine, ChartJsPluginTresholdLine, ChartJsUtils, ChartJsUtilsColor, ChartJsUtilsMediandLineOptions, ChartJsUtilsTresholdLineOptions } from '@app/shared/chartsjs.utils';
import { Chart, ChartConfiguration, ChartLegendOptions, ChartTitleOptions, ScaleTitleOptions } from 'chart.js';
import { DOCUMENT } from '@angular/common';
import pluginTrendlineLinear from 'chartjs-plugin-trendline';
import '@sgratzl/chartjs-chart-boxplot/build/Chart.BoxPlot.js';
import { TripReportData, TripReportService } from '@app/trip/trip/report/trip-report.service';
import { IDenormalizedPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { collectByFunction, Function } from '@app/shared/functions';
import { CatchCategoryType, SpeciesLength } from '@app/trip/trip/report/trip-report.model';
import { filter } from 'rxjs/operators';

export declare type BaseNumericStats = {min: number; max: number; avg: number};
export declare type SpeciesChart = ChartConfiguration & ChartJsUtilsTresholdLineOptions & ChartJsUtilsMediandLineOptions;
export declare class TripReportStats {
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
export class TripReport<R extends TripReportData, S extends TripReportStats> extends AppRootDataReport<Trip, number, S> {

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
    console.debug(`[${this.constructor.name}.loadData]`, arguments);

    const trip = await this.tripService.load(id, { withOperation: false });

    // Load report data
    const data = await this.loadReportData(trip, opts);

    // Fill operations (from HH data)
    trip.operations = (data.HH || []).map(s => s.asOperation());

    // Compute stats
    this.stats = await this.computeStats(trip, data, opts);

    return trip;
  }

  protected loadReportData(trip: Trip,
                                 opts?: {
                                    cache?: boolean
                                  }): Promise<R> {
    return this.tripReportService.loadData({
      program: trip.program,
      includedIds: [trip.id]
    }, {
      ...opts,
      fetchPolicy: 'no-cache'
    });
  }

  protected async computeStats(trip: Trip, data: R, opts?: {
    getSubCategory?: Function<any, string>;
    stats?: S;
    cache?: boolean;
  }): Promise<S> {
    const stats = opts?.stats || <S>{};

    // Split SL and HL by species
    const slMap = collectByProperty(data.SL, 'species');
    const hlMap = collectByProperty(data.HL, 'species');

    // For each species (found in HL)
    stats.species = await Promise.all(Object.keys(hlMap)
      .map(async (species) => {
        const speciesData = {
          ...data,
          SL: slMap[species],
          HL: hlMap[species]
        }

        const speciesOpts = {getSubCategory: undefined, ...opts, stats};

        return {
          label: species,
          charts: await this.computeSpeciesCharts(trip, species, speciesData, speciesOpts)
        };
      })
    );

    return stats;
  }


  protected computeSpeciesCharts<HL extends SpeciesLength<HL>>(
    trip: Trip,
    species: string,
    data: R,
    opts?: {
      stats?: S;
      getSubCategory: Function<any, string>|undefined;
      subCategories?: string[];
    }): Promise<SpeciesChart[]> {

    return this.computeSpeciesLengthCharts(trip, species, data.HL, opts);
  }

  protected async computeSpeciesLengthCharts<HL extends SpeciesLength<HL>>(
    trip: Trip,
    species: string,
    data: HL[],
    opts?: {
      getSubCategory: Function<Partial<HL>, string>|undefined;
      subCategories?: string[];
    }): Promise<SpeciesChart[]> {
    opts = opts || {getSubCategory: undefined};
    if (isEmptyArray(data)) return [];

    // Load individual batch pmfms
    const lengthPmfms = (await this.programRefService.loadProgramPmfms(trip.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL
    })).filter(PmfmUtils.isLength);

    // Get data
    const taxonGroupId = (data || []).find(sl => isNotNil(sl.taxonGroupId))?.taxonGroupId;

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
        filter: (sl: SpeciesLength) => sl.catchCategory === 'LAN',
        catchCategoryColors: [landingColors],
        subCategories,
        getSubCategory: opts?.getSubCategory
      });
      if (landingChart) charts.push(landingChart);
    }

    // Discard
    {
      const discardFilter: (SpeciesLength) => boolean = (sl: SpeciesLength) => sl.catchCategory === 'DIS';
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

  protected computeSpeciesLengthBarChart<HL extends SpeciesLength<HL>>(
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

    // Add labels
    const min = data.reduce((max, sl) => Math.min(max, sl.lengthClass), 99999) * unitConversion;
    const max = data.reduce((max, sl) => Math.max(max, sl.lengthClass), 0) * unitConversion;
    const labelCount = Math.min(1, Math.abs(max - min) + 1)
    const xAxisLabels = new Array(labelCount)
      .fill(Math.min(min, max))
      .map((v, index) => (v + index).toString());
    ChartJsUtils.pushLabels(chart, xAxisLabels);

    const createCatchCategorySeries = (data: SpeciesLength[], seriesIndex = 0, seriesLabelSuffix = '' ) => {
      const dataByCatchCategory = collectByProperty(data, 'catchCategory');

      // For each LAN, DIS
      const catchCategories = opts?.catchCategories || Object.keys(dataByCatchCategory);
      catchCategories
        .forEach((catchCategory, index) => {
          const data = new Array(xAxisLabels.length).fill(0);
          (dataByCatchCategory[catchCategory] || []).forEach(sl => {
            const labelIndex = sl.lengthClass * unitConversion - min;
            data[labelIndex] += (sl.elevateNumberAtLength || 0);
          });

          const color = opts.catchCategoryColors[index][seriesIndex];
          const label = !opts.filter
            ? [translations[catchCategory === 'DIS' ? 'TRIP.REPORT.DISCARD' : 'TRIP.REPORT.LANDING'], seriesLabelSuffix].join(' - ')
            : seriesLabelSuffix;
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
      const subCategories: string[] = removeDuplicatesFromArray([...opts?.subCategories, ...Object.keys(dataBySubCategory)]);
      subCategories.forEach((subCategory, index) => {
        createCatchCategorySeries(dataBySubCategory[subCategory], index, subCategory)
      })
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

  isNotEmptySpecies(species: {label: string; charts: SpeciesChart[];}) {
    return isNotEmptyArray(species?.charts);
  }
}
