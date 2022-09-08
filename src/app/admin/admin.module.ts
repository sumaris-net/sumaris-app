import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppReferentialModule } from '../referential/referential.module';
import { ConfigurationPage } from './config/configuration.page';
import { AdminModule, UserEventModule } from '@sumaris-net/ngx-components';
import { NgxJdenticonModule } from 'ngx-jdenticon';
import { AppCoreModule } from '@app/core/core.module';
import { AppSocialModule } from '@app/social/social.module';
import { AppConfigurationModule } from '@app/admin/config/configuration.module';

@NgModule({
  imports: [
    CommonModule,
    AdminModule,

    // Sub modules
    AppConfigurationModule
  ],
  exports: [
    AppConfigurationModule
  ]
})
export class AppAdminModule {

  constructor() {
    console.debug('[admin] Creating module');
  }
}
