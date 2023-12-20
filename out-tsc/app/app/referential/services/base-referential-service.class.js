import { __awaiter, __decorate, __metadata } from "tslib";
import { BaseEntityService, GraphqlService, isNotNil, PlatformService, ReferentialUtils, } from '@sumaris-net/ngx-components';
import { Directive, Injector } from '@angular/core';
export const TEXT_SEARCH_IGNORE_CHARS_REGEXP = /[ \t-*]+/g;
let BaseReferentialService = class BaseReferentialService extends BaseEntityService {
    constructor(injector, dataType, filterType, options) {
        super(injector.get(GraphqlService), injector.get(PlatformService), dataType, filterType, Object.assign({}, options));
        this.dataType = dataType;
        this.filterType = filterType;
    }
    watchAll(offset, size, sortBy, sortDirection, filter, opts) {
        // Use search attribute as default sort, is set
        sortBy = sortBy || filter && filter.searchAttribute;
        // Call inherited function
        return super.watchAll(offset, size, sortBy, sortDirection, filter, opts);
    }
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        const _super = Object.create(null, {
            loadAll: { get: () => super.loadAll }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Use search attribute as default sort, is set
            sortBy = sortBy || (filter === null || filter === void 0 ? void 0 : filter.searchAttribute);
            // Call inherited function
            return _super.loadAll.call(this, offset, size, sortBy, sortDirection, filter, opts);
        });
    }
    load(id, opts) {
        const _super = Object.create(null, {
            load: { get: () => super.load }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const query = opts && opts.query || this.queries.load;
            if (!query) {
                if (!this.queries.loadAll)
                    throw new Error('Not implemented');
                const data = yield this.loadAll(0, 1, null, null, { id }, opts);
                return data && data[0];
            }
            return _super.load.call(this, id, opts);
        });
    }
    suggest(value, filter, sortBy, sortDirection, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ReferentialUtils.isNotEmpty(value))
                return { data: [value] };
            value = (typeof value === 'string' && value !== '*') && value || undefined;
            // Replace '*' character by undefined
            if (!value || value === '*') {
                value = undefined;
            }
            // trim search text, and ignore some characters
            else if (value && typeof value === 'string') {
                value = value.trim().replace(TEXT_SEARCH_IGNORE_CHARS_REGEXP, '*');
            }
            return this.loadAll(0, !value ? 30 : 10, sortBy, sortDirection, Object.assign(Object.assign({}, filter), { searchText: value }), Object.assign({ withTotal: true /* Used by autocomplete */ }, opts));
        });
    }
    equals(e1, e2) {
        return e1 && e2 && ((isNotNil(e1.id) && e1.id === e2.id) || (e1.label && e1.label === e2.label));
    }
    existsByLabel(label, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const count = yield this.countAll(filter, opts);
            return count > 0;
        });
    }
};
BaseReferentialService = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __metadata("design:paramtypes", [Injector, Function, Function, Object])
], BaseReferentialService);
export { BaseReferentialService };
//# sourceMappingURL=base-referential-service.class.js.map