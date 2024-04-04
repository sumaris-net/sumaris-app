/* -- Extraction -- */
var ExtractionType_1, ExtractionFilterCriterion_1;
import { __decorate, __metadata } from "tslib";
import { BaseReferential, capitalizeFirstLetter, collectByProperty, Department, Entity, EntityClass, EntityFilter, equals, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, Person, toNumber, trimEmptyToNull } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
export const ExtractionCategories = {
    PRODUCT: 'PRODUCT',
    LIVE: 'LIVE',
};
let ExtractionType = ExtractionType_1 = class ExtractionType extends BaseReferential {
    constructor(__typename) {
        super(__typename || ExtractionType_1.TYPENAME);
        this.format = null;
        this.version = null;
        this.sheetNames = null;
        this.isSpatial = null;
        this.docUrl = null;
        this.processingFrequencyId = null;
        this.parent = null;
        this.parentId = null;
        this.recorderPerson = null;
        this.recorderDepartment = null;
        this.recorderDepartment = null;
    }
    static equals(o1, o2) {
        return o1 && o2 ? o1.label === o2.label && o1.format === o2.format && o1.version === o2.version : o1 === o2;
    }
    static fromLiveLabel(label) {
        return ExtractionType_1.fromObject({ label, category: 'LIVE' });
    }
    fromObject(source, opts) {
        var _a;
        super.fromObject(source, opts);
        this.format = source.format;
        this.version = source.version;
        this.sheetNames = source.sheetNames;
        this.isSpatial = source.isSpatial;
        this.docUrl = source.docUrl;
        this.parent = source.parent && ExtractionType_1.fromObject(source.parent);
        this.parentId = toNumber(source.parentId, (_a = source.parent) === null || _a === void 0 ? void 0 : _a.id);
        this.processingFrequencyId = source.processingFrequencyId;
        this.recorderPerson = source.recorderPerson && Person.fromObject(source.recorderPerson) || null;
        this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
    }
    asObject(opts) {
        var _a;
        const target = super.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS));
        target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts) || undefined;
        target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(opts) || undefined;
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            target.parentId = toNumber((_a = this.parent) === null || _a === void 0 ? void 0 : _a.id, this.parentId);
            delete target.parent;
        }
        else {
            target.parent = this.parent && this.parent.asObject(opts);
        }
        return target;
    }
    get category() {
        return (isNil(this.id) || this.id < 0) && !this.isSpatial ? 'LIVE' : 'PRODUCT';
    }
};
ExtractionType = ExtractionType_1 = __decorate([
    EntityClass({ typename: 'ExtractionTypeVO' }),
    __metadata("design:paramtypes", [String])
], ExtractionType);
export { ExtractionType };
export class ExtractionResult {
    static fromObject(source) {
        if (!source || source instanceof ExtractionResult)
            return source;
        const target = new ExtractionResult();
        target.fromObject(source);
        return target;
    }
    fromObject(source) {
        this.total = source.total;
        this.columns = source.columns && source.columns.map(ExtractionColumn.fromObject) || null;
        this.rows = source.rows && source.rows.slice() || null;
        return this;
    }
}
let ExtractionColumn = class ExtractionColumn {
    static isNumeric(source) {
        return source && (source.type === 'integer' || source.type === 'double');
    }
    fromObject(source) {
        this.id = source.id;
        this.creationDate = source.creationDate;
        this.index = source.index;
        this.label = source.label;
        this.name = source.name;
        this.columnName = source.columnName;
        this.type = source.type;
        this.description = source.description;
        this.rankOrder = source.rankOrder;
        this.values = source.values && source.values.slice();
        return this;
    }
};
ExtractionColumn = __decorate([
    EntityClass({ typename: 'ExtractionColumnVO' })
], ExtractionColumn);
export { ExtractionColumn };
export class ExtractionRow extends Array {
    constructor(...items) {
        super(...items);
    }
}
let ExtractionFilter = class ExtractionFilter extends EntityFilter {
    fromObject(source) {
        super.fromObject(source);
        this.searchText = source.searchText;
        this.criteria = source.criteria && source.criteria.map(ExtractionFilterCriterion.fromObject);
        this.sheetName = source.sheetName;
        this.preview = source.preview;
        this.meta = source.meta;
        return this;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.criteria = this.criteria && this.criteria
            // Remove empty criterion
            .filter(criterion => isNotNil(criterion.name) && ExtractionFilterCriterion.isNotEmpty(criterion))
            // Serialize to object
            .map(criterion => criterion.asObject && criterion.asObject(opts) || criterion) || undefined;
        return target;
    }
};
ExtractionFilter = __decorate([
    EntityClass({ typename: 'ExtractionFilterVO' })
], ExtractionFilter);
export { ExtractionFilter };
export const CRITERION_OPERATOR_LIST = Object.freeze([
    { symbol: '=' },
    { symbol: '!=' },
    { symbol: '>' },
    { symbol: '>=' },
    { symbol: '<' },
    { symbol: '<=' },
    { symbol: 'BETWEEN', name: 'EXTRACTION.FILTER.BETWEEN' },
    { symbol: 'NULL', name: 'EXTRACTION.FILTER.NULL' },
    { symbol: 'NOT NULL', name: 'EXTRACTION.FILTER.NOT_NULL' }
]);
let ExtractionFilterCriterion = ExtractionFilterCriterion_1 = class ExtractionFilterCriterion extends Entity {
    constructor() {
        super(ExtractionFilterCriterion_1.TYPENAME);
        this.hidden = false;
    }
    static isNotEmpty(criterion) {
        return criterion && (isNotNilOrBlank(criterion.value)
            || isNotEmptyArray(criterion.values)
            || criterion.operator === 'NULL'
            || criterion.operator === 'NOT NULL');
    }
    static isEmpty(criterion) {
        return !this.isNotEmpty(criterion);
    }
    static equals(c1, c2) {
        return (c1 === c2)
            || (isNil(c1) && isNil(c2))
            || (isNotNil(c1)
                && c1.name === (c2 === null || c2 === void 0 ? void 0 : c2.name)
                && c1.operator === (c2 === null || c2 === void 0 ? void 0 : c2.operator)
                && c1.value === (c2 === null || c2 === void 0 ? void 0 : c2.value)
                && equals(c1.values, c2 === null || c2 === void 0 ? void 0 : c2.values)
                && c1.endValue === (c2 === null || c2 === void 0 ? void 0 : c2.endValue)
                && c1.sheetName === (c2 === null || c2 === void 0 ? void 0 : c2.sheetName));
    }
    fromObject(source) {
        super.fromObject(source);
        this.name = source.name;
        this.operator = source.operator;
        this.value = source.value;
        this.values = source.values;
        this.endValue = source.endValue;
        this.sheetName = source.sheetName;
        this.hidden = source.hidden || false;
        return this;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        // Pod serialization
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            const isMulti = (typeof target.value === 'string' && target.value.indexOf(',') !== -1)
                || isNotEmptyArray(target.values);
            switch (target.operator) {
                case '=':
                case 'IN':
                    if (isMulti) {
                        target.operator = 'IN';
                        target.values = (target.values || target.value.split(','))
                            .map(trimEmptyToNull)
                            .filter(isNotNil);
                        delete target.value;
                    }
                    break;
                case '!=':
                    if (isMulti) {
                        target.operator = 'NOT IN';
                        target.values = (target.values || target.value.split(','))
                            .map(trimEmptyToNull)
                            .filter(isNotNil);
                        delete target.value;
                    }
                    break;
                case 'BETWEEN':
                    if (isNotNilOrBlank(target.endValue)) {
                        if (typeof target.value === 'string') {
                            target.values = [target.value.trim(), target.endValue.trim()];
                        }
                        else {
                            target.values = [target.value, target.endValue];
                        }
                    }
                    delete target.value;
                    break;
            }
            delete target.endValue;
            delete target.hidden;
        }
        return target;
    }
};
ExtractionFilterCriterion = ExtractionFilterCriterion_1 = __decorate([
    EntityClass({ typename: 'ExtractionFilterCriterionVO' }),
    __metadata("design:paramtypes", [])
], ExtractionFilterCriterion);
export { ExtractionFilterCriterion };
export class ExtractionTypeUtils {
    static computeI18nName(translate, type) {
        if (isNil(type))
            return undefined;
        if (type.name)
            return type; // Skip if already has a name
        // Get format
        const format = type.format
            // Parse label if not fetched
            || type.label && type.label.split('-')[0].toUpperCase();
        let key = `EXTRACTION.FORMAT.${format}.TITLE`.toUpperCase();
        let name = translate.instant(key, type);
        // No I18n translation
        if (name === key) {
            // Use name, or label (but replace underscore with space)
            key = type.name || (format && format.replace(/[_-]+/g, ' ').toUpperCase());
            // First letter as upper case
            name = capitalizeFirstLetter(key.toLowerCase());
        }
        if (typeof type.clone === 'function') {
            type = type.clone();
        }
        type.name = name;
        return type;
    }
    static minify(type) {
        return {
            id: type.id,
            label: type.label,
            format: type.format,
            version: type.version
        };
    }
    static isProduct(type) {
        return isNotNil(type.id) && type.id >= 0;
    }
}
export class ExtractionTypeCategory {
    static fromTypes(types) {
        const typesByCategory = collectByProperty(types, 'category');
        // Add a spatial product category
        if (typesByCategory['PRODUCT']) {
            const spatialProduct = typesByCategory['PRODUCT'].filter(t => t.isSpatial && t.id >= 0 /*exclude live agg*/);
            if (isNotEmptyArray(spatialProduct)) {
                typesByCategory['PRODUCT'] = typesByCategory['PRODUCT'].filter(t => !t.isSpatial);
                typesByCategory['SPATIAL_PRODUCT'] = spatialProduct;
            }
        }
        return Object.getOwnPropertyNames(typesByCategory)
            .map(category => ({ label: category, types: typesByCategory[category] }));
    }
}
//# sourceMappingURL=extraction-type.model.js.map