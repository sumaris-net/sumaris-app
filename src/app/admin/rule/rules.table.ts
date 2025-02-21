import { Component, Injector } from '@angular/core';
import { AppBaseAsyncTable } from '@app/shared/table/base.async-table';
import { Rule, RuleFilter } from '@app/referential/services/model/rule.model';
import { EntityUtils, InMemoryEntitiesService } from '@sumaris-net/ngx-components';

@Component({
  selector: 'app-rules-table',
  templateUrl: './rules.table.html',
  styleUrls: ['./rules.table.scss'],
  providers: [
    {
      provide: InMemoryEntitiesService,
      useFactory: () =>
        new InMemoryEntitiesService(Rule, RuleFilter, {
          equals: EntityUtils.equals,
          sortByReplacement: { id: 'rankOrder' },
        }),
    },
  ],
})
export class RulesTable extends AppBaseAsyncTable<Rule, RuleFilter> {
  set value(data: Rule[]) {
    this.memoryDataService.setValue(data);
  }

  constructor(injector: Injector) {
    super(
      injector,
      Rule,
      RuleFilter,
      ['operator', 'message'],
      injector.get(InMemoryEntitiesService),
      // validator
      null
    );
  }

  ngOnInit() {
    super.ngOnInit();
  }
}
