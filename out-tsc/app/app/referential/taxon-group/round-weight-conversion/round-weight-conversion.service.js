import { __decorate, __metadata } from "tslib";
import { BaseEntityService, GraphqlService, PlatformService } from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { RoundWeightConversion } from './round-weight-conversion.model';
import { RoundWeightConversionFilter } from './round-weight-conversion.filter';
import { gql } from '@apollo/client/core';
import { RoundWeightConversionFragments } from './round-weight-conversion.fragments';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
const QUERIES = {
    loadAll: gql `query RoundWeightConversions($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: RoundWeightConversionFilterVOInput){
    data: roundWeightConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...RoundWeightConversionFragment
    }
  }
  ${RoundWeightConversionFragments.full}`,
    loadAllWithTotal: gql `query RoundWeightConversionsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: RoundWeightConversionFilterVOInput){
      data: roundWeightConversions(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
          ...RoundWeightConversionFragment
      }
      total: roundWeightConversionsCount(filter: $filter)
  }
  ${RoundWeightConversionFragments.full}`
};
const MUTATIONS = {
    saveAll: gql `mutation SaveRoundWeightConversions($data: [RoundWeightConversionVOInput]!){
    data: saveRoundWeightConversions(data: $data){
      ...RoundWeightConversionFragment
    }
  }
  ${RoundWeightConversionFragments.full}`,
    deleteAll: gql `mutation DeleteRoundWeightConversions($ids: [Int]!){
    deleteRoundWeightConversions(ids: $ids)
  }`,
};
let RoundWeightConversionService = class RoundWeightConversionService extends BaseEntityService {
    constructor(graphql, platform) {
        super(graphql, platform, RoundWeightConversion, RoundWeightConversionFilter, {
            queries: QUERIES,
            mutations: MUTATIONS
        });
        this.graphql = graphql;
        this.platform = platform;
    }
    asObject(entity, opts) {
        // Can be override by subclasses
        return entity.asObject(Object.assign(Object.assign({}, MINIFY_OPTIONS), opts));
    }
};
RoundWeightConversionService = __decorate([
    Injectable({ providedIn: 'root' })
    // @ts-ignore
    ,
    __metadata("design:paramtypes", [GraphqlService,
        PlatformService])
], RoundWeightConversionService);
export { RoundWeightConversionService };
//# sourceMappingURL=round-weight-conversion.service.js.map