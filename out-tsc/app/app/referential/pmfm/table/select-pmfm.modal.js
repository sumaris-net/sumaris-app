import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector } from '@angular/core';
import { PmfmService } from '../../services/pmfm.service';
import { Pmfm } from '../../services/model/pmfm.model';
import { BaseSelectEntityModal } from '../../table/base-select-entity.modal';
import { PmfmFilter } from '@app/referential/services/filter/pmfm.filter';
let SelectPmfmModal = class SelectPmfmModal extends BaseSelectEntityModal {
    constructor(injector, dataService, cd) {
        super(injector, Pmfm, PmfmFilter, dataService, {
            watchAllOptions: {
                withDetails: true // Force to use PmfmFragment
            }
        });
        this.cd = cd;
    }
    computeTitle() {
        return __awaiter(this, void 0, void 0, function* () {
            return 'REFERENTIAL.ENTITY.PMFM';
        });
    }
};
SelectPmfmModal = __decorate([
    Component({
        selector: 'app-select-pmfm-modal',
        styleUrls: ['./select-pmfm.modal.scss'],
        templateUrl: './select-pmfm.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        PmfmService,
        ChangeDetectorRef])
], SelectPmfmModal);
export { SelectPmfmModal };
//# sourceMappingURL=select-pmfm.modal.js.map