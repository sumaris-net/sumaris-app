/* -- Extraction -- */
var ExtractionProduct_1;
import { __decorate, __metadata } from "tslib";
import { EntityClass, fromDateISOString, isNotEmptyArray, MINIFY_ENTITY_FOR_POD, toDateISOString, toNumber } from '@sumaris-net/ngx-components';
import { ExtractionFilter, ExtractionType } from '../type/extraction-type.model';
import { AggregationStrata } from '@app/extraction/strata/strata.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
export const ProcessingFrequencyIds = {
    NEVER: 0,
    MANUALLY: 1,
    HOURLY: 5,
    DAILY: 2,
    WEEKLY: 3,
    MONTHLY: 4
};
export const ProcessingFrequencyItems = Object.freeze([
    {
        id: ProcessingFrequencyIds.NEVER,
        label: 'EXTRACTION.AGGREGATION.EDIT.PROCESSING_FREQUENCY_ENUM.NEVER'
    },
    {
        id: ProcessingFrequencyIds.MANUALLY,
        label: 'EXTRACTION.AGGREGATION.EDIT.PROCESSING_FREQUENCY_ENUM.MANUALLY'
    },
    {
        id: ProcessingFrequencyIds.HOURLY,
        label: 'EXTRACTION.AGGREGATION.EDIT.PROCESSING_FREQUENCY_ENUM.HOURLY'
    },
    {
        id: ProcessingFrequencyIds.DAILY,
        label: 'EXTRACTION.AGGREGATION.EDIT.PROCESSING_FREQUENCY_ENUM.DAILY'
    },
    {
        id: ProcessingFrequencyIds.WEEKLY,
        label: 'EXTRACTION.AGGREGATION.EDIT.PROCESSING_FREQUENCY_ENUM.WEEKLY'
    },
    {
        id: ProcessingFrequencyIds.MONTHLY,
        label: 'EXTRACTION.AGGREGATION.EDIT.PROCESSING_FREQUENCY_ENUM.MONTHLY'
    }
]);
let ExtractionProduct = ExtractionProduct_1 = class ExtractionProduct extends ExtractionType {
    constructor() {
        super(ExtractionProduct_1.TYPENAME);
        this.filterContent = null;
        this.filter = null;
        this.documentation = null;
        this.creationDate = null;
        this.stratum = null;
        this.columns = null;
    }
    fromObject(source, opts) {
        var _a;
        super.fromObject(source, opts);
        this.documentation = source.documentation;
        this.creationDate = fromDateISOString(source.creationDate);
        this.stratum = isNotEmptyArray(source.stratum) && source.stratum.map(AggregationStrata.fromObject) || [];
        this.filter = source.filter || (typeof source.filterContent === 'string' && ExtractionFilter.fromObject(JSON.parse(source.filterContent)));
        this.parentId = toNumber(source.parentId, (_a = source.parent) === null || _a === void 0 ? void 0 : _a.id);
        this.parent = source.parent && ExtractionType.fromObject(source.parent);
    }
    asObject(opts) {
        var _a;
        const target = super.asObject(opts);
        target.creationDate = toDateISOString(this.creationDate);
        target.stratum = this.stratum && this.stratum.map(s => s.asObject(opts)) || undefined;
        target.columns = this.columns && this.columns.map((c) => {
            const json = Object.assign({}, c);
            delete json.index;
            delete json.__typename;
            return json;
        }) || undefined;
        target.parent = this.parent && this.parent.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            target.filterContent = this.filter && JSON.stringify(this.filter.asObject(MINIFY_ENTITY_FOR_POD)) || this.filterContent;
            delete target.filter;
            target.parentId = toNumber((_a = this.parent) === null || _a === void 0 ? void 0 : _a.id, this.parentId);
            delete target.parent;
        }
        return target;
    }
};
ExtractionProduct = ExtractionProduct_1 = __decorate([
    EntityClass({ typename: 'ExtractionProductVO' }),
    __metadata("design:paramtypes", [])
], ExtractionProduct);
export { ExtractionProduct };
//# sourceMappingURL=product.model.js.map