import {NgModule} from '@angular/core';
import {SharedModule} from '@sumaris-net/ngx-components';
import {AppSlidesComponent} from '@app/shared/report/slides/slides.component';
import {ChartsModule} from 'ng2-charts';

@NgModule({
  imports: [
    SharedModule,
    ChartsModule
  ],
  declarations: [
    AppSlidesComponent
  ],
  exports: [
    AppSlidesComponent
  ]
})
export class AppSharedReportModule {

}
