import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { ReferentialService } from '@app/referential/services/referential.service';
import { AccountService, GraphqlService, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { Method } from '@app/referential/pmfm/method/method.model';
let MethodService = class MethodService extends ReferentialService {
    constructor(graphql, accountService, settings) {
        super(graphql, accountService, settings, Method);
        this.graphql = graphql;
        this.accountService = accountService;
        this.settings = settings;
    }
    asObject(source, opts) {
        const target = super.asObject(source, opts);
        target.properties = {
            isEstimated: source.isEstimated,
            isCalculated: source.isCalculated,
        };
        delete target.isEstimated;
        delete target.isCalculated;
        return target;
    }
    fromObject(source, opts) {
        var _a, _b;
        const target = super.fromObject(source, opts);
        target.isCalculated = toBoolean(source.isCalculated, (_a = source.properties) === null || _a === void 0 ? void 0 : _a.isCalculated);
        target.isEstimated = toBoolean(source.isEstimated, (_b = source.properties) === null || _b === void 0 ? void 0 : _b.isEstimated);
        return target;
    }
};
MethodService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        AccountService,
        LocalSettingsService])
], MethodService);
export { MethodService };
//# sourceMappingURL=method.service.js.map