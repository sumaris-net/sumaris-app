import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppForm } from '@sumaris-net/ngx-components';
import moment, { Moment } from 'moment';

@Component({
  selector: 'app-strategy-modal',
  templateUrl: './strategy.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StrategyModal extends AppForm<{year: Moment}> implements OnInit {

  constructor(
    injector: Injector,
    protected formBuilder: UntypedFormBuilder,
    protected viewCtrl: ModalController,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, formBuilder.group({
      year: [null, Validators.required]
    }));
  }

  ngOnInit() {
    super.ngOnInit();
    this.form.get('year').setValue(moment());
    this.form.enable();
  }

  protected async computeTitle(): Promise<string> {
    return "REFERENTIAL.ENTITY.DUPLICATE_STRATEGY";
  }

  async cancel() {
    await this.viewCtrl.dismiss();
  }

  async validDate() {
    await this.viewCtrl.dismiss(this.form.get('year').value);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
