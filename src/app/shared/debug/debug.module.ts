import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { DebugComponent } from '@app/shared/debug/debug.component';
import { MatExpansionModule } from '@angular/material/expansion';

@NgModule({
  imports: [
    SharedModule,
    MatExpansionModule
  ],
  declarations: [
    DebugComponent
  ],
  exports: [
    DebugComponent
  ]
})
export class AppSharedDebugModule {

}
