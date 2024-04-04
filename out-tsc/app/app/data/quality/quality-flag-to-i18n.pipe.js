import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { translateQualityFlag } from '@app/data/services/model/model.utils';
let QualityFlagToI18nPipe = class QualityFlagToI18nPipe {
    constructor() {
        this.transform = translateQualityFlag;
    }
};
QualityFlagToI18nPipe = __decorate([
    Pipe({
        name: 'qualityFlagToI18n',
    })
], QualityFlagToI18nPipe);
export { QualityFlagToI18nPipe };
//# sourceMappingURL=quality-flag-to-i18n.pipe.js.map