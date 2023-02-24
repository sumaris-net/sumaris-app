import { NgModule } from '@angular/core';
import { SoftwarePage } from './software/software.page';
import { ParameterPage } from './pmfm/parameter.page';
import { SelectReferentialModal } from './list/select-referential.modal';
import { ReferentialRefTable } from './list/referential-ref.table';
import { TranslateModule } from '@ngx-translate/core';

import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { SimpleReferentialTable } from './list/referential-simple.table';
import { ReferentialsPage } from '@app/referential/list/referentials.page';
import { AppCoreModule } from '@app/core/core.module';
import { AppStrategyModule } from '@app/referential/strategy/strategy.module';
import { AppTranscribingModule } from '@app/referential/transcribing/transcribing.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppPmfmModule } from '@app/referential/pmfm/pmfm.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppProgramModule } from '@app/referential/program/program.module';
import { AppTaxonGroupModule } from '@app/referential/taxon-group/taxon-group.module';
import { AppTaxonModule } from '@app/referential/taxon/taxon.module';
import { AppReferentialListModule } from '@app/referential/list/referential-list.module';

@NgModule({
  imports: [
    CommonModule,
    TextMaskModule,
    TranslateModule.forChild(),

    AppCoreModule,

    // Sub modules
    AppReferentialFormModule,
    AppReferentialListModule,
    AppReferentialPipesModule,
    AppPmfmModule,
    AppProgramModule,
    AppStrategyModule,
    AppTranscribingModule,
    AppTaxonGroupModule,
    AppTaxonModule
  ],
  declarations: [

    // Components
    SoftwarePage,
    ParameterPage
  ],
  exports: [
    TranslateModule,

    // Sub Modules
    AppReferentialPipesModule,
    AppReferentialFormModule,
    AppReferentialListModule,
    AppPmfmModule,
    AppProgramModule,
    AppStrategyModule,
    AppTranscribingModule,
    AppTaxonGroupModule,
    AppTaxonModule,

    // Components
    SoftwarePage,
    ParameterPage
  ],
})
export class AppReferentialModule {
}
