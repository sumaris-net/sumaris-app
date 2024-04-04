import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { environment } from '@environments/environment';
import { BaseLandingReport, LandingStats } from '@app/trip/landing/report/base-landing-report.class';
import { firstValueFrom } from 'rxjs';
let AuctionControlReport = class AuctionControlReport extends BaseLandingReport {
    constructor(injector) {
        super(injector, LandingStats, {
            pathIdAttribute: 'controlId'
        });
    }
    /* -- protected function -- */
    computeTitle(data, stats) {
        return firstValueFrom(this.translate.get('AUCTION_CONTROL.REPORT.TITLE', {
            vessel: data.vesselSnapshot.name,
            date: this.dateFormat.transform(data.dateTime),
        }));
    }
    computeDefaultBackHref(data, stats) {
        return `/observations/${this.data.observedLocationId}/control/${data.id}?tab=1`;
    }
    computeShareBasePath() {
        return 'observations/report/control';
    }
    addFakeSamplesForDev(data, count = 40) {
        if (environment.production)
            return; // Skip
        super.addFakeSamplesForDev(data, count);
        data.samples.forEach((s, index) => s.label = `${index + 1}`);
    }
};
AuctionControlReport = __decorate([
    Component({
        selector: 'app-auction-control-report',
        styleUrls: [
            '../../report/landing.report.scss',
            '../../../../data/report/base-report.scss',
        ],
        templateUrl: './auction-control.report.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector])
], AuctionControlReport);
export { AuctionControlReport };
//# sourceMappingURL=auction-control.report.js.map