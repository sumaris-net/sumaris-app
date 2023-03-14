import {gql} from "@apollo/client/core";

export const StrategyFragments = {
  lightStrategy: gql`fragment LightStrategyFragment on StrategyVO {
    id
    label
    name
    description
    comments
    analyticReference
    updateDate
    creationDate
    statusId
    programId
    gears {
      ...LightReferentialFragment
    }
    taxonGroups {
      ...TaxonGroupStrategyFragment
    }
    taxonNames {
      ...TaxonNameStrategyFragment
    }
    pmfms {
      ...LightPmfmStrategyFragment
    }
    appliedStrategies {
      ...AppliedStrategyFragment
    }
    departments {
      ...StrategyDepartmentFragment
    }
  }`,

  strategy: gql`fragment StrategyFragment on StrategyVO {
    id
    label
    name
    description
    comments
    analyticReference
    updateDate
    creationDate
    statusId
    programId
    gears {
      ...LightReferentialFragment
    }
    taxonGroups {
      ...TaxonGroupStrategyFragment
    }
    taxonNames {
      ...TaxonNameStrategyFragment
    }
    pmfms {
      ...PmfmStrategyFragment
    }
    appliedStrategies {
      ...AppliedStrategyFragment
    }
    departments {
      ...StrategyDepartmentFragment
    }
  }`,

  appliedStrategy: gql`fragment AppliedStrategyFragment on AppliedStrategyVO {
      id
      strategyId
      location {
        ...LightReferentialFragment
      }
      appliedPeriods {
        ...AppliedPeriodFragment
      }
      __typename
    }`,

  appliedPeriod: gql`fragment AppliedPeriodFragment on AppliedPeriodVO {
      appliedStrategyId
      startDate
      endDate
      acquisitionNumber
      __typename
    }`,

  strategyDepartment: gql`fragment StrategyDepartmentFragment on StrategyDepartmentVO {
      id
      strategyId
      location {
        ...LightReferentialFragment
      }
      privilege {
        ...LightReferentialFragment
      }
      department {
        ...LightReferentialFragment
      }
      __typename
    }`,

  lightPmfmStrategy: gql`fragment LightPmfmStrategyFragment on PmfmStrategyVO {
      id
      acquisitionLevel
      rankOrder
      acquisitionNumber
      isMandatory
      minValue
      maxValue
      defaultValue
      pmfm {
        ...LightPmfmFragment
      }
      parameter {
        ...LightReferentialFragment
      }
      matrix {
        ...LightReferentialFragment
      }
      fraction {
        ...LightReferentialFragment
      }
      method {
        ...LightReferentialFragment
      }
      gearIds
      taxonGroupIds
      referenceTaxonIds
      strategyId
      __typename
    }`,

  pmfmStrategy: gql`fragment PmfmStrategyFragment on PmfmStrategyVO {
    id
    acquisitionLevel
    rankOrder
    acquisitionNumber
    isMandatory
    minValue
    maxValue
    defaultValue
    pmfm {
      ...PmfmFragment
    }
    parameter {
      ...LightReferentialFragment
    }
    matrix {
      ...LightReferentialFragment
    }
    fraction {
      ...LightReferentialFragment
    }
    method {
      ...LightReferentialFragment
    }
    gearIds
    taxonGroupIds
    referenceTaxonIds
    strategyId
    __typename
  }`,

  taxonGroupStrategy: gql`fragment TaxonGroupStrategyFragment on TaxonGroupStrategyVO {
      strategyId
      priorityLevel
      taxonGroup {
        id
        label
        name
        entityName
        taxonNames {
          ...TaxonNameFragment
        }
      }
      __typename
    }`,

  taxonNameStrategy: gql`fragment TaxonNameStrategyFragment on TaxonNameStrategyVO {
      strategyId
      priorityLevel
      taxonName {
        ...TaxonNameFragment
      }
      __typename
    }`,

  strategyRef: gql`fragment StrategyRefFragment on StrategyVO {
      id
      label
      name
      description
      comments
      updateDate
      creationDate
      statusId
      programId
      gears {
        ...LightReferentialFragment
      }
      taxonGroups {
        ...TaxonGroupStrategyFragment
      }
      taxonNames {
        ...TaxonNameStrategyFragment
      }
      departments {
        ...StrategyDepartmentFragment
      }
      appliedStrategies {
        ...AppliedStrategyFragment
      }
      denormalizedPmfms {
        ...DenormalizedPmfmStrategyFragment
      }
    }`,

  denormalizedPmfmStrategy: gql`fragment DenormalizedPmfmStrategyFragment on DenormalizedPmfmStrategyVO {
    id
    label
    name
    completeName
    unitLabel
    type
    minValue
    maxValue
    maximumNumberDecimals
    signifFiguresNumber
    defaultValue
    acquisitionNumber
    isMandatory
    isComputed
    rankOrder
    acquisitionLevel
    parameterId
    matrixId
    fractionId
    methodId
    strategyId
    gearIds
    taxonGroupIds
    referenceTaxonIds
    qualitativeValues {
      id
      label
      name
      description
      statusId
      entityName
      __typename
    }
    __typename
  }`,

  samplingStrategyRef: gql`fragment SamplingStrategyRefFragment on StrategyVO {
    id
    label
    name
    description
    comments
    analyticReference
    updateDate
    creationDate
    statusId
    programId
    taxonNames {
      ...TaxonNameStrategyFragment
    }
    appliedStrategies {
      ...AppliedStrategyFragment
    }
    departments {
      ...StrategyDepartmentFragment
    }
    pmfms {
      ...LightPmfmStrategyFragment
    }
  }`
};
