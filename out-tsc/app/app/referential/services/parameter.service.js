import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { ErrorCodes } from './errors';
import { AccountService, isEmptyArray, isNilOrBlank } from '@sumaris-net/ngx-components';
import { GraphqlService } from '@sumaris-net/ngx-components';
import { ReferentialService } from './referential.service';
import { of } from 'rxjs';
import { Parameter } from './model/parameter.model';
import { ReferentialFragments } from './referential.fragments';
import { isNil, isNotNil } from '@sumaris-net/ngx-components';
import { BaseGraphqlService } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { StatusIds } from '@sumaris-net/ngx-components';
import { EntityUtils } from '@sumaris-net/ngx-components';
const SaveQuery = gql `
  mutation SaveParameter($parameter:ParameterVOInput){
    saveParameter(parameter: $parameter){
      ...ParameterFragment
    }
  }
  ${ReferentialFragments.referential}
  ${ReferentialFragments.parameter}
`;
const LoadQuery = gql `
  query Parameter($label: String, $id: Int){
    parameter(label: $label, id: $id){
      ...ParameterFragment
    }
  }
  ${ReferentialFragments.referential}
  ${ReferentialFragments.parameter}
`;
let ParameterService = class ParameterService extends BaseGraphqlService {
    constructor(graphql, accountService, referentialService) {
        super(graphql, environment);
        this.graphql = graphql;
        this.accountService = accountService;
        this.referentialService = referentialService;
    }
    existsByLabel(label, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(label))
                return false;
            return yield this.referentialService.existsByLabel(label, Object.assign(Object.assign({}, opts), { entityName: 'Parameter' }));
        });
    }
    load(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._debug)
                console.debug(`[parameter-service] Loading parameter {${id}}...`);
            const res = yield this.graphql.query({
                query: LoadQuery,
                variables: {
                    id
                },
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' }
            });
            const entity = res && Parameter.fromObject(res.parameter);
            if (this._debug)
                console.debug(`[pmfm-service] Parameter {${id}} loaded`, entity);
            return entity;
        });
    }
    loadByLabel(label, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._debug)
                console.debug(`[parameter-service] Loading parameter {${label}}...`);
            const res = yield this.graphql.query({
                query: LoadQuery,
                variables: {
                    label
                },
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
                fetchPolicy: opts && opts.fetchPolicy || undefined
            });
            const entity = (!opts || opts.toEntity !== false)
                ? res && Parameter.fromObject(res.parameter)
                : res && res.parameter;
            if (this._debug)
                console.debug(`[parameter-service] Parameter {${label}} loaded`, entity);
            return entity;
        });
    }
    loadAllByLabels(labels, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(labels))
                throw new Error('Missing required argument \'labels\'');
            const items = yield Promise.all(labels.map(label => this.loadByLabel(label, options)
                .catch(err => {
                if (err && err.code === ErrorCodes.LOAD_REFERENTIAL_ERROR)
                    return undefined; // Skip if not found
                throw err;
            })));
            return items.filter(isNotNil);
        });
    }
    canUserWrite(data, opts) {
        return this.accountService.isAdmin();
    }
    /**
     * Save a parameter entity
     *
     * @param entity
     */
    save(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrBlank(entity === null || entity === void 0 ? void 0 : entity.label))
                throw new Error('Missing a required label');
            this.fillDefaultProperties(entity);
            // Transform into json
            const json = entity.asObject();
            const now = Date.now();
            if (this._debug)
                console.debug(`[parameter-service] Saving Parameter...`, json);
            // Check label not exists (if new entity)
            if (isNil(entity.id)) {
                const exists = yield this.existsByLabel(entity.label);
                if (exists) {
                    throw { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LABEL_NOT_UNIQUE' };
                }
            }
            yield this.graphql.mutate({
                mutation: SaveQuery,
                variables: {
                    parameter: json
                },
                error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR' },
                update: (proxy, { data }) => {
                    // Update entity
                    const savedEntity = data && data.saveParameter;
                    if (savedEntity) {
                        if (this._debug)
                            console.debug(`[parameter-service] Parameter saved in ${Date.now() - now}ms`, entity);
                        this.copyIdAndUpdateDate(savedEntity, entity);
                    }
                }
            });
            return entity;
        });
    }
    /**
     * Delete parameter entities
     */
    delete(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            entity.entityName = 'Parameter';
            yield this.referentialService.delete(entity);
        });
    }
    listenChanges(id, options) {
        // TODO
        console.warn('TODO: implement listen changes on parameter');
        return of();
    }
    /* -- protected methods -- */
    fillDefaultProperties(entity) {
        entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.ENABLE;
    }
    copyIdAndUpdateDate(source, target) {
        EntityUtils.copyIdAndUpdateDate(source, target);
        // Update qualitative values
        if (source.qualitativeValues && target.qualitativeValues) {
            target.qualitativeValues.forEach(entity => {
                entity.levelId = source.id;
                const savedQualitativeValue = source.qualitativeValues.find(json => entity.equals(json));
                EntityUtils.copyIdAndUpdateDate(savedQualitativeValue, entity);
            });
        }
    }
};
ParameterService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        AccountService,
        ReferentialService])
], ParameterService);
export { ParameterService };
//# sourceMappingURL=parameter.service.js.map