import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedModule } from '@app/shared/shared.module';
import { RulesTable } from '@app/admin/rule/rules.table';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppCoreModule } from '@app/core/core.module';

@NgModule({
  imports: [TranslateModule.forChild(), AppSharedModule, AppReferentialModule, AppCoreModule],
  declarations: [RulesTable],
  exports: [TranslateModule, RulesTable],
})
export class AppRuleAdminModule {}
