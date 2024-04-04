import { __decorate, __metadata } from "tslib";
import { Injectable, Injector } from '@angular/core';
import { TaxonNameRef } from './model/taxon-name.model';
import { TaxonNameRefFilter } from './filter/taxon-name-ref.filter';
import { TaxonNameQueries } from '@app/referential/services/taxon-name.service';
import { BaseReferentialRefService } from '@app/referential/services/base-referential-ref-service.class';
let TaxonNameRefService = class TaxonNameRefService extends BaseReferentialRefService {
    constructor(injector) {
        super(injector, TaxonNameRef, TaxonNameRefFilter, {
            queries: TaxonNameQueries
        });
    }
};
TaxonNameRefService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [Injector])
], TaxonNameRefService);
export { TaxonNameRefService };
//# sourceMappingURL=taxon-name-ref.service.js.map