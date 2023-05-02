import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, OnInit } from '@angular/core';
import { changeCaseToUnderscore, isNilOrBlank, ReferentialRef, StatusIds } from '@sumaris-net/ngx-components';
import { TableElement } from '@e-is/ngx-material-table';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramFilter } from '@app/referential/services/filter/program.filter';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BaseSelectEntityModal, IBaseSelectEntityModalOptions } from '@app/referential/table/base-select-entity.modal';

export interface ISelectProgramModalOptions extends Partial<IBaseSelectEntityModalOptions<Program, ProgramFilter>> {
  filter: Partial<ProgramFilter>;
}

@Component({
  selector: 'app-select-program-modal',
  templateUrl: './select-program.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectProgramModal
  extends BaseSelectEntityModal<Program, ProgramFilter>
  implements OnInit, ISelectProgramModalOptions {

  constructor(
    injector: Injector,
    dataService: ProgramRefService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, Program, ProgramFilter, dataService);
  }

  ngOnInit() {
    this.filter = ProgramFilter.fromObject({
      statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      ...this.filter
    });

    super.ngOnInit();
  }

  protected async computeTitle(): Promise<string> {
    return 'REFERENTIAL.ENTITY.PROGRAM';
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected onRowClick(row: TableElement<Program>) {
    if (this.allowMultipleSelection) {
      this.table.selection.toggle(row);
    }
    else {
      this.table.selection.setSelection(row);
      this.close();
    }
  }
}
