import {ModuleWithProviders, NgModule} from '@angular/core';
import {IonicStorageModule} from '@ionic/storage';
import {HttpClientModule} from '@angular/common/http';
import {CacheModule} from 'ionic-cache';
import { AppGraphQLModule, CoreModule, Environment } from '@sumaris-net/ngx-components';
import {AppSharedModule} from '@app/shared/shared.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CoreModule,
    HttpClientModule,
    CacheModule,
    IonicStorageModule,
    TranslateModule.forChild(),

    // App modules
    AppSharedModule,
    AppGraphQLModule
  ],
  declarations: [
  ],
  exports: [
    CoreModule,
    AppSharedModule,
    TranslateModule
  ]
})
export class AppCoreModule {

  static forRoot(): ModuleWithProviders<AppCoreModule> {

    return {
      ngModule: AppCoreModule,
      providers: [
        ...CoreModule.forRoot().providers
      ]
    };
  }
}
