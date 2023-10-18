import { Injectable } from '@angular/core';
import { ReferentialService, ReferentialServiceLoadOptions } from '@app/referential/services/referential.service';
import { AccountService, EntitySaveOptions, GraphqlService, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { Method } from '@app/referential/pmfm/method/method.model';
import { FullReferential } from '@app/referential/services/model/referential.model';


@Injectable({ providedIn: 'root' })
export class MethodService extends ReferentialService<Method> {

  constructor(protected graphql: GraphqlService,
              protected accountService: AccountService,
              protected settings: LocalSettingsService) {
    super(graphql, accountService, settings, Method);
  }

  asObject(source: Method, opts?: any): any {

    const target = super.asObject(source, opts);
    target.properties = {
      isEstimated: source.isEstimated,
      isCalculated: source.isCalculated,
    };
    delete target.isEstimated;
    delete target.isCalculated;

    return target;
  }

  fromObject(source: any, opts?: any): Method {
    const target = super.fromObject(source, opts);
    target.isCalculated = toBoolean(source.isCalculated, source.properties?.isCalculated);
    target.isEstimated = toBoolean(source.isEstimated, source.properties?.isEstimated);
    return target;
  }

}
