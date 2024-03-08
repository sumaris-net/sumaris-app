import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { BaseLandingReport, LandingStats } from '@app/trip/landing/report/base-landing-report.class';
import { lastValueFrom } from 'rxjs';
let LandingReport = class LandingReport extends BaseLandingReport {
    constructor(injector) {
        super(injector, LandingStats, { pathIdAttribute: 'landingId' });
        this.injector = injector;
        this.logPrefix = 'landing-report';
    }
    /* -- protected function -- */
    computeTitle(data, stats) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const titlePrefix = yield lastValueFrom(this.translateContext.get('LANDING.TITLE_PREFIX', this.i18nContext.suffix, {
                location: ((_a = data.location) === null || _a === void 0 ? void 0 : _a.name) || '',
                date: this.dateFormat.transform(data.dateTime, { time: false })
            }));
            const title = yield lastValueFrom(this.translate.get('LANDING.REPORT.TITLE'));
            return titlePrefix + title;
        });
    }
    computeDefaultBackHref(data, stats) {
        return `/observations/${this.data.observedLocationId}/landing/${data.id}?tab=1`;
    }
    computeShareBasePath() {
        return 'observations/report/landing';
    }
};
LandingReport = __decorate([
    Component({
        selector: 'app-landing-report',
        styleUrls: [
            './landing.report.scss',
            '../../../data/report/base-report.scss',
        ],
        templateUrl: './landing.report.html',
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector])
], LandingReport);
export { LandingReport };
//# sourceMappingURL=landing.report.js.map