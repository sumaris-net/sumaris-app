import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { VesselFeatures } from './model/vessel.model';
import { BaseEntityService, GraphqlService } from '@sumaris-net/ngx-components';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { VesselFeaturesFilter } from './filter/vessel.filter';
import { PlatformService } from '@sumaris-net/ngx-components';
import { isNotNil } from '@sumaris-net/ngx-components';
export const VesselFeaturesFragments = {
    vesselFeatures: gql `fragment VesselFeaturesFragment on VesselFeaturesVO {
      id
      startDate
      endDate
      name
      exteriorMarking
      administrativePower
      lengthOverAll
      grossTonnageGt
      grossTonnageGrt
      constructionYear
      ircs
      hullMaterial {
        ...LightReferentialFragment
      }
      creationDate
      updateDate
      comments
      basePortLocation {
        ...LocationFragment
      }
      recorderDepartment {
        ...LightDepartmentFragment
      }
      recorderPerson {
        ...LightPersonFragment
      }
    }`,
};
export const VesselFeatureQueries = {
    loadAll: gql `query VesselFeaturesHistory($filter: VesselFeaturesFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: vesselFeaturesHistory(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...VesselFeaturesFragment
    }
  }
  ${VesselFeaturesFragments.vesselFeatures}
  ${ReferentialFragments.location}
  ${ReferentialFragments.lightDepartment}
  ${ReferentialFragments.lightPerson}
  ${ReferentialFragments.lightReferential}`
};
let VesselFeaturesService = class VesselFeaturesService extends BaseEntityService {
    constructor(graphql, platform) {
        super(graphql, platform, VesselFeatures, VesselFeaturesFilter, {
            queries: VesselFeatureQueries,
            defaultSortBy: 'startDate'
        });
    }
    count(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, total } = yield this.loadAll(0, 100, null, null, filter, opts);
            return isNotNil(total) ? total : (data || []).length;
        });
    }
};
VesselFeaturesService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        PlatformService])
], VesselFeaturesService);
export { VesselFeaturesService };
//# sourceMappingURL=vessel-features.service.js.map