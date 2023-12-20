import { __decorate } from "tslib";
import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import { EntityClass, isNotEmptyArray, isNotNil, isNotNilOrBlank, Person, ReferentialRef, toNumber } from '@sumaris-net/ngx-components';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
let LandingFilter = class LandingFilter extends RootDataEntityFilter {
    constructor() {
        super(...arguments);
        this.vesselSnapshot = null;
        this.location = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.vesselId = toNumber(source.vesselId);
        this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
        this.excludeVesselIds = source.excludeVesselIds;
        this.groupByVessel = source.groupByVessel;
        this.locationId = toNumber(source.locationId);
        this.locationIds = source.locationIds;
        this.location = ReferentialRef.fromObject(source.location);
        this.observers = source.observers && source.observers.map(Person.fromObject).filter(isNotNil) || [];
        this.sampleLabel = source.sampleLabel;
        this.sampleTagId = source.sampleTagId;
        this.observedLocationId = toNumber(source.observedLocationId);
        this.tripId = toNumber(source.tripId);
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            // Vessel
            target.vesselId = isNotNil(this.vesselId) ? this.vesselId : (this.vesselSnapshot && isNotNil(this.vesselSnapshot.id) ? this.vesselSnapshot.id : undefined);
            delete target.vesselSnapshot;
            // Location
            target.locationId = this.location && this.location.id || undefined;
            delete target.location;
            // Observers
            target.observerPersonIds = isNotEmptyArray(this.observers) && this.observers.map(o => o && o.id).filter(isNotNil) || undefined;
            delete target.observers;
            // Not exists in pod
            delete target.groupByVessel;
            // Sample
            target.sampleLabels = isNotNilOrBlank(this.sampleLabel) ? this.sampleLabel.split(/[,\s]+/) : undefined;
            delete target.sampleLabel;
            target.sampleTagIds = isNotNilOrBlank(this.sampleTagId) ? this.sampleTagId.split(/[,\s]+/) : undefined;
            delete target.sampleTagId;
        }
        else {
            target.vesselSnapshot = this.vesselSnapshot && this.vesselSnapshot.asObject(opts) || undefined;
            target.location = this.location && this.location.asObject(opts) || undefined;
            target.observers = this.observers && this.observers.map(o => o && o.asObject(opts)).filter(isNotNil) || [];
        }
        return target;
    }
    buildFilter() {
        var _a;
        const filterFns = super.buildFilter();
        // observedLocationId
        if (isNotNil(this.observedLocationId)) {
            filterFns.push((entity) => entity.observedLocationId === this.observedLocationId);
        }
        // tripId
        if (isNotNil(this.tripId)) {
            filterFns.push((entity) => entity.tripId === this.tripId);
        }
        // Vessel
        if (isNotNil(this.vesselId)) {
            filterFns.push((entity) => entity.vesselSnapshot && entity.vesselSnapshot.id === this.vesselId);
        }
        // Vessel exclude
        if (isNotEmptyArray(this.excludeVesselIds)) {
            filterFns.push((entity) => entity.vesselSnapshot && !this.excludeVesselIds.includes(entity.vesselSnapshot.id));
        }
        // Location
        if (isNotNil(this.locationId)) {
            filterFns.push((entity) => { var _a; return ((_a = entity.location) === null || _a === void 0 ? void 0 : _a.id) === this.locationId; });
        }
        if (isNotEmptyArray(this.locationIds)) {
            filterFns.push((entity) => entity.location && this.locationIds.includes(entity.location.id));
        }
        // Start/end period
        if (this.startDate) {
            const startDate = this.startDate.clone();
            filterFns.push(t => t.dateTime && startDate.isSameOrBefore(t.dateTime));
        }
        if (this.endDate) {
            const endDate = this.endDate.clone().add(1, 'day').startOf('day');
            filterFns.push(t => t.dateTime && endDate.isAfter(t.dateTime));
        }
        // Observers
        const observerIds = (_a = this.observers) === null || _a === void 0 ? void 0 : _a.map(o => o.id).filter(isNotNil);
        if (isNotEmptyArray(observerIds)) {
            filterFns.push(t => { var _a; return (_a = t.observers) === null || _a === void 0 ? void 0 : _a.some(o => o && observerIds.includes(o.id)); });
        }
        return filterFns;
    }
};
LandingFilter = __decorate([
    EntityClass({ typename: 'LandingFilterVO' })
], LandingFilter);
export { LandingFilter };
//# sourceMappingURL=landing.filter.js.map