import { ChangeDetectionStrategy, Component, forwardRef, Injector, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { MeasurementsValidatorService } from '../../services/validator/measurement.validator';
import { BatchValidatorService } from '../common/batch.validator';
import { isNotEmptyArray } from '@sumaris-net/ngx-components';
import { Batch } from '../common/batch.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import {AcquisitionLevelCodes, MatrixIds, PmfmIds} from '@app/referential/services/model/model.enum';
import { BatchForm, BatchFormState } from '@app/trip/batch/common/batch.form';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { environment } from '@environments/environment';
import { combineLatest, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CatchBatchFormState extends BatchFormState {
  gearPmfms: IPmfm[];
  onDeckPmfms: IPmfm[];
  sortingPmfms: IPmfm[];
  catchPmfms: IPmfm[];
  otherPmfms: IPmfm[];
  gridColCount: number;
}

@Component({
  selector: 'form-catch-batch',
  templateUrl: './catch.form.html',
  styleUrls: ['./catch.form.scss'],
  providers: [
    { provide: BatchValidatorService, useClass: BatchValidatorService},
    { provide: BatchForm, useExisting: forwardRef(() => CatchBatchForm)},
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatchBatchForm extends BatchForm<Batch, CatchBatchFormState>
  implements OnInit {

  readonly gearPmfms$ = this._state.select('gearPmfms');
  readonly onDeckPmfms$ = this._state.select('onDeckPmfms');
  readonly sortingPmfms$ = this._state.select('sortingPmfms');
  readonly catchPmfms$ = this._state.select('catchPmfms');
  readonly otherPmfms$ = this._state.select('otherPmfms');
  readonly gridColCount$ = this._state.select('gridColCount');
  readonly catchPmfmsRendered = new Subject<IPmfm[]>();

  @Input() labelColSize = 1;

  constructor(
    injector: Injector,
    measurementsValidatorService: MeasurementsValidatorService,
    formBuilder: UntypedFormBuilder,
    programRefService: ProgramRefService,
    referentialRefService: ReferentialRefService,
    validatorService: BatchValidatorService
  ) {
    super(injector,
      measurementsValidatorService,
      formBuilder,
      programRefService,
      referentialRefService,
      validatorService);
    // Set defaults
    this.acquisitionLevel = AcquisitionLevelCodes.CATCH_BATCH;
    this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
    this.showTaxonGroup = false;
    this.showTaxonName = false;
    //this.samplingBatchEnabled = false;

    // DEBUG
    this.debug = !environment.production;
  }

  /* -- protected functions -- */

  // @ts-ignore
  protected async dispatchPmfms(pmfms: IPmfm[]): Promise<Partial<S>> {

    if (!pmfms) return; // Skip

    // If a catch batch
    if (this.acquisitionLevel === AcquisitionLevelCodes.CATCH_BATCH) {

      const { weightPmfms, defaultWeightPmfm, weightPmfmsByMethod } = await super.dispatchPmfms(pmfms);

      const onDeckPmfms = pmfms.filter(p => p.label?.indexOf('ON_DECK_') === 0);
      const sortingPmfms = pmfms.filter(p => p.label?.indexOf('SORTING_') === 0);
      const catchPmfms = pmfms.filter(p => (PmfmUtils.isWeight(p) || p.label?.indexOf('_WEIGHT') !== -1)
        && !onDeckPmfms.includes(p)
        && !sortingPmfms.includes(p));
      const gearPmfms = pmfms.filter(p => p.matrixId === MatrixIds.GEAR || p.id === PmfmIds.CHILD_GEAR);

      // Compute grid column count
      const gridColCount = this.labelColSize /*label*/
        + Math.min(3, Math.max(
          onDeckPmfms.length,
          sortingPmfms.length,
          catchPmfms.length,
          gearPmfms.length
        ));

      const otherPmfms = pmfms.filter(p => !onDeckPmfms.includes(p)
        && !sortingPmfms.includes(p)
        && !catchPmfms.includes(p)
        && !gearPmfms.includes(p));

      // Update state
      return {
        weightPmfms,
        defaultWeightPmfm,
        weightPmfmsByMethod,
        onDeckPmfms,
        sortingPmfms,
        catchPmfms,
        gearPmfms,
        otherPmfms,
        pmfms: [],
        hasContent: pmfms.length > 0,
        gridColCount,
        showWeight: false,
        showIndividualCount: false,
        showSamplingBatch: false,
        samplingBatchEnabled: false,
        showEstimatedWeight: false,
        showExhaustiveInventory: false
      };
    }

    // When using inside a batch tree (.e.g need by APASE)
    else {
      const state = await super.dispatchPmfms(pmfms);

      // Reset some attributes, to keep value from @Input()
      delete state.samplingBatchEnabled;
      delete state.showSamplingBatch;

      return {
        ...state,
        onDeckPmfms: [],
        sortingPmfms: [],
        catchPmfms: [],
        gearPmfms: [],
        otherPmfms: [],
        gridColCount: 12,
        showWeight: isNotEmptyArray(state.weightPmfms)
      };
    }

  }

  protected listenHasContent(): Observable<boolean> {
    return combineLatest([
      super.listenHasContent(),
      this._state.select('showExhaustiveInventory'),
      this._state.select(['onDeckPmfms', 'sortingPmfms', 'catchPmfms', 'gearPmfms', 'otherPmfms'],
          pmfmsMap => Object.values(pmfmsMap).some(isNotEmptyArray)
      )
      // DEBUG
      //.pipe(tap(hasPmfms => console.debug(this._logPrefix + ' listenHasContent() - hasPmfms=' + hasPmfms)))
    ])
    .pipe(map(values => values.some(v => v === true)));
  }

  markAsPristine(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsPristine(opts);
  }

  markAsUntouched(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsUntouched(opts);
  }

  markAsDirty(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsDirty(opts);
  }
}



