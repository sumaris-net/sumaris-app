import { __decorate, __metadata, __param } from "tslib";
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { DateUtils, fromDateISOString } from '@sumaris-net/ngx-components';
import { RxState } from '@rx-angular/state';
export const CONTEXT_DEFAULT_STATE = new InjectionToken('ContextDefaultState');
let ContextService = class ContextService extends RxState {
    constructor(defaultState) {
        super();
        this.defaultState = defaultState;
        this.reset();
    }
    setValue(key, value) {
        // DEBUG
        //console.debug(`[context-service] Set '${String(key)}'`, value);
        this.set(key, _ => value);
    }
    getObservable(key) {
        return this.select(key);
    }
    getValue(key) {
        return this.get(key);
    }
    resetValue(key) {
        this.set(key, () => this.defaultState[key]);
    }
    reset() {
        this.set(this.defaultState);
    }
    getValueAsDate(key) {
        return fromDateISOString(this.getValue(key));
    }
    get clipboard() {
        return this.get('clipboard');
    }
    set clipboard(value) {
        this.set('clipboard', _ => (Object.assign(Object.assign({}, value), { updateDate: DateUtils.moment() })));
    }
    get program() {
        return this.get('program');
    }
    set program(value) {
        this.set('clipboard', _ => value);
    }
    get strategy() {
        return this.get('strategy');
    }
    set strategy(value) {
        this.set('strategy', _ => value);
    }
};
ContextService = __decorate([
    Injectable(),
    __param(0, Optional()),
    __param(0, Inject(CONTEXT_DEFAULT_STATE)),
    __metadata("design:paramtypes", [Object])
], ContextService);
export { ContextService };
//# sourceMappingURL=context.service.js.map