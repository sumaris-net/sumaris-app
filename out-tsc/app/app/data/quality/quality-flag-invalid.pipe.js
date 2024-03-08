import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { qualityFlagInvalid } from '../services/model/model.utils';
let QualityFlagInvalidPipe = class QualityFlagInvalidPipe {
    transform(qualityFlagId) {
        return qualityFlagInvalid(qualityFlagId);
    }
};
QualityFlagInvalidPipe = __decorate([
    Pipe({
        name: 'qualityFlagInvalid'
    })
], QualityFlagInvalidPipe);
export { QualityFlagInvalidPipe };
//# sourceMappingURL=quality-flag-invalid.pipe.js.map