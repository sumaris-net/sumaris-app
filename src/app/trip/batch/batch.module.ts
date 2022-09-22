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
import { VesselModule } from '@app/vessel/vessel.module';
import { AppMeasurementModule } from '@app/trip/measurement/measurement.module';
import { MatSamplingRatioFieldModule } from '@app/shared/material/sampling-ratio/material.sampling-ratio.module';
import { IsSamplingRatioComputedPipe, SamplingRatioFormatPipe } from '@app/trip/batch/common/batch.pipes';
import { BatchFilterForm } from '@app/trip/batch/filter/batch-filter.form';
import { BatchTreeContainerComponent } from '@app/trip/batch/tree/batch-tree-container.component';
import { MatTreeModule } from '@angular/material/tree';
import { BatchesTable } from '@app/trip/batch/common/batches.table';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),

    // Material tree component
    MatTreeModule,

    // App module
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    VesselModule,
    AppMeasurementModule,

    // Components
    MatSamplingRatioFieldModule
  ],
  declarations: [
    // Pipes
    IsSamplingRatioComputedPipe,
    SamplingRatioFormatPipe,

    // Components
    BatchTreeComponent,
    BatchTreeContainerComponent,
    CatchBatchForm,

    BatchGroupsTable,
    BatchGroupForm,
    BatchGroupModal,

    BatchesTable,
    BatchForm,
    BatchModal,
    BatchFilterForm,

    SubBatchesTable,
    SubBatchForm,
    SubBatchModal,
    SubBatchesModal
  ],
  exports: [
    // Modules
    TranslateModule,

    // Pipes
    IsSamplingRatioComputedPipe,
    SamplingRatioFormatPipe,

    // Components
    BatchTreeContainerComponent,
    BatchTreeComponent,
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
    SubBatchesModal
  ]
})
export class AppBatchModule {

}
