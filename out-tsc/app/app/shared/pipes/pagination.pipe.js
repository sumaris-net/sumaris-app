import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
let PaginationToStringPipe = class PaginationToStringPipe {
    transform(pageIndex, pageCount, parenthesis) {
        if (pageCount === 1)
            return '';
        const prefix = parenthesis && '(' || '';
        const suffix = parenthesis && ')' || '';
        if (pageCount && pageCount > 1) {
            return `${prefix}${pageIndex + 1}/${pageCount}${suffix}`;
        }
        return `${prefix}${pageIndex + 1}${suffix}`;
    }
};
PaginationToStringPipe = __decorate([
    Pipe({
        name: 'paginationToString'
    })
], PaginationToStringPipe);
export { PaginationToStringPipe };
//# sourceMappingURL=pagination.pipe.js.map