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
    hash
    signature
    readDate
    readSignature
    hasContent
    content
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
    hasContent
    __typename
  }`
};
