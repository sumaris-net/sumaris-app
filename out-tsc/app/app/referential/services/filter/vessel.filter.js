var VesselSnapshotFilter_1;
import { __decorate } from "tslib";
import { EntityClass, EntityFilter, EntityUtils, fromDateISOString, isNotNil, isNotNilOrBlank, ReferentialRef, toDateISOString, toNumber, } from '@sumaris-net/ngx-components';
let VesselSnapshotFilter = VesselSnapshotFilter_1 = class VesselSnapshotFilter extends EntityFilter {
    static fromVesselFilter(filter) {
        if (!filter)
            return undefined;
        return this.fromObject(filter);
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.program =
            ReferentialRef.fromObject(source.program) ||
                (isNotNilOrBlank(source.programLabel) && ReferentialRef.fromObject({ label: source.programLabel })) ||
                undefined;
        this.date = fromDateISOString(source.date);
        this.vesselId = source.vesselId;
        this.searchText = source.searchText;
        this.searchAttributes = source.searchAttributes;
        this.statusId = source.statusId;
        this.statusIds = source.statusIds;
        this.synchronizationStatus = source.synchronizationStatus;
        this.registrationLocation =
            ReferentialRef.fromObject(source.registrationLocation) ||
                (isNotNilOrBlank(source.registrationLocationId) && ReferentialRef.fromObject({ id: source.registrationLocationId })) ||
                undefined;
        this.basePortLocation =
            ReferentialRef.fromObject(source.basePortLocation) ||
                (isNotNilOrBlank(source.basePortLocationId) && ReferentialRef.fromObject({ id: source.basePortLocationId })) ||
                undefined;
        this.vesselTypeId = source.vesselTypeId;
        this.vesselType =
            ReferentialRef.fromObject(source.vesselType) ||
                (isNotNilOrBlank(source.vesselTypeId) && ReferentialRef.fromObject({ id: source.vesselTypeId })) ||
                undefined;
    }
    asObject(opts) {
        var _a, _b, _c, _d, _e, _f, _g;
        const target = super.asObject(opts);
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            target.programLabel = this.program && this.program.label;
            delete target.program;
            // NOT in pod
            delete target.synchronizationStatus;
            target.registrationLocationId = (_a = this.registrationLocation) === null || _a === void 0 ? void 0 : _a.id;
            delete target.registrationLocation;
            target.basePortLocationId = (_b = this.basePortLocation) === null || _b === void 0 ? void 0 : _b.id;
            delete target.basePortLocation;
            target.vesselTypeId = toNumber(this.vesselTypeId, (_c = this.vesselType) === null || _c === void 0 ? void 0 : _c.id);
            delete target.vesselType;
        }
        else {
            target.program = (_d = this.program) === null || _d === void 0 ? void 0 : _d.asObject(opts);
            target.registrationLocation = (_e = this.registrationLocation) === null || _e === void 0 ? void 0 : _e.asObject(opts);
            target.basePortLocation = (_f = this.basePortLocation) === null || _f === void 0 ? void 0 : _f.asObject(opts);
            target.vesselType = (_g = this.vesselType) === null || _g === void 0 ? void 0 : _g.asObject(opts);
        }
        target.date = toDateISOString(this.date);
        target.statusIds = isNotNil(this.statusId) ? [this.statusId] : this.statusIds;
        delete target.statusId;
        return target;
    }
    buildFilter() {
        var _a, _b, _c;
        const filterFns = super.buildFilter();
        // Program
        if (this.program) {
            const programId = this.program.id;
            const programLabel = this.program.label;
            if (isNotNil(programId)) {
                filterFns.push((t) => t.program && t.program.id === programId);
            }
            else if (isNotNilOrBlank(programLabel)) {
                filterFns.push((t) => t.program && t.program.label === programLabel);
            }
        }
        // Vessel id
        if (isNotNil(this.vesselId)) {
            const vesselId = this.vesselId;
            filterFns.push((t) => t.id === vesselId);
        }
        // Status
        const statusIds = isNotNil(this.statusId) ? [this.statusId] : this.statusIds;
        if (statusIds) {
            filterFns.push((t) => statusIds.includes(t.vesselStatusId));
        }
        // registration location
        const registrationLocationId = (_a = this.registrationLocation) === null || _a === void 0 ? void 0 : _a.id;
        if (isNotNil(registrationLocationId)) {
            filterFns.push((t) => { var _a; return ((_a = t.registrationLocation) === null || _a === void 0 ? void 0 : _a.id) === registrationLocationId; });
        }
        // base port location
        const basePortLocationId = (_b = this.basePortLocation) === null || _b === void 0 ? void 0 : _b.id;
        if (isNotNil(basePortLocationId)) {
            filterFns.push((t) => { var _a; return ((_a = t.basePortLocation) === null || _a === void 0 ? void 0 : _a.id) === basePortLocationId; });
        }
        // Vessel type
        const vesselTypeId = (_c = this.vesselType) === null || _c === void 0 ? void 0 : _c.id;
        if (isNotNil(vesselTypeId)) {
            filterFns.push((t) => { var _a; return ((_a = t.vesselType) === null || _a === void 0 ? void 0 : _a.id) === vesselTypeId; });
        }
        // Search text
        const searchTextFilter = EntityUtils.searchTextFilter(this.searchAttributes || VesselSnapshotFilter_1.DEFAULT_SEARCH_ATTRIBUTES, this.searchText);
        if (searchTextFilter)
            filterFns.push(searchTextFilter);
        // Synchronization status
        if (this.synchronizationStatus) {
            if (this.synchronizationStatus === 'SYNC') {
                filterFns.push(EntityUtils.isRemote);
            }
            else {
                filterFns.push(EntityUtils.isLocal);
            }
        }
        return filterFns;
    }
};
VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES = ['exteriorMarking', 'name'];
VesselSnapshotFilter = VesselSnapshotFilter_1 = __decorate([
    EntityClass({ typename: 'VesselFilterVO' })
], VesselSnapshotFilter);
export { VesselSnapshotFilter };
//# sourceMappingURL=vessel.filter.js.map