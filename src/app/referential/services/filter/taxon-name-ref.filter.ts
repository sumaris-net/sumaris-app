import {BaseReferentialFilter} from "./referential.filter";
import {EntityAsObjectOptions}  from "@sumaris-net/ngx-components";
import {StoreObject} from "@apollo/client/core";
import {isNotEmptyArray, isNotNil} from "@sumaris-net/ngx-components";
import {FilterFn} from "@sumaris-net/ngx-components";
import {EntityClass}  from "@sumaris-net/ngx-components";
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';

@EntityClass({typename: 'TaxonNameFilterVO'})
export class TaxonNameRefFilter extends BaseReferentialFilter<TaxonNameRefFilter, TaxonNameRef> {

    static fromObject: (source: any, opts?: any) => TaxonNameRefFilter;

    taxonGroupId?: number;
    taxonGroupIds?: number[];

    constructor() {
      super();
      this.entityName = TaxonNameRef.ENTITY_NAME;
    }

    fromObject(source: any, opts?: any) {
        super.fromObject(source);
        this.taxonGroupIds = source.taxonGroupIds;
        this.taxonGroupId = source.taxonGroupId;
    }

    asObject(opts?: EntityAsObjectOptions): StoreObject {
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            target.taxonGroupIds = isNotNil(this.taxonGroupId) ? [this.taxonGroupId] : this.taxonGroupIds;
            delete target.taxonGroupId;
        } else {
            target.taxonGroupId = this.taxonGroupId;
            target.taxonGroupIds = this.taxonGroupIds;
        }
        return target;
    }

    asFilterFn<E extends TaxonNameRef>(): FilterFn<E> {
        const filterFns: FilterFn<E>[] = [];

        const inheritedFn = super.asFilterFn();
        if (inheritedFn) filterFns.push(inheritedFn);

        // Filter by taxon group id, or list of id
        if (isNotNil(this.taxonGroupId)) {
            filterFns.push(entity => entity.taxonGroupIds && entity.taxonGroupIds.includes(this.taxonGroupId));
        } else if (isNotEmptyArray(this.taxonGroupIds)) {
            const taxonGroupIds = this.taxonGroupIds;
            filterFns.push(entity => entity.taxonGroupIds && entity.taxonGroupIds.findIndex(id => taxonGroupIds.includes(id)) !== -1);
        }

        if (!filterFns.length) return undefined;

        return entity => !filterFns.find(fn => !fn(entity));
    }
}
