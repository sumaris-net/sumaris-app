import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { qualityFlagToColor } from '../services/model/model.utils';
let QualityFlagToColorPipe = class QualityFlagToColorPipe {
    transform(qualityFlagId) {
        return qualityFlagToColor(qualityFlagId);
    }
};
QualityFlagToColorPipe = __decorate([
    Pipe({
        name: 'qualityFlagToColor'
    })
], QualityFlagToColorPipe);
export { QualityFlagToColorPipe };
//# sourceMappingURL=quality-flag-to-color.pipe.js.map