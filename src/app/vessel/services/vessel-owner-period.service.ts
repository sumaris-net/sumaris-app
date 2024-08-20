import { Injectable } from '@angular/core';
import { FetchPolicy, gql } from '@apollo/client/core';
import { BaseEntityService, GraphqlService, IEntitiesService, isNotNil, PlatformService } from '@sumaris-net/ngx-components';
import { VesselOwnerPeriodFilter } from './filter/vessel.filter';
import { VesselOwnerPeriod } from './model/vessel-owner-period.model';

export const VesselOwnerPeriodFragments = {
  vesselOwner: gql`
    fragment VesselOwnerFragment on VesselOwnerPeriodVO {
      startDate
      endDate
      vesselOwner {
        id
        lastName
        firstName
        registrationCode
        activityStartDate
        retirementDate
        program {
          id
          label
        }
      }
    }
  `,
  vesselOwnerWithAdministrativeInfos: gql`
    fragment VesselOwnerFragmentWithAdministrativeInfos on VesselOwnerPeriodVO {
      startDate
      endDate
      vesselOwner {
        id
        lastName
        firstName
        registrationCode
        activityStartDate
        retirementDate
        street
        zipCode
        city
        dateOfBirth
        phoneNumber
        mobileNumber
        faxNumber
        email
        program {
          id
          label
        }
      }
    }
  `,
};

export const VesselOwnerPeriodQueries = {
  loadAll: gql`
    query vesselOwnerHistory($filter: VesselFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: vesselOwnerHistory(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...VesselOwnerFragment
      }
    }
    ${VesselOwnerPeriodFragments.vesselOwner}
  `,
  loadAllWithTotal: gql`
    query vesselOwnerHistory($filter: VesselFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: vesselOwnerHistory(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...VesselOwnerFragment
      }
      total: vesselOwnerHistoryCount(filter: $filter)
    }
    ${VesselOwnerPeriodFragments.vesselOwner}
  `,
};

@Injectable({ providedIn: 'root' })
export class VesselOwnerPeridodService
  extends BaseEntityService<VesselOwnerPeriod, VesselOwnerPeriodFilter>
  implements IEntitiesService<VesselOwnerPeriod, VesselOwnerPeriodFilter>
{
  constructor(graphql: GraphqlService, platform: PlatformService) {
    super(graphql, platform, VesselOwnerPeriod, VesselOwnerPeriodFilter, {
      queries: VesselOwnerPeriodQueries,
      defaultSortBy: 'startDate',
      defaultSortDirection: 'desc',
    });
    this._logPrefix = '[vessel-owner-period-service] ';
  }

  async count(
    filter: Partial<VesselOwnerPeriodFilter> & { id: number },
    opts?: {
      fetchPolicy?: FetchPolicy;
    }
  ): Promise<number> {
    const { data, total } = await this.loadAll(0, 100, null, null, filter, opts);
    return isNotNil(total) ? total : (data || []).length;
  }

  /* -- protected methods -- */
}
