import {gql} from "@apollo/client/core";

export const ReferentialFragments = {
  referential: gql`fragment ReferentialFragment on ReferentialVO {
    id
    label
    name
    rankOrder
    statusId
    entityName
    __typename
  }`,
  fullReferential: gql`fragment FullReferentialFragment on ReferentialVO {
    id
    label
    name
    description
    comments
    updateDate
    creationDate
    statusId
    validityStatusId
    levelId
    parentId
    parent {
      id
      label
      name
      entityName
      __typename
    }
    rankOrder
    entityName
    __typename
  }`,
  department: gql`fragment DepartmentFragment on DepartmentVO {
    id
    label
    name
    logo
    __typename
  }`,
  lightDepartment: gql`fragment LightDepartmentFragment on DepartmentVO {
    id
    label
    name
    logo
    __typename
  }`,
  lightPerson: gql`fragment LightPersonFragment on PersonVO {
    id
    firstName
    lastName
    avatar
    department {
      id
      label
      name
      __typename
    }
    __typename
  }`,
  location: gql`fragment LocationFragment on LocationVO {
    id
    label
    name
    entityName
    __typename
  }`,
  taxonName: gql`fragment TaxonNameFragment on TaxonNameVO {
    id
    label
    name
    statusId
    levelId
    referenceTaxonId
    entityName
    isReferent
    __typename
  }`,
  fullTaxonName: gql`fragment FullTaxonNameFragment on TaxonNameVO {
    id
    label
    name
    statusId
    levelId
    description
    comments
    updateDate
    creationDate
    referenceTaxonId
    parentTaxonName {
      id
      label
      name
      entityName
      __typename
    }
    entityName
    isReferent
    isNaming
    isVirtual
    taxonomicLevel {
      id
      label
      name
      entityName
      __typename
    }
    startDate
    endDate
    __typename
  }`,
  lightTaxonName: gql`fragment LightTaxonNameFragment on TaxonNameVO {
    id
    label
    name
    statusId
    levelId
    description
    comments
    updateDate
    creationDate
    referenceTaxonId
    parentId
    entityName
    isReferent
    isNaming
    isVirtual
    taxonomicLevelId
    taxonGroupIds
    startDate
    endDate
    __typename
  }`,
  taxonGroup: gql`fragment TaxonGroupFragment on TaxonGroupVO {
    id
    label
    name
    entityName
    taxonNames {
      ...TaxonNameFragment
    }
    __typename
  }`,
  lightMetier:  gql`fragment LightMetierFragment on MetierVO {
    id
    label
    name
    statusId
    validityStatusId
    levelId
    entityName
    taxonGroup {
      id
      label
      name
      levelId
      entityName
      __typename
    }
    __typename
  }`,
  metier:  gql`fragment MetierFragment on MetierVO {
    id
    label
    name
    entityName
    taxonGroup {
      id
      label
      name
      entityName
      __typename
    }
    gear {
      id
      label
      name
      entityName
      __typename
    }
    __typename
  }`,
  lightPmfm: gql`fragment LightPmfmFragment on PmfmVO {
    id
    label
    name
    type
    minValue
    maxValue
    unitLabel
    defaultValue
    maximumNumberDecimals
    unitId
    parameterId
    matrixId
    fractionId
    methodId
    levelId: parameterId
    entityName
    __typename
  }`,
  pmfm: gql`fragment PmfmFragment on PmfmVO {
    id
    label
    name
    statusId
    updateDate
    creationDate
    entityName
    type
    minValue
    maxValue
    defaultValue
    maximumNumberDecimals
    signifFiguresNumber
    parameter {
      ...ParameterFragment
    }
    matrix {
      ...ReferentialFragment
    }
    fraction {
      ...ReferentialFragment
    }
    method {
      ...ReferentialFragment
    }
    unit {
      ...ReferentialFragment
    }
    __typename
  }`,
  pmfmFull: gql`fragment PmfmFullFragment on PmfmVO {
    id
    label
    name
    completeName
    unitLabel
    statusId
    updateDate
    creationDate
    entityName
    type
    minValue
    maxValue
    defaultValue
    maximumNumberDecimals
    signifFiguresNumber
    parameter {
      ...ParameterFragment
    }
    matrix {
      ...ReferentialFragment
    }
    fraction {
      ...ReferentialFragment
    }
    method {
      ...ReferentialFragment
    }
    unit {
      ...ReferentialFragment
    }
    __typename
  }`,
  parameter: gql`fragment ParameterFragment on ParameterVO {
    id
    label
    name
    type
    statusId
    creationDate
    updateDate
    entityName
    qualitativeValues {
      ...FullReferentialFragment
    }
    __typename
  }`,
};
