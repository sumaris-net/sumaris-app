var ExtractionTypeFilter_1;
import { __decorate } from "tslib";
import { EntityClass, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from '@app/referential/services/filter/referential.filter';
import { ExtractionType } from '@app/extraction/type/extraction-type.model';
let ExtractionTypeFilter = ExtractionTypeFilter_1 = class ExtractionTypeFilter extends BaseReferentialFilter {
    constructor() {
        super(...arguments);
        this.category = null;
        this.format = null;
        this.formats = null;
        this.version = null;
        this.isSpatial = null;
    }
    static fromType(source) {
        source = ExtractionType.fromObject(source);
        const target = ExtractionTypeFilter_1.fromObject(source.asObject({ keepTypename: false }));
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.isSpatial = source.isSpatial;
        this.category = source.category;
        this.format = source.format;
        this.formats = source.formats;
        this.version = source.version;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // Filter by spatial
        if (isNotNil(this.isSpatial)) {
            filterFns.push(entity => this.isSpatial === entity.isSpatial);
        }
        // Filter by category
        if (isNotNil(this.category)) {
            filterFns.push(entity => this.category === entity.category);
        }
        // Filter by label
        if (isNotNil(this.label)) {
            filterFns.push(entity => this.label === entity.label);
        }
        // Filter by format
        if (isNotNil(this.format)) {
            filterFns.push(entity => this.format === entity.format);
        }
        // Filter by formats
        else if (isNotEmptyArray(this.formats)) {
            const formats = this.formats;
            filterFns.push(entity => formats.includes(entity.format));
        }
        // Filter by version
        if (isNotNil(this.version)) {
            filterFns.push(entity => this.version === entity.version);
        }
        return filterFns;
    }
};
ExtractionTypeFilter = ExtractionTypeFilter_1 = __decorate([
    EntityClass({ typename: 'ExtractionTypeFilterVO' })
], ExtractionTypeFilter);
export { ExtractionTypeFilter };
//# sourceMappingURL=extraction-type.filter.js.map