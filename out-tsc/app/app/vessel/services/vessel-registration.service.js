import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { VesselRegistrationPeriod } from './model/vessel.model';
import { BaseEntityService, GraphqlService } from '@sumaris-net/ngx-components';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { PlatformService } from '@sumaris-net/ngx-components';
import { VesselRegistrationFilter } from './filter/vessel.filter';
import { isNotNil } from '@sumaris-net/ngx-components';
export const VesselRegistrationFragments = {
    registration: gql `fragment VesselRegistrationPeriodFragment on VesselRegistrationPeriodVO {
    id
    startDate
    endDate
    registrationCode
    intRegistrationCode
    registrationLocation {
      ...LocationFragment
    }
  }`
};
export const VesselRegistrationsQueries = {
    loadAll: gql `query VesselRegistrationHistory($filter: VesselRegistrationFilterVOInput!, , $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: vesselRegistrationHistory(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...VesselRegistrationPeriodFragment
    }
  }
  ${VesselRegistrationFragments.registration}
  ${ReferentialFragments.location}`
};
let VesselRegistrationService = class VesselRegistrationService extends BaseEntityService {
    constructor(graphql, platform) {
        super(graphql, platform, VesselRegistrationPeriod, VesselRegistrationFilter, {
            queries: VesselRegistrationsQueries,
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
VesselRegistrationService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        PlatformService])
], VesselRegistrationService);
export { VesselRegistrationService };
//# sourceMappingURL=vessel-registration.service.js.map