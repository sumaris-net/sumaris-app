import { __decorate } from "tslib";
import { EntityUtils } from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from './referential.filter';
import { isNotEmptyArray } from '@sumaris-net/ngx-components';
import { EntityClass } from '@sumaris-net/ngx-components';
let ReferentialRefFilter = class ReferentialRefFilter extends BaseReferentialFilter {
    constructor() {
        super(...arguments);
        this.searchAttributes = null;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            // Init searchAttribute, only when NOT searching on 'label' AND 'name' (not need to pass it to POD)
            if (!target.searchAttribute && isNotEmptyArray(this.searchAttributes)
                && (this.searchAttributes.length !== 2
                    || !(this.searchAttributes.includes('label') && this.searchAttributes.includes('name')))) {
                target.searchAttribute = this.searchAttributes[0] || undefined;
            }
            // In all case, delete this attributes (not exists in the pod)
            delete target.searchAttributes;
        }
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.searchAttributes = source.searchAttributes;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // Search on many attributes
        if (!this.searchAttribute) {
            const searchTextFilter = EntityUtils.searchTextFilter(this.searchAttributes || ['label', 'name'], this.searchText);
            if (searchTextFilter)
                filterFns.push(searchTextFilter);
        }
        return filterFns;
    }
};
ReferentialRefFilter = __decorate([
    EntityClass({ typename: 'ReferentialFilterVO' })
], ReferentialRefFilter);
export { ReferentialRefFilter };
//# sourceMappingURL=referential-ref.filter.js.map