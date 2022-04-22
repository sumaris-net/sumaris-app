import {
  BaseEntityGraphqlQueries,
  BaseEntityService,
  CryptoService, EntitiesStorage, EntityServiceLoadOptions,
  firstArrayValue,
  GraphqlService,
  IEntityService,
  isEmptyArray,
  isNil,
  isNotNil, LoadResult, NetworkService,
  PlatformService
} from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { RoundWeightConversion, RoundWeightConversionRef } from '@app/referential/round-weight-conversion/round-weight-conversion.model';
import { gql } from '@apollo/client/core';
import { RoundWeightConversionFragments } from '@app/referential/round-weight-conversion/round-weight-conversion.fragments';
import { RoundWeightConversionFilter } from '@app/referential/round-weight-conversion/round-weight-conversion.filter';
import { WeightLengthConversionFilter } from '@app/referential/services/filter/weight-length-conversion.filter';
import { WeightLengthConversion, WeightLengthConversionRef } from '@app/referential/weight-length-conversion/weight-length-conversion.model';
import { isMoment, Moment } from 'moment';
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

  FIND_BEST: 'findBest'
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
    protected cryptoService: CryptoService,
    protected entities: EntitiesStorage
  ) {
    super(graphql, platform,
      RoundWeightConversionRef, RoundWeightConversionFilter,
      {
        queries: QUERIES
      });
  }

  async findAppliedConversion(filter: Partial<RoundWeightConversionFilter>
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
        CacheKeys.FIND_BEST,
        this.cryptoService.sha256(JSON.stringify(filter.asObject())).substring(0, 8)
      ].join('|');
      return this.cache.getOrSetItem(cacheKey,
        () => this.findAppliedConversion(filter, {...opts, cache: false}),
        CacheKeys.CACHE_GROUP
      );
    }

    const size = 10;
    let res = await this.loadAll(0, size, 'startDate', 'desc', filter, {withTotal: false, toEntity: false});

    if (isEmptyArray(res?.data)) {
      console.debug(this._logPrefix + 'No conversion found!')
      return undefined;
    }

    return firstArrayValue(res.data);
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
}
