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
      acquisitionLevelLabels
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
      persons {
        id
        location {
          ...ReferentialFragment
        }
        privilege {
          ...ReferentialFragment
        }
        person {
           ...LightPersonFragment
        }
      }
    }`
};
