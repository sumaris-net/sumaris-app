import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { TranslateModule } from '@ngx-translate/core';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { ActivityCalendarForm } from '@app/activity-calendar/form/activity-calendar.form';

@NgModule({
  imports: [AppCoreModule, TranslateModule.forChild(), AppReferentialPipesModule, AppPmfmFormFieldModule],
  declarations: [ActivityCalendarForm],
  exports: [ActivityCalendarForm],
})
export class AppActivityCalendarFormModule {}
