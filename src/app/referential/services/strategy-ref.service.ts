import { Injectable, Injector } from '@angular/core';
import { gql } from '@apollo/client/core';
import { ReferentialFragments } from './referential.fragments';
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import {
  AccountService,
  BaseEntityGraphqlQueries,
  EntitiesStorage,
  EntityServiceLoadOptions,
  EntityServiceWatchOptions,
  EntityUtils,
  firstArrayValue,
  fromDateISOString,
  isEmptyArray,
  isNil,
  isNotNil,
  LoadResult,
  NetworkService,
} from '@sumaris-net/ngx-components';
import { CacheService } from 'ionic-cache';
import { ErrorCodes } from './errors';
import { Strategy } from './model/strategy.model';
import { StrategyFragments } from './strategy.fragments';
import { defer, firstValueFrom, Observable, Subject, Subscription, tap } from 'rxjs';
import { filter, finalize, map } from 'rxjs/operators';
import { BaseReferentialService } from './base-referential-service.class';
import { Moment } from 'moment';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { DenormalizedPmfmStrategyFilter } from '@app/referential/services/filter/pmfm-strategy.filter';
import { DenormalizedPmfmFilter } from '@app/referential/services/filter/pmfm.filter';

export interface StrategyRefLoadOptions extends EntityServiceLoadOptions {
  debug?: boolean;
  cache?: boolean;
  fullLoad?: boolean;
}

export interface StrategyRefWatchOptions extends EntityServiceWatchOptions {
  debug?: boolean;
  cache?: boolean;
  fullLoad?: boolean;
  withTotal?: boolean;
}

export interface StrategyRefQueries extends BaseEntityGraphqlQueries {
  loadAllFull: any;
  loadAllFullWithTotal: any;
  withTotal?: boolean;
}

