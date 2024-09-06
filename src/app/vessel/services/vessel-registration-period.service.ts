import { Injectable } from '@angular/core';
import { FetchPolicy, gql } from '@apollo/client/core';
import { VesselRegistrationPeriod } from './model/vessel.model';
import {
  BaseEntityService,
  EntitiesServiceLoadOptions,
  EntitiesServiceWatchOptions,
  firstNotNilPromise,
  GraphqlService,
  isNotNil,
  LoadResult,
  PlatformService,
} from '@sumaris-net/ngx-components';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { VesselRegistrationPeriodFilter } from './filter/vessel.filter';
import { SortDirection } from '@angular/material/sort';
import { Observable, first } from 'rxjs';

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
  loadAllWithTotal: gql`
    query VesselRegistrationHistory($filter: VesselRegistrationFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: vesselRegistrationHistory(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...VesselRegistrationPeriodFragment
      }
      total: vesselRegistrationHistoryCount(filter: $filter)
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
    console.debug('MYTEST COUNT', { data, total });
    return isNotNil(total) ? total : (data || []).length;
  }
  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: VesselRegistrationPeriodFilter,
    opts?: EntitiesServiceWatchOptions
  ): Observable<LoadResult<VesselRegistrationPeriod<VesselRegistrationPeriod<any>>>> {
    const result = super.watchAll(offset, size, sortBy, sortDirection, dataFilter, opts);
    firstNotNilPromise(result).then((data) => {
      console.debug('MYTEST', data);
    });
    return result;
  }
  async loadAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<VesselRegistrationPeriodFilter>,
    opts?: EntitiesServiceLoadOptions & { debug?: boolean }
  ): Promise<LoadResult<VesselRegistrationPeriod<VesselRegistrationPeriod<any>>>> {
    const result = await super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
    return result;
  }
  /* -- protected methods -- */
}
