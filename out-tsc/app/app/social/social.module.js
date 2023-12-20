import { __decorate } from "tslib";
import { SocialModule } from '@sumaris-net/ngx-components';
import { AppCoreModule } from '@app/core/core.module';
import { NgModule } from '@angular/core';
import { AppJobReportModule } from '@app/social/job/report/job-report.module';
import { AppUserEventModule } from '@app/social/user-event/user-event.module';
let AppSocialModule = class AppSocialModule {
};
AppSocialModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule,
            SocialModule,
            // Sub modules
            AppJobReportModule,
            AppUserEventModule,
        ],
        exports: [
            // Sub modules
            AppJobReportModule,
            AppUserEventModule,
        ],
    })
], AppSocialModule);
export { AppSocialModule };
//# sourceMappingURL=social.module.js.map