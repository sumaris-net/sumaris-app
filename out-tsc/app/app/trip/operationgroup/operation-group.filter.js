import { __decorate } from "tslib";
import { EntityClass, isNil, isNotEmptyArray, isNotNil, isNotNilOrNaN } from '@sumaris-net/ngx-components';
import { DataEntityFilter } from '@app/data/services/model/data-filter.model';
import { Geometries } from '@app/shared/geometries.utils';
import { FishingAreaUtils } from '@app/data/fishing-area/fishing-area.model';
let OperationGroupFilter = class OperationGroupFilter extends DataEntityFilter {
    fromObject(source, opts) {
        var _a;
        super.fromObject(source, opts);
        this.tripId = source.tripId;
        this.vesselId = source.vesselId;
        this.excludeId = source.excludeId;
        this.includedIds = source.includedIds;
        this.excludedIds = source.excludedIds;
        this.programLabel = source.programLabel || ((_a = source.program) === null || _a === void 0 ? void 0 : _a.label);
        this.gearIds = source.gearIds;
        this.physicalGearIds = source.physicalGearIds;
        this.taxonGroupLabels = source.taxonGroupLabels;
        this.dataQualityStatus = source.dataQualityStatus;
        this.boundingBox = source.boundingBox;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            delete target.program;
            delete target.excludeId; // Not include in Pod
        }
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // DEBUG
        //console.debug('filtering operations...', this);
        // Included ids
        if (isNotNil(this.includedIds)) {
            const includedIds = this.includedIds;
            filterFns.push(o => includedIds.includes(o.id));
        }
        // Exclude id
        if (isNotNil(this.excludeId)) {
            const excludeId = this.excludeId;
            filterFns.push(o => o.id !== excludeId);
        }
        // Excluded ids
        if (isNotNil(this.excludedIds) && this.excludedIds.length > 0) {
            const excludedIds = this.excludedIds;
            filterFns.push(o => !excludedIds.includes(o.id));
        }
        // GearIds;
        if (isNotEmptyArray(this.gearIds) || (!Array.isArray(this.gearIds) && isNotNilOrNaN(this.gearIds))) {
            const gearIds = Array.isArray(this.gearIds) ? this.gearIds : [this.gearIds];
            filterFns.push(o => { var _a; return o.metier && isNotNil((_a = o.metier.gear) === null || _a === void 0 ? void 0 : _a.id) && gearIds.indexOf(o.metier.gear.id) !== -1; });
        }
        // PhysicalGearIds;
        if (isNotEmptyArray(this.physicalGearIds)) {
            const physicalGearIds = this.physicalGearIds;
            filterFns.push(o => isNotNil(o.physicalGearId) && physicalGearIds.indexOf(o.physicalGearId) !== -1);
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
            const fishingAreaFilter = FishingAreaUtils.createBBoxFilter(this.boundingBox);
            filterFns.push(o => (o.fishingAreas || []).some(fishingAreaFilter));
        }
        // Filter on parent trip
        {
            // Trip
            if (isNotNil(this.tripId)) {
                const tripId = this.tripId;
                filterFns.push(o => o.tripId === tripId);
            }
        }
        return filterFns;
    }
};
OperationGroupFilter = __decorate([
    EntityClass({ typename: 'OperationGroupFilterVO' })
], OperationGroupFilter);
export { OperationGroupFilter };
//# sourceMappingURL=operation-group.filter.js.map