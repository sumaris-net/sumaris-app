import { gql } from '@apollo/client/core';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';


export const DataCommonFragments = {
  referential: ReferentialFragments.referential,
  department: ReferentialFragments.department,
  lightDepartment: ReferentialFragments.lightDepartment,
  location: ReferentialFragments.location,
  metier: ReferentialFragments.metier,
  lightMetier: ReferentialFragments.lightMetier,
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
  position: gql`fragment PositionFragment on VesselPositionVO {
    id
    dateTime
    latitude
    longitude
    updateDate
    qualityFlagId
    recorderDepartment {
      id
      label
      name
      __typename
    }
    __typename
  }`,
  measurement: gql`fragment MeasurementFragment on MeasurementVO {
    id
    pmfmId
    alphanumericalValue
    numericalValue
    rankOrder
    qualitativeValue {
      id
      label
      name
      entityName
      __typename
    }
    digitCount
    qualityFlagId
    creationDate
    updateDate
    recorderDepartment {
      id
      label
      name
      __typename
    }
    entityName
    __typename
  }`,
  packetComposition: gql`fragment PacketCompositionFragment on PacketCompositionVO {
    id
    rankOrder
    taxonGroup {
      id
      label
      name
      entityName
      __typename
    }
    ratios
    __typename
  }`
};

export const DataFragments = {
  sample: gql`fragment SampleFragment on SampleVO {
    id
    label
    rankOrder
    parentId
    sampleDate
    individualCount
    size
    sizeUnit
    comments
    updateDate
    creationDate
    matrix {
      ...ReferentialFragment
    }
    taxonGroup {
      ...ReferentialFragment
    }
    taxonName {
      ...TaxonNameFragment
    }
    measurementValues
    qualityFlagId
    operationId
    landingId
    __typename
  }
  ${DataCommonFragments.referential}
  ${ReferentialFragments.taxonName}`,
  batch: gql`fragment BatchFragment on BatchVO {
    id
    label
    rankOrder
    parentId
    exhaustiveInventory
    samplingRatio
    samplingRatioText
    individualCount
    comments
    updateDate
    taxonGroup {
      ...ReferentialFragment
    }
    taxonName {
      ...TaxonNameFragment
    }
    measurementValues
    qualityFlagId
    __typename
  }
  ${DataCommonFragments.referential}
  ${ReferentialFragments.taxonName}`,
  packet: gql`fragment PacketFragment on PacketVO {
    id
    rankOrder
    comments
    updateDate
    qualityFlagId
    number
    weight
    sampledWeights
    composition {
      ...PacketCompositionFragment
    }
    operationId
    __typename
  }
  ${DataCommonFragments.packetComposition}`,
  product: gql`fragment ProductFragment on ProductVO {
    id
    label
    rankOrder
    individualCount
    subgroupCount
    weight
    weightCalculated
    comments
    updateDate
    taxonGroup {
      ...ReferentialFragment
    }
    saleType {
      ...ReferentialFragment
    }
    measurementValues
    qualityFlagId
    operationId
    saleId
    landingId
    batchId
    __typename
  }
  ${DataCommonFragments.referential}
  `,
  fishingArea: gql`fragment FishingAreaFragment on FishingAreaVO {
    id
#    qualificationDate
#    qualificationComments
    qualityFlagId
    location {
      ...LocationFragment
    }
    distanceToCoastGradient {
      ...ReferentialFragment
    }
    depthGradient {
      ...ReferentialFragment
    }
    nearbySpecificArea {
      ...ReferentialFragment
    }
    operationId
    __typename
  }
  ${DataCommonFragments.location}
  ${DataCommonFragments.referential}
  `
};

export const PhysicalGearFragments = {
  physicalGear: gql`fragment PhysicalGearFragment on PhysicalGearVO {
    id
    rankOrder
    parentId
    tripId
    updateDate
    creationDate
    comments
    gear {
      ...ReferentialFragment
    }
    recorderDepartment {
      ...LightDepartmentFragment
    }
    measurementValues
  }`
};


export const OperationGroupFragment = {
  operationGroup: gql`fragment OperationGroupFragment on OperationGroupVO {
    id
    rankOrderOnPeriod
    physicalGearId
    tripId
    comments
    hasCatch
    updateDate
    metier {
      ...MetierFragment
    }
    recorderDepartment {
      ...LightDepartmentFragment
    }
    measurements {
      ...MeasurementFragment
    }
    gearMeasurements {
      ...MeasurementFragment
    }
    packets {
      ...PacketFragment
    }
    products {
      ...ProductFragment
    }
    samples {
      ...SampleFragment
    }
    fishingAreas {
      ...FishingAreaFragment
    }
  }
  ${ReferentialFragments.lightDepartment}
  ${ReferentialFragments.metier}
  ${DataFragments.packet}
  ${DataFragments.product}
  ${DataFragments.sample}
  ${DataFragments.fishingArea}
  ${DataCommonFragments.measurement}
  `
};

export const SaleFragments = {
  lightSale: gql`fragment LightSaleFragment on SaleVO {
    id
    startDateTime
    creationDate
    updateDate
    comments
    saleType {
      ...ReferentialFragment
    }
    saleLocation {
      ...LocationFragment
    }
  }
  ${DataCommonFragments.referential}
  ${DataCommonFragments.location}
  `,
  sale: gql`fragment SaleFragment on SaleVO {
    id
    startDateTime
    creationDate
    updateDate
    comments
    saleType {
      ...ReferentialFragment
    }
    saleLocation {
      ...LocationFragment
    }
    measurements {
      ...MeasurementFragment
    }
    products {
      ...ProductFragment
    }
  }
  ${DataCommonFragments.referential}
  ${DataCommonFragments.location}
  ${DataCommonFragments.measurement}
  ${DataFragments.product}
  `
};

export const ExpectedSaleFragments = {
  lightExpectedSale: gql`fragment LightExpectedSaleFragment on ExpectedSaleVO {
    id
    saleDate
    saleType {
      ...ReferentialFragment
    }
    saleLocation {
      ...LocationFragment
    }
  }
  ${DataCommonFragments.referential}
  ${DataCommonFragments.location}
  `,
  expectedSale: gql`fragment ExpectedSaleFragment on ExpectedSaleVO {
    id
    saleDate
    saleType {
      ...ReferentialFragment
    }
    saleLocation {
      ...LocationFragment
    }
    measurements {
      ...MeasurementFragment
    }
    products {
      ...ProductFragment
    }
  }
  ${DataCommonFragments.referential}
  ${DataCommonFragments.location}
  ${DataCommonFragments.measurement}
  ${DataFragments.product}
  `
};

