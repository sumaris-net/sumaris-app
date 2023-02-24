import { gql } from '@apollo/client/core';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';

export const WeightLengthConversionFragments = {
  reference: gql`fragment WeightLengthConversionRefFragment on WeightLengthConversionVO {
    id
    updateDate
    year
    startMonth
    endMonth
    conversionCoefficientA
    conversionCoefficientB
    referenceTaxonId
    lengthPmfmIds
    lengthPmfmIds
    lengthParameterId
    lengthUnit {
      id
      label
      entityName
      __typename
    }
    sexId
    statusId
    rectangleLabels
  }`,

  full: gql`fragment WeightLengthConversionFragment on WeightLengthConversionVO {
    id
    updateDate
    year
    startMonth
    endMonth
    conversionCoefficientA
    conversionCoefficientB
    referenceTaxonId
    locationId
    location {
      ...LocationFragment
    }
    sexId
    sex {
      ...ReferentialFragment
    }
    lengthParameterId
    lengthParameter {
      ...ReferentialFragment
    }
    lengthUnitId
    lengthUnit {
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
