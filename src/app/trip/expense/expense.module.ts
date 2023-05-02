import { NgModule } from '@angular/core';
import { ExpenseForm } from './expense.form';
import { TypedExpenseForm } from './typed-expense.form';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { AppReferentialModule } from '@app/referential/referential.module';


@NgModule({
  imports: [
    AppCoreModule,
    TranslateModule.forChild(),

    // Functional modules
    AppReferentialModule,
    AppMeasurementModule,
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
