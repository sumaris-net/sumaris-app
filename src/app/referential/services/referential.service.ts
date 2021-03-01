import {Injectable} from "@angular/core";
import {FetchPolicy, gql, MutationUpdaterFn} from "@apollo/client/core";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {ErrorCodes} from "./errors";
import {AccountService} from "../../core/services/account.service";
import {GraphqlService} from "../../core/graphql/graphql.service";
import {ReferentialFragments} from "./referential.fragments";
import {environment} from "../../../environments/environment";
import {Beans, isNil, isNotEmptyArray, isNotNil, KeysEnum} from "../../shared/functions";
import {Referential, ReferentialUtils} from "../../core/services/model/referential.model";
import {StatusIds} from "../../core/services/model/model.enum";
import {SortDirection} from "@angular/material/sort";
import {PlatformService} from "../../core/services/platform.service";
import {FilterFn, IEntitiesService, LoadResult} from "../../shared/services/entity-service.class";
import {BaseGraphqlService} from "../../core/services/base-graphql-service.class";
import {EntityUtils} from "../../core/services/model/entity.model";

// TODO BLA: move some attributes into ReferentialRefFilter
export class ReferentialFilter<ID = number> {
  entityName?: string;

  id?: ID;
  label?: string;
  name?: string;

  statusId?: number;
  statusIds?: number[];

  levelId?: number;
  levelIds?: number[];

  levelLabel?: string;
  levelLabels?: string[];

  // TODO BLA replace by 'searchAttributes' (s) ? (that manage 'xxx.yyy')
  searchJoin?: string; // If search is on a sub entity (e.g. Metier can search on TaxonGroup)
  searchText?: string;
  searchAttribute?: string;

  // TODO BLA add 'includedIds'
  excludedIds?: number[];

  static isEmpty(f: ReferentialFilter|any): boolean {
    return Beans.isEmpty<ReferentialFilter>(f, ReferentialFilterKeys, {
      blankStringLikeEmpty: true
    });
  }

  /**
   * Clean a filter, before sending to the pod (e.g remove 'levelId', 'statusId')
   * @param filter
   */
  static asPodObject<T extends ReferentialFilter = ReferentialFilter>(filter?: T): any {
    if (!filter) return filter;
    return {
      id: filter.id,
      label: filter.label,
      name: filter.name,
      searchText: filter.searchText,
      searchAttribute: filter.searchAttribute,
      searchJoin: filter.searchJoin,
      levelIds: isNotNil(filter.levelId) ? [filter.levelId] : filter.levelIds,
      levelLabels: isNotNil(filter.levelLabel) ? [filter.levelLabel] : filter.levelLabels,
      statusIds: isNotNil(filter.statusId) ? [filter.statusId] : (filter.statusIds || [StatusIds.ENABLE]),
      excludedIds: filter.excludedIds
    };
  }

  static searchFilter<T extends Referential>(f: ReferentialFilter): (T) => boolean {
    if (ReferentialFilter.isEmpty(f)) return undefined;
    const filterFns: FilterFn<T>[] = [];

    // Filter by status
    const statusIds = f.statusIds || (isNotNil(f.statusId) && [f.statusId]) || undefined;
    if (statusIds) {
      filterFns.push((entity) => statusIds.includes(entity.statusId));
    }

    // Filter on levels
    const levelIds = f.levelIds || (isNotNil(f.levelId) && [f.levelId]) || undefined;
    if (levelIds) {
      filterFns.push((entity) => levelIds.includes(entity.levelId));
    }

    // Filter excluded ids
    if (isNotEmptyArray(f.excludedIds)) {
      filterFns.push((entity) => isNil(entity.id) || !f.excludedIds.includes(entity.id));
    }

    const searchTextFilter = EntityUtils.searchTextFilter(f.searchAttribute, f.searchText);
    if (searchTextFilter) filterFns.push(searchTextFilter);

    if (!filterFns.length) return undefined;

    return (entity) => !filterFns.find(fn => !fn(entity));
  }
}
export const ReferentialFilterKeys: KeysEnum<ReferentialFilter> = {
  entityName: true,
  id: true,
  label: true,
  name: true,
  statusId: true,
  statusIds: true,
  levelId: true,
  levelIds: true,
  levelLabel: true,
  levelLabels: true,
  searchJoin: true,
  searchText: true,
  searchAttribute: true,
  excludedIds: true
};

