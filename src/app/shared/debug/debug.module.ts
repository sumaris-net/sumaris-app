import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { DebugComponent } from '@app/shared/debug/debug.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    SharedModule,
    TranslateModule.forChild(),
    MatExpansionModule
  ],
  declarations: [
    DebugComponent
  ],
  exports: [
    DebugComponent,
    TranslateModule
  ]
})
export class AppSharedDebugModule {

}
