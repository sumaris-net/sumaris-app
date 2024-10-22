import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppReferentialTableModule } from '@app/referential/table/referential-table.module';
import { ExpertiseAreaPage } from '@app/referential/expertise-area/expertise-area.page';
import { RxStateModule } from '@sumaris-net/ngx-components';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),
    RxStateModule,

    AppCoreModule,

    // Sub modules
    AppReferentialFormModule,
    AppReferentialPipesModule,
    AppReferentialTableModule,
  ],
  declarations: [
    // Components
    ExpertiseAreaPage,
  ],
  exports: [
    TranslateModule,

    // Components
    ExpertiseAreaPage,
  ],
})
export class AppExpertiseAreaModule {}
