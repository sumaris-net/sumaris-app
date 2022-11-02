import {ModuleWithProviders, NgModule} from '@angular/core';
import {IonicStorageModule} from '@ionic/storage-angular';
import {HttpClientModule} from '@angular/common/http';
import {CacheModule} from 'ionic-cache';
import {AppGraphQLModule, CoreModule} from '@sumaris-net/ngx-components';
import {AppSharedModule} from '@app/shared/shared.module';
import {IsEmptyReferentialPipe, IsNotEmptyReferentialPipe} from '@app/core/pipes/core.pipe';


@NgModule({
  imports: [
    CoreModule,
    HttpClientModule,
    CacheModule,
    IonicStorageModule,

    // App modules
    AppSharedModule,
    AppGraphQLModule
  ],
  declarations: [
    // Pipes
    IsNotEmptyReferentialPipe,
    IsEmptyReferentialPipe
  ],
  exports: [
    CoreModule,
    AppSharedModule,

    // Pipes
    IsNotEmptyReferentialPipe,
    IsEmptyReferentialPipe
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
