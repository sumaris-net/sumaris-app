import { FetchPolicy, gql } from '@apollo/client/core';
import { BaseEntityService, EntityServiceLoadOptions, GraphqlService, IEntitiesService, PlatformService } from '@sumaris-net/ngx-components';
import { VesselOwner } from './model/vessel-owner.model';
import { VesselOwnerFilter } from './filter/vessel.filter';
import { Injectable } from '@angular/core';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';

export const VesselOwnerFragments = {
  vesselOwner: gql`
    fragment VesselOwnerFragment on VesselOwnerVO {
      id
      registrationCode
      lastName
      firstName
      street
      zipCode
      city
      dateOfBirth
      retirementDate
      activityStartDate
      phoneNumber
      mobileNumber
      faxNumber
      email
      countryLocation {
        ...LocationFragment
      }
      updateDate
      activityStartDate
      retirementDate
      program {
        id
        label
      }
    }
    ${ReferentialFragments.location}
  `,
};

export const VesselOwnerQueries = {
  load: gql`
    query VesselOwner($id: Int!) {
      data: vesselOwner(id: $id) {
        ...VesselOwnerFragment
      }
    }
    ${VesselOwnerFragments.vesselOwner}
  `,
  loadAll: null,
};

@Injectable({ providedIn: 'root' })
export class VesselOwnerService
  extends BaseEntityService<VesselOwner, VesselOwnerFilter>
  implements IEntitiesService<VesselOwner, VesselOwnerFilter>
{
  constructor(graphql: GraphqlService, platform: PlatformService) {
    super(graphql, platform, VesselOwner, VesselOwnerFilter, {
      queries: VesselOwnerQueries,
      defaultSortBy: 'id',
      defaultSortDirection: 'asc',
    });
    this._logPrefix = '[vessel-owner-service] ';
  }

  async load(id: number, opts?: EntityServiceLoadOptions & { fetchPolicy?: FetchPolicy; toEntity?: boolean }): Promise<VesselOwner> {
    // TODO Need to fetch offline ?
    // if (this.network.offline && EntityUtils.isRemoteId(id) && (await this.hasOfflineData())) {
    //   const data: VesselOwner = await this.entities.load(id, VesselOwner.TYPENAME);
    //   if (!data) throw { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' };
    //   return VesselOwner.toVesselOwner(data);
    // }

    return super.load(id, opts);
  }

  /* -- protected methods -- */
}
