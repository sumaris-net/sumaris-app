import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { MatSamplingRatioField } from '@app/shared/material/sampling-ratio/material.sampling-ratio';

@NgModule({
  imports: [
    SharedModule
  ],
  declarations: [
    MatSamplingRatioField
  ],
  exports: [
    MatSamplingRatioField
  ]
})
export class MatSamplingRatioFieldModule {

}
