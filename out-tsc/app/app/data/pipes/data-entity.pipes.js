import { __decorate, __metadata } from "tslib";
import { Pipe } from '@angular/core';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';
let DataEntityIsInvalidPipe = class DataEntityIsInvalidPipe {
    constructor() {
    }
    transform(entity) {
        return DataEntityUtils.isInvalid(entity);
    }
};
DataEntityIsInvalidPipe = __decorate([
    Pipe({
        name: 'dataEntityIsInvalid'
    }),
    __metadata("design:paramtypes", [])
], DataEntityIsInvalidPipe);
export { DataEntityIsInvalidPipe };
let DataEntityErrorPipe = class DataEntityErrorPipe {
    constructor() {
    }
    transform(entity) {
        return DataEntityUtils.isInvalid(entity) ? entity.qualificationComments : undefined;
    }
};
DataEntityErrorPipe = __decorate([
    Pipe({
        name: 'dataEntityError'
    }),
    __metadata("design:paramtypes", [])
], DataEntityErrorPipe);
export { DataEntityErrorPipe };
//# sourceMappingURL=data-entity.pipes.js.map