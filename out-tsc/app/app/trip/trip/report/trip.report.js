import { __decorate, __metadata } from "tslib";
import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { BaseTripReport } from '@app/trip/trip/report/base-trip.report';
let TripReport = class TripReport extends BaseTripReport {
    constructor(injector, tripReportService) {
        super(injector, tripReportService);
        this.logPrefix = 'trip-report ';
    }
};
TripReport = __decorate([
    Component({
        selector: 'app-trip-report',
        templateUrl: './trip.report.html',
        styleUrls: [
            './trip.report.scss',
            '../../../data/report/base-report.scss',
        ],
        providers: [
            { provide: TripReportService, useClass: TripReportService }
        ],
        encapsulation: ViewEncapsulation.None
    }),
    __metadata("design:paramtypes", [Injector,
        TripReportService])
], TripReport);
export { TripReport };
//# sourceMappingURL=trip.report.js.map