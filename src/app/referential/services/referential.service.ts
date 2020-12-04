import {Injectable} from "@angular/core";
import gql from "graphql-tag";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {isNotNil, LoadResult, EntitiesService} from "../../shared/shared.module";
import {BaseEntityService, EntityUtils, Referential} from "../../core/core.module";
import {ErrorCodes} from "./errors";
import {AccountService} from "../../core/services/account.service";

import {FetchPolicy, MutationUpdaterFn} from "apollo-client";
import {GraphqlService} from "../../core/services/graphql.service";
import {ReferentialFragments} from "./referential.fragments";
import {environment} from "../../../environments/environment";
import {Beans, KeysEnum, toNumber} from "../../shared/functions";
import {ReferentialUtils} from "../../core/services/model/referential.model";
import {StatusIds} from "../../core/services/model/model.enum";
import {SortDirection} from "@angular/material/sort";
import {PlatformService} from "../../core/services/platform.service";

export class ReferentialFilter {
  entityName: string;

  id?: number;
  label?: string;
  name?: string;

  statusId?: number;
  statusIds?: number[];

  levelId?: number;
  levelIds?: number[];

  levelLabel?: string;
  levelLabels?: string[];

  searchJoin?: string; // If search is on a sub entity (e.g. Metier can search on TaxonGroup)
  searchText?: string;
  searchAttribute?: string;

  static isEmpty(f: ReferentialFilter|any): boolean {
    return Beans.isEmpty<ReferentialFilter>(f, ReferentialFilterKeys, {
      blankStringLikeEmpty: true
    });
  }

  /**
   * Clean a filter, before sending to the pod (e.g remove 'levelId', 'statusId')
   * @param filter
   */
  static asPodObject(filter: ReferentialFilter): any {
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
      statusIds: isNotNil(filter.statusId) ? [filter.statusId] : (filter.statusIds || [StatusIds.ENABLE])
    };
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
  searchAttribute: true
};

export interface ReferentialType {
  id: string;
  level?: string;
}
const CountQuery: any = gql`
  query ReferentialsCount($entityName: String, $filter: ReferentialFilterVOInput){
    referentialsCount(entityName: $entityName, filter: $filter)
  }
`;
const LoadAllWithTotalQuery: any = gql`
  query ReferentialsWithTotal($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...FullReferentialFragment
    }
    referentialsCount(entityName: $entityName, filter: $filter)
  }
  ${ReferentialFragments.fullReferential}
`;
const LoadAllQuery: any = gql`
  query Referentials($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...FullReferentialFragment
    }
  }
  ${ReferentialFragments.fullReferential}
`;

const LoadReferentialTypes: any = gql`
  query ReferentialTypes{
    referentialTypes {
       id
       level
      __typename
    }
  }
`;

