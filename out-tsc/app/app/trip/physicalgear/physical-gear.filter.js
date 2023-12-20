import { __decorate } from "tslib";
import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import { EntityClass, fromDateISOString, isNil, isNotNil, isNotNilOrBlank } from '@sumaris-net/ngx-components';
let PhysicalGearFilter = class PhysicalGearFilter extends RootDataEntityFilter {
    constructor() {
        super(...arguments);
        this.vesselId = null;
        this.tripId = null;
        this.excludeTripId = null;
        this.parentGearId = null;
        this.excludeParentGearId = null;
        this.excludeChildGear = null;
        this.excludeParentGear = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.vesselId = source.vesselId;
        this.tripId = source.tripId;
        this.excludeTripId = source.excludeTripId;
        this.parentGearId = source.parentGearId;
        this.excludeParentGearId = source.excludeParentGearId;
        this.excludeChildGear = source.excludeChildGear;
        this.excludeParentGear = source.excludeParentGear;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            // NOT exists on pod:
        }
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter({ skipProgram: true });
        // Program
        if (this.program) {
            const programId = this.program.id;
            const programLabel = this.program.label;
            if (isNotNil(programId)) {
                filterFns.push((t) => { var _a; return !((_a = t.trip) === null || _a === void 0 ? void 0 : _a.program) || t.trip.program.id === programId; });
            }
            else if (isNotNilOrBlank(programLabel)) {
                filterFns.push((t) => { var _a; return isNil((_a = t.trip) === null || _a === void 0 ? void 0 : _a.program) || t.trip.program.label === programLabel; });
            }
        }
        // Vessel
        if (isNotNil(this.vesselId)) {
            const vesselId = this.vesselId;
            filterFns.push((pg) => { var _a, _b; return ((_b = (_a = pg.trip) === null || _a === void 0 ? void 0 : _a.vesselSnapshot) === null || _b === void 0 ? void 0 : _b.id) === vesselId; });
        }
        // Trip
        if (isNotNil(this.tripId)) {
            const tripId = this.tripId;
            filterFns.push((pg) => { var _a; return pg.tripId === tripId || ((_a = pg.trip) === null || _a === void 0 ? void 0 : _a.id) === tripId; });
        }
        if (isNotNil(this.excludeTripId)) {
            const excludeTripId = this.excludeTripId;
            filterFns.push((pg) => { var _a; return !(pg.tripId === excludeTripId || ((_a = pg.trip) === null || _a === void 0 ? void 0 : _a.id) === excludeTripId); });
        }
        // Parent/Children
        if (isNotNil(this.parentGearId)) {
            const parentGearId = this.parentGearId;
            filterFns.push((pg) => { var _a; return pg.parentId === parentGearId || ((_a = pg.parent) === null || _a === void 0 ? void 0 : _a.id) === parentGearId; });
        }
        if (isNotNil(this.excludeParentGearId)) {
            const excludeParentGearId = this.excludeParentGearId;
            filterFns.push((pg) => { var _a; return !(pg.parentId === excludeParentGearId || ((_a = pg.parent) === null || _a === void 0 ? void 0 : _a.id) === excludeParentGearId); });
        }
        if (this.excludeParentGear) {
            filterFns.push((pg) => isNotNil(pg.parentId) || !!pg.parent);
        }
        if (this.excludeChildGear) {
            filterFns.push((pg) => isNil(pg.parentId) && !pg.parent);
        }
        // StartDate
        if (isNotNil(this.startDate)) {
            const startDate = this.startDate;
            filterFns.push((pg) => {
                var _a, _b, _c;
                return (isNotNil((_a = pg.trip) === null || _a === void 0 ? void 0 : _a.returnDateTime) && fromDateISOString(pg.trip.returnDateTime).isAfter(startDate)) ||
                    (isNotNil((_b = pg.trip) === null || _b === void 0 ? void 0 : _b.departureDateTime) && fromDateISOString((_c = pg.trip) === null || _c === void 0 ? void 0 : _c.departureDateTime).isAfter(startDate));
            });
        }
        // EndDate
        if (isNotNil(this.endDate)) {
            const endDate = this.endDate;
            filterFns.push((pg) => {
                var _a, _b, _c;
                return (isNotNil((_a = pg.trip) === null || _a === void 0 ? void 0 : _a.returnDateTime) && fromDateISOString(pg.trip.returnDateTime).isBefore(endDate)) ||
                    (isNotNil((_b = pg.trip) === null || _b === void 0 ? void 0 : _b.departureDateTime) && fromDateISOString((_c = pg.trip) === null || _c === void 0 ? void 0 : _c.departureDateTime).isBefore(endDate));
            });
        }
        return filterFns;
    }
};
PhysicalGearFilter = __decorate([
    EntityClass({ typename: 'PhysicalGearFilterVO' })
], PhysicalGearFilter);
export { PhysicalGearFilter };
//# sourceMappingURL=physical-gear.filter.js.map