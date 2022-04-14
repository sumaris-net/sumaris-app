import { BaseEntityGraphqlQueries, BaseEntityService, firstArrayValue, GraphqlService, IEntityService, isEmptyArray, isNil, isNotNil, PlatformService } from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { RoundWeightConversionRef } from '@app/referential/round-weight-conversion/round-weight-conversion.model';
import { gql } from '@apollo/client/core';
import { RoundWeightConversionFragments } from '@app/referential/round-weight-conversion/round-weight-conversion.fragments';
import { RoundWeightConversionFilter } from '@app/referential/round-weight-conversion/round-weight-conversion.filter';
import { WeightLengthConversionFilter } from '@app/referential/services/filter/weight-length-conversion.filter';
import { WeightLengthConversionRef } from '@app/referential/weight-length-conversion/weight-length-conversion.model';
import { isMoment, Moment } from 'moment';

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


@Injectable({providedIn: 'root'})
// @ts-ignore
export class RoundWeightConversionRefService extends BaseEntityService<RoundWeightConversionRef, RoundWeightConversionFilter>
  implements IEntityService<RoundWeightConversionRef> {

  constructor(
    protected graphql: GraphqlService,
    protected platform: PlatformService
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

    // Use cache
    /*if (!opts || opts.cache !== false) {
      const cacheKey = [
        WeightLengthConversionRefCacheKeys.FIND_BEST,
        this.cryptoService.sha256(JSON.stringify(filter)).substring(0, 8) // Create a unique hash, from args
      ].join('|');
      return this.cache.getOrSetItem(cacheKey,
        () => {

        }),
        WeightLengthConversionRefCacheKeys.CACHE_GROUP
      );
    }*/

    const size = 10;
    let res = await this.loadAll(0, size, 'startDate', 'desc', filter, {withTotal: false, toEntity: false});

    if (isEmptyArray(res?.data)) {
      console.debug(this._logPrefix + 'No conversion found!')
      return undefined;
    }

    return firstArrayValue(res.data);
  }
}
