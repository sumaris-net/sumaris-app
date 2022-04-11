import { Injectable, Injector } from '@angular/core';
import { TaxonNameRef } from './model/taxon-name.model';
import { TaxonNameRefFilter } from './filter/taxon-name-ref.filter';
import { TaxonNameQueries } from '@app/referential/services/taxon-name.service';
import { BaseReferentialRefService } from '@app/referential/services/base-referential-ref-service.class';

@Injectable({providedIn: 'root'})
export class TaxonNameRefService extends BaseReferentialRefService<TaxonNameRef, TaxonNameRefFilter> {

  constructor(
    injector: Injector
  ) {
    super(injector,
      TaxonNameRef,
      TaxonNameRefFilter,
      {
        queries: TaxonNameQueries
      });
  }

}
