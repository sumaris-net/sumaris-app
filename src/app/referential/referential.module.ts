import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CoreModule} from '../core/core.module';
import {VesselService} from './services/vessel-service';
import {VesselValidatorService} from './services/validator/vessel.validator';
import {ReferentialRefService} from './services/referential-ref.service';
import {ReferentialService} from './services/referential.service';
import {ReferentialValidatorService} from './services/validator/referential.validator';
import {ProgramService} from './services/program.service';
import {VesselForm} from "./vessel/form/form-vessel";
import {VesselPage} from "./vessel/page/vessel.page";
import {VesselsTable} from "./vessel/list/vessels.table";
import {VesselModal} from "./vessel/modal/modal-vessel";
import {ReferentialsPage} from './list/referentials';

import {ReferentialForm} from "./form/referential.form";
import {ProgramPage} from "./program/program.page";
import {ProgramValidatorService} from "./services/validator/program.validator";
import {StrategyValidatorService} from "./services/validator/strategy.validator";
import {StrategiesTable} from "./strategy/strategies.table";
import {SimpleStrategiesTable} from "../referential/simpleStrategy/simpleStrategies/simpleStrategies.table";
import {SoftwarePage} from "./software/software.page";
import {VesselFeaturesHistoryComponent} from "./vessel/page/vessel-features-history.component";
import {VesselRegistrationHistoryComponent} from "./vessel/page/vessel-registration-history.component";
import {VesselFeaturesValidatorService} from "./services/validator/vessel-features.validator";
import {VesselRegistrationValidatorService} from "./services/validator/vessel-registration.validator";
import {SoftwareValidatorService} from "./services/validator/software.validator";
import {SoftwareService} from "./services/software.service";
import {VesselsPage} from "./vessel/list/vessels.page";
import {PmfmService} from "./services/pmfm.service";
import {ParameterService} from "./services/parameter.service";
import {PmfmValidatorService} from "./services/validator/pmfm.validator";
import {PmfmPage} from "./pmfm/pmfm.page";
import {ParameterPage} from "./pmfm/parameter.page";
import {SimpleStrategyPage} from "./simpleStrategy/simpleStrategy.page";
import {PlanificationForm} from "./planification/planification.form";
import {ParameterValidatorService} from "./services/validator/parameter.validator";
import {ReferentialTable} from "./list/referential.table";
import {ReferentialRoutingModule} from "./referential-routing.module";
import {PmfmStrategiesTable} from "./strategy/pmfm-strategies.table";
import {PmfmStrategyValidatorService} from "./services/validator/pmfm-strategy.validator";
import {SelectReferentialModal} from "./list/select-referential.modal";
import {ReferentialRefTable} from "./list/referential-ref.table";
import {StrategyForm} from "./strategy/strategy.form";
import {PmfmQvFormField} from "./pmfm/pmfm-qv.form-field.component";
import {PmfmFormField} from "./pmfm/pmfm.form-field.component";
import {TextMaskModule} from "angular2-text-mask";

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    TextMaskModule
  ],
  declarations: [
    ReferentialsPage,
    ReferentialForm,
    PlanificationForm,
    VesselsTable,
    VesselPage,
    VesselsPage,
    VesselForm,
    VesselModal,
    ProgramPage,
    SimpleStrategyPage,
    StrategyForm,
    StrategiesTable,
    SimpleStrategiesTable,
    PmfmStrategiesTable,
    SoftwarePage,
    VesselFeaturesHistoryComponent,
    VesselRegistrationHistoryComponent,
    ParameterPage,
    PmfmPage,
    ReferentialTable,
    ReferentialRefTable,
    SelectReferentialModal,
    PmfmFormField,
    PmfmQvFormField
  ],
  exports: [
    ReferentialsPage,
    ReferentialForm,
    PlanificationForm,
    VesselsTable,
    VesselPage,
    VesselForm,
    ProgramPage,
    SimpleStrategyPage,
    StrategyForm,
    SoftwarePage,
    VesselsPage,
    ParameterPage,
    PmfmPage,
    ReferentialRefTable,
    SelectReferentialModal,
    PmfmFormField,
    PmfmQvFormField
  ]
})
export class ReferentialModule {
}
