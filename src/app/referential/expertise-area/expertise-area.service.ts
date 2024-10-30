import { Injectable } from '@angular/core';
import { ReferentialService } from '@app/referential/services/referential.service';
import { AccountService, GraphqlService, LocalSettingsService } from '@sumaris-net/ngx-components';
import { ExpertiseArea } from '@app/referential/expertise-area/expertise-area.model';

@Injectable({ providedIn: 'root' })
export class ExpertiseAreaService extends ReferentialService<ExpertiseArea> {
  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected settings: LocalSettingsService
  ) {
    super(graphql, accountService, settings, ExpertiseArea);
  }

  asObject(source: ExpertiseArea, opts?: any): any {
    const target = super.asObject(source, opts);
    target.properties = {
      locations: target.locations,
    };
    delete target.locations;

    return target;
  }

  fromObject(source: any, opts?: any): ExpertiseArea {
    return super.fromObject(
      {
        ...source,
        locations: source.locations || source.properties?.locations || null,
      },
      opts
    );
  }
}
