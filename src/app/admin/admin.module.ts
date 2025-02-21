import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminModule } from '@sumaris-net/ngx-components';
import { AppConfigurationModule } from '@app/admin/config/configuration.module';
import { AppRuleAdminModule } from '@app/admin/rule/rules.module';
import { AppJobAdminModule } from '@app/admin/job/job-list.module';

@NgModule({
  imports: [
    CommonModule,
    AdminModule,

    // Sub modules
    AppConfigurationModule,
    AppJobAdminModule,
    AppRuleAdminModule,
  ],
  exports: [AppConfigurationModule, AppJobAdminModule, AppRuleAdminModule],
})
export class AppAdminModule {
  constructor() {
    console.debug('[admin] Creating module');
  }
}
