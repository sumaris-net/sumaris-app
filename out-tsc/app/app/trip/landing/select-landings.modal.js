import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewChild } from '@angular/core';
import { LandingsTable } from './landings.table';
import { ModalController } from '@ionic/angular';
import { LandingFilter } from './landing.filter';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { Landing } from './landing.model';
import { isNotNil } from '@sumaris-net/ngx-components';
let SelectLandingsModal = class SelectLandingsModal {
    constructor(viewCtrl, cd) {
        this.viewCtrl = viewCtrl;
        this.cd = cd;
        this.filter = null;
        // default value
        this.acquisitionLevel = AcquisitionLevelCodes.LANDING;
    }
    get loadingSubject() {
        return this.table.loadingSubject;
    }
    ngOnInit() {
        this.filter = this.filter || new LandingFilter();
        this.table.filter = this.filter;
        this.table.programLabel = this.programLabel || this.filter.program && this.filter.program.label;
        this.table.acquisitionLevel = this.acquisitionLevel;
        setTimeout(() => {
            this.table.onRefresh.next('modal');
            this.markForCheck();
        }, 200);
    }
    selectRow(row) {
        if (row) {
            this.table.selection.select(row);
            //this.close();
        }
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.hasSelection()) {
                    const landings = (this.table.selection.selected || [])
                        .map(row => row.currentData)
                        .map(Landing.fromObject)
                        .filter(isNotNil);
                    this.viewCtrl.dismiss(landings);
                }
                return true;
            }
            catch (err) {
                // nothing to do
                return false;
            }
        });
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewCtrl.dismiss();
        });
    }
    hasSelection() {
        return this.table.selection.hasValue() && this.table.selection.selected.length === 1;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    ViewChild('table', { static: true }),
    __metadata("design:type", LandingsTable)
], SelectLandingsModal.prototype, "table", void 0);
__decorate([
    Input(),
    __metadata("design:type", LandingFilter)
], SelectLandingsModal.prototype, "filter", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SelectLandingsModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SelectLandingsModal.prototype, "programLabel", void 0);
SelectLandingsModal = __decorate([
    Component({
        selector: 'app-select-landings-modal',
        templateUrl: './select-landings.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [ModalController,
        ChangeDetectorRef])
], SelectLandingsModal);
export { SelectLandingsModal };
//# sourceMappingURL=select-landings.modal.js.map