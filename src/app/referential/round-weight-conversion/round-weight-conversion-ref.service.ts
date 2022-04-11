import { BaseEntityGraphqlQueries, BaseEntityService, GraphqlService, IEntityService, PlatformService } from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { RoundWeightConversionRef } from '@app/referential/round-weight-conversion/round-weight-conversion.model';
import { gql } from '@apollo/client/core';
import { RoundWeightConversionFragments } from '@app/referential/round-weight-conversion/round-weight-conversion.fragments';
import { RoundWeightConversionFilter } from '@app/referential/round-weight-conversion/round-weight-conversion.filter';

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

}
