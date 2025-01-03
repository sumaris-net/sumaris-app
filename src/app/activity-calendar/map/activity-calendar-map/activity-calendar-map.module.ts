import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { TranslateModule } from '@ngx-translate/core';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { ActivityCalendarMapComponent } from '@app/activity-calendar/map/activity-calendar-map/activity-calendar-map.component';
import { LeafletModule } from '@bluehalo/ngx-leaflet';

@NgModule({
  imports: [AppCoreModule, TranslateModule.forChild(), AppReferentialPipesModule, AppPmfmFormFieldModule, LeafletModule],
  declarations: [ActivityCalendarMapComponent],
  exports: [ActivityCalendarMapComponent],
})
export class AppActivityMapModule {}
