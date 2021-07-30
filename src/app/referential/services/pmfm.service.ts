import {Injectable} from "@angular/core";
import {FetchPolicy, gql, WatchQueryFetchPolicy} from "@apollo/client/core";
import {ErrorCodes} from "./errors";
import {AccountService, MINIFY_ENTITY_FOR_POD} from '@sumaris-net/ngx-components';
import {GraphqlService}  from "@sumaris-net/ngx-components";
import {environment} from '@environments/environment';
import {ReferentialService} from "./referential.service";
import {Pmfm} from "./model/pmfm.model";
import {Observable, of} from "rxjs";
import {ReferentialFragments} from "./referential.fragments";
import {map} from "rxjs/operators";
import {ReferentialUtils}  from "@sumaris-net/ngx-components";
import {SortDirection} from "@angular/material/sort";
import {BaseGraphqlService}  from "@sumaris-net/ngx-components";
import {EntityServiceLoadOptions, IEntitiesService, IEntityService, LoadResult, SuggestService} from "@sumaris-net/ngx-components";
import {isNil, isNotNil} from "@sumaris-net/ngx-components";
import {StatusIds}  from "@sumaris-net/ngx-components";
import {EntityUtils}  from "@sumaris-net/ngx-components";
import {ReferentialRefService} from "./referential-ref.service";
import {ObjectMap} from "@sumaris-net/ngx-components";
import {CacheService} from "ionic-cache";
import {CryptoService}  from "@sumaris-net/ngx-components";
import {BaseReferentialFilter} from "./filter/referential.filter";
import {EntityClass}  from "@sumaris-net/ngx-components";

const LoadAllQuery = gql`query Pmfms($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
  data: pmfms(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
    ...LightPmfmFragment
  }
}
${ReferentialFragments.lightPmfm}
`;

const LoadAllWithPartsQuery = gql`query PmfmsWithParts($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput) {
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
      ...ReferentialFragment
    }
    fraction {
      ...ReferentialFragment
    }
    method {
      ...ReferentialFragment
    }
    unit {
      ...ReferentialFragment
    }
  }
}
${ReferentialFragments.lightPmfm}
${ReferentialFragments.referential}
`;
const LoadAllWithPartsQueryWithTotal = gql`query PmfmsWithParts($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput) {
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
      ...ReferentialFragment
    }
    fraction {
      ...ReferentialFragment
    }
    method {
      ...ReferentialFragment
    }
    unit {
      ...ReferentialFragment
    }
  }
  total: referentialsCount(entityName: "Pmfm", filter: $filter)
}
${ReferentialFragments.lightPmfm}
${ReferentialFragments.referential}
`;

const LoadAllWithDetailsQuery: any = gql`query PmfmsWithDetails($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
  data: pmfms(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
    ...PmfmFragment
  }
  total: referentialsCount(entityName: "Pmfm", filter: $filter)
}
${ReferentialFragments.pmfm}
${ReferentialFragments.referential}
${ReferentialFragments.fullReferential}
${ReferentialFragments.parameter}
`;
const LoadAllWithTotalQuery: any = gql`query PmfmsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
  data: pmfms(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
    ...LightPmfmFragment
  }
  total: referentialsCount(entityName: "Pmfm", filter: $filter)
}
${ReferentialFragments.lightPmfm}
`;
const LoadAllIdsQuery: any = gql`query PmfmIds($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
  data: referentials(entityName: "Pmfm", filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
    id
  }
}`;

const LoadQuery: any = gql`query Pmfm($label: String, $id: Int){
  data: pmfm(label: $label, id: $id){
    ...PmfmFragment
  }
}
${ReferentialFragments.pmfm}
${ReferentialFragments.referential}
${ReferentialFragments.fullReferential}
${ReferentialFragments.parameter}`;

const LoadPmfmFullQuery: any = gql`query Pmfm($label: String, $id: Int){
  data: pmfm(label: $label, id: $id){
    ...PmfmFullFragment
  }
}
${ReferentialFragments.pmfmFull}
${ReferentialFragments.referential}
${ReferentialFragments.fullReferential}
${ReferentialFragments.parameter}`;

const SaveQuery: any = gql`mutation SavePmfm($data: PmfmVOInput!){
  data: savePmfm(pmfm: $data){
    ...PmfmFragment
  }
}
${ReferentialFragments.pmfm}
${ReferentialFragments.referential}
${ReferentialFragments.fullReferential}
${ReferentialFragments.parameter}`;


