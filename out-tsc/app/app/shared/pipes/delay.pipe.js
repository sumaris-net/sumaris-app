import { __decorate } from "tslib";
import { Injectable, Pipe } from '@angular/core';
import { isObservable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { isNil } from '@sumaris-net/ngx-components';
let DelayPipe = class DelayPipe {
    transform(value, delayMs) {
        const obs = isObservable(value) ? value : of(value);
        if (isNil(delayMs) || delayMs <= 0)
            return obs;
        return obs.pipe(delay(delayMs));
    }
};
DelayPipe = __decorate([
    Pipe({
        name: 'delay'
    }),
    Injectable({ providedIn: 'root' })
], DelayPipe);
export { DelayPipe };
//# sourceMappingURL=delay.pipe.js.map