const LoadReferentialLevels: any = gql`
  query ReferentialLevels($entityName: String) {
    referentialLevels(entityName: $entityName){
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

@Injectable({providedIn: 'root'})
export class ReferentialService extends BaseEntityService<Referential> implements EntitiesService<Referential, ReferentialFilter> {

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected platform: PlatformService
  ) {
    super(graphql);

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

    let now = new Date();
    if (this._debug) console.debug(`[referential-service] Loading ${uniqueEntityName}...`, variables);

    const withTotal = (!opts || opts.withTotal !== false);
    const query = withTotal ? LoadAllWithTotalQuery : LoadAllQuery;
    return this.mutableWatchQuery<{ referentials: any[]; referentialsCount?: number }>({
      queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
      query,
      arrayFieldName: 'referentials',
      totalFieldName: withTotal ? 'referentialsCount' : undefined,
      insertFilterFn: (d: Referential) => d.entityName === entityName,
      variables,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR" },
      fetchPolicy: opts && opts.fetchPolicy || 'network-only'
    })
      .pipe(
        map(({referentials, referentialsCount}) => {
          const data = (referentials || []).map(ReferentialUtils.fromObject);
          data.forEach(r => r.entityName = uniqueEntityName);
          if (now && this._debug) {
            console.debug(`[referential-service] ${uniqueEntityName} loaded in ${new Date().getTime() - now.getTime()}ms`, data);
            now = null;
          }
          return {
            data: data,
            total: referentialsCount
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
    const res = await this.graphql.query<{ referentials: any[]; referentialsCount: number }>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"},
      fetchPolicy: opts && opts.fetchPolicy || 'network-only'
    });
    const data = (!opts || opts.toEntity !== false) ?
      (res && res.referentials || []).map(ReferentialUtils.fromObject) :
      (res && res.referentials || []) as Referential[];
    data.forEach(r => r.entityName = uniqueEntityName);
    if (debug) console.debug(`[referential-service] ${uniqueEntityName} items loaded in ${Date.now() - now}ms`);
    return {
      data: data,
      total: res.referentialsCount
    };

  }

  async saveAll(entities: Referential[], options?: any): Promise<Referential[]> {
    if (!entities) return entities;

    // Nothing to save: skip
    if (!entities.length) return;

    const entityName = entities[0].entityName;
    if (!entityName) {
      console.error("[referential-service] Could not save referential: missing entityName");
      throw { code: ErrorCodes.SAVE_REFERENTIALS_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIALS_ERROR" };
    }

    if (entities.length !== entities.filter(e => e.entityName === entityName).length) {
      console.error("[referential-service] Could not save referential: more than one entityName found in the array to save!");
      throw { code: ErrorCodes.SAVE_REFERENTIALS_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIALS_ERROR" };
    }

    const json = entities.map(t => t.asObject());

    const now = Date.now();
    if (this._debug) console.debug(`[referential-service] Saving all ${entityName}...`, json);

    await this.graphql.mutate<{ saveReferentials: Referential[] }>({
      mutation: SaveAllQuery,
      variables: {
        referentials: json
      },
      error: { code: ErrorCodes.SAVE_REFERENTIALS_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIALS_ERROR" },
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
                      filter?: ReferentialFilter & {
                        excludeId?: number;
                      },
                      opts?: {
                        fetchPolicy: FetchPolicy
                      }): Promise<boolean> {
    if (!filter || !filter.entityName || !label) {
      console.error("[referential-service] Missing 'filter.entityName' or 'label'");
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"};
    }

    const variables: any = {
      entityName: filter.entityName,
      offset: 0,
      size: 2,
      sortBy: 'id',
      sortDirection: 'asc',
      filter: ReferentialFilter.asPodObject(filter)
    };

    const res = await this.graphql.query<{ referentials: any }>({
      query: LoadAllQuery,
      variables,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR" },
      fetchPolicy: opts && opts.fetchPolicy || 'network-only'
    });

    let matches = (res && res.referentials || []);

    // Remove excluded id
    if (filter && isNotNil(filter.excludeId)) {
      matches = matches.filter(item => item.id !== filter.excludeId);
    }

    return matches.length > 0;
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
    const isNew = !json.id;

    const now = Date.now();
    if (this._debug) console.debug(`[referential-service] Saving ${entity.entityName}...`, json);

    await this.graphql.mutate<{ saveReferentials: any }>({
      mutation: SaveAllQuery,
      variables: {
        referentials: [json]
      },
      error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR" },
      update: (proxy, {data}) => {
        // Update entity
        const savedEntity = data && data.saveReferentials && data.saveReferentials[0];
        if (savedEntity === entity) {
          if (this._debug) console.debug(`[referential-service] ${entity.entityName} saved in ${Date.now() - now}ms`, entity);
          EntityUtils.copyIdAndUpdateDate(savedEntity, entity);
        }

        // Update the cache
        if (isNew) {
          this.insertIntoMutableCachedQuery(proxy, {
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
    const ids = entities.filter(e => e.entityName == entityName).map(t => t.id);

    // Check that all entities have the same entityName
    if (entities.length > ids.length) {
      console.error("[referential-service] Could not delete referentials: only one entityName is allowed");
      throw { code: ErrorCodes.DELETE_REFERENTIALS_ERROR, message: "REFERENTIAL.ERROR.DELETE_REFERENTIALS_ERROR" };
    }

    const now = new Date();
    if (this._debug) console.debug(`[referential-service] Deleting ${entityName}...`, ids);

    await this.graphql.mutate<any>({
      mutation: DeleteAll,
      variables: {
        entityName: entityName,
        ids: ids
      },
      error: { code: ErrorCodes.DELETE_REFERENTIALS_ERROR, message: "REFERENTIAL.ERROR.DELETE_REFERENTIALS_ERROR" },
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
    return this.graphql.watchQuery<{ referentialTypes: ReferentialType[] }>({
      query: LoadReferentialTypes,
      variables: null,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ENTITIES_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ENTITIES_ERROR" }
    })
      .pipe(
        map((data) => {
          const res = (data && data.referentialTypes || []);
          return res;
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

    const data = await this.graphql.query<{ referentialLevels: Referential[] }>({
      query: LoadReferentialLevels,
      variables: {
        entityName: entityName
      },
      error: { code: ErrorCodes.LOAD_REFERENTIAL_LEVELS_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_LEVELS_ERROR" },
      fetchPolicy: options && options.fetchPolicy || 'cache-first'
    });

    const res = (data && data.referentialLevels || []).map(ReferentialUtils.fromObject);

    if (this._debug) console.debug(`[referential-service] Levels for ${entityName} loading in ${Date.now() - now}`, res);

    return res;
  }

  /* -- protected methods -- */

  protected fillDefaultProperties(entity: Referential) {
    entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.ENABLE;
  }
}
