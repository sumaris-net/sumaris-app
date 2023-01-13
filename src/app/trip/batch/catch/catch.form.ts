import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { MeasurementsValidatorService } from '../../services/validator/measurement.validator';
import { PmfmFormReadySteps } from '../../measurement/measurement-values.form.class';
import { BehaviorSubject } from 'rxjs';
import { BatchValidatorService } from '../common/batch.validator';
import { isNotNil, toNumber } from '@sumaris-net/ngx-components';
import { Batch } from '../common/batch.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { filter } from 'rxjs/operators';
import { MatrixIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmFilter } from '@app/referential/services/filter/pmfm.filter';
import { equals } from '@app/shared/functions';
import { BatchForm, IBatchForm } from '@app/trip/batch/common/batch.form';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';

@Component({
  selector: 'form-catch-batch',
  templateUrl: './catch.form.html',
  styleUrls: ['./catch.form.scss'],
  providers: [
    {provide: BatchValidatorService, useClass: BatchValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatchBatchForm extends BatchForm<Batch>
  implements OnInit, IBatchForm<Batch> {

  private _pmfmFilter: Partial<DenormalizedPmfmFilter> = null;

  $gearPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $onDeckPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $sortingPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $weightPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $otherPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  labelColSize = 1;
  gridColCount = 12;
  hasPmfms: boolean;

  @Input() mobile: boolean;
  @Input() showError = true;


  @Input() showSampleWeight = false;
  @Input() maxVisibleButtons: number;
  @Input() maxItemCountForButtons: number;
  @Input() samplingRatioFormat: SamplingRatioFormat = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;

  @Input() set pmfmFilter(value: Partial<DenormalizedPmfmFilter>) {
    if (!equals(value, this._pmfmFilter)) {
      this._pmfmFilter = value;
      if (!this.loading) this.dispatchPmfms(this.pmfms);
    }
  }

  constructor(
    injector: Injector,
    measurementsValidatorService: MeasurementsValidatorService,
    formBuilder: UntypedFormBuilder,
    programRefService: ProgramRefService,
    validatorService: BatchValidatorService,
    referentialRefService: ReferentialRefService
  ) {
    super(injector,
      measurementsValidatorService,
      formBuilder,
      programRefService,
      validatorService,
      referentialRefService,
      {}/*validator options*/);
    this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';

  }

  ngOnInit() {
    super.ngOnInit();

    // Dispatch pmfms by type
    this.registerSubscription(
      this.pmfms$
        .subscribe(pmfms => this.dispatchPmfms(pmfms))
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.$gearPmfms.unsubscribe();
    this.$onDeckPmfms.unsubscribe();
    this.$sortingPmfms.unsubscribe();
    this.$weightPmfms.unsubscribe();
    this.$otherPmfms.unsubscribe();
  }

  onApplyingEntity(data: Batch, opts?: any) {
     super.onApplyingEntity(data, opts);

    if (!data) return; // Skip

    // Init default
    data.label = data.label || this.acquisitionLevel;
    data.rankOrder = toNumber(data.rankOrder, 0);
  }

  /**
   * Use in ngFor, for trackBy
   * @param index
   * @param pmfm
   */
  trackPmfmFn(index: number, pmfm: IPmfm): any {
    return `${pmfm.id}-${pmfm.hidden}-${pmfm.required}`;
  }

  markAsReady(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    // Start loading pmfms
    if (this.starting) {
      this.setReadyStep(PmfmFormReadySteps.LOADING_PMFMS);
      this.loadPmfms();
    }

    // Make sure pmfms have been dispatched before markAsReady()
    {
      const otherSubscription = this.$otherPmfms
        .pipe(filter(isNotNil))
        .subscribe(_ => super.markAsReady(opts));
      otherSubscription.add(() => this.unregisterSubscription(otherSubscription))
      this.registerSubscription(otherSubscription);
    }
  }

  /* -- protected functions -- */

  protected mapPmfms(pmfms: IPmfm[]): IPmfm[] {

    // Apply filter
    const pmfmFilterFn = DenormalizedPmfmFilter.fromObject(this._pmfmFilter)?.asFilterFn();
    if (pmfmFilterFn) {
      pmfms = pmfms.filter(pmfmFilterFn);
    }

    return pmfms;
  }

  // @ts-ignore
  protected async dispatchPmfms(pmfms: IPmfm[]) {
    if (!pmfms) return; // Skip

    // DEBUG
    console.debug('[catch-form] Dispatching pmfms...');

    this.$onDeckPmfms.next(pmfms.filter(p => p.label?.indexOf('ON_DECK_') === 0));
    this.$sortingPmfms.next(pmfms.filter(p => p.label?.indexOf('SORTING_') === 0));
    this.$weightPmfms.next(pmfms.filter(p => (PmfmUtils.isWeight(p) || p.label?.indexOf('_WEIGHT') !== -1)
      && !this.$onDeckPmfms.value.includes(p)
      && !this.$sortingPmfms.value.includes(p)));

    this.$gearPmfms.next(pmfms.filter(p => p.matrixId === MatrixIds.GEAR || p.label?.indexOf('CHILD_GEAR') === 0));

    // Compute grid column count
    this.gridColCount = this.labelColSize /*label*/
      + Math.min(3, Math.max(
        this.$onDeckPmfms.value.length,
        this.$sortingPmfms.value.length,
        this.$weightPmfms.value.length,
        this.$gearPmfms.value.length
      ));

    this.$otherPmfms.next(pmfms.filter(p => !this.$onDeckPmfms.value.includes(p)
      && !this.$sortingPmfms.value.includes(p)
      && !this.$weightPmfms.value.includes(p)
      && !this.$gearPmfms.value.includes(p)));


    this.hasPmfms = pmfms.length > 0;
    this.markForCheck();
  }
}



