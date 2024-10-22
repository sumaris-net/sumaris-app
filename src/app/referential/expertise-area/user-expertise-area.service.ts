import { Injectable } from '@angular/core';
import { ReferentialService } from '@app/referential/services/referential.service';
import { AccountService, GraphqlService, LocalSettingsService } from '@sumaris-net/ngx-components';
import { UserExpertiseArea } from '@app/referential/expertise-area/user-expertise-area.model';

@Injectable({ providedIn: 'root' })
export class UserExpertiseAreaService extends ReferentialService<UserExpertiseArea> {
  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected settings: LocalSettingsService
  ) {
    super(graphql, accountService, settings, UserExpertiseArea);
  }

  asObject(source: UserExpertiseArea, opts?: any): any {
    const target = super.asObject(source, opts);
    target.properties = {
      locations: target.locations,
    };
    delete target.locations;

    return target;
  }

  fromObject(source: any, opts?: any): UserExpertiseArea {
    const target = super.fromObject(source, opts);
    target.locations = source.locations || source.properties?.locations || null;
    return target;
  }
}
