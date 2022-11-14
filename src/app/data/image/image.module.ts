import {NgModule} from '@angular/core';
import {CoreModule} from '@sumaris-net/ngx-components';
import {AppImageModal} from '@app/data/image/image.modal/image.modal';

@NgModule({
  imports: [
    CoreModule,

    // Sub modules
  ],
  declarations: [
    // Components
    AppImageModal

  ],
  exports: [

    // Components
    AppImageModal
  ]
})
export class AppDataImageModule {

}
