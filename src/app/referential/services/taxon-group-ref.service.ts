import { Injectable, Injector } from '@angular/core';
import { BaseReferentialRefService } from '@app/referential/services/base-referential-ref-service.class';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { gql } from '@apollo/client/core';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { BaseEntityGraphqlQueries } from '@sumaris-net/ngx-components';


const TaxonGroupQueries: BaseEntityGraphqlQueries = {
  loadAll: gql`query TaxonGroups($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: taxonGroups(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...TaxonGroupFragment
    }
  }
  ${ReferentialFragments.taxonGroup}
  ${ReferentialFragments.taxonName}`,

  loadAllWithTotal: gql`query TaxonGroups($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: taxonGroups(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...TaxonGroupFragment
    }
    total: taxonGroupsCount(filter: $filter)
  }
  ${ReferentialFragments.taxonGroup}
  ${ReferentialFragments.taxonName}`
};

@Injectable({providedIn: 'root'})
export class TaxonGroupRefService extends BaseReferentialRefService<TaxonGroupRef, ReferentialRefFilter> {

  constructor(
    injector: Injector
  ) {
    super(injector,
      TaxonGroupRef,
      ReferentialRefFilter,
      {
        queries: TaxonGroupQueries
      });
  }

}
