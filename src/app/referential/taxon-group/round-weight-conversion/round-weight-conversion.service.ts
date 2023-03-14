import {
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseEntityService,
  EntityAsObjectOptions,
  GraphqlService,
  IEntityService,
  MINIFY_ENTITY_FOR_POD,
  PlatformService
} from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { RoundWeightConversion } from './round-weight-conversion.model';
import { RoundWeightConversionFilter } from './round-weight-conversion.filter';
import { gql } from '@apollo/client/core';
import { RoundWeightConversionFragments } from './round-weight-conversion.fragments';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

const QUERIES: BaseEntityGraphqlQueries = {
  loadAll: gql`query RoundWeightConversions($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: RoundWeightConversionFilterVOInput){
    data: roundWeightConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...RoundWeightConversionFragment
    }
  }
  ${RoundWeightConversionFragments.full}`,

  loadAllWithTotal: gql`query RoundWeightConversionsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: RoundWeightConversionFilterVOInput){
      data: roundWeightConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
          ...RoundWeightConversionFragment
      }
      total: roundWeightConversionsCount(filter: $filter)
  }
  ${RoundWeightConversionFragments.full}`
};


const MUTATIONS: BaseEntityGraphqlMutations = {
  saveAll: gql`mutation SaveRoundWeightConversions($data: [RoundWeightConversionVOInput]!){
    data: saveRoundWeightConversions(data: $data){
      ...RoundWeightConversionFragment
    }
  }
  ${RoundWeightConversionFragments.full}`,

  deleteAll: gql`mutation DeleteRoundWeightConversions($ids: [Int]!){
    deleteRoundWeightConversions(ids: $ids)
  }`,
};
@Injectable({providedIn: 'root'})
// @ts-ignore
export class RoundWeightConversionService extends BaseEntityService<RoundWeightConversion, RoundWeightConversionFilter, number>
  implements IEntityService<RoundWeightConversion> {

  constructor(
    protected graphql: GraphqlService,
    protected platform: PlatformService
  ) {
    super(graphql, platform,
      RoundWeightConversion, RoundWeightConversionFilter,
      {
        queries: QUERIES,
        mutations: MUTATIONS
      });
  }

  protected asObject(entity: RoundWeightConversion, opts?: EntityAsObjectOptions): any {
    // Can be override by subclasses
    return entity.asObject({...MINIFY_OPTIONS, ...opts});
  }
}
