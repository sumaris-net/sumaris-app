import { Injectable } from '@angular/core';
import { ApolloCache, gql, WatchQueryFetchPolicy } from '@apollo/client/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';


import {
  AccountService,
  BaseEntityGraphqlQueries,
  BaseEntityService,
  EntityServiceLoadOptions,
  GraphqlService,
  IEntitiesService,
  isNil,
  LoadResult,
  PlatformService
} from '@sumaris-net/ngx-components';
import { ExtractionType } from './extraction-type.model';
import { DataCommonFragments } from '@app/trip/services/trip.queries';
import { SortDirection } from '@angular/material/sort';
import { ExtractionTypeFilter } from '@app/extraction/type/extraction-type.filter';


export const ExtractionTypeFragments = {

  type: gql`fragment ExtractionTypeFragment on ExtractionTypeVO {
    id
    label
    name
    format
    version
    description
    docUrl
    updateDate
    comments
    isSpatial
    statusId
    sheetNames
    processingFrequencyId
    recorderPerson {
      ...LightPersonFragment
    }
    recorderDepartment {
      ...LightDepartmentFragment
    }
  }
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}`
};

const Queries: BaseEntityGraphqlQueries = {

  loadAll: gql`query ExtractionTypes($filter: ExtractionTypeFilterVOInput) {
      data: extractionTypes(filter: $filter) {
        ...ExtractionTypeFragment
      }
    }
    ${ExtractionTypeFragments.type}`,

}

const fixWorkaroundDataFn = ({data, total}) => {
  // Workaround because saveAggregation() doest not add NEW extraction type correctly
  data = (data || []).filter(e => {
    if (isNil(e?.label)) {
      console.warn('[extraction-service] FIXME: Invalid extraction type (no format)... bad cache insertion in saveAggregation() ?');
      return false;
    }
    return true;
  });
  return {data, total}
};

@Injectable({providedIn: 'root'})
export class ExtractionTypeService
  extends BaseEntityService<ExtractionType, ExtractionTypeFilter>
  implements IEntitiesService<ExtractionType, ExtractionTypeFilter> {

  constructor(
    protected graphql: GraphqlService,
    protected platformService: PlatformService,
    protected accountService: AccountService
  ) {
    super(graphql, platformService, ExtractionType, ExtractionTypeFilter, {
      queries: Queries
    });
  }


  loadAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection,
          filter?: Partial<ExtractionTypeFilter>,
          opts?: EntityServiceLoadOptions & { query?: any; debug?: boolean; withTotal?: boolean }): Promise<LoadResult<ExtractionType>> {
    return super.loadAll(offset, size, sortBy, sortDirection, filter, {
      ...opts,
      withTotal: false // Always false (loadAllWithTotal query not defined yet)
    })
      .then(fixWorkaroundDataFn);
  }

  /**
   * Watch products
   */
  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: ExtractionTypeFilter,
    options?: { fetchPolicy?: WatchQueryFetchPolicy }
  ): Observable<LoadResult<ExtractionType>> {

    return super.watchAll(offset, size, sortBy, sortDirection, filter, options)
      .pipe(map(fixWorkaroundDataFn));
  }

  insertIntoCache(cache: ApolloCache<{data: any}>, entity: ExtractionType) {
    if (!entity || isNil(entity.id)) throw new Error('Extraction type (with an id) is required, to insert into the cache.');

    console.info('[extraction-type-service] Inserting into cache:', entity);
    this.insertIntoMutableCachedQueries(cache, {
       queries: this.getLoadQueries(),
       data: entity
     });
  }

  updateCache(cache: ApolloCache<{data: any}>, entity: ExtractionType) {
    if (!entity || isNil(entity.id)) throw new Error('Extraction type (with an id) is required, to update the cache.');

    console.info('[extraction-type-service] Updating cache:', entity);

    // Remove, then insert, from extraction types
    const exists = this.removeFromMutableCachedQueriesByIds(cache, {
      queries: this.getLoadQueries(),
      ids: entity.id
    }) > 0;
    if (exists) {
      this.insertIntoMutableCachedQueries(cache, {
        queries: this.getLoadQueries(),
        data: entity
      });
    }
  }
}