@EntityClass({typename: 'PmfmFilterVO'})
export class PmfmFilter extends BaseReferentialFilter<PmfmFilter, Pmfm> {

  static fromObject: (source: any, opts?: any) => PmfmFilter;

  entityName?: 'Pmfm';

}


const PmfmCacheKeys = {
  CACHE_GROUP: 'pmfm',

  PMFM_IDS_BY_PARAMETER_LABEL: 'pmfmIdsByParameter'
};

// TODO BLA: étendre la class BaseReferentialService
@Injectable({providedIn: 'root'})
export class PmfmService
  extends BaseGraphqlService<Pmfm, PmfmFilter>
  implements IEntityService<Pmfm>,
  IEntitiesService<Pmfm, PmfmFilter>,
  SuggestService<Pmfm, PmfmFilter>
{

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected referentialService: ReferentialService,
    protected referentialRefService: ReferentialRefService,
    protected cache: CacheService,
    protected cryptoService: CryptoService
  ) {
    super(graphql, environment);
  }

  async existsByLabel(label: string, opts?: { excludedId?: number; }): Promise<boolean> {
    if (isNil(label)) return false;
    return await this.referentialService.existsByLabel(label, { ...opts, entityName: 'Pmfm' });
  }

  async load(id: number, options?: EntityServiceLoadOptions): Promise<Pmfm> {

    if (this._debug) console.debug(`[pmfm-service] Loading pmfm {${id}}...`);

    const {data} = await this.graphql.query<{ data: any }>({
      query: LoadQuery,
      variables: {
        id
      },
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"}
    });
    const entity = data && Pmfm.fromObject(data);

    if (this._debug) console.debug(`[pmfm-service] Pmfm {${id}} loaded`, entity);

    return entity;
  }

  async loadPmfmFull(id: number, options?: EntityServiceLoadOptions): Promise<Pmfm> {

    if (this._debug) console.debug(`[pmfm-service] Loading pmfm full {${id}}...`);

    const {data} = await this.graphql.query<{ data: any }>({
      query: LoadPmfmFullQuery,
      variables: {
        id
      },
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"}
    });
    const entity = data && Pmfm.fromObject(data);

    if (this._debug) console.debug(`[pmfm-service] Pmfm full {${id}} loaded`, entity);

    return entity;
  }

  /**
   * Save a pmfm entity
   * @param entity
   */
  async save(entity: Pmfm, options?: EntityServiceLoadOptions): Promise<Pmfm> {

    this.fillDefaultProperties(entity);

    // Transform into json
    const json = entity.asObject(MINIFY_ENTITY_FOR_POD);

    const now = Date.now();
    if (this._debug) console.debug(`[pmfm-service] Saving Pmfm...`, json);

    await this.graphql.mutate<{ data: any }>({
      mutation: SaveQuery,
      variables: {
        data: json
      },
      error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR" },
      update: (proxy, {data}) => {
        // Update entity
        const savedEntity = data && data.data;
        if (savedEntity) {
          if (this._debug) console.debug(`[pmfm-service] Pmfm saved in ${Date.now() - now}ms`, entity);
          this.copyIdAndUpdateDate(savedEntity, entity);
        }
      }
    });

    return entity;
  }

  /**
   * Delete pmfm entities
   */
  async delete(entity: Pmfm, options?: any): Promise<any> {

    entity.entityName = 'Pmfm';

    await this.referentialService.deleteAll([entity]);
  }

  listenChanges(id: number, options?: any): Observable<Pmfm | undefined> {
    // TODO
    console.warn("TODO: implement listen changes on pmfm");
    return of();
  }

  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: PmfmFilter,
    opts?: {
      query?: any;
      fetchPolicy?: WatchQueryFetchPolicy;
      withTotal?: boolean;
      withDetails?: boolean;
    }
  ): Observable<LoadResult<Pmfm>> {
    filter = this.asFilter(filter);
    opts = opts || {};
    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: filter && filter.asPodObject()
    };
    const now = Date.now();
    if (this._debug) console.debug("[pmfm-service] Watching pmfms using options:", variables);

    const query = opts.query ? opts.query : (
      opts.withDetails ? LoadAllWithDetailsQuery : (
        opts.withTotal ? LoadAllWithTotalQuery : LoadAllQuery
      )
    );
    return this.graphql.watchQuery<LoadResult<any>>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"},
      fetchPolicy: opts && opts.fetchPolicy || undefined
    })
      .pipe(
        map(({data, total}) => {
            const entities = (data || []).map(Pmfm.fromObject);
            if (this._debug) console.debug(`[pmfm-service] Pmfms loaded in ${Date.now() - now}ms`, entities);
            return {
              data: entities,
              total
            };
          }
        )
      );
  }

  /**
   * Load pmfms
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   * @param opts
   */
  async loadAll(offset: number,
                size: number,
                sortBy?: string,
                sortDirection?: SortDirection,
                filter?: Partial<PmfmFilter>,
                opts?: {
                  query?: any,
                  fetchPolicy?: FetchPolicy;
                  withTotal?: boolean;
                  withDetails?: boolean;
                  toEntity?: boolean;
                  debug?: boolean;
                }): Promise<LoadResult<Pmfm>> {
    opts = opts || {};
    filter = this.asFilter(filter);
    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: filter && filter.asPodObject()
    };
    const debug = this._debug && (opts.debug !== false);
    const now = debug && Date.now();
    if (debug) console.debug("[pmfm-service] Loading pmfms... using variables:", variables);

    const query = opts.query ? opts.query : (
      opts.withDetails ? LoadAllWithDetailsQuery : (
        opts.withTotal ? LoadAllWithTotalQuery : LoadAllQuery
      )
    );
    const {data, total} = await this.graphql.query<LoadResult<any>>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"},
      fetchPolicy: opts.fetchPolicy || undefined
    });

    const entities = opts.toEntity !== false ?
      (data || []).map(Pmfm.fromObject) :
      (data || []) as Pmfm[];

    const res: any = {
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

    if (debug) console.debug(`[pmfm-service] Pmfms loaded in ${Date.now() - now}ms`);

    return res;
  }

  async saveAll(data: Pmfm[], options?: any): Promise<Pmfm[]> {
    if (!data) return data;
    return await Promise.all(data.map(pmfm => this.save(pmfm, options)));
  }

  deleteAll(data: Pmfm[], options?: any): Promise<any> {
    throw new Error("Not implemented yet");
  }

  async suggest(value: any, filter?: PmfmFilter|any): Promise<LoadResult<Pmfm>> {
    if (ReferentialUtils.isNotEmpty(value)) return {data: [value]};
    value = (typeof value === "string" && value !== '*') && value || undefined;
    return this.loadAll(0, !value ? 30 : 10, filter && filter.searchAttribute || null, null,
      { ...filter, searchText: value},
      {
        query: LoadAllWithPartsQueryWithTotal,
        withTotal: true /*need for fetch more*/
      }
    );
  }

  /**
   * Get referential references, group by level labels
   * @param parameterLabelsMap
   * @param opts
   */
  async loadIdsGroupByParameterLabels(parameterLabelsMap: ObjectMap<string[]>,
                                      opts?: {
                                        cache?: boolean;
                                      }): Promise<ObjectMap<number[]>> {

    if (!opts || opts.cache !== false) {
      const cacheKey = [
        PmfmCacheKeys.PMFM_IDS_BY_PARAMETER_LABEL,
        this.cryptoService.sha256(JSON.stringify(parameterLabelsMap)).substring(0, 8) // Create a unique hash, from args
      ].join('|');
      return this.cache.getOrSetItem<ObjectMap<number[]>>(cacheKey,
        () => this.loadIdsGroupByParameterLabels(parameterLabelsMap, {cache: false}),
        PmfmCacheKeys.CACHE_GROUP);
    }

    // Load pmfms grouped by parameter labels
    const map = await this.referentialRefService.loadAllGroupByLevels({
        entityName: 'Pmfm',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      { levelLabels: parameterLabelsMap },
      { toEntity: false, debug: this._debug });

    // Keep only id
    return Object.keys(map).reduce((res, key) => {
      res[key] = map[key].map(e => e.id);
      return res;
    }, {});
  }

  asFilter(filter: Partial<PmfmFilter>): PmfmFilter {
    return PmfmFilter.fromObject(filter);
  }

  /* -- protected methods -- */

  protected fillDefaultProperties(entity: Pmfm) {
    entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.ENABLE;
  }

  protected copyIdAndUpdateDate(source: Pmfm, target: Pmfm) {
    EntityUtils.copyIdAndUpdateDate(source, target);

    // Update Qualitative values
    if (source.qualitativeValues && target.qualitativeValues) {
      target.qualitativeValues.forEach(entity => {
        const savedQualitativeValue = source.qualitativeValues.find(json => entity.equals(json));
        EntityUtils.copyIdAndUpdateDate(savedQualitativeValue, entity);
      });
    }

  }
}
