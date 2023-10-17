import { Injectable } from '@angular/core';
import { FetchPolicy, gql } from '@apollo/client/core';
import { ErrorCodes } from './errors';
import {
  AccountService,
  BaseEntityGraphqlQueries,
  BaseGraphqlService,
  EntitiesStorage,
  GraphqlService,
  isNil,
  LoadResult,
  NetworkService,
  ReferentialUtils,
  StatusIds,
  SuggestService
} from '@sumaris-net/ngx-components';
import { ReferentialFragments } from './referential.fragments';
import { SortDirection } from '@angular/material/sort';
import { environment } from '@environments/environment';
import { MetierFilter } from './filter/metier.filter';
import { Metier } from '@app/referential/metier/metier.model';

export const METIER_DEFAULT_FILTER: Readonly<MetierFilter> = Object.freeze(MetierFilter.fromObject({
  entityName: 'Metier',
  statusId: StatusIds.ENABLE
}));

const MetierQueries: BaseEntityGraphqlQueries = {
  loadAll: gql`query Metiers($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: MetierFilterVOInput){
    data: metiers(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightMetierFragment
    }
  }
  ${ReferentialFragments.lightMetier}`,

  loadAllWithTotal: gql`query Metiers($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: MetierFilterVOInput){
      data: metiers(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
        ...LightMetierFragment
      }
      total: metiersCount(filter: $filter)
    }
    ${ReferentialFragments.lightMetier}`,

  load: gql`query Metier($id: Int!){
    metier(id: $id){
      ...MetierFragment
    }
  }
  ${ReferentialFragments.metier}`
};

@Injectable({providedIn: 'root'})
export class MetierService extends BaseGraphqlService
  implements SuggestService<Metier, MetierFilter> {

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected network: NetworkService,
    protected entities: EntitiesStorage,
  ) {
    super(graphql, environment);

    // -- For DEV only
    this._debug = !environment.production;
  }

  async load(id: number, options?: any): Promise<Metier> {
    if (isNil(id)) throw new Error('Missing argument \'id\'');
    const now = this._debug && Date.now();
    if (this._debug) console.debug(`[metier-ref-service] Loading Metier #${id}...`);

    const data = await this.graphql.query<{ metier: Metier }>({
      query: MetierQueries.load,
      variables: {id},
      fetchPolicy: options && options.fetchPolicy || undefined
    });

    if (data && data.metier) {
      const metier = Metier.fromObject(data.metier, {useChildAttributes: false});
      if (metier && this._debug) console.debug(`[metier-ref-service] Metier #${id} loaded in ${Date.now() - now}ms`, metier);
      return metier;
    }
    return null;
  }

  async loadAll(offset: number,
                size: number,
                sortBy?: string,
                sortDirection?: SortDirection,
                filter?: Partial<MetierFilter>,
                opts?: {
                  [key: string]: any;
                  fetchPolicy?: FetchPolicy;
                  debug?: boolean;
                  toEntity?: boolean;
                }): Promise<LoadResult<Metier>> {

    filter = this.asFilter(filter);

    if (!filter) {
      console.error('[metier-ref-service] Missing filter');
      throw {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR'};
    }

    const entityName = filter.entityName || 'Metier';

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || filter.searchAttribute || 'label',
      sortDirection: sortDirection || 'asc'
    };

    const debug = this._debug && (!opts || opts.debug !== false);
    const now = debug && Date.now();
    if (debug) console.debug(`[metier-ref-service] Loading Metier items...`, variables, filter);

    const withTotal = (!opts || opts.withTotal !== false);
    // Offline mode: read from the entities storage
    let res: LoadResult<Metier>;
    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      const typename = entityName + 'VO';
      res = await this.entities.loadAll(typename,
        {
          ...variables,
          filter: filter && filter.asFilterFn()
        }
      );
    }

    // Online mode: use graphQL
    else {
      const query = withTotal ? MetierQueries.loadAllWithTotal : MetierQueries.loadAll;
      res = await this.graphql.query<LoadResult<Metier>>({
        query,
        variables: {
          ...variables,
          filter: filter && filter.asPodObject()
        },
        error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR'},
        fetchPolicy: opts && opts.fetchPolicy || 'cache-first'
      });
    }

    const entities = (!opts || opts.toEntity !== false) ?
      (res?.data || []).map(value => Metier.fromObject(value, {useChildAttributes: false})) :
      (res?.data || []) as Metier[];

    res = {
      data: entities,
      total: res.total || entities.length
    };

    // Add fetch more capability, if total was fetched
    if (withTotal) {
      const nextOffset = offset + entities.length;
      if (nextOffset < res.total) {
        res.fetchMore = () => this.loadAll(nextOffset, size, sortBy, sortDirection, filter, opts);
      }
    }

    if (debug) console.debug(`[metier-ref-service] Metiers loaded in ${Date.now() - now}ms`);

    return res;
  }

  async suggest(value: any, filter?: Partial<MetierFilter>): Promise<LoadResult<Metier>> {
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value as Metier] };
    value = (typeof value === "string" && value !== '*') && value || undefined;
    return this.loadAll(0, !value ? 30 : 10, undefined, undefined,
      {...filter, searchText: value},
      {withTotal: true /* used by autocomplete */}
    );
  }

  asFilter(source: Partial<MetierFilter>): MetierFilter {
    return MetierFilter.fromObject(source);
  }
}
