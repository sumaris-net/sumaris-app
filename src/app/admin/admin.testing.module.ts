import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, SharedModule, TestingPage } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { RulesTableTestPage } from '@app/admin/rule/testing/rules.table.test';
import { AppAdminModule } from '@app/admin/admin.module';

export const ADMIN_TESTING_PAGES: TestingPage[] = [
  { label: 'Admin', divider: true },
  { label: 'Rules Table', page: '/testing/admin/rulesTable' },
];

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'rulesTable',
  },
  {
    path: 'rulesTable',
    pathMatch: 'full',
    component: RulesTableTestPage,
  },
];

@NgModule({
  imports: [CommonModule, SharedModule, CoreModule, TranslateModule.forChild(), RouterModule.forChild(routes), AppAdminModule],
  declarations: [RulesTableTestPage],
  exports: [RulesTableTestPage],
})
export class AdminTestingModule {}
