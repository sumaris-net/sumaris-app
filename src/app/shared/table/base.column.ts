import { AppAsyncTable, AppTable } from '@sumaris-net/ngx-components';
import { ChangeDetectorRef, Directive, inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatColumnDef, MatTable } from '@angular/material/table';
import { AsyncTableElement, TableElement } from '@e-is/ngx-material-table';

export declare type AnyTableElement = TableElement<any> | AsyncTableElement<any>;

@Directive()
export abstract class BaseColumn implements OnInit, OnDestroy {
  protected matTable = inject(MatTable<any>);
  protected cd = inject(ChangeDetectorRef);

  @Input() table: AppTable<any> | AppAsyncTable<any>;

  @ViewChild(MatColumnDef) columnDef: MatColumnDef;

  protected constructor() {
    if (!this.matTable) {
      throw new Error(`[base-column] this column component must be inside a MatTable`);
    }
  }

  ngOnInit() {
    if (!this.table) {
      throw new Error(`[base-column] Missing required table input!`);
    }
    this.cd.detectChanges();
    this.matTable.addColumnDef(this.columnDef);
  }

  ngOnDestroy() {
    this.matTable.removeColumnDef(this.columnDef);
  }
}
