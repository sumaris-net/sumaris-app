import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { JobListComponent } from './job-list.component';
import { AppIconModule, JobModule, SharedModule } from '@sumaris-net/ngx-components';
import { AppSharedModule } from '@app/shared/shared.module';

@NgModule({
  imports: [
    TranslateModule.forChild(),
    AppSharedModule,
    AppIconModule,
    JobModule
  ],
  declarations: [JobListComponent],
  exports: [
    TranslateModule,
    JobListComponent
  ]
})
export class AppJobAdminModule {}
