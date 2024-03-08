import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { qualityFlagInvalid } from '../services/model/model.utils';
let QualityFlagValidPipePipe = class QualityFlagValidPipePipe {
    transform(qualityFlagId) {
        return !qualityFlagInvalid(qualityFlagId);
    }
};
QualityFlagValidPipePipe = __decorate([
    Pipe({
        name: 'qualityFlagValid'
    })
], QualityFlagValidPipePipe);
export { QualityFlagValidPipePipe };
//# sourceMappingURL=quality-flag-not-invalid.pipe.js.map