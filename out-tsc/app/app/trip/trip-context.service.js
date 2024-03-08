import { __decorate, __metadata, __param } from "tslib";
import { Inject, Injectable, Optional } from '@angular/core';
import { DataContextService } from '@app/data/services/model/data-context.model';
import { CONTEXT_DEFAULT_STATE } from '@app/shared/context.service';
let TripContextService = class TripContextService extends DataContextService {
    constructor(defaultState) {
        super(defaultState || {});
    }
    set trip(value) {
        this.set('trip', () => value);
    }
    get trip() {
        return this.get('trip');
    }
    get operation() {
        return this.get('operation');
    }
    set operation(value) {
        this.set('operation', _ => value);
    }
};
TripContextService = __decorate([
    Injectable({ providedIn: 'root' }),
    __param(0, Optional()),
    __param(0, Inject(CONTEXT_DEFAULT_STATE)),
    __metadata("design:paramtypes", [Object])
], TripContextService);
export { TripContextService };
//# sourceMappingURL=trip-context.service.js.map