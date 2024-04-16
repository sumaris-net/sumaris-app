import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { TranslateModule } from '@ngx-translate/core';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { ActivityCalendarsTable } from '@app/activity-calendar/table/activity-calendars.table';
import { ActivityCalendarOfflineModal } from '@app/activity-calendar/offline/activity-calendar-offline.modal';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { AppExtractionButtonModule } from '@app/extraction/button/extraction-button.module';

@NgModule({
  imports: [
    AppCoreModule,
    TranslateModule.forChild(),
    AppReferentialPipesModule,
    AppPmfmFormFieldModule,
    AppEntityQualityModule,
    AppExtractionButtonModule,
  ],
  declarations: [ActivityCalendarsTable, ActivityCalendarOfflineModal],
  exports: [ActivityCalendarsTable, ActivityCalendarOfflineModal],
})
export class AppActivityCalendarsTableModule {}
