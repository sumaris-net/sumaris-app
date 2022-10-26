import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { ChartsModule } from 'ng2-charts';
import { RevealModule } from '@app/shared/report/reveal/reveal.module';

@NgModule({
  imports: [
    SharedModule,
    ChartsModule,

    // Sub modules
    RevealModule
  ],
  exports: [
    ChartsModule,

    // Sub modules
    RevealModule,
  ]
})
export class AppSharedReportModule {

}
