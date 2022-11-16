import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import {ImageAttachmentTestPage} from '@app/data/image/testing/image-attachment.test';
import {IonicModule} from '@ionic/angular';
import {CoreModule} from '@sumaris-net/ngx-components';
import {AppDataImageModule} from '@app/data/image/image.module';


@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    TranslateModule.forChild(),
    AppDataImageModule
  ],
  declarations: [
    ImageAttachmentTestPage
  ],
  exports: [
    ImageAttachmentTestPage,
    TranslateModule
  ]
})
export class AppImageAttachmentTestingModule {
}
