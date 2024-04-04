import { __decorate } from "tslib";
import { EntityClass, EntityFilter, fromDateISOString, isNotNil, toDateISOString } from '@sumaris-net/ngx-components';
let AggregatedLandingFilter = class AggregatedLandingFilter extends EntityFilter {
    equals(f2) {
        return isNotNil(f2)
            && this.programLabel === f2.programLabel
            && this.observedLocationId === f2.observedLocationId
            && this.locationId === f2.locationId
            && this.synchronizationStatus === f2.synchronizationStatus
            && ((!this.startDate && !f2.startDate) || (this.startDate.isSame(f2.startDate)))
            && ((!this.endDate && !f2.endDate) || (this.endDate.isSame(f2.endDate)));
    }
    fromObject(source) {
        super.fromObject(source);
        this.programLabel = source.programLabel;
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.locationId = source.locationId;
        this.observedLocationId = source.observedLocationId;
        this.synchronizationStatus = source.synchronizationStatus;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.startDate = this.startDate && toDateISOString(this.startDate);
        target.endDate = this.endDate && toDateISOString(this.endDate);
        if (opts && opts.minify) {
            delete target.id;
            delete target.synchronizationStatus;
        }
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // FIXME: this properties cannot b filtered locally, because not exists !
        /*// Program
        if (isNotNilOrBlank(this.programLabel)) {
          const programLabel = this.programLabel;
          filterFns.push(t => (t.program && t.program.label === this.programLabel));
        }

        // Location
        if (isNotNil(this.locationId)) {
          filterFns.push((entity) => entity.location && entity.location.id === this.locationId);
        }

        // Start/end period
        if (this.startDate) {
          const startDate = this.startDate.clone();
          filterFns.push(t => t.dateTime && startDate.isSameOrBefore(t.dateTime));
        }
        if (this.endDate) {
          const endDate = this.endDate.clone().add(1, 'day').startOf('day');
          filterFns.push(t => t.dateTime && endDate.isAfter(t.dateTime));
        }*/
        // observedLocationId
        if (isNotNil(this.observedLocationId)) {
            filterFns.push((entity) => entity.observedLocationId === this.observedLocationId);
        }
        return filterFns;
    }
};
AggregatedLandingFilter = __decorate([
    EntityClass({ typename: 'AggregatedLandingFilterVO' })
], AggregatedLandingFilter);
export { AggregatedLandingFilter };
//# sourceMappingURL=aggregated-landing.filter.js.map