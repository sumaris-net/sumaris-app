import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input, QueryList, ViewChild, ViewChildren, } from '@angular/core';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { Pmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { arrayDistinct, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
import { LandingReport } from '@app/trip/landing/report/landing.report';
import { AppDataEntityReport, DataReportStats } from '@app/data/report/data-entity-report.class';
import { LANDING_I18N_PMFM_PREFIX, LANDING_TABLE_DEFAULT_I18N_PREFIX } from '@app/trip/landing/landings.table';
import { AuctionControlReport } from '@app/trip/landing/auction-control/report/auction-control.report';
import { SamplingLandingReport } from '../../landing/sampling/report/sampling-landing.report';
import { LandingStats } from '@app/trip/landing/report/base-landing-report.class';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { ObservedLocationService } from '@app/trip/observedlocation/observed-location.service';
import { LandingService } from '@app/trip/landing/landing.service';
import { lastValueFrom } from 'rxjs';
export class ObservedLocationStats extends DataReportStats {
    fromObject(source) {
        this.vesselCount = source.vesselCount;
        this.pmfms = source.pmfms.map(item => Pmfm.fromObject(item));
        this.landingPmfms = source.landingPmfms.map(item => Pmfm.fromObject(item));
        this.landingEditor = source.landingEditor; // TODO : make it from object
        this.landingI18nPmfmPrefix = source.landingI18nPmfmPrefix;
        this.landingI18nColumnPrefix = source.landingI18nColumnPrefix;
        this.landingShowSampleCount = source.landingShowSampleCount;
        this.landingSamplesPmfms = source.landingSamplesPmfms.map(lv1 => lv1.map(lv2 => Pmfm.fromObject(lv2)));
        this.landingsStats = source.landingsStats.map(s => {
            const stats = new LandingStats();
            stats.fromObject(s);
            return stats;
        });
    }
    asObject(opts) {
        let target = super.asObject(opts);
        // TODO
        target = Object.assign(Object.assign({}, target), { vesselCount: this.vesselCount, pmfms: this.pmfms.map(item => item.asObject()), landingPmfms: this.landingPmfms.map(item => item.asObject()), landingEditor: this.landingEditor, landingI18nPmfmPrefix: this.landingI18nPmfmPrefix, landingI18nColumnPrefix: this.landingI18nColumnPrefix, landingShowSampleCount: this.landingShowSampleCount, landingSamplesPmfms: this.landingSamplesPmfms.map(lv1 => lv1.map(lv2 => lv2.asObject())), 
            // NOTE : can not be sure that landing stats are present at this moment because they are not computed in ObservedLocationReport:computeStats
            //        see ObservedLocationReport:statsAsObject
            landingsStats: this.landingsStats.map(s => s.asObject(opts)) });
        return target;
    }
}
let ObservedLocationReport = class ObservedLocationReport extends AppDataEntityReport {
    constructor(injector) {
        super(injector, ObservedLocation, ObservedLocationStats, { pathIdAttribute: 'observedLocationId' });
        this.logPrefix = 'observed-location-report';
        this.isNotEmptyArray = isNotEmptyArray;
        this.isNotNil = isNotNil;
        this.AuctionControlReport = AuctionControlReport;
        this.SamplingLandingReport = SamplingLandingReport;
        this.LandingReport = LandingReport;
        this.showToolbar = true;
        this.showError = true;
        this.observedLocationService = injector.get(ObservedLocationService);
        this.landingService = injector.get(LandingService);
    }
    loadData(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.log(`[${this.logPrefix}] load data...`);
            const data = yield this.observedLocationService.load(id, { withLanding: true });
            if (!data) {
                throw new Error('ERROR.LOAD_ENTITY_ERROR');
            }
            // Load full landings
            data.landings = yield Promise.all(data.landings.map(landing => this.landingService.load(landing.id)));
            // Inject the parent on all landing // TODO put a copy of the parent that have embeded landing removed
            //                                     Or manage this when we serialize/deserialize the object
            //                                     (we do not want embeded parent parent when we serialise landing)
            data.landings.forEach(landing => landing.observedLocation = data);
            return data;
        });
    }
    dataFromObject(source) {
        const result = ObservedLocation.fromObject(source);
        result.landings.forEach(l => l.observedLocation = result);
        return result;
    }
    dataAsObject(source, opts) {
        const copySource = source.clone();
        // Clean observed location from exported data
        // (this is redundant because observed location is the root of data itself)
        copySource.landings.forEach(l => delete l.observedLocation);
        return copySource.asObject();
    }
    markAsReady() {
        var _a;
        super.markAsReady();
        if (!this.children.length && isNotEmptyArray((_a = this.data) === null || _a === void 0 ? void 0 : _a.landings)) {
            this.cd.detectChanges();
        }
        this.children.map(c => c.markAsReady());
    }
    updateView() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug(`${this.logPrefix}updateView`);
            this.cd.detectChanges();
            yield this.waitIdle({ stop: this.destroySubject });
            this.reveal.initialize();
        });
    }
    statsAsObject(source, opts) {
        // TODO This is not really the place and the moment for push children stats in this stats, try to find a better way to do this
        //      (can not be done in computeStats because children was not available at this moment)
        source.landingsStats = this.children.map(c => c.stats);
        return source.asObject(opts);
    }
    computeTitle(data, stats) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield lastValueFrom(this.translate.get('OBSERVED_LOCATION.REPORT.TITLE', {
                location: data.location.name,
                dateTime: this.dateFormat.transform(data.startDateTime, { time: true }),
            }));
        });
    }
    computeDefaultBackHref(data) {
        return `/observations/${data.id}?tab=1`;
    }
    computeStats(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.log(`[${this.logPrefix}.computeStats]`);
            const stats = (opts === null || opts === void 0 ? void 0 : opts.stats) || new this.statsType();
            stats.program = yield this.programRefService.loadByLabel(data.program.label);
            stats.vesselCount = arrayDistinct(data.landings, 'vesselSnapshot.id').length;
            stats.landingEditor = stats.program.getProperty(ProgramProperties.LANDING_EDITOR);
            // Force landing editor to default for testing
            //this.landingEditor = 'landing'
            stats.landingShowSampleCount = stats.program.getPropertyAsBoolean(ProgramProperties.LANDING_SAMPLES_COUNT_ENABLE);
            stats.pmfms = yield this.programRefService.loadProgramPmfms(stats.program.label, { acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION });
            stats.landingSamplesPmfms = yield this.loadLandingsPmfms(this.data.landings, stats.program);
            stats.landingPmfms = yield this.programRefService.loadProgramPmfms(stats.program.label, { acquisitionLevel: AcquisitionLevelCodes.LANDING });
            stats.landingI18nColumnPrefix = LANDING_TABLE_DEFAULT_I18N_PREFIX;
            stats.landingI18nPmfmPrefix = LANDING_I18N_PMFM_PREFIX;
            return stats;
        });
    }
    computeI18nContext(stats) {
        return Object.assign(Object.assign({}, super.computeI18nContext(stats)), { pmfmPrefix: 'OBSERVED_LOCATION.PMFM.' });
    }
    computeShareBasePath() {
        return 'observations/report';
    }
    loadLandingsPmfms(landings, program) {
        return __awaiter(this, void 0, void 0, function* () {
            const weightDisplayedUnit = yield program.getProperty(ProgramProperties.LANDING_SAMPLE_WEIGHT_UNIT);
            return Promise.all(landings.map((landing) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const taxonGroup = ((_a = (landing.samples || [])
                    .find(s => { var _a; return !!((_a = s.taxonGroup) === null || _a === void 0 ? void 0 : _a.name); })) === null || _a === void 0 ? void 0 : _a.taxonGroup) || {};
                const pmfms = yield this.programRefService.loadProgramPmfms(program.label, {
                    acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
                    taxonGroupId: taxonGroup === null || taxonGroup === void 0 ? void 0 : taxonGroup.id,
                });
                if (weightDisplayedUnit) {
                    PmfmUtils.setWeightUnitConversions(pmfms, weightDisplayedUnit);
                }
                return pmfms;
            })));
        });
    }
    waitIdle(opts) {
        const _super = Object.create(null, {
            waitIdle: { get: () => super.waitIdle }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.waitIdle.call(this, opts);
            // this.cd.detectChanges();
            yield Promise.all(this.children.map(c => {
                console.debug(`[${this.logPrefix}] Waiting for child`);
                return c.waitIdle(opts);
            }));
        });
    }
    isQualitativePmfm(pmfm) {
        var _a;
        return pmfm.isQualitative && ((_a = pmfm.qualitativeValues) === null || _a === void 0 ? void 0 : _a.length) <= 3;
    }
    isNotQualitativePmfm(pmfm) {
        var _a;
        return !pmfm.isQualitative || !((_a = pmfm.qualitativeValues) === null || _a === void 0 ? void 0 : _a.length) || (pmfm.qualitativeValues.length > 3);
    }
    hasSamples(landing) {
        return isNotEmptyArray(landing === null || landing === void 0 ? void 0 : landing.samples);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationReport.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ObservedLocationReport.prototype, "showError", void 0);
__decorate([
    ViewChild(RevealComponent),
    __metadata("design:type", RevealComponent)
], ObservedLocationReport.prototype, "reveal", void 0);
__decorate([
    ViewChildren('landingReport'),
    __metadata("design:type", QueryList)
], ObservedLocationReport.prototype, "children", void 0);
ObservedLocationReport = __decorate([
    Component({
        selector: 'app-observed-location',
        templateUrl: './observed-location.report.html',
        styleUrls: [
            '../../landing/report/landing.report.scss',
            '../../../data/report/base-report.scss',
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector])
], ObservedLocationReport);
export { ObservedLocationReport };
//# sourceMappingURL=observed-location.report.js.map