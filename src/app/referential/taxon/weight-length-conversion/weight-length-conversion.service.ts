import { BaseEntityGraphqlMutations, BaseEntityGraphqlQueries, BaseEntityService, EntityAsObjectOptions, GraphqlService, IEntityService, PlatformService } from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { WeightLengthConversion } from '@app/referential/taxon/weight-length-conversion/weight-length-conversion.model';
import { WeightLengthConversionFilter } from '@app/referential/services/filter/weight-length-conversion.filter';
import { gql } from '@apollo/client/core';
import { WeightLengthConversionFragments } from '@app/referential/taxon/weight-length-conversion/weight-length-conversion.fragments';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

const Queries: BaseEntityGraphqlQueries = {
  loadAll: gql`query WeightLengthConversions($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: WeightLengthConversionFilterVOInput){
    data: weightLengthConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...WeightLengthConversionFragment
    }
  }
  ${WeightLengthConversionFragments.full}`,

  loadAllWithTotal: gql`query WeightLengthConversionsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: WeightLengthConversionFilterVOInput){
      data: weightLengthConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
          ...WeightLengthConversionFragment
      }
      total: weightLengthConversionsCount(filter: $filter)
  }
  ${WeightLengthConversionFragments.full}`
};


const Mutations: BaseEntityGraphqlMutations = {
  saveAll: gql`mutation SaveWeightLengthConversions($data: [WeightLengthConversionVOInput]!){
    data: saveWeightLengthConversions(data: $data){
      ...WeightLengthConversionFragment
    }
  }
  ${WeightLengthConversionFragments.full}`,

  deleteAll: gql`mutation DeleteWeightLengthConversions($ids: [Int]!){
    deleteWeightLengthConversions(ids: $ids)
  }`,
};

@Injectable({providedIn: 'root'})
// @ts-ignore
export class WeightLengthConversionService extends BaseEntityService<WeightLengthConversion, WeightLengthConversionFilter, number>
  implements IEntityService<WeightLengthConversion> {

  constructor(
    protected graphql: GraphqlService,
    protected platform: PlatformService
  ) {
    super(graphql, platform,
      WeightLengthConversion, WeightLengthConversionFilter,
      {
        queries: Queries,
        mutations: Mutations
      });
  }

  protected asObject(entity: WeightLengthConversion, opts?: EntityAsObjectOptions): any {
    return super.asObject(entity, {...MINIFY_OPTIONS, ...opts});
  }
}
