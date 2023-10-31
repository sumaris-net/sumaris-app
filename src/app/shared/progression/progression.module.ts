import { NgModule } from '@angular/core';
import {RxStateModule, SharedModule} from '@sumaris-net/ngx-components';
import { AppProgressBarComponent } from '@app/shared/progression/progress-bar.component';

@NgModule({
  imports: [
    SharedModule,
    RxStateModule,
  ],
  declarations: [
    AppProgressBarComponent
  ],
  exports: [
    AppProgressBarComponent
  ]
})
export class AppSharedProgressionModule {

}
