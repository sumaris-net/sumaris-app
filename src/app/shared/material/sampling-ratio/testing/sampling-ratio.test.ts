import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { Property } from '@sumaris-net/ngx-components';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { FloatLabelType } from '@angular/material/form-field';


@Component({
  selector: 'app-sampling-ratio-test',
  templateUrl: './sampling-ratio.test.html'
})
export class AppSamplingRatioTestPage implements OnInit {

  form: UntypedFormGroup;
  maxDecimals: number = 6;
  format: SamplingRatioFormat = '%';
  formats = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.values as Property[];
  floatLabel: FloatLabelType;
  floatLabels = ['never', 'auto', 'always']


  constructor(
    protected formBuilder: UntypedFormBuilder
  ) {
    this.form = formBuilder.group({
      empty: [null, Validators.required],
      enable: [0.15],
      disable: [0.15]
    });

    this.form.get('disable').disable();

    // Copy enable value to disable form
    this.form.get('enable').valueChanges
      .subscribe(value => this.form.get('disable').setValue(value));
  }

  ngOnInit() {

    setTimeout(() => this.loadData(), 250);
  }

  setFormat(type: SamplingRatioFormat) {
    this.format = type;
    this.refresh();
  }

  setMaxDecimals(maxDecimals: number) {
    this.maxDecimals = maxDecimals;
    this.refresh();
  }

  setFloatLabel(type: FloatLabelType) {
    this.floatLabel = type;
    this.refresh();
  }

  reload = true;

  refresh() {
    this.reload = false;
    setTimeout(() => {
      this.reload = true;
    }, 100);
  }

  // Load the form with data
  async loadData() {
    const data = {
      empty: null,
      enable: 0.15, // 15%
      disable: 0.15,
    };

    this.form.setValue(data);
  }

  doSubmit(event) {
    console.debug('Validate form: ', this.form.value);
  }

  /* -- protected methods -- */

}

