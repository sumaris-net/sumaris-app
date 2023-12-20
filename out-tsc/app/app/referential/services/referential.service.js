import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { gql } from '@apollo/client/core';
import { map } from 'rxjs/operators';
import { ErrorCodes } from './errors';
import { AccountService, BaseGraphqlService, EntityUtils, GraphqlService, isNil, isNotNil, LocalSettingsService, StatusIds, toNumber, } from '@sumaris-net/ngx-components';
import { ReferentialFragments } from './referential.fragments';
import { environment } from '@environments/environment';
import { ReferentialFilter } from './filter/referential.filter';
import { FullReferential } from '@app/referential/services/model/referential.model';
export const ReferentialQueries = {
    // Load
    load: gql `query Referential($entityName: String, $id: Int){
    data: referential(entityName: $entityName, id: $id){
      ...FullReferentialFragment
    }
  }
  ${ReferentialFragments.fullReferential}`,
    // Load all full
    loadAllFull: gql `query FullReferentials($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...FullReferentialFragment
    }
  }
  ${ReferentialFragments.fullReferential}`,
    // Load all
    loadAll: gql `query Referentials($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...ReferentialFragment
    }
  }
  ${ReferentialFragments.referential}`,
    // Load all with total
    loadAllWithTotal: gql `query ReferentialsWithTotal($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
      data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
        ...ReferentialFragment
      }
      total: referentialsCount(entityName: $entityName, filter: $filter)
    }
    ${ReferentialFragments.referential}`,
    countAll: gql `query ReferentialsCount($entityName: String, $filter: ReferentialFilterVOInput){
    total: referentialsCount(entityName: $entityName, filter: $filter)
  }`,
    loadTypes: gql `query ReferentialTypes{
    data: referentialTypes {
      id
      level
      __typename
    }
  }`
};
const ReferentialMutations = {
    saveAll: gql `mutation SaveReferentials($data:[ReferentialVOInput]){
    data: saveReferentials(referentials: $data){
      ...ReferentialFragment
    }
  }
  ${ReferentialFragments.referential}`,
    deleteAll: gql `
    mutation deleteReferentials($entityName: String!, $ids:[Int]){
      deleteReferentials(entityName: $entityName, ids: $ids)
    }`
};
const ReferentialSubscriptions = {
    listenChanges: gql `subscription UpdateReferential($entityName: String!, $id: Int!, $interval: Int){
    data: updateReferential(entityName: $entityName, id: $id, interval: $interval) {
      ...ReferentialFragment
    }
  }
  ${ReferentialFragments.referential}`,
};
export const DATA_TYPE = new InjectionToken('dataType');
let ReferentialService = class ReferentialService extends BaseGraphqlService {
    constructor(graphql, accountService, settings, dataType) {
        super(graphql, environment);
        this.graphql = graphql;
        this.accountService = accountService;
        this.settings = settings;
        this.queries = ReferentialQueries;
        this.mutations = ReferentialMutations;
        this.dataType = dataType || FullReferential;
        this.settings.ready().then(() => {
            // No limit for updatable watch queries, if desktop. Limit to 3 when mobile
            this._mutableWatchQueriesMaxCount = this.settings.mobile ? 3 : -1;
        });
        // For DEV only
        this._debug = !environment.production;
    }
    watchAll(offset, size, sortBy, sortDirection, filter, opts) {
        if (!filter || !filter.entityName) {
            console.error('[referential-service] Missing filter.entityName');
            // eslint-disable-next-line no-throw-literal
            throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
        }
        filter = this.asFilter(filter);
        const entityName = filter.entityName;
        const uniqueEntityName = filter.entityName + (filter.searchJoin || '');
        const variables = {
            entityName,
            offset: offset || 0,
            size: size || 100,
            sortBy: sortBy || 'label',
            sortDirection: sortDirection || 'asc',
            filter: filter && filter.asPodObject()
        };
        let now = this._debug && Date.now();
        if (this._debug)
            console.debug(`[referential-service] Loading ${uniqueEntityName}...`, variables);
        const withTotal = (!opts || opts.withTotal !== false);
        const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
        return this.mutableWatchQuery({
            queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
            query,
            arrayFieldName: 'data',
            totalFieldName: withTotal ? 'total' : undefined,
            insertFilterFn: (d) => d.entityName === entityName,
            variables,
            error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
            fetchPolicy: opts && opts.fetchPolicy || 'network-only'
        })
            .pipe(map(({ data, total }) => {
            const entities = (data || []).map(json => this.fromObject(json));
            entities.forEach(r => r.entityName = uniqueEntityName);
            if (now) {
                console.debug(`[referential-service] ${uniqueEntityName} loaded in ${Date.now() - now}ms`, entities);
                now = null;
            }
            return {
                data: entities,
                total
            };
        }));
    }
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!filter || !filter.entityName) {
                console.error('[referential-service] Missing filter.entityName');
                // eslint-disable-next-line no-throw-literal
                throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
            }
            filter = this.asFilter(filter);
            const entityName = filter.entityName;
            const uniqueEntityName = filter.entityName + (filter.searchJoin || '');
            const debug = this._debug && (!opts || opts.debug !== false);
            const variables = {
                entityName,
                offset: offset || 0,
                size: size || 100,
                sortBy: sortBy || filter.searchAttribute || 'label',
                sortDirection: sortDirection || 'asc',
                filter: filter && filter.asPodObject()
            };
            const now = Date.now();
            if (debug)
                console.debug(`[referential-service] Loading ${uniqueEntityName} items...`, variables);
            const withTotal = (!opts || opts.withTotal !== false);
            const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
            const res = yield this.graphql.query({
                query,
                variables,
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
                fetchPolicy: opts && opts.fetchPolicy || 'network-only'
            });
            let data = (res && res.data || []);
            // Always use unique entityName, if need
            if (filter.entityName !== uniqueEntityName) {
                data = data.map(r => (Object.assign(Object.assign({}, r), { entityName: uniqueEntityName })));
            }
            // Convert to entities
            const entities = (!opts || opts.toEntity !== false)
                ? data.map(json => this.fromObject(json))
                : data;
            if (debug)
                console.debug(`[referential-service] ${uniqueEntityName} items loaded in ${Date.now() - now}ms`);
            return {
                data: entities,
                total: res.total
            };
        });
    }
    saveAll(entities, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!entities)
                return entities;
            // Nothing to save: skip
            if (!entities.length)
                return;
            const entityName = entities[0].entityName;
            if (!entityName) {
                console.error('[referential-service] Could not save referential: missing entityName');
                throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' };
            }
            if (entities.length !== entities.filter(e => e.entityName === entityName).length) {
                console.error('[referential-service] Could not save referential: more than one entityName found in the array to save!');
                throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' };
            }
            const json = entities.map(entity => this.asObject(entity));
            const now = Date.now();
            if (this._debug)
                console.debug(`[referential-service] Saving all ${entityName}...`, json);
            yield this.graphql.mutate({
                mutation: this.mutations.saveAll,
                variables: {
                    data: json
                },
                error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' },
                update: (cache, { data }) => {
                    const savedEntities = data === null || data === void 0 ? void 0 : data.data;
                    if (savedEntities) {
                        // Update entities (id and update date)
                        entities.forEach(entity => {
                            const savedEntity = savedEntities.find(e => (e.id === entity.id || e.label === entity.label));
                            if (savedEntity !== entity) {
                                EntityUtils.copyIdAndUpdateDate(savedEntity, entity);
                            }
                        });
                        // Update the cache
                        this.insertIntoMutableCachedQueries(cache, {
                            queries: this.getLoadQueries(),
                            data: savedEntities
                        });
                    }
                    if (this._debug)
                        console.debug(`[referential-service] ${entityName} saved in ${Date.now() - now}ms`, entities);
                }
            });
            return entities;
        });
    }
    load(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!opts || !opts.entityName) {
                console.error('[referential-service] Missing opts.entityName');
                // eslint-disable-next-line no-throw-literal
                throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
            }
            const { data } = yield this.graphql.query({
                query: ReferentialQueries.load,
                variables: {
                    entityName: opts.entityName,
                    id
                },
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' }
            });
            const target = this.fromObject(data);
            return target;
        });
    }
    delete(data, opts) {
        return this.deleteAll([data], opts);
    }
    canUserWrite(data, opts) {
        return this.accountService.isAdmin();
    }
    listenChanges(id, opts) {
        if (isNil(id))
            throw Error('Missing argument \'id\' ');
        if (isNil(opts.entityName))
            throw Error('Missing argument \'opts.entityName\' ');
        const variables = Object.assign({ id, entityName: opts.entityName, interval: toNumber(opts && opts.interval, 0) }, opts === null || opts === void 0 ? void 0 : opts.variables);
        if (this._debug)
            console.debug(this._logPrefix + `[WS] Listening for changes on ${opts.entityName}#${id}...`);
        return this.graphql.subscribe({
            query: ReferentialSubscriptions.listenChanges,
            variables,
            error: {
                code: ErrorCodes.SUBSCRIBE_REFERENTIAL_ERROR,
                message: 'ERROR.SUBSCRIBE_REFERENTIAL_ERROR'
            }
        })
            .pipe(map(({ data }) => {
            const entity = (!opts || opts.toEntity !== false) ? data && this.fromObject(data) : data;
            if (entity && this._debug)
                console.debug(this._logPrefix + `[WS] Received changes on ${opts.entityName}#${id}`, entity);
            // TODO: missing = deleted ?
            if (!entity)
                console.warn(this._logPrefix + `[WS] Received deletion on ${opts.entityName}#${id} - TODO check implementation`);
            return entity;
        }));
    }
    existsByLabel(label, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!filter || !filter.entityName || !label) {
                console.error('[referential-service] Missing \'filter.entityName\' or \'label\'');
                throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
            }
            filter = this.asFilter(filter);
            filter.label = label;
            const { total } = yield this.graphql.query({
                query: this.queries.countAll,
                variables: {
                    entityName: filter.entityName,
                    filter: filter.asPodObject()
                },
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
                fetchPolicy: opts && opts.fetchPolicy || 'network-only'
            });
            return total > 0;
        });
    }
    /**
     * Save a referential entity
     *
     * @param entity
     * @param options
     */
    save(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!entity.entityName) {
                console.error('[referential-service] Missing entityName');
                throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' };
            }
            // Transform into json
            const json = this.asObject(entity);
            const isNew = isNil(json.id);
            const now = Date.now();
            if (this._debug)
                console.debug(`[referential-service] Saving ${entity.entityName}...`, json);
            yield this.graphql.mutate({
                mutation: this.mutations.saveAll,
                variables: {
                    data: [json]
                },
                error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' },
                update: (cache, { data }) => {
                    // Update entity
                    const savedEntity = data && data.data && data.data[0];
                    if (savedEntity !== entity) {
                        if (this._debug)
                            console.debug(`[referential-service] ${entity.entityName} saved in ${Date.now() - now}ms`, entity);
                        EntityUtils.copyIdAndUpdateDate(savedEntity, entity);
                    }
                    // Update the cache
                    if (isNew) {
                        this.insertIntoMutableCachedQueries(cache, {
                            queries: this.getLoadQueries(),
                            data: savedEntity
                        });
                    }
                    if (options === null || options === void 0 ? void 0 : options.update) {
                        options.update(cache, { data });
                    }
                }
            });
            return entity;
        });
    }
    /**
     * Delete referential entities
     */
    deleteAll(entities, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // Filter saved entities
            entities = entities && entities
                .filter(e => !!e.id && !!e.entityName) || [];
            // Nothing to save: skip
            if (!entities.length)
                return;
            const entityName = entities[0].entityName;
            const ids = entities.filter(e => e.entityName === entityName).map(t => t.id);
            // Check that all entities have the same entityName
            if (entities.length > ids.length) {
                console.error('[referential-service] Could not delete referentials: only one entityName is allowed');
                throw { code: ErrorCodes.DELETE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.DELETE_REFERENTIAL_ERROR' };
            }
            const now = new Date();
            if (this._debug)
                console.debug(`[referential-service] Deleting ${entityName}...`, ids);
            yield this.graphql.mutate({
                mutation: this.mutations.deleteAll,
                variables: {
                    entityName,
                    ids
                },
                error: { code: ErrorCodes.DELETE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.DELETE_REFERENTIAL_ERROR' },
                update: (proxy) => {
                    // Remove from cache
                    this.removeFromMutableCachedQueriesByIds(proxy, {
                        queries: this.getLoadQueries(),
                        ids
                    });
                    if (options && options.update) {
                        options.update(proxy);
                    }
                    if (this._debug)
                        console.debug(`[referential-service] ${entityName} deleted in ${new Date().getTime() - now.getTime()}ms`);
                }
            });
        });
    }
    /**
     * Load referential types
     */
    watchTypes() {
        if (this._debug)
            console.debug('[referential-service] Loading referential types...');
        return this.graphql.watchQuery({
            query: this.queries.loadTypes,
            variables: null,
            error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' }
        })
            .pipe(map(({ data }) => (data || [])));
    }
    asFilter(filter) {
        return ReferentialFilter.fromObject(filter);
    }
    /* -- protected methods -- */
    fromObject(source, opts) {
        const target = new this.dataType();
        target.fromObject(source, opts);
        return target;
    }
    asObject(source, opts) {
        return source.asObject(opts);
    }
    fillDefaultProperties(entity) {
        entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.ENABLE;
    }
    getLoadQueries() {
        return [this.queries.loadAll, this.queries.loadAllWithTotal].filter(isNotNil);
    }
};
ReferentialService = __decorate([
    Injectable({ providedIn: 'root' }),
    __param(3, Optional()),
    __param(3, Inject(DATA_TYPE)),
    __metadata("design:paramtypes", [GraphqlService,
        AccountService,
        LocalSettingsService, Function])
], ReferentialService);
export { ReferentialService };
//# sourceMappingURL=referential.service.js.map