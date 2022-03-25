import { BaseEntityGraphqlQueries, BaseEntityService, EntityAsObjectOptions, GraphqlService, IEntityService, PlatformService } from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { WeightLengthConversion, WeightLengthConversionRef } from '@app/referential/weight-length-conversion/weight-length-conversion.model';
import { WeightLengthConversionFilter } from '@app/referential/services/filter/weight-length-conversion.filter';
import { gql } from '@apollo/client/core';
import { WeightLengthConversionFragments } from '@app/referential/weight-length-conversion/weight-length-conversion.fragments';

const QUERIES: BaseEntityGraphqlQueries = {
  loadAll: gql`query WeightLengthConversions($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: WeightLengthConversionFilterVOInput){
    data: weightLengthConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...WeightLengthConversionRefFragment
    }
  }
  ${WeightLengthConversionFragments.reference}`,

  loadAllWithTotal: gql`query WeightLengthConversionsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: WeightLengthConversionFilterVOInput){
      data: weightLengthConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
          ...WeightLengthConversionRefFragment
      }
      total: weightLengthConversionsCount(filter: $filter)
  }
  ${WeightLengthConversionFragments.reference}`
};


@Injectable({providedIn: 'root'})
// @ts-ignore
export class RoundWeightConversionRefService extends BaseEntityService<WeightLengthConversionRef, WeightLengthConversionFilter, number>
  implements IEntityService<WeightLengthConversionRef> {

  constructor(
    protected graphql: GraphqlService,
    protected platform: PlatformService
  ) {
    super(graphql, platform,
      WeightLengthConversionRef, WeightLengthConversionFilter,
      {
        queries: QUERIES
      });
  }

}
