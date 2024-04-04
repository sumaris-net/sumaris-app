import { __decorate, __metadata } from "tslib";
import { NgModule } from '@angular/core';
import { SamplesTable } from './samples.table';
import { SubSamplesTable } from './sub-samples.table';
import { AppReferentialModule } from '@app/referential/referential.module';
import { SampleForm } from './sample.form';
import { SampleModal } from './sample.modal';
import { AppDataModule } from '@app/data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { SubSampleForm } from '@app/trip/sample/sub-sample.form';
import { SubSampleModal } from '@app/trip/sample/sub-sample.modal';
import { IndividualMonitoringTable } from '@app/trip/sample/individualmonitoring/individual-monitoring.table';
import { IndividualReleasesTable } from '@app/trip/sample/individualrelease/individual-releases.table';
import { SampleTreeComponent } from '@app/trip/sample/sample-tree.component';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { SamplesModal } from '@app/trip/sample/samples.modal';
import { ImageGalleryModule } from '@sumaris-net/ngx-components';
import { AppPmfmSelectModalModule } from '@app/referential/pmfm/table/select-pmfm.module';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
let AppSampleModule = class AppSampleModule {
    constructor() {
        console.debug('[sample] Creating module...');
    }
};
AppSampleModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TranslateModule.forChild(),
            // App module
            AppCoreModule,
            AppReferentialModule,
            AppDataModule,
            // Functional modules
            AppMeasurementModule,
            AppPmfmSelectModalModule,
            ImageGalleryModule,
            AppEntityQualityModule,
        ],
        declarations: [
            SamplesTable,
            SampleForm,
            SampleModal,
            SamplesModal,
            SubSamplesTable,
            SubSampleForm,
            SubSampleModal,
            IndividualMonitoringTable,
            IndividualReleasesTable,
            SampleTreeComponent
        ],
        exports: [
            // Components
            SamplesTable,
            SamplesModal,
            SampleForm,
            SubSamplesTable,
            SampleTreeComponent
        ]
    }),
    __metadata("design:paramtypes", [])
], AppSampleModule);
export { AppSampleModule };
//# sourceMappingURL=sample.module.js.map