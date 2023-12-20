import { __awaiter, __decorate, __metadata } from "tslib";
import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { collectByProperty, Color, isEmptyArray, isNilOrBlank, isNotEmptyArray, isNotNil, ReferentialRef, removeDuplicatesFromArray, } from '@sumaris-net/ngx-components';
import { ChartJsUtils, ChartJsUtilsColor } from '@app/shared/chartsjs.utils';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { SelectivityTripReportService } from '@app/trip/trip/report/selectivity/selectivity-trip-report.service';
import { SelectivitySpeciesLength, SelectivitySpeciesList, SelectivityStation, SelectivityTrip, } from '@app/trip/trip/report/selectivity/selectivity-trip-report.model';
import { MathUtils } from '@app/shared/math.utils';
import { environment } from '@environments/environment';
import { BaseTripReport, BaseTripReportStats } from '@app/trip/trip/report/base-trip.report';
export class SelectivityTripReportStats extends BaseTripReportStats {
    fromObject(source) {
        super.fromObject(source);
        this.gearIdentifierByOperationId = source.gearIdentifierByOperationId;
        this.selectivityDeviceMap = source.selectivityDeviceMap;
        this.selectivityDevices = source.selectivityDevices;
        this.seaStates = source.seaStates;
        this.seabedFeatures = source.seabedFeatures;
        this.gearSpeed = source.gearSpeed;
        this.subCategories = source.subCategories;
        this.weights = source.weights;
    }
    asObject(opts) {
        return Object.assign(Object.assign({}, super.asObject(opts)), { gearIdentifierByOperationId: this.gearIdentifierByOperationId, selectivityDeviceMap: this.gearIdentifierByOperationId, selectivityDevices: this.selectivityDevices, seaStates: this.seaStates, seabedFeatures: this.seabedFeatures, gearSpeed: this.gearSpeed, subCategories: this.subCategories, weights: this.weights });
    }
}
let SelectivityTripReport = class SelectivityTripReport extends BaseTripReport {
    constructor(injector, tripReportService) {
        super(injector, tripReportService, SelectivityTripReportStats);
    }
    dataAsObject(source, opts) {
        return Object.assign(Object.assign({}, super.dataAsObject(source, opts)), { FG: source.FG.map(item => item.asObject(opts)) });
    }
    ;
    loadData(filter, opts) {
        return this.tripReportService.loadAll(filter, Object.assign(Object.assign({}, opts), { formatLabel: 'apase', dataTypes: {
                TR: SelectivityTrip,
                HH: SelectivityStation,
                SL: SelectivitySpeciesList,
                HL: SelectivitySpeciesLength,
            }, fetchPolicy: 'no-cache' }));
    }
    computeStats(data, opts) {
        const _super = Object.create(null, {
            computeStats: { get: () => super.computeStats }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const stats = (opts === null || opts === void 0 ? void 0 : opts.stats) || new this.statsType();
            const programLabel = (data.TR || []).map(t => t.project).find(isNotNil);
            stats.program = stats.programLabel && (yield this.programRefService.loadByLabel(stats.programLabel));
            const standardSubCategory = this.translate.instant('TRIP.REPORT.CHART.TRAWL_SELECTIVITY.STANDARD');
            stats.gearSpeed = this.computeNumericStats(data.HH, 'gearSpeed');
            stats.seaStates = this.collectDistinctQualitativeValue(data.HH, 'seaState')
                .map(seaState => {
                // Clean value (e.g.  remove ", vagues de X à Xm")
                const separatorIndex = seaState.indexOf(',');
                if (separatorIndex !== -1)
                    return seaState.substring(0, separatorIndex);
                return seaState;
            });
            stats.seabedFeatures = this.collectDistinctQualitativeValue(data.HH, 'seabedFeatures');
            const gearPmfms = yield this.programRefService.loadProgramPmfms(programLabel, {
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
                    selectiveDevice.name = this.translate.instant('TRIP.REPORT.CHART.TRAWL_SELECTIVITY.SELECTIVE', { label: selectiveDevice.name });
                }
            });
            // Load selectivity devices, by gear or sub gear
            stats.gearIdentifierByOperationId = (data.HH || []).reduce((res, s) => {
                res[s.stationNumber] = s.gearIdentifier;
                return res;
            }, {});
            // Compute sub categories (and store result in meta)
            const getSubCategory = this.createGetSubCategory(stats);
            stats.subCategories = this.computeSubCategories(data.SL, { getSubCategory, firstSubCategory: standardSubCategory });
            stats.weights = this.computeWeightStats(data.SL, { getSubCategory: (sl) => { var _a; return (_a = sl.meta) === null || _a === void 0 ? void 0 : _a.subCategory; }, standardSubCategory });
            return _super.computeStats.call(this, data, Object.assign(Object.assign({}, opts), { stats, getSubCategory }));
        });
    }
    computeSpecies(data, stats, opts) {
        const _super = Object.create(null, {
            computeSpecies: { get: () => super.computeSpecies }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure to have opts.getSubCategory, in shared report
            const getSubCategory = (opts === null || opts === void 0 ? void 0 : opts.getSubCategory) || this.createGetSubCategory(stats);
            return _super.computeSpecies.call(this, data, stats, Object.assign(Object.assign({}, opts), { getSubCategory }));
        });
    }
    computeWeightStats(data, opts) {
        const result = {
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
        const subCategories = this.computeSubCategories(data, opts);
        if (subCategories.length < 2)
            return result; // Skip
        // Split data by species
        const dataBySpecies = collectByProperty(data, 'species');
        // Compute stats on each species
        Object.keys(dataBySpecies).forEach(species => {
            console.debug(`[selectivity-trip-report] Computing stats for species '${species}'...`);
            const speciesStats = {
                LAN: { label: species, total: 0, totalVariation: undefined, avgVariation: undefined, subCategories: {} },
                DIS: { label: species, total: 0, totalVariation: undefined, avgVariation: undefined, subCategories: {} }
            };
            subCategories.forEach(subCategory => {
                speciesStats.LAN.subCategories[subCategory] = { total: 0, stations: {} };
                speciesStats.DIS.subCategories[subCategory] = { total: 0, stations: {} };
            });
            const speciesData = dataBySpecies[species];
            // Compute total weights, by catch categories and sub categories
            speciesData.forEach(sl => {
                const catchCategoryStats = speciesStats[sl.catchCategory];
                const weight = (sl.weight || 0) / 1000; // Convert to kg
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
            });
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
        });
        return result;
    }
    computeWeightTotalVariation(weights, standardSubCategory) {
        weights.totalVariation = this.computeWeightVariation(weights, standardSubCategory, stats => stats.total);
    }
    computeWeightAvgVariation(catchCategory, weights, standardSubCategory) {
        // Collect all station keys, found on every sub category
        const stationKeys = Object.keys(weights.subCategories).reduce((res, subCategory) => Object.keys(weights.subCategories[subCategory].stations).reduce((res, stationKey) => res.includes(stationKey) ? res : res.concat(stationKey), res), []);
        const stationVariations = stationKeys.map(stationKey => this.computeWeightVariation(weights, standardSubCategory, stats => stats.stations[stationKey]))
            .filter(isNotNil); // Exclude when standard = 0
        if (isNotEmptyArray(stationVariations)) {
            console.debug(`[selectivity-trip-report] Weight variations by station for {${catchCategory} - ${weights.label}}: `, stationVariations);
            weights.avgVariation = MathUtils.averageWithDetails(stationVariations);
        }
    }
    /**
     * Calcul le taux de variation, suivant la formule : (<poids_espèce_chalut_selectif> - <poids_espèce_chalut_standard>) / <poids_espèce_chalut_standard>
     *
     * @param weights
     * @param standardSubCategory libellé de correspond au chalut standard.
     * @param weightGetter function pour lire le poids.
     * @protected
     */
    computeWeightVariation(weights, standardSubCategory, weightGetter) {
        const selective = Object.keys(weights.subCategories)
            .filter(sc => sc !== standardSubCategory).reduce((sum, subCategory) => sum + (weightGetter(weights.subCategories[subCategory]) || 0), 0);
        const standard = (weightGetter(weights.subCategories[standardSubCategory]) || 0);
        if (standard > 0) {
            return ((selective - standard) / standard) * 100;
        }
        return undefined;
    }
    /**
     * Extract selectivity devices, by gear or sub gear
     *
     * @param trip
     * @param gearPmfms
     * @protected
     */
    computeSelectivityDevices(data, gearPmfms) {
        const selectivityDevicePmfmIds = (gearPmfms || []).filter(PmfmUtils.isSelectivityDevice);
        if (isEmptyArray(selectivityDevicePmfmIds))
            return {};
        const getSelectivityDevice = (gear) => {
            const value = gear.selectionDevice;
            if (isNilOrBlank(value))
                return undefined;
            const parts = value.split(' - ', 2);
            return gear.selectionDevice && ReferentialRef.fromObject({ label: parts[0], name: parts[1] }); //selectiveDevice;
        };
        return (data.FG || []).reduce((res, gear) => {
            const selectionDevice = getSelectivityDevice(gear);
            if (selectionDevice) {
                const gearKey = isNotNil(gear.subGearIdentifier) ? `${gear.gearIdentifier}|${gear.subGearIdentifier}` : `${gear.gearIdentifier}`;
                res[gearKey] = selectionDevice;
            }
            return res;
        }, {});
    }
    computeSpeciesCharts(species, data, opts) {
        const _super = Object.create(null, {
            computeSpeciesCharts: { get: () => super.computeSpeciesCharts }
        });
        return __awaiter(this, void 0, void 0, function* () {
            let charts = yield _super.computeSpeciesCharts.call(this, species, data, opts);
            // Add bubble charts, by category (= selective device)
            if (opts === null || opts === void 0 ? void 0 : opts.getSubCategory) {
                // Add bubble charts, by category (= selective device)
                const bubbleCharts = this.computeSpeciesBubbleChart(species, data.SL, {
                    subCategories: opts.stats.subCategories,
                    getSubCategory: opts.getSubCategory,
                    catchCategories: ['LAN', 'DIS']
                });
                if (isNotEmptyArray(bubbleCharts))
                    charts = charts.concat(...bubbleCharts);
                // Add boxplot chart
                if (opts.stats.weights) {
                    // TODO finish this feature, then enable
                    if (!environment.production) {
                        /*const boxPlotChart = this.createSpeciesBoxPlot(species, {
                          stats: opts.stats,
                          subCategories: this.stats.subCategories,
                          catchCategories: ['LAN', 'DIS']
                        });
                        if (boxPlotChart) charts.push(boxPlotChart);
                        */
                    }
                }
            }
            return charts;
        });
    }
    computeSpeciesLengthBarChart(species, data, lengthPmfm, opts) {
        return super.computeSpeciesLengthBarChart(species, data, lengthPmfm, Object.assign(Object.assign({}, opts), { getNumberAtLength: (hl => hl.elevatedNumberAtLength) }));
    }
    computeSpeciesBubbleChart(species, data, opts) {
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
        if (subCategories.length !== 2)
            return []; // Skip
        subCategories = removeDuplicatesFromArray([translations['TRIP.REPORT.CHART.TRAWL_SELECTIVITY.STANDARD'], ...subCategories]);
        translations['TRIP.REPORT.CHART.TRAWL_SELECTIVITY.QUANTITY_IN_SELECTIVE'] = this.translate.instant('TRIP.REPORT.CHART.TRAWL_SELECTIVITY.QUANTITY_IN_SELECTIVE', { selectionDevice: subCategories[1] });
        const chart = {
            type: 'bubble',
            data: {
                datasets: [],
                labels: []
            },
            options: Object.assign(Object.assign({}, this.defaultOptions), { plugins: Object.assign(Object.assign({}, this.defaultOptions.plugins), { title: Object.assign(Object.assign({}, this.defaultOptions.plugins.title), { text: [
                            species,
                            this.translate.instant('TRIP.REPORT.CHART.LANDING_AND_DISCARD_COMPARISON')
                        ] }), medianLine: {
                        color: Color.get('medium').rgba(this.defaultOpacity),
                        orientation: 'b',
                        style: 'dashed',
                        width: 2
                    } }), scales: {
                    x: {
                        scaleLabel: Object.assign(Object.assign({}, this.scaleLabelDefaultOption), { labelString: translations['TRIP.REPORT.CHART.TRAWL_SELECTIVITY.QUANTITY_IN_SELECTIVE'] })
                    },
                    y: {
                        scaleLabel: Object.assign(Object.assign({}, this.scaleLabelDefaultOption), { labelString: translations['TRIP.REPORT.CHART.TRAWL_SELECTIVITY.QUANTITY_IN_STANDARD'] })
                    }
                } })
        };
        let max = 0;
        // For each LAN, DIS
        catchCategories.forEach(catchCategory => {
            const label = [species, translations[catchCategory === 'DIS' ? 'TRIP.REPORT.DISCARD' : 'TRIP.REPORT.LANDING']].join(' - ');
            const color = catchCategory !== 'DIS' ? this.landingColor : this.discardColor;
            const dataByStation = collectByProperty(dataByCatchCategory[catchCategory], 'stationNumber');
            const values = Object.keys(dataByStation).map(station => dataByStation[station].reduce((res, sl) => {
                const index = subCategories.indexOf(sl.meta.subCategory);
                const weight = sl.weight / 1000; // Convert to kg
                if (index !== -1) {
                    res[index] += weight;
                    max = Math.max(max, weight);
                }
                return res;
            }, new Array(subCategories.length).fill(0)));
            ChartJsUtils.pushDataSet(chart, {
                label,
                backgroundColor: color.rgba(this.defaultOpacity),
                data: ChartJsUtils.computeChartPoints(values)
            });
        });
        // Set max scale
        const scaleMax = Math.ceil(max / 10 + 0.5) * 10;
        chart.options.scales.x = Object.assign(Object.assign({}, chart.options.scales.x), { min: 0, max: scaleMax });
        chart.options.scales.y = Object.assign(Object.assign({}, chart.options.scales.y), { min: 0, max: scaleMax });
        return [chart];
    }
    createSpeciesBoxPlot(species, opts) {
        const weights = opts === null || opts === void 0 ? void 0 : opts.stats.weights;
        const catchCategories = (opts === null || opts === void 0 ? void 0 : opts.catchCategories) || Object.keys(weights.catchCategories);
        const subCategories = (opts === null || opts === void 0 ? void 0 : opts.subCategories) || [];
        const speciesData = catchCategories.reduce((res, catchCategory) => {
            var _a, _b;
            const catchCategoryStats = (_b = (_a = weights.catchCategories[catchCategory]) === null || _a === void 0 ? void 0 : _a.species) === null || _b === void 0 ? void 0 : _b.find(stats => stats.label === species);
            if (catchCategoryStats) {
                Object.keys(catchCategoryStats).forEach(subCategory => {
                    if (!subCategories.includes(subCategory))
                        subCategories.push(subCategory);
                });
                res[catchCategory] = catchCategoryStats;
            }
            return res;
        }, {});
        const landingColors = ChartJsUtilsColor.getDerivativeColor(this.landingColor, Math.max(2, subCategories.length));
        const discardColors = ChartJsUtilsColor.getDerivativeColor(this.discardColor, Math.max(2, subCategories.length));
        const colors = []; // TODO
        // Box plot
        const chart = {
            type: 'boxplot',
            // colors: [
            //   // Color should be specified, in order to works well
            //   discardColors[0].rgba(this.defaultOpacity),
            //   discardColors[1].rgba(this.defaultOpacity),
            //   landingColors[0].rgba(this.defaultOpacity),
            //   landingColors[1].rgba(this.defaultOpacity),
            // ],
            options: Object.assign(Object.assign({}, this.defaultOptions), { plugins: Object.assign(Object.assign({}, this.defaultOptions.plugins), { title: Object.assign(Object.assign({}, this.defaultOptions.plugins.title), { text: ['Comparaison des débarquements et rejets', '(sous trait)'] }) }), scales: {
                    x: {
                        scaleLabel: Object.assign(Object.assign({}, this.scaleLabelDefaultOption), { labelString: 'Fraction' })
                    },
                    y: {
                        scaleLabel: Object.assign(Object.assign({}, this.scaleLabelDefaultOption), { labelString: 'Poids capturés par OP (kg)' })
                    }
                } }),
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
                            [1000, 2000, 3000, 1000, 2000, 3000, 5000]
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
                            [1000, 2000, 3000, 1000, 2000, 3000, 5000]
                        ]
                    }
                ]
            }
        };
        return chart;
    }
    createGetSubCategory(stats) {
        return (sl) => {
            const gearRankOrder = stats.gearIdentifierByOperationId[+sl.stationNumber];
            const gearKey = isNotNil(sl.subGearIdentifier) ? `${gearRankOrder}|${sl.subGearIdentifier}` : `${gearRankOrder}`;
            const selectiveDevice = stats.selectivityDeviceMap[gearKey];
            return selectiveDevice && selectiveDevice.name;
        };
    }
    computeShareBasePath() {
        return 'trips/report/selectivity';
    }
};
SelectivityTripReport = __decorate([
    Component({
        selector: 'app-selectivity-trip-report',
        templateUrl: './selectivity-trip.report.html',
        styleUrls: [
            '../trip.report.scss',
            './selectivity-trip.report.scss',
            '../../../../data/report/base-report.scss',
        ],
        providers: [
            { provide: TripReportService, useClass: SelectivityTripReportService }
        ],
        encapsulation: ViewEncapsulation.None
    }),
    __metadata("design:paramtypes", [Injector,
        TripReportService])
], SelectivityTripReport);
export { SelectivityTripReport };
//# sourceMappingURL=selectivity-trip.report.js.map