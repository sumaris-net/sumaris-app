import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { GraphqlService } from '@sumaris-net/ngx-components';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { SelectivityGear, SelectivitySpeciesLength, SelectivitySpeciesList, SelectivityStation, SelectivityTrip } from './selectivity-trip-report.model';
let SelectivityTripReportService = class SelectivityTripReportService extends TripReportService {
    constructor(graphql) {
        super(graphql);
        this.graphql = graphql;
    }
    loadAll(filter, opts) {
        return super.loadAll(filter, Object.assign(Object.assign({}, opts), { formatLabel: 'apase', sheetNames: ['TR', 'HH', 'FG', 'SL', 'HL'], dataTypes: {
                TR: SelectivityTrip,
                FG: SelectivityGear,
                HH: SelectivityStation,
                SL: SelectivitySpeciesList,
                HL: SelectivitySpeciesLength
            } }));
    }
};
SelectivityTripReportService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GraphqlService])
], SelectivityTripReportService);
export { SelectivityTripReportService };
//# sourceMappingURL=selectivity-trip-report.service.js.map