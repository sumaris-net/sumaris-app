import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { RevealSectionDirective } from '@app/shared/report/reveal/reveal-section.directive';

@NgModule({
  imports: [
    SharedModule
  ],
  declarations: [
    RevealComponent,
    RevealSectionDirective
  ],
  exports: [
    RevealComponent,
    RevealSectionDirective
  ]
})
export class RevealModule {

}
