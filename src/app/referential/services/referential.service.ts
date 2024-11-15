import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { ApolloCache, DocumentNode, FetchPolicy, gql, MutationUpdaterFn, MutationUpdaterFunction } from '@apollo/client/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ErrorCodes } from './errors';
import {
  AccountService,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseEntityGraphqlSubscriptions,
  BaseGraphqlService,
  BaseReferential,
  EntitiesServiceLoadOptions,
  EntitiesServiceWatchOptions,
  EntitySaveOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  GraphqlService,
  IEntitiesService,
  IEntityService,
  isNil,
  isNotNil,
  LoadResult,
  LocalSettingsService,
  Referential,
  StatusIds,
  toNumber,
} from '@sumaris-net/ngx-components';
import { ReferentialFragments } from './referential.fragments';
import { environment } from '@environments/environment';
import { SortDirection } from '@angular/material/sort';
import { ReferentialFilter } from './filter/referential.filter';
import { FullReferential } from '@app/referential/services/model/referential.model';

export interface ReferentialType {
  id: string;
  level?: string;
}

export const ReferentialQueries: BaseEntityGraphqlQueries & { loadAllFull?: any; loadTypes: any } = {
  // Load
  load: gql`
    query Referential($entityName: String, $id: Int) {
      data: referential(entityName: $entityName, id: $id) {
        ...FullReferentialFragment
      }
    }
    ${ReferentialFragments.fullReferential}
  `,

  // Load all full
  loadAllFull: gql`
    query FullReferentials(
      $entityName: String
      $offset: Int
      $size: Int
      $sortBy: String
      $sortDirection: String
      $filter: ReferentialFilterVOInput
    ) {
      data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
        ...FullReferentialFragment
      }
    }
    ${ReferentialFragments.fullReferential}
  `,

  // Load all
  loadAll: gql`
    query Referentials($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput) {
      data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
        ...ReferentialFragment
      }
    }
    ${ReferentialFragments.referential}
  `,

  // Load all with total
  loadAllWithTotal: gql`
    query ReferentialsWithTotal(
      $entityName: String
      $offset: Int
      $size: Int
      $sortBy: String
      $sortDirection: String
      $filter: ReferentialFilterVOInput
    ) {
      data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
        ...ReferentialFragment
      }
      total: referentialsCount(entityName: $entityName, filter: $filter)
    }
    ${ReferentialFragments.referential}
  `,

  countAll: gql`
    query ReferentialsCount($entityName: String, $filter: ReferentialFilterVOInput) {
      total: referentialsCount(entityName: $entityName, filter: $filter)
    }
  `,

  loadTypes: gql`
    query ReferentialTypes {
      data: referentialTypes {
        id
        level
        __typename
      }
    }
  `,
};

const ReferentialMutations: BaseEntityGraphqlMutations = {
  saveAll: gql`
    mutation SaveReferentials($data: [ReferentialVOInput]) {
      data: saveReferentials(referentials: $data) {
        ...ReferentialFragment
      }
    }
    ${ReferentialFragments.referential}
  `,

  deleteAll: gql`
    mutation deleteReferentials($entityName: String!, $ids: [Int]) {
      deleteReferentials(entityName: $entityName, ids: $ids)
    }
  `,
};

const ReferentialSubscriptions: BaseEntityGraphqlSubscriptions = {
  listenChanges: gql`
    subscription UpdateReferential($entityName: String!, $id: Int!, $interval: Int) {
      data: updateReferential(entityName: $entityName, id: $id, interval: $interval) {
        ...ReferentialFragment
      }
    }
    ${ReferentialFragments.referential}
  `,
};

export interface ReferentialServiceLoadOptions extends EntityServiceLoadOptions {
  entityName: string;
  fullLoad?: boolean;
}

export const DATA_TYPE = new InjectionToken<new () => BaseReferential<any, any>>('dataType');

