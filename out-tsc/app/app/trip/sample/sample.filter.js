import { __decorate } from "tslib";
import { DataEntityFilter } from '@app/data/services/model/data-filter.model';
import { EntityClass, isNotNil, isNotNilOrBlank } from '@sumaris-net/ngx-components';
import { PmfmIds } from '@app/referential/services/model/model.enum';
let SampleFilter = class SampleFilter extends DataEntityFilter {
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.operationId = source.operationId;
        this.landingId = source.landingId;
        this.observedLocationId = source.observedLocationId;
        this.observedLocationIds = source.observedLocationIds;
        this.parent = source.parent;
        this.tagId = source.tagId;
        this.withTagId = source.withTagId;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            target.parentId = this.parent ? this.parent.id : undefined;
            delete target.parent;
        }
        else {
            target.parent = this.parent ? { id: this.parent.id, label: this.parent.label } : undefined;
        }
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // Landing
        if (isNotNil(this.landingId)) {
            filterFns.push(t => (t.landingId === this.landingId));
        }
        // Operation
        if (isNotNil(this.operationId)) {
            filterFns.push(t => (t.operationId === this.operationId));
        }
        // Parent
        if (isNotNil(this.parent)) {
            filterFns.push(t => (t.parentId === this.parent.id || this.parent.equals(t.parent)));
        }
        // Having a tag ID
        if (isNotNilOrBlank(this.tagId)) {
            filterFns.push(t => t.measurementValues && this.tagId === t.measurementValues[PmfmIds.TAG_ID]);
        }
        // With tag ID
        if (isNotNil(this.withTagId)) {
            filterFns.push(t => t.measurementValues && this.withTagId === isNotNilOrBlank(t.measurementValues[PmfmIds.TAG_ID]));
        }
        return filterFns;
    }
};
SampleFilter = __decorate([
    EntityClass({ typename: 'SampleFilterVO' })
], SampleFilter);
export { SampleFilter };
//# sourceMappingURL=sample.filter.js.map