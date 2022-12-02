import { NgModule } from '@angular/core';

import { ReferentialForm } from './form/referential.form';
import { ProgramPage } from './program/program.page';
import { StrategiesTable } from './strategy/strategies.table';
import { SoftwarePage } from './software/software.page';
import { PmfmPage } from './pmfm/pmfm.page';
import { ParameterPage } from './pmfm/parameter.page';
import { PmfmStrategiesTable } from './strategy/pmfm-strategies.table';
import { SelectReferentialModal } from './list/select-referential.modal';
import { ReferentialRefTable } from './list/referential-ref.table';
import { StrategyForm } from './strategy/strategy.form';
import { PmfmQvFormField } from './pmfm/pmfm-qv.form-field.component';
import { PmfmFormField } from './pmfm/pmfm.form-field.component';
import { ReferentialToStringPipe } from './pipes/referential-to-string.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { IsComputedPmfmPipe, IsDatePmfmPipe, IsMultiplePmfmPipe, PmfmFieldStylePipe, PmfmIdStringPipe, PmfmNamePipe, PmfmValueColorPipe, PmfmValuePipe } from './pipes/pmfms.pipe';
import { StrategyPage } from './strategy/strategy.page';

import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { ProgramsPage } from './program/programs.page';
import { SamplingStrategyForm } from './strategy/sampling/sampling-strategy.form';
import { SamplingStrategyPage } from './strategy/sampling/sampling-strategy.page';
import { SamplingStrategiesTable } from './strategy/sampling/sampling-strategies.table';
import { SimpleReferentialTable } from './list/referential-simple.table';
import { PmfmsTable } from './pmfm/pmfms.table';
import { SelectPmfmModal } from './pmfm/select-pmfm.modal';
import { TaxonNamePage } from './taxon/taxon-name.page';
import { ReferentialsPage } from '@app/referential/list/referentials.page';
import { AppCoreModule } from '@app/core/core.module';
import { StrategiesPage } from './strategy/strategies.page';
import { StrategyModal } from '@app/referential/strategy/strategy.modal';
import { PersonPrivilegesTable } from '@app/referential/program/privilege/person-privileges.table';
import { WeightLengthConversionTable } from '@app/referential/weight-length-conversion/weight-length-conversion.table';
import { TaxonGroupPage } from '@app/referential/taxon-group/taxon-group.page';
import { RoundWeightConversionTable } from '@app/referential/round-weight-conversion/round-weight-conversion.table';
import { WeightFormatPipe } from '@app/referential/pipes/weights.pipe';

@NgModule({
  imports: [
    CommonModule,
    TextMaskModule,
    TranslateModule.forChild(),

    AppCoreModule
  ],
  declarations: [
    // Pipes
    ReferentialToStringPipe,
    PmfmIdStringPipe,
    PmfmNamePipe,
    PmfmValuePipe,
    PmfmValueColorPipe,
    IsDatePmfmPipe,
    IsComputedPmfmPipe,
    IsMultiplePmfmPipe,
    PmfmFieldStylePipe,
    WeightFormatPipe,

    // Components
    ProgramsPage,
    ProgramPage,
    PersonPrivilegesTable,
    StrategiesPage,
    StrategyPage,
    StrategyForm,
    StrategiesTable,
    PmfmStrategiesTable,
    SamplingStrategyPage,
    SamplingStrategyForm,
    SamplingStrategiesTable,

    ReferentialsPage,
    ReferentialForm,
    SoftwarePage,
    ParameterPage,
    PmfmPage,
    SimpleReferentialTable,
    ReferentialRefTable,
    SelectReferentialModal,
    PmfmFormField,
    PmfmQvFormField,
    PmfmsTable,
    SelectPmfmModal,
    WeightLengthConversionTable,
    RoundWeightConversionTable,
    TaxonNamePage,
    TaxonGroupPage,
    StrategyModal
  ],
  exports: [
    TranslateModule,

    // Pipes
    ReferentialToStringPipe,
    PmfmIdStringPipe,
    PmfmNamePipe,
    PmfmValuePipe,
    PmfmValueColorPipe,
    IsDatePmfmPipe,
    IsComputedPmfmPipe,
    IsMultiplePmfmPipe,
    PmfmFieldStylePipe,
    WeightFormatPipe,

    // Components
    ProgramsPage,
    ProgramPage,
    PersonPrivilegesTable,
    StrategiesPage,
    StrategyPage,
    StrategyForm,
    PmfmStrategiesTable,
    SamplingStrategyForm,
    SamplingStrategyPage,

    ReferentialsPage,
    ReferentialForm,
    SoftwarePage,
    ParameterPage,
    PmfmPage,
    ReferentialRefTable,
    SelectReferentialModal,
    PmfmFormField,
    PmfmQvFormField,
    PmfmsTable,
    SelectPmfmModal,
    TaxonNamePage,
    TaxonGroupPage,
    StrategyModal
  ],
})
export class AppReferentialModule {
}
