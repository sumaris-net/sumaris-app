import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { BaseLandingReport, LandingStats } from '@app/trip/landing/report/base-landing-report.class';
import { lastValueFrom } from 'rxjs';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
let SamplingLandingReport = class SamplingLandingReport extends BaseLandingReport {
    constructor(injector) {
        super(injector, LandingStats, {
            pathParentIdAttribute: 'observedLocationId',
            pathIdAttribute: 'samplingId',
        });
        this.referentialRefService = this.injector.get(ReferentialRefService);
    }
    /* -- protected function -- */
    computeStats(data, opts) {
        const _super = Object.create(null, {
            computeStats: { get: () => super.computeStats }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield _super.computeStats.call(this, data, opts);
            stats.strategyLabel = data.measurementValues[PmfmIds.STRATEGY_LABEL];
            const samplePrefix = `${stats.strategyLabel}-`;
            (data.samples || []).forEach(sample => {
                const tagId = sample.measurementValues[PmfmIds.TAG_ID];
                if (tagId && tagId.startsWith(samplePrefix)) {
                    sample.measurementValues[PmfmIds.TAG_ID] = tagId.substring(samplePrefix.length);
                }
            });
            return stats;
        });
    }
    computeTitle(data, stats) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const titlePrefix = yield lastValueFrom(this.translate.get('LANDING.TITLE_PREFIX', {
                location: ((_a = data.location) === null || _a === void 0 ? void 0 : _a.name) || '',
                date: this.dateFormat.transform(data.dateTime, { time: false })
            }));
            const strategyLabel = this.stats.strategyLabel || data.measurementValues[PmfmIds.STRATEGY_LABEL] || '';
            const title = yield lastValueFrom(this.translate.get('LANDING.REPORT.SAMPLING.TITLE', {
                vessel: data.vesselSnapshot && (data.vesselSnapshot.registrationCode || data.vesselSnapshot.name),
                strategyLabel
            }));
            return titlePrefix + title;
        });
    }
    computeDefaultBackHref(data, stats) {
        return `/observations/${data.observedLocationId}/sampling/${data.id}?tab=1`;
    }
    computeShareBasePath() {
        return 'observations/report/sampling';
    }
    addFakeSamplesForDev(data, count = 25) {
        if (environment.production)
            return; // Skip
        super.addFakeSamplesForDev(data, count);
        data.samples.forEach((s, index) => s.measurementValues[PmfmIds.TAG_ID] = `${index + 1}`);
    }
};
SamplingLandingReport = __decorate([
    Component({
        selector: 'app-sampling-landing-report',
        styleUrls: [
            '../../report/landing.report.scss',
            '../../../../data/report/base-report.scss',
        ],
        templateUrl: './sampling-landing.report.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector])
], SamplingLandingReport);
export { SamplingLandingReport };
//# sourceMappingURL=sampling-landing.report.js.map