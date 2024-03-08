var ObservedLocationFilter_1;
import { __decorate } from "tslib";
import { LandingFilter } from '../landing/landing.filter';
import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import { EntityClass, isNotEmptyArray, isNotNil, Person, ReferentialRef, ReferentialUtils, } from '@sumaris-net/ngx-components';
import { DataSynchroImportFilter } from '@app/data/services/root-data-synchro-service.class';
let ObservedLocationFilter = ObservedLocationFilter_1 = class ObservedLocationFilter extends RootDataEntityFilter {
    static toLandingFilter(source) {
        if (!source)
            return undefined;
        return LandingFilter.fromObject({
            program: source.program,
            startDate: source.startDate,
            endDate: source.endDate,
            location: source.location,
            locations: source.locations,
        });
    }
    static fromLandingFilter(source) {
        if (!source)
            return undefined;
        return ObservedLocationFilter_1.fromObject({
            program: source.program,
            startDate: source.startDate,
            endDate: source.endDate,
            location: source.location,
            locations: source.locations,
        });
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.location = ReferentialRef.fromObject(source.location);
        this.observers = (source.observers && source.observers.map(Person.fromObject)) || [];
    }
    asObject(opts) {
        var _a;
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            // Location
            target.locationIds = isNotNil((_a = this.location) === null || _a === void 0 ? void 0 : _a.id) ? [this.location.id] : (this.locations || []).map((l) => l.id).filter(isNotNil);
            delete target.location;
            delete target.locations;
            // Observers
            target.observerPersonIds = (this.observers && this.observers.map((o) => o && o.id).filter(isNotNil)) || undefined;
            delete target.observers;
        }
        else {
            target.location = (this.location && this.location.asObject(opts)) || undefined;
            target.observers = (this.observers && this.observers.map((o) => o && o.asObject(opts)).filter(isNotNil)) || undefined;
        }
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // Location
        if (ReferentialUtils.isNotEmpty(this.location)) {
            const locationId = this.location.id;
            filterFns.push((t) => t.location && t.location.id === locationId);
        }
        // Start/end period
        if (this.startDate) {
            const startDate = this.startDate.clone();
            filterFns.push((t) => (t.endDateTime ? startDate.isSameOrBefore(t.endDateTime) : startDate.isSameOrBefore(t.startDateTime)));
        }
        if (this.endDate) {
            const endDate = this.endDate.clone().add(1, 'day').startOf('day');
            filterFns.push((t) => t.startDateTime && endDate.isAfter(t.startDateTime));
        }
        // Recorder department and person
        // Already defined in super classes root-data-filter.model.ts et data-filter.model.ts
        // Observers
        const observerIds = this.observers && this.observers.map((o) => o && o.id).filter(isNotNil);
        if (isNotEmptyArray(observerIds)) {
            filterFns.push((t) => t.observers && t.observers.findIndex((o) => o && observerIds.includes(o.id)) !== -1);
        }
        return filterFns;
    }
};
ObservedLocationFilter = ObservedLocationFilter_1 = __decorate([
    EntityClass({ typename: 'ObservedLocationFilterVO' })
], ObservedLocationFilter);
export { ObservedLocationFilter };
export class ObservedLocationOfflineFilter extends DataSynchroImportFilter {
}
//# sourceMappingURL=observed-location.filter.js.map