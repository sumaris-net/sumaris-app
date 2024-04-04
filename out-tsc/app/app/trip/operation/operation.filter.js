import { __decorate } from "tslib";
import { EntityClass, fromDateISOString, isNil, isNotEmptyArray, isNotNil, isNotNilOrNaN, toDateISOString, toNumber } from '@sumaris-net/ngx-components';
import { DataEntityFilter } from '@app/data/services/model/data-filter.model';
import { Geometries } from '@app/shared/geometries.utils';
import { PositionUtils } from '@app/data/position/position.utils';
import { FishingAreaUtils } from '@app/data/fishing-area/fishing-area.model';
let OperationFilter = class OperationFilter extends DataEntityFilter {
    fromObject(source, opts) {
        var _a;
        super.fromObject(source, opts);
        this.tripId = source.tripId;
        this.vesselId = source.vesselId;
        this.excludeId = source.excludeId;
        this.includedIds = source.includedIds;
        this.excludedIds = source.excludedIds;
        this.programLabel = source.programLabel || ((_a = source.program) === null || _a === void 0 ? void 0 : _a.label);
        this.excludeChildOperation = source.excludeChildOperation;
        this.hasNoChildOperation = source.hasNoChildOperation;
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.gearIds = source.gearIds;
        this.physicalGearIds = source.physicalGearIds;
        this.taxonGroupLabels = source.taxonGroupLabels;
        this.dataQualityStatus = source.dataQualityStatus;
        this.boundingBox = source.boundingBox;
        this.excludedIds = source.excludedIds;
        this.parentOperationIds = source.parentOperationIds;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.startDate = toDateISOString(this.startDate);
        target.endDate = toDateISOString(this.endDate);
        if (opts && opts.minify) {
            delete target.program;
            delete target.excludeId; // Not include in Pod
            delete target.synchronizationStatus;
        }
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // DEBUG
        //console.debug('filtering operations...', this);
        // Included ids
        if (isNotEmptyArray(this.includedIds)) {
            const includedIds = this.includedIds.slice();
            filterFns.push(o => includedIds.includes(o.id));
        }
        // Exclude id
        if (isNotNil(this.excludeId)) {
            const excludeId = this.excludeId;
            filterFns.push(o => o.id !== +excludeId);
        }
        // ExcludedIds
        if (isNotEmptyArray(this.excludedIds)) {
            const excludedIds = this.excludedIds.slice();
            filterFns.push(o => !excludedIds.includes(o.id));
        }
        // Only operation with no parents
        if (isNotNil(this.excludeChildOperation) && this.excludeChildOperation) {
            filterFns.push(o => (isNil(o.parentOperationId) && isNil(o.parentOperation)));
        }
        // Only operation with no child
        if (isNotNil(this.hasNoChildOperation) && this.hasNoChildOperation) {
            filterFns.push(o => isNil(o.childOperationId) && isNil(o.childOperation));
        }
        // StartDate
        if (isNotNil(this.startDate)) {
            const startDate = this.startDate;
            filterFns.push(o => ((o.endDateTime && startDate.isSameOrBefore(o.endDateTime))
                || (o.fishingStartDateTime && startDate.isSameOrBefore(o.fishingStartDateTime))));
        }
        // EndDate
        if (isNotNil(this.endDate)) {
            const endDate = this.endDate;
            filterFns.push(o => ((o.endDateTime && endDate.isSameOrAfter(o.endDateTime))
                || (o.fishingStartDateTime && endDate.isSameOrAfter(o.fishingStartDateTime))));
        }
        // GearIds;
        if (isNotEmptyArray(this.gearIds) || (!Array.isArray(this.gearIds) && isNotNilOrNaN(this.gearIds))) {
            const gearIds = Array.isArray(this.gearIds) ? this.gearIds : [this.gearIds];
            filterFns.push(o => { var _a; return isNotNil((_a = o.physicalGear) === null || _a === void 0 ? void 0 : _a.gear) && gearIds.indexOf(o.physicalGear.gear.id) !== -1; });
        }
        // PhysicalGearIds;
        if (isNotEmptyArray(this.physicalGearIds)) {
            const physicalGearIds = this.physicalGearIds.slice();
            filterFns.push(o => { var _a; return isNotNil((_a = o.physicalGear) === null || _a === void 0 ? void 0 : _a.id) && physicalGearIds.indexOf(o.physicalGear.id) !== -1; });
        }
        // taxonGroupIds
        if (isNotEmptyArray(this.taxonGroupLabels)) {
            const targetSpecieLabels = this.taxonGroupLabels;
            filterFns.push(o => { var _a; return isNotNil((_a = o.metier) === null || _a === void 0 ? void 0 : _a.taxonGroup) && targetSpecieLabels.indexOf(o.metier.taxonGroup.label) !== -1; });
        }
        // Filter on dataQualityStatus
        if (isNotNil(this.dataQualityStatus)) {
            if (this.dataQualityStatus === 'MODIFIED') {
                filterFns.push(o => isNil(o.controlDate));
            }
            if (this.dataQualityStatus === 'CONTROLLED') {
                filterFns.push(o => isNotNil(o.controlDate));
            }
        }
        // Filter on position
        if (Geometries.checkBBox(this.boundingBox)) {
            const positionFilter = PositionUtils.createBBoxFilter(this.boundingBox);
            const fishingAreaFilter = FishingAreaUtils.createBBoxFilter(this.boundingBox);
            filterFns.push(o => (o.positions || []).some(positionFilter)
                || (o.fishingAreas || []).some(fishingAreaFilter));
        }
        // Filter on parent trip
        {
            // Trip
            if (isNotNil(this.tripId)) {
                const tripId = this.tripId;
                filterFns.push(o => o.tripId === tripId);
            }
            // Vessel
            if (isNotNil(this.vesselId)) {
                const vesselId = this.vesselId;
                filterFns.push(o => isNil(o.vesselId) || o.vesselId === vesselId);
            }
            // Program label
            if (isNotNil(this.programLabel)) {
                const programLabel = this.programLabel;
                filterFns.push(o => isNil(o.programLabel) || o.programLabel === programLabel);
            }
        }
        // Filter on parent operation
        if (isNotEmptyArray(this.parentOperationIds)) {
            const parentOperationIds = this.parentOperationIds.slice();
            filterFns.push(o => { var _a; return parentOperationIds.includes(toNumber(o.parentOperationId, (_a = o.parentOperation) === null || _a === void 0 ? void 0 : _a.id)); });
        }
        return filterFns;
    }
    isCriteriaNotEmpty(key, value) {
        switch (key) {
            case 'tripId':
                return false; // Ignore tripId
            default:
                return super.isCriteriaNotEmpty(key, value);
        }
    }
};
OperationFilter = __decorate([
    EntityClass({ typename: 'OperationFilterVO' })
], OperationFilter);
export { OperationFilter };
//# sourceMappingURL=operation.filter.js.map