import { NgModule } from '@angular/core';
import { CoreModule, SharedModule } from '@sumaris-net/ngx-components';
import { AppProgressBarComponent } from '@app/shared/progression/progress-bar.component';
import { EntityQualityFormComponent } from '@app/data/quality/entity-quality-form.component';
import { EntityQualityIconComponent } from '@app/data/quality/entity-quality-icon.component';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppSharedProgressionModule } from '@app/shared/progression/progression.module';
import { IfModule } from '@rx-angular/template/if';

@NgModule({
  imports: [
    AppSharedModule,
    AppSharedProgressionModule
  ],
  declarations: [
    EntityQualityFormComponent,
    EntityQualityIconComponent
  ],
  exports: [
    EntityQualityFormComponent,
    EntityQualityIconComponent
  ]
})
export class AppEntityQualityModule {

}