export interface ReferentialType {
  id: string;
  level?: string;
}
const LoadAllWithTotalQuery: any = gql`
  query ReferentialsWithTotal($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...FullReferentialFragment
    }
    total: referentialsCount(entityName: $entityName, filter: $filter)
  }
  ${ReferentialFragments.fullReferential}
`;
const LoadAllQuery: any = gql`
  query Referentials($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...FullReferentialFragment
    }
  }
  ${ReferentialFragments.fullReferential}
`;
const CountQuery: any = gql`
  query ReferentialsCount($entityName: String, $filter: ReferentialFilterVOInput){
    total: referentialsCount(entityName: $entityName, filter: $filter)
  }
`;
const LoadReferentialTypes: any = gql`
  query ReferentialTypes{
    data: referentialTypes {
       id
       level
      __typename
    }
  }
`;

const LoadReferentialLevels: any = gql`
  query ReferentialLevels($entityName: String) {
    data: referentialLevels(entityName: $entityName){
      ...ReferentialFragment
    }
  }
  ${ReferentialFragments.referential}
`;

const SaveAllQuery: any = gql`
  mutation SaveReferentials($referentials:[ReferentialVOInput]){
    saveReferentials(referentials: $referentials){
      ...FullReferentialFragment
    }
  }
  ${ReferentialFragments.fullReferential}
`;

const DeleteAll: any = gql`
  mutation deleteReferentials($entityName: String, $ids:[Int]){
    deleteReferentials(entityName: $entityName, ids: $ids)
  }
`;

export const ReferentialQueries = {
  loadAll: LoadAllQuery,
  loadAllWithTotal: LoadAllWithTotalQuery,
};

