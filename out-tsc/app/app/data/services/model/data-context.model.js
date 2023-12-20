import { __decorate, __metadata, __param } from "tslib";
import { CONTEXT_DEFAULT_STATE, ContextService } from '@app/shared/context.service';
import { Inject, Injectable, Optional } from '@angular/core';
let DataContextService = class DataContextService extends ContextService {
    constructor(defaultState) {
        super(defaultState || {});
    }
};
DataContextService = __decorate([
    Injectable(),
    __param(0, Optional()),
    __param(0, Inject(CONTEXT_DEFAULT_STATE)),
    __metadata("design:paramtypes", [Object])
], DataContextService);
export { DataContextService };
//# sourceMappingURL=data-context.model.js.map