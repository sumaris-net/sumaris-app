import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppReferentialTableModule } from '@app/referential/table/referential-table.module';
import { MethodPage } from '@app/referential/pmfm/method/method.page';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),

    AppCoreModule,

    // Sub modules
    AppReferentialFormModule,
    AppReferentialPipesModule,
    AppReferentialTableModule
  ],
  declarations: [

    // Components
    MethodPage
  ],
  exports: [
    TranslateModule,

    // Components
    MethodPage
  ],
})
export class AppPmfmMethodModule {
}