@Injectable({ providedIn: 'root' })
export class ReferentialService<T extends BaseReferential<T> = Referential, F extends ReferentialFilter = ReferentialFilter, ID = any, S = void>
  extends BaseGraphqlService<T, F, ID, S>
  implements IEntitiesService<T, F>, IEntityService<T, number, ReferentialServiceLoadOptions>
{
  private readonly queries = ReferentialQueries;
  private readonly mutations = ReferentialMutations;
  private readonly dataType: new () => T;

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    @Optional() @Inject(DATA_TYPE) dataType?: new () => T
  ) {
    super(graphql, environment);
    this.dataType = dataType || (FullReferential as unknown as new () => T);

    this.settings.ready().then(() => {
      // No limit for updatable watch queries, if desktop. Limit to 3 when mobile
      this._mutableWatchQueriesMaxCount = this.settings.mobile ? 3 : -1;
    });

    // For DEV only
    this._debug = !environment.production;
  }

  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<F>,
    opts?: EntitiesServiceWatchOptions
  ): Observable<LoadResult<T>> {
    if (!filter || !filter.entityName) {
      console.error('[referential-service] Missing filter.entityName');
      // eslint-disable-next-line no-throw-literal
      throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
    }

    filter = this.asFilter(filter);
    const entityName = filter.entityName;
    const uniqueEntityName = filter.entityName + (filter.searchJoin || '');

    const variables: any = {
      entityName,
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: filter && filter.asPodObject(),
    };

    let now = this._debug && Date.now();
    if (this._debug) console.debug(`[referential-service] Loading ${uniqueEntityName}...`, variables);

    const withTotal = !opts || opts.withTotal !== false;
    const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
    return this.mutableWatchQuery<LoadResult<any>>({
      queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
      query,
      arrayFieldName: 'data',
      totalFieldName: withTotal ? 'total' : undefined,
      insertFilterFn: (d: T) => d.entityName === entityName,
      variables,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
      fetchPolicy: (opts && opts.fetchPolicy) || 'network-only',
    }).pipe(
      map(({ data, total }) => {
        const entities = (data || []).map((json) => this.fromObject(json));
        entities.forEach((r) => (r.entityName = uniqueEntityName));

        if (now) {
          console.debug(`[referential-service] ${uniqueEntityName} loaded in ${Date.now() - now}ms`, entities);
          now = null;
        }
        return {
          data: entities as unknown as T[],
          total,
        };
      })
    );
  }

  async loadAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<F>,
    opts?: EntitiesServiceLoadOptions<T>
  ): Promise<LoadResult<T>> {
    if (!filter || !filter.entityName) {
      console.error('[referential-service] Missing filter.entityName');
      // eslint-disable-next-line no-throw-literal
      throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
    }

    filter = this.asFilter(filter);
    const entityName = filter.entityName;
    const uniqueEntityName = filter.entityName + (filter.searchJoin || '');
    const debug = this._debug && (!opts || opts.debug !== false);

    const variables: any = {
      entityName,
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || filter.searchAttribute || 'label',
      sortDirection: sortDirection || 'asc',
      filter: filter && filter.asPodObject(),
    };

    const now = Date.now();
    if (debug) console.debug(`[referential-service] Loading ${uniqueEntityName} items...`, variables);

    const withTotal = !opts || opts.withTotal !== false;
    const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
    let { data, total } = await this.graphql.query<LoadResult<any>>({
      query,
      variables,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
      fetchPolicy: (opts && opts.fetchPolicy) || 'network-only',
    });

    // Always set the unique entityName, if need
    if (filter.entityName !== uniqueEntityName) {
      data = data.map((r) => <FullReferential>{ ...r, entityName: uniqueEntityName });
    }

    // Convert to entities
    const entities = this.fromObjects(data, opts);

    const res: LoadResult<T> = {
      data: entities as unknown as T[],
      total,
    };

    // Add fetch more capability, if total was fetched
    if (withTotal) {
      const nextOffset = (offset || 0) + entities.length;
      if (nextOffset < total) {
        res.fetchMore = () => this.loadAll(nextOffset, size, sortBy, sortDirection, filter, opts);
      }
    }

    if (debug) console.debug(`[referential-service] ${uniqueEntityName} items loaded in ${Date.now() - now}ms`);

    return res;
  }

  async saveAll(entities: T[], opts?: EntitySaveOptions<T>): Promise<T[]> {
    if (!entities) return entities;

    // Nothing to save: skip
    if (!entities.length) return;

    const entityName = entities[0].entityName;
    if (!entityName) {
      console.error('[referential-service] Could not save referential: missing entityName');
      throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' };
    }

    if (entities.length !== entities.filter((e) => e.entityName === entityName).length) {
      console.error('[referential-service] Could not save referential: more than one entityName found in the array to save!');
      throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' };
    }

    const json = entities.map((entity) => this.asObject(entity));

    const now = Date.now();
    if (this._debug) console.debug(`[referential-service] Saving all ${entityName}...`, json);

    await this.graphql.mutate<LoadResult<T>>({
      mutation: this.mutations.saveAll,
      variables: {
        data: json,
      },
      error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' },
      update: (cache, { data }, { context, variables }) => {
        const savedEntities = data?.data;
        if (savedEntities) {
          // Update entities (id and update date)
          entities.forEach((entity) => {
            const savedEntity = savedEntities.find((e) => e.id === entity.id || e.label === entity.label);
            if (savedEntity !== entity) {
              EntityUtils.copyIdAndUpdateDate(savedEntity, entity);
            }
          });

          // Update the cache
          this.insertIntoMutableCachedQueries(cache, {
            queries: this.getLoadQueries(),
            data: savedEntities,
          });
        }

        if (opts?.update) {
          opts.update(cache, { data }, { context, variables });
        }

        if (this._debug) console.debug(`[referential-service] ${entityName} saved in ${Date.now() - now}ms`, entities);
      },
    });

    return entities;
  }

  async load(id: number, opts?: ReferentialServiceLoadOptions): Promise<T> {
    if (!opts || !opts.entityName) {
      console.error('[referential-service] Missing opts.entityName');
      // eslint-disable-next-line no-throw-literal
      throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
    }

    const { data } = await this.graphql.query<{ data: any }>({
      query: ReferentialQueries.load,
      variables: {
        entityName: opts.entityName,
        id,
      },
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
    });
    return this.fromObject(data);
  }

  delete(data: T, opts?: any): Promise<any> {
    return this.deleteAll([data], opts);
  }

  canUserWrite(data: T, opts?: any): boolean {
    return this.accountService.isAdmin();
  }

  listenChanges(
    id: number,
    opts?: {
      entityName: string;
      variables?: any;
      interval?: number;
      toEntity?: boolean;
    }
  ): Observable<T> {
    if (isNil(id)) throw Error("Missing argument 'id' ");
    if (isNil(opts.entityName)) throw Error("Missing argument 'opts.entityName' ");

    const variables = {
      id,
      entityName: opts.entityName,
      interval: toNumber(opts && opts.interval, 0), // no timer by default
      ...opts?.variables,
    };
    if (this._debug) console.debug(this._logPrefix + `[WS] Listening for changes on ${opts.entityName}#${id}...`);

    return this.graphql
      .subscribe<{ data: any }>({
        query: ReferentialSubscriptions.listenChanges,
        variables,
        error: {
          code: ErrorCodes.SUBSCRIBE_REFERENTIAL_ERROR,
          message: 'ERROR.SUBSCRIBE_REFERENTIAL_ERROR',
        },
      })
      .pipe(
        map(({ data }) => {
          const entity = this.fromObject(data, opts);
          if (entity && this._debug) console.debug(this._logPrefix + `[WS] Received changes on ${opts.entityName}#${id}`, entity);

          // TODO: missing = deleted ?
          if (!entity) console.warn(this._logPrefix + `[WS] Received deletion on ${opts.entityName}#${id} - TODO check implementation`);

          return entity;
        })
      );
  }

  async existsByLabel(
    label: string,
    filter?: Partial<F>,
    opts?: {
      fetchPolicy: FetchPolicy;
    }
  ): Promise<boolean> {
    if (!filter || !filter.entityName || !label) {
      console.error("[referential-service] Missing 'filter.entityName' or 'label'");
      throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
    }

    filter = this.asFilter(filter);
    filter.label = label;

    const { total } = await this.graphql.query<{ total: number }>({
      query: this.queries.countAll,
      variables: {
        entityName: filter.entityName,
        filter: filter.asPodObject(),
      },
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
      fetchPolicy: (opts && opts.fetchPolicy) || 'network-only',
    });

    return total > 0;
  }

  /**
   * Save a referential entity
   *
   * @param entity
   * @param opts
   */
  async save(entity: T, opts?: EntitySaveOptions): Promise<T> {
    if (!entity.entityName) {
      console.error('[referential-service] Missing entityName');
      throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' };
    }

    // Transform into json
    const json = this.asObject(entity);
    const isNew = isNil(json.id);

    const now = Date.now();
    if (this._debug) console.debug(`[referential-service] Saving ${entity.entityName}...`, json);

    await this.graphql.mutate<LoadResult<any>>({
      mutation: this.mutations.saveAll,
      variables: {
        data: [json],
      },
      error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' },
      update: (cache, { data }, { context, variables }) => {
        // Update entity
        const savedEntity = data && data.data && data.data[0];
        if (savedEntity !== entity) {
          if (this._debug) console.debug(`[referential-service] ${entity.entityName} saved in ${Date.now() - now}ms`, entity);
          EntityUtils.copyIdAndUpdateDate(savedEntity, entity);
        }

        // Update the cache
        if (isNew) {
          this.insertIntoMutableCachedQueries(cache, {
            queries: this.getLoadQueries(),
            data: savedEntity,
          });
        }

        if (opts?.update) {
          opts.update(cache, { data }, { context, variables });
        }
      },
    });

    return entity;
  }

  /**
   * Delete referential entities
   */
  async deleteAll(
    entities: BaseReferential<any>[],
    opts?:
      | Partial<{
          update: MutationUpdaterFn<any> | MutationUpdaterFunction<any, any, any, ApolloCache<any>>;
        }>
      | any
  ): Promise<any> {
    // Filter saved entities
    entities = (entities && entities.filter((e) => !!e.id && !!e.entityName)) || [];

    // Nothing to save: skip
    if (!entities.length) return;

    const entityName = entities[0].entityName;
    const ids = entities.filter((e) => e.entityName === entityName).map((t) => t.id as ID);

    // Check that all entities have the same entityName
    if (entities.length > ids.length) {
      console.error('[referential-service] Could not delete referentials: only one entityName is allowed');
      throw { code: ErrorCodes.DELETE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.DELETE_REFERENTIAL_ERROR' };
    }

    const now = new Date();
    if (this._debug) console.debug(`[referential-service] Deleting ${entityName}...`, ids);

    await this.graphql.mutate<any>({
      mutation: this.mutations.deleteAll,
      variables: {
        entityName,
        ids,
      },
      error: { code: ErrorCodes.DELETE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.DELETE_REFERENTIAL_ERROR' },
      update: (cache, result, { context, variables }) => {
        // Remove from cache
        this.removeFromMutableCachedQueriesByIds(cache, {
          queries: this.getLoadQueries(),
          ids,
        });

        if (opts?.update) {
          opts.update(cache, result, { context, variables });
        }

        if (this._debug) console.debug(`[referential-service] ${entityName} deleted in ${new Date().getTime() - now.getTime()}ms`);
      },
    });
  }

  /**
   * Load referential types
   */
  watchTypes(): Observable<ReferentialType[]> {
    if (this._debug) console.debug('[referential-service] Loading referential types...');
    return this.graphql
      .watchQuery<LoadResult<ReferentialType>>({
        query: this.queries.loadTypes,
        variables: null,
        error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
      })
      .pipe(map(({ data }) => data || []));
  }

  asFilter(filter: Partial<F>): F {
    return ReferentialFilter.fromObject(filter) as F;
  }

  fromObject(
    source: any,
    opts?: {
      toEntity?: boolean | ((source: any, opts?: any) => T);
      [key: string]: any;
    }
  ) {
    // Simple cast (skip conversion)
    if (!source || opts?.toEntity === false) return source as T;

    // User defined function
    if (typeof opts?.toEntity === 'function') {
      return opts.toEntity(source, opts);
    }

    const target = new this.dataType();
    target.fromObject(source, opts);
    return target;
  }

  asObject(source: T, opts?: any) {
    return source.asObject(opts);
  }

  /* -- protected methods -- */

  protected fromObjects(
    sources: any[],
    opts?: {
      toEntity?: boolean | ((source: any, opts?: any) => T);
      [key: string]: any;
    }
  ): T[] {
    return (sources || []).map((source) => this.fromObject(source, opts));
  }

  protected fillDefaultProperties(entity: Referential) {
    entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.ENABLE;
  }

  protected getLoadQueries(): DocumentNode[] {
    return [this.queries.loadAll, this.queries.loadAllWithTotal].filter(isNotNil);
  }
}
