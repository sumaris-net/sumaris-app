import { Component, Inject, Injector, ViewEncapsulation } from '@angular/core';
import { collectByProperty, Color, FilterFn, IReferentialRef, isEmptyArray, isNilOrBlank, isNotEmptyArray, isNotNil, ReferentialRef, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { ChartJsUtils, ChartJsUtilsColor } from '@app/shared/chartsjs.utils';
import { DOCUMENT } from '@angular/common';
import '@sgratzl/chartjs-chart-boxplot/build/Chart.BoxPlot.js';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { IDenormalizedPmfm, IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { Function } from '@app/shared/functions';
import { CatchCategoryType } from '@app/trip/trip/report/trip-report.model';
import { SelectivityTripReportService } from '@app/trip/trip/report/selectivity/selectivity-trip-report.service';
import { BaseNumericStats, SpeciesChart, TripReport, TripReportStats } from '@app/trip/trip/report/trip.report';
import {
  SelectivityExtractionData,
  SelectivityGear,
  SelectivitySpeciesLength,
  SelectivitySpeciesList,
  SelectivityStation,
  SelectivityTrip
} from '@app/trip/trip/report/selectivity/selectivity-trip-report.model';
import { AverageDetails, MathUtils } from '@app/shared/math.utils';
import { ChartConfiguration } from 'chart.js';
import { ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { environment } from '@environments/environment';


export interface SubCategoryWeightStats {
  total: number; // total weight
  stations: {[station:string]: number}; // weight by station
}

export interface SpeciesWeightStats {
  label: string;
  total: number;
  totalVariation: number;
  avgVariation?: AverageDetails;
  subCategories?: {
    [subCategory: string]: SubCategoryWeightStats;
  }
}
export interface WeightStats {
  catchCategories: {
    [catchCategory: string]: {
      key: CatchCategoryType;
      label: string;
      species: SpeciesWeightStats[];
      enableAvgVariation?: boolean;
    };
  }
}
export declare interface SelectivityTripReportStats extends TripReportStats {
  gearIdentifierByOperationId: {[key: string]: PhysicalGear};
  selectivityDeviceMap: {[key: string]: IReferentialRef};
  selectivityDevices: string[];
  seaStates: string[];
  seabedFeatures: string[];
  gearSpeed: BaseNumericStats;
  subCategories: string[];
  weights: WeightStats;
}

@Component({
  selector: 'app-selectivity-trip-report',
  templateUrl: './selectivity-trip.report.html',
  styleUrls: [
    '../trip.report.scss',
    './selectivity-trip.report.scss'
  ],
  providers: [
    {provide: TripReportService, useClass: SelectivityTripReportService}
  ],
  encapsulation: ViewEncapsulation.None
})
export class SelectivityTripReport extends TripReport<SelectivityExtractionData, SelectivityTripReportStats> {


  constructor(injector: Injector,
              tripReportService: TripReportService<SelectivityExtractionData>,
              @Inject(DOCUMENT) document: Document) {
    super(injector, tripReportService, document);
    this.i18nContext = {
      ...this.i18nContext,
      suffix: 'TRAWL_SELECTIVITY.'
    }
  }

  protected loadData(filter: ExtractionFilter,
                 opts?: {
                   cache?: boolean
                 }): Promise<SelectivityExtractionData> {
    return this.tripReportService.loadAll(filter, {
      ...opts,
      formatLabel: 'apase',
      dataTypes: {
        TR: SelectivityTrip,
        HH: SelectivityStation,
        SL: SelectivitySpeciesList,
        HL: SelectivitySpeciesLength,
      },
      fetchPolicy: 'no-cache'
    });
  }


  protected async computeStats(data: SelectivityExtractionData, opts?: { cache?: boolean; stats?: SelectivityTripReportStats }): Promise<SelectivityTripReportStats> {
    const stats = opts?.stats || <SelectivityTripReportStats>{};
    const programLabel = (data.TR || []).map(t => t.project).find(isNotNil);

    const standardSubCategory = this.translate.instant('TRIP.REPORT.CHART.TRAWL_SELECTIVITY.STANDARD');

    stats.gearSpeed = this.computeNumericStats(data.HH, 'gearSpeed');
    stats.seaStates = this.collectDistinctQualitativeValue(data.HH, 'seaState')
      .map(seaState => {
        // Clean value (e.g.  remove ", vagues de X à Xm")
        const separatorIndex = seaState.indexOf(',');
        if (separatorIndex !== -1) return seaState.substring(0, separatorIndex);
        return seaState;
      });
    stats.seabedFeatures = this.collectDistinctQualitativeValue(data.HH, 'seabedFeatures');

    const gearPmfms = await this.programRefService.loadProgramPmfms(programLabel, {
      acquisitionLevels: [AcquisitionLevelCodes.PHYSICAL_GEAR, AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR]
    });
    stats.selectivityDeviceMap = this.computeSelectivityDevices(data, gearPmfms);
    stats.selectivityDevices = removeDuplicatesFromArray(Object.values(stats.selectivityDeviceMap).filter(r => r.label !== 'NA').map(r => r.name));
    // Translate
    Object.values(stats.selectivityDeviceMap)
      .filter(isNotNil)
      .forEach(selectiveDevice => {
        if (selectiveDevice.label === 'NA') {
          selectiveDevice.name = standardSubCategory;
        }
        else {
          selectiveDevice.description = selectiveDevice.name;
          selectiveDevice.name = this.translate.instant('TRIP.REPORT.CHART.TRAWL_SELECTIVITY.SELECTIVE', {label: selectiveDevice.name});
        }
      });

    // Load selectivity devices, by gear or sub gear
    stats.gearIdentifierByOperationId = (data.HH || []).reduce((res, s) => {
      res[s.stationNumber] = s.gearIdentifier;
      return res;
    }, {});

    const getSubCategory = (sl: any) => {
      const gearRankOrder = stats.gearIdentifierByOperationId[+sl.stationNumber];
      const gearKey = isNotNil(sl.subGearIdentifier) ? `${gearRankOrder}|${sl.subGearIdentifier}` : `${gearRankOrder}`;
      const selectiveDevice: IReferentialRef = stats.selectivityDeviceMap[gearKey];
      return selectiveDevice && selectiveDevice.name;
    };

    // Compute sub categories (and store result in meta)
    stats.subCategories = this.computeSubCategories(data.SL, {getSubCategory, firstSubCategory: standardSubCategory});
    stats.weights = this.computeWeightStats(data.SL, {getSubCategory: (sl) => sl.meta?.subCategory, standardSubCategory })

    return super.computeStats(data, {...opts, stats, getSubCategory});
  }

  protected computeWeightStats(data: SelectivitySpeciesList[], opts: {
    getSubCategory: Function<any, string>;
    standardSubCategory: string;
  }): WeightStats {
    const result = <WeightStats>{
      catchCategories: {
        LAN: {
          key: 'LAN',
          label: 'TRIP.REPORT.LANDING',
          species: [],
          enableAvgVariation: false
        }, DIS: {
          key: 'DIS',
          label: 'TRIP.REPORT.DISCARD',
          species: [],
          enableAvgVariation: false
        }
      }
    };

    // Compute sub categories (and store result in meta)
    let subCategories = this.computeSubCategories(data, opts);
    if (subCategories.length < 2) return result; // Skip

    // Split data by species
    const dataBySpecies = collectByProperty(data, 'species');

    // Compute stats on each species
    Object.keys(dataBySpecies).forEach(species => {
      console.debug(`[selectivity-trip-report] Computing stats for species '${species}'...`);

      const speciesStats = {
        LAN: <SpeciesWeightStats>{label: species, total: 0, totalVariation: undefined, avgVariation: undefined, subCategories: {}},
        DIS: <SpeciesWeightStats>{label: species, total: 0, totalVariation: undefined, avgVariation: undefined, subCategories: {}}
      };
      subCategories.forEach(subCategory => {
        speciesStats.LAN.subCategories[subCategory] = {total: 0, stations: {}};
        speciesStats.DIS.subCategories[subCategory] = {total: 0, stations: {}};
      });
      const speciesData = dataBySpecies[species];

      // Compute total weights, by catch categories and sub categories
      speciesData.forEach(sl => {
        const catchCategoryStats = speciesStats[sl.catchCategory];
        const weight = (sl.weight || 0) / 1000;  // Convert to kg
        catchCategoryStats.total += weight;
        // Increment sub category
        const subCategory = opts.getSubCategory(sl);
        {
          const subCategoryStats = catchCategoryStats.subCategories[subCategory];
          subCategoryStats.total += weight;
          // Increment by station
          const stationKey = `${sl.tripCode}|${sl.stationNumber}`;
          subCategoryStats.stations[stationKey] = subCategoryStats.stations[stationKey] || 0;
          subCategoryStats.stations[stationKey] += weight;
        }
      })

      // Compute weight total variation, between sub categories
      if (speciesStats.LAN.total > 0) {
        this.computeWeightTotalVariation(speciesStats.LAN, opts.standardSubCategory);
        result.catchCategories.LAN.species.push(speciesStats.LAN);
      }
      if (speciesStats.DIS.total > 0) {
        this.computeWeightTotalVariation(speciesStats.DIS, opts.standardSubCategory);
        result.catchCategories.DIS.species.push(speciesStats.DIS);
      }

      // Compute AVG variation
      const hasSubGearIdentifier = subCategories.length >= 2 && speciesData.findIndex(sl => isNotNil(sl.subGearIdentifier)) !== -1;
      if (hasSubGearIdentifier) {
        // Compute weight total variation, between sub categories
        if (speciesStats.LAN.total > 0) {
          result.catchCategories.LAN.enableAvgVariation = true;
          this.computeWeightAvgVariation('LAN', speciesStats.LAN, opts.standardSubCategory);
        }
        if (speciesStats.DIS.total > 0) {
          result.catchCategories.DIS.enableAvgVariation = true;
          this.computeWeightAvgVariation('DIS', speciesStats.DIS, opts.standardSubCategory);
        }
      }
    })

    return result;
  }

  protected computeWeightTotalVariation(weights: SpeciesWeightStats,
                                        standardSubCategory: string) {
    weights.totalVariation = this.computeWeightVariation(weights,standardSubCategory, stats => stats.total);
  }

  protected computeWeightAvgVariation(catchCategory: CatchCategoryType,
                                      weights: SpeciesWeightStats,
                                      standardSubCategory: string) {
    // Collect all station keys, found on every sub category
    const stationKeys = Object.keys(weights.subCategories).reduce((res, subCategory) => {
      return Object.keys(weights.subCategories[subCategory].stations).reduce((res, stationKey) => {
        return res.includes(stationKey) ? res : res.concat(stationKey);
      }, res)
    }, <string[]>[]);

    const stationVariations = stationKeys.map(stationKey => this.computeWeightVariation(weights, standardSubCategory, stats => stats.stations[stationKey]))
      .filter(isNotNil); // Exclude when standard = 0

    if (isNotEmptyArray(stationVariations)) {
      console.debug(`[selectivity-trip-report] Weight variations by station for {${catchCategory} - ${weights.label}}: `, stationVariations);
      weights.avgVariation = MathUtils.averageWithDetails(stationVariations);
    }
  }

  /**
   * Calcul le taux de variation, suivant la formule : (<poids_espèce_chalut_selectif> - <poids_espèce_chalut_standard>) / <poids_espèce_chalut_standard>
   * @param weights
   * @param standardSubCategory libellé de correspond au chalut standard.
   * @param weightGetter function pour lire le poids.
   * @protected
   */
  protected computeWeightVariation(weights: SpeciesWeightStats,
                                   standardSubCategory: string,
                                   weightGetter: Function<SubCategoryWeightStats, number>): number | undefined {
    const selective = Object.keys(weights.subCategories)
      .filter(sc => sc !== standardSubCategory).reduce((sum, subCategory) => {
        return sum + (weightGetter(weights.subCategories[subCategory]) || 0);
      }, 0);
    const standard = (weightGetter(weights.subCategories[standardSubCategory]) || 0);
    if (standard > 0) {
       return ((selective - standard) / standard) * 100;
    }
    return undefined;
  }

  /**
   * Extract selectivity devices, by gear or sub gear
   * @param trip
   * @param gearPmfms
   * @protected
   */
  protected computeSelectivityDevices(data: SelectivityExtractionData, gearPmfms: IPmfm[]): {[key: string]: IReferentialRef} {
    const selectivityDevicePmfmIds = (gearPmfms || []).filter(PmfmUtils.isSelectivityDevice);
    if (isEmptyArray(selectivityDevicePmfmIds)) return { };

    const getSelectivityDevice = (gear: SelectivityGear) => {
      const value = gear.selectionDevice;
      if (isNilOrBlank(value)) return undefined;
      const parts = value.split(' - ', 2);
      return gear.selectionDevice && ReferentialRef.fromObject({label: parts[0], name: parts[1]}); //selectiveDevice;
    }

    return (data.FG || []).reduce((res, gear)  => {
      const selectionDevice = getSelectivityDevice(gear);
      if (selectionDevice) {
        const gearKey = isNotNil(gear.subGearIdentifier) ? `${gear.gearIdentifier}|${gear.subGearIdentifier}` : `${gear.gearIdentifier}`;
        res[gearKey] = selectionDevice;
      }
      return res;
    }, <{[key: string]: IReferentialRef}>{});
  }


  protected async computeSpeciesCharts(species: string,
                                       data: SelectivityExtractionData,
                                       opts: {
                                         stats: SelectivityTripReportStats;
                                         getSubCategory: Function<any, string>|undefined;
                                         subCategories?: string[];
                                       }
  ): Promise<SpeciesChart[]> {

    let charts = await super.computeSpeciesCharts(species, data, opts);

    // Add bubble charts, by category (= selective device)
    if (opts?.getSubCategory) {
      // Add bubble charts, by category (= selective device)
      const bubbleCharts = this.computeSpeciesBubbleChart(species, data.SL, {
        subCategories: this.stats.subCategories,
        getSubCategory: opts.getSubCategory,
        catchCategories: ['LAN', 'DIS']
      });
      if (isNotEmptyArray(bubbleCharts)) charts = charts.concat(...bubbleCharts);

      // Add boxplot chart
      if (opts.stats.weights) {
        // TODO finish this feature, then enable
        if (!environment.production) {
          // const boxPlotChart = this.createSpeciesBoxPlot(species, {
          //   stats: opts.stats,
          //   subCategories: this.stats.subCategories,
          //   catchCategories: ['LAN', 'DIS']
          // });
          // if (boxPlotChart) charts.push(boxPlotChart);
        }
      }
    }

    return charts;
  }

  protected computeSpeciesLengthBarChart(species: string, data: SelectivitySpeciesLength[], lengthPmfm: IDenormalizedPmfm, opts?: {
    subtitle: string;
    filter?: FilterFn<SelectivitySpeciesLength>;
    catchCategories?: CatchCategoryType[];
    catchCategoryColors?: Color[][];
    subCategories?: string[];
    getSubCategory?: Function<any, string>;
    getNumberAtLength?: Function<SelectivitySpeciesLength, number>;
    threshold?: number
  }): SpeciesChart {
    return super.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
      ...opts,
      getNumberAtLength: (hl => hl.elevateNumberAtLength)
    });
  }

  protected computeSpeciesBubbleChart(species: string,
                                      data: SelectivitySpeciesList[],
                                      opts?: {
                                        catchCategories: CatchCategoryType[],
                                        subCategories?: string[];
                                        standardSubCategory?: string;
                                        getSubCategory: Function<any, string>
                                      }): SpeciesChart[] {
    const translations = this.translate.instant([
      'TRIP.REPORT.CHART.TRAWL_SELECTIVITY.STANDARD',
      'TRIP.REPORT.CHART.TRAWL_SELECTIVITY.QUANTITY_IN_STANDARD',
      'TRIP.REPORT.CHART.TRAWL_SELECTIVITY.QUANTITY_IN_SELECTIVE',
      'TRIP.REPORT.DISCARD',
      'TRIP.REPORT.LANDING',
    ]);

    const dataByCatchCategory = collectByProperty(data, 'catchCategory');
    const catchCategories = opts.catchCategories
      ? removeDuplicatesFromArray([...opts.catchCategories, ...Object.keys(dataByCatchCategory)])
      : Object.keys(dataByCatchCategory);

    // Compute sub categories (and store result in meta)
    let subCategories = this.computeSubCategories(data, opts);
    if (subCategories.length !== 2) return []; // Skip

    subCategories = removeDuplicatesFromArray([translations['TRIP.REPORT.CHART.TRAWL_SELECTIVITY.STANDARD'], ...subCategories])

    translations['TRIP.REPORT.CHART.TRAWL_SELECTIVITY.QUANTITY_IN_SELECTIVE'] = this.translate.instant('TRIP.REPORT.CHART.TRAWL_SELECTIVITY.QUANTITY_IN_SELECTIVE', {selectionDevice: subCategories[1]});

    const chart: SpeciesChart = {
      type: 'bubble',
      options: {
        // FIXME
        //aspectRatio: 1,
        title: {
          ...this.defaultTitleOptions,
          text: [
            species,
            this.translate.instant('TRIP.REPORT.CHART.LANDING_AND_DISCARD_COMPARISON')
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
                labelString: translations['TRIP.REPORT.CHART.TRAWL_SELECTIVITY.QUANTITY_IN_SELECTIVE']
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                ...this.scaleLabelDefaultOption,
                labelString: translations['TRIP.REPORT.CHART.TRAWL_SELECTIVITY.QUANTITY_IN_STANDARD']
              }
            }
          ]
        },
        plugins: {
          medianLine: {
            color: Color.get('medium').rgba(this.defaultOpacity),
            orientation: 'b',
            style: 'dashed',
            width: 2
          }
        }
      }
    };

    let max = 0;
    // For each LAN, DIS
    catchCategories.forEach(catchCategory => {
      const label = [species, translations[catchCategory === 'DIS' ? 'TRIP.REPORT.DISCARD' : 'TRIP.REPORT.LANDING']].join(' - ')
      const color = catchCategory !== 'DIS' ? this.landingColor : this.discardColor;
      const dataByStation = collectByProperty(dataByCatchCategory[catchCategory] , 'stationNumber');
      const values = Object.keys(dataByStation).map(station => {
        return dataByStation[station].reduce((res, sl) => {
          const index = subCategories.indexOf(sl.meta.subCategory);
          const weight = sl.weight / 1000; // Convert to kg
          if (index != -1) {
            res[index] += weight;
            max = Math.max(max, weight);
          }
          return res;
        }, new Array(subCategories.length).fill(0));
      });

      ChartJsUtils.pushDataSetOnChart(chart, {
        label,
        backgroundColor: color.rgba(this.defaultOpacity),
        data: ChartJsUtils.computeChartPoints(values)
      });

    });

    // Set max scale
    const scaleMax = Math.ceil(max / 10 + 0.5) * 10;
    chart.options.scales.xAxes[0].ticks = {min: 0, max: scaleMax};
    chart.options.scales.yAxes[0].ticks = {min: 0, max: scaleMax};

    return [chart];
  }

  protected createSpeciesBoxPlot(species,
                                 opts: {
                                   stats: SelectivityTripReportStats
                                   subCategories: string[];
                                   catchCategories: string[];
                                 }): SpeciesChart {
    const weights = opts?.stats.weights;
    const catchCategories = opts?.catchCategories || Object.keys(weights.catchCategories);
    const subCategories = opts?.subCategories || [];
    const speciesData: {[catchCategory: string]: SpeciesWeightStats} = catchCategories.reduce((res, catchCategory) => {
      const catchCategoryStats = weights.catchCategories[catchCategory]?.species?.find(stats => stats.label === species);
      if (catchCategoryStats) {
        Object.keys(catchCategoryStats).forEach(subCategory => {
          if (!subCategories.includes(subCategory)) subCategories.push(subCategory)
        });
        res[catchCategory] = catchCategoryStats;
      }
      return res;
    }, {});
    const landingColors = ChartJsUtilsColor.getDerivativeColor(this.landingColor, Math.max(2, subCategories.length));
    const discardColors = ChartJsUtilsColor.getDerivativeColor(this.discardColor, Math.max(2, subCategories.length));

    const colors = []; // TODO

    // Box plot
    const chart: SpeciesChart = <ChartConfiguration>{
      type: 'boxplot',
      colors: [
        // Color should be specified, in order to works well
        discardColors[0].rgba(this.defaultOpacity),
        discardColors[1].rgba(this.defaultOpacity),
        landingColors[0].rgba(this.defaultOpacity),
        landingColors[1].rgba(this.defaultOpacity),
      ],
      options: {
        title: {
          ...this.defaultTitleOptions,
          text: ['Comparaison des débarquements et rejets', '(sous trait)']
        },
        legend: {
          ...this.legendDefaultOption
        },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                ...this.scaleLabelDefaultOption,
                labelString: 'Fraction'
              }
            }
          ],
          yAxes: [
            {
              scaleLabel: {
                ...this.scaleLabelDefaultOption,
                labelString: 'Poids capturés par OP (kg)'
              }
            }
          ]
        }
      },
      data: {
        labels: ['Débarquement', 'Rejet'],
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

    return chart;
  }

  protected computePrintHref(data: SelectivityExtractionData, stats: SelectivityTripReportStats): string {
    console.debug(`[${this.constructor.name}.computePrintHref]`, arguments);
    if (stats.trips?.length === 1) {
      const baseTripPath = `/trips/${stats.trips[0].id}`;
      return `${baseTripPath}/report/selectivity`;
    }
    // TODO: create a URL with query parameters
  }
}
