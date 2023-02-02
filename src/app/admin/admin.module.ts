import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminModule } from '@sumaris-net/ngx-components';
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
