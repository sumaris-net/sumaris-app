import { Component, Input, Optional, TemplateRef, ViewChild } from '@angular/core';
import { BatchForm } from '@app/trip/batch/common/batch.form';

@Component({
  selector: 'app-batch-form-content',
  templateUrl: './batch.form.content.html',
  styleUrls: ['./batch.form.content.scss']
})
export class BatchFormContent {

  @Input() parent: BatchForm;

  constructor(
    @Optional() parent?: BatchForm
  ) {
    this.registerParent(parent);
  }

  registerParent(parent: any) {
    if (this.parent === parent) return; // Skip if same

    this.parent = parent instanceof BatchForm ? parent as BatchForm : null;
  }
}
