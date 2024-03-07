import { Injectable } from '@angular/core';
import { ConfigFragments, ConfigService, Configuration, EntityServiceLoadOptions, IEntityService } from '@sumaris-net/ngx-components';
import { Observable } from 'rxjs';
import { gql } from '@apollo/client/core';

const Queries: { load: any } = {
  // Load configuration, without inherited properties
  load: gql`
    query Configuration($inherited: Boolean) {
      data: configuration(inherited: $inherited) {
        ...ConfigFragment
      }
    }
    ${ConfigFragments.config}
  `,
};

@Injectable({
  providedIn: 'root',
})
export class ConfigurationService implements IEntityService<Configuration> {
  constructor(private delegateService: ConfigService) {}

  get config() {
    return this.delegateService.config;
  }

  load(id: any, opts?: EntityServiceLoadOptions): Promise<Configuration> {
    return this.delegateService.load(id, { ...opts, query: Queries.load, variables: { id, inherited: false } });
  }

  canUserWrite(data: Configuration): boolean {
    return this.delegateService.canUserWrite(data);
  }

  save(data: Configuration): Promise<Configuration> {
    return this.delegateService.save(data);
  }

  delete(data: Configuration): Promise<any> {
    return this.delegateService.delete(data);
  }

  listenChanges(id: any): Observable<Configuration> {
    return this.delegateService.listenChanges(id);
  }

  getCacheStatistics() {
    return this.delegateService.getCacheStatistics();
  }

  clearCache(opts?: { cacheName?: string }) {
    return this.delegateService.clearCache(opts);
  }
}
