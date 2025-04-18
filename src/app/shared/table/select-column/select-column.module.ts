import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppTableModule, SharedPipesModule } from '@sumaris-net/ngx-components';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectColumnComponent } from '@app/shared/table/select-column/select-column.component';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    MatTableModule,
    MatCheckboxModule,
    TranslateModule.forChild(),
    SharedPipesModule,
    // Functional modules
    AppTableModule,
  ],
  declarations: [SelectColumnComponent],
  exports: [
    // Components
    SelectColumnComponent,
  ],
})
export class AppSelectColumnModule {}
