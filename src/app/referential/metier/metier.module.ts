import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppReferentialTableModule } from '@app/referential/table/referential-table.module';
import { MetierPage } from '@app/referential/metier/metier.page';
import { AppSpatialItemMapModule } from '@app/referential/spatial-item/spatial-item-map.module';
import { AppActivityMapModule } from '@app/activity-calendar/map/activity-calendar-map/activity-calendar-map.module';
import { SplitAreaComponent, SplitComponent } from 'angular-split';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),

    AppCoreModule,

    // Sub modules
    AppReferentialFormModule,
    AppReferentialPipesModule,
    AppReferentialTableModule,
    AppSpatialItemMapModule,
    AppActivityMapModule,
    SplitAreaComponent,
    SplitComponent,
  ],
  declarations: [
    // Components
    MetierPage,
  ],
  exports: [
    TranslateModule,

    // Components
    MetierPage,
  ],
})
export class AppMetierModule {}
