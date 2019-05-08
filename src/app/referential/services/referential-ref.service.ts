import {Injectable} from "@angular/core";
import gql from "graphql-tag";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {isNotNil, LoadResult} from "../../shared/shared.module";
import {BaseDataService, EntityUtils, LocationLevelIds, StatusIds} from "../../core/core.module";
import {Apollo} from "apollo-angular";
import {ErrorCodes} from "./errors";
import {AccountService} from "../../core/services/account.service";
import {ReferentialRef} from "../../core/services/model";

import {FetchPolicy} from "apollo-client";
import {ReferentialFilter} from "./referential.service";
import {DataService, SuggestionDataService} from "../../shared/services/data-service.class";
import {GraphqlService} from "../../core/services/graphql.service";

const LoadAllQuery: any = gql`
  query Referentials($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      id
      label
      name
      statusId
      entityName
    }
  }
`;

@Injectable()
export class ReferentialRefService extends BaseDataService
  implements SuggestionDataService<ReferentialRef>, DataService<ReferentialRef, ReferentialFilter> {

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService
  ) {
    super(graphql);

    // -- For DEV only
    //this._debug = !environment.production;
  }

  /**
   * @deprecated
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   * @param options
   */
  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: string,
           filter?: ReferentialFilter,
           options?: {
      [key: string]: any;
      fetchPolicy?: FetchPolicy;
    }): Observable<LoadResult<ReferentialRef>> {

    if (!filter || !filter.entityName) {
      console.error("[referential-ref-service] Missing filter.entityName");
      throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR" };
    }

    const entityName = filter.entityName;

    const variables: any = {
      entityName: entityName,
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: {
        label: filter.label,
        name: filter.name,
        searchText: filter.searchText,
        searchAttribute: filter.searchAttribute,
        levelId: filter.levelId,
        statusIds: isNotNil(filter.statusId) ? [filter.statusId] : [StatusIds.ENABLE]
      }
    };

    const now = new Date();
    if (this._debug) console.debug(`[referential-ref-service] Watching references on ${entityName}...`, variables);

    return this.watchQuery<{ referentials: any[]; referentialsCount: number }>({
      query: LoadAllQuery,
      variables: variables,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR" },
      fetchPolicy: options && options.fetchPolicy || "cache-first"
    })
      .pipe(
        map(({referentials, referentialsCount}) => {
          const data = (referentials || []).map(ReferentialRef.fromObject);
          if (this._debug) console.debug(`[referential-ref-service] References on ${entityName} loaded in ${new Date().getTime() - now.getTime()}ms`, data);
          return {
            data: data,
            total: referentialsCount
          };
        })
      );
  }

  async loadAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: string,
           filter?: ReferentialFilter,
           options?: {
             [key: string]: any;
             fetchPolicy?: FetchPolicy;
           }): Promise<LoadResult<ReferentialRef>> {

    if (!filter || !filter.entityName) {
      console.error("[referential-ref-service] Missing filter.entityName");
      throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR" };
    }

    const entityName = filter.entityName;

    const variables: any = {
      entityName: entityName,
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: {
        label: filter.label,
        name: filter.name,
        searchText: filter.searchText,
        searchAttribute: filter.searchAttribute,
        levelId: filter.levelId,
        statusIds: isNotNil(filter.statusId) ? [filter.statusId] : [StatusIds.ENABLE]
      }
    };

    const now = Date.now();
    if (this._debug) console.debug(`[referential-ref-service] Loading references on ${entityName}...`, variables);

    const res = await this.query<{ referentials: any[]; referentialsCount: number }>({
      query: LoadAllQuery,
      variables: variables,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR" },
      fetchPolicy: options && options.fetchPolicy || "cache-first"
    });
    const data = (res && res.referentials || []).map(ReferentialRef.fromObject);
    if (this._debug) console.debug(`[referential-ref-service] References on ${entityName} loaded in ${Date.now() - now}ms`, data);
    return {
      data: data,
      total: res.referentialsCount
    };
  }

  async suggest(value: any, options: {
    entityName: string;
    levelId?: number;
    searchAttribute?: string;
  }): Promise<ReferentialRef[]> {
    if (EntityUtils.isNotEmpty(value)) return [value];
    value = (typeof value === "string" && value !== '*') && value || undefined;
    const res = await this.loadAll(0, !value ? 30 : 10, undefined, undefined,
      {
        entityName: options.entityName,
        levelId: options.levelId,
        searchText: value as string,
        searchAttribute: options.searchAttribute
      });
    return res.data;
  }

  saveAll(entities: ReferentialRef[], options?: any): Promise<ReferentialRef[]> {
    throw 'Not implemented ! Use ReferentialService instead';
  }

  deleteAll(entities: ReferentialRef[], options?: any): Promise<any> {
    throw 'Not implemented ! Use ReferentialService instead';
  }

}
