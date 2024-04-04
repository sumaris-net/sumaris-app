import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { statusToColor } from '@app/data/services/model/model.utils';
let VesselStatusToColorPipe = class VesselStatusToColorPipe {
    transform(statusId) {
        return statusToColor(statusId);
    }
};
VesselStatusToColorPipe = __decorate([
    Pipe({
        name: 'vesselStatusToColorPipe'
    })
], VesselStatusToColorPipe);
export { VesselStatusToColorPipe };
//# sourceMappingURL=vessel-status-to-color.pipe.js.map