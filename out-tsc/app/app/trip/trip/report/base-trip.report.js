import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Directive, Injector, Optional, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { arrayDistinct, collectByProperty, Color, DateUtils, firstTruePromise, fromDateISOString, getProperty, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, isNotNilOrNaN, removeDuplicatesFromArray, sleep, toDateISOString, waitFor, } from '@sumaris-net/ngx-components';
import { BehaviorSubject } from 'rxjs';
import { ChartJsUtils, ChartJsUtilsColor } from '@app/shared/chartsjs.utils';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { collectByFunction } from '@app/shared/functions';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
import { ExtractionFilter, ExtractionType } from '@app/extraction/type/extraction-type.model';
import { AppExtractionReport, ExtractionReportStats } from '@app/data/report/extraction-report.class';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Operation, Trip } from '@app/trip/trip/trip.model';
import { TripService } from '@app/trip/trip/trip.service';
export class BaseTripReportStats extends ExtractionReportStats {
    fromObject(source) {
        var _a, _b, _c;
        super.fromObject(source);
        this.programLabel = source.programLabel;
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.trips = ((_a = source.trips) === null || _a === void 0 ? void 0 : _a.map(Trip.fromObject)) || [];
        this.operations = ((_b = source.operations) === null || _b === void 0 ? void 0 : _b.map(Operation.fromObject)) || [];
        this.vesselSnapshots = ((_c = source.vesselSnapshots) === null || _c === void 0 ? void 0 : _c.map(VesselSnapshot.fromObject)) || [];
        this.vesselLength = source.vesselLength;
        // Do not compute species here, they are re-computed whit TripReport.computeSpecies
    }
    asObject(opts) {
        var _a, _b;
        const target = super.asObject(opts);
        return Object.assign(Object.assign({}, target), { programLabel: this.programLabel, startDate: toDateISOString(this.startDate), endDate: toDateISOString(this.endDate), trips: this.trips.map(item => item.asObject(opts)), operations: (_a = this.operations) === null || _a === void 0 ? void 0 : _a.map(item => item.asObject(opts)), vesselSnapshots: (_b = this.vesselSnapshots) === null || _b === void 0 ? void 0 : _b.map(item => item.asObject(opts)), vesselLength: this.vesselLength });
    }
}
let BaseTripReport = class BaseTripReport extends AppExtractionReport {
    constructor(injector, tripReportService, statsType) {
        super(injector, null, statsType || BaseTripReportStats);
        this.logPrefix = 'base-trip-report ';
        this.defaultOptions = {
            responsive: true,
            animation: false,
            plugins: {
                title: {
                    display: true,
                    font: {
                        size: 26
                    },
                    color: Color.get('secondary').rgba(1)
                },
                legend: {
                    position: 'right' // or 'right'
                }
            }
        };
        this.scaleLabelDefaultOption = {
            display: true,
            font: {
                size: 18,
                weight: 'bold'
            }
        };
        this.defaultOpacity = 0.8;
        this.landingColor = Color.get('tertiary');
        this.discardColor = Color.get('danger');
        this.mapReadySubject = new BehaviorSubject(false);
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
    loadFromRoute(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = this.getIdFromPathIdAttribute(this._pathIdAttribute);
            if (isNotNil(id)) {
                const trip = yield this.tripService.load(id, { withOperation: false });
                // Load report data
                this.filter = ExtractionUtils.createTripFilter(trip.program.label, [trip.id]);
            }
            else {
                const { label, category, q } = this.route.snapshot.queryParams;
                this.type = ExtractionType.fromObject({ label, category });
                const criteria = q && ExtractionUtils.parseCriteriaFromString(q);
                if (isNotEmptyArray(criteria)) {
                    this.filter = ExtractionFilter.fromObject({ criteria });
                }
            }
            if (!this.filter || this.filter.isEmpty())
                throw { message: 'ERROR.LOAD_DATA_ERROR' };
            return this.load(this.filter, Object.assign(Object.assign({}, opts), { type: this.type }));
        });
    }
    load(filter, opts) {
        return __awaiter(this, arguments, void 0, function* () {
            if (this.debug)
                console.debug(`[${this.logPrefix}] load`, arguments);
            // Load data
            return this.loadData(filter, opts);
        });
    }
    loadData(filter, opts) {
        var _a;
        return this.tripReportService.loadAll(filter, Object.assign(Object.assign({}, opts), { formatLabel: (_a = opts.type) === null || _a === void 0 ? void 0 : _a.label, fetchPolicy: 'no-cache' }));
    }
    loadFromClipboard(clipboard, opts) {
        const _super = Object.create(null, {
            loadFromClipboard: { get: () => super.loadFromClipboard }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const consumed = yield _super.loadFromClipboard.call(this, clipboard, false);
            // TODO Re-compute stats.species
            if (isNotNil(this.stats)) {
                this.stats.species = yield this.computeSpecies(this.data, this.stats, opts);
            }
            return consumed;
        });
    }
    computeStats(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = (opts === null || opts === void 0 ? void 0 : opts.stats) || new this.statsType();
            // Fill trips and operatsions
            stats.trips = (data.TR || []).map(tr => tr.asTrip());
            stats.operations = (data.HH || []).map(s => s.asOperation());
            stats.programLabel = stats.trips.map(t => { var _a; return (_a = t.program) === null || _a === void 0 ? void 0 : _a.label; }).find(isNotNil);
            stats.program = stats.programLabel && (yield this.programRefService.loadByLabel(stats.programLabel));
            stats.vesselSnapshots = yield this.computeVesselSnapshots(data.TR);
            // Compute startDate (from trips or from operations)
            stats.startDate = stats.trips.reduce((date, t) => { var _a; return DateUtils.min(date, ((_a = t.departureDateTime) === null || _a === void 0 ? void 0 : _a.isValid()) && t.departureDateTime); }, undefined);
            if (!stats.startDate || !stats.startDate.isValid()) {
                stats.startDate = stats.operations.reduce((date, o) => { var _a; return DateUtils.min(date, ((_a = o.startDateTime) === null || _a === void 0 ? void 0 : _a.isValid()) && o.startDateTime); }, undefined);
            }
            // Compute endDate (from trips or from operations)
            stats.endDate = stats.trips.reduce((date, t) => { var _a; return DateUtils.max(date, ((_a = t.returnDateTime) === null || _a === void 0 ? void 0 : _a.isValid()) && t.returnDateTime); }, undefined);
            if (!stats.endDate || !stats.endDate.isValid()) {
                stats.endDate = stats.operations.reduce((date, o) => { var _a; return DateUtils.max(date, ((_a = o.endDateTime) === null || _a === void 0 ? void 0 : _a.isValid()) && o.endDateTime); }, undefined);
            }
            stats.vesselLength = this.computeNumericStats(data.TR, 'vesselLength');
            stats.species = yield this.computeSpecies(data, stats, opts);
            return stats;
        });
    }
    computeShareBasePath() {
        return 'trips/report';
    }
    computeSpecies(data, stats, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Split SL and HL by species
            const slMap = collectByProperty(data.SL, 'species');
            const hlMap = collectByProperty(data.HL, 'species');
            // For each species (found in SL, because HL is not always filled)
            const speciesNames = Object.keys(slMap);
            return (yield Promise.all(speciesNames.map((species) => __awaiter(this, void 0, void 0, function* () {
                const speciesData = Object.assign(Object.assign({}, data), { SL: slMap[species], HL: hlMap[species] });
                const speciesOpts = Object.assign(Object.assign({ getSubCategory: undefined }, opts), { stats });
                const charts = yield this.computeSpeciesCharts(species, speciesData, speciesOpts);
                if (isNotEmptyArray(charts)) {
                    return { label: species, charts };
                }
            })))).filter(isNotNil);
        });
    }
    computeVesselSnapshots(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const vesselIds = removeDuplicatesFromArray((data || []).map(tr => tr.vesselIdentifier));
            return yield Promise.all(vesselIds.map(id => this.vesselSnapshotService.load(id, { fetchPolicy: 'cache-first' })));
        });
    }
    computeSpeciesCharts(species, data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.computeSpeciesLengthCharts(species, data.HL, opts);
        });
    }
    computeSpeciesLengthCharts(species, data, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(data) || !((_a = opts === null || opts === void 0 ? void 0 : opts.stats) === null || _a === void 0 ? void 0 : _a.programLabel))
                return [];
            // Load individual batch pmfms
            const lengthPmfms = (yield this.programRefService.loadProgramPmfms(opts.stats.programLabel, {
                acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL
            })).filter(PmfmUtils.isLength);
            // Get data
            const taxonGroupId = (data || []).map(hl => hl.taxonGroupId).find(isNotNil);
            // Get sub categories
            const subCategories = opts.getSubCategory && this.computeSubCategories(data, opts);
            // Create landing/discard colors for each sub categories
            const landingColors = ChartJsUtilsColor.getDerivativeColor(this.landingColor, Math.max(2, (subCategories === null || subCategories === void 0 ? void 0 : subCategories.length) || 0));
            const discardColors = ChartJsUtilsColor.getDerivativeColor(this.discardColor, Math.max(2, (subCategories === null || subCategories === void 0 ? void 0 : subCategories.length) || 0));
            // Search the right length pmfms
            const lengthPmfm = (lengthPmfms || []).find(p => isNil(taxonGroupId) || isEmptyArray(p.taxonGroupIds) || p.taxonGroupIds.includes(taxonGroupId));
            const threshold = undefined; // TODO load threshold by species
            const charts = [];
            // Total catch
            {
                const catchChart = this.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
                    subtitle: this.translate.instant('TRIP.REPORT.CHART.TOTAL_CATCH'),
                    threshold,
                    catchCategories: ['LAN', 'DIS'],
                    catchCategoryColors: [landingColors, discardColors],
                    subCategories,
                    getSubCategory: opts === null || opts === void 0 ? void 0 : opts.getSubCategory
                });
                if (catchChart)
                    charts.push(catchChart);
            }
            // Landing
            {
                const landingChart = this.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
                    subtitle: this.translate.instant('TRIP.REPORT.LANDING'),
                    filter: (sl) => sl.catchCategory === 'LAN',
                    catchCategoryColors: [landingColors],
                    subCategories,
                    getSubCategory: opts === null || opts === void 0 ? void 0 : opts.getSubCategory
                });
                if (landingChart)
                    charts.push(landingChart);
            }
            // Discard
            {
                const discardFilter = (sl) => sl.catchCategory === 'DIS';
                const discardChart = this.computeSpeciesLengthBarChart(species, data, lengthPmfm, {
                    subtitle: this.translate.instant('TRIP.REPORT.DISCARD'),
                    filter: discardFilter,
                    catchCategoryColors: [discardColors],
                    subCategories,
                    getSubCategory: opts === null || opts === void 0 ? void 0 : opts.getSubCategory
                });
                if (discardChart)
                    charts.push(discardChart);
            }
            return charts;
        });
    }
    computeSpeciesLengthBarChart(species, data, lengthPmfm, opts) {
        const pmfmName = lengthPmfm && this.pmfmNamePipe.transform(lengthPmfm, { withUnit: true, html: false })
            || this.translate.instant('TRIP.REPORT.CHART.LENGTH');
        const unitConversion = (lengthPmfm === null || lengthPmfm === void 0 ? void 0 : lengthPmfm.unitLabel) === 'cm' ? 0.1 : 1;
        // Filter data
        if (opts === null || opts === void 0 ? void 0 : opts.filter)
            data = data.filter(opts.filter);
        // if no data: skip
        if (isEmptyArray(data))
            return null;
        const translations = this.translate.instant([
            'TRIP.REPORT.CHART.SPECIES_LENGTH',
            'TRIP.REPORT.CHART.TOTAL_CATCH',
            'TRIP.REPORT.DISCARD',
            'TRIP.REPORT.LANDING',
        ]);
        const chart = {
            type: 'bar',
            data: {
                datasets: [],
                labels: []
            },
            options: Object.assign(Object.assign({}, this.defaultOptions), { plugins: Object.assign(Object.assign({}, this.defaultOptions.plugins), { title: Object.assign(Object.assign({}, this.defaultOptions.plugins.title), { text: [
                            species,
                            [translations['TRIP.REPORT.CHART.SPECIES_LENGTH'], opts === null || opts === void 0 ? void 0 : opts.subtitle].filter(isNotNilOrNaN).join(' - ')
                        ] }), thresholdLine: ((opts === null || opts === void 0 ? void 0 : opts.threshold) > 0) && {
                        color: Color.get('red').rgba(this.defaultOpacity),
                        style: 'dashed',
                        width: opts.threshold,
                        value: opts.threshold,
                        orientation: 'x'
                    }, labels: {
                        render(args) {
                            const lines = args.text.split('\n');
                            const fontSize = args.index === 0 ? 18 : 14;
                            const lineHeight = args.index === 0 ? 1.2 : 1.5;
                            return lines
                                .map((line) => `<div style="font-size: ${fontSize}px; line-height: ${lineHeight}">${line}</div>`)
                                .join('');
                        }
                    } }), scales: {
                    x: {
                        stacked: true,
                        title: Object.assign(Object.assign({}, this.scaleLabelDefaultOption), { text: pmfmName })
                    },
                    y: {
                        stacked: true,
                        title: Object.assign(Object.assign({}, this.scaleLabelDefaultOption), { text: this.translate.instant('TRIP.REPORT.CHART.INDIVIDUAL_COUNT') })
                    }
                } })
        };
        // FInd min/max (and check if can used elevatedNumberAtLength)
        let min = 99999;
        let max = 0;
        let hasElevatedNumberAtLength = true;
        data.forEach(sl => {
            const length = sl.lengthClass * unitConversion;
            min = Math.min(min, length);
            max = Math.max(max, length);
            if (hasElevatedNumberAtLength && isNil(sl.elevatedNumberAtLength))
                hasElevatedNumberAtLength = false;
        });
        // Add labels
        const labelCount = Math.max(1, Math.abs(max - min) + 1);
        const xAxisLabels = new Array(labelCount)
            .fill(Math.min(min, max))
            .map((v, index) => (v + index).toString());
        ChartJsUtils.pushLabels(chart, xAxisLabels);
        if (!hasElevatedNumberAtLength) {
            console.warn(`[${this.constructor.name}] Cannot used elevatedNumberAtLength, for species '${species}'`);
        }
        const getNumberAtLength = (opts === null || opts === void 0 ? void 0 : opts.getNumberAtLength)
            || (hasElevatedNumberAtLength && ((hl) => hl.elevatedNumberAtLength))
            || ((hl) => hl.numberAtLength);
        const createCatchCategorySeries = (data, seriesIndex = 0, subCategory) => {
            const dataByCatchCategory = collectByProperty(data, 'catchCategory');
            // For each LAN, DIS
            const catchCategories = (opts === null || opts === void 0 ? void 0 : opts.catchCategories) || Object.keys(dataByCatchCategory);
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
                ChartJsUtils.pushDataSet(chart, {
                    label,
                    backgroundColor: color.rgba(this.defaultOpacity),
                    stack: `${seriesIndex}`,
                    data
                });
            });
        };
        if (opts.getSubCategory) {
            const dataBySubCategory = collectByFunction(data, opts.getSubCategory);
            const subCategories = removeDuplicatesFromArray([...opts === null || opts === void 0 ? void 0 : opts.subCategories, ...Object.keys(dataBySubCategory)]);
            if (isNotEmptyArray(subCategories)) {
                console.warn(`[${this.constructor.name}] No sub categories found for species '${species}'`);
                subCategories.forEach((subCategory, index) => {
                    createCatchCategorySeries(dataBySubCategory[subCategory], index, subCategory);
                });
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
    computeSubCategories(data, opts) {
        if (isNotEmptyArray(opts === null || opts === void 0 ? void 0 : opts.subCategories))
            return opts.subCategories; // Skip if already computed
        // Compute sub category, in meta
        opts.subCategories = [];
        const getSubCategory = opts.getSubCategory;
        data.forEach(sl => {
            sl.meta = sl.meta || {};
            sl.meta.subCategory = sl.meta.subCategory || getSubCategory(sl);
            // Append to list
            if (sl.meta.subCategory && !opts.subCategories.includes(sl.meta.subCategory))
                opts.subCategories.push(sl.meta.subCategory);
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
    updateView() {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(`[${this.constructor.name}.updateView]`);
            this.cd.detectChanges();
            yield waitFor(() => !!this.reveal);
            yield this.reveal.initialize();
            if (this.reveal.printing) {
                yield sleep(500);
                yield this.showMap();
                yield sleep(500);
                yield this.reveal.print();
            }
        });
    }
    showMap() {
        return __awaiter(this, void 0, void 0, function* () {
            this.mapContainer.createEmbeddedView(this.mapTemplate);
            yield firstTruePromise(this.mapReadySubject);
        });
    }
    computeDefaultBackHref(data, stats) {
        var _a;
        if (((_a = stats.trips) === null || _a === void 0 ? void 0 : _a.length) === 1) {
            const baseTripPath = `/trips/${stats.trips[0].id}`;
            return `${baseTripPath}?tab=1`;
        }
        // Back to extraction
        else {
            const queryString = Object.entries(this.route.snapshot.queryParams || {})
                .map(([key, value]) => `${key}=${value}`).join('&');
            return `/extraction/data?${queryString}`;
        }
    }
    computeTitle(data, stats) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (((_a = stats.vesselSnapshots) === null || _a === void 0 ? void 0 : _a.length) === 1 && ((_b = stats.startDate) === null || _b === void 0 ? void 0 : _b.isValid())) {
                return this.translate.instant('TRIP.REPORT.TITLE', {
                    departureDate: this.dateFormat.transform(stats.startDate, { time: false }),
                    vessel: stats.vesselSnapshots[0].exteriorMarking
                });
            }
            return this.translate.instant('TRIP.REPORT.TITLE_SLIDE');
        });
    }
    collectDistinctStringPropertyValues(data, propertyName) {
        return arrayDistinct(data.map(v => getProperty(v, propertyName)).filter(v => typeof v === 'string'));
    }
    collectNumericPropertyValues(data, propertyName) {
        return data.map(v => +getProperty(v, propertyName))
            .filter(isNotNilOrNaN);
    }
    computeNumericStats(data, propertyName) {
        const values = this.collectNumericPropertyValues(data, propertyName);
        if (isEmptyArray(values))
            return undefined; // SKip if cannot compute min/max/avg
        return {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length
        };
    }
    collectDistinctQualitativeValue(data, propertyName) {
        return this.collectDistinctStringPropertyValues(data, propertyName)
            .map(value => value.indexOf(' - ') !== -1 ? value.split(' - ')[1] : value);
    }
    dataAsObject(source, opts) {
        return {
            TR: source.TR.map(item => item.asObject(opts)),
            HH: source.HH.map(item => item.asObject(opts)),
            SL: source.SL.map(item => item.asObject(opts)),
            HL: source.HL.map(item => item.asObject(opts)),
        };
    }
    ;
    isNotEmptySpecies(species) {
        return isNotEmptyArray(species === null || species === void 0 ? void 0 : species.charts);
    }
};
__decorate([
    ViewChild('mapContainer', { read: ViewContainerRef }),
    __metadata("design:type", Object)
], BaseTripReport.prototype, "mapContainer", void 0);
__decorate([
    ViewChild('mapTemplate'),
    __metadata("design:type", TemplateRef)
], BaseTripReport.prototype, "mapTemplate", void 0);
BaseTripReport = __decorate([
    Directive(),
    __param(2, Optional()),
    __metadata("design:paramtypes", [Injector,
        TripReportService, Function])
], BaseTripReport);
export { BaseTripReport };
//# sourceMappingURL=base-trip.report.js.map