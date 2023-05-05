import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { NgChartsModule } from 'ng2-charts';
import { RevealModule } from '@app/shared/report/reveal/reveal.module';

@NgModule({
  imports: [
    SharedModule,
    NgChartsModule,

    // Sub modules
    RevealModule
  ],
  exports: [
    NgChartsModule,

    // Sub modules
    RevealModule,
  ]
})
export class AppSharedReportModule {

}
