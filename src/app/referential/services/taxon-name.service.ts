import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { ErrorCodes } from './errors';
import {
  AccountService,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseEntityService,
  EntityAsObjectOptions,
  EntityUtils,
  GraphqlService,
  IEntityService,
  isNil,
  isNotNil,
  MINIFY_ENTITY_FOR_POD,
  PlatformService,
  StatusIds
} from '@sumaris-net/ngx-components';
import { ReferentialService } from './referential.service';
import { Observable, of } from 'rxjs';
import { ReferentialFragments } from './referential.fragments';
import { TaxonName } from './model/taxon-name.model';
import { TaxonNameFilter } from '@app/referential/services/filter/taxon-name.filter';
import { mergeMap } from 'rxjs/operators';

export const TaxonNameQueries: BaseEntityGraphqlQueries & { referenceTaxonExists: any; } = {
  loadAll: gql`query TaxonNames($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: TaxonNameFilterVOInput){
    data: taxonNames(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightTaxonNameFragment
    }
  }
  ${ReferentialFragments.lightTaxonName}`,

  loadAllWithTotal: gql`query TaxonNames($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: TaxonNameFilterVOInput){
    data: taxonNames(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightTaxonNameFragment
    }
    total: taxonNameCount(filter: $filter)
  }
  ${ReferentialFragments.lightTaxonName}`,

  countAll: gql`query TaxonNameCount($filter: TaxonNameFilterVOInput){
    total: taxonNameCount(filter: $filter)
  }`,

  load:  gql`query taxonName($label: String, $id: Int){
    data: taxonName(label: $label, id: $id){
      ...FullTaxonNameFragment
    }
  }
  ${ReferentialFragments.fullTaxonName}`,

  referenceTaxonExists: gql`query referenceTaxonExists($id: Int){
    data: referenceTaxonExists(id: $id)
  }`
}

const MUTATIONS: BaseEntityGraphqlMutations = {
  save: gql`mutation saveTaxonName($data: TaxonNameVOInput!){
    data: saveTaxonName(taxonName: $data){
    ...FullTaxonNameFragment
    }
    }
    ${ReferentialFragments.fullTaxonName}`
}

@Injectable({providedIn: 'root'})
export class TaxonNameService extends BaseEntityService<TaxonName, TaxonNameFilter>
  implements IEntityService<TaxonName> {

  constructor(
    protected graphql: GraphqlService,
    protected platform: PlatformService,
    protected accountService: AccountService,
    protected referentialService: ReferentialService
  ) {
    super(graphql, platform,
    TaxonName, TaxonNameFilter, {
      queries: TaxonNameQueries,
      mutations: MUTATIONS
    });
  }

  async existsByLabel(label: string, opts?: { excludedId?: number; }): Promise<boolean> {
    if (isNil(label)) return false;
    return await this.referentialService.existsByLabel(label, { ...opts, entityName: 'TaxonName' });
  }

  async referenceTaxonExists(referenceTaxonId: number): Promise<boolean> {
    if (isNil(referenceTaxonId)) return false;

    const {data} = await this.graphql.query<{ data: boolean; }>({
      query: TaxonNameQueries.referenceTaxonExists,
      variables : {
        id: referenceTaxonId
      },
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR" }
    });

    return data;
  }

  /**
   * Delete parameter entities
   */
  async delete(entity: TaxonName, options?: any): Promise<any> {

    entity.entityName = TaxonName.ENTITY_NAME;
    await this.referentialService.deleteAll([entity]);
  }

  canUserWrite(data: TaxonName, opts?: any): boolean {
    return this.accountService.isAdmin();
  }

  listenChanges(id: number, options?: any): Observable<TaxonName | undefined> {
    return this.referentialService.listenChanges(id, {entityName: TaxonName.ENTITY_NAME, ...options})
      .pipe(mergeMap(data => this.load(id, {...options, fetchPolicy: 'network-only'})));
  }

  copyIdAndUpdateDate(source: TaxonName, target: TaxonName) {
    EntityUtils.copyIdAndUpdateDate(source, target);

    target.referenceTaxonId = source.referenceTaxonId;
  }

  /* -- protected methods -- */

  protected asObject(entity: TaxonName, opts?: EntityAsObjectOptions): any {
    return super.asObject(entity, {...MINIFY_ENTITY_FOR_POD, ...opts});
  }

  protected fillDefaultProperties(entity: TaxonName) {
    entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.ENABLE;
  }


}
