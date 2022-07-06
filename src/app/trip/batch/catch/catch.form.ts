import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MeasurementsValidatorService } from '../../services/validator/measurement.validator';
import { MeasurementValuesForm } from '../../measurement/measurement-values.form.class';
import { BehaviorSubject } from 'rxjs';
import { BatchValidatorService } from '../common/batch.validator';
import { isNotNil, ReferentialUtils, toBoolean } from '@sumaris-net/ngx-components';
import { Batch } from '../common/batch.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { filter } from 'rxjs/operators';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { MatrixIds, PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmFilter } from '@app/referential/services/filter/pmfm.filter';
import { equals } from '@app/shared/functions';

@Component({
  selector: 'form-catch-batch',
  templateUrl: './catch.form.html',
  styleUrls: ['./catch.form.scss'],
  providers: [
    {provide: BatchValidatorService, useClass: BatchValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatchBatchForm extends MeasurementValuesForm<Batch> implements OnInit {

  private _pmfmFilter: Partial<DenormalizedPmfmFilter> = null;

  $gearPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $onDeckPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $sortingPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $weightPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $otherPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  hasPmfms: boolean;

  @Input() showError = true;

  @Input() set pmfmFilter(value: Partial<DenormalizedPmfmFilter>) {
    if (!equals(value, this._pmfmFilter)) {
      this._pmfmFilter = value;
      if (!this.loading) this.dispatchPmfms();
    }
  }

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

    // Dispatch pmfms by type
    this.registerSubscription(
      this.$pmfms
        .pipe(filter(isNotNil))
        .subscribe(pmfms => this.dispatchPmfms(pmfms))
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.$gearPmfms.complete();
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


  setFilter(dataFilter: BatchFilter) {

    // DEBUG
    if (this.debug) console.debug('[catch-form] Applying filter: ', dataFilter);

    const fractionIdByMatrixId = {};
    const gearPositionQv = dataFilter?.measurementValues && dataFilter.measurementValues[PmfmIds.BATCH_GEAR_POSITION];
    const gearPositionQvId = ReferentialUtils.isNotEmpty(gearPositionQv) ? gearPositionQv.id : gearPositionQv;
    if (isNotNil(gearPositionQvId)) {
      switch (+gearPositionQvId) {
        // Bâbord
        case QualitativeValueIds.BATCH_GEAR_POSITION.PORT:
          fractionIdByMatrixId[MatrixIds.GEAR] = 93;  // Matrix=Engin => Fraction=PORT
          fractionIdByMatrixId[MatrixIds.BATCH] = 95; // Matrix=Batch => Fraction=PORT
          break;

        // Tribord
        case QualitativeValueIds.BATCH_GEAR_POSITION.STARBOARD:
          fractionIdByMatrixId[MatrixIds.GEAR] = 94;
          fractionIdByMatrixId[MatrixIds.BATCH] = 96;
          break;
      }
    }

    this.pmfmFilter = {fractionIdByMatrixId};
  }

  /**
   * Use in ngFor, for trackBy
   * @param index
   * @param pmfm
   */
  trackPmfmFn(index: number, pmfm: IPmfm): any {
    return `${pmfm.id}-${pmfm.hidden}`;
  }

  /* -- protected functions -- */

  protected getValue(): Batch {
    const batch = super.getValue();
    return batch;
  }

  // @ts-ignore
  protected dispatchPmfms(pmfms?: IPmfm[]) {
    pmfms = pmfms || this.$pmfms.value;
    if (!pmfms) return; // Skip

    // DEBUG
    //console.debug('[catch-form] Dispatch pmfms by form', pmfms);

    // Filter pmfm
    if (this._pmfmFilter) {
      const filterFn = DenormalizedPmfmFilter.fromObject(this._pmfmFilter).asFilterFn();
      pmfms = pmfms.map(p => {
        const hidden = PmfmUtils.isDenormalizedPmfm(p) && !filterFn(p);
        if (toBoolean(p.hidden, false) !== hidden) {
          p = p.clone();
          p.hidden = hidden;
        }
        return p;
      });
    }

    this.$onDeckPmfms.next(pmfms.filter(p => p.label?.indexOf('ON_DECK_') === 0));
    this.$sortingPmfms.next(pmfms.filter(p => p.label?.indexOf('SORTING_') === 0));
    this.$weightPmfms.next(pmfms.filter(p => PmfmUtils.isWeight(p)
      && !this.$onDeckPmfms.value.includes(p)
      && !this.$sortingPmfms.value.includes(p)));
    this.$gearPmfms.next(pmfms.filter(p => p.matrixId === MatrixIds.GEAR));

    this.$otherPmfms.next(pmfms.filter(p => !this.$onDeckPmfms.value.includes(p)
      && !this.$sortingPmfms.value.includes(p)
      && !this.$weightPmfms.value.includes(p)
      && !this.$gearPmfms.value.includes(p)));

    this.hasPmfms = pmfms.length > 0;
    this.markForCheck();
  }
}



