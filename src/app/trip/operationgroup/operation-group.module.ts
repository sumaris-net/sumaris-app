import { NgModule } from '@angular/core';
import { OperationGroupTable } from './operation-groups.table';
import { TranslateModule } from '@ngx-translate/core';
import { OperationGroupModal } from './operation-group.modal';
import { OperationGroupForm } from './operation-group.form';
import { AppCoreModule } from '@app/core/core.module';
import { AppMeasurementModule } from '@app/trip/measurement/measurement.module';


@NgModule({
  imports: [
    AppCoreModule,
    TranslateModule.forChild(),

    // Functional modules
    AppMeasurementModule,
  ],
  declarations: [
    OperationGroupTable,
    OperationGroupModal,
    OperationGroupForm
  ],
  exports: [
    OperationGroupTable,
    OperationGroupModal
  ]
})
export class AppOperationGroupModule {

  constructor() {
    console.debug('[operation-group] Creating module...');
  }
}
