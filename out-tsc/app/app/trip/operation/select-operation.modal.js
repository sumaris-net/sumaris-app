import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { isNotNil } from '@sumaris-net/ngx-components';
import { Operation } from '@app/trip/trip/trip.model';
import { OperationFilter } from '@app/trip/operation/operation.filter';
import { SelectOperationByTripTable } from '@app/trip/operation/select-operation-by-trip.table';
let SelectOperationModal = class SelectOperationModal {
    constructor(viewCtrl, cd) {
        this.viewCtrl = viewCtrl;
        this.cd = cd;
        this.selectedTabIndex = 0;
    }
    get loading() {
        return this.table && this.table.loading;
    }
    ngOnInit() {
        // Init table
        if (!this.table)
            throw new Error('Missing table child component');
        if (!this.filter)
            throw new Error('Missing argument \'filter\'');
        this.filter = OperationFilter.fromObject(this.filter);
        this.table.filter = this.filter;
        this.loadData();
    }
    loadData() {
        // Load data
        setTimeout(() => {
            this.table.onRefresh.next('modal');
            this.markForCheck();
        }, 200);
    }
    selectRow(row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (row && this.table) {
                // Select the clicked row, then close
                this.table.selection.clear();
                this.table.selection.select(row);
                yield this.close();
            }
        });
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.hasSelection()) {
                    const items = (this.table.selection.selected || [])
                        .map(row => row.currentData)
                        .map(source => Operation.fromObject(source, { withBatchTree: false, withSamples: false }))
                        .filter(isNotNil);
                    yield this.viewCtrl.dismiss(items[0] || null);
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
        const table = this.table;
        return table && table.selection.hasValue() && table.selection.selected.length === 1;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    ViewChild('table', { static: true }),
    __metadata("design:type", SelectOperationByTripTable)
], SelectOperationModal.prototype, "table", void 0);
__decorate([
    Input(),
    __metadata("design:type", OperationFilter)
], SelectOperationModal.prototype, "filter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectOperationModal.prototype, "enableGeolocation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SelectOperationModal.prototype, "gearIds", void 0);
__decorate([
    Input(),
    __metadata("design:type", Operation)
], SelectOperationModal.prototype, "parent", void 0);
SelectOperationModal = __decorate([
    Component({
        selector: 'app-select-operation-modal',
        templateUrl: './select-operation.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [ModalController,
        ChangeDetectorRef])
], SelectOperationModal);
export { SelectOperationModal };
//# sourceMappingURL=select-operation.modal.js.map