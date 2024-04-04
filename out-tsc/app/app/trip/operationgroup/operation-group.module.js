import { __decorate, __metadata } from "tslib";
import { NgModule } from '@angular/core';
import { OperationGroupTable } from './operation-groups.table';
import { TranslateModule } from '@ngx-translate/core';
import { OperationGroupModal } from './operation-group.modal';
import { OperationGroupForm } from './operation-group.form';
import { AppCoreModule } from '@app/core/core.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { AppReferentialModule } from '@app/referential/referential.module';
let AppOperationGroupModule = class AppOperationGroupModule {
    constructor() {
        console.debug('[operation-group] Creating module...');
    }
};
AppOperationGroupModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule,
            TranslateModule.forChild(),
            // Functional modules
            AppReferentialModule,
            AppMeasurementModule,
        ],
        declarations: [
            OperationGroupTable,
            OperationGroupModal,
            OperationGroupForm
        ],
        exports: [
            OperationGroupTable,
            OperationGroupModal
        ]
    }),
    __metadata("design:paramtypes", [])
], AppOperationGroupModule);
export { AppOperationGroupModule };
//# sourceMappingURL=operation-group.module.js.map