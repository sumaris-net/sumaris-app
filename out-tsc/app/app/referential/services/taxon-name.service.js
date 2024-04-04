import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { ErrorCodes } from './errors';
import { AccountService, BaseEntityService, EntityUtils, GraphqlService, isNil, isNotNil, MINIFY_ENTITY_FOR_POD, PlatformService, StatusIds } from '@sumaris-net/ngx-components';
import { ReferentialService } from './referential.service';
import { ReferentialFragments } from './referential.fragments';
import { TaxonName } from './model/taxon-name.model';
import { TaxonNameFilter } from '@app/referential/services/filter/taxon-name.filter';
import { mergeMap } from 'rxjs/operators';
export const TaxonNameQueries = {
    loadAll: gql `query TaxonNames($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: TaxonNameFilterVOInput){
    data: taxonNames(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightTaxonNameFragment
    }
  }
  ${ReferentialFragments.lightTaxonName}`,
    loadAllWithTotal: gql `query TaxonNames($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: TaxonNameFilterVOInput){
    data: taxonNames(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightTaxonNameFragment
    }
    total: taxonNameCount(filter: $filter)
  }
  ${ReferentialFragments.lightTaxonName}`,
    countAll: gql `query TaxonNameCount($filter: TaxonNameFilterVOInput){
    total: taxonNameCount(filter: $filter)
  }`,
    load: gql `query taxonName($label: String, $id: Int){
    data: taxonName(label: $label, id: $id){
      ...FullTaxonNameFragment
    }
  }
  ${ReferentialFragments.fullTaxonName}`,
    referenceTaxonExists: gql `query referenceTaxonExists($id: Int){
    data: referenceTaxonExists(id: $id)
  }`
};
const TaxonNameMutations = {
    save: gql `mutation saveTaxonName($data: TaxonNameVOInput!) {
    data: saveTaxonName(taxonName: $data){
    ...FullTaxonNameFragment
    }
  }
  ${ReferentialFragments.fullTaxonName}`
};
let TaxonNameService = class TaxonNameService extends BaseEntityService {
    constructor(graphql, platform, accountService, referentialService) {
        super(graphql, platform, TaxonName, TaxonNameFilter, {
            queries: TaxonNameQueries,
            mutations: TaxonNameMutations
        });
        this.graphql = graphql;
        this.platform = platform;
        this.accountService = accountService;
        this.referentialService = referentialService;
    }
    existsByLabel(label, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(label))
                return false;
            return yield this.referentialService.existsByLabel(label, Object.assign(Object.assign({}, opts), { entityName: 'TaxonName' }));
        });
    }
    referenceTaxonExists(referenceTaxonId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(referenceTaxonId))
                return false;
            const { data } = yield this.graphql.query({
                query: TaxonNameQueries.referenceTaxonExists,
                variables: {
                    id: referenceTaxonId
                },
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' }
            });
            return data;
        });
    }
    /**
     * Delete parameter entities
     */
    delete(entity, options) {
        return __awaiter(this, void 0, void 0, function* () {
            entity.entityName = TaxonName.ENTITY_NAME;
            yield this.referentialService.deleteAll([entity]);
        });
    }
    canUserWrite(data, opts) {
        return this.accountService.isAdmin();
    }
    listenChanges(id, options) {
        return this.referentialService.listenChanges(id, Object.assign({ entityName: TaxonName.ENTITY_NAME }, options))
            .pipe(mergeMap(data => this.load(id, Object.assign(Object.assign({}, options), { fetchPolicy: 'network-only' }))));
    }
    copyIdAndUpdateDate(source, target) {
        EntityUtils.copyIdAndUpdateDate(source, target);
        target.referenceTaxonId = source.referenceTaxonId;
    }
    /* -- protected methods -- */
    asObject(entity, opts) {
        return super.asObject(entity, Object.assign(Object.assign({}, MINIFY_ENTITY_FOR_POD), opts));
    }
    fillDefaultProperties(entity) {
        entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.ENABLE;
    }
};
TaxonNameService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        PlatformService,
        AccountService,
        ReferentialService])
], TaxonNameService);
export { TaxonNameService };
//# sourceMappingURL=taxon-name.service.js.map