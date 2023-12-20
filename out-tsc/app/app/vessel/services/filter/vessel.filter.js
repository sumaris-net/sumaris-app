var VesselFilter_1;
import { __decorate } from "tslib";
import { EntityClass, EntityFilter, EntityUtils, fromDateISOString, isNotEmptyArray, isNotNil, isNotNilOrBlank, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
let VesselFilter = VesselFilter_1 = class VesselFilter extends RootDataEntityFilter {
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.searchText = source.searchText;
        this.searchAttributes = source.searchAttributes || undefined;
        this.date = fromDateISOString(source.date);
        this.vesselId = source.vesselId;
        this.statusId = source.statusId;
        this.statusIds = source.statusIds;
        this.onlyWithRegistration = source.onlyWithRegistration;
        this.registrationLocation = ReferentialRef.fromObject(source.registrationLocation) ||
            isNotNilOrBlank(source.registrationLocationId) && ReferentialRef.fromObject({ id: source.registrationLocationId }) || undefined;
        this.basePortLocation = ReferentialRef.fromObject(source.basePortLocation) ||
            isNotNilOrBlank(source.basePortLocationId) && ReferentialRef.fromObject({ id: source.basePortLocationId }) || undefined;
        this.vesselType = ReferentialRef.fromObject(source.vesselType) ||
            isNotNilOrBlank(source.vesselTypeId) && ReferentialRef.fromObject({ id: source.vesselTypeId }) || undefined;
    }
    asObject(opts) {
        var _a, _b, _c, _d, _e, _f;
        const target = super.asObject(opts);
        target.date = toDateISOString(this.date);
        if (opts && opts.minify) {
            target.statusIds = isNotNil(this.statusId) ? [this.statusId] : this.statusIds;
            delete target.statusId;
            target.registrationLocationId = (_a = this.registrationLocation) === null || _a === void 0 ? void 0 : _a.id;
            delete target.registrationLocation;
            target.basePortLocationId = (_b = this.basePortLocation) === null || _b === void 0 ? void 0 : _b.id;
            delete target.basePortLocation;
            target.vesselTypeId = (_c = this.vesselType) === null || _c === void 0 ? void 0 : _c.id;
            delete target.vesselType;
            if (target.onlyWithRegistration !== true)
                delete target.onlyWithRegistration;
        }
        else {
            target.registrationLocation = (_d = this.registrationLocation) === null || _d === void 0 ? void 0 : _d.asObject(opts);
            target.basePortLocation = (_e = this.basePortLocation) === null || _e === void 0 ? void 0 : _e.asObject(opts);
            target.vesselType = (_f = this.vesselType) === null || _f === void 0 ? void 0 : _f.asObject(opts);
        }
        return target;
    }
    buildFilter() {
        var _a, _b, _c;
        const filterFns = super.buildFilter();
        // Vessel id
        if (isNotNil(this.vesselId)) {
            filterFns.push(t => t.id === this.vesselId);
        }
        // Status
        const statusIds = isNotNil(this.statusId) ? [this.statusId] : this.statusIds;
        if (isNotEmptyArray(statusIds)) {
            filterFns.push(t => statusIds.includes(t.statusId));
        }
        // Only with registration
        if (this.onlyWithRegistration) {
            filterFns.push(t => isNotNil(t.vesselRegistrationPeriod));
        }
        // registration location
        const registrationLocationId = (_a = this.registrationLocation) === null || _a === void 0 ? void 0 : _a.id;
        if (isNotNil(registrationLocationId)) {
            filterFns.push(t => { var _a, _b; return (((_b = (_a = t.vesselRegistrationPeriod) === null || _a === void 0 ? void 0 : _a.registrationLocation) === null || _b === void 0 ? void 0 : _b.id) === registrationLocationId); });
        }
        // base port location
        const basePortLocationId = (_b = this.basePortLocation) === null || _b === void 0 ? void 0 : _b.id;
        if (isNotNil(basePortLocationId)) {
            filterFns.push(t => { var _a, _b; return (((_b = (_a = t.vesselFeatures) === null || _a === void 0 ? void 0 : _a.basePortLocation) === null || _b === void 0 ? void 0 : _b.id) === basePortLocationId); });
        }
        // Vessel type
        const vesselTypeId = (_c = this.vesselType) === null || _c === void 0 ? void 0 : _c.id;
        if (isNotNil(vesselTypeId)) {
            filterFns.push(t => { var _a; return (((_a = t.vesselType) === null || _a === void 0 ? void 0 : _a.id) === vesselTypeId); });
        }
        const searchTextFilter = EntityUtils.searchTextFilter(this.searchAttributes || ['vesselFeatures.exteriorMarking', 'vesselRegistrationPeriod.registrationCode', 'vesselFeatures.name'], this.searchText);
        if (searchTextFilter)
            filterFns.push(searchTextFilter);
        return filterFns;
    }
    isCriteriaNotEmpty(key, value) {
        return !VesselFilter_1.EXCLUDE_CRITERIA_COUNT.includes(key)
            && super.isCriteriaNotEmpty(key, value);
    }
};
VesselFilter.EXCLUDE_CRITERIA_COUNT = ['statusIds', 'onlyWithRegistration'];
VesselFilter = VesselFilter_1 = __decorate([
    EntityClass({ typename: 'VesselFilterVO' })
], VesselFilter);
export { VesselFilter };
let VesselFeaturesFilter = class VesselFeaturesFilter extends EntityFilter {
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.vesselId = source.vesselId;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        if (isNotNil(this.vesselId)) {
            filterFns.push((e) => e.vesselId === this.vesselId);
        }
        return filterFns;
    }
};
VesselFeaturesFilter = __decorate([
    EntityClass({ typename: 'VesselFeaturesFilterVO' })
], VesselFeaturesFilter);
export { VesselFeaturesFilter };
let VesselRegistrationFilter = class VesselRegistrationFilter extends EntityFilter {
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.vesselId = source.vesselId;
    }
    asObject(opts) {
        return {
            vesselId: this.vesselId
        };
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        if (isNotNil(this.vesselId)) {
            const vesselId = this.vesselId;
            filterFns.push((e) => e.vesselId === vesselId);
        }
        return filterFns;
    }
};
VesselRegistrationFilter = __decorate([
    EntityClass({ typename: 'VesselRegistrationFilterVO' })
], VesselRegistrationFilter);
export { VesselRegistrationFilter };
//# sourceMappingURL=vessel.filter.js.map