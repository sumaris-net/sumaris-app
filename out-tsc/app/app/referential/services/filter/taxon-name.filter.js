import { __decorate } from "tslib";
import { EntityClass } from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from '@app/referential/services/filter/referential.filter';
let TaxonNameFilter = class TaxonNameFilter extends BaseReferentialFilter {
    constructor() {
        super(...arguments);
        this.withSynonyms = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.withSynonyms = source.withSynonyms;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // Filter by spatial
        if (this.withSynonyms === false) {
            filterFns.push(entity => entity.isReferent);
        }
        return filterFns;
    }
};
TaxonNameFilter = __decorate([
    EntityClass({ typename: 'TaxonNameFilterVO' })
], TaxonNameFilter);
export { TaxonNameFilter };
//# sourceMappingURL=taxon-name.filter.js.map