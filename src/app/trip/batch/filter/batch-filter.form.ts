import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnInit, Output, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AppForm, firstArrayValue } from '@sumaris-net/ngx-components';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { tap } from 'rxjs/operators';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { MatTabNav } from '@angular/material/tabs';


@Component({
  selector: 'app-batch-filter-form',
  templateUrl: './batch-filter.form.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchFilterForm extends AppForm<BatchFilter> implements OnInit, AfterViewInit {

  protected _pmfms: IPmfm[];

  @Input() debounceTime = 0;

  @Input() set pmfms(value: IPmfm[]) {
    this.setPmfms(value);
  }

  get pmfms() {
    return this._pmfms;
  }

  @Output() valueChanges = new EventEmitter<BatchFilter>();

  @ViewChildren('navBar') navBars : QueryList<MatTabNav>;

  constructor(injector: Injector,
              protected formBuilder: FormBuilder,
              protected cd: ChangeDetectorRef
  ) {
    super(injector, formBuilder.group({
      measurementValues: formBuilder.group({})
    }));
  }


  ngOnInit() {
    this.enable();
    this.markAsReady();
  }

  ngAfterViewInit() {
    this.registerSubscription(
      this.form.valueChanges
        .pipe(
          //map(BatchFilter.fromObject),
          // DEBUG
          tap(value => console.debug('[batch-filter] Filter change to:', value))
        )
        .subscribe(value => this.valueChanges.emit(value))
    );
  }

  applyPmfmValue(pmfm: IPmfm, value: any) {
    const control = this.form.get(`measurementValues.${pmfm.id}`);
    control.patchValue(PmfmValueUtils.toModelValue(value, pmfm));
  }

  /**
   * Use in ngFor, for trackBy
   * @param index
   * @param pmfm
   */
  trackPmfmFn(index: number, pmfm: IPmfm): any {
    return pmfm.id;
  }

  setPmfms(pmfms?: IPmfm[]) {

    const measurementValuesForm = this.form.get('measurementValues') as FormGroup;

    // Remove previous controls
    const existingControlKeys = Object.keys(measurementValuesForm.controls);

    (pmfms || []).forEach(pmfm => {
      const key = pmfm.id.toString();
      let control = measurementValuesForm.get(key);
      if (!control) {
        control = this.formBuilder.control(null);
        measurementValuesForm.addControl(key, control);

        if (pmfm.type === 'qualitative_value') {
          const value = firstArrayValue(pmfm.qualitativeValues);
          this.applyPmfmValue(pmfm, value);
        }
      }
      else {
        existingControlKeys.splice(existingControlKeys.indexOf(key), 1);
      }
    });

    // Remove unused
    existingControlKeys.forEach(measurementValuesForm.removeControl);

    this._pmfms = pmfms;
    this.cd.detectChanges();

  }

  realignInkBar() {
    this.navBars.forEach(tab => tab._alignInkBarToSelectedTab());
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
