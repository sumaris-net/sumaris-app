import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { BaseReferential, changeCaseToUnderscore, isNilOrBlank, ReferentialRef } from '@sumaris-net/ngx-components';
import { TableElement } from '@e-is/ngx-material-table';
import { ReferentialRefService } from '../services/referential-ref.service';
import { BaseSelectEntityModal, IBaseSelectEntityModalOptions } from './base-select-entity.modal';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { IReferentialRef } from '@sumaris-net/ngx-components/src/app/core/services/model/referential.model';

export interface ISelectReferentialModalOptions extends Partial<IBaseSelectEntityModalOptions<ReferentialRef, ReferentialRefFilter>> {
  filter: Partial<ReferentialRefFilter>;
  showLevelFilter?: boolean;
}

@Component({
  selector: 'app-select-referential-modal',
  templateUrl: './select-referential.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectReferentialModal
  extends BaseSelectEntityModal<ReferentialRef, ReferentialRefFilter>
  implements OnInit, ISelectReferentialModalOptions {

  @Input() showLevelFilter: boolean = true;

  constructor(
    injector: Injector,
    dataService: ReferentialRefService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, ReferentialRef, ReferentialRefFilter, dataService);
  }

  ngOnInit() {
    this.filter = ReferentialRefFilter.fromObject({entityName: this.entityName, ...this.filter});
    if (isNilOrBlank(this.filter?.entityName)) throw new Error('Missing \'entityName\' or \'filter.entityName\'');

    super.ngOnInit();

  }

  protected async computeTitle(): Promise<string> {
    return 'REFERENTIAL.ENTITY.' + changeCaseToUnderscore(this.filter.entityName).toUpperCase();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

}
