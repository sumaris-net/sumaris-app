import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { Property } from '@sumaris-net/ngx-components';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';


@Component({
  selector: 'app-sampling-ratio-test',
  templateUrl: './sampling-ratio.test.html'
})
export class AppSamplingRatioTestPage implements OnInit {

  form: FormGroup;
  format: SamplingRatioFormat = '%';
  maxDecimals: number = 6;
  formats = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_TYPE.values as Property[];

  constructor(
    protected formBuilder: FormBuilder
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

