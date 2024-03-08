import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { RevealComponent, RevealSectionDefDirective, RevealSectionOutletDirective } from '@app/shared/report/reveal/reveal.component';
import { RevealSectionDirective } from '@app/shared/report/reveal/reveal-section.directive';

@NgModule({
  imports: [SharedModule],
  declarations: [RevealComponent, RevealSectionDirective, RevealSectionDefDirective, RevealSectionOutletDirective],
  exports: [RevealComponent, RevealSectionDirective, RevealSectionDefDirective, RevealSectionOutletDirective],
})
export class RevealModule {}
