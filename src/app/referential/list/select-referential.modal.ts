import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { changeCaseToUnderscore, ReferentialRef } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '../services/referential-ref.service';
import { BaseSelectEntityModal, IBaseSelectEntityModalOptions } from './base-select-entity.modal';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';

export interface ISelectReferentialModalOptions extends Partial<IBaseSelectEntityModalOptions<ReferentialRef, ReferentialRefFilter>> {
  filter: Partial<ReferentialRefFilter>;
}

@Component({
  selector: 'app-select-referential-modal',
  templateUrl: './select-referential.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectReferentialModal extends BaseSelectEntityModal<ReferentialRef, ReferentialRefFilter>
  implements OnInit, ISelectReferentialModalOptions {

  constructor(
    protected viewCtrl: ModalController,
    protected dataService: ReferentialRefService,
    protected cd: ChangeDetectorRef
  ) {
    super(viewCtrl, ReferentialRef, dataService);
  }

  ngOnInit() {
    this.filter = ReferentialRefFilter.fromObject(this.filter);

    super.ngOnInit();

    // Copy the entityName to filter
    if (this.entityName) {
      this.filter.entityName = this.entityName;
    }
    if (!this.filter.entityName) {
      throw new Error('Missing entityName');
    }
  }

  protected async computeTitle(): Promise<string> {
    return 'REFERENTIAL.ENTITY.' + changeCaseToUnderscore(this.filter.entityName).toUpperCase();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
