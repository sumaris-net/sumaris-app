import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
let SplitArrayInChunksPipe = class SplitArrayInChunksPipe {
    transform(value, chunkSize) {
        if (!(value === null || value === void 0 ? void 0 : value.length))
            return [];
        if (chunkSize === -1)
            return [value]; // Only one page
        if (!chunkSize || isNaN(chunkSize) || chunkSize < 1) {
            throw '[splitArrayInChunks] Number of row must be a positive number !';
        }
        if (value.length <= chunkSize) {
            return [value];
        }
        let length = Math.round(value.length / chunkSize + 0.5);
        if (value.length === (length - 1) * chunkSize) {
            length = length - 1;
        }
        const result = new Array(length);
        for (let i = 0; i < length; i++) {
            const start = i * chunkSize;
            const end = Math.min(value.length, start + chunkSize);
            result[i] = value.slice(start, end);
        }
        return result;
    }
};
SplitArrayInChunksPipe = __decorate([
    Pipe({
        name: 'splitArrayInChunks',
    })
], SplitArrayInChunksPipe);
export { SplitArrayInChunksPipe };
//# sourceMappingURL=arrays.pipe.js.map