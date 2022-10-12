import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { ChartsModule } from 'ng2-charts';
import { RevealModule } from '@app/shared/report/reveal/reveal.module';

@NgModule({
  imports: [
    SharedModule,
    ChartsModule,

    // Sub module
    RevealModule
  ],
  exports: [
    RevealModule
  ]
})
export class AppSharedReportModule {

}
