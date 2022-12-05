import {
  BaseEntityGraphqlQueries,
  BaseEntityService,
  CryptoService,
  EntitiesStorage,
  EntityServiceLoadOptions,
  GraphqlService,
  IEntityService,
  isEmptyArray,
  isNil,
  LoadResult,
  NetworkService,
  PlatformService
} from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { RoundWeightConversion, RoundWeightConversionRef } from '@app/referential/round-weight-conversion/round-weight-conversion.model';
import { gql } from '@apollo/client/core';
import { RoundWeightConversionFragments } from '@app/referential/round-weight-conversion/round-weight-conversion.fragments';
import { RoundWeightConversionFilter } from '@app/referential/round-weight-conversion/round-weight-conversion.filter';
import { Moment } from 'moment';
import { CacheService } from 'ionic-cache';
import { SortDirection } from '@angular/material/sort';

const QUERIES: BaseEntityGraphqlQueries = {
  loadAll: gql`query RoundWeightConversions($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: RoundWeightConversionFilterVOInput){
    data: roundWeightConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...RoundWeightConversionRefFragment
    }
  }
  ${RoundWeightConversionFragments.reference}`,

  loadAllWithTotal: gql`query RoundWeightConversionsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: RoundWeightConversionFilterVOInput){
      data: roundWeightConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
          ...RoundWeightConversionRefFragment
      }
      total: roundWeightConversionsCount(filter: $filter)
  }
  ${RoundWeightConversionFragments.reference}`
};


const CacheKeys = {
  CACHE_GROUP: RoundWeightConversion.TYPENAME,

  LOAD: 'roundWeightConversionByFilter',

  EMPTY_VALUE: new RoundWeightConversionRef()
};

@Injectable({providedIn: 'root'})
// @ts-ignore
export class RoundWeightConversionRefService extends BaseEntityService<RoundWeightConversionRef, RoundWeightConversionFilter>
  implements IEntityService<RoundWeightConversionRef> {


  constructor(
    protected graphql: GraphqlService,
    protected platform: PlatformService,
    protected cache: CacheService,
    protected network: NetworkService,
    protected entities: EntitiesStorage
  ) {
    super(graphql, platform,
      RoundWeightConversionRef, RoundWeightConversionFilter,
      {
        queries: QUERIES
      });
  }

  /**
   * Convert an alive weight, into the expected dressing/preservation state
   * @param conversion
   * @param value
   */
  inverseAliveWeight(conversion: RoundWeightConversionRef|undefined, value: number|undefined): number | undefined {
    if (isNil(value) || !conversion) return undefined;

    // Apply round weight (inverse) conversion
    return value / conversion.conversionCoefficient;
  }


  async loadByFilter(filter: Partial<RoundWeightConversionFilter>
            // Force theis filter's attributes as required
            & {
              date: Moment;
              taxonGroupId: number;
              locationId: number;
              dressingId: number;
              preservingId: number;
            },
             opts?: {cache?: boolean}): Promise<RoundWeightConversionRef | undefined>{

    filter = this.asFilter(filter);

    // Use cache
    if (!opts || opts.cache !== false) {
      // Create a unique hash, from args
      const cacheKey = [
        CacheKeys.LOAD,
        CryptoService.sha256(JSON.stringify(filter.asObject())).substring(0, 8)
      ].join('|');
      return this.cache.getOrSetItem(
        cacheKey,
        () => this.loadByFilter(filter, {...opts, cache: false})
          .then(c => c || CacheKeys.EMPTY_VALUE), // Cache not allowed nil value
        CacheKeys.CACHE_GROUP
      )
        // map EMPTY to undefined
        .then(c => RoundWeightConversionRef.isNotNilOrBlank(c) ? c : undefined);
    }

    const size = 1;
    let res = await this.loadAll(0, size, 'startDate', 'desc', filter, {withTotal: false, toEntity: false});

    // Not found
    if (isEmptyArray(res?.data)) {
      console.debug(this._logPrefix + 'No conversion found!')
      return null;
    }

    return res.data[0];
  }

  loadAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection, filter?: Partial<RoundWeightConversionFilter>,
          opts?: EntityServiceLoadOptions & { query?: any; debug?: boolean; withTotal?: boolean; }): Promise<LoadResult<RoundWeightConversionRef>> {

    filter = this.asFilter(filter);

    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      return this.entities.loadAll<any>(RoundWeightConversion.TYPENAME, {
        offset, size, sortBy, sortDirection,
        filter: filter.asFilterFn()
      });
    }

    return super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
  }

  async clearCache() {
    console.info("[round-weight-conversion-ref-service] Clearing cache...");
    await this.cache.clearGroup(CacheKeys.CACHE_GROUP);
  }
}
