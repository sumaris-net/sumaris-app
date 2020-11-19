import {Injectable} from "@angular/core";
import gql from "graphql-tag";
import {
  EntityService,
  EntityServiceLoadOptions, isNil, isNotNil,
  LoadResult,
  SuggestService,
  EntitiesService
} from "../../shared/shared.module";
import {BaseEntityService, EntityUtils, StatusIds} from "../../core/core.module";
import {ErrorCodes} from "./errors";
import {AccountService} from "../../core/services/account.service";
import {GraphqlService} from "../../core/services/graphql.service";
import {environment} from "../../../environments/environment";
import {ReferentialFilter, ReferentialService} from "./referential.service";
import {Pmfm} from "./model/pmfm.model";
import {Observable, of} from "rxjs";
import {ReferentialFragments} from "./referential.fragments";
import {map} from "rxjs/operators";
import {FetchPolicy, WatchQueryFetchPolicy} from "apollo-client";
import {ReferentialUtils, SAVE_AS_OBJECT_OPTIONS} from "../../core/services/model/referential.model";
import {SortDirection} from "@angular/material/sort";
import { FilterFn } from 'src/app/shared/services/entity-service.class';
import { ReferentialRefFilter } from './referential-ref.service';

const LoadAllQuery: any = gql`
  query Pmfms($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    pmfms(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...PmfmFragment
    }
  }
  ${ReferentialFragments.pmfm}
`;
const LoadAllWithDetailsQuery: any = gql`
  query PmfmsWithDetails($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    pmfms(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...FullPmfmFragment
    }
    referentialsCount(entityName: "Pmfm", filter: $filter)
  }
  ${ReferentialFragments.fullPmfm}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.fullReferential}
  ${ReferentialFragments.fullParameter}
`;
const LoadAllWithTotalQuery: any = gql`
  query PmfmsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    pmfms(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...PmfmFragment
    }
    referentialsCount(entityName: "Pmfm", filter: $filter)
  }
  ${ReferentialFragments.pmfm}
`;

const LoadQuery: any = gql`
  query Pmfm($label: String, $id: Int){
    pmfm(label: $label, id: $id){
      ...FullPmfmFragment
    }
  }
  ${ReferentialFragments.fullPmfm}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.fullReferential}
  ${ReferentialFragments.fullParameter}
`;

const SaveQuery: any = gql`
  mutation SavePmfm($pmfm:PmfmVOInput){
    savePmfm(pmfm: $pmfm){
      ...FullPmfmFragment
    }
  }
  ${ReferentialFragments.fullPmfm}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.fullReferential}
  ${ReferentialFragments.fullParameter}
`;

export class PmfmFilter extends ReferentialRefFilter {
  entityName: 'Pmfm';
  parametersCodes?: string[];


  static  searchFilter<T extends Pmfm>(f: PmfmFilter): FilterFn<T>{
      const filterFns: FilterFn<T>[] = [];


      // Filter by parameters
      //const statusIds = f.statusIds || (isNotNil(f.statusId) && [f.statusId]) || undefined;
      //if (statusIds) {
      //  filterFns.push((entity) => !!statusIds.find(v => entity.statusId === v));
      //}

      const searchTextFilter = EntityUtils.searchTextFilter(f.searchAttribute || f.searchAttributes, f.searchText);
      if (searchTextFilter) filterFns.push(searchTextFilter);

      if (!filterFns.length) return undefined;

      return (entity) => !filterFns.find(fn => !fn(entity));
    }

    constructor() {
      super();
      this.entityName = 'Pmfm';
    }


}

