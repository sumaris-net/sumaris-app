import { __decorate } from "tslib";
import { EntityClass, EntityFilter, fromDateISOString, isNil, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
import { isMoment } from 'moment';
let RoundWeightConversionFilter = class RoundWeightConversionFilter extends EntityFilter {
    constructor() {
        super(...arguments);
        this.date = null;
        this.taxonGroupId = null;
        this.locationId = null;
        this.dressingId = null;
        this.preservingId = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.date = fromDateISOString(source.date);
        this.statusIds = source.statusIds;
        this.taxonGroupId = source.taxonGroupId;
        this.taxonGroupIds = source.taxonGroupIds;
        this.locationId = source.locationId;
        this.locationIds = source.locationIds;
        this.dressingId = source.dressingId;
        this.dressingIds = source.dressingIds;
        this.preservingId = source.preservingId;
        this.preservingIds = source.preservingIds;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            target.taxonGroupIds = isNotNil(this.taxonGroupId) ? [this.taxonGroupId] : this.taxonGroupIds;
            delete target.taxonGroupId;
            target.locationIds = isNotNil(this.locationId) ? [this.locationId] : this.locationIds;
            delete target.locationId;
            target.dressingIds = isNotNil(this.dressingId) ? [this.dressingId] : this.dressingIds;
            delete target.dressingId;
            target.preservingIds = isNotNil(this.preservingId) ? [this.preservingId] : this.preservingIds;
            delete target.preservingId;
        }
        else {
            target.taxonGroupId = this.taxonGroupId;
            target.taxonGroupIds = this.taxonGroupIds;
            target.locationId = this.locationId;
            target.locationIds = this.locationIds;
            target.dressingId = this.dressingId;
            target.dressingIds = this.dressingIds;
            target.preservingId = this.preservingId;
            target.preservingIds = this.preservingIds;
        }
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // Sex
        const dressingId = this.dressingId;
        if (isNotNil(dressingId)) {
            filterFns.push(t => t.id === dressingId);
        }
        // Status
        const statusIds = this.statusIds;
        if (isNotEmptyArray(statusIds)) {
            filterFns.push(t => statusIds.includes(t.statusId));
        }
        // Location
        const locationId = this.locationId;
        if (isNotNil(locationId)) {
            filterFns.push(t => (t.locationId === locationId));
        }
        // Taxon group
        const taxonGroupId = this.taxonGroupId;
        if (isNotNil(taxonGroupId)) {
            filterFns.push(t => (t.taxonGroupId === taxonGroupId));
        }
        // Date
        if (this.date && isMoment(this.date)) {
            filterFns.push(t => this.date.isSameOrAfter(t.startDate) && (isNil(t.endDate) || this.date.isSameOrBefore(t.endDate)));
        }
        return filterFns;
    }
};
RoundWeightConversionFilter = __decorate([
    EntityClass({ typename: 'RoundWeightConversionFilterVO' })
], RoundWeightConversionFilter);
export { RoundWeightConversionFilter };
//# sourceMappingURL=round-weight-conversion.filter.js.map