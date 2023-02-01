import { AfterViewInit, ChangeDetectionStrategy, Component, Inject, InjectionToken, Injector, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { Batch, BatchWeight } from './batch.model';
import { MeasurementValuesForm, MeasurementValuesState } from '../../measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '../../services/validator/measurement.validator';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import {
  AppFormArray,
  changeCaseToUnderscore,
  firstArrayValue,
  firstTruePromise,
  IReferentialRef,
  isNil,
  isNotEmptyArray,
  isNotNil,
  ReferentialUtils,
  splitByProperty,
  toBoolean,
  toNumber,
  UsageMode,
  waitFor
} from '@sumaris-net/ngx-components';

import { debounceTime, delay, distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { AcquisitionLevelCodes, MethodIds, PmfmIds, QualitativeLabels } from '@app/referential/services/model/model.enum';
import { Observable, Subscription } from 'rxjs';
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


export interface BatchFormState extends MeasurementValuesState {
  defaultWeightPmfm: IPmfm;
  weightPmfms: IPmfm[];
  weightPmfmsByMethod: { [key: string]: IPmfm };
  pmfmFilter: Partial<DenormalizedPmfmFilter>|null;
  samplingRatioFormat: SamplingRatioFormat;

  showExhaustiveInventory: boolean;

  showWeight: boolean;
  showEstimatedWeight: boolean;
  requiredWeight: boolean;
  requiredIndividualCount: boolean;
  showSamplingBatch: boolean;
  showChildrenWeight: boolean;

  requiredSampleWeight: boolean;
  showIndividualCount: boolean;
  showSampleWeight: boolean;
  showSampleIndividualCount: boolean;
  requiredSampleIndividualCount: boolean;
  samplingBatchEnabled: boolean;

  hasContent: boolean; // Has some visible content (pmfms, weight, etc.)
  afterViewInitialized: boolean
}

export const BATCH_VALIDATOR = new InjectionToken<BatchValidatorService>('batchValidatorService');
export const BATCH_VALIDATOR_OPTIONS_TOKEN = new InjectionToken<BatchValidatorOptions>('batchValidatorOptions');


@Component({
  selector: 'app-batch-form',
  templateUrl: './batch.form.html',
  styleUrls: ['batch.form.scss'],
  providers: [
    {provide: BATCH_VALIDATOR, useExisting: BatchValidatorService},
    { provide: BATCH_VALIDATOR_OPTIONS_TOKEN, useValue: {}}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchForm<
  T extends Batch<any> = Batch<any>,
  S extends BatchFormState = BatchFormState,
  V extends BatchValidatorService = BatchValidatorService,
  VO extends BatchValidatorOptions = BatchValidatorOptions
>
  extends MeasurementValuesForm<T, S>
  implements OnInit, OnDestroy, AfterViewInit {

  private _formValidatorSubscription: Subscription;
  private _formValidatorOpts: any;
  private _filter: BatchFilter;

  protected readonly _afterViewInitialized$ = this._state.select('afterViewInitialized');
  protected _initialPmfms: IPmfm[];
  protected _formPmfms: IPmfm[];
  protected _disableByDefaultControls: AbstractControl[] = [];
  protected _pmfmNamePipe: PmfmNamePipe;

  readonly hasContent$ = this._state.select('hasContent');

  taxonNameFilter: any;

  @Input() mobile: boolean;
  @Input() tabindex: number;
  @Input() usageMode: UsageMode;
  @Input() showTaxonGroup = true;
  @Input() showTaxonName = true;
  @Input() showError = true;
  @Input() availableTaxonGroups: IReferentialRef[] | Observable<IReferentialRef[]>;
  @Input() maxVisibleButtons: number;
  @Input() maxItemCountForButtons: number;
  @Input() i18nSuffix: string;
  @Input() set samplingRatioFormat(value: SamplingRatioFormat) {
    this._state.set('samplingRatioFormat', _ => value);
  }
  get samplingRatioFormat(): SamplingRatioFormat {
    return this._state.get('samplingRatioFormat');
  }

  @Input() set pmfmFilter(value: Partial<DenormalizedPmfmFilter>) {
    this._state.set('pmfmFilter', _ => value);
  }
  get pmfmFilter(): Partial<DenormalizedPmfmFilter> {
    return this._state.get('pmfmFilter');
  }

  @Input() set showWeight(value: boolean) {
    this._state.set('showWeight', _ => value);
  }

  get showWeight(): boolean {
    return this._state.get('showWeight');
  }

  @Input() set showEstimatedWeight(value: boolean) {
    this._state.set('showEstimatedWeight', _ => value);
  }

  get showEstimatedWeight(): boolean {
    return this._state.get('showEstimatedWeight');
  }

  @Input() set showExhaustiveInventory(value: boolean) {
    this._state.set('showExhaustiveInventory', _ => value);
  }

  get showExhaustiveInventory(): boolean {
    return this._state.get('showExhaustiveInventory');
  }

  @Input()
  set requiredWeight(value: boolean) {
    this._state.set('requiredWeight', _ => value);
  }

  get requiredWeight(): boolean {
    return this._state.get('requiredWeight');
  }

  @Input()
  set showIndividualCount(value: boolean) {
    this._state.set('showIndividualCount', _ =>value);
  }

  get showIndividualCount(): boolean {
    return this._state.get('showIndividualCount');
  }

  @Input()
  set requiredIndividualCount(value: boolean) {
    this._state.set('requiredIndividualCount', _ =>value);
  }

  get requiredIndividualCount(): boolean {
    return this._state.get('requiredIndividualCount');
  }

  @Input() set showChildrenWeight(value: boolean) {
    this._state.set('showChildrenWeight', _ => value);
  }
  get showChildrenWeight(): boolean {
    return this._state.get('showChildrenWeight');
  }

  @Input() set showSamplingBatch(value: boolean) {
    this._state.set('showSamplingBatch', _ => value);
  }
  get showSamplingBatch(): boolean {
    return this._state.get('showSamplingBatch');
  }

  @Input()
  set showSampleWeight(value: boolean) {
    this._state.set('showSampleWeight', _ =>value);
  }

  get showSampleWeight(): boolean {
    return this._state.get('showSampleWeight');
  }

  @Input()
  set requiredSampleWeight(value: boolean) {
    this._state.set('requiredSampleWeight', _ => value);
  }

  get requiredSampleWeight(): boolean {
    return this._state.get('requiredSampleWeight');
  }

  @Input()
  set showSampleIndividualCount(value: boolean) {
    this._state.set('showSampleIndividualCount', _ =>value);
  }

  get showSampleIndividualCount(): boolean {
    return this._state.get('showSampleIndividualCount');
  }

  @Input()
  set requiredSampleIndividualCount(value: boolean) {
    this._state.set('requiredSampleIndividualCount', _ =>value);
  }

  get requiredSampleIndividualCount(): boolean {
    return this._state.get('requiredSampleIndividualCount');
  }

  @Input()
  set samplingBatchEnabled(value: boolean) {
    this._state.set('samplingBatchEnabled', _ => value);
  }

  get samplingBatchEnabled(): boolean {
    return this._state.get('samplingBatchEnabled');
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

  get childrenFormArray(): AppFormArray<Batch, UntypedFormGroup> {
    return this.form.controls.children as AppFormArray<Batch, UntypedFormGroup>;
  }

  get samplingBatchForm(): UntypedFormGroup {
    return this.childrenFormArray?.at(0) as UntypedFormGroup;
  }

  get weightForm(): UntypedFormGroup {
    return this.form.get('weight') as UntypedFormGroup;
  }

  get hasAvailableTaxonGroups() {
    return isNotNil(this.availableTaxonGroups) && (!Array.isArray(this.availableTaxonGroups) || this.availableTaxonGroups.length > 0);
  }

  get touched(): boolean {
    return this.form?.touched;
  }

  get afterViewInitialized(): boolean {
    return this._state.get('afterViewInitialized');
  }

  disable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.disable(opts);
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }): void {
    super.enable(opts);

    // Refresh sampling child form
    if (this.samplingBatchEnabled) {
      this.enableSamplingBatch(opts);
    }
    else {
      this.disableSamplingBatch(opts);
    }

    // Refresh weight form
    if (this.showWeight) {
      this.enableWeightFormGroup(opts);
    } else {
      this.disableWeightFormGroup(opts);
    }

    // Other field to disable by default (e.g. discard reason, in SUMARiS program)
    this._disableByDefaultControls.forEach(c => c.disable(opts));
  }

  constructor(
    injector: Injector,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService,
    protected referentialRefService: ReferentialRefService,
    @Inject(BATCH_VALIDATOR) protected validatorService: V,
    @Inject(BATCH_VALIDATOR_OPTIONS_TOKEN) @Optional() validatorOptions?: VO
  ) {
    super(injector,
      measurementsValidatorService,
      formBuilder,
      programRefService,
      validatorService.getFormGroup(null, {
        withWeight: true,
        rankOrderRequired: false, // Allow to be set by parent component
        labelRequired: false, // Allow to be set by parent component
        withChildren: true, // Will create a AppFormArray for children
        ...validatorOptions,
        childrenOptions: {
          rankOrderRequired: false,
          labelRequired: false,
          withChildrenWeight: true, // Create the children (sum) weight
          ...validatorOptions?.childrenOptions
        }
      }),
      {
        mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        onUpdateFormGroup: (form) => this.onUpdateFormGroup(form)
      });
    this._pmfmNamePipe = injector.get(PmfmNamePipe);
    this.errorTranslatorOptions = {separator: '<br/>', controlPathTranslator: this};

    // Set defaults
    this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
    this._state.set((state) => ({
      ...state,
      acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH,
      pmfmFilter: null,
      showWeight: isNotNil(this.form.get('weight.value')),
      showChildrenWeight: isNotNil(this.form.get('childrenWeight'))
    }));

    // Make sure to have a resizable array for children
    if (!(this.form.get('children') instanceof AppFormArray)) {
      console.warn(this._logPrefix + 'Create a new AppFormArray for children, using options:', validatorOptions?.childrenOptions);
      this.form.setControl('children', this.validatorService.getChildrenFormArray(null, {
        ...validatorOptions?.childrenOptions
      }));
    }

    // for DEV only
    //this.debug = !environment.production;
  }

  ngOnInit() {

    // Default values
    this.mobile = isNotNil(this.mobile) ? this.mobile : this.settings.mobile;
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
    this.showWeight = toBoolean(this.showWeight, true);
    this.requiredWeight = toBoolean(this.requiredWeight, false);
    this.requiredIndividualCount = toBoolean(this.requiredIndividualCount, false);
    this.showIndividualCount = toBoolean(this.showIndividualCount, false);
    this.showChildrenWeight = toBoolean(this.showChildrenWeight, false);
    this.showSampleWeight = toBoolean(this.showSampleWeight, this.showWeight);
    this.showSampleIndividualCount = toBoolean(this.showSampleIndividualCount, false);
    this.requiredSampleWeight = toBoolean(this.requiredSampleWeight, false);
    this.showExhaustiveInventory = toBoolean(this.showExhaustiveInventory, false);
    this.samplingRatioFormat = this.samplingRatioFormat || ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;

    // Inherited. WARN will enable the form
    super.ngOnInit();

    // When pmfm filter change, re-apply initial pmfms
    this._state.hold(this._state.select('pmfmFilter')
      .pipe(
        // DEBUG
        //tap(pmfmFilter => console.debug(this._logPrefix + 'pmfmFilter changes', pmfmFilter)),

        filter(_ => this.enabled && !this.loading)
      ),
      _ => this.setPmfms(this._initialPmfms)
    );

    // Update form if need
    this._state.hold(this._state.select(['showWeight', 'requiredWeight',
        'showSamplingBatch', 'requiredSampleWeight',
        'requiredIndividualCount', 'showChildrenWeight'], res => res)
        .pipe(
          filter(_ => !this.loading), // Skip when loading
          //debounceTime(450), // Avoid to many call, when many attributes changes
          // DEBUG
          //tap(() => console.debug(this._logPrefix + "Some input changes: will update form..."))
        ),
      (_) => this.onUpdateFormGroup()
    );

    // Has content ?
    this._state.connect('hasContent', this.listenHasContent());

    // Listen samplingBatchEnabled, to enable/disable sampling form
    this._state.hold(this._state.select('samplingBatchEnabled')
        .pipe(
          filter(_ => this.enabled && !this.loading),
          distinctUntilChanged()
        ),
      samplingBatchEnabled => {
        if (samplingBatchEnabled) this.enableSamplingBatch()
        else this.disableSamplingBatch();
      });

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
    this._state.set('afterViewInitialized', _ => true);
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  applyState(state: Partial<BatchFormState>) {
    this._state.set(oldState => ({
      ...oldState,
      ...state,
      // Keep some protected inputs
      pmfms: oldState.pmfms
    }));

    this.ready$
    // Apply pmfms
    if (state?.pmfms) {
      this.setPmfms(state?.pmfms);
    }
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
      const pmfm = (this._initialPmfms || []).find(p => p.id === pmfmId);
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
      case 'children.0.individualCount':
        fieldName = 'SAMPLING_INDIVIDUAL_COUNT';
        break;
      case 'children.0.samplingRatio':
        fieldName = this.samplingRatioFormat === '1/w' ? 'SAMPLING_COEFFICIENT' : 'SAMPLING_RATIO_PCT';
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
    const defaultWeightPmfm = this.defaultWeightPmfm;
    const weightPmfms = this.weightPmfms;
    const childrenFormArray = this.childrenFormArray;

    // Fill weight, if a weight PMFM exists
    if (defaultWeightPmfm && this.showWeight) {
      data.weight = BatchUtils.getWeight(data, weightPmfms) || <BatchWeight>{
        value: null,
        methodId: defaultWeightPmfm.methodId,
        computed: defaultWeightPmfm.isComputed,
        estimated: defaultWeightPmfm.methodId === MethodIds.ESTIMATED_BY_OBSERVER
      };

      // Clean all weight values and control (to keep only the weight form group)
      weightPmfms?.forEach(p => {
        delete data.measurementValues[p.id.toString()];
        this.form.removeControl(p.id.toString());
      });
    }

    // No weight PMFM : disable weight form group, if exists (will NOT exists in BatchGroupForm sub classe)
    else {
      // Disable weight (if form group exists)
      this.disableWeightFormGroup(opts);
    }

    // Adapt measurement values to form
    if (!opts || opts.normalizeEntityToForm !== false) {
      // IMPORTANT: applying normalisation of measurement values on ALL pmfms (not only displayed pmfms)
      // This is required by the batch-group-form component, to keep the value of hidden PMFM, such as Landing/Discard Pmfm
      MeasurementValuesUtils.normalizeEntityToForm(data, this._formPmfms, this.form);
    }

    if (this.showSamplingBatch) {

      childrenFormArray.resize(1, opts);
      const samplingFormGroup = childrenFormArray.at(0) as UntypedFormGroup;
      const samplingBatch = BatchUtils.getOrCreateSamplingChild(data);

      // Force isSampling=true, if sampling batch it NOT empty
      this.samplingBatchEnabled = toBoolean(this.samplingBatchEnabled, BatchUtils.isSamplingNotEmpty(samplingBatch));

      // Read child weight (use the first one)
      if (defaultWeightPmfm) {
        samplingBatch.weight = BatchUtils.getWeight(samplingBatch, weightPmfms);

        // Adapt measurement values to form
        MeasurementValuesUtils.normalizeEntityToForm(samplingBatch, [], samplingFormGroup);
      }

      // Convert sampling ratio
      //samplingBatch.samplingRatio = BatchUtils.getSamplingRatio(samplingBatch, this.samplingRatioType);
      /*if (isNotNil(samplingBatch.samplingRatio)) {
        BatchUtils.normalizedSamplingRatioToForm(samplingBatch, this.samplingRatioType);
      }*/

    }

    // No sampling batch
    else {
      childrenFormArray.resize((data.children || []).length, opts);
      childrenFormArray.disable(opts);
    }

    // Call inherited function
    await super.updateView(data, {
      ...opts,
      normalizeEntityToForm: false // Already normalized (see upper)
    });
  }

  protected updateViewState(opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    super.updateViewState(opts);
  }

  protected getValue(): T {
    if (!this.data) return undefined;
    const json = this.form.value;
    const data = this.data;
    const weightPmfms = this.weightPmfms;
    const weightPmfmsByMethod = this.weightPmfmsByMethod;

    // Get existing measurements
    const measurementValues = data.measurementValues || {};


    // Clean previous all weights
    weightPmfms?.forEach(p => measurementValues[p.id.toString()] = undefined);

    // Convert weight into measurement
    const totalWeight = this.defaultWeightPmfm && json.weight?.value;
    if (isNotNil(totalWeight)) {
      const totalWeightPmfm = BatchUtils.getWeightPmfm(json.weight, weightPmfms, weightPmfmsByMethod);
      json.measurementValues = {
        ...json.measurementValues,
        [totalWeightPmfm.id.toString()]: totalWeight
      };
    }

    // Convert measurements
    json.measurementValues = {
      ...measurementValues,
      ...MeasurementValuesUtils.normalizeValuesToModel(json.measurementValues, this._initialPmfms)
    };

    if (this.showSamplingBatch) {

      if (this.samplingBatchEnabled) {
        const child = BatchUtils.getOrCreateSamplingChild(data);
        const childJson = json.children && json.children[0] || {};

        childJson.rankOrder = 1;
        childJson.label = json.label && (json.label + Batch.SAMPLING_BATCH_SUFFIX) || undefined;

        childJson.measurementValues = childJson.measurementValues || {};

        // Clean existing weights
        weightPmfms?.forEach(p => childJson.measurementValues[p.id.toString()] = undefined);
        // Convert weight into measurement
        if (isNotNil(childJson.weight?.value)) {
          const childWeightPmfm = BatchUtils.getWeightPmfm(childJson.weight, weightPmfms, weightPmfmsByMethod);
          childJson.measurementValues[childWeightPmfm.id.toString()] = childJson.weight.value;
        }

        // Convert measurements
        childJson.measurementValues = Object.assign({},
          child.measurementValues,  // Keep existing extra measurements
          MeasurementValuesUtils.normalizeValuesToModel(childJson.measurementValues, weightPmfms));

        // Special case: when sampling on individual count only (e.g. RJB - Pocheteau)
        if (!this.showWeight && isNotNil(childJson.individualCount) && isNotNil(json.individualCount)) {
          console.debug(this._logPrefix + 'Computing samplingRatio, using individualCount (e.g. special case for species without weight)');
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

  /**
   * Compute 'hasContent' value, from other inputs
   * @protected
   */
  protected listenHasContent(): Observable<boolean> {
    return this._state.select([
      'showWeight', 'weightPmfms', 'pmfms',
      'showIndividualCount', 'showSampleIndividualCount',
      'showSamplingBatch',
    ], state => (state.showWeight && isNotEmptyArray(state.weightPmfms))
          || isNotEmptyArray(state.pmfms)
          || state.showIndividualCount || state.showSampleIndividualCount
          || state.showSamplingBatch || this.showTaxonGroup || this.showTaxonName);
  }


  protected async enableSamplingBatch(opts?: { emitEvent?: boolean }) {
    const array = this.childrenFormArray;
    if (!array || array.enabled) return; // Skip if absent

    array.enable(opts);
    await this.enableWeightsComputation();
  }

  protected disableSamplingBatch(opts?: { emitEvent?: boolean }) {
    const array = this.childrenFormArray;
    if (!array) return;

    array.disable(opts);
    this.disableSamplingWeightComputation();
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
  protected waitViewInit(): Promise<void> {
    if (this.afterViewInitialized) return;
    return firstTruePromise(this._afterViewInitialized$, {stop: this.destroySubject});
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

    // dispatch pmfms, and return partial state
    const state = await this.dispatchPmfms(pmfms);

    this._state.set(state);

    return state.pmfms;

  }

  protected async dispatchPmfms(pmfms: IPmfm[]): Promise<Partial<S>> {
    if (!pmfms) return; // Skip

    // DEBUG
    console.debug(this._logPrefix + ' Dispatching pmfms...', pmfms);

    // Read weight PMFMs
    let weightPmfms = pmfms.filter(p => PmfmUtils.isWeight(p));

    // Exclude weight (because we use special fields for weights)
    // or hidden PMFMs
    const notWeightPmfms = pmfms.filter(p => !weightPmfms.includes(p));
    const visiblePmfms = notWeightPmfms.filter(p => !p.hidden);

    // Fix weight pmfms
    weightPmfms = weightPmfms.map(p => {
        if (isNil(p.methodId) || p.required) {
          p = p.clone();
          // Fill methodId (need by the map 'weightPmfmsByMethod')
          p.methodId = toNumber(p.methodId, MethodIds.OBSERVED_BY_OBSERVER);
          // Required will be managed by validator, and template, using the @Input 'requiredWeight'
          p.required = false;
        }
        return p;
      });
    const defaultWeightPmfm = firstArrayValue(weightPmfms);
    const weightPmfmsByMethod = splitByProperty(weightPmfms, 'methodId');

    // Hide sampling batch, if no weight pmfm
    const showSamplingBatch = toBoolean(this.showSamplingBatch, isNotNil(defaultWeightPmfm));

    this._formPmfms = weightPmfms.concat(notWeightPmfms);

    return <Partial<S>>{
      showSamplingBatch,
      weightPmfms,
      defaultWeightPmfm,
      showWeight: !!defaultWeightPmfm,
      showEstimatedWeight: !!weightPmfmsByMethod[MethodIds.ESTIMATED_BY_OBSERVER],
      weightPmfmsByMethod,
      //hasContent: pmfms.length > 0 || weightPmfms.length > 0,
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
        this.measurementsValidatorService.updateFormGroup(measFormGroup, {pmfms: this._formPmfms, emitEvent: false});
      }

      const childrenFormArray = this.childrenFormArray;
      const hasSamplingForm = childrenFormArray?.length === 1 && this.defaultWeightPmfm && true;

      // If the sample batch exists
      if (this.showSamplingBatch) {

        childrenFormArray.resize(1);
        const samplingForm = childrenFormArray.at(0) as UntypedFormGroup;

        // Reset measurementValues (if exists)
        const samplingMeasFormGroup = samplingForm.get('measurementValues');
        if (samplingMeasFormGroup) {
          this.measurementsValidatorService.updateFormGroup(samplingMeasFormGroup as UntypedFormGroup, {pmfms: []});
        }

        // Adapt exists sampling child, if any
        if (this.data) {
          const samplingChildBatch = BatchUtils.getOrCreateSamplingChild(this.data);
          this.samplingBatchEnabled = toBoolean(this.samplingBatchEnabled, BatchUtils.isSamplingNotEmpty(samplingChildBatch));

        } else {
          // No data: disable sampling
          this.samplingBatchEnabled = toBoolean(this.samplingBatchEnabled, false);
        }

        // Update form validators
        this.validatorService.updateFormGroup(this.form, {
          withWeight: this.showWeight,
          weightRequired: this.requiredWeight,
          individualCountRequired: this.requiredIndividualCount,
          withChildrenWeight: this.showChildrenWeight
        });
        this.markForCheck();

        // Has sample batch, and weight is enable
        await this.enableWeightsComputation();
      }

      // Remove existing sample, if exists but showSample=false
      else if (hasSamplingForm) {
        childrenFormArray.resize(0);

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
    const weightForm = this.weightForm;
    if (!weightForm || weightForm.enabled) return;
    weightForm.enable(opts);
  }

  protected disableWeightFormGroup(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    const weightForm = this.weightForm;
    if (!weightForm || weightForm.disabled) return;
    weightForm.disable(opts);
  }

  protected disableSamplingWeightComputation() {
    this._formValidatorSubscription?.unsubscribe();
  }

  protected async enableWeightsComputation() {

    if (!this.showWeight || !this.samplingBatchEnabled || !this.showSamplingBatch) {
      // Unregister to previous validator
      this._formValidatorSubscription?.unsubscribe();
      return;
    }

    // Make sure required attribute have been set
    if (!this.samplingRatioFormat || !this.defaultWeightPmfm) {
      // Wait 2s
      await waitFor(() => !!this.samplingRatioFormat && !!this.defaultWeightPmfm, {timeout: 2000, stopError: false});

      // Stop if not found
      if (!this.samplingRatioFormat || !this.defaultWeightPmfm) {
        console.warn(this._logPrefix + 'Missing samplingRatioFormat or weight Pmfm. Skipping sampling ratio and weight computation');
        return;
      }
    }

    const opts = {
      requiredSampleWeight: this.requiredSampleWeight,
      requiredIndividualCount: this.requiredIndividualCount,
      samplingRatioFormat: this.samplingRatioFormat,
      weightMaxDecimals: this.defaultWeightPmfm?.maximumNumberDecimals,
      debounceTime: this.mobile ? 650 : 0
    };

    // Skip if unchanged
    if (equals(opts, this._formValidatorOpts)) return;

    // Unregister to previous validator
    this._formValidatorSubscription?.unsubscribe();
    this._formValidatorOpts = opts;

    // Create a sampling form validator
    const subscription = this.validatorService.enableSamplingRatioAndWeight(this.form, {
      ...this._formValidatorOpts,
      markForCheck: () => this.markForCheck()
    });

    // Register subscription
    this._formValidatorSubscription = subscription;
    this.registerSubscription(this._formValidatorSubscription);
    subscription.add(() => {
      this.unregisterSubscription(subscription);
      this._formValidatorSubscription = null;
      this._formValidatorOpts = null;
    })
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
