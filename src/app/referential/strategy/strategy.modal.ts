import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppForm, DateUtils, fromDateISOString, isNotNilOrBlank } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';

@Component({
  selector: 'app-strategy-modal',
  templateUrl: './strategy.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategyModal extends AppForm<{ year: Moment }> implements OnInit {
  @Input() mobile: boolean;
  @Input() year: number;

  constructor(injector: Injector, protected formBuilder: UntypedFormBuilder, protected viewCtrl: ModalController, protected cd: ChangeDetectorRef) {
    super(
      injector,
      formBuilder.group({
        year: [null, Validators.required],
      })
    );
    this.mobile = this.settings.mobile;
  }

  ngOnInit() {
    super.ngOnInit();
    if (isNotNilOrBlank(this.year)) {
      this.form.get('year').setValue(DateUtils.moment().year(this.year));
    } else {
      this.form.get('year').setValue(DateUtils.moment());
    }
    this.form.enable();
  }

  protected async computeTitle(): Promise<string> {
    return 'REFERENTIAL.ENTITY.DUPLICATE_STRATEGY';
  }

  async cancel() {
    await this.viewCtrl.dismiss();
  }

  async doSubmit() {
    const date = this.form.get('year').value;

    if (!date) return; // Invalid

    const year = fromDateISOString(date)
      // We need the local year, not the UTC year
      .local(true)
      .format('YYYY')
      .toString();

    await this.viewCtrl.dismiss(+year);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
