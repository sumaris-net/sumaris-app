import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { SelectObservedLocationsModal } from '@app/trip/observedlocation/select-modal/select-observed-locations.modal';
import { AppObservedLocationsTableModule } from '@app/trip/observedlocation/table/observed-location-table.module';
import { AppObservedLocationFormModule } from '@app/trip/observedlocation/form/observed-location-form.module';


@NgModule({
  imports: [
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    TranslateModule.forChild(),

    AppObservedLocationsTableModule,
    AppObservedLocationFormModule,
  ],
  declarations: [
    SelectObservedLocationsModal
  ],
  exports: [
    // Components
    SelectObservedLocationsModal
  ]
})
export class AppSelectObservedLocationsModalModule {

}