@Injectable({providedIn: 'root'})
export class PmfmService extends BaseEntityService implements EntityService<Pmfm>,
  EntitiesService<Pmfm, PmfmFilter>,
  SuggestService<Pmfm, PmfmFilter>
{

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected referentialService: ReferentialService
  ) {
    super(graphql);
  }

  async existsByLabel(label: string, opts?: { excludedId?: number; }): Promise<boolean> {
    if (isNil(label)) return false;
    return await this.referentialService.existsByLabel(label, { ...opts, entityName: 'Pmfm' });
  }

  async load(id: number, options?: EntityServiceLoadOptions): Promise<Pmfm> {

    if (this._debug) console.debug(`[pmfm-service] Loading pmfm {${id}}...`);

    const res = await this.graphql.query<{ pmfm: any }>({
      query: LoadQuery,
      variables: {
        id: id
      },
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"}
    });
    const entity = res && res.pmfm && Pmfm.fromObject(res.pmfm);

    if (this._debug) console.debug(`[pmfm-service] Pmfm {${id}} loaded`, entity);

    return entity;
  }

  /**
   * Save a pmfm entity
   * @param entity
   */
  async save(entity: Pmfm, options?: EntityServiceLoadOptions): Promise<Pmfm> {

    this.fillDefaultProperties(entity);

    // Transform into json
    const json = entity.asObject(SAVE_AS_OBJECT_OPTIONS);

    const now = Date.now();
    if (this._debug) console.debug(`[pmfm-service] Saving Pmfm...`, json);

    await this.graphql.mutate<{ savePmfm: any }>({
      mutation: SaveQuery,
      variables: {
        pmfm: json
      },
      error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR" },
      update: (proxy, {data}) => {
        // Update entity
        const savedEntity = data && data.savePmfm;
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
      fetchPolicy?: WatchQueryFetchPolicy;
      withTotal?: boolean;
    }
  ): Observable<LoadResult<Pmfm>> {
    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: PmfmFilter.asPodObject(filter)
    };
    const now = Date.now();
    if (this._debug) console.debug("[pmfm-service] Watching pmfms using options:", variables);

    const query = (!opts || opts.withTotal !== false) ? LoadAllWithTotalQuery : LoadAllQuery;
    return this.graphql.watchQuery<{ pmfms: any[], referentialsCount?: number }>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"},
      fetchPolicy: opts && opts.fetchPolicy || undefined
    })
      .pipe(
        map(res => {
            const data = (res && res.pmfms || []).map(Pmfm.fromObject);
            if (this._debug) console.debug(`[pmfm-service] Pmfms loaded in ${Date.now() - now}ms`, data);
            return {
              data: data,
              total: res.referentialsCount
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
   */
  async loadAll(offset: number,
                size: number,
                sortBy?: string,
                sortDirection?: SortDirection,
                filter?: PmfmFilter,
                opts?: {
                  query?: any,
                  fetchPolicy?: FetchPolicy;
                  withTotal?: boolean;
                  withDetails?: boolean;
                  toEntity?: boolean;
                  debug?: boolean;
                }): Promise<LoadResult<Pmfm>> {
    opts = opts || {};
    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: PmfmFilter.asPodObject(filter)
    };
    const debug = this._debug && (opts.debug !== false);
    const now = debug && Date.now();
    if (debug) console.debug("[pmfm-service] Loading pmfms... using options:", variables);

    const query = opts.query ? opts.query : (
      opts.withDetails ? LoadAllWithDetailsQuery : (
        opts.withTotal ? LoadAllWithTotalQuery : LoadAllQuery
      )
    );
    const res = await this.graphql.query<{ pmfms: any[], referentialsCount?: number }>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"},
      fetchPolicy: opts && opts.fetchPolicy || undefined
    });

    const data = (!opts || opts.toEntity !== false) ?
      (res && res.pmfms || []).map(Pmfm.fromObject) :
      (res && res.pmfms || []) as Pmfm[];
    if (debug) console.debug(`[pmfm-service] Pmfms loaded in ${Date.now() - now}ms`);
    return {
      data: data,
      total: res.referentialsCount
    };

  }


  async saveAll(data: Pmfm[], options?: any): Promise<Pmfm[]> {
    if (!data) return data;
    return await Promise.all(data.map((pmfm) => this.save(pmfm, options)));
  }

  deleteAll(data: Pmfm[], options?: any): Promise<any> {
    throw new Error("Not implemented yet");
  }

  async suggest(value: any, filter?: PmfmFilter): Promise<Pmfm[]> {
    if (ReferentialUtils.isNotEmpty(value)) return [value];
    value = (typeof value === "string" && value !== '*') && value || undefined;
    const res = await this.loadAll(0, !value ? 30 : 10, null, null,
      { ...filter, searchText: value},
      { withTotal: false /* total not need */ }
    );
    return res.data;
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
