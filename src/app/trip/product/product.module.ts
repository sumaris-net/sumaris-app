import { NgModule } from '@angular/core';
import { ProductsTable } from './products.table';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { ProductForm } from './product.form';
import { ProductModal } from './product.modal';
import { AppCoreModule } from '@app/core/core.module';
import { AppLandingModule } from '@app/trip/landing/landing.module';
import { AppLandedTripModule } from '@app/trip/landedtrip/landed-trip.module';
import { AppDataModule } from '@app/data/data.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { MatError } from '@angular/material/form-field';

@NgModule({
  imports: [
    AppCoreModule,
    AppDataModule,
    TranslateModule.forChild(),

    // Functional modules
    AppReferentialModule,
    AppMeasurementModule,
    MatError,
    TranslatePipe,
  ],
  declarations: [ProductsTable, ProductModal, ProductForm],
  exports: [
    // Components
    ProductsTable,
  ],
})
export class AppProductModule {
  constructor() {
    console.debug('[product] Creating module...');
  }
}
