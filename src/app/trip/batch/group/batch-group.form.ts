import { ChangeDetectionStrategy, Component, forwardRef, Injector, Input, QueryList, ViewChildren } from '@angular/core';
import { Batch} from '../common/batch.model';
import { AbstractControl, FormBuilder, FormControl } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { AppFormUtils, InputElement, isNil, isNotNil, PlatformService, ReferentialUtils, toBoolean } from '@sumaris-net/ngx-components';
import { BatchGroupValidatorService } from './batch-group.validator';
import { BehaviorSubject, Observable } from 'rxjs';
import { BatchForm } from '../common/batch.form';
import { filter } from 'rxjs/operators';
import { BatchGroup, BatchGroupUtils } from './batch-group.model';
import { MeasurementsValidatorService } from '../../services/validator/measurement.validator';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { BatchValidatorService } from '@app/trip/batch/common/batch.validator';

@Component({
  selector: 'app-batch-group-form',
  templateUrl: 'batch-group.form.html',
  styleUrls: ['batch-group.form.scss'],
  providers: [
    { provide: BatchGroupValidatorService, useClass: BatchGroupValidatorService},
    { provide: BatchValidatorService, useClass: BatchValidatorService},
    { provide: BatchForm, useExisting: forwardRef(() => BatchGroupForm)},
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchGroupForm extends BatchForm<BatchGroup> {

  $childrenPmfmsByQvId = new BehaviorSubject<{[key: number]: IPmfm[]}>(undefined);
  hasSubBatchesControl: AbstractControl;

  @Input() qvPmfm: IPmfm;
  @Input() childrenPmfms: IPmfm[];
  @Input() taxonGroupsNoWeight: string[];
  @Input() showChildrenWeight = true;
  @Input() showChildrenIndividualCount = false;
  @Input() showChildrenSamplingBatch = true;
  @Input() allowSubBatches = true;
  @Input() defaultHasSubBatches = false;
  @Input() showHasSubBatchesButton = true;

  @ViewChildren('firstInput') firstInputFields !: QueryList<InputElement>;
  @ViewChildren('childForm') childrenList !: QueryList<BatchForm>;


  get invalid(): boolean {
    return this.form.invalid || this.hasSubBatchesControl.invalid ||
      ((this.childrenList || []).find(child => child.invalid) && true) || false;
  }

  get valid(): boolean {
    // Important: Should be not invalid AND not pending, so use '!valid' (and NOT 'invalid')
    return this.form.valid && this.hasSubBatchesControl.valid &&
      (!this.childrenList || !this.childrenList.find(child => !child.valid)) || false;
  }

  get pending(): boolean {
    return this.form.pending || this.hasSubBatchesControl.pending ||
      (this.childrenList && this.childrenList.find(child => child.pending) && true) || false;
  }

  get loading(): boolean {
    return super.loading || (this.childrenList && this.childrenList.find(child => child.loading) && true) || false;
  }

  get dirty(): boolean {
    return this.form.dirty || this.hasSubBatchesControl.dirty ||
      (this.childrenList && this.childrenList.find(child => child.dirty) && true) || false;
  }

  markAllAsTouched(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    super.markAllAsTouched(opts);
    this.childrenList?.forEach(f => f.markAllAsTouched(opts));
    this.hasSubBatchesControl.markAsTouched(opts);
  }

  markAsPristine(opts?: { onlySelf?: boolean; }) {
    super.markAsPristine(opts);
    (this.childrenList || []).forEach(child => child.markAsPristine(opts));
    this.hasSubBatchesControl.markAsPristine(opts);
  }

  markAsUntouched(opts?: { onlySelf?: boolean; }) {
    super.markAsUntouched(opts);
    (this.childrenList || []).forEach(child => child.markAsUntouched(opts));
    this.hasSubBatchesControl.markAsUntouched(opts);
  }

  markAsDirty(opts?: {
    onlySelf?: boolean;
  }) {
    super.markAsDirty(opts);
    (this.childrenList || []).forEach(child => child.markAsDirty(opts));
    this.hasSubBatchesControl.markAsDirty(opts);
  }

  disable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }) {
    super.disable(opts);
    (this.childrenList || []).forEach(child => child.disable(opts));
    if (this._enable || (opts && opts.emitEvent)) {
      this._enable = false;
      this.markForCheck();
    }
    this.hasSubBatchesControl.disable(opts);
  }

  enable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }) {
    super.enable(opts);
    (this.childrenList || []).forEach(child => child.enable(opts));
    if (!this._enable || (opts && opts.emitEvent)) {
      this._enable = true;
      this.markForCheck();
    }
  }

  get hasSubBatches(): boolean {
    return this.hasSubBatchesControl.value === true;
  }

  @Input()
  set hasSubBatches(value: boolean) {
    this.hasSubBatchesControl.setValue(value);
    // Enable control if need
    if (!value && this.hasSubBatchesControl.disabled && this.enabled) {
      this.hasSubBatchesControl.enable();
    }
    // Disable control if need
    else if (value && this.hasSubBatchesControl.enabled && this.enabled) {
      this.hasSubBatchesControl.disable();
    }
  }


  constructor(
    injector: Injector,
    protected measurementValidatorService: MeasurementsValidatorService,
    protected formBuilder: FormBuilder,
    protected programRefService: ProgramRefService,
    protected platform: PlatformService,
    protected validatorService: BatchGroupValidatorService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(injector,
      measurementValidatorService,
      formBuilder,
      programRefService,
      validatorService,
      referentialRefService);

    // Default value
    this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;
    this.hasSubBatchesControl = new FormControl(false);
    this.showSamplingBatch = false;
    this._logPrefix = '[batch-group-form]';

    // DEBUG
    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.showHasSubBatchesButton = toBoolean(this.showHasSubBatchesButton, true);
    this.defaultHasSubBatches = toBoolean(this.defaultHasSubBatches, false);

    // Set isSampling on each child forms, when has indiv. measure changed
    this.registerSubscription(
      this.hasSubBatchesControl.valueChanges
        .pipe(filter(() => !this.applyingValue && !this.loading))
        .subscribe(hasSubBatches => {
            hasSubBatches = hasSubBatches && !this.showIndividualCount;
            if (this.qvPmfm) {
              (this.childrenList || []).forEach((childForm, index) => {
                childForm.setIsSampling(hasSubBatches, {emitEvent: true} /*Important, to force async validator*/);
              });
            }
            else {
              this.setIsSampling(hasSubBatches, {emitEvent: true} /*Important, to force async validator*/);
            }
          }));

    // Listen form changes
    this.registerSubscription(
      this.form.valueChanges
        .pipe(filter(() => !this.applyingValue && !this.loading))
        .subscribe((batch) => this.computeShowTotalIndividualCount(batch)));

  }

  focusFirstInput() {
    const element = this.firstInputFields.first;
    if (element) element.focus();
  }

  logFormErrors(logPrefix: string) {
    logPrefix = logPrefix || '';
    AppFormUtils.logFormErrors(this.form, logPrefix);
    if (this.childrenList) this.childrenList.forEach((childForm, index) => {
      AppFormUtils.logFormErrors(childForm.form, logPrefix, `children#${index}`);
    });
  }

  async ready(): Promise<void> {
    await super.ready();

  }

  /* -- protected methods -- */

  protected mapPmfms(pmfms: IPmfm[]) {

    if (this.debug) console.debug('[batch-group-form] mapPmfm()...');

    this.qvPmfm = this.qvPmfm || BatchGroupUtils.getQvPmfm(pmfms);
    if (this.qvPmfm) {

      // Create a copy, to keep original pmfm unchanged
      this.qvPmfm = this.qvPmfm.clone();

      // Hide for children form, and change it as required
      this.qvPmfm.hidden = true;
      this.qvPmfm.required = true;

      const qvPmfmIndex = pmfms.findIndex(pmfm => pmfm.id === this.qvPmfm.id);
      const speciesPmfms = pmfms.filter((pmfm, index) => index < qvPmfmIndex);
      const childrenPmfms = pmfms.filter((pmfm, index) => index >= qvPmfmIndex);
      childrenPmfms[0] = this.qvPmfm; // Replace QV in the list, by current instance

      const childrenPmfmsByQvId = this.qvPmfm.qualitativeValues.reduce((res, qv ) => {
        res[qv.id] = BatchGroupUtils.computeChildrenPmfmsByQvPmfm(qv.id, childrenPmfms)
        return res;
      }, {});

      this.$childrenPmfmsByQvId.next(childrenPmfmsByQvId);

      // Limit to species pmfms
      pmfms = speciesPmfms;
    }
    else {
      if (this.debug) console.debug('[batch-group-form] No qv pmfms...');

      // Not need child form, so apply children properties to self
      this.configureChildForm(this, {hasSubBatches: this.hasSubBatches});
    }

    return super.mapPmfms(pmfms);
  }

  protected async updateView(data: BatchGroup, opts?: { emitEvent?: boolean; onlySelf?: boolean; }) {

    if (this.debug) console.debug(this._logPrefix + ' updateView() with value:', data);
    let hasSubBatches = data.observedIndividualCount > 0 || this.defaultHasSubBatches || false;

    if (this.qvPmfm) {

      // Prepare data array, for each qualitative values
      data.children = this.qvPmfm.qualitativeValues.map((qv, index) => {

        // Find existing child, or create a new one
        // tslint:disable-next-line:triple-equals
        const child = (data.children || []).find(c => +(c.measurementValues[this.qvPmfm.id]) == qv.id)
          || new Batch();

        // Make sure label and rankOrder are correct
        child.label = `${data.label}.${qv.label}`;
        child.measurementValues[this.qvPmfm.id] = qv;
        child.rankOrder = index + 1;

        // Should have sub batches, when sampling batch exists
        hasSubBatches = hasSubBatches || isNotNil(BatchUtils.getSamplingChild(child));

        // Make sure to create a sampling batch, if has sub bacthes
        if (hasSubBatches) {
          BatchUtils.getOrCreateSamplingChild(child);
        }

        return child;
      });

      // Set value (batch group)
      await super.updateView(data, opts);

      // Configure child forms
      this.cd.detectChanges();
      this.childrenList.forEach(c => this.configureChildForm(c, {hasSubBatches}));

      // Set value of each child form
      await Promise.all(
        this.childrenList.map((childForm, index) => {
          const childBatch = data.children[index] || new Batch();
          return childForm.setValue(childBatch, {emitEvent: true});
        })
      );

      this.computeShowTotalIndividualCount(data);

    }

    // No QV pmfm
    else {

      // Should have sub batches, when sampling batch exists
      hasSubBatches = hasSubBatches || isNotNil(BatchUtils.getSamplingChild(data));

      // Configure as child form (will copy some childrenXXX properties into self)
      if (hasSubBatches !== this.hasSubBatches) {
        this.hasSubBatches = hasSubBatches;
        this.configureChildForm(this, {hasSubBatches});
      }

      // Set value (batch group)
      await super.updateView(data, opts);

    }

    // Apply computed value
    if (this.showHasSubBatchesButton || !this.hasSubBatchesControl.value) {
      this.hasSubBatchesControl.setValue(hasSubBatches, {emitEvent: false});
    }

    // If there is already some measure
    // Not allow to change 'has measure' field
    if (data.observedIndividualCount > 0) {
      this.hasSubBatchesControl.disable();
    } else if (this.enabled) {
      this.hasSubBatchesControl.enable();
    }
  }

  protected configureChildForm(childForm: BatchForm, opts: {hasSubBatches: boolean; emitEvent?: boolean}){

    childForm.showWeight = this.showChildrenWeight;
    childForm.showIndividualCount=this.showChildrenIndividualCount;
    childForm.showSamplingBatch=this.showChildrenSamplingBatch;
    childForm.showSampleWeight=this.showChildrenWeight;
    childForm.requiredWeight = this.showChildrenWeight && opts.hasSubBatches;
    childForm.requiredSampleWeight = this.showChildrenWeight && opts.hasSubBatches;
    childForm.requiredIndividualCount = !this.showChildrenWeight && this.showChildrenIndividualCount && opts.hasSubBatches;

    childForm.setIsSampling(opts.hasSubBatches, {emitEvent: true});

    if (this.qvPmfm) {
      if (this.enabled) {
        childForm.enable();
      } else {
        childForm.disable();
      }

      childForm.markAsReady();
    }
    else {
      // Is self form: mark for check
      if (childForm === this && opts.emitEvent !== false) {
        this.markForCheck();
      }
    }
  }

  protected getValue(): BatchGroup {
    const data = super.getValue();
    if (!data) return; // No set yet

    if (this.qvPmfm) {
      // For each child
      data.children = this.childrenList.map((childForm, index) => {
        const qv = this.qvPmfm.qualitativeValues[index];
        const child = childForm.value;
        if (!child) return; // No set yet

        child.rankOrder = index + 1;
        child.label = `${data.label}.${qv.label}`;
        child.measurementValues = child.measurementValues || {};
        child.measurementValues[this.qvPmfm.id.toString()] = '' + qv.id;

        // Copy other pmfms
        const childMeasurementValues = childForm.measurementValuesForm.value;
        Object.keys(childMeasurementValues)
          .filter(key => isNil(child.measurementValues[key]))
          .forEach(key => child.measurementValues[key] = childMeasurementValues[key]);

        return child;
      });
    }
    else {
      // Nothing to do
    }

    if (this.debug) console.debug(this._logPrefix + 'getValue():', data);

    return data;
  }

  protected computeShowTotalIndividualCount(data?: Batch) {
    data = data || this.data;
    if (this.debug) console.debug(this._logPrefix + 'computeShowTotalIndividualCount():', data);

    // Generally, individual count are not need, on a root species batch, because filled in sub-batches,
    // but some species (e.g. RJB) can have no weight.
    const showChildrenIndividualCount = data && ReferentialUtils.isNotEmpty(data.taxonGroup) &&
      (this.taxonGroupsNoWeight || []).includes(data.taxonGroup.label);

    if (this.showChildrenIndividualCount !== showChildrenIndividualCount) {
      this.showChildrenIndividualCount = showChildrenIndividualCount;
      this.showSampleIndividualCount = showChildrenIndividualCount;
      this.showChildrenWeight = !showChildrenIndividualCount; // Hide weight
      this.showChildrenSamplingBatch = !showChildrenIndividualCount;
      this.markForCheck();
    }
  }
}
