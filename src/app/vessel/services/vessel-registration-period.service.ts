import { Injectable } from '@angular/core';
import { FetchPolicy, gql } from '@apollo/client/core';
import { VesselRegistrationPeriod } from './model/vessel.model';
import { BaseEntityService, GraphqlService, isNotNil, PlatformService } from '@sumaris-net/ngx-components';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { VesselRegistrationPeriodFilter } from './filter/vessel.filter';

export const VesselRegistrationPeriodFragments = {
  registration: gql`
    fragment VesselRegistrationPeriodFragment on VesselRegistrationPeriodVO {
      id
      startDate
      endDate
      registrationCode
      intRegistrationCode
      registrationLocation {
        ...LocationFragment
      }
    }
  `,
};

export const VesselRegistrationPeriodQueries = {
  loadAll: gql`
    query VesselRegistrationHistory($filter: VesselRegistrationFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: vesselRegistrationHistory(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...VesselRegistrationPeriodFragment
      }
    }
    ${VesselRegistrationPeriodFragments.registration}
    ${ReferentialFragments.location}
  `,
};

@Injectable({ providedIn: 'root' })
export class VesselRegistrationPeriodService extends BaseEntityService<VesselRegistrationPeriod, VesselRegistrationPeriodFilter> {
  constructor(graphql: GraphqlService, platform: PlatformService) {
    super(graphql, platform, VesselRegistrationPeriod, VesselRegistrationPeriodFilter, {
      queries: VesselRegistrationPeriodQueries,
      defaultSortBy: 'startDate',
      defaultSortDirection: 'desc',
    });
  }

  async count(
    filter: Partial<VesselRegistrationPeriodFilter> & { vesselId: number },
    opts?: {
      fetchPolicy?: FetchPolicy;
    }
  ): Promise<number> {
    const { data, total } = await this.loadAll(0, 100, null, null, filter, opts);
    return isNotNil(total) ? total : (data || []).length;
  }

  /* -- protected methods -- */
}
