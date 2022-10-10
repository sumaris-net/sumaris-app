import { AfterViewInit, ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { Batch, BatchWeight } from './batch.model';
import { MeasurementValuesForm } from '../../measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '../../services/validator/measurement.validator';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import {
  AppFormUtils,
  EntityUtils,
  firstArrayValue,
  firstTruePromise,
  FormArrayHelper,
  IReferentialRef,
  isNil,
  isNotNil,
  ReferentialUtils,
  SharedFormGroupValidators,
  splitByProperty,
  toBoolean,
  UsageMode,
  waitFor
} from '@sumaris-net/ngx-components';

import { debounceTime, delay, filter } from 'rxjs/operators';
import { AcquisitionLevelCodes, MethodIds, PmfmIds, QualitativeLabels } from '@app/referential/services/model/model.enum';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { MeasurementValuesUtils } from '../../services/model/measurement.model';
import { BatchValidatorService } from './batch.validator';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { equals, roundHalfUp } from '@app/shared/functions';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';

@Component({
  selector: 'app-batch-form',
  templateUrl: './batch.form.html',
  styleUrls: ['batch.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchForm<T extends Batch<any> = Batch<any>> extends MeasurementValuesForm<T>
  implements OnInit, OnDestroy, AfterViewInit {

  private _formValidatorSubscription: Subscription;
  private _formValidatorOpts: any;

  protected _$afterViewInit = new BehaviorSubject<boolean>(false);
  protected _requiredWeight = false;
  protected _showWeight = true;
  protected _requiredSampleWeight = false;
  protected _requiredIndividualCount = false;
  protected _initialPmfms: IPmfm[];
  protected _disableByDefaultControls: AbstractControl[] = [];

  defaultWeightPmfm: IPmfm;
  weightPmfms: IPmfm[];
  weightPmfmsByMethod: { [key: string]: IPmfm };
  isSampling = false;
  childrenFormHelper: FormArrayHelper<Batch>;
  taxonNameFilter: any;

  @Input() mobile: boolean;
  @Input() tabindex: number;
  @Input() usageMode: UsageMode;
  @Input() showTaxonGroup = true;
  @Input() showTaxonName = true;
  @Input() showIndividualCount = false;
  @Input() showSampleIndividualCount = false;
  @Input() showSampleWeight = false;
  @Input() showEstimatedWeight = false;
  @Input() showSamplingBatch = false;
  @Input() showError = true;
  @Input() availableTaxonGroups: IReferentialRef[] | Observable<IReferentialRef[]>;
  @Input() maxVisibleButtons: number;
  @Input() samplingRatioFormat: SamplingRatioFormat = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;
  @Input() i18nSuffix: string;

  @Input() set showWeight(value: boolean) {
    if (this._showWeight !== value) {
      this._showWeight = value;
      if (!this.starting) this.onUpdateFormGroup();
    }
  }

  get showWeight(): boolean {
    return this._showWeight;
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }): void {
    super.enable(opts);

    // Refresh sampling child form
    if (!this.isSampling) this.setIsSampling(this.isSampling);
    if (this._showWeight) {
      this.enableWeightFormGroup();
    } else {
      this.disableWeightFormGroup();
    }

    // Other field to disable by default (e.g. discard reason, in SUMARiS program)
    this._disableByDefaultControls.forEach(c => c.disable(opts));
  }

  get children(): FormArray {
    return this.form.get('children') as FormArray;
  }

  get weightForm(): FormGroup {
    return this.form.get('weight') as FormGroup;
  }

  @Input()
  set requiredSampleWeight(value: boolean) {
    if (this._requiredSampleWeight !== value) {
      this._requiredSampleWeight = value;
      if (!this.starting) this.onUpdateFormGroup();
    }
  }

  get requiredSampleWeight(): boolean {
    return this._requiredSampleWeight;
  }

  @Input()
  set requiredWeight(value: boolean) {
    if (this._requiredWeight !== value) {
      this._requiredWeight = value;
      if (!this.starting) this.onUpdateFormGroup();
    }
  }

  get requiredWeight(): boolean {
    return this._requiredWeight;
  }

  @Input()
  set requiredIndividualCount(value: boolean) {
    if (this._requiredIndividualCount !== value) {
      this._requiredIndividualCount = value;
      if (!this.starting) this.onUpdateFormGroup();
    }
  }

  get requiredIndividualCount(): boolean {
    return this._requiredIndividualCount;
  }

  get hasAvailableTaxonGroups() {
    return isNotNil(this.availableTaxonGroups) && (!Array.isArray(this.availableTaxonGroups) || this.availableTaxonGroups.length > 0);
  }

  constructor(
    injector: Injector,
    protected measurementValidatorService: MeasurementsValidatorService,
    protected formBuilder: FormBuilder,
    protected programRefService: ProgramRefService,
    protected validatorService: BatchValidatorService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(injector, measurementValidatorService, formBuilder, programRefService,
      validatorService.getFormGroup(null, {
        withWeight: true,
        rankOrderRequired: false, // Allow to be set by parent component
        labelRequired: false // Allow to be set by parent component
      }),
      {
        mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        onUpdateFormGroup: (form) => this.onUpdateFormGroup(form)
      });

    // Set default acquisition level
    this._acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;
    this._enable = true;
    this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';

    this.childrenFormHelper = this.getChildrenFormHelper(this.form);

    // for DEV only
    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.mobile = isNotNil(this.mobile) ? this.mobile : this.settings.mobile;
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;

    // Taxon group combo
    if (this.hasAvailableTaxonGroups) {
      // Set items (useful to speed up the batch group modal)
      this.registerAutocompleteField('taxonGroup', {
        items: this.availableTaxonGroups,
        mobile: this.mobile
      });
    } else {
      this.registerAutocompleteField('taxonGroup', {
        suggestFn: (value: any, filter?: any) => this.programRefService.suggestTaxonGroups(value, {...filter, program: this.programLabel}),
        mobile: this.mobile
      });
    }

    // Taxon name combo
    this.updateTaxonNameFilter();
    this.registerAutocompleteField('taxonName', {
      suggestFn: (value: any, filter?: any) => this.programRefService.suggestTaxonNames(value, filter),
      filter: this.taxonNameFilter,
      mobile: this.mobile,
      showAllOnFocus: this.showTaxonName
    });

    this.registerSubscription(
      this.form.get('taxonGroup').valueChanges
        .pipe(
          debounceTime(250),
          filter(_ => this.showTaxonGroup && this.showTaxonName)
        )
        .subscribe(taxonGroup => this.updateTaxonNameFilter({taxonGroup}))
    );

    this.ngInitExtension();
  }

  ngAfterViewInit() {
    // This will cause update controls
    this._$afterViewInit.next(true);
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._$afterViewInit.complete();
  }

  /* -- protected method -- */

  protected async ngInitExtension() {

    await this.ready();

    const discardReasonControl = this.form.get('measurementValues.' + PmfmIds.DISCARD_REASON);
    const discardOrLandingControl = this.form.get('measurementValues.' + PmfmIds.DISCARD_OR_LANDING);

    // Manage DISCARD_REASON validator
    if (discardOrLandingControl && discardReasonControl) {
      // Always disable by default, while discard/Landing not set
      this._disableByDefaultControls.push(discardReasonControl);

      this.registerSubscription(discardOrLandingControl.valueChanges
        .pipe(
          // IMPORTANT: add a delay, to make sure to be executed AFTER the form.enable()
          delay(200)
        )
        .subscribe((value) => {
          if (ReferentialUtils.isNotEmpty(value) && value.label === QualitativeLabels.DISCARD_OR_LANDING.DISCARD) {
            if (this.form.enabled) {
              discardReasonControl.enable();
            }
            discardReasonControl.setValidators(Validators.required);
            discardReasonControl.updateValueAndValidity({ onlySelf: true });
            this.form.updateValueAndValidity({ onlySelf: true });
          } else {
            discardReasonControl.setValue(null);
            discardReasonControl.setValidators(null);
            discardReasonControl.disable();
          }
        })
      );
    }

  }

  protected async updateView(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean }) {

    // Fill weight, if a weight PMFM exists
    if (this.defaultWeightPmfm && this.showWeight) {
      const weightPmfm = (this.weightPmfms || []).find(p => isNotNil(data.measurementValues[p.id.toString()]));
      data.weight = data.weight || {
        methodId: weightPmfm?.methodId,
        computed: weightPmfm && (weightPmfm.isComputed || weightPmfm.methodId === MethodIds.CALCULATED),
        estimated: weightPmfm?.methodId === MethodIds.ESTIMATED_BY_OBSERVER,
        value: weightPmfm && data.measurementValues[weightPmfm.id.toString()],
      };

      // Clean all weight values and control (to keep only the weight form group)
      this.weightPmfms.forEach(p => {
        delete data.measurementValues[p.id.toString()];
        this.form.removeControl(p.id.toString());
      });
    }

    // No weight PMFM : disable weight form group, if exists (will NOT exists in BatchGroupForm sub classe)
    else {
      // Disable weight, if group exist
      this.disableWeightFormGroup();
    }

    // Adapt measurement values to form
    if (!opts || opts.normalizeEntityToForm !== false) {
      // IMPORTANT: applying normalisation of measurement values on ALL pmfms (not only displayed pmfms)
      // This is required by the batch-group-form component, to keep the value of hidden PMFM, such as Landing/Discard Pmfm
      MeasurementValuesUtils.normalizeEntityToForm(data, this._initialPmfms, this.form);
    }

    if (this.showSamplingBatch) {

      this.childrenFormHelper.resize(1);
      const samplingFormGroup = this.childrenFormHelper.at(0) as FormGroup;

      const samplingBatch = BatchUtils.getOrCreateSamplingChild(data);
      this.setIsSampling(this.isSampling || BatchUtils.isSampleNotEmpty(samplingBatch));

      // Read child weight (use the first one)
      if (this.defaultWeightPmfm) {
        samplingBatch.weight = BatchUtils.getWeight(samplingBatch, this.weightPmfms);

        // Adapt measurement values to form
        MeasurementValuesUtils.normalizeEntityToForm(samplingBatch, [], samplingFormGroup);
      }

      // Convert sampling ratio
      //samplingBatch.samplingRatio = BatchUtils.getSamplingRatio(samplingBatch, this.samplingRatioType);
      /*if (isNotNil(samplingBatch.samplingRatio)) {
        BatchUtils.normalizedSamplingRatioToForm(samplingBatch, this.samplingRatioType);
      }*/

    } else {
      this.childrenFormHelper.resize((data.children || []).length);
      this.childrenFormHelper.disable();
    }


    await super.updateView(data, {
      // Always skip normalization (already done)
      normalizeEntityToForm: false
    });
  }

  protected getValue(): T {
    if (!this.data) return undefined;
    const json = this.form.value;
    const data = this.data;

    // Get existing measurements
    const measurementValues = data.measurementValues || {};

    // Clean previous all weights
    (this.weightPmfms || []).forEach(p => measurementValues[p.id.toString()] = undefined);

    // Convert weight into measurement
    const totalWeight = this.defaultWeightPmfm && json.weight?.value;
    if (isNotNil(totalWeight)) {
      const totalWeightPmfm = BatchUtils.getWeightPmfm(json.weight, this.weightPmfms, this.weightPmfmsByMethod);
      json.measurementValues[totalWeightPmfm.id.toString()] = totalWeight;
    }

    // Convert measurements
    json.measurementValues = {
      ...measurementValues,
      ...MeasurementValuesUtils.normalizeValuesToModel(json.measurementValues, this._initialPmfms)
    };

    if (this.showSamplingBatch) {

      if (this.isSampling) {
        const child = BatchUtils.getOrCreateSamplingChild(data);
        const childJson = json.children && json.children[0] || {};

        childJson.rankOrder = 1;
        childJson.label = json.label && (json.label + Batch.SAMPLING_BATCH_SUFFIX) || undefined;

        childJson.measurementValues = childJson.measurementValues || {};

        // Clean existing weights
        this.weightPmfms.forEach(p => childJson.measurementValues[p.id.toString()] = undefined);
        // Convert weight into measurement
        if (isNotNil(childJson.weight?.value)) {
          const childWeightPmfm = BatchUtils.getWeightPmfm(childJson.weight, this.weightPmfms, this.weightPmfmsByMethod);
          childJson.measurementValues[childWeightPmfm.id.toString()] = childJson.weight.value;
        }

        // Convert measurements
        childJson.measurementValues = Object.assign({},
          child.measurementValues,  // Keep existing extra measurements
          MeasurementValuesUtils.normalizeValuesToModel(childJson.measurementValues, this.weightPmfms));

        // Special case: when sampling on individual count only (e.g. RJB - Pocheteau)
        if (!this.showWeight && isNotNil(childJson.individualCount) && isNotNil(json.individualCount)) {
          console.debug('Computing samplingRatio, using individualCount (e.g. special case like RJB species)');
          childJson.samplingRatio = childJson.individualCount / json.individualCount;
          childJson.samplingRatioText = `${childJson.individualCount}/${json.individualCount}`;
        }

        json.children = [childJson];
      } else {
        // No sampling batch
        json.children = [];
      }

      // Update data
      data.fromObject(json, {withChildren: true});
    } else {
      // Keep existing children
      data.fromObject(json);
    }

    if (this.debug) console.debug(`[batch-form] ${data.label} getValue():`, data);

    return data;
  }

  setIsSampling(enable: boolean, opts?: { emitEvent?: boolean }) {
    if (this.isSampling !== enable) {
      this.isSampling = enable;

      if (!this.loading) this.form.markAsDirty();

      const childrenArray = this.children;

      if (childrenArray) {
        if (enable && childrenArray.disabled) {
          childrenArray.enable({emitEvent: toBoolean(opts && opts.emitEvent, false)});
          this.markForCheck();
        } else if (!enable && childrenArray.enabled) {
          childrenArray.disable({emitEvent: toBoolean(opts && opts.emitEvent, false)});
          this.markForCheck();
        }
      }
    }
  }

  copyChildrenWeight(event: UIEvent, samplingBatchForm: AbstractControl) {

    const source = samplingBatchForm.get('childrenWeight')?.value as BatchWeight;
    if (isNil(source?.value)) return; // Nothing to copy

    const totalWeight = this.weightForm?.value as BatchWeight;
    const target: BatchWeight = {
      ...source,
      // Adapt max decimals to targeted weight
      value: roundHalfUp(source.value, this.defaultWeightPmfm.maximumNumberDecimals || 3),
      // Force to not computed, to be able to update value
      computed: false
    };

    if (isNotNil(totalWeight?.value) && !totalWeight.computed) {
      // Apply the new weight
      // + Clean sampling ratio (will be computed, using weights)
      samplingBatchForm.patchValue({
        weight: target,
        samplingRatio: null,
        samplingRatioText: null,
      });
    }
    else {
      // Apply the new weight
      samplingBatchForm.patchValue({
        weight: target
      });
    }
  }

  /* -- protected methods -- */

  /**
   * Wait ngAfterViewInit()
   */
  protected async waitViewInit(): Promise<void> {
    if (this._$afterViewInit.value !== true) {
      await firstTruePromise(this._$afterViewInit, {stop: this.destroySubject});
    }
  }

  protected updateTaxonNameFilter(opts?: { taxonGroup?: any }) {

    // If taxonGroup exists: taxon group must be filled first
    if (this.showTaxonGroup && ReferentialUtils.isEmpty(opts && opts.taxonGroup)) {
      this.taxonNameFilter = {
        programLabel: 'NONE' /*fake program, will cause empty array*/
      };
    } else {
      this.taxonNameFilter = {
        programLabel: this.programLabel,
        taxonGroupId: opts && opts.taxonGroup && opts.taxonGroup.id
      };
    }
    this.markForCheck();
  }

  protected mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    if (!pmfms) return; // Skip if empty

    this._initialPmfms = pmfms; // Copy original pmfms list

    // Read weight PMFMs
    this.weightPmfms = pmfms.filter(p => PmfmUtils.isWeight(p));
    this.defaultWeightPmfm = firstArrayValue(this.weightPmfms);
    this.weightPmfmsByMethod = splitByProperty(this.weightPmfms, 'methodId');

    this.showSamplingBatch = toBoolean(this.showSamplingBatch, isNotNil(this.defaultWeightPmfm));

    // Exclude weight or hidden PMFMs
    return pmfms.filter(p => !this.weightPmfms.includes(p) && !p.hidden);
  }

  protected async onUpdateFormGroup(form?: FormGroup): Promise<void> {
    form = form || this.form;

    try {
      // Wait ngAfterViewInit()
      await this.waitViewInit();

      // Add pmfms to form
      const measFormGroup = form.get('measurementValues') as FormGroup;
      if (measFormGroup) {
        this.measurementValidatorService.updateFormGroup(measFormGroup, {pmfms: this._initialPmfms});
      }

      const childrenFormHelper = this.getChildrenFormHelper(form);
      const hasSamplingForm = childrenFormHelper.size() === 1 && this.defaultWeightPmfm && true;

      // If the sample batch exists
      if (this.showSamplingBatch) {

        childrenFormHelper.resize(1);
        const samplingForm = childrenFormHelper.at(0) as FormGroup;

        // Reset measurementValues (if exists)
        const samplingMeasFormGroup = samplingForm.get('measurementValues');
        if (samplingMeasFormGroup) {
          this.measurementValidatorService.updateFormGroup(samplingMeasFormGroup as FormGroup, {pmfms: []});
        }

        // Adapt exists sampling child, if any
        if (this.data) {
          const samplingChildBatch = BatchUtils.getOrCreateSamplingChild(this.data);

          this.setIsSampling(this.isSampling || BatchUtils.isSampleNotEmpty(samplingChildBatch));

        } else {
          // No data: disable sampling
          this.setIsSampling(false);
        }

        // If sampling weight is required, make batch weight required also
        if (this._requiredSampleWeight) {
          this.weightForm.setValidators(
            SharedFormGroupValidators.requiredIf('value', samplingForm.get('weight.value'))
          );
        }

        // If sampling weight is required, make batch weight required also
        if (this._requiredIndividualCount) {
          this.form.get('individualCount').setValidators(Validators.required);
        }

        // Has sample batch, and weight is enable
        if (this.showWeight) {
          await this.enableSamplingWeightComputation();
        }
      }

      // Remove existing sample, if exists but showSample=false
      else if (hasSamplingForm) {
        childrenFormHelper.resize(0);

        // Unregister to previous sampling weight validator
        this._formValidatorSubscription?.unsubscribe();
      }

      if (this.showWeight) {
        this.enableWeightFormGroup({emitEvent: false});
      } else {
        this.disableWeightFormGroup({emitEvent: false});
      }
    }
    catch (err) {
      console.error('[batch-form] Error while updating controls', err);
    }
  }

  protected enableWeightFormGroup(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    this.form.get('weight')?.enable(opts);
  }

  protected disableWeightFormGroup(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    this.form.get('weight')?.disable(opts);
  }

  selectInputContent = AppFormUtils.selectInputContent;

  protected getChildrenFormHelper(form: FormGroup): FormArrayHelper<Batch> {
    let arrayControl = form.get('children') as FormArray;
    if (!arrayControl) {
      arrayControl = this.formBuilder.array([]);
      form.addControl('children', arrayControl);
    }
    return new FormArrayHelper<Batch>(
      arrayControl,
      (value) => this.validatorService.getFormGroup(value, {withWeight: true, withChildrenWeight: true}),
      (v1, v2) => EntityUtils.equals(v1, v2, 'label'),
      (value) => isNil(value),
      {allowEmptyArray: true}
    );
  }

  protected async enableSamplingWeightComputation() {

    if (!this.showSamplingBatch || !this.showWeight) {
      // Unregister to previous validator
      this._formValidatorSubscription?.unsubscribe();
      return;
    }

    await waitFor(() => !!this.samplingRatioFormat && !!this.defaultWeightPmfm, {timeout: 2000});

    if (!this.samplingRatioFormat || !this.defaultWeightPmfm) {
      console.warn(this._logPrefix + 'Missing samplingRatioFormat or weight Pmfm. Skipping sampling ratio and weight computation');
      return;
    }

    const opts = {
      requiredSampleWeight: this.requiredSampleWeight,
      samplingRatioFormat: this.samplingRatioFormat,
      weightMaxDecimals: this.defaultWeightPmfm?.maximumNumberDecimals,
      markForCheck: () => this.markForCheck(),
      debounceTime: this.mobile ? 650 : 0
    };

    // Skip if unchanged
    if (equals(opts, this._formValidatorOpts)) return;
    this._formValidatorOpts = opts;

    // Unregister to previous validator
    this._formValidatorSubscription?.unsubscribe();

    // Create a sampling form validator
    const subscription = this.validatorService.enableSamplingRatioAndWeight(this.form, this._formValidatorOpts);

    // Register subscription
    this.registerSubscription(subscription);
    this._formValidatorSubscription = subscription;

    // Unregister if unsubscribe
    subscription.add(() => {
      this.unregisterSubscription(subscription);
      this._formValidatorSubscription = null;
    })
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
