import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { changeCaseToUnderscore, isNilOrBlank, ReferentialRef } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '../services/referential-ref.service';
import { BaseSelectEntityModal } from './base-select-entity.modal';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
let SelectReferentialModal = class SelectReferentialModal extends BaseSelectEntityModal {
    constructor(injector, dataService, cd) {
        super(injector, ReferentialRef, ReferentialRefFilter, dataService);
        this.cd = cd;
        this.showLevelFilter = true;
    }
    ngOnInit() {
        var _a;
        this.filter = ReferentialRefFilter.fromObject(Object.assign({ entityName: this.entityName }, this.filter));
        if (isNilOrBlank((_a = this.filter) === null || _a === void 0 ? void 0 : _a.entityName))
            throw new Error('Missing \'entityName\' or \'filter.entityName\'');
        super.ngOnInit();
    }
    computeTitle() {
        return __awaiter(this, void 0, void 0, function* () {
            return 'REFERENTIAL.ENTITY.' + changeCaseToUnderscore(this.filter.entityName).toUpperCase();
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    onRowClick(row) {
        if (this.allowMultipleSelection) {
            this.table.selection.toggle(row);
        }
        else {
            this.close();
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], SelectReferentialModal.prototype, "showLevelFilter", void 0);
SelectReferentialModal = __decorate([
    Component({
        selector: 'app-select-referential-modal',
        templateUrl: './select-referential.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ReferentialRefService,
        ChangeDetectorRef])
], SelectReferentialModal);
export { SelectReferentialModal };
//# sourceMappingURL=select-referential.modal.js.map