import { Injectable } from '@angular/core';
import { VesselFeatures } from './model/vessel.model';
import {
  BaseEntityService,
  EntitiesServiceWatchOptions,
  EntityUtils,
  GraphqlService,
  IEntitiesService,
  isNotNil,
  LoadResult,
  PlatformService,
} from '@sumaris-net/ngx-components';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { VesselFeaturesFilter } from './filter/vessel.filter';
import { SortDirection } from '@angular/material/sort';
import { map, Observable } from 'rxjs';
import { FetchPolicy, gql } from '@apollo/client/core';
import { VesselFeaturesUtils } from './model/vessel.utils';

export declare interface VesselFeaturesServiceWatchOptions extends EntitiesServiceWatchOptions {
  mergeAll?: boolean | (() => boolean);
}
export const VesselFeaturesFragments = {
  vesselFeatures: gql`
    fragment VesselFeaturesFragment on VesselFeaturesVO {
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
      isFpc
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
    }
  `,
};

export const VesselFeatureQueries = {
  loadAll: gql`
    query VesselFeaturesHistory($filter: VesselFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: vesselFeaturesHistory(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...VesselFeaturesFragment
      }
    }
    ${VesselFeaturesFragments.vesselFeatures}
    ${ReferentialFragments.location}
    ${ReferentialFragments.lightDepartment}
    ${ReferentialFragments.lightPerson}
    ${ReferentialFragments.lightReferential}
  `,
  loadAllWithTotal: gql`
    query VesselFeaturesHistory($filter: VesselFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: vesselFeaturesHistory(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...VesselFeaturesFragment
      }
      total: vesselFeaturesHistoryCount(filter: $filter)
    }
    ${VesselFeaturesFragments.vesselFeatures}
    ${ReferentialFragments.location}
    ${ReferentialFragments.lightDepartment}
    ${ReferentialFragments.lightPerson}
    ${ReferentialFragments.lightReferential}
  `,
};

@Injectable({ providedIn: 'root' })
export class VesselFeaturesService
  extends BaseEntityService<VesselFeatures, VesselFeaturesFilter>
  implements IEntitiesService<VesselFeatures, VesselFeaturesFilter>
{
  constructor(graphql: GraphqlService, platform: PlatformService) {
    super(graphql, platform, VesselFeatures, VesselFeaturesFilter, {
      queries: VesselFeatureQueries,
      defaultSortBy: 'startDate',
    });
  }

  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: VesselFeaturesFilter,
    opts?: VesselFeaturesServiceWatchOptions
  ): Observable<LoadResult<VesselFeatures>> {
    // Merge items
    const mergeAll = typeof opts?.mergeAll === 'function' ? opts.mergeAll() : opts?.mergeAll;
    if (mergeAll) {
      // Get all items, ordered from last to older
      return super.watchAll(null, null, 'startDate', 'asc', dataFilter, opts).pipe(
        map(({ data }) => {
          // Merge
          data = VesselFeaturesUtils.mergeAll(data);

          // Fill changed properties
          data = VesselFeaturesUtils.fillChangedProperties(data);

          // Apply expected sort
          data = EntityUtils.sort(data, sortBy, sortDirection);

          // Apply offset/size
          const total = data.length;
          data = data.slice(offset, offset + size);

          return { data, total };
        })
      );
    }

    return super.watchAll(offset, size, sortBy, sortDirection, dataFilter, opts);
  }

  async count(
    filter: Partial<VesselFeaturesFilter> & { vesselId: number },
    opts?: {
      fetchPolicy?: FetchPolicy;
    }
  ): Promise<number> {
    const { data, total } = await this.loadAll(0, 100, null, null, filter, opts);
    return isNotNil(total) ? total : (data || []).length;
  }

  /* -- protected methods -- */
}