@Injectable({providedIn: 'root'})
export class ReferentialService extends BaseGraphqlService<Referential> implements IEntitiesService<Referential, ReferentialFilter> {

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected platform: PlatformService
  ) {
    super(graphql, environment);

    platform.ready().then(() => {
      // No limit for updatable watch queries, if desktop
      if (!platform.mobile) {
        this._mutableWatchQueriesMaxCount = -1;
      }
    });

    // For DEV only
    this._debug = !environment.production;
  }


  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           filter?: ReferentialFilter,
           opts?: {
      fetchPolicy?: FetchPolicy;
      withTotal: boolean;
    }): Observable<LoadResult<Referential>> {

    if (!filter || !filter.entityName) {
      console.error("[referential-service] Missing filter.entityName");
      throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR" };
    }

    const entityName = filter.entityName;
    const uniqueEntityName = filter.entityName + (filter.searchJoin || '');

    const variables: any = {
      entityName,
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: ReferentialFilter.asPodObject(filter)
    };

    let now = this._debug && Date.now();
    if (this._debug) console.debug(`[referential-service] Loading ${uniqueEntityName}...`, variables);

    const withTotal = (!opts || opts.withTotal !== false);
    const query = withTotal ? LoadAllWithTotalQuery : LoadAllQuery;
    return this.mutableWatchQuery<LoadResult<any>>({
      queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
      query,
      arrayFieldName: 'data',
      totalFieldName: withTotal ? 'total' : undefined,
      insertFilterFn: (d: Referential) => d.entityName === entityName,
      variables,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR" },
      fetchPolicy: opts && opts.fetchPolicy || 'network-only'
    })
      .pipe(
        map(({data, total}) => {
          const entities = (data || []).map(ReferentialUtils.fromObject);
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
                filter?: ReferentialFilter,
                opts?: {
                  [key: string]: any;
                  fetchPolicy?: FetchPolicy;
                  debug?: boolean;
                  withTotal?: boolean;
                  toEntity?: boolean;
                }): Promise<LoadResult<Referential>> {

    if (!filter || !filter.entityName) {
      console.error("[referential-service] Missing filter.entityName");
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"};
    }

    const entityName = filter.entityName;
    const uniqueEntityName = filter.entityName + (filter.searchJoin || '');
    const debug = this._debug && (!opts || opts.debug !== false);

    const variables: any = {
      entityName: entityName,
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || filter.searchAttribute || 'label',
      sortDirection: sortDirection || 'asc',
      filter: ReferentialFilter.asPodObject(filter)
    };

    const now = Date.now();
    if (debug) console.debug(`[referential-service] Loading ${uniqueEntityName} items...`, variables);

    const query = (!opts || opts.withTotal !== false) ? LoadAllWithTotalQuery : LoadAllQuery;
    const res = await this.graphql.query<LoadResult<any>>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"},
      fetchPolicy: opts && opts.fetchPolicy || 'network-only'
    });
    let data = (res && res.data || []) as Referential[];

    // Always use unique entityName, if need
    if (filter.entityName !== uniqueEntityName) {
      data = data.map(r => <Referential>{...r, entityName: uniqueEntityName});
    }

    // Convert to entities
    if (!opts || opts.toEntity !== false) {
      data = data.map(ReferentialUtils.fromObject);
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
      console.error("[referential-service] Could not save referential: missing entityName");
      throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR" };
    }

    if (entities.length !== entities.filter(e => e.entityName === entityName).length) {
      console.error("[referential-service] Could not save referential: more than one entityName found in the array to save!");
      throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR" };
    }

    const json = entities.map(t => t.asObject());

    const now = Date.now();
    if (this._debug) console.debug(`[referential-service] Saving all ${entityName}...`, json);

    await this.graphql.mutate<{ saveReferentials: Referential[] }>({
      mutation: SaveAllQuery,
      variables: {
        referentials: json
      },
      error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR" },
      update: (proxy, {data}) => {
        if (data && data.saveReferentials) {
          // Update entities (id and update date)
          entities.forEach(entity => {
            const savedEntity = data.saveReferentials.find(e => (e.id === entity.id || e.label === entity.label));
            if (savedEntity !== entity) {
              EntityUtils.copyIdAndUpdateDate(savedEntity, entity);
            }
          });

          // Update the cache
          this.insertIntoMutableCachedQuery(proxy, {
            query: LoadAllQuery,
            data: data.saveReferentials
          });
        }

        if (this._debug) console.debug(`[referential-service] ${entityName} saved in ${Date.now() - now}ms`, entities);

      }
    });


    return entities;
  }

  async existsByLabel(label: string,
                      filter?: ReferentialFilter,
                      opts?: {
                        fetchPolicy: FetchPolicy;
                      }): Promise<boolean> {
    if (!filter || !filter.entityName || !label) {
      console.error("[referential-service] Missing 'filter.entityName' or 'label'");
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"};
    }

    const {total} = await this.graphql.query<{ total: number; }>({
      query: CountQuery,
      variables : {
        entityName: filter.entityName,
        filter: ReferentialFilter.asPodObject(filter)
      },
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR" },
      fetchPolicy: opts && opts.fetchPolicy || 'network-only'
    });

    return total > 0;
  }

  /**
   * Save a referential entity
   * @param entity
   */
  async save(entity: Referential, options?: any): Promise<Referential> {

    if (!entity.entityName) {
      console.error("[referential-service] Missing entityName");
      throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR" };
    }

    // Transform into json
    const json = entity.asObject();
    const isNew = isNil(json.id);

    const now = Date.now();
    if (this._debug) console.debug(`[referential-service] Saving ${entity.entityName}...`, json);

    await this.graphql.mutate<{ saveReferentials: any }>({
      mutation: SaveAllQuery,
      variables: {
        referentials: [json]
      },
      error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR" },
      update: (cache, {data}) => {
        // Update entity
        const savedEntity = data && data.saveReferentials && data.saveReferentials[0];
        if (savedEntity === entity) {
          if (this._debug) console.debug(`[referential-service] ${entity.entityName} saved in ${Date.now() - now}ms`, entity);
          EntityUtils.copyIdAndUpdateDate(savedEntity, entity);
        }

        // Update the cache
        if (isNew) {
          this.insertIntoMutableCachedQuery(cache, {
            query: LoadAllQuery,
            data: savedEntity
          });
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
      mutation: DeleteAll,
      variables: {
        entityName: entityName,
        ids: ids
      },
      error: { code: ErrorCodes.DELETE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.DELETE_REFERENTIAL_ERROR" },
      update: (proxy) => {
        // Remove from cache
        this.removeFromMutableCachedQueryByIds(proxy, {
          query: LoadAllQuery,
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
      query: LoadReferentialTypes,
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
  }): Promise<Referential[]> {
    const now = Date.now();
    if (this._debug) console.debug(`[referential-service] Loading levels for ${entityName}...`);

    const {data} = await this.graphql.query<LoadResult<Referential>>({
      query: LoadReferentialLevels,
      variables: {
        entityName: entityName
      },
      error: { code: ErrorCodes.LOAD_REFERENTIAL_LEVELS_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_LEVELS_ERROR" },
      fetchPolicy: options && options.fetchPolicy || 'cache-first'
    });

    const entities = (data || []).map(ReferentialUtils.fromObject);

    if (this._debug) console.debug(`[referential-service] Levels for ${entityName} loading in ${Date.now() - now}`, entities);

    return entities;
  }


  /* -- protected methods -- */

  protected fillDefaultProperties(entity: Referential) {
    entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.ENABLE;
  }
}
