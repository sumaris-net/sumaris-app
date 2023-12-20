import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { JobListComponent } from './job-list.component';
import { AppIconModule, JobModule } from '@sumaris-net/ngx-components';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppSharedProgressionModule } from '@app/shared/progression/progression.module';
let AppJobAdminModule = class AppJobAdminModule {
};
AppJobAdminModule = __decorate([
    NgModule({
        imports: [
            TranslateModule.forChild(),
            AppSharedModule,
            AppIconModule,
            JobModule,
            AppSharedProgressionModule
        ],
        declarations: [JobListComponent],
        exports: [
            TranslateModule,
            JobListComponent
        ]
    })
], AppJobAdminModule);
export { AppJobAdminModule };
//# sourceMappingURL=job-list.module.js.map