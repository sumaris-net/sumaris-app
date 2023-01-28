import { Component, Input, OnInit, Optional } from '@angular/core';
import { BatchForm } from '@app/trip/batch/common/batch.form';
import { AppFormUtils, toBoolean } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-batch-form-content',
  templateUrl: './batch.form.content.html',
  styleUrls: ['./batch.form.content.scss'],

  // Do not enable this, because fields with a computed class will not be refreshed well
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchFormContent implements OnInit {

  @Input() delegate: BatchForm<any>;
  @Input() debug: boolean;
  @Input() showError: boolean;

  constructor(
    @Optional() delegate?: BatchForm<any>
  ) {
    this.delegate = delegate;
  }

  ngOnInit() {
    this.debug = toBoolean(this.debug, this.delegate?.debug || !environment.production);
    this.showError = toBoolean(this.showError, this.delegate?.showError);
  }

  selectInputContent = AppFormUtils.selectInputContent;
}
