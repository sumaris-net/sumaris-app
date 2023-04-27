import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ObservedLocationOfflineModal } from './observed-location-offline.modal';
import { AppCoreModule } from '@app/core/core.module';


@NgModule({
  imports: [
    AppCoreModule,
    TranslateModule.forChild(),
  ],
  declarations: [
    ObservedLocationOfflineModal
  ],
  exports: [
    ObservedLocationOfflineModal
  ]
})
export class AppObservedLocationOfflineModule {

}
