import { Component, OnInit, ViewChild } from '@angular/core';
import { RulesTable } from '@app/admin/rule/rules.table';
import { Rule } from '@app/referential/services/model/rule.model';

@Component({
  selector: 'app-rules-table-test',
  templateUrl: './rules.table.test.html',
})
export class RulesTableTestPage implements OnInit {
  enabled = true;

  @ViewChild('table1', { static: true }) table1: RulesTable;

  constructor() {}

  ngOnInit() {
    this.table1.value = [
      Rule.fromObject({
        operator: '=',
        message: 'test',
      }),
    ];
  }
}
