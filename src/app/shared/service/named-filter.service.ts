import { Injectable } from '@angular/core';
import {
  AbstractNamedFilterService,
  AccountService,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  EntitiesServiceLoadOptions,
  EntityServiceWatchOptions,
  GraphqlService,
  NamedFilter,
  NamedFilterFilter,
  PlatformService,
} from '@sumaris-net/ngx-components';
import gql from 'graphql-tag';

const NamedFilterFragments = {
  namedFilter: gql`
    fragment NamedFilterFragment on NamedFilterVO {
      id
      name
      entityName
      recorderPersonId
      recorderDepartmentId
      updateDate
      __typename
    }
  `,
  namedFilterWithContent: gql`
    fragment NamedFilterWithContentFragment on NamedFilterVO {
      id
      name
      entityName
      content
      recorderPersonId
      recorderDepartmentId
      updateDate
      __typename
    }
  `,
};

const queries: BaseEntityGraphqlQueries = {
  loadAll: gql`
    query NamedFilters($filter: NamedFilterFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: namedFilters(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...NamedFilterFragment
      }
    }
    ${NamedFilterFragments.namedFilter}
  `,
  loadAllWithTotal: gql`
    query NamedFilters($filter: NamedFilterFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: namedFilters(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...NamedFilterFragment
      }
      total: namedFiltersCount(filter: $filter)
    }
    ${NamedFilterFragments.namedFilter}
  `,
  load: gql`
    query NamedFilter($id: Int) {
      data: namedFilter(id: $id) {
        ...NamedFilterWithContentFragment
      }
    }
    ${NamedFilterFragments.namedFilterWithContent}
  `,
};

const mutations: BaseEntityGraphqlMutations = {
  save: gql`
    mutation SaveNamedFilter($data: NamedFilterVOInput!) {
      data: saveNamedFilter(namedFilter: $data) {
        ...NamedFilterWithContentFragment
      }
    }
    ${NamedFilterFragments.namedFilterWithContent}
  `,
  delete: gql`
    mutation DeleteNamedFilter($id: Int!) {
      data: deleteNamedFilter(id: $id)
    }
  `,
};

export interface NamedFilterWatchOptions extends EntityServiceWatchOptions {
  withContent?: boolean;
}

export interface NamedFilterLoadOptions extends EntitiesServiceLoadOptions {
  withContent?: boolean;
}

@Injectable()
export class NamedFilterService extends AbstractNamedFilterService<NamedFilter, NamedFilterFilter, NamedFilterWatchOptions, NamedFilterLoadOptions> {
  constructor(
    protected graphql: GraphqlService,
    protected platform: PlatformService,
    protected accountService: AccountService
  ) {
    super(graphql, platform, accountService, NamedFilter, NamedFilterFilter, { queries, mutations });
  }
}
