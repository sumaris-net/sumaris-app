import { NgModule } from '@angular/core';
import { ExpenseForm } from './expense.form';
import { TypedExpenseForm } from './typed-expense.form';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppMeasurementModule } from '@app/trip/measurement/measurement.module';


@NgModule({
  imports: [
    AppCoreModule,
    TranslateModule.forChild(),
    AppMeasurementModule
  ],
  declarations: [
    ExpenseForm,
    TypedExpenseForm
  ],
  exports: [
    // Components
    ExpenseForm,
    TypedExpenseForm,
  ]
})
export class AppExpenseModule {

  constructor() {
    console.debug('[expense] Creating module...');
  }
}
