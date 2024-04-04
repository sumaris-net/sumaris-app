import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { isNil, toNumber } from '@sumaris-net/ngx-components';
import { roundHalfUp } from '@app/shared/functions';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
let IsSamplingRatioComputedPipe = class IsSamplingRatioComputedPipe {
    transform(batch, format) {
        if (!batch)
            return false;
        if (typeof batch === 'string')
            return BatchUtils.isSamplingRatioComputed(batch, format);
        return batch.samplingRatioComputed || BatchUtils.isSamplingRatioComputed(batch.samplingRatioText, format);
    }
};
IsSamplingRatioComputedPipe = __decorate([
    Pipe({
        name: 'isSamplingRatioComputed'
    })
], IsSamplingRatioComputedPipe);
export { IsSamplingRatioComputedPipe };
let SamplingRatioFormatPipe = class SamplingRatioFormatPipe {
    transform(value, format, maxDecimals) {
        if (isNil(value) || !format)
            return '';
        maxDecimals = toNumber(maxDecimals, 2);
        switch (format) {
            case '%':
                const percent = roundHalfUp(value * 100, maxDecimals);
                return '' + percent + '%̀';
            case '1/w':
                const ratio = roundHalfUp(1 / value, 2);
                return '1/' + ratio;
        }
    }
};
SamplingRatioFormatPipe = __decorate([
    Pipe({
        name: 'samplingRatioFormat'
    })
], SamplingRatioFormatPipe);
export { SamplingRatioFormatPipe };
let BatchSortingValueIconPipe = class BatchSortingValueIconPipe {
    transform(value, pmfm) {
        if (isNil(value) || !pmfm)
            return undefined;
        switch (pmfm.id) {
            // Discard or landing
            case PmfmIds.DISCARD_OR_LANDING:
                // Landing
                if (PmfmValueUtils.equals(value, QualitativeValueIds.DISCARD_OR_LANDING.LANDING)) {
                    return { icon: 'file-tray-stacked' };
                }
                // Discard
                else {
                    return { icon: 'remove-circle' };
                }
            // Vrac / Hors vrac
            /*case PmfmIds.BATCH_SORTING:
              // Vrac
              if (PmfmValueUtils.equals(value, QualitativeValueIds.BATCH_SORTING.BULK)) {
                return {icon: 'file-tray-stacked'};
              }
              // Hors vrac
              else {
                return {matIcon: 'playlist_remove'};
              }*/
            // No icon
            default:
                return undefined;
        }
    }
};
BatchSortingValueIconPipe = __decorate([
    Pipe({
        name: 'batchSortingValueIcon'
    })
], BatchSortingValueIconPipe);
export { BatchSortingValueIconPipe };
//# sourceMappingURL=batch.pipes.js.map