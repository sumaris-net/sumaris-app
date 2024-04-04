import { __decorate, __metadata } from "tslib";
import { BaseEntityService, GraphqlService, PlatformService } from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { WeightLengthConversion } from '@app/referential/taxon-name/weight-length-conversion/weight-length-conversion.model';
import { WeightLengthConversionFilter } from '@app/referential/services/filter/weight-length-conversion.filter';
import { gql } from '@apollo/client/core';
import { WeightLengthConversionFragments } from '@app/referential/taxon-name/weight-length-conversion/weight-length-conversion.fragments';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
const Queries = {
    loadAll: gql `query WeightLengthConversions($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: WeightLengthConversionFilterVOInput){
    data: weightLengthConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...WeightLengthConversionFragment
    }
  }
  ${WeightLengthConversionFragments.full}`,
    loadAllWithTotal: gql `query WeightLengthConversionsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: WeightLengthConversionFilterVOInput){
      data: weightLengthConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
          ...WeightLengthConversionFragment
      }
      total: weightLengthConversionsCount(filter: $filter)
  }
  ${WeightLengthConversionFragments.full}`
};
const Mutations = {
    saveAll: gql `mutation SaveWeightLengthConversions($data: [WeightLengthConversionVOInput]!){
    data: saveWeightLengthConversions(data: $data){
      ...WeightLengthConversionFragment
    }
  }
  ${WeightLengthConversionFragments.full}`,
    deleteAll: gql `mutation DeleteWeightLengthConversions($ids: [Int]!){
    deleteWeightLengthConversions(ids: $ids)
  }`,
};
let WeightLengthConversionService = class WeightLengthConversionService extends BaseEntityService {
    constructor(graphql, platform) {
        super(graphql, platform, WeightLengthConversion, WeightLengthConversionFilter, {
            queries: Queries,
            mutations: Mutations
        });
        this.graphql = graphql;
        this.platform = platform;
    }
    asObject(entity, opts) {
        return super.asObject(entity, Object.assign(Object.assign({}, MINIFY_OPTIONS), opts));
    }
};
WeightLengthConversionService = __decorate([
    Injectable({ providedIn: 'root' })
    // @ts-ignore
    ,
    __metadata("design:paramtypes", [GraphqlService,
        PlatformService])
], WeightLengthConversionService);
export { WeightLengthConversionService };
//# sourceMappingURL=weight-length-conversion.service.js.map