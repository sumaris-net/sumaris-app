import { __decorate, __metadata } from "tslib";
import { Injectable, Pipe } from '@angular/core';
import { referentialsToString, referentialToString } from '@sumaris-net/ngx-components';
let ReferentialToStringPipe = class ReferentialToStringPipe {
    constructor() {
    }
    transform(value, opts) {
        const properties = Array.isArray(opts) ? opts : opts && opts.properties;
        if (Array.isArray(value))
            return referentialsToString(value, properties, opts && opts['separator']);
        return referentialToString(value, properties);
    }
};
ReferentialToStringPipe = __decorate([
    Pipe({
        name: 'referentialToString'
    }),
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [])
], ReferentialToStringPipe);
export { ReferentialToStringPipe };
//# sourceMappingURL=referential-to-string.pipe.js.map