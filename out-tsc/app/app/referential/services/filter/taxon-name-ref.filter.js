import { __decorate, __metadata } from "tslib";
import { BaseReferentialFilter } from './referential.filter';
import { isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
import { EntityClass } from '@sumaris-net/ngx-components';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
let TaxonNameRefFilter = class TaxonNameRefFilter extends BaseReferentialFilter {
    constructor() {
        super();
        this.entityName = TaxonNameRef.ENTITY_NAME;
    }
    fromObject(source, opts) {
        super.fromObject(source);
        this.taxonGroupIds = source.taxonGroupIds;
        this.taxonGroupId = source.taxonGroupId;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            target.taxonGroupIds = isNotNil(this.taxonGroupId) ? [this.taxonGroupId] : this.taxonGroupIds;
            delete target.taxonGroupId;
        }
        else {
            target.taxonGroupId = this.taxonGroupId;
            target.taxonGroupIds = this.taxonGroupIds;
        }
        return target;
    }
    asFilterFn() {
        const filterFns = [];
        const inheritedFn = super.asFilterFn();
        if (inheritedFn)
            filterFns.push(inheritedFn);
        // Filter by taxon group id, or list of id
        if (isNotNil(this.taxonGroupId)) {
            filterFns.push(entity => entity.taxonGroupIds && entity.taxonGroupIds.includes(this.taxonGroupId));
        }
        else if (isNotEmptyArray(this.taxonGroupIds)) {
            const taxonGroupIds = this.taxonGroupIds;
            filterFns.push(entity => entity.taxonGroupIds && entity.taxonGroupIds.findIndex(id => taxonGroupIds.includes(id)) !== -1);
        }
        if (!filterFns.length)
            return undefined;
        return entity => !filterFns.find(fn => !fn(entity));
    }
};
TaxonNameRefFilter = __decorate([
    EntityClass({ typename: 'TaxonNameFilterVO' }),
    __metadata("design:paramtypes", [])
], TaxonNameRefFilter);
export { TaxonNameRefFilter };
//# sourceMappingURL=taxon-name-ref.filter.js.map