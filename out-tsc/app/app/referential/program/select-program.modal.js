import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector } from '@angular/core';
import { StatusIds } from '@sumaris-net/ngx-components';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramFilter } from '@app/referential/services/filter/program.filter';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BaseSelectEntityModal } from '@app/referential/table/base-select-entity.modal';
let SelectProgramModal = class SelectProgramModal extends BaseSelectEntityModal {
    constructor(injector, dataService, cd) {
        super(injector, Program, ProgramFilter, dataService);
        this.cd = cd;
    }
    ngOnInit() {
        this.filter = ProgramFilter.fromObject(Object.assign({ statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY] }, this.filter));
        super.ngOnInit();
    }
    computeTitle() {
        return __awaiter(this, void 0, void 0, function* () {
            return 'REFERENTIAL.ENTITY.PROGRAM';
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
            this.table.selection.setSelection(row);
            this.close();
        }
    }
};
SelectProgramModal = __decorate([
    Component({
        selector: 'app-select-program-modal',
        templateUrl: './select-program.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ProgramRefService,
        ChangeDetectorRef])
], SelectProgramModal);
export { SelectProgramModal };
//# sourceMappingURL=select-program.modal.js.map