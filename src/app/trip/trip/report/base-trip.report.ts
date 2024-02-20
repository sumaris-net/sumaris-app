import { Directive, Injector, Optional, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import {
  arrayDistinct,
  collectByProperty,
  Color,
  DateUtils,
  EntityAsObjectOptions,
  FilterFn,
  firstTruePromise,
  fromDateISOString,
  getProperty,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  removeDuplicatesFromArray,
  sleep,
  toDateISOString,
  waitFor,
} from '@sumaris-net/ngx-components';
import { BehaviorSubject } from 'rxjs';
import { ChartJsUtils, ChartJsUtilsColor, ChartJsUtilsMedianLineOptions, ChartJsUtilsThresholdLineOptions } from '@app/shared/chartsjs.utils';
import { ChartConfiguration, ChartOptions, ChartTypeRegistry } from 'chart.js';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { IDenormalizedPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { ArrayElementType, collectByFunction, Function } from '@app/shared/functions';
import { CatchCategoryType, RdbPmfmExtractionData, RdbSpeciesLength } from '@app/trip/trip/report/trip-report.model';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
import { ExtractionFilter, ExtractionType } from '@app/extraction/type/extraction-type.model';
import { AppExtractionReport, ExtractionReportStats } from '@app/data/report/extraction-report.class';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Moment } from 'moment';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { Clipboard } from '@app/shared/context.service';
import { Operation, Trip } from '@app/trip/trip/trip.model';
import { TripService } from '@app/trip/trip/trip.service';

export declare interface BaseNumericStats {
  min: number;
  max: number;
  avg: number;
}
export declare type SpeciesChart<TType extends keyof ChartTypeRegistry = any> = ChartConfiguration<TType> &
  ChartJsUtilsThresholdLineOptions<TType> &
  ChartJsUtilsMedianLineOptions<TType>;

export class BaseTripReportStats extends ExtractionReportStats {
  programLabel: string;
  startDate: Moment;
  endDate: Moment;
  trips: Trip[];
  operations: Operation[];
  vesselSnapshots: VesselSnapshot[];
  vesselLength: BaseNumericStats;
  species: {
    label: string;
    charts: SpeciesChart[];
  }[];

  fromObject(source: any) {
    super.fromObject(source);
    this.programLabel = source.programLabel;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.trips = source.trips?.map(Trip.fromObject) || [];
    this.operations = source.operations?.map(Operation.fromObject) || [];
    this.vesselSnapshots = source.vesselSnapshots?.map(VesselSnapshot.fromObject) || [];
    this.vesselLength = source.vesselLength;
    // Do not compute species here, they are re-computed whit TripReport.computeSpecies
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    return {
      ...target,
      programLabel: this.programLabel,
      startDate: toDateISOString(this.startDate),
      endDate: toDateISOString(this.endDate),
      trips: this.trips.map((item) => item.asObject(opts)),
      operations: this.operations?.map((item) => item.asObject(opts)),
      vesselSnapshots: this.vesselSnapshots?.map((item) => item.asObject(opts)),
      vesselLength: this.vesselLength,
    };
  }
}

@Directive()
export abstract class BaseTripReport<
  T extends RdbPmfmExtractionData,
  S extends BaseTripReportStats = BaseTripReportStats,
  HL extends ArrayElementType<T['HL']> = ArrayElementType<T['HL']>,
> extends AppExtractionReport<T, S> {
  protected logPrefix = 'base-trip-report ';

  defaultOptions: Partial<ChartOptions> = {
    responsive: true,
    animation: false,
    plugins: {
      title: {
        display: true,
        font: {
          size: 26,
        },
        color: Color.get('secondary').rgba(1),
      },
      legend: {
        position: 'right', // or 'right'
      },
    },
  };

  scaleLabelDefaultOption = {
    display: true,
    font: {
      size: 18,
      weight: 'bold',
    },
  };

  defaultOpacity = 0.8;
  landingColor = Color.get('tertiary');
  discardColor = Color.get('danger');

  protected readonly tripService: TripService;
  protected readonly tripReportService: TripReportService<T>;
  protected readonly vesselSnapshotService: VesselSnapshotService;
  protected readonly pmfmNamePipe: PmfmNamePipe;

  protected mapReadySubject = new BehaviorSubject<boolean>(false);

  @ViewChild('mapContainer', { read: ViewContainerRef }) protected mapContainer;
  @ViewChild('mapTemplate') protected mapTemplate: TemplateRef<null>;

  protected constructor(injector: Injector, tripReportService: TripReportService<T>, @Optional() statsType?: new () => S) {
    super(injector, null, statsType || (BaseTripReportStats as any));
    this.tripReportService = tripReportService;
    this.tripService = injector.get(TripService);
    this.vesselSnapshotService = injector.get(VesselSnapshotService);
    this.pmfmNamePipe = injector.get(PmfmNamePipe);
    ChartJsUtils.register();

    // TODO : check this
    // this.onRefresh
    //   .pipe(filter(_ => this.loaded))
    //   .subscribe(() => this.reload({cache: false}));
  }

  protected async loadFromRoute(opts?: any): Promise<T> {
    const id: number = this.getIdFromPathIdAttribute(this._pathIdAttribute);
    if (isNotNil(id)) {
      const trip = await this.tripService.load(id, { withOperation: false });

      // Load report data
      this.filter = ExtractionUtils.createTripFilter(trip.program.label, [trip.id]);
    } else {
      const { label, category, q } = this.route.snapshot.queryParams;
      this.type = ExtractionType.fromObject({ label, category });
      const criteria = q && ExtractionUtils.parseCriteriaFromString(q);
      if (isNotEmptyArray(criteria)) {
        this.filter = ExtractionFilter.fromObject({ criteria });
      }
    }

    if (!this.filter || this.filter.isEmpty()) throw { message: 'ERROR.LOAD_DATA_ERROR' };

    return this.load(this.filter, {
      ...opts,
      type: this.type,
    });
  }

  protected async load(
    filter: ExtractionFilter,
    opts?: {
      type?: ExtractionType;
      cache?: boolean;
    }
  ): Promise<T> {
    if (this.debug) console.debug(`[${this.logPrefix}] load`, arguments);
    // Load data
    return this.loadData(filter, opts);
  }

  protected loadData(
    filter: ExtractionFilter,
    opts?: {
      type?: ExtractionType;
      cache?: boolean;
    }
  ): Promise<T> {
    return this.tripReportService.loadAll(filter, {
      ...opts,
      formatLabel: opts.type?.label,
      fetchPolicy: 'no-cache',
    });
  }

  protected async loadFromClipboard(clipboard: Clipboard, opts?: any): Promise<boolean> {
    const consumed = await super.loadFromClipboard(clipboard, false);

    // TODO Re-compute stats.species
    if (isNotNil(this.stats)) {
      this.stats.species = await this.computeSpecies(this.data, this.stats, opts);
    }

    return consumed;
  }

  protected async computeStats(data: T, opts?: IComputeStatsOpts<S>): Promise<S> {
    const stats = opts?.stats || new this.statsType();

    // Fill trips and operatsions
    stats.trips = (data.TR || []).map((tr) => tr.asTrip());
    stats.operations = (data.HH || []).map((s) => s.asOperation());
    stats.programLabel = stats.trips.map((t) => t.program?.label).find(isNotNil);
    stats.program = stats.programLabel && (await this.programRefService.loadByLabel(stats.programLabel));
    stats.vesselSnapshots = await this.computeVesselSnapshots(data.TR);

    // Compute startDate (from trips or from operations)
    stats.startDate = stats.trips.reduce(
      (date, t) => DateUtils.min(date, t.departureDateTime?.isValid() && t.departureDateTime),
      undefined as Moment
    );
    if (!stats.startDate || !stats.startDate.isValid()) {
      stats.startDate = stats.operations.reduce((date, o) => DateUtils.min(date, o.startDateTime?.isValid() && o.startDateTime), undefined as Moment);
    }

    // Compute endDate (from trips or from operations)
    stats.endDate = stats.trips.reduce((date, t) => DateUtils.max(date, t.returnDateTime?.isValid() && t.returnDateTime), undefined as Moment);
    if (!stats.endDate || !stats.endDate.isValid()) {
      stats.endDate = stats.operations.reduce((date, o) => DateUtils.max(date, o.endDateTime?.isValid() && o.endDateTime), undefined as Moment);
    }
    stats.vesselLength = this.computeNumericStats(data.TR, 'vesselLength');

    stats.species = await this.computeSpecies(data, stats, opts);

    return stats;
  }

  protected computeShareBasePath(): string {
    return 'trips/report';
  }

  protected async computeSpecies(data: T, stats: S, opts: IComputeStatsOpts<S>): Promise<S['species']> {
    // Split SL and HL by species
    const slMap = collectByProperty(data.SL, 'species');
    const hlMap = collectByProperty(data.HL, 'species');

    // For each species (found in SL, because HL is not always filled)
    const speciesNames = Object.keys(slMap);
    return (
      await Promise.all(
        speciesNames.map(async (species) => {
          const speciesData = {
            ...data,
            SL: slMap[species],
            HL: hlMap[species],
          };

          const speciesOpts = { getSubCategory: undefined, ...opts, stats };
          const charts = await this.computeSpeciesCharts(species, speciesData, speciesOpts);
          if (isNotEmptyArray(charts)) {
            return { label: species, charts };
          }
        })
      )
    ).filter(isNotNil);
  }

  protected async computeVesselSnapshots(data: RdbPmfmExtractionData['TR']): Promise<VesselSnapshot[]> {
    const vesselIds = removeDuplicatesFromArray((data || []).map((tr) => tr.vesselIdentifier));
    return await Promise.all(vesselIds.map((id) => this.vesselSnapshotService.load(id, { fetchPolicy: 'cache-first' })));
  }

  protected async computeSpeciesCharts(
    species: string,
    data: T,
    opts: {
      stats: S;
      getSubCategory: Function<any, string> | undefined;
      subCategories?: string[];
    }
  ): Promise<SpeciesChart[]> {
    return this.computeSpeciesLengthCharts(species, data.HL as HL[], opts);
  }

  protected async computeSpeciesLengthCharts(
    species: string,
    data: HL[],
    opts: {
      stats: S;
      getSubCategory: Function<any, string> | undefined;
      subCategories?: string[];
    }
  ): Promise<SpeciesChart[]> {
    if (isEmptyArray(data) || !opts?.stats?.programLabel) return [];

    // Load individual batch pmfms
    const lengthPmfms = (
      await this.programRefService.loadProgramPmfms(opts.stats.programLabel, {
        acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL,
      })
    ).filter(PmfmUtils.isLength);

    // Get data
    const taxonGroupId = (data || []).map((hl) => hl.taxonGroupId).find(isNotNil);

    // Get sub categories
    const subCategories = opts.getSubCategory && this.computeSubCategories(data, opts);

    // Create landing/discard colors for each sub categories
    const landingColors = ChartJsUtilsColor.getDerivativeColor(this.landingColor, Math.max(2, subCategories?.length || 0));
    const discardColors = ChartJsUtilsColor.getDerivativeColor(this.discardColor, Math.max(2, subCategories?.length || 0));

    // Search the right length pmfms
    const lengthPmfm = (lengthPmfms || []).find(
      (p) => isNil(taxonGroupId) || isEmptyArray(p.taxonGroupIds) || p.taxonGroupIds.includes(taxonGroupId)
    );

    const threshold = undefined; // TODO load threshold by species
    const charts: SpeciesChart[] = [];

    // Total catch
    {
      const catchChart = this.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
        subtitle: this.translate.instant('TRIP.REPORT.CHART.TOTAL_CATCH'),
        threshold,
        catchCategories: ['LAN', 'DIS'],
        catchCategoryColors: [landingColors, discardColors],
        subCategories,
        getSubCategory: opts?.getSubCategory,
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
        getSubCategory: opts?.getSubCategory,
      });
      if (landingChart) charts.push(landingChart);
    }

    // Discard
    {
      const discardFilter: (SpeciesLength) => boolean = (sl: RdbSpeciesLength) => sl.catchCategory === 'DIS';
      const discardChart = this.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
        subtitle: this.translate.instant('TRIP.REPORT.DISCARD'),
        filter: discardFilter,
        catchCategoryColors: [discardColors],
        subCategories,
        getSubCategory: opts?.getSubCategory,
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
      catchCategories?: CatchCategoryType[];
      catchCategoryColors?: Color[][];
      subCategories?: string[];
      getSubCategory?: Function<any, string>;
      getNumberAtLength?: Function<HL, number>;
      threshold?: number;
    }
  ): SpeciesChart {
    const pmfmName =
      (lengthPmfm && this.pmfmNamePipe.transform(lengthPmfm, { withUnit: true, html: false })) || this.translate.instant('TRIP.REPORT.CHART.LENGTH');
    const unitConversion = lengthPmfm?.unitLabel === 'cm' ? 0.1 : 1;

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
    const chart: SpeciesChart<any> = {
      type: 'bar',
      data: {
        datasets: [],
        labels: [],
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: {
            ...this.defaultOptions.plugins.title,
            text: [species, [translations['TRIP.REPORT.CHART.SPECIES_LENGTH'], opts?.subtitle].filter(isNotNilOrNaN).join(' - ')],
          },
          thresholdLine: opts?.threshold > 0 && {
            color: Color.get('red').rgba(this.defaultOpacity),
            style: 'dashed',
            width: opts.threshold,
            value: opts.threshold,
            orientation: 'x',
          },
          labels: {
            render(args) {
              const lines = args.text.split('\n');
              const fontSize = args.index === 0 ? 18 : 14;
              const lineHeight = args.index === 0 ? 1.2 : 1.5;

              return lines.map((line) => `<div style="font-size: ${fontSize}px; line-height: ${lineHeight}">${line}</div>`).join('');
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            title: {
              ...this.scaleLabelDefaultOption,
              text: pmfmName,
            },
          },
          y: {
            stacked: true,
            title: {
              ...this.scaleLabelDefaultOption,
              text: this.translate.instant('TRIP.REPORT.CHART.INDIVIDUAL_COUNT'),
            },
          },
        },
      },
    };

    // FInd min/max (and check if can used elevatedNumberAtLength)
    let min = 99999;
    let max = 0;
    let hasElevatedNumberAtLength = true;
    data.forEach((sl) => {
      const length = sl.lengthClass * unitConversion;
      min = Math.min(min, length);
      max = Math.max(max, length);
      if (hasElevatedNumberAtLength && isNil(sl.elevatedNumberAtLength)) hasElevatedNumberAtLength = false;
    });

    // Add labels
    const labelCount = Math.max(1, Math.abs(max - min) + 1);
    const xAxisLabels = new Array(labelCount).fill(Math.min(min, max)).map((v, index) => (v + index).toString());
    ChartJsUtils.pushLabels(chart, xAxisLabels);

    if (!hasElevatedNumberAtLength) {
      console.warn(`[${this.constructor.name}] Cannot used elevatedNumberAtLength, for species '${species}'`);
    }
    const getNumberAtLength =
      opts?.getNumberAtLength || (hasElevatedNumberAtLength && ((hl) => hl.elevatedNumberAtLength)) || ((hl) => hl.numberAtLength);

    const createCatchCategorySeries = (data: HL[], seriesIndex = 0, subCategory?: string) => {
      const dataByCatchCategory = collectByProperty(data, 'catchCategory');

      // For each LAN, DIS
      const catchCategories = opts?.catchCategories || Object.keys(dataByCatchCategory);
      catchCategories.forEach((catchCategory, index) => {
        const data = new Array(xAxisLabels.length).fill(0);
        (dataByCatchCategory[catchCategory] || []).forEach((hl) => {
          const labelIndex = hl.lengthClass * unitConversion - min;
          data[labelIndex] += getNumberAtLength(hl) || 0;
        });

        const color = opts.catchCategoryColors[index][seriesIndex];
        const label =
          !opts.filter || isNil(subCategory)
            ? [translations[catchCategory === 'DIS' ? 'TRIP.REPORT.DISCARD' : 'TRIP.REPORT.LANDING'], subCategory].filter(isNotNil).join(' - ')
            : subCategory;
        ChartJsUtils.pushDataSet(chart, {
          label,
          backgroundColor: color.rgba(this.defaultOpacity),
          stack: `${seriesIndex}`,
          data,
        });
      });
    };

    if (opts.getSubCategory) {
      const dataBySubCategory = collectByFunction<HL>(data, opts.getSubCategory);
      const subCategories = removeDuplicatesFromArray([...opts?.subCategories, ...Object.keys(dataBySubCategory)]);
      if (isNotEmptyArray(subCategories)) {
        console.warn(`[${this.constructor.name}] No sub categories found for species '${species}'`);
        subCategories.forEach((subCategory, index) => {
          createCatchCategorySeries(dataBySubCategory[subCategory], index, subCategory);
        });
      } else {
        createCatchCategorySeries(data);
      }
    } else {
      createCatchCategorySeries(data);
    }

    return chart;
  }

  protected computeSubCategories<D extends { meta?: { [key: string]: any } }>(
    data: D[],
    opts: {
      subCategories?: string[];
      firstSubCategory?: string;
      getSubCategory: Function<any, string>;
    }
  ): string[] {
    if (isNotEmptyArray(opts?.subCategories)) return opts.subCategories; // Skip if already computed

    // Compute sub category, in meta
    opts.subCategories = [];
    const getSubCategory = opts.getSubCategory;
    data.forEach((sl) => {
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

  async showMap() {
    this.mapContainer.createEmbeddedView(this.mapTemplate);
    await firstTruePromise(this.mapReadySubject);
  }

  protected computeDefaultBackHref(data: T, stats: S): string {
    if (stats.trips?.length === 1) {
      const baseTripPath = `/trips/${stats.trips[0].id}`;
      return `${baseTripPath}?tab=1`;
    }
    // Back to extraction
    else {
      const queryString = Object.entries(this.route.snapshot.queryParams || {})
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      return `/extraction/data?${queryString}`;
    }
  }

  protected async computeTitle(data: T, stats: S): Promise<string> {
    if (stats.vesselSnapshots?.length === 1 && stats.startDate?.isValid()) {
      return this.translate.instant('TRIP.REPORT.TITLE', {
        departureDate: this.dateFormat.transform(stats.startDate, { time: false }),
        vessel: stats.vesselSnapshots[0].exteriorMarking,
      });
    }

    return this.translate.instant('TRIP.REPORT.TITLE_SLIDE');
  }

  protected collectDistinctStringPropertyValues<D = any, K extends keyof D = any>(data: D[], propertyName: K): string[] {
    return arrayDistinct(data.map((v) => getProperty(v, propertyName)).filter((v) => typeof v === 'string') as unknown as string[]);
  }

  protected collectNumericPropertyValues<D = any, K extends keyof D = any>(data: D[], propertyName: K): number[] {
    return data.map((v) => +getProperty(v, propertyName)).filter(isNotNilOrNaN) as number[];
  }

  protected computeNumericStats<D = any, K extends keyof D = any>(data: D[], propertyName: K): BaseNumericStats {
    const values = this.collectNumericPropertyValues(data, propertyName);
    if (isEmptyArray(values)) return undefined; // SKip if cannot compute min/max/avg
    return <BaseNumericStats>{
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }

  protected collectDistinctQualitativeValue<D = any, K extends keyof D = any>(data: D[], propertyName: K): string[] {
    return this.collectDistinctStringPropertyValues(data, propertyName).map((value) =>
      value.indexOf(' - ') !== -1 ? value.split(' - ')[1] : (value as unknown as string)
    );
  }

  dataAsObject(source: RdbPmfmExtractionData, opts?: EntityAsObjectOptions): any {
    return {
      TR: source.TR.map((item) => item.asObject(opts)),
      HH: source.HH.map((item) => item.asObject(opts)),
      SL: source.SL.map((item) => item.asObject(opts)),
      HL: source.HL.map((item) => item.asObject(opts)),
    };
  }

  isNotEmptySpecies(species: { label: string; charts: SpeciesChart[] }) {
    return isNotEmptyArray(species?.charts);
  }
}
