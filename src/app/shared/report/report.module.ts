import { NgModule } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { RevealModule } from '@app/shared/report/reveal/reveal.module';
import { SharedModule } from '@sumaris-net/ngx-components';

@NgModule({
  imports: [
    SharedModule,
    NgChartsModule,

    // Sub modules
    RevealModule,
  ],
  exports: [
    NgChartsModule,

    // Sub modules
    RevealModule,
  ],
})
export class AppSharedReportModule {}
