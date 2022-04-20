import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MeasurementsValidatorService } from '../../services/validator/measurement.validator';
import { MeasurementValuesForm } from '../../measurement/measurement-values.form.class';
import { BehaviorSubject } from 'rxjs';
import { BatchValidatorService } from '../common/batch.validator';
import { isNotNil } from '@sumaris-net/ngx-components';
import { Batch } from '../common/batch.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'form-catch-batch',
  templateUrl: './catch.form.html',
  styleUrls: ['./catch.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatchBatchForm extends MeasurementValuesForm<Batch> implements OnInit {

  $onDeckPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $sortingPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $weightPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $otherPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  hasPmfms: boolean;

  @Input() showError = true;

   constructor(
    injector: Injector,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected formBuilder: FormBuilder,
    protected programRefService: ProgramRefService,
    protected validatorService: BatchValidatorService
  ) {

    super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup());
  }

  ngOnInit() {
    super.ngOnInit();

    // Dispatch pmfms by category, using label
    this.registerSubscription(
      this.$pmfms
        .pipe(filter(isNotNil))
        .subscribe(pmfms => {
          // DEBUG
          //console.debug('[catch-form] Dispatch pmfms by form', pmfms);

          this.$onDeckPmfms.next(pmfms.filter(p => p.label?.indexOf('ON_DECK_') === 0));
          this.$sortingPmfms.next(pmfms.filter(p => p.label?.indexOf('SORTING_') === 0));
          this.$weightPmfms.next(pmfms.filter(p => PmfmUtils.isWeight(p)
            && !this.$onDeckPmfms.value.includes(p)
            && !this.$sortingPmfms.value.includes(p)));

          this.$otherPmfms.next(pmfms.filter(p => !this.$onDeckPmfms.value.includes(p)
            && !this.$sortingPmfms.value.includes(p)
            && !this.$weightPmfms.value.includes(p)));

          this.hasPmfms = pmfms.length > 0;
          this.markForCheck();
        })
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.$onDeckPmfms.complete();
    this.$sortingPmfms.complete();
    this.$weightPmfms.complete();
    this.$otherPmfms.complete();
  }

  onApplyingEntity(data: Batch, opts?: any) {
     super.onApplyingEntity(data, opts);

    if (!data) return; // Skip

    // Force the label
     data.label = this._acquisitionLevel;
  }

  protected getValue(): Batch {
    const batch = super.getValue();
    return batch;
  }
}



