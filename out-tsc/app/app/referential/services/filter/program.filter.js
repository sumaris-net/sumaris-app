import { __decorate, __metadata } from "tslib";
import { BaseReferentialFilter } from './referential.filter';
import { Program } from '../model/program.model';
import { EntityClass, EntityUtils, fromDateISOString, isNotEmptyArray, toDateISOString } from '@sumaris-net/ngx-components';
let ProgramFilter = class ProgramFilter extends BaseReferentialFilter {
    constructor() {
        super();
        this.searchAttributes = null;
        this.entityName = Program.ENTITY_NAME;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.entityName = source.entityName || Program.ENTITY_NAME;
        this.searchAttributes = source.searchAttributes;
        this.withProperty = source.withProperty;
        this.minUpdateDate = fromDateISOString(source.minUpdateDate);
        this.acquisitionLevelLabels = source.acquisitionLevelLabels;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.minUpdateDate = toDateISOString(this.minUpdateDate);
        if (opts && opts.minify) {
            // Init searchAttribute, only when NOT searching on 'label' AND 'name' (not need to pass it to POD)
            if (!target.searchAttribute && isNotEmptyArray(this.searchAttributes)
                && (this.searchAttributes.length !== 2
                    || !(this.searchAttributes.includes('label') && this.searchAttributes.includes('name')))) {
                target.searchAttribute = this.searchAttributes[0] || undefined;
            }
            // In all case, delete this attributes (not exists in the pod)
            delete target.searchAttributes;
            delete target.strategyIds;
        }
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter() || [];
        // Search on many attributes
        if (!this.searchAttribute) {
            const searchTextFilter = EntityUtils.searchTextFilter(this.searchAttributes || ['label', 'name'], this.searchText);
            if (searchTextFilter)
                filterFns.push(searchTextFilter);
        }
        // Filter on acquisition levels
        if (isNotEmptyArray(this.acquisitionLevelLabels)) {
            filterFns.push((entity) => (entity.acquisitionLevelLabels || []).some(label => this.acquisitionLevelLabels.includes(label)));
        }
        return filterFns;
    }
};
ProgramFilter.ENTITY_NAME = 'Program';
ProgramFilter = __decorate([
    EntityClass({ typename: 'ProgramFilterVO' }),
    __metadata("design:paramtypes", [])
], ProgramFilter);
export { ProgramFilter };
//# sourceMappingURL=program.filter.js.map