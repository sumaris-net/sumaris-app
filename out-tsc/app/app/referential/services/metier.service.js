import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { ErrorCodes } from './errors';
import { AccountService, BaseGraphqlService, EntitiesStorage, GraphqlService, isNil, NetworkService, ReferentialUtils, StatusIds } from '@sumaris-net/ngx-components';
import { ReferentialFragments } from './referential.fragments';
import { environment } from '@environments/environment';
import { MetierFilter } from './filter/metier.filter';
import { Metier } from '@app/referential/metier/metier.model';
export const METIER_DEFAULT_FILTER = Object.freeze(MetierFilter.fromObject({
    entityName: 'Metier',
    statusId: StatusIds.ENABLE
}));
const MetierQueries = {
    loadAll: gql `query Metiers($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: MetierFilterVOInput){
    data: metiers(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightMetierFragment
    }
  }
  ${ReferentialFragments.lightMetier}`,
    loadAllWithTotal: gql `query Metiers($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: MetierFilterVOInput){
      data: metiers(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
        ...LightMetierFragment
      }
      total: metiersCount(filter: $filter)
    }
    ${ReferentialFragments.lightMetier}`,
    load: gql `query Metier($id: Int!){
    metier(id: $id){
      ...MetierFragment
    }
  }
  ${ReferentialFragments.metier}`
};
let MetierService = class MetierService extends BaseGraphqlService {
    constructor(graphql, accountService, network, entities) {
        super(graphql, environment);
        this.graphql = graphql;
        this.accountService = accountService;
        this.network = network;
        this.entities = entities;
        // -- For DEV only
        this._debug = !environment.production;
    }
    load(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(id))
                throw new Error('Missing argument \'id\'');
            const now = this._debug && Date.now();
            if (this._debug)
                console.debug(`[metier-ref-service] Loading Metier #${id}...`);
            const data = yield this.graphql.query({
                query: MetierQueries.load,
                variables: { id },
                fetchPolicy: options && options.fetchPolicy || undefined
            });
            if (data && data.metier) {
                const metier = Metier.fromObject(data.metier, { useChildAttributes: false });
                if (metier && this._debug)
                    console.debug(`[metier-ref-service] Metier #${id} loaded in ${Date.now() - now}ms`, metier);
                return metier;
            }
            return null;
        });
    }
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = this.asFilter(filter);
            if (!filter) {
                console.error('[metier-ref-service] Missing filter');
                throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
            }
            const entityName = filter.entityName || 'Metier';
            const variables = {
                offset: offset || 0,
                size: size || 100,
                sortBy: sortBy || filter.searchAttribute || 'label',
                sortDirection: sortDirection || 'asc'
            };
            const debug = this._debug && (!opts || opts.debug !== false);
            const now = debug && Date.now();
            if (debug)
                console.debug(`[metier-ref-service] Loading Metier items...`, variables, filter);
            const withTotal = (!opts || opts.withTotal !== false);
            // Offline mode: read from the entities storage
            let res;
            const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
            if (offline) {
                const typename = entityName + 'VO';
                res = yield this.entities.loadAll(typename, Object.assign(Object.assign({}, variables), { filter: filter && filter.asFilterFn() }));
            }
            // Online mode: use graphQL
            else {
                const query = withTotal ? MetierQueries.loadAllWithTotal : MetierQueries.loadAll;
                res = yield this.graphql.query({
                    query,
                    variables: Object.assign(Object.assign({}, variables), { filter: filter && filter.asPodObject() }),
                    error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
                    fetchPolicy: opts && opts.fetchPolicy || 'cache-first'
                });
            }
            const entities = (!opts || opts.toEntity !== false) ?
                ((res === null || res === void 0 ? void 0 : res.data) || []).map(value => Metier.fromObject(value, { useChildAttributes: false })) :
                ((res === null || res === void 0 ? void 0 : res.data) || []);
            res = {
                data: entities,
                total: res.total || entities.length
            };
            // Add fetch more capability, if total was fetched
            if (withTotal) {
                const nextOffset = offset + entities.length;
                if (nextOffset < res.total) {
                    res.fetchMore = () => this.loadAll(nextOffset, size, sortBy, sortDirection, filter, opts);
                }
            }
            if (debug)
                console.debug(`[metier-ref-service] Metiers loaded in ${Date.now() - now}ms`);
            return res;
        });
    }
    suggest(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ReferentialUtils.isNotEmpty(value))
                return { data: [value] };
            value = (typeof value === 'string' && value !== '*') && value || undefined;
            return this.loadAll(0, !value ? 30 : 10, undefined, undefined, Object.assign(Object.assign({}, filter), { searchText: value }), { withTotal: true /* used by autocomplete */ });
        });
    }
    asFilter(source) {
        return MetierFilter.fromObject(source);
    }
};
MetierService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        AccountService,
        NetworkService,
        EntitiesStorage])
], MetierService);
export { MetierService };
//# sourceMappingURL=metier.service.js.map