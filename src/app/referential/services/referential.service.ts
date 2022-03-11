import { Injectable } from '@angular/core';
import { DocumentNode, FetchPolicy, gql, MutationUpdaterFn } from '@apollo/client/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ErrorCodes } from './errors';
import {
  AccountService,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseEntityGraphqlSubscriptions,
  BaseGraphqlService,
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
  ReferentialRef,
  StatusIds,
  toNumber
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

const QUERIES: BaseEntityGraphqlQueries & {count: any; loadTypes: any; loadLevels: any; } = {
  // Load all
  loadAll: gql`query Referentials($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...FullReferentialFragment
    }
  }
  ${ReferentialFragments.fullReferential}`,

  // Load all with total
  loadAllWithTotal: gql`query ReferentialsWithTotal($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
      data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
        ...FullReferentialFragment
      }
      total: referentialsCount(entityName: $entityName, filter: $filter)
    }
    ${ReferentialFragments.fullReferential}`,

  count: gql`query ReferentialsCount($entityName: String, $filter: ReferentialFilterVOInput){
    total: referentialsCount(entityName: $entityName, filter: $filter)
  }`,

  loadTypes: gql`query ReferentialTypes{
    data: referentialTypes {
      id
      level
      __typename
    }
  }`,

  loadLevels: gql`query ReferentialLevels($entityName: String) {
    data: referentialLevels(entityName: $entityName){
      ...ReferentialFragment
    }
  }
  ${ReferentialFragments.referential}`
};

const MUTATIONS: BaseEntityGraphqlMutations = {
  saveAll: gql`mutation SaveReferentials($data:[ReferentialVOInput]){
    data: saveReferentials(referentials: $data){
      ...FullReferentialFragment
    }
  }
  ${ReferentialFragments.fullReferential}`,

  deleteAll: gql`
    mutation deleteReferentials($entityName: String!, $ids:[Int]){
      deleteReferentials(entityName: $entityName, ids: $ids)
    }`
};

const SUBSCRIPTIONS: BaseEntityGraphqlSubscriptions = {
  listenChanges: gql`subscription UpdateReferential($entityName: String!, $id: Int!, $interval: Int){
    data: updateReferential(entityName: $entityName, id: $id, interval: $interval) {
      ...FullReferentialFragment
    }
  }
  ${ReferentialFragments.fullReferential}`,
};

interface ReferentialServiceLoadOptions extends EntityServiceLoadOptions {
  entityName: string;
}

@Injectable({providedIn: 'root'})
export class ReferentialService
  extends BaseGraphqlService<Referential, ReferentialFilter>
  implements IEntitiesService<Referential, ReferentialFilter>,
    IEntityService<Referential, number, ReferentialServiceLoadOptions>{

  private queries = QUERIES;
  private mutations = MUTATIONS;
  private subscriptions = SUBSCRIPTIONS;

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected settings: LocalSettingsService
  ) {
    super(graphql, environment);

    this.settings.ready().then(() => {
      // No limit for updatable watch queries, if desktop. Limit to 3 when mobile
      this._mutableWatchQueriesMaxCount = this.settings.mobile ? 3 : -1;
    });

    // For DEV only
    this._debug = !environment.production;
  }

  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           filter?: Partial<ReferentialFilter>,
           opts?: EntitiesServiceWatchOptions): Observable<LoadResult<Referential>> {

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
      filter: filter && filter.asPodObject()
    };

    let now = this._debug && Date.now();
    if (this._debug) console.debug(`[referential-service] Loading ${uniqueEntityName}...`, variables);

    const withTotal = (!opts || opts.withTotal !== false);
    const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
    return this.mutableWatchQuery<LoadResult<any>>({
      queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
      query,
      arrayFieldName: 'data',
      totalFieldName: withTotal ? 'total' : undefined,
      insertFilterFn: (d: Referential) => d.entityName === entityName,
      variables,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
      fetchPolicy: opts && opts.fetchPolicy || 'network-only'
    })
      .pipe(
        map(({data, total}) => {
          const entities = (data || []).map(FullReferential.fromObject);
          entities.forEach(r => r.entityName = uniqueEntityName);

          if (now) {
            console.debug(`[referential-service] ${uniqueEntityName} loaded in ${Date.now() - now}ms`, entities);
            now = null;
          }
          return {
            data: entities,
            total
          };
        })
      );
  }

  async loadAll(offset: number,
                size: number,
                sortBy?: string,
                sortDirection?: SortDirection,
                filter?: Partial<ReferentialFilter>,
                opts?: EntityServiceLoadOptions): Promise<LoadResult<Referential>> {

    if (!filter || !filter.entityName) {
      console.error('[referential-service] Missing filter.entityName');
      // eslint-disable-next-line no-throw-literal
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR'};
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
      filter: filter && filter.asPodObject()
    };

    const now = Date.now();
    if (debug) console.debug(`[referential-service] Loading ${uniqueEntityName} items...`, variables);

    const withTotal = (!opts || opts.withTotal !== false)
    const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
    const res = await this.graphql.query<LoadResult<any>>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR'},
      fetchPolicy: opts && opts.fetchPolicy || 'network-only'
    });
    let data = (res && res.data || []) as FullReferential[];

    // Always use unique entityName, if need
    if (filter.entityName !== uniqueEntityName) {
      data = data.map(r => <FullReferential>{...r, entityName: uniqueEntityName});
    }

    // Convert to entities
    if (!opts || opts.toEntity !== false) {
      data = data.map(FullReferential.fromObject);
    }

    if (debug) console.debug(`[referential-service] ${uniqueEntityName} items loaded in ${Date.now() - now}ms`);
    return {
      data,
      total: res.total
    };

  }

  async saveAll(entities: Referential[], options?: any): Promise<Referential[]> {
    if (!entities) return entities;

    // Nothing to save: skip
    if (!entities.length) return;

    const entityName = entities[0].entityName;
    if (!entityName) {
      console.error('[referential-service] Could not save referential: missing entityName');
      throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' };
    }

    if (entities.length !== entities.filter(e => e.entityName === entityName).length) {
      console.error('[referential-service] Could not save referential: more than one entityName found in the array to save!');
      throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' };
    }

    const json = entities.map(t => t.asObject());

    const now = Date.now();
    if (this._debug) console.debug(`[referential-service] Saving all ${entityName}...`, json);

    await this.graphql.mutate<LoadResult<Referential>>({
      mutation: this.mutations.saveAll,
      variables: {
        data: json
      },
      error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' },
      update: (cache, {data}) => {
        const savedEntities = data?.data;
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

        if (this._debug) console.debug(`[referential-service] ${entityName} saved in ${Date.now() - now}ms`, entities);

      }
    });


    return entities;
  }

  load(id: number, opts?: ReferentialServiceLoadOptions): Promise<Referential> {
    return this.loadAll(0,1,null, null, {
      includedIds: [id],
        entityName: opts.entityName
      },
      {withTotal: false, ...opts})
      .then(res => {
        if (res && res.data) return res.data[0];
        return undefined;
      });
  }

  delete(data: Referential, opts?: any): Promise<any> {
    return this.deleteAll([data], opts);
  }

  canUserWrite(data: Referential, opts?: any): boolean {
    return this.accountService.isAdmin();
  }

  listenChanges(id: number, opts?: {
      entityName: string,
      variables?: any;
      interval?: number;
      toEntity?: boolean;
    }): Observable<Referential> {
    if (isNil(id)) throw Error('Missing argument \'id\' ');
    if (isNil(opts.entityName)) throw Error('Missing argument \'opts.entityName\' ');

    const variables = {
      id,
      entityName: opts.entityName,
      interval: toNumber(opts && opts.interval, 0), // no timer by default
      ...opts?.variables
    };
    if (this._debug) console.debug(this._logPrefix + `[WS] Listening for changes on ${opts.entityName}#${id}...`);

    return this.graphql.subscribe<{data: any}>({
      query: SUBSCRIPTIONS.listenChanges,
      variables,
      error: {
        code: ErrorCodes.SUBSCRIBE_REFERENTIAL_ERROR,
        message: 'ERROR.SUBSCRIBE_REFERENTIAL_ERROR'
      }
    })
      .pipe(
        map(({data}) => {
          const entity = (!opts || opts.toEntity !== false) ? data && FullReferential.fromObject(data) : data;
          if (entity && this._debug) console.debug(this._logPrefix + `[WS] Received changes on ${opts.entityName}#${id}`, entity);

          // TODO: missing = deleted ?
          if (!entity) console.warn(this._logPrefix + `[WS] Received deletion on ${opts.entityName}#${id} - TODO check implementation`);

          return entity;
        })
      );
  }

  async existsByLabel(label: string,
                      filter?: Partial<ReferentialFilter>,
                      opts?: {
                        fetchPolicy: FetchPolicy;
                      }): Promise<boolean> {

    if (!filter || !filter.entityName || !label) {
      console.error('[referential-service] Missing \'filter.entityName\' or \'label\'');
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR'};
    }

    filter = this.asFilter(filter);
    filter.label = label;

    const {total} = await this.graphql.query<{ total: number; }>({
      query: this.queries.count,
      variables : {
        entityName: filter.entityName,
        filter: filter.asPodObject()
      },
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
      fetchPolicy: opts && opts.fetchPolicy || 'network-only'
    });

    return total > 0;
  }

  /**
   * Save a referential entity
   *
   * @param entity
   * @param options
   */
  async save(entity: Referential, options?: EntitySaveOptions): Promise<Referential> {

    if (!entity.entityName) {
      console.error('[referential-service] Missing entityName');
      throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' };
    }

    // Transform into json
    const json = entity.asObject();
    const isNew = isNil(json.id);

    const now = Date.now();
    if (this._debug) console.debug(`[referential-service] Saving ${entity.entityName}...`, json);

    await this.graphql.mutate<LoadResult<any>>({
      mutation: this.mutations.saveAll,
      variables: {
        data: [json]
      },
      error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' },
      update: (cache, {data}) => {
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
            data: savedEntity
          });
        }

        if (options?.update) {
          options.update(cache, {data});
        }

      }
    });

    return entity;
  }

  /**
   * Delete referential entities
   */
  async deleteAll(entities: Referential[], options?: Partial<{
    update: MutationUpdaterFn<any>;
  }> | any): Promise<any> {

    // Filter saved entities
    entities = entities && entities
      .filter(e => !!e.id && !!e.entityName) || [];

    // Nothing to save: skip
    if (!entities.length) return;

    const entityName = entities[0].entityName;
    const ids = entities.filter(e => e.entityName === entityName).map(t => t.id);

    // Check that all entities have the same entityName
    if (entities.length > ids.length) {
      console.error("[referential-service] Could not delete referentials: only one entityName is allowed");
      throw { code: ErrorCodes.DELETE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.DELETE_REFERENTIAL_ERROR" };
    }

    const now = new Date();
    if (this._debug) console.debug(`[referential-service] Deleting ${entityName}...`, ids);

    await this.graphql.mutate<any>({
      mutation: this.mutations.deleteAll,
      variables: {
        entityName,
        ids
      },
      error: { code: ErrorCodes.DELETE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.DELETE_REFERENTIAL_ERROR" },
      update: (proxy) => {
        // Remove from cache
        this.removeFromMutableCachedQueriesByIds(proxy, {
          queries: this.getLoadQueries(),
          ids
        });

        if (options && options.update) {
          options.update(proxy);
        }

        if (this._debug) console.debug(`[referential-service] ${entityName} deleted in ${new Date().getTime() - now.getTime()}ms`);
      }
    });
  }

  /**
   * Load referential types
   */
  loadTypes(): Observable<ReferentialType[]> {
    if (this._debug) console.debug("[referential-service] Loading referential types...");
    return this.graphql.watchQuery<LoadResult<ReferentialType>>({
      query: this.queries.loadTypes,
      variables: null,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR" }
    })
      .pipe(
        map(({data}) => {
          return (data || []);
        })
      );
  }

  /**
   * Load entity levels
   */
  async loadLevels(entityName: string, options?: {
    fetchPolicy?: FetchPolicy
  }): Promise<ReferentialRef[]> {
    const now = Date.now();
    if (this._debug) console.debug(`[referential-service] Loading levels for ${entityName}...`);

    const {data} = await this.graphql.query<LoadResult<any[]>>({
      query: this.queries.loadLevels,
      variables: {
        entityName
      },
      error: { code: ErrorCodes.LOAD_REFERENTIAL_LEVELS_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_LEVELS_ERROR" },
      fetchPolicy: options && options.fetchPolicy || 'cache-first'
    });

    const entities = (data || []).map(ReferentialRef.fromObject);

    if (this._debug) console.debug(`[referential-service] Levels for ${entityName} loading in ${Date.now() - now}`, entities);

    return entities;
  }

  asFilter(filter: Partial<ReferentialFilter>): ReferentialFilter {
    return ReferentialFilter.fromObject(filter);
  }

  /* -- protected methods -- */

  protected fillDefaultProperties(entity: Referential) {
    entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.ENABLE;
  }

  protected getLoadQueries(): DocumentNode[] {
    return [this.queries.loadAll, this.queries.loadAllWithTotal].filter(isNotNil);
  }
}
