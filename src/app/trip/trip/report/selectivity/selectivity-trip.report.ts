import { Component, Inject, Injector, ViewEncapsulation } from '@angular/core';
import { Trip } from '@app/trip/services/model/trip.model';
import { arrayDistinct, collectByProperty, Color, IReferentialRef, isEmptyArray, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
import { ChartJsUtils, ChartJsUtilsColor } from '@app/shared/chartsjs.utils';
import { DOCUMENT } from '@angular/common';
import '@sgratzl/chartjs-chart-boxplot/build/Chart.BoxPlot.js';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { Function } from '@app/shared/functions';
import { CatchCategoryType } from '@app/trip/trip/report/trip-report.model';
import { SelectivityReportData, SelectivityTripReportService } from '@app/trip/trip/report/selectivity/selectivity-trip-report.service';
import { BaseNumericStats, SpeciesChart, TripReport, TripReportStats } from '@app/trip/trip/report/trip.report';
import { SelectivitySpeciesLength, SelectivitySpeciesList, SelectivityStation } from '@app/trip/trip/report/selectivity/selectivity-trip-report.model';


export declare interface SelectivityTripReportStats extends TripReportStats {
  gearIdentifierByOperationId: {[key: string]: PhysicalGear};
  selectivityDeviceMap: {[key: string]: IReferentialRef};
  selectivityDevices: string[];
  seaStates: string[];
  seabedFeatures: string[];
  gearSpeed: BaseNumericStats;
};

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
export class SelectivityTripReport extends TripReport<SelectivityReportData, SelectivityTripReportStats> {

  constructor(injector: Injector,
              tripReportService: TripReportService<SelectivityReportData>,
              @Inject(DOCUMENT) document: Document) {
    super(injector, tripReportService, document);
  }

  protected loadReportData(trip: Trip,
                                 opts?: {
                                    cache?: boolean
                                  }): Promise<SelectivityReportData> {
    return this.tripReportService.loadData({
      program: trip.program,
      includedIds: [trip.id]
    }, {
      ...opts,
      formatLabel: 'apase',
      dataTypes: {
        HH: SelectivityStation,
        SL: SelectivitySpeciesList,
        HL: SelectivitySpeciesLength,
      },
      fetchPolicy: 'no-cache'
    });
  }


  protected async computeStats(trip: Trip, data: SelectivityReportData, opts?: { cache?: boolean; }): Promise<SelectivityTripReportStats> {
    let stats = <SelectivityTripReportStats>{};

    stats.gearSpeed = this.computeNumericStats(data.HH, 'gearSpeed');
    stats.seaStates = this.collectDistinctQualitativeValue(data.HH, 'seaState');
    stats.seabedFeatures = this.collectDistinctQualitativeValue(data.HH, 'seabedFeatures');

    const gearPmfms = await this.programRefService.loadProgramPmfms(trip.program.label, {
      acquisitionLevels: [AcquisitionLevelCodes.PHYSICAL_GEAR, AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR]
    });
    stats.selectivityDeviceMap = this.computeSelectivityDevices(trip, gearPmfms);
    stats.selectivityDevices = arrayDistinct(Object.values(stats.selectivityDeviceMap).filter(r => r.label !== 'NA').map(r => r.name));
    // Translate
    Object.values(stats.selectivityDeviceMap)
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

    return {
      ...(await super.computeStats(trip, data, {...opts, getSubCategory})),
      ...stats
    };
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


  protected async computeSpeciesCharts(trip: Trip,
                                       species: string,
                                       data: SelectivityReportData,
                                       opts?: {
                                         getSubCategory?: Function<any, string>
                                       }
  ): Promise<SpeciesChart[]> {

    const baseCharts = await super.computeSpeciesCharts(trip, species, data, opts);

    // Add bubble charts, by category (= selective device)
    if (opts?.getSubCategory) {
      const selectivityCharts: SpeciesChart[] = this.computeSpeciesBubbleChart(species, data.SL, {
          getSubCategory: opts.getSubCategory,
          catchCategories: ['LAN', 'DIS']
      });
      return [
        ...baseCharts,
        ...selectivityCharts
      ];
    }

    return baseCharts;
  }

  protected computeSpeciesBubbleChart(species: string,
                                      data: SelectivitySpeciesList[],
                                      opts?: {
                                        catchCategories: CatchCategoryType[],
                                        subCategories?: string[];
                                        getSubCategory: Function<any, string>
                                      }): SpeciesChart[] {
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

    const chart: SpeciesChart = {
      type: 'bubble',
      options: {
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
            color: Color.get('medium').rgba(this.defaultOpacity),
            orientation: 'b',
            style: 'dashed',
            width: 2
          }
        }
      }
    };

    // For each LAN, DIS
    catchCategories.forEach(catchCategory => {
      const label = [species, translations[catchCategory === 'DIS' ? 'TRIP.REPORT.CHART.DISCARD' : 'TRIP.REPORT.CHART.LANDING']].join(' - ')
      const color = catchCategory !== 'DIS' ? this.landingColor : this.discardColor;
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