const Queries: StrategyRefQueries = {
  load: gql`
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

  loadAll: gql`
    query StrategyRefs($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...LightStrategyRefFragment
      }
    }
    ${StrategyFragments.lightStrategyRef}
  `,

  loadAllWithTotal: gql`
    query StrategyRefWithTotal($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...LightStrategyRefFragment
      }
      total: strategiesCount(filter: $filter)
    }
    ${StrategyFragments.lightStrategyRef}
  `,

  loadAllFull: gql`
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

  loadAllFullWithTotal: gql`
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
  listenChangesByProgram: gql`
    subscription LastStrategiesUpdateDate($filter: StrategyFilterVOInput!, $interval: Int) {
      data: lastStrategiesUpdateDate(filter: $filter, interval: $interval)
    }
  `,
};

const StrategyRefCacheKeys = {
  CACHE_GROUP: 'strategy',

  STRATEGY_BY_LABEL: 'strategyByLabel',
  STRATEGY_BY_FILTER: 'strategyByFilter',
  PMFMS_BY_FILTER: 'pmfmsByFilter',
  LAST_UPDATE_DATE_BY_PROGRAM_ID: 'strategiesByProgramId',
};

const STRATEGY_NOT_FOUND = Object.freeze(<Strategy>{});

@Injectable({ providedIn: 'root' })
export class StrategyRefService extends BaseReferentialService<
  Strategy,
  StrategyFilter,
  number,
  StrategyRefWatchOptions,
  StrategyRefLoadOptions,
  StrategyRefQueries
> {
  private _subscriptionCache: {
    [key: string]: {
      subject: Subject<any>;
      subscription: Subscription;
    };
  } = {};

  constructor(
    injector: Injector,
    protected network: NetworkService,
    protected accountService: AccountService,
    protected cache: CacheService,
    protected entities: EntitiesStorage
  ) {
    super(injector, Strategy, StrategyFilter, {
      queries: Queries,
    });
  }

  /**
   * Watch strategy by label
   *
   * @param dataFilter
   * @param opts
   */
  watchByFilter(
    dataFilter?: Partial<StrategyFilter>,
    opts?: StrategyRefWatchOptions & { failIfMissing?: boolean; failIfMany?: boolean }
  ): Observable<Strategy> {
    if (isNil(dataFilter?.programId)) {
      console.error("[strategy-ref-service] Missing 'filter.programId'");
      throw { code: ErrorCodes.LOAD_STRATEGY_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_ERROR' };
    }

    const toEntityOrError = (data: Strategy | string) => {
      if (typeof data === 'string') throw new Error(data);
      if (EntityUtils.isEmpty(data, 'id')) return undefined;
      return opts?.toEntity !== false ? Strategy.fromObject(data) : (data as Strategy);
    };

    // Load from cache
    if (!opts || opts.cache !== false) {
      const cacheKey = [
        StrategyRefCacheKeys.STRATEGY_BY_FILTER,
        dataFilter.programId,
        JSON.stringify({ ...dataFilter, location: dataFilter?.location?.id, ...opts, cache: undefined, toEntity: undefined, debug: undefined }),
      ].join('|');
      return this.cache
        .loadFromObservable<Strategy>(
          cacheKey,
          defer(() => this.watchByFilter(dataFilter, { ...opts, toEntity: false, cache: false, debug: false })),
          StrategyRefCacheKeys.CACHE_GROUP
        )
        .pipe(map(toEntityOrError));
    }

    // DEBUG
    const debug = opts?.debug || (this._debug && (!opts || opts.debug !== false));
    if (debug) console.debug('[strategy-ref-service] Watching strategy by filter...', dataFilter);
    let startTime: number = debug && Date.now();

    let res: Observable<LoadResult<Strategy>>;

    // Load locally
    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      dataFilter = this.asFilter(dataFilter);
      res = this.entities.watchAll<Strategy>(Strategy.TYPENAME, {
        offset: 0,
        size: 1,
        sortBy: 'id',
        sortDirection: 'desc',
        filter: dataFilter?.asFilterFn(),
      });
    }

    // Load remotely
    else {
      dataFilter = this.asFilter(dataFilter);
      // Fetch total, if need to detect duplicated strategy
      const withTotal = opts?.withTotal || opts?.failIfMany;
      const query =
        opts?.query ||
        (opts?.fullLoad !== false
          ? withTotal
            ? this.queries.loadAllFullWithTotal
            : this.queries.loadAllFull
          : withTotal
            ? this.queries.loadAllWithTotal
            : this.queries.loadAll);
      res = this.graphql.watchQuery<LoadResult<Strategy>>({
        query,
        variables: {
          offset: 0,
          size: 1,
          sortBy: 'id',
          sortDirection: 'desc',
          filter: dataFilter?.asPodObject(),
        },
        // Important: do NOT using cache here, as default (= 'no-cache')
        // because cache is manage by Ionic cache (easier to clean)
        fetchPolicy: (opts && opts.fetchPolicy) || 'no-cache',
        error: { code: ErrorCodes.LOAD_STRATEGY_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_ERROR' },
      });
    }

    return res.pipe(
      filter(isNotNil),
      map(({ data, total }) => {
        if (opts?.failIfMissing && isEmptyArray(data)) return 'PROGRAM.STRATEGY.ERROR.STRATEGY_NOT_FOUND_OR_ALLOWED';
        if (opts?.failIfMany && isNotNil(total) && total > 1) return 'PROGRAM.STRATEGY.ERROR.STRATEGY_DUPLICATED';
        return firstArrayValue(data);
      }),
      map((json) => toEntityOrError(json) || STRATEGY_NOT_FOUND),

      // DEBUG
      tap((_) => {
        if (startTime) {
          console.debug(`[strategy-service] Watching strategy [OK] in ${Date.now() - startTime}ms`);
          startTime = undefined;
        }
      })
    );
  }

  /**
   * Watch strategy by label
   *
   * @param label
   * @param dataFilter
   * @param opts
   */
  watchByLabel(label: string, dataFilter?: Partial<StrategyFilter>, opts?: StrategyRefWatchOptions): Observable<Strategy> {
    if (!label) {
      console.error("[strategy-ref-service] Missing 'label'");
      throw { code: ErrorCodes.LOAD_STRATEGY_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_ERROR' };
    }
    return this.watchByFilter({ ...dataFilter, label }, { ...opts, failIfMissing: true, failIfMany: true });
  }

  /**
   *
   * @param label
   * @param filter
   * @param opts
   */
  async loadByLabel(label: string, filter?: Partial<StrategyFilter>, opts?: StrategyRefLoadOptions): Promise<Strategy> {
    return firstValueFrom(this.watchByLabel(label, filter, opts));
  }

  async loadByFilter(
    filter?: Partial<StrategyFilter>,
    opts?: StrategyRefLoadOptions & { failIfMissing?: boolean; failIfMany?: boolean }
  ): Promise<Strategy> {
    return firstValueFrom(this.watchByFilter(filter, opts));
  }

  /**
   * Watch strategy pmfms
   */
  watchPmfms(
    filter: Partial<StrategyFilter & DenormalizedPmfmStrategyFilter>,
    opts?: StrategyRefWatchOptions
  ): Observable<DenormalizedPmfmStrategy[]> {
    const toEntities = opts?.toEntity !== false ? DenormalizedPmfmStrategy.fromObjects : (data: any[]) => data as DenormalizedPmfmStrategy[];

    // Use cache (enable by default)
    if (!opts || opts.cache !== false) {
      const cacheKey = [StrategyRefCacheKeys.PMFMS_BY_FILTER, JSON.stringify(filter)].join('|');
      return this.cache
        .loadFromObservable(
          cacheKey,
          defer(() => this.watchPmfms(filter, { ...opts, cache: false, toEntity: false })),
          StrategyRefCacheKeys.CACHE_GROUP
        )
        .pipe(map(toEntities));
    }

    // DEBUG
    //console.debug(`[program-ref-service] Watching '${programLabel}' pmfms...`, acquisitionLevels);

    // Watch the full strategy
    return this.watchByFilter(filter, { toEntity: false, fullLoad: true }).pipe(
      // Filter strategy's pmfms
      map((strategy) => {
        const filterFn = DenormalizedPmfmStrategyFilter.fromObject(opts).asFilterFn();
        if (!filterFn) throw new Error('Missing opts to filter pmfm (.e.g opts.acquisitionLevel)!');
        return (strategy?.denormalizedPmfms || []).filter(filterFn);
      }),
      // Merge duplicated pmfms (make to a unique pmfm, by id)
      map((pmfms) =>
        pmfms.reduce((res, p) => {
          const index = res.findIndex((other) => other.id === p.id);
          if (index !== -1) {
            console.warn('[program-ref-service] Merging duplicated pmfms:', res[index], p);
            res[index] = DenormalizedPmfmStrategy.merge(res[index], p);
            return res;
          }
          return res.concat(p);
        }, [])
      ),
      // Sort on rank order (asc)
      map((data) => data.sort((p1, p2) => p1.rankOrder - p2.rankOrder)),
      map(toEntities),
      tap((data) => {
        if (opts?.debug) console.debug(`[strategy-ref-service] Found ${data.length} PMFM for ${opts.acquisitionLevel}`, data);
      })
    );
  }

  /**
   * Load strategy pmfms
   */
  loadPmfms(filter: Partial<StrategyFilter & DenormalizedPmfmFilter>, opts?: StrategyRefLoadOptions): Promise<DenormalizedPmfmStrategy[]> {
    return firstValueFrom(this.watchPmfms(filter, opts));
  }

  async clearCache() {
    console.info('[strategy-ref-service] Clearing strategy cache...');
    await this.cache.clearGroup(StrategyRefCacheKeys.CACHE_GROUP);
  }

  listenChangesByProgram(
    programId: number,
    opts?: {
      interval?: number;
    }
  ): Observable<Moment> {
    if (isNil(programId)) throw Error("Missing argument 'programId' ");

    const cacheKey = [StrategyRefCacheKeys.LAST_UPDATE_DATE_BY_PROGRAM_ID, programId].join('|');
    let cache = this._subscriptionCache[cacheKey];
    if (!cache) {
      if (this._debug) console.debug(`[strategy-ref-service] [WS] Listening for changes on strategies, from program {${programId}}...`);
      const program$ = this.graphql
        .subscribe<{ data: any }>({
          query: StrategyRefSubscriptions.listenChangesByProgram,
          fetchPolicy: 'no-cache',
          variables: {
            filter: { programIds: [programId] },
            interval: opts?.interval || 30, // seconds
          },
          error: {
            code: ErrorCodes.SUBSCRIBE_REFERENTIAL_ERROR,
            message: 'REFERENTIAL.ERROR.SUBSCRIBE_REFERENTIAL_ERROR',
          },
        })
        .pipe(map(({ data }) => fromDateISOString(data)));
      const subject = new Subject<Moment>();
      cache = {
        subject,
        subscription: program$.subscribe(subject),
      };
      this._subscriptionCache[cacheKey] = cache;
    }

    return cache.subject.asObservable().pipe(
      finalize(() => {
        // DEBUG
        //console.debug(`[strategy-ref-service] Finalize strategies changes for program {${id}}(${cache.subject.observers.length} observers)`);

        // Wait 100ms (to avoid to recreate if new subscription comes less than 100ms after)
        setTimeout(() => {
          if (cache.subject.observed) return; // Skip if still observed
          // DEBUG
          //console.debug(`[strategy-ref-service] Closing strategies changes for program {${id}}(${cache.subject.observers.length} observers)`);
          this._subscriptionCache[cacheKey] = undefined;
          cache.subject.complete();
          cache.subject.unsubscribe();
          cache.subscription.unsubscribe();
        }, 100);
      })
    );
  }
}
