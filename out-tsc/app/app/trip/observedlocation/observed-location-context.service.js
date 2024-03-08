import { __decorate, __metadata, __param } from "tslib";
import { Inject, Injectable, Optional } from '@angular/core';
import { TripContextService } from '@app/trip/trip-context.service';
import { CONTEXT_DEFAULT_STATE } from '@app/shared/context.service';
let ObservedLocationContextService = class ObservedLocationContextService extends TripContextService {
    constructor(defaultState) {
        super(defaultState || {});
    }
    set observedLocation(value) {
        this.set('observedLocation', () => value);
    }
    get observedLocation() {
        return this.get('observedLocation');
    }
    get landing() {
        return this.get('landing');
    }
    set landing(value) {
        this.set('landing', _ => value);
    }
};
ObservedLocationContextService = __decorate([
    Injectable({ providedIn: 'root' }),
    __param(0, Optional()),
    __param(0, Inject(CONTEXT_DEFAULT_STATE)),
    __metadata("design:paramtypes", [Object])
], ObservedLocationContextService);
export { ObservedLocationContextService };
//# sourceMappingURL=observed-location-context.service.js.map