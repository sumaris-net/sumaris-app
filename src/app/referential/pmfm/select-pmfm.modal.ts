import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from "@angular/core";
import {ModalController} from "@ionic/angular";
import {PmfmService} from "../services/pmfm.service";
import {Pmfm} from "../services/model/pmfm.model";
import {BaseSelectEntityModal} from "../list/base-select-entity.modal";
import { PmfmFilter } from "@app/referential/services/filter/pmfm.filter";

@Component({
  selector: 'app-select-pmfm-modal',
  templateUrl: './select-pmfm.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectPmfmModal extends BaseSelectEntityModal<Pmfm, PmfmFilter> implements OnInit {

  constructor(
      protected viewCtrl: ModalController,
      protected pmfmService: PmfmService,
      protected cd: ChangeDetectorRef,
  ) {
    super(viewCtrl, Pmfm, pmfmService, {
      dataServiceOptions: {
        withDetails: true // Force to use PmfmFragment
      }
    });
  }

  protected async computeTitle(): Promise<string> {
    return "REFERENTIAL.ENTITY.PMFM";
  }

}
