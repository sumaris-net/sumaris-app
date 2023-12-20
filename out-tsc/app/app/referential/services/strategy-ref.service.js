import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable, Injector } from '@angular/core';
import { gql } from '@apollo/client/core';
import { ReferentialFragments } from './referential.fragments';
import { AccountService, EntitiesStorage, firstArrayValue, fromDateISOString, isEmptyArray, isNil, isNotNil, NetworkService, } from '@sumaris-net/ngx-components';
import { CacheService } from 'ionic-cache';
import { ErrorCodes } from './errors';
import { Strategy } from './model/strategy.model';
import { StrategyFragments } from './strategy.fragments';
import { defer, firstValueFrom, Subject, tap } from 'rxjs';
import { filter, finalize, map } from 'rxjs/operators';
import { BaseReferentialService } from './base-referential-service.class';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { DenormalizedPmfmStrategyFilter } from '@app/referential/services/filter/pmfm-strategy.filter';
const Queries = {
    load: gql `
    query StrategyRef($id: Int!) {
      data: strategy(id: $id) {
        ...StrategyRefFragment
      }
    }
    ${StrategyFragments.strategyRef}
    ${StrategyFragments.denormalizedPmfmStrategy}
    ${StrategyFragments.taxonGroupStrategy}
    ${StrategyFragments.taxonNameStrategy}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.taxonName}
  `,
    loadAll: gql `
    query StrategyRefs($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...LightStrategyRefFragment
      }
    }
    ${StrategyFragments.lightStrategyRef}
  `,
    loadAllWithTotal: gql `
    query StrategyRefWithTotal($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...LightStrategyRefFragment
      }
      total: strategiesCount(filter: $filter)
    }
    ${StrategyFragments.lightStrategyRef}
  `,
    loadAllFull: gql `
    query StrategyRefs($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...StrategyRefFragment
      }
    }
    ${StrategyFragments.strategyRef}
    ${StrategyFragments.denormalizedPmfmStrategy}
    ${StrategyFragments.taxonGroupStrategy}
    ${StrategyFragments.taxonNameStrategy}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.taxonName}
  `,
    loadAllFullWithTotal: gql `
    query StrategyRefWithTotal($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...StrategyRefFragment
      }
      total: strategiesCount(filter: $filter)
    }
    ${StrategyFragments.strategyRef}
    ${StrategyFragments.denormalizedPmfmStrategy}
    ${StrategyFragments.taxonGroupStrategy}
    ${StrategyFragments.taxonNameStrategy}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.taxonName}
  `,
};
const StrategyRefSubscriptions = {
    listenChangesByProgram: gql `subscription LastStrategiesUpdateDate($filter: StrategyFilterVOInput!, $interval: Int){
    data: lastStrategiesUpdateDate(filter: $filter, interval: $interval)
  }`
};
const StrategyRefCacheKeys = {
    CACHE_GROUP: 'strategy',
    STRATEGY_BY_LABEL: 'strategyByLabel',
    STRATEGY_BY_FILTER: 'strategyByFilter',
    PMFMS_BY_FILTER: 'pmfmsByFilter',
    LAST_UPDATE_DATE_BY_PROGRAM_ID: 'strategiesByProgramId'
};
const STRATEGY_NOT_FOUND = Object.freeze({});
let StrategyRefService = class StrategyRefService extends BaseReferentialService {
    constructor(injector, network, accountService, cache, entities) {
        super(injector, Strategy, StrategyFilter, {
            queries: Queries
        });
        this.network = network;
        this.accountService = accountService;
        this.cache = cache;
        this.entities = entities;
        this._subscriptionCache = {};
    }
    /**
     * Watch strategy by label
     *
     * @param dataFilter
     * @param opts
     */
    watchByFilter(dataFilter, opts) {
        var _a;
        if (isNil(dataFilter === null || dataFilter === void 0 ? void 0 : dataFilter.programId)) {
            console.error('[strategy-ref-service] Missing \'filter.programId\'');
            throw { code: ErrorCodes.LOAD_STRATEGY_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_ERROR' };
        }
        const toEntityOrError = (data) => {
            if (typeof data === 'string')
                throw new Error(data);
            if (!data)
                return undefined;
            return (opts === null || opts === void 0 ? void 0 : opts.toEntity) !== false ? Strategy.fromObject(data) : data;
        };
        // Load from cache
        if (!opts || opts.cache !== false) {
            const cacheKey = [StrategyRefCacheKeys.STRATEGY_BY_FILTER, dataFilter.programId, JSON.stringify(Object.assign(Object.assign(Object.assign(Object.assign({}, dataFilter), { location: (_a = dataFilter === null || dataFilter === void 0 ? void 0 : dataFilter.location) === null || _a === void 0 ? void 0 : _a.id }), opts), { cache: undefined, toEntity: undefined, debug: undefined }))].join('|');
            return this.cache.loadFromObservable(cacheKey, defer(() => this.watchByFilter(dataFilter, Object.assign(Object.assign({}, opts), { toEntity: false, cache: false, debug: false }))), StrategyRefCacheKeys.CACHE_GROUP)
                .pipe(map(toEntityOrError));
        }
        // DEBUG
        const debug = (opts === null || opts === void 0 ? void 0 : opts.debug) || (this._debug && (!opts || opts.debug !== false));
        if (debug)
            console.debug('[strategy-ref-service] Watching strategy by filter...', dataFilter);
        let startTime = debug && Date.now();
        let res;
        // Load locally
        const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
        if (offline) {
            dataFilter = this.asFilter(dataFilter);
            res = this.entities.watchAll(Strategy.TYPENAME, {
                offset: 0, size: 1, sortBy: 'id', sortDirection: 'desc',
                filter: dataFilter === null || dataFilter === void 0 ? void 0 : dataFilter.asFilterFn()
            });
        }
        // Load remotely
        else {
            dataFilter = this.asFilter(dataFilter);
            // Fetch total, if need to detect duplicated strategy
            const withTotal = (opts === null || opts === void 0 ? void 0 : opts.withTotal) || (opts === null || opts === void 0 ? void 0 : opts.failIfMany);
            const query = (opts === null || opts === void 0 ? void 0 : opts.query) || (((opts === null || opts === void 0 ? void 0 : opts.fullLoad) !== false)
                ? (withTotal ? this.queries.loadAllFullWithTotal : this.queries.loadAllFull)
                : (withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll));
            res = this.graphql.watchQuery({
                query,
                variables: {
                    offset: 0, size: 1, sortBy: 'id', sortDirection: 'desc',
                    filter: dataFilter === null || dataFilter === void 0 ? void 0 : dataFilter.asPodObject()
                },
                // Important: do NOT using cache here, as default (= 'no-cache')
                // because cache is manage by Ionic cache (easier to clean)
                fetchPolicy: opts && opts.fetchPolicy || 'no-cache',
                error: { code: ErrorCodes.LOAD_STRATEGY_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_ERROR' }
            });
        }
        return res.pipe(filter(isNotNil), map(({ data, total }) => {
            if ((opts === null || opts === void 0 ? void 0 : opts.failIfMissing) && isEmptyArray(data))
                return 'PROGRAM.STRATEGY.ERROR.STRATEGY_NOT_FOUND_OR_ALLOWED';
            if ((opts === null || opts === void 0 ? void 0 : opts.failIfMany) && isNotNil(total) && total > 1)
                return 'PROGRAM.STRATEGY.ERROR.STRATEGY_DUPLICATED';
            return firstArrayValue(data) || STRATEGY_NOT_FOUND;
        }), map(toEntityOrError), 
        // DEBUG
        tap(_ => {
            if (startTime) {
                console.debug(`[strategy-service] Watching strategy [OK] in ${Date.now() - startTime}ms`);
                startTime = undefined;
            }
        }));
    }
    /**
     * Watch strategy by label
     *
     * @param label
     * @param dataFilter
     * @param opts
     */
    watchByLabel(label, dataFilter, opts) {
        if (!label) {
            console.error('[strategy-ref-service] Missing \'label\'');
            throw { code: ErrorCodes.LOAD_STRATEGY_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_ERROR' };
        }
        return this.watchByFilter(Object.assign(Object.assign({}, dataFilter), { label }), Object.assign(Object.assign({}, opts), { failIfMissing: true, failIfMany: true }));
    }
    /**
     *
     * @param label
     * @param filter
     * @param opts
     */
    loadByLabel(label, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return firstValueFrom(this.watchByLabel(label, filter, opts));
        });
    }
    loadByFilter(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return firstValueFrom(this.watchByFilter(filter, opts));
        });
    }
    /**
     * Watch strategy pmfms
     */
    watchPmfms(filter, opts) {
        const toEntities = (opts === null || opts === void 0 ? void 0 : opts.toEntity) !== false ? DenormalizedPmfmStrategy.fromObjects : (data) => data;
        // Use cache (enable by default)
        if (!opts || opts.cache !== false) {
            const cacheKey = [StrategyRefCacheKeys.PMFMS_BY_FILTER, JSON.stringify(filter)].join('|');
            return this.cache.loadFromObservable(cacheKey, defer(() => this.watchPmfms(filter, Object.assign(Object.assign({}, opts), { cache: false, toEntity: false }))), StrategyRefCacheKeys.CACHE_GROUP)
                .pipe(map(toEntities));
        }
        // DEBUG
        //console.debug(`[program-ref-service] Watching '${programLabel}' pmfms...`, acquisitionLevels);
        // Watch the full strategy
        return this.watchByFilter(filter, { toEntity: false, fullLoad: true })
            .pipe(
        // Filter strategy's pmfms
        map(strategy => {
            const filterFn = DenormalizedPmfmStrategyFilter.fromObject(opts).asFilterFn();
            if (!filterFn)
                throw new Error('Missing opts to filter pmfm (.e.g opts.acquisitionLevel)!');
            return ((strategy === null || strategy === void 0 ? void 0 : strategy.denormalizedPmfms) || []).filter(filterFn);
        }), 
        // Merge duplicated pmfms (make to a unique pmfm, by id)
        map(pmfms => pmfms.reduce((res, p) => {
            const index = res.findIndex(other => other.id === p.id);
            if (index !== -1) {
                console.warn('[program-ref-service] Merging duplicated pmfms:', res[index], p);
                res[index] = DenormalizedPmfmStrategy.merge(res[index], p);
                return res;
            }
            return res.concat(p);
        }, [])), 
        // Sort on rank order (asc)
        map(data => data.sort((p1, p2) => p1.rankOrder - p2.rankOrder)), map(toEntities), tap(data => {
            if (opts === null || opts === void 0 ? void 0 : opts.debug)
                console.debug(`[strategy-ref-service] Found ${data.length} PMFM for ${opts.acquisitionLevel}`, data);
        }));
    }
    /**
     * Load strategy pmfms
     */
    loadPmfms(filter, options) {
        return firstValueFrom(this.watchPmfms(filter, options));
    }
    clearCache() {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('[strategy-ref-service] Clearing strategy cache...');
            yield this.cache.clearGroup(StrategyRefCacheKeys.CACHE_GROUP);
        });
    }
    listenChangesByProgram(programId, opts) {
        if (isNil(programId))
            throw Error('Missing argument \'programId\' ');
        const cacheKey = [StrategyRefCacheKeys.LAST_UPDATE_DATE_BY_PROGRAM_ID, programId].join('|');
        let cache = this._subscriptionCache[cacheKey];
        if (!cache) {
            if (this._debug)
                console.debug(`[strategy-ref-service] [WS] Listening for changes on strategies, from program {${programId}}...`);
            const program$ = this.graphql.subscribe({
                query: StrategyRefSubscriptions.listenChangesByProgram,
                fetchPolicy: 'no-cache',
                variables: {
                    filter: { programIds: [programId] },
                    interval: (opts === null || opts === void 0 ? void 0 : opts.interval) || 30 // seconds
                },
                error: {
                    code: ErrorCodes.SUBSCRIBE_REFERENTIAL_ERROR,
                    message: 'REFERENTIAL.ERROR.SUBSCRIBE_REFERENTIAL_ERROR'
                }
            })
                .pipe(map(({ data }) => fromDateISOString(data)));
            const subject = new Subject();
            cache = {
                subject,
                subscription: program$.subscribe(subject)
            };
            this._subscriptionCache[cacheKey] = cache;
        }
        return cache.subject.asObservable()
            .pipe(finalize(() => {
            // DEBUG
            //console.debug(`[strategy-ref-service] Finalize strategies changes for program {${id}}(${cache.subject.observers.length} observers)`);
            // Wait 100ms (to avoid to recreate if new subscription comes less than 100ms after)
            setTimeout(() => {
                if (cache.subject.observed)
                    return; // Skip if still observed
                // DEBUG
                //console.debug(`[strategy-ref-service] Closing strategies changes for program {${id}}(${cache.subject.observers.length} observers)`);
                this._subscriptionCache[cacheKey] = undefined;
                cache.subject.complete();
                cache.subject.unsubscribe();
                cache.subscription.unsubscribe();
            }, 100);
        }));
    }
};
StrategyRefService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [Injector,
        NetworkService,
        AccountService,
        CacheService,
        EntitiesStorage])
], StrategyRefService);
export { StrategyRefService };
//# sourceMappingURL=strategy-ref.service.js.map