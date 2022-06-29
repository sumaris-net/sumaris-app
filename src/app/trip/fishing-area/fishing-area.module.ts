import { NgModule } from '@angular/core';
import { FishingAreaForm } from './fishing-area.form';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedModule } from '@app/shared/shared.module';


@NgModule({
  imports: [
    AppSharedModule,
    TranslateModule.forChild()
  ],
  declarations: [
    FishingAreaForm
  ],
  exports: [
    // Components
    FishingAreaForm
  ]
})
export class AppFishingAreaModule {

  constructor() {
    console.debug('[fishing-area] Creating module...');
  }
}
