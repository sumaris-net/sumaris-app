import {gql} from '@apollo/client/core';

export const UserEventFragments = {
  userEvent: gql`fragment UserEventFragment on UserEventVO {
    id
    issuer
    updateDate
    creationDate
    level
    type
    recipient
    content
    hash
    signature
    readDate
    readSignature
    __typename
  }`,
  lightUserEvent: gql`fragment LightUserEventFragment on UserEventVO {
    id
    issuer
    recipient
    updateDate
    creationDate
    level
    type
    readDate
    readSignature
    __typename
  }`
};
