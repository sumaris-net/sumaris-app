import { __decorate } from "tslib";
import { Injectable, Pipe } from '@angular/core';
import { isNil } from '@sumaris-net/ngx-components';
let DisplayWithPipe = class DisplayWithPipe {
    transform(value, displayFn) {
        if (isNil(value) || !displayFn)
            return '';
        return displayFn(value);
    }
};
DisplayWithPipe = __decorate([
    Pipe({
        name: 'displayWith'
    }),
    Injectable({ providedIn: 'root' })
], DisplayWithPipe);
export { DisplayWithPipe };
//# sourceMappingURL=display-with.pipe.js.map