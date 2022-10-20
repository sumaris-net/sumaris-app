import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, Optional } from '@angular/core';
import { BatchForm } from '@app/trip/batch/common/batch.form';

@Component({
  selector: 'app-batch-form-content',
  templateUrl: './batch.form.content.html',
  styleUrls: ['./batch.form.content.scss'],

  // Do not enable this, because fields with a computed class will not be refreshed well
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchFormContent {

  @Input() delegate: BatchForm<any>;

  constructor(
    @Optional() delegate?: BatchForm<any>
  ) {
    this.delegate = delegate;
  }
}
