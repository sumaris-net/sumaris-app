import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
let QualityFlagToIconPipe = class QualityFlagToIconPipe {
    transform(qualityFlagId) {
        switch (qualityFlagId) {
            case QualityFlagIds.BAD:
                return 'alert-circle';
        }
        return null;
    }
};
QualityFlagToIconPipe = __decorate([
    Pipe({
        name: 'qualityFlagToIcon'
    })
], QualityFlagToIconPipe);
export { QualityFlagToIconPipe };
//# sourceMappingURL=quality-flag-to-icon.pipe.js.map