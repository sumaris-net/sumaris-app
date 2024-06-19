import { Injectable } from '@angular/core';
import { FetchPolicy, gql } from '@apollo/client/core';
import { BaseEntityService, GraphqlService } from '@sumaris-net/ngx-components';
import { IEntitiesService } from '@sumaris-net/ngx-components';
import { PlatformService } from '@sumaris-net/ngx-components';
import { isNotNil } from '@sumaris-net/ngx-components';
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
};

export const VesselOwnerPeriodQueries = {
  loadAll: gql`
    query vesselOwnerHistory($filter: VesselOwnerFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: vesselOwnerHistory(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...VesselOwnerFragment
      }
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
    });
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

  async getVesselOwnerPeriodsByFilter(filter: Partial<VesselOwnerPeriodFilter>, opts?: { fetchPolicy?: FetchPolicy }): Promise<VesselOwnerPeriod[]> {
    try {
      const { data } = await this.loadAll(0, 100, null, null, filter, opts);
      return data;
    } catch (error) {
      console.error('[Vessel-Owner-Peridod-Service] Error fetching data:', error);
      throw error;
    }
  }

  /* -- protected methods -- */
}
