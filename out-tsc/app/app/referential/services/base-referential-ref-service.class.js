import { __awaiter, __decorate, __metadata } from "tslib";
import { EntitiesStorage, NetworkService } from '@sumaris-net/ngx-components';
import { Directive, Injector } from '@angular/core';
import { BaseReferentialService } from '@app/referential/services/base-referential-service.class';
let BaseReferentialRefService = class BaseReferentialRefService extends BaseReferentialService {
    constructor(injector, dataType, filterType, options) {
        super(injector, dataType, filterType, options);
        this.dataType = dataType;
        this.filterType = filterType;
        this.network = injector.get(NetworkService);
        this.entities = injector.get(EntitiesStorage);
    }
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        const _super = Object.create(null, {
            loadAll: { get: () => super.loadAll }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
            if (offline) {
                return this.loadAllLocally(offset, size, sortBy, sortDirection, filter, opts);
            }
            return _super.loadAll.call(this, offset, size, sortBy, sortDirection, filter, opts);
        });
    }
    loadAllLocally(offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = this.asFilter(filter);
            const variables = {
                offset: offset || 0,
                size: size || 100,
                sortBy: sortBy || filter.searchAttribute || 'label',
                sortDirection: sortDirection || 'asc',
                filter: filter && filter.asFilterFn()
            };
            const { data, total } = yield this.entities.loadAll(this._typename, variables);
            const entities = (!opts || opts.toEntity !== false) ?
                (data || []).map(json => this.fromObject(json)) :
                (data || []);
            const res = { data: entities, total };
            // Add fetch more function
            const nextOffset = (offset || 0) + entities.length;
            if (nextOffset < total) {
                res.fetchMore = () => this.loadAllLocally(nextOffset, size, sortBy, sortDirection, filter, opts);
            }
            return res;
        });
    }
};
BaseReferentialRefService = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __metadata("design:paramtypes", [Injector, Function, Function, Object])
], BaseReferentialRefService);
export { BaseReferentialRefService };
//# sourceMappingURL=base-referential-ref-service.class.js.map