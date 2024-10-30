import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { TranslateModule } from '@ngx-translate/core';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { SpatialItemMapComponent } from '@app/referential/spatial-item/spatial-item-map.component';
import { SplitAreaComponent, SplitComponent } from 'angular-split';

@NgModule({
  imports: [
    AppCoreModule,
    TranslateModule.forChild(),
    AppReferentialPipesModule,
    AppPmfmFormFieldModule,
    LeafletModule,
    SplitAreaComponent,
    SplitComponent,
  ],
  declarations: [SpatialItemMapComponent],
  exports: [SpatialItemMapComponent],
})
export class AppSpatialItemMapModule {}
