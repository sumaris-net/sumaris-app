import { NgModule } from '@angular/core';
import { ProgramPage } from './program.page';
import { TranslateDirective, TranslateModule } from '@ngx-translate/core';

import { CommonModule } from '@angular/common';
import { ProgramsPage } from './programs.page';
import { AppCoreModule } from '@app/core/core.module';
import { PersonPrivilegesTable } from './privilege/person-privileges.table';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppStrategyModule } from '@app/referential/strategy/strategy.module';
import { AppReferentialTableModule } from '@app/referential/table/referential-table.module';
import { SelectProgramModal } from '@app/referential/program/select-program.modal';
import { AppSharedModule } from '@app/shared/shared.module';
import { IonicModule } from '@ionic/angular';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatLabel } from '@angular/material/form-field';
import { MatMenu, MatMenuItem } from '@angular/material/menu';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),

    AppSharedModule,
    AppCoreModule,

    // Sub modules
    AppReferentialFormModule,
    AppReferentialTableModule,
    AppReferentialPipesModule,
    AppStrategyModule,
    IonicModule,
    MatDivider,
    MatIcon,
    MatLabel,
    MatMenu,
    MatMenuItem,
    TranslateDirective,
  ],
  declarations: [
    // Components
    ProgramsPage,
    ProgramPage,
    PersonPrivilegesTable,
    SelectProgramModal,
  ],
  exports: [
    TranslateModule,

    // Components
    ProgramsPage,
    ProgramPage,
    PersonPrivilegesTable,
    SelectProgramModal,
  ],
})
export class AppProgramModule {}
