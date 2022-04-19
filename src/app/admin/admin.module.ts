import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AppReferentialModule} from '../referential/referential.module';
import {ConfigurationPage} from './config/configuration.page';
import { AdminModule, SocialModule } from '@sumaris-net/ngx-components';
import {NgxJdenticonModule} from 'ngx-jdenticon';
import {AppCoreModule} from '@app/core/core.module';

@NgModule({
  imports: [
    CommonModule,
    AdminModule,
    SocialModule,
    NgxJdenticonModule,

    // App modules
    AppCoreModule,
    AppReferentialModule
  ],
  declarations: [
    ConfigurationPage
  ],
  exports: [
    ConfigurationPage
  ]
})
export class AppAdminModule {

  constructor() {
    console.debug('[admin] Creating module');
  }
}
