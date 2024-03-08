import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { of } from 'rxjs';
import { ErrorCodes } from './errors';
import { AccountService, BaseGraphqlService, GraphqlService, isNotNil, ServerErrorCodes, Software } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
/* ------------------------------------
 * GraphQL queries
 * ------------------------------------*/
export const Fragments = {
    software: gql `
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
const LoadQuery = gql `
query Software($id: Int, $label: String) {
  software(id: $id, label: $label){
    ...SoftwareFragment
  }
}
  ${Fragments.software}
`;
// Save (create or update) mutation
const SaveMutation = gql `
  mutation SaveConfiguration($software:SoftwareVOInput){
    saveSoftware(software: $software){
       ...SoftwareFragment
    }
  }
  ${Fragments.software}
`;
let SoftwareService = class SoftwareService extends BaseGraphqlService {
    constructor(graphql, accountService) {
        super(graphql, { production: environment.production });
        this.graphql = graphql;
        this.accountService = accountService;
        if (this._debug)
            console.debug('[software-service] Creating service');
    }
    load(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.loadQuery(LoadQuery, { id }, opts);
        });
    }
    existsByLabel(label) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingSoftware = yield this.loadQuery(LoadQuery, { label }, { fetchPolicy: 'network-only' });
            return isNotNil(existingSoftware && existingSoftware.id);
        });
    }
    canUserWrite(data, opts) {
        return this.accountService.isAdmin();
    }
    /**
     * Save a configuration
     *
     * @param entity
     */
    save(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[software-service] Saving configuration...', entity);
            const json = entity.asObject();
            // Execute mutation
            yield this.graphql.mutate({
                mutation: SaveMutation,
                variables: {
                    software: json
                },
                error: {
                    code: ErrorCodes.SAVE_SOFTWARE_ERROR,
                    message: 'ERROR.SAVE_SOFTWARE_ERROR'
                },
                update: (proxy, { data }) => {
                    const savedEntity = data && data.saveSoftware;
                    // Copy update properties
                    entity.id = savedEntity && savedEntity.id || entity.id;
                    entity.updateDate = savedEntity && savedEntity.updateDate || entity.updateDate;
                    console.debug('[software-service] Software saved!');
                }
            });
            return entity;
        });
    }
    delete(data, options) {
        throw new Error('Not implemented yet!');
    }
    listenChanges(id, options) {
        // TODO
        console.warn('TODO: implement listen changes on Software');
        return of();
    }
    /* -- private method -- */
    loadQuery(query, variables, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            console.debug('[software-service] Loading software ...');
            try {
                const res = yield this.graphql.query({
                    query,
                    variables,
                    error: { code: ErrorCodes.LOAD_SOFTWARE_ERROR, message: 'ERROR.LOAD_SOFTWARE_ERROR' },
                    fetchPolicy: opts && opts.fetchPolicy || undefined /*default*/
                });
                const data = res && res.software ? Software.fromObject(res.software) : undefined;
                console.debug(`[software-service] Software loaded in ${Date.now() - now}ms:`, data);
                return data;
            }
            catch (err) {
                if ((err === null || err === void 0 ? void 0 : err.code) === ServerErrorCodes.NOT_FOUND) {
                    return null;
                }
                throw err;
            }
        });
    }
};
SoftwareService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        AccountService])
], SoftwareService);
export { SoftwareService };
//# sourceMappingURL=software.service.js.map