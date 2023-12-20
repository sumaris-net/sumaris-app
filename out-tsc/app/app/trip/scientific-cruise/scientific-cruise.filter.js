import { __decorate, __metadata } from "tslib";
import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import { TripFilter } from '@app/trip/trip/trip.filter';
import { OperationFilter } from '@app/trip/operation/operation.filter';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { EntityClass, fromDateISOString, isNil, isNotEmptyArray, isNotNil, toNumber, } from '@sumaris-net/ngx-components';
let ScientificCruiseFilter = class ScientificCruiseFilter extends RootDataEntityFilter {
    constructor() {
        super();
        this.vesselId = null;
        this.vesselSnapshot = null;
        this.startDate = null;
        this.endDate = null;
        this.dataQualityStatus = 'VALIDATED';
    }
    static toTripFilter(f) {
        var _a, _b;
        if (!f)
            return undefined;
        return TripFilter.fromObject({
            programLabel: (_a = f.program) === null || _a === void 0 ? void 0 : _a.label,
            vesselId: toNumber(f.vesselId, (_b = f.vesselSnapshot) === null || _b === void 0 ? void 0 : _b.id),
            startDate: f.startDate,
            endDate: f.endDate,
            boundingBox: f.boundingBox,
        });
    }
    static toOperationFilter(f) {
        var _a;
        if (!f)
            return undefined;
        return OperationFilter.fromObject({
            programLabel: (_a = f.program) === null || _a === void 0 ? void 0 : _a.label,
            vesselId: f.vesselId,
            startDate: f.startDate,
            endDate: f.endDate,
            boundingBox: f.boundingBox,
        });
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.vesselId = source.vesselId;
        this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.includedIds = source.includedIds;
        this.excludedIds = source.excludedIds;
        this.boundingBox = source.boundingBox;
    }
    asObject(opts) {
        var _a;
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            // Vessel
            target.vesselId = isNotNil(this.vesselId) ? this.vesselId : (_a = this.vesselSnapshot) === null || _a === void 0 ? void 0 : _a.id;
            delete target.vesselSnapshot;
        }
        else {
            target.vesselSnapshot = (this.vesselSnapshot && this.vesselSnapshot.asObject(opts)) || undefined;
        }
        return target;
    }
    buildFilter() {
        var _a;
        const filterFns = super.buildFilter();
        // Filter excluded ids
        if (isNotEmptyArray(this.excludedIds)) {
            filterFns.push((t) => isNil(t.id) || !this.excludedIds.includes(t.id));
        }
        // Filter included ids
        if (isNotEmptyArray(this.includedIds)) {
            filterFns.push((t) => isNotNil(t.id) && this.includedIds.includes(t.id));
        }
        // Vessel
        const vesselId = isNotNil(this.vesselId) ? this.vesselId : (_a = this.vesselSnapshot) === null || _a === void 0 ? void 0 : _a.id;
        if (isNotNil(vesselId)) {
            filterFns.push((t) => { var _a; return ((_a = t.vesselSnapshot) === null || _a === void 0 ? void 0 : _a.id) === vesselId; });
        }
        // Start/end period
        if (this.startDate) {
            const startDate = this.startDate.clone();
            filterFns.push((t) => (t.returnDateTime ? startDate.isSameOrBefore(t.returnDateTime) : startDate.isSameOrBefore(t.departureDateTime)));
        }
        if (this.endDate) {
            const endDate = this.endDate.clone().add(1, 'day').startOf('day');
            filterFns.push((t) => t.departureDateTime && endDate.isAfter(t.departureDateTime));
        }
        return filterFns;
    }
};
ScientificCruiseFilter = __decorate([
    EntityClass({ typename: 'ScientificCruiseFilterVO' }),
    __metadata("design:paramtypes", [])
], ScientificCruiseFilter);
export { ScientificCruiseFilter };
//# sourceMappingURL=scientific-cruise.filter.js.map