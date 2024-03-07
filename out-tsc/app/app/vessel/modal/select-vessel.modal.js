import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewChild, ViewEncapsulation, } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { VesselFilter } from '@app/vessel/services/filter/vessel.filter';
import { VesselsTable } from '@app/vessel/list/vessels.table';
import { isEmptyArray, isNil, isNotNil, toBoolean } from '@sumaris-net/ngx-components';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Subscription } from 'rxjs';
let SelectVesselsModal = class SelectVesselsModal {
    constructor(viewCtrl, cd) {
        this.viewCtrl = viewCtrl;
        this.cd = cd;
        this.subscription = new Subscription();
        this.titleI18n = 'VESSEL.SELECT_MODAL.TITLE';
        this.vesselFilter = null;
    }
    get loading() {
        var _a;
        return (_a = this.vesselsTable) === null || _a === void 0 ? void 0 : _a.loading;
    }
    get canValidate() {
        return this.hasSelection();
    }
    ngOnInit() {
        var _a, _b;
        // Set defaults
        this.showVesselTypeColumn = toBoolean(this.showVesselTypeColumn, false);
        this.showBasePortLocationColumn = toBoolean(this.showBasePortLocationColumn, true);
        this.disableStatusFilter = toBoolean(this.disableStatusFilter, true);
        this.showVesselTypeFilter = toBoolean(this.showVesselTypeFilter, isNil((_b = (_a = this.vesselFilter) === null || _a === void 0 ? void 0 : _a.vesselType) === null || _b === void 0 ? void 0 : _b.id));
        this.vesselsTable.dataSource.watchAllOptions = Object.assign(Object.assign({}, this.vesselsTable.dataSource.watchAllOptions), { fetchPolicy: 'no-cache' });
    }
    ngAfterViewInit() {
        setTimeout(() => {
            // Init vessel table filter
            this.vesselsTable.filter = this.vesselFilter;
            this.vesselsTable.v;
            this.vesselsTable.markAsReady();
        });
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
    selectRow(row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (row && this.vesselsTable) {
                this.vesselsTable.selection.clear();
                this.vesselsTable.selection.select(row);
            }
        });
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let vessels;
                if (this.hasSelection()) {
                    vessels = (this.vesselsTable.selection.selected || [])
                        .map(row => row.currentData)
                        .map(VesselSnapshot.fromVessel)
                        .filter(isNotNil);
                }
                if (isEmptyArray(vessels)) {
                    console.warn('[select-vessel-modal] no selection');
                }
                this.viewCtrl.dismiss(vessels);
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
        var _a, _b;
        return ((_a = this.vesselsTable) === null || _a === void 0 ? void 0 : _a.selection.hasValue()) && ((_b = this.vesselsTable) === null || _b === void 0 ? void 0 : _b.selection.selected.length) === 1;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    ViewChild('vesselsTable', { static: true }),
    __metadata("design:type", VesselsTable)
], SelectVesselsModal.prototype, "vesselsTable", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SelectVesselsModal.prototype, "titleI18n", void 0);
__decorate([
    Input(),
    __metadata("design:type", VesselFilter)
], SelectVesselsModal.prototype, "vesselFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectVesselsModal.prototype, "disableStatusFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectVesselsModal.prototype, "showVesselTypeFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectVesselsModal.prototype, "showVesselTypeColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectVesselsModal.prototype, "showBasePortLocationColumn", void 0);
SelectVesselsModal = __decorate([
    Component({
        selector: 'app-select-vessel-modal',
        templateUrl: 'select-vessel.modal.html',
        styleUrls: ['select-vessel.modal.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
        encapsulation: ViewEncapsulation.None
    }),
    __metadata("design:paramtypes", [ModalController,
        ChangeDetectorRef])
], SelectVesselsModal);
export { SelectVesselsModal };
//# sourceMappingURL=select-vessel.modal.js.map