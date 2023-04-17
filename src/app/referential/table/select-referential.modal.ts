import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { changeCaseToUnderscore, ReferentialRef } from '@sumaris-net/ngx-components';
import { TableElement } from '@e-is/ngx-material-table';
import { ReferentialRefService } from '../services/referential-ref.service';
import { BaseSelectEntityModal, IBaseSelectEntityModalOptions } from './base-select-entity.modal';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';

export interface ISelectReferentialModalOptions extends Partial<IBaseSelectEntityModalOptions<ReferentialRef, ReferentialRefFilter>> {
  filter: Partial<ReferentialRefFilter>;
  showLevelFilter?: boolean;
}

@Component({
  selector: 'app-select-referential-modal',
  templateUrl: './select-referential.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectReferentialModal extends BaseSelectEntityModal<ReferentialRef, ReferentialRefFilter>
  implements OnInit, ISelectReferentialModalOptions {

  @Input() showLevelFilter: boolean = true;

  constructor(
    protected injector: Injector,
    protected dataService: ReferentialRefService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, ReferentialRef, dataService);
  }

  ngOnInit() {
    this.filter = ReferentialRefFilter.fromObject(this.filter);

    super.ngOnInit();

    // Copy the entityName to filter
    if (this.entityName) {
      this.filter.entityName = this.entityName;
    }
    if (!this.filter.entityName) throw new Error('Missing entityName');
  }

  protected async computeTitle(): Promise<string> {
    return 'REFERENTIAL.ENTITY.' + changeCaseToUnderscore(this.filter.entityName).toUpperCase();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected onRowClick(row: TableElement<ReferentialRef>) {
    this.table.selection.toggle(row);
  }
}
