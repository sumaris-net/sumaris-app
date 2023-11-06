import { Injectable } from '@angular/core';
import { ReferentialService } from '@app/referential/services/referential.service';
import { AccountService, GraphqlService, LocalSettingsService, MINIFY_ENTITY_FOR_POD, ReferentialRef } from '@sumaris-net/ngx-components';
import { Metier } from '@app/referential/metier/metier.model';

const MetierQueries = {
  load: '',
};

@Injectable({ providedIn: 'root' })
export class MetierService extends ReferentialService<Metier> {

  constructor(protected graphql: GraphqlService,
              protected accountService: AccountService,
              protected settings: LocalSettingsService) {
    super(graphql, accountService, settings, Metier);
  }

  asObject(source: Metier, opts?: any): any {

    const target = super.asObject(source, opts);
    target.properties = {
      gear: source.gear?.asObject({...MINIFY_ENTITY_FOR_POD, keepEntityName: true}) || undefined,
      taxonGroup: source.taxonGroup?.asObject({...MINIFY_ENTITY_FOR_POD, keepEntityName: true}) || undefined,
    };
    delete target.taxonGroup;
    delete target.gear;

    return target;
  }

  fromObject(source: any, opts?: any): Metier {
    const target = super.fromObject(source, opts);
    target.gear = ReferentialRef.fromObject(source.gear || source.properties?.gear);
    target.taxonGroup = ReferentialRef.fromObject(source.taxonGroup || source.properties?.taxonGroup);
    return target;
  }

}
