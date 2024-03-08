import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { ErrorCodes } from './errors';
import { AccountService, BaseGraphqlService, CryptoService, EntityUtils, GraphqlService, isNil, isNilOrNaN, isNotNil, isNotNilOrBlank, MINIFY_ENTITY_FOR_POD, ReferentialUtils, StatusIds } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { ReferentialService } from './referential.service';
import { Pmfm } from './model/pmfm.model';
import { of } from 'rxjs';
import { ReferentialFragments } from './referential.fragments';
import { map } from 'rxjs/operators';
import { ReferentialRefService } from './referential-ref.service';
import { CacheService } from 'ionic-cache';
import { ParameterLabelGroups } from '@app/referential/services/model/model.enum';
import { arrayPluck } from '@app/shared/functions';
import { PmfmFilter } from '@app/referential/services/filter/pmfm.filter';
const LoadAllQuery = gql `query Pmfms($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
  data: pmfms(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
    ...LightPmfmFragment
  }
}
${ReferentialFragments.lightPmfm}
`;
const LoadAllWithPartsQuery = gql `query PmfmsWithParts($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput) {
  data: pmfms(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
    ...LightPmfmFragment
    parameter {
      id
      label
      name
      entityName
      __typename
    }
    matrix {
      ...LightReferentialFragment
    }
    fraction {
      ...LightReferentialFragment
    }
    method {
      ...LightReferentialFragment
    }
    unit {
      ...LightReferentialFragment
    }
  }
}
${ReferentialFragments.lightPmfm}
${ReferentialFragments.lightReferential}
`;
const LoadAllWithPartsQueryWithTotal = gql `query PmfmsWithParts($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput) {
  data: pmfms(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
    ...LightPmfmFragment
    parameter {
      id
      label
      name
      entityName
      __typename
    }
    matrix {
      ...LightReferentialFragment
    }
    fraction {
      ...LightReferentialFragment
    }
    method {
      ...LightReferentialFragment
    }
    unit {
      ...LightReferentialFragment
    }
  }
  total: referentialsCount(entityName: "Pmfm", filter: $filter)
}
${ReferentialFragments.lightPmfm}
${ReferentialFragments.lightReferential}
`;
const LoadAllWithDetailsQuery = gql `query PmfmsWithDetails($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
  data: pmfms(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
    ...PmfmFragment
  }
  total: referentialsCount(entityName: "Pmfm", filter: $filter)
}
${ReferentialFragments.pmfm}
${ReferentialFragments.lightReferential}
${ReferentialFragments.referential}
${ReferentialFragments.parameter}
`;
const LoadAllWithTotalQuery = gql `query PmfmsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
  data: pmfms(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
    ...LightPmfmFragment
  }
  total: referentialsCount(entityName: "Pmfm", filter: $filter)
}
${ReferentialFragments.lightPmfm}
`;
const LoadAllIdsQuery = gql `query PmfmIds($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
  data: referentials(entityName: "Pmfm", filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
    id
  }
}`;
const LoadQuery = gql `query Pmfm($label: String, $id: Int){
  data: pmfm(label: $label, id: $id){
    ...PmfmFragment
  }
}
${ReferentialFragments.pmfm}
${ReferentialFragments.lightReferential}
${ReferentialFragments.referential}
${ReferentialFragments.parameter}`;
const LoadPmfmFullQuery = gql `query Pmfm($label: String, $id: Int){
  data: pmfm(label: $label, id: $id){
    ...PmfmFullFragment
  }
}
${ReferentialFragments.pmfmFull}
${ReferentialFragments.lightReferential}
${ReferentialFragments.referential}
${ReferentialFragments.parameter}`;
const SaveQuery = gql `mutation SavePmfm($data: PmfmVOInput!){
  data: savePmfm(pmfm: $data){
    ...PmfmFragment
  }
}
${ReferentialFragments.pmfm}
${ReferentialFragments.lightReferential}
${ReferentialFragments.referential}
${ReferentialFragments.parameter}`;
const PmfmCacheKeys = {
    CACHE_GROUP: 'pmfm',
    PMFM_IDS_BY_PARAMETER_LABEL: 'pmfmIdsByParameter'
};
// TODO BLA: étendre la class BaseReferentialService
let PmfmService = class PmfmService extends BaseGraphqlService {
    constructor(graphql, accountService, referentialService, referentialRefService, cache) {
        super(graphql, environment);
        this.graphql = graphql;
        this.accountService = accountService;
        this.referentialService = referentialService;
        this.referentialRefService = referentialRefService;
        this.cache = cache;
    }
    existsByLabel(label, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(label))
                return false;
            return yield this.referentialService.existsByLabel(label, Object.assign(Object.assign({}, opts), { entityName: 'Pmfm' }));
        });
    }
    load(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._debug)
                console.debug(`[pmfm-service] Loading pmfm {${id}}...`);
            const { data } = yield this.graphql.query({
                query: LoadQuery,
                variables: {
                    id
                },
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' }
            });
            const entity = data && Pmfm.fromObject(data);
            if (this._debug)
                console.debug(`[pmfm-service] Pmfm {${id}} loaded`, entity);
            return entity;
        });
    }
    loadPmfmFull(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrNaN(id))
                throw new Error('Missing required argument \'id\'');
            if (this._debug)
                console.debug(`[pmfm-service] Loading pmfm full {${id}}...`);
            const { data } = yield this.graphql.query({
                query: LoadPmfmFullQuery,
                variables: {
                    id
                },
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' }
            });
            const entity = data && Pmfm.fromObject(data);
            if (this._debug)
                console.debug(`[pmfm-service] Pmfm full {${id}} loaded`, entity);
            return entity;
        });
    }
    canUserWrite(entity, opts) {
        return this.accountService.isAdmin();
    }
    /**
     * Save a pmfm entity
     *
     * @param entity
     */
    save(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            this.fillDefaultProperties(entity);
            // Transform into json
            const json = entity.asObject(MINIFY_ENTITY_FOR_POD);
            const now = Date.now();
            if (this._debug)
                console.debug(`[pmfm-service] Saving Pmfm...`, json);
            // Check label not exists (if new entity)
            if (isNil(entity.id) && isNotNilOrBlank(entity.label)) {
                const exists = yield this.existsByLabel(entity.label);
                if (exists) {
                    throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LABEL_NOT_UNIQUE' };
                }
            }
            yield this.graphql.mutate({
                mutation: SaveQuery,
                variables: {
                    data: json
                },
                error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' },
                update: (proxy, { data }) => {
                    // Update entity
                    const savedEntity = data && data.data;
                    if (savedEntity) {
                        if (this._debug)
                            console.debug(`[pmfm-service] Pmfm saved in ${Date.now() - now}ms`, entity);
                        this.copyIdAndUpdateDate(savedEntity, entity);
                    }
                }
            });
            return entity;
        });
    }
    /**
     * Delete pmfm entities
     */
    delete(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            entity.entityName = 'Pmfm';
            yield this.referentialService.deleteAll([entity]);
        });
    }
    listenChanges(id, options) {
        // TODO
        console.warn('TODO: implement listen changes on pmfm');
        return of();
    }
    watchAll(offset, size, sortBy, sortDirection, filter, opts) {
        filter = this.asFilter(filter);
        opts = opts || {};
        const variables = {
            offset: offset || 0,
            size: size || 100,
            sortBy: sortBy || 'label',
            sortDirection: sortDirection || 'asc',
            filter: filter && filter.asPodObject()
        };
        const now = Date.now();
        if (this._debug)
            console.debug('[pmfm-service] Watching pmfms using options:', variables);
        const query = opts.query ? opts.query : (opts.withDetails ? LoadAllWithDetailsQuery : (opts.withTotal ? LoadAllWithTotalQuery : LoadAllQuery));
        return this.graphql.watchQuery({
            query,
            variables,
            error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
            fetchPolicy: opts && opts.fetchPolicy || undefined
        })
            .pipe(map(({ data, total }) => {
            const entities = (data || []).map(Pmfm.fromObject);
            if (this._debug)
                console.debug(`[pmfm-service] Pmfms loaded in ${Date.now() - now}ms`, entities);
            return {
                data: entities,
                total
            };
        }));
    }
    /**
     * Load pmfms
     *
     * @param offset
     * @param size
     * @param sortBy
     * @param sortDirection
     * @param filter
     * @param opts
     */
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            opts = opts || {};
            filter = this.asFilter(filter);
            const variables = {
                offset: offset || 0,
                size: size || 100,
                sortBy: sortBy || filter.searchAttribute || 'label',
                sortDirection: sortDirection || 'asc',
                filter: filter && filter.asPodObject()
            };
            const debug = this._debug && (opts.debug !== false);
            const now = debug && Date.now();
            if (debug)
                console.debug('[pmfm-service] Loading pmfms... using variables:', variables);
            const query = opts.query ? opts.query : (opts.withDetails ? LoadAllWithDetailsQuery : (opts.withTotal ? LoadAllWithTotalQuery : LoadAllQuery));
            const { data, total } = yield this.graphql.query({
                query,
                variables,
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
                fetchPolicy: opts.fetchPolicy || undefined
            });
            const entities = opts.toEntity !== false ?
                (data || []).map(Pmfm.fromObject) :
                (data || []);
            const res = {
                data: entities,
                total
            };
            // Add fetch more capability, if total was fetched
            if (opts.withTotal) {
                const nextOffset = offset + entities.length;
                if (nextOffset < res.total) {
                    res.fetchMore = () => this.loadAll(nextOffset, size, sortBy, sortDirection, filter, opts);
                }
            }
            if (debug)
                console.debug(`[pmfm-service] Pmfms loaded in ${Date.now() - now}ms`);
            return res;
        });
    }
    saveAll(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                return data;
            return yield Promise.all(data.map(pmfm => this.save(pmfm, options)));
        });
    }
    deleteAll(data, options) {
        throw new Error('Not implemented yet');
    }
    suggest(value, filter, sortBy, sortDirection) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ReferentialUtils.isNotEmpty(value))
                return { data: [value] };
            value = (typeof value === 'string' && value !== '*') && value || undefined;
            return this.loadAll(0, !value ? 30 : 10, sortBy, sortDirection, Object.assign(Object.assign({}, filter), { searchText: value }), {
                query: LoadAllWithPartsQueryWithTotal,
                withTotal: true /*need for fetch more*/
            });
        });
    }
    /**
     * Get referential references, group by level labels
     *
     * @param parameterLabelsMap
     * @param opts
     */
    loadIdsGroupByParameterLabels(parameterLabelsMap, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure enumeration has been override by config
            yield this.referentialRefService.ready();
            parameterLabelsMap = parameterLabelsMap || ParameterLabelGroups;
            if (!opts || opts.cache !== false) {
                const cacheKey = [
                    PmfmCacheKeys.PMFM_IDS_BY_PARAMETER_LABEL,
                    CryptoService.sha256(JSON.stringify(parameterLabelsMap)).substring(0, 8) // Create a unique hash, from args
                ].join('|');
                return this.cache.getOrSetItem(cacheKey, () => this.loadIdsGroupByParameterLabels(parameterLabelsMap, { cache: false }), PmfmCacheKeys.CACHE_GROUP);
            }
            // Load pmfms grouped by parameter labels
            const groupedPmfms = yield this.referentialRefService.loadAllGroupByLevels({
                entityName: 'Pmfm',
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
            }, { levelLabels: parameterLabelsMap }, { toEntity: false, debug: this._debug });
            // Keep only id
            return Object.keys(groupedPmfms).reduce((res, key) => {
                res[key] = arrayPluck(groupedPmfms[key], 'id');
                return res;
            }, {});
        });
    }
    asFilter(filter) {
        return PmfmFilter.fromObject(filter);
    }
    /* -- protected methods -- */
    fillDefaultProperties(entity) {
        entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.ENABLE;
    }
    copyIdAndUpdateDate(source, target) {
        EntityUtils.copyIdAndUpdateDate(source, target);
        // Update Qualitative values
        if (source.qualitativeValues && target.qualitativeValues) {
            target.qualitativeValues.forEach(entity => {
                const savedQualitativeValue = source.qualitativeValues.find(json => entity.equals(json));
                EntityUtils.copyIdAndUpdateDate(savedQualitativeValue, entity);
            });
        }
    }
};
PmfmService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        AccountService,
        ReferentialService,
        ReferentialRefService,
        CacheService])
], PmfmService);
export { PmfmService };
//# sourceMappingURL=pmfm.service.js.map