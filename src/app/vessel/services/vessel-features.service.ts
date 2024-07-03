import { Injectable } from '@angular/core';
import { VesselFeatures } from './model/vessel.model';
import {
  BaseEntityService,
  EntitiesServiceWatchOptions,
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
import { VesselUtils } from './model/vessel.utils';
export declare interface VesselFeaturesServiceWatchOptions extends EntitiesServiceWatchOptions {
  mergeContigous?: () => boolean;
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
    query VesselFeaturesHistory($filter: VesselFeaturesFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
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

  //todo mf tobe fixe sortDirection
  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: VesselFeaturesFilter,
    opts?: VesselFeaturesServiceWatchOptions
  ): Observable<LoadResult<VesselFeatures>> {
    return super.watchAll(offset, size, sortBy, sortDirection, dataFilter, opts).pipe(
      map(({ data, total }) => {
        const result = { data: data || [], total };
        if (opts?.mergeContigous()) {
          result.data = VesselUtils.mergeContiguousVesselFeature(result.data);
        }

        return result;
      })
    );
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
