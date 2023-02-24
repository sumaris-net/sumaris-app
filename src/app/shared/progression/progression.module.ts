import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { AppProgressBarComponent } from '@app/shared/progression/progress-bar.component';
import { IfModule } from '@rx-angular/template/if';
import { ForModule } from '@rx-angular/template/for';
import { LetModule } from '@rx-angular/template/let';
import { PushModule } from '@rx-angular/template/push';

@NgModule({
  imports: [
    SharedModule,
    IfModule, ForModule, LetModule, PushModule
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
