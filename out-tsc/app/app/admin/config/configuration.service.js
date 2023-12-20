import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { ConfigFragments, ConfigService } from '@sumaris-net/ngx-components';
import { gql } from '@apollo/client/core';
const Queries = {
    // Load configuration, without inherited properties
    load: gql `
    query Configuration($inherited: Boolean) {
      data: configuration(inherited: $inherited) {
        ...ConfigFragment
      }
    }
    ${ConfigFragments.config}
  `,
};
let ConfigurationService = class ConfigurationService {
    constructor(delegateService) {
        this.delegateService = delegateService;
    }
    get config() {
        return this.delegateService.config;
    }
    load(id, opts) {
        return this.delegateService.load(id, Object.assign(Object.assign({}, opts), { query: Queries.load, variables: { id, inherited: false } }));
    }
    canUserWrite(data, opts) {
        return this.delegateService.canUserWrite(data, opts);
    }
    save(data, opts) {
        return this.delegateService.save(data);
    }
    delete(data, opts) {
        return this.delegateService.delete(data, opts);
    }
    listenChanges(id, opts) {
        return this.delegateService.listenChanges(id, opts);
    }
    getCacheStatistics() {
        return this.delegateService.getCacheStatistics();
    }
    clearCache(opts) {
        return this.delegateService.clearCache(opts);
    }
};
ConfigurationService = __decorate([
    Injectable({
        providedIn: 'root',
    }),
    __metadata("design:paramtypes", [ConfigService])
], ConfigurationService);
export { ConfigurationService };
//# sourceMappingURL=configuration.service.js.map