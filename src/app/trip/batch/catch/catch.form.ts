import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MeasurementsValidatorService } from '../../services/validator/measurement.validator';
import { MeasurementFormInitSteps, MeasurementValuesForm } from '../../measurement/measurement-values.form.class';
import { BehaviorSubject } from 'rxjs';
import { BatchValidatorService } from '../common/batch.validator';
import { firstNotNilPromise, isNotEmptyArray, isNotNil, ReferentialRef, ReferentialUtils } from '@sumaris-net/ngx-components';
import { Batch } from '../common/batch.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { filter } from 'rxjs/operators';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { MatrixIds, PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmFilter } from '@app/referential/services/filter/pmfm.filter';
import { equals } from '@app/shared/functions';
import { PhysicalGearService } from '@app/trip/physicalgear/physicalgear.service';

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

  private _filter: BatchFilter;
  private _pmfmFilter: Partial<DenormalizedPmfmFilter> = null;
  private _$physicalGearId = new BehaviorSubject<number>(undefined);

  $gearPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $onDeckPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $sortingPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $weightPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  $otherPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  hasPmfms: boolean;

  @Input() showError = true;

  @Input() set filter(value: BatchFilter) {
    this.setFilter(value);
  }

  get filter() {
    return this._filter;
  }

  @Input() set pmfmFilter(value: Partial<DenormalizedPmfmFilter>) {
    if (!equals(value, this._pmfmFilter)) {
      this._pmfmFilter = value;
      if (!this.loading) this.dispatchPmfms();
    }
  }

  @Input() set physicalGearId(value: number) {
    this._$physicalGearId.next(value);
  }

  constructor(
    injector: Injector,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected formBuilder: FormBuilder,
    protected programRefService: ProgramRefService,
    protected validatorService: BatchValidatorService,
    protected physicalGearService: PhysicalGearService
  ) {

    super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(), {
      mapPmfms: (pmfms) => this.mapPmfms(pmfms)
    });
    this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
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
    this._$physicalGearId.unsubscribe();
    this.$gearPmfms.unsubscribe();
    this.$onDeckPmfms.unsubscribe();
    this.$sortingPmfms.unsubscribe();
    this.$weightPmfms.unsubscribe();
    this.$otherPmfms.unsubscribe();
  }

  onApplyingEntity(data: Batch, opts?: any) {
     super.onApplyingEntity(data, opts);

    if (!data) return; // Skip

    // Force the label
    data.label = this._acquisitionLevel;
  }


  setFilter(dataFilter: BatchFilter) {

    this._filter = dataFilter;
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

  markAsReady(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    // Start loading pmfms
    if (this.starting) {
      this.setLoadingProgression(MeasurementFormInitSteps.LOADING_PMFMS);
      this.loadPmfms();
    }

    // Make sure pmfms have been dispatched before markAsReady()
    if (!this.$otherPmfms.value) {
      firstNotNilPromise(this.$otherPmfms)
        .then(() => super.markAsReady(opts));
    }
    else {
      super.markAsReady(opts);
    }
  }

  /* -- protected functions -- */

  protected async mapPmfms(pmfms: IPmfm[]): Promise<IPmfm[]> {

    // Apply filter
    const pmfmFilterFn = DenormalizedPmfmFilter.fromObject(this._pmfmFilter)?.asFilterFn();
    if (pmfmFilterFn) {
      pmfms = pmfms.filter(pmfmFilterFn);
    }

    // Fill CHILD_GEAR_xxx pmfms
    const childGearPmfmIndexes = pmfms
      .map((p, index) => p.label?.indexOf('CHILD_GEAR') === 0 ? index : undefined)
      .filter(isNotNil);
    if (isNotEmptyArray(childGearPmfmIndexes)) {

      // DEBUG
      console.debug('[catch-form] Waiting children physical gears...');
      let now = Date.now();
      const physicalGearId = await firstNotNilPromise(this._$physicalGearId);

      // Load children gears
      const { data } = await this.physicalGearService.loadAllByParentId(physicalGearId, { toEntity: false, withTotal: false });

      // Convert to referential item
      const items = data.map(pg => ReferentialRef.fromObject({
        id: pg.rankOrder,
        label: pg.rankOrder,
        name: pg.measurementValues[PmfmIds.GEAR_LABEL]
      }));

      if (now) console.debug(`[catch-form] Waiting children physical gears [OK] after ${Date.now() - now}ms`, items);

      childGearPmfmIndexes.forEach(index => {
        pmfms[index] = pmfms[index].clone();
        pmfms[index].qualitativeValues = items;
      });
    }

    return pmfms;
  }

  // @ts-ignore
  protected async dispatchPmfms(pmfms?: IPmfm[]) {
    pmfms = pmfms || this.$pmfms.value;
    if (!pmfms) return; // Skip

    // DEBUG
    console.debug('[catch-form] Dispatching pmfms...');

    this.$onDeckPmfms.next(pmfms.filter(p => p.label?.indexOf('ON_DECK_') === 0));
    this.$sortingPmfms.next(pmfms.filter(p => p.label?.indexOf('SORTING_') === 0));
    this.$weightPmfms.next(pmfms.filter(p => (PmfmUtils.isWeight(p) || p.label?.indexOf('_WEIGHT') !== -1)
      && !this.$onDeckPmfms.value.includes(p)
      && !this.$sortingPmfms.value.includes(p)));

    this.$gearPmfms.next(pmfms.filter(p => p.matrixId === MatrixIds.GEAR || p.label?.indexOf('CHILD_GEAR') === 0));
    this.$otherPmfms.next(pmfms.filter(p => !this.$onDeckPmfms.value.includes(p)
      && !this.$sortingPmfms.value.includes(p)
      && !this.$weightPmfms.value.includes(p)
      && !this.$gearPmfms.value.includes(p)));

    this.hasPmfms = pmfms.length > 0;
    this.markForCheck();
  }
}



