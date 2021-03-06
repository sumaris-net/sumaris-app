import {gql} from "@apollo/client/core";

export const ProgramFragments = {
  lightProgram: gql`
    fragment LightProgramFragment on ProgramVO {
      id
      label
      name
      description
      comments
      updateDate
      creationDate
      statusId
      properties
    }`,
  programRef: gql`
    fragment ProgramRefFragment on ProgramVO {
      id
      label
      name
      description
      comments
      updateDate
      creationDate
      statusId
      properties
      taxonGroupTypeId
      gearClassificationId
      locationClassificationIds
      locationIds
    }`,
  program: gql`
    fragment ProgramFragment on ProgramVO {
      id
      label
      name
      description
      comments
      updateDate
      creationDate
      statusId
      properties
      taxonGroupType {
        ...ReferentialFragment
      }
      gearClassification {
        ...ReferentialFragment
      }
      locationClassifications {
        ...ReferentialFragment
      }
      locations {
        ...ReferentialFragment
      }
    }`
};
