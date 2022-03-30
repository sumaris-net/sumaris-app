import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { Observable, of } from 'rxjs';
import { ErrorCodes } from './errors';
import { AccountService, BaseGraphqlService, EntityServiceLoadOptions, GraphqlService, IEntityService, isNotNil, Software } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';

/* ------------------------------------
 * GraphQL queries
 * ------------------------------------*/
export const Fragments = {
  software: gql`
    fragment SoftwareFragment on SoftwareVO {
      id
      label
      name
      description
      comments
      properties
      updateDate
      creationDate
      statusId
      __typename
    }
  `
};


const LoadQuery: any = gql`
query Software($id: Int, $label: String) {
  software(id: $id, label: $label){
    ...SoftwareFragment
  }
}
  ${Fragments.software}
`;

// Save (create or update) mutation
const SaveMutation: any = gql`
  mutation SaveConfiguration($software:SoftwareVOInput){
    saveSoftware(software: $software){
       ...SoftwareFragment
    }
  }
  ${Fragments.software}
`;


@Injectable({providedIn: 'root'})
export class SoftwareService<T extends Software = Software>
  extends BaseGraphqlService<T, any, number>
  implements IEntityService<Software> {

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService
  ) {
    super(graphql, {production: environment.production});

    if (this._debug) console.debug("[software-service] Creating service");
  }

  async load(
    id: number,
    opts?: EntityServiceLoadOptions): Promise<T> {

    return this.loadQuery(
      LoadQuery,
      {id},
      opts
    );
  }

  async existsByLabel(label: string): Promise<boolean> {
    const existingSoftware = await this.loadQuery(LoadQuery, {label}, {fetchPolicy: "network-only"});
    return isNotNil(existingSoftware && existingSoftware.id);
  }

  canUserWrite(data: Software, opts?: any): boolean {
    return this.accountService.isAdmin();
  }

  /**
   * Save a configuration
   * @param entity
   */
  async save(entity: T): Promise<T> {

    console.debug("[software-service] Saving configuration...", entity);

    const json = entity.asObject();

    // Execute mutation
    await this.graphql.mutate<{ saveSoftware: any }>({
      mutation: SaveMutation,
      variables: {
        software: json
      },
      error: {
        code: ErrorCodes.SAVE_SOFTWARE_ERROR,
        message: "ERROR.SAVE_SOFTWARE_ERROR"
      },
      update: (proxy, {data}) => {
        const savedEntity = data && data.saveSoftware;

        // Copy update properties
        entity.id = savedEntity && savedEntity.id || entity.id;
        entity.updateDate = savedEntity && savedEntity.updateDate || entity.updateDate;

        console.debug("[software-service] Software saved!");
      }
    });


    return entity;
  }

  delete(data: T, options?: any): Promise<any> {
    throw new Error("Not implemented yet!");
  }

  listenChanges(id: number, options?: any): Observable<T | undefined> {
    // TODO
    console.warn("TODO: implement listen changes on Software");
    return of();
  }

  /* -- private method -- */

  protected async loadQuery(
    query: any,
    variables: any,
    opts?: EntityServiceLoadOptions): Promise<T> {

    const now = Date.now();
    console.debug("[software-service] Loading software ...");

    const res = await this.graphql.query<{ software: Software<T> }>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_SOFTWARE_ERROR, message: "ERROR.LOAD_SOFTWARE_ERROR"},
      fetchPolicy: opts && opts.fetchPolicy || undefined/*default*/
    });

    const data = res && res.software ? Software.fromObject(res.software) : undefined;
    console.debug(`[software-service] Software loaded in ${Date.now() - now}ms:`, data);
    return data as T;
  }
}


