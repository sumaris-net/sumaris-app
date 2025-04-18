import { booleanAttribute, ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AnyTableElement, BaseColumn } from '@app/shared/table/base.column';
import { TableElement } from '@e-is/ngx-material-table';

@Component({
  selector: 'app-select-column',
  templateUrl: './select-column.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectColumnComponent<T extends AnyTableElement = TableElement<any>> extends BaseColumn implements OnInit, OnDestroy {
  @Input() name = 'select';
  @Input('class') classList: string;
  @Input({ transform: booleanAttribute }) hidden = false;
  @Input() hiddenCheckboxIf: (row: T) => boolean;

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.cd.detectChanges();
    this.matTable.addColumnDef(this.columnDef);
  }

  ngOnDestroy() {
    this.matTable.removeColumnDef(this.columnDef);
  }
}
