import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { StrategiesTable } from './strategies.table';
import { PmfmStrategiesTable } from './pmfm-strategies.table';
import { StrategyForm } from './strategy.form';
import { TranslateModule } from '@ngx-translate/core';
import { StrategyPage } from './strategy.page';
import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { SamplingStrategyForm } from './sampling/sampling-strategy.form';
import { SamplingStrategyPage } from './sampling/sampling-strategy.page';
import { SamplingStrategiesTable } from './sampling/sampling-strategies.table';
import { AppCoreModule } from '@app/core/core.module';
import { StrategiesPage } from './strategies.page';
import { StrategyModal } from './strategy.modal';
import { AppTranscribingModule } from '@app/referential/transcribing/transcribing.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { MatSidenavModule } from '@angular/material/sidenav';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
import { AppExtractionButtonModule } from '@app/extraction/button/extraction-button.module';
let AppStrategyModule = class AppStrategyModule {
};
AppStrategyModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TextMaskModule,
            TranslateModule.forChild(),
            MatSidenavModule,
            // App modules
            AppCoreModule,
            AppReferentialFormModule,
            AppReferentialPipesModule,
            AppPmfmFormFieldModule,
            AppTranscribingModule,
            AppExtractionButtonModule,
        ],
        declarations: [
            // Pipes
            // Components
            StrategiesPage,
            StrategyPage,
            StrategyForm,
            StrategiesTable,
            PmfmStrategiesTable,
            SamplingStrategyPage,
            SamplingStrategyForm,
            SamplingStrategiesTable,
            StrategyModal
        ],
        exports: [
            TranslateModule,
            // Pipes
            // Components
            StrategiesPage,
            StrategyPage,
            StrategiesTable,
            SamplingStrategyPage,
            SamplingStrategiesTable,
            PmfmStrategiesTable
        ]
    })
], AppStrategyModule);
export { AppStrategyModule };
//# sourceMappingURL=strategy.module.js.map