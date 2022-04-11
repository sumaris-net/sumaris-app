import { gql } from '@apollo/client/core';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';

export const RoundWeightConversionFragments = {
  reference: gql`fragment RoundWeightConversionRefFragment on RoundWeightConversionVO {
    id
    updateDate
    startDate
    endDate
    conversionCoefficient
    taxonGroupId
    dressingId
    preservingId
    statusId
  }`,

  full: gql`fragment RoundWeightConversionFragment on RoundWeightConversionVO {
    id
    updateDate
    startDate
    endDate
    conversionCoefficient
    taxonGroupId
    locationId
    location {
      ...LocationFragment
    }
    dressingId
    dressing {
      ...ReferentialFragment
    }
    preservingId
    preserving {
      ...ReferentialFragment
    }
    statusId
    description
    comments
    creationDate
  }
  ${ReferentialFragments.location}
  ${ReferentialFragments.referential}`
}
