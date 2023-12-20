var TripFilter_1;
import { __decorate, __metadata } from "tslib";
import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import { EntityClass, fromDateISOString, isNil, isNotEmptyArray, isNotNil, Person, ReferentialRef, ReferentialUtils, } from '@sumaris-net/ngx-components';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { OperationFilter } from '@app/trip/operation/operation.filter';
import { PhysicalGearFilter } from '@app/trip/physicalgear/physical-gear.filter';
import { DataSynchroImportFilter } from '@app/data/services/root-data-synchro-service.class';
let TripFilter = TripFilter_1 = class TripFilter extends RootDataEntityFilter {
    constructor() {
        super();
        this.vesselId = null;
        this.vesselSnapshot = null;
        this.location = null;
        this.startDate = null;
        this.endDate = null;
        this.dataQualityStatus = 'VALIDATED';
    }
    static toPhysicalGearFilter(f) {
        if (!f)
            return undefined;
        return PhysicalGearFilter.fromObject({
            program: f.program,
            vesselId: f.vesselId,
            startDate: f.startDate,
            endDate: f.endDate,
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
        this.location = ReferentialRef.fromObject(source.location);
        this.observers = (source.observers && source.observers.map(Person.fromObject).filter(isNotNil)) || [];
        this.includedIds = source.includedIds;
        this.excludedIds = source.excludedIds;
        this.boundingBox = source.boundingBox;
        this.observedLocationId = source.observedLocationId;
        this.hasScientificCruise = source.hasScientificCruise;
        this.hasObservedLocation = source.hasObservedLocation;
    }
    asObject(opts) {
        var _a;
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            // Vessel
            target.vesselId = isNotNil(this.vesselId) ? this.vesselId : (_a = this.vesselSnapshot) === null || _a === void 0 ? void 0 : _a.id;
            delete target.vesselSnapshot;
            // Location
            target.locationId = (this.location && this.location.id) || undefined;
            delete target.location;
            // Observers
            target.observerPersonIds = (isNotEmptyArray(this.observers) && this.observers.map((o) => o && o.id).filter(isNotNil)) || undefined;
            delete target.observers;
            // Exclude scientific cruise by default
            if (isNil(target.hasScientificCruise)) {
                target.hasScientificCruise = false;
            }
            // Exclude observed location by default
            if (isNil(target.hasObservedLocation)) {
                target.hasObservedLocation = false;
            }
        }
        else {
            target.vesselSnapshot = (this.vesselSnapshot && this.vesselSnapshot.asObject(opts)) || undefined;
            target.location = (this.location && this.location.asObject(opts)) || undefined;
            target.observers = (this.observers && this.observers.map((o) => o && o.asObject(opts)).filter(isNotNil)) || [];
        }
        return target;
    }
    buildFilter() {
        var _a, _b;
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
        // Location
        if (ReferentialUtils.isNotEmpty(this.location)) {
            const locationId = this.location.id;
            filterFns.push((t) => (t.departureLocation && t.departureLocation.id === locationId) || (t.returnLocation && t.returnLocation.id === locationId));
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
        // Observers
        const observerIds = (_b = this.observers) === null || _b === void 0 ? void 0 : _b.map((o) => o.id).filter(isNotNil);
        if (isNotEmptyArray(observerIds)) {
            filterFns.push((t) => { var _a; return (_a = t.observers) === null || _a === void 0 ? void 0 : _a.some((o) => o && observerIds.includes(o.id)); });
        }
        // has scientific cruise
        // TODO
        return filterFns;
    }
    isEmpty() {
        return super.isEmpty();
    }
    isCriteriaNotEmpty(key, value) {
        return !TripFilter_1.EXCLUDED_CRITERIA_COUNT_KEYS.includes(key) && super.isCriteriaNotEmpty(key, value);
    }
};
TripFilter.EXCLUDED_CRITERIA_COUNT_KEYS = ['hasScientificCruise', 'hasObservedLocation'];
TripFilter = TripFilter_1 = __decorate([
    EntityClass({ typename: 'TripFilterVO' }),
    __metadata("design:paramtypes", [])
], TripFilter);
export { TripFilter };
export class TripSynchroImportFilter extends DataSynchroImportFilter {
    static toTripFilter(f) {
        if (!f)
            return undefined;
        return TripFilter.fromObject({
            program: { label: f.programLabel },
            vesselId: f.vesselId,
            startDate: f.startDate,
            endDate: f.endDate
        });
    }
}
//# sourceMappingURL=trip.filter.js.map