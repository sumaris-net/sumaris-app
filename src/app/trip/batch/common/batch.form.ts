import { AfterViewInit, ChangeDetectionStrategy, Component, Inject, InjectionToken, Injector, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { Batch, BatchWeight } from './batch.model';
import { IMeasurementValuesFormOptions, MeasurementValuesForm, MeasurementValuesState } from '../../measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '../../services/validator/measurement.validator';
import { AbstractControl, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import {
  changeCaseToUnderscore,
  EntityUtils,
  firstArrayValue,
  firstTruePromise,
  FormArrayHelper,
  IAppForm, IEntitiesService,
  IReferentialRef,
  isNil,
  isNotNil,
  MatAutocompleteFieldConfig,
  ReferentialUtils,
  splitByProperty,
  toBoolean, toNumber,
  UsageMode,
  waitFor
} from '@sumaris-net/ngx-components';

import { debounceTime, delay, filter } from 'rxjs/operators';
import { AcquisitionLevelCodes, MethodIds, PmfmIds, QualitativeLabels } from '@app/referential/services/model/model.enum';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { MeasurementValuesUtils } from '../../services/model/measurement.model';
import { BatchValidatorOptions, BatchValidatorService } from './batch.validator';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { equals, roundHalfUp } from '@app/shared/functions';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { DenormalizedPmfmFilter } from '@app/referential/services/filter/pmfm.filter';
import { BatchGroupValidatorService } from '@app/trip/batch/group/batch-group.validator';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { PhysicalGearFilter } from '@app/trip/physicalgear/physical-gear.filter';

export interface IBatchForm<T extends Batch<any> = Batch<any>> extends IAppForm {
  form: UntypedFormGroup;
  pmfms: IPmfm[];
  acquisitionLevel: string;

  showError: boolean;
  showTaxonGroup?: boolean;
  showTaxonName?: boolean;
  taxonNameFilter?: any;
  showWeight?: boolean;
  defaultWeightPmfm?: IPmfm;
  requiredWeight?: boolean;
  showEstimatedWeight?: boolean;
  showIndividualCount?: boolean;
  requiredIndividualCount?: boolean;
  showSamplingBatch?: boolean;
  requiredSampleWeight?: boolean;
  showSampleIndividualCount?: boolean;
  isSampling?: boolean;
  samplingRatioFormat?: SamplingRatioFormat;

  measurementValuesForm: UntypedFormGroup;
  samplingBatchForm?: UntypedFormGroup;
  filter: BatchFilter;

  gearId: number;
  pmfms$: Observable<IPmfm[]>;
  weightPmfms?: IPmfm[];
  weightPmfmsByMethod?: { [key: string]: IPmfm };

  tabindex?: number;
  maxItemCountForButtons?: number;
  maxVisibleButtons?: number;

  autocompleteFields: {
    [key: string]: MatAutocompleteFieldConfig;
  };

  compact?: boolean;
  mobile: boolean;
  debug: boolean;

  setValue(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any; waitIdle?: boolean;}): Promise<void> | void;
  setIsSampling(value: boolean);
}

export interface BatchFormState extends MeasurementValuesState {
  defaultWeightPmfm: IPmfm;
  weightPmfms: IPmfm[];
  weightPmfmsByMethod: { [key: string]: IPmfm };
  pmfmFilter: Partial<DenormalizedPmfmFilter>|null;

  showWeight: boolean;
  requiredWeight: boolean;
  requiredSampleWeight: boolean;
  requiredIndividualCount: boolean;
  showSamplingBatch: boolean;

  hasPmfms: boolean;
}

export interface IBatchFormOptions extends IMeasurementValuesFormOptions {

}

export const BATCH_VALIDATOR_OPTIONS_TOKEN = new InjectionToken<BatchValidatorOptions>('batchValidatorOptions');


@Component({
  selector: 'app-batch-form',
  templateUrl: './batch.form.html',
  styleUrls: ['batch.form.scss'],
  providers: [
    { provide: BATCH_VALIDATOR_OPTIONS_TOKEN, useValue: {}}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchForm<
  T extends Batch<any> = Batch<any>,
  S extends BatchFormState = BatchFormState
>
  extends MeasurementValuesForm<T, S>
  implements OnInit, OnDestroy, AfterViewInit, IBatchForm<Batch> {

  private _formValidatorSubscription: Subscription;
  private _formValidatorOpts: any;
  private _filter: BatchFilter;

  protected _$afterViewInit = new BehaviorSubject<boolean>(false);
  protected _initialPmfms: IPmfm[];
  protected _disableByDefaultControls: AbstractControl[] = [];
  protected _pmfmNamePipe: PmfmNamePipe;

  readonly weightPmfms$ = this._state.select('weightPmfms');
  readonly hasPmfms$ = this._state.select('hasPmfms');

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
  @Input() showError = true;
  @Input() availableTaxonGroups: IReferentialRef[] | Observable<IReferentialRef[]>;
  @Input() maxVisibleButtons: number;
  @Input() maxItemCountForButtons: number;
  @Input() samplingRatioFormat: SamplingRatioFormat = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;
  @Input() i18nSuffix: string;


  @Input() set pmfmFilter(value: Partial<DenormalizedPmfmFilter>) {
    this._state.set('pmfmFilter', _ => value);
  }

  @Input() set showWeight(value: boolean) {
    this._state.set('showWeight', _ => value);
  }

  get showWeight(): boolean {
    return this._state.get('showWeight');
  }

  disable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.disable(opts);
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }): void {
    super.enable(opts);

    // Refresh sampling child form
    if (!this.isSampling) this.setIsSampling(this.isSampling);
    if (this.showWeight) {
      this.enableWeightFormGroup();
    } else {
      this.disableWeightFormGroup();
    }

    // Other field to disable by default (e.g. discard reason, in SUMARiS program)
    this._disableByDefaultControls.forEach(c => c.disable(opts));
  }

  get children(): UntypedFormArray {
    return this.form.get('children') as UntypedFormArray;
  }

  @Input() set showSamplingBatch(value: boolean) {
    this._state.set('showSamplingBatch', _ => value);
  }
  get showSamplingBatch(): boolean {
    return this._state.get('showSamplingBatch');
  }

  get samplingBatchForm(): UntypedFormGroup {
    return this.children?.at(0) as UntypedFormGroup;
  }

  get weightForm(): UntypedFormGroup {
    return this.form.get('weight') as UntypedFormGroup;
  }

  @Input()
  set requiredSampleWeight(value: boolean) {
    this._state.set('requiredSampleWeight', _ => value);
  }

  get requiredSampleWeight(): boolean {
    return this._state.get('requiredSampleWeight');
  }

  @Input()
  set requiredWeight(value: boolean) {
    this._state.set('requiredWeight', _ => value);
  }

  get requiredWeight(): boolean {
    return this._state.get('requiredWeight');
  }

  @Input()
  set requiredIndividualCount(value: boolean) {
    this._state.set('requiredIndividualCount', _ =>value);
  }

  get requiredIndividualCount(): boolean {
    return this._state.get('requiredIndividualCount');
  }

  get hasAvailableTaxonGroups() {
    return isNotNil(this.availableTaxonGroups) && (!Array.isArray(this.availableTaxonGroups) || this.availableTaxonGroups.length > 0);
  }

  get touched(): boolean {
    return this.form?.touched;
  }

  @Input() set filter(value: BatchFilter) {
    this._filter = value;
  }

  get filter() {
    return this._filter;
  }

  get defaultWeightPmfm(): IPmfm {
    return this._state.get('defaultWeightPmfm');
  }
  set defaultWeightPmfm(value: IPmfm) {
    this._state.set('defaultWeightPmfm', _ => value);
  }

  get weightPmfms(): IPmfm[] {
    return this._state.get('weightPmfms');
  }
  set weightPmfms(value: IPmfm[]) {
    this._state.set('weightPmfms', _ => value);
  }

  get weightPmfmsByMethod(): { [key: string]: IPmfm } {
    return this._state.get('weightPmfmsByMethod');
  }
  set weightPmfmsByMethod(value: { [key: string]: IPmfm }) {
    this._state.set('weightPmfmsByMethod', _ => value);
  }

  constructor(
    injector: Injector,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService,
    protected referentialRefService: ReferentialRefService,
    protected validatorService: BatchValidatorService,
    @Inject(BATCH_VALIDATOR_OPTIONS_TOKEN) @Optional() validatorOptions?: BatchValidatorOptions
  ) {
    super(injector,
      measurementsValidatorService,
      formBuilder,
      programRefService,
      validatorService.getFormGroup(null, {
        withWeight: true,
        rankOrderRequired: false, // Allow to be set by parent component
        labelRequired: false, // Allow to be set by parent component
        ...validatorOptions
      }),
      {
        mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        onUpdateFormGroup: (form) => this.onUpdateFormGroup(form)
      });
    this._pmfmNamePipe = injector.get(PmfmNamePipe);
    this._enable = true;
    this.childrenFormHelper = this.getChildrenFormHelper(this.form);
    this.errorTranslatorOptions = {separator: '<br/>', controlPathTranslator: this};

    // Set defaults
    this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;
    this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
    this.pmfmFilter = null;

    // for DEV only
    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.mobile = isNotNil(this.mobile) ? this.mobile : this.settings.mobile;
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;

    // When pmfm filter change, re-apply initial pmfms
    this._state.hold(this._state.select('pmfmFilter')
      .pipe(filter(_ => !this.loading)),
      _ => this.setPmfms(this._initialPmfms)
    );

    // Update form if need
    this._state.hold(this._state.select(['showWeight', 'requiredWeight', 'requiredSampleWeight', 'requiredIndividualCount', 'showSamplingBatch'], res => res)
        .pipe(filter(_ => !this.starting)),
      (_) => this.onUpdateFormGroup()
    );

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

  onApplyingEntity(data: T, opts?: any) {
    super.onApplyingEntity(data, opts);

    if (!data) return; // Skip

    // Init default
    data.label = data.label || this.acquisitionLevel;
    data.rankOrder = toNumber(data.rankOrder, 0);
  }

  translateControlPath(path: string): string {
    if (path.includes('measurementValues.')) {
      const parts = path.split('.');
      const pmfmId = parseInt(parts[parts.length-1]);
      const pmfm = (this.pmfms || []).find(p => p.id === pmfmId);
      if (pmfm) {
        return this._pmfmNamePipe.transform(pmfm, {i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nSuffix});
      }
    }
    let fieldName: string;
    switch (path) {
      case 'individualCount':
        fieldName = 'TOTAL_INDIVIDUAL_COUNT';
        break;
      case 'weight':
      case 'weight.value':
        fieldName = 'TOTAL_WEIGHT';
        break;
      case 'children.0.weight.value':
        fieldName = 'SAMPLING_WEIGHT';
        break;
      default:
        fieldName = path; // .indexOf('.') !== -1 ? path.substring(path.lastIndexOf('.')+1) : path;
        break;
    }
    const i18nKey = (this.i18nFieldPrefix || 'TRIP.BATCH.EDIT.') + changeCaseToUnderscore(fieldName).toUpperCase();
    return this.translate.instant(i18nKey);
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
      const samplingFormGroup = this.childrenFormHelper.at(0) as UntypedFormGroup;

      const samplingBatch = BatchUtils.getOrCreateSamplingChild(data);
      this.setIsSampling(this.isSampling || BatchUtils.isSamplingNotEmpty(samplingBatch));

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

    // DEBUG
    //if (this.debug) console.debug(`[batch-form] ${data.label} getValue():`, data);

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

  copyChildrenWeight(event: Event, samplingBatchForm: AbstractControl) {

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

  protected async mapPmfms(pmfms: IPmfm[]): Promise<IPmfm[]> {
    if (!pmfms) return; // Skip if empty

    this._initialPmfms = pmfms; // Copy original pmfms list

    // Filter pmfms
    const filterFn = DenormalizedPmfmFilter.fromObject(this.pmfmFilter)?.asFilterFn();
    if (filterFn) {
      pmfms = pmfms.filter(filterFn);
    }

    // dispatch pmfms
    const pmfmStateUpdate = await this.dispatchPmfms(pmfms);

    this._state.set(pmfmStateUpdate);

    return pmfmStateUpdate.pmfms;

  }

  protected async dispatchPmfms(pmfms: IPmfm[]): Promise<Partial<S>> {
    if (!pmfms) return; // Skip

    // DEBUG
    console.debug(this._logPrefix + ' Dispatching pmfms...');

    // Read weight PMFMs
    const weightPmfms = pmfms.filter(p => PmfmUtils.isWeight(p));
    const defaultWeightPmfm = firstArrayValue(weightPmfms);
    const weightPmfmsByMethod = splitByProperty(weightPmfms, 'methodId');

    // Exclude weight (because we use special fields for weights)
    // or hidden PMFMs
    const visiblePmfms = pmfms.filter(p => !weightPmfms.includes(p) && !p.hidden);

    // Hide sampling batch, if no weight pmfm
    const showSamplingBatch = toBoolean(this.showSamplingBatch, isNotNil(defaultWeightPmfm));

    return <Partial<S>>{
      showSamplingBatch,
      weightPmfms,
      defaultWeightPmfm,
      weightPmfmsByMethod,
      hasPmfms: pmfms.length > 0,
      pmfms: visiblePmfms
    };
  }

  protected async onUpdateFormGroup(form?: UntypedFormGroup): Promise<void> {
    form = form || this.form;

    console.debug(this._logPrefix + 'Updating form group...');

    try {
      // Wait ngAfterViewInit()
      await this.waitViewInit();

      // Add pmfms to form
      const measFormGroup = form.get('measurementValues') as UntypedFormGroup;
      if (measFormGroup) {
        this.measurementsValidatorService.updateFormGroup(measFormGroup, {pmfms: this._initialPmfms});
      }

      const childrenFormHelper = this.getChildrenFormHelper(form);
      const hasSamplingForm = childrenFormHelper.size() === 1 && this.defaultWeightPmfm && true;

      // If the sample batch exists
      if (this.showSamplingBatch) {

        childrenFormHelper.resize(1);
        const samplingForm = childrenFormHelper.at(0) as UntypedFormGroup;

        // Reset measurementValues (if exists)
        const samplingMeasFormGroup = samplingForm.get('measurementValues');
        if (samplingMeasFormGroup) {
          this.measurementsValidatorService.updateFormGroup(samplingMeasFormGroup as UntypedFormGroup, {pmfms: []});
        }

        // Adapt exists sampling child, if any
        if (this.data) {
          const samplingChildBatch = BatchUtils.getOrCreateSamplingChild(this.data);

          this.setIsSampling(this.isSampling || BatchUtils.isSamplingNotEmpty(samplingChildBatch));

        } else {
          // No data: disable sampling
          this.setIsSampling(false);
        }

        // If sampling weight is required, make batch weight required also
        if (this.requiredSampleWeight) {
          // FIXME : issue with the  requiredIf validator (should test it again)
          // this.weightForm.setValidators(
          //   SharedFormGroupValidators.requiredIf('value', samplingForm.get('weight.value'))
          // );
        }

        // If sampling weight is required, make batch weight required also
        if (this.requiredIndividualCount) {
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
      console.error(this._logPrefix + 'Error while updating controls', err);
    }
  }

  protected enableWeightFormGroup(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    this.form.get('weight')?.enable(opts);
  }

  protected disableWeightFormGroup(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    this.form.get('weight')?.disable(opts);
  }

  protected getChildrenFormHelper(form: UntypedFormGroup): FormArrayHelper<Batch> {
    let arrayControl = form.get('children') as UntypedFormArray;
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
