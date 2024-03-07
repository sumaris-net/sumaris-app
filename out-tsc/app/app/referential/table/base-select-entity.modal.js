import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Directive, Injector, Input, Optional, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AppTable, EntitiesTableDataSource, isNotEmptyArray, isNotNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { Subject } from 'rxjs';
import { environment } from '@environments/environment';
let BaseSelectEntityModal = class BaseSelectEntityModal {
    constructor(injector, dataType, filterType, dataService, options) {
        this.injector = injector;
        this.dataType = dataType;
        this.options = options;
        this.$title = new Subject();
        this.showFilter = true;
        this.modalCtrl = injector.get(ModalController);
        this.dataService = dataService;
        this.filterType = filterType;
    }
    get loading() {
        return this.table && this.table.loading;
    }
    ngOnInit() {
        // Init table
        if (!this.table)
            throw new Error('Missing table child component');
        if (!this.filter)
            throw new Error('Missing \'filter\'');
        if (!this.dataService)
            throw new Error('Missing \'dataService\'');
        // Set defaults
        this.allowMultipleSelection = toBoolean(this.allowMultipleSelection, false);
        this.mobile = isNotNil(this.mobile) ? this.mobile : this.injector.get(LocalSettingsService).mobile;
        this.datasource = new EntitiesTableDataSource(this.dataType, this.dataService, null, Object.assign({ prependNewElements: false, suppressErrors: environment.production }, this.options));
        this.table.setDatasource(this.datasource);
        this.table.filter = this.filter;
        // Compute title
        this.updateTitle();
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
            const table = this.table;
            if (row && table) {
                if (!this.allowMultipleSelection) {
                    table.selection.clear();
                    table.selection.select(row);
                    yield this.close();
                }
                else {
                    table.selection.toggle(row);
                }
            }
        });
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const items = this.table.selectedEntities;
                // Leave, only if there is content
                if (isNotEmptyArray(items)) {
                    this.modalCtrl.dismiss(items);
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
            yield this.modalCtrl.dismiss();
        });
    }
    hasSelection() {
        var _a;
        const selectionCount = ((_a = this.table.selectedEntities) === null || _a === void 0 ? void 0 : _a.length) || 0;
        return selectionCount > 0 && (this.allowMultipleSelection || selectionCount === 1);
    }
    updateTitle() {
        return __awaiter(this, void 0, void 0, function* () {
            const title = yield this.computeTitle();
            this.$title.next(title);
        });
    }
    markForCheck() {
        // Can be override by subclasses
    }
};
__decorate([
    ViewChild('table', { static: true }),
    __metadata("design:type", AppTable)
], BaseSelectEntityModal.prototype, "table", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BaseSelectEntityModal.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BaseSelectEntityModal.prototype, "showFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BaseSelectEntityModal.prototype, "filter", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BaseSelectEntityModal.prototype, "entityName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BaseSelectEntityModal.prototype, "allowMultipleSelection", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BaseSelectEntityModal.prototype, "dataService", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], BaseSelectEntityModal.prototype, "filterType", void 0);
BaseSelectEntityModal = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __param(3, Optional()),
    __param(4, Optional()),
    __metadata("design:paramtypes", [Injector, Function, Function, Object, Object])
], BaseSelectEntityModal);
export { BaseSelectEntityModal };
//# sourceMappingURL=base-select-entity.modal.js.map