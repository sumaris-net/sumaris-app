import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { ReferentialService } from '@app/referential/services/referential.service';
import { AccountService, GraphqlService, LocalSettingsService, MINIFY_ENTITY_FOR_POD, ReferentialRef } from '@sumaris-net/ngx-components';
import { Metier } from '@app/referential/metier/metier.model';
const MetierQueries = {
    load: '',
};
let MetierService = class MetierService extends ReferentialService {
    constructor(graphql, accountService, settings) {
        super(graphql, accountService, settings, Metier);
        this.graphql = graphql;
        this.accountService = accountService;
        this.settings = settings;
    }
    asObject(source, opts) {
        var _a, _b;
        const target = super.asObject(source, opts);
        target.properties = {
            gear: ((_a = source.gear) === null || _a === void 0 ? void 0 : _a.asObject(Object.assign(Object.assign({}, MINIFY_ENTITY_FOR_POD), { keepEntityName: true }))) || undefined,
            taxonGroup: ((_b = source.taxonGroup) === null || _b === void 0 ? void 0 : _b.asObject(Object.assign(Object.assign({}, MINIFY_ENTITY_FOR_POD), { keepEntityName: true }))) || undefined,
        };
        delete target.taxonGroup;
        delete target.gear;
        return target;
    }
    fromObject(source, opts) {
        var _a, _b;
        const target = super.fromObject(source, opts);
        target.gear = ReferentialRef.fromObject(source.gear || ((_a = source.properties) === null || _a === void 0 ? void 0 : _a.gear));
        target.taxonGroup = ReferentialRef.fromObject(source.taxonGroup || ((_b = source.properties) === null || _b === void 0 ? void 0 : _b.taxonGroup));
        return target;
    }
};
MetierService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        AccountService,
        LocalSettingsService])
], MetierService);
export { MetierService };
//# sourceMappingURL=metier.service.js.map