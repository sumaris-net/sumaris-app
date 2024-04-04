import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppReferentialModule } from '@app/referential/referential.module';
import { ConfigurationPage } from './configuration.page';
import { AdminModule } from '@sumaris-net/ngx-components';
import { NgxJdenticonModule } from 'ngx-jdenticon';
import { AppCoreModule } from '@app/core/core.module';
import { AppSocialModule } from '@app/social/social.module';
import { AppSoftwareModule } from '@app/referential/software/software.module';
import { AppJobAdminModule } from '@app/admin/job/job-list.module';
let AppConfigurationModule = class AppConfigurationModule {
};
AppConfigurationModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            AdminModule,
            NgxJdenticonModule,
            // App modules
            AppCoreModule,
            AppSocialModule,
            AppReferentialModule,
            AppSoftwareModule,
            AppJobAdminModule
        ],
        declarations: [
            ConfigurationPage
        ],
        exports: [
            ConfigurationPage
        ]
    })
], AppConfigurationModule);
export { AppConfigurationModule };
//# sourceMappingURL=configuration.module.js.map