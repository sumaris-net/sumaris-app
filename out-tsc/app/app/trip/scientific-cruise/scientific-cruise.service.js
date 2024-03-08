import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { ScientificCruise } from '@app/trip/scientific-cruise/scientific-cruise.model';
import { ScientificCruiseFilter } from '@app/trip/scientific-cruise/scientific-cruise.filter';
import { TripService } from '@app/trip/trip/trip.service';
import { map } from 'rxjs/operators';
import { Trip } from '@app/trip/trip/trip.model';
export class ScientificCruiseComparators {
    static sortByDepartureDateFn(n1, n2) {
        const d1 = n1.departureDateTime;
        const d2 = n2.departureDateTime;
        return d1.isSame(d2) ? 0 : d1.isAfter(d2) ? 1 : -1;
    }
}
let ScientificCruiseService = class ScientificCruiseService {
    constructor(tripService) {
        this.tripService = tripService;
    }
    watchAll(offset, size, sortBy, sortDirection, filter, options) {
        filter = this.asFilter(filter);
        const tripFilter = ScientificCruiseFilter.toTripFilter(filter);
        tripFilter.hasScientificCruise = true;
        tripFilter.hasObservedLocation = false;
        return this.tripService
            .watchAll(offset, size, sortBy, sortDirection, tripFilter, Object.assign(Object.assign({}, options), { toEntity: false }))
            .pipe(map(({ data, total }) => {
            const entities = (options === null || options === void 0 ? void 0 : options.toEntity) !== false
                ? (data || []).map((json) => {
                    const entity = ScientificCruise.fromObject(json);
                    entity.trip = Trip.fromObject(json);
                    return entity;
                })
                : (data || []).map((json) => {
                    const entity = json;
                    entity.trip = Trip.fromObject(json);
                    return entity;
                });
            return {
                data: entities,
                total: (options === null || options === void 0 ? void 0 : options.withTotal) !== false ? total : entities.length,
            };
        }));
    }
    asFilter(source) {
        return ScientificCruiseFilter.fromObject(source);
    }
    deleteAll(data, opts) {
        return Promise.resolve(undefined);
    }
    hasOfflineData() {
        return Promise.resolve(false);
    }
    lastUpdateDate() {
        return Promise.resolve(undefined);
    }
    load(id, opts) {
        return Promise.resolve(undefined);
    }
    runImport(filter, opts) {
        return undefined;
    }
    saveAll(data, opts) {
        return Promise.resolve([]);
    }
    canUserWrite(data, opts) {
        return this.tripService.canUserWrite(data.trip, opts);
    }
    control(data, opts) {
        return this.tripService.control(data.trip, opts);
    }
    qualify(data, qualityFlagId) {
        return __awaiter(this, void 0, void 0, function* () {
            data.trip = yield this.tripService.qualify(data.trip, qualityFlagId);
            return data;
        });
    }
    synchronize(data, opts) {
        return Promise.resolve(undefined);
    }
    synchronizeById(id) {
        return Promise.resolve(undefined);
    }
    terminate(entity) {
        return Promise.resolve(undefined);
    }
    terminateById(id) {
        return Promise.resolve(undefined);
    }
};
ScientificCruiseService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [TripService])
], ScientificCruiseService);
export { ScientificCruiseService };
//# sourceMappingURL=scientific-cruise.service.js.map