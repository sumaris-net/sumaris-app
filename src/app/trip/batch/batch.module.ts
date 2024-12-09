import { NgModule } from '@angular/core';
import { CatchBatchForm } from './catch/catch.form';
import { BatchGroupsTable } from './group/batch-groups.table';
import { SubBatchesTable } from './sub/sub-batches.table';
import { SubBatchesModal } from './sub/sub-batches.modal';
import { SubBatchForm } from './sub/sub-batch.form';
import { BatchForm } from './common/batch.form';
import { BatchTreeComponent } from './tree/batch-tree.component';
import { BatchGroupForm } from './group/batch-group.form';
import { BatchGroupModal } from './group/batch-group.modal';
import { SubBatchModal } from './sub/sub-batch.modal';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppDataModule } from '@app/data/data.module';
import { BatchModal } from './common/batch.modal';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { MatSamplingRatioFieldModule } from '@app/shared/material/sampling-ratio/material.sampling-ratio.module';
import { BatchSortingValueIconPipe, IsSamplingRatioComputedPipe, SamplingRatioFormatPipe } from '@app/trip/batch/common/batch.pipes';
import { BatchFilterForm } from '@app/trip/batch/filter/batch-filter.form';
import { BatchTreeContainerComponent } from '@app/trip/batch/tree/batch-tree-container.component';
import { MatTreeModule } from '@angular/material/tree';
import { BatchesTable } from '@app/trip/batch/common/batches.table';
import { BatchFormContent } from '@app/trip/batch/common/batch.form.content';
import { BatchModelTreeComponent } from '@app/trip/batch/tree/batch-model-tree.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { AppIchthyometerModule } from '@app/shared/ichthyometer/ichthyometer.module';
import { AppExtractionButtonModule } from '@app/extraction/button/extraction-button.module';
import { SubSortingCriteriaModal } from './sub/sub-sorting-criteria.modal';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),

    // Material tree component
    MatTreeModule,
    MatSidenavModule,

    // App module
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    AppVesselModule,
    AppMeasurementModule,

    // Components
    MatSamplingRatioFieldModule,
    AppIchthyometerModule,
    AppExtractionButtonModule,
  ],
  declarations: [
    // Pipes
    IsSamplingRatioComputedPipe,
    SamplingRatioFormatPipe,
    BatchSortingValueIconPipe,

    // Components
    BatchTreeComponent,
    BatchTreeContainerComponent,
    BatchModelTreeComponent,
    CatchBatchForm,

    BatchGroupsTable,
    BatchGroupForm,
    BatchGroupModal,

    BatchesTable,
    BatchForm,
    BatchModal,
    BatchFilterForm,
    BatchFormContent,

    SubBatchesTable,
    SubBatchForm,
    SubBatchModal,
    SubBatchesModal,
    SubSortingCriteriaModal,
  ],
  exports: [
    // Modules
    TranslateModule,

    // Pipes
    IsSamplingRatioComputedPipe,
    SamplingRatioFormatPipe,
    BatchSortingValueIconPipe,

    // Components
    BatchTreeComponent,
    BatchTreeContainerComponent,
    BatchModelTreeComponent,
    CatchBatchForm,
    BatchGroupsTable,
    BatchGroupForm,
    BatchGroupModal,

    BatchesTable,
    BatchForm,
    BatchModal,

    SubBatchesTable,
    SubBatchForm,
    SubBatchModal,
    SubBatchesModal,
    SubSortingCriteriaModal,
  ],
})
export class AppBatchModule {}
