import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { ReferentialUtils } from '@sumaris-net/ngx-components';
let IsNotEmptyReferentialPipe = class IsNotEmptyReferentialPipe {
    transform(obj) {
        return ReferentialUtils.isNotEmpty(obj);
    }
};
IsNotEmptyReferentialPipe = __decorate([
    Pipe({
        name: 'isNotEmptyReferential'
    })
], IsNotEmptyReferentialPipe);
export { IsNotEmptyReferentialPipe };
let IsEmptyReferentialPipe = class IsEmptyReferentialPipe {
    transform(obj) {
        return ReferentialUtils.isEmpty(obj);
    }
};
IsEmptyReferentialPipe = __decorate([
    Pipe({
        name: 'isEmptyReferential'
    })
], IsEmptyReferentialPipe);
export { IsEmptyReferentialPipe };
//# sourceMappingURL=core.pipe.js.map