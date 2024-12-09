import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { Batch } from '../common/batch.model';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { AbstractControl, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { SubBatchValidatorService } from './sub-batch.validator';
import {
  AppFloatLabelType,
  AppFormUtils,
  EntityUtils,
  focusNextInput,
  focusPreviousInput,
  GetFocusableInputOptions,
  getPropertyByPath,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  LoadResult,
  ReferentialUtils,
  SharedValidators,
  startsWithUpperCase,
  toBoolean,
  toNumber,
  UsageMode,
} from '@sumaris-net/ngx-components';
import {
  debounceTime,
  delay,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  map,
  mergeMap,
  skip,
  startWith,
  takeUntil,
  tap,
} from 'rxjs/operators';
import {
  AcquisitionLevelCodes,
  LengthUnitSymbol,
  MethodIds,
  PmfmIds,
  QualitativeLabels,
  WeightUnitSymbol,
} from '@app/referential/services/model/model.enum';
import { combineLatest, from, Observable, Subject, Subscription } from 'rxjs';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { PmfmFormField } from '@app/referential/pmfm/field/pmfm.form-field.component';
import { SubBatch } from './sub-batch.model';
import { BatchGroup, BatchGroupUtils } from '../group/batch-group.model';
import { TranslateService } from '@ngx-translate/core';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { environment } from '@environments/environment';
import { IonButton } from '@ionic/angular';
import { IchthyometerService } from '@app/shared/ichthyometer/ichthyometer.service';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { MeasurementsFormState } from '@app/data/measurement/measurements.utils';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';

export interface SubBatchFormState extends MeasurementsFormState {
  computingWeight: boolean;
  showTaxonName: boolean;
  taxonNames: TaxonNameRef[];
  qvPmfm: IPmfm;
}
@Component({
  selector: 'app-sub-batch-form',
  templateUrl: 'sub-batch.form.html',
  styleUrls: ['sub-batch.form.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubBatchForm extends MeasurementValuesForm<SubBatch, SubBatchFormState> implements OnInit, OnDestroy {
  protected _availableParents: BatchGroup[] = [];
  protected _parentAttributes: string[];
  protected _disableByDefaultControls: AbstractControl[] = [];
  protected _weightConversionSubscription: Subscription;

  @RxStateSelect() protected showTaxonName$: Observable<boolean>;
  @RxStateSelect() protected taxonNames$: Observable<TaxonNameRef[]>;
  @RxStateSelect() protected computingWeight$: Observable<boolean>;

  enableIndividualCountControl: UntypedFormControl;
  freezeTaxonNameControl: UntypedFormControl;
  freezeQvPmfmControl: UntypedFormControl;
  freezeQvPmfmsControl: UntypedFormControl;
  selectedTaxonNameIndex = -1;
  warning: string;
  weightPmfm: IPmfm;
  enableLengthWeightConversion: boolean;

  @RxStateProperty() taxonNames: TaxonNameRef[];

  @Input() title: string;
  @Input() showParentGroup = true;
  @Input() showIndividualCount = true;
  @Input() showError = true;
  @Input() showWarning = true;
  @Input() showSubmitButton = true;
  @Input() displayParentPmfm: IPmfm;
  @Input() isNew: boolean;
  @Input() tabindex: number;
  @Input() floatLabel: AppFloatLabelType = 'auto';
  @Input() usageMode: UsageMode;
  @Input() maxVisibleButtons: number;
  @Input() buttonsColCount: number;
  @Input() maxItemCountForButtons: number;
  @Input() i18nSuffix: string;
  @Input() mobile: boolean;
  @Input() weightDisplayedUnit: WeightUnitSymbol;
  @Input() onNewParentClick: () => Promise<BatchGroup | undefined>;
  @Input() @RxStateProperty() showTaxonName: boolean;
  @Input() @RxStateProperty() qvPmfm: IPmfm;

  @Input() set availableParents(value: BatchGroup[]) {
    if (this._availableParents !== value) {
      this.setAvailableParents(value);
    }
  }

  get availableParents(): BatchGroup[] {
    return this._availableParents;
  }

  get enableIndividualCount(): boolean {
    return this.enableIndividualCountControl.value;
  }

  get freezeTaxonName(): boolean {
    return this.freezeTaxonNameControl.value;
  }

  @Input() set freezeTaxonName(value: boolean) {
    this.freezeTaxonNameControl.setValue(value);
    if (!value) {
      this.form.get('taxonName').reset(null);
    }
  }

  get freezeQvPmfm(): boolean {
    return this.freezeQvPmfmControl.value;
  }

  @Input() set freezeQvPmfm(value: boolean) {
    this.freezeQvPmfmControl.setValue(value);
    if (!value) {
      this.form.get('measurements.' + this.qvPmfm.id).reset(null);
    }
  }

  @Input() showFreezeQvPmfms = false;

  get freezeQvPmfms(): boolean {
    return this.freezeQvPmfmsControl.value;
  }

  get parentGroup(): any {
    return this.form.controls.parentGroup.value;
  }

  @Input()
  set parentGroup(value: any) {
    this.form.controls.parentGroup.setValue(value);
  }

  @ViewChildren(PmfmFormField) measurementFormFields: QueryList<PmfmFormField>;
  @ViewChildren('inputField') inputFields: QueryList<ElementRef>;
  @ViewChild('submitButton') submitButton: IonButton;

  get computingWeight(): boolean {
    return this._state.get('computingWeight');
  }

  set computingWeight(value: boolean) {
    this._state.set('computingWeight', (_) => value);
  }

  constructor(
    injector: Injector,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService,
    protected validatorService: SubBatchValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected ichthyometerService: IchthyometerService,
    protected translate: TranslateService
  ) {
    super(
      injector,
      measurementsValidatorService,
      formBuilder,
      programRefService,
      validatorService.getFormGroup(null, {
        rankOrderRequired: false, // Avoid to have form.invalid, in Burst mode
      }),
      {
        mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        onUpdateFormGroup: (form) => this.onUpdateControls(form),
      }
    );
    // Remove required label/rankOrder
    this.form.controls.label.setValidators(null);
    this.form.controls.rankOrder.setValidators(null);

    // Set default values
    this.mobile = this.settings.mobile;
    this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL;
    this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';

    // Control for indiv. count enable
    this.enableIndividualCountControl = this.formBuilder.control(false, Validators.required);
    this.enableIndividualCountControl.setValue(false, { emitEvent: false });

    // Freeze QV value control
    this.freezeQvPmfmControl = this.formBuilder.control(true, Validators.required);
    this.freezeQvPmfmControl.setValue(true, { emitEvent: false });

    this.freezeTaxonNameControl = this.formBuilder.control(!this.mobile, Validators.required);

    this.freezeQvPmfmsControl = this.formBuilder.control(false, Validators.required);

    // Listen pending status
    this._state.connect(
      'computingWeight',
      this.form.statusChanges.pipe(
        map((status) => status === 'PENDING'),
        filter((v) => v === true)
      )
    );

    // For DEV only
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    // Default values
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
    this.isNew = toBoolean(this.isNew, false);
    this.maxVisibleButtons = toNumber(this.maxVisibleButtons, 4);
    this.freezeTaxonNameControl.setValue(!this.mobile, { emitEvent: false });

    // Get display attributes for parent
    this._parentAttributes = this.settings
      .getFieldDisplayAttributes('taxonGroup')
      .map((attr) => 'taxonGroup.' + attr)
      .concat(!this.showTaxonName ? this.settings.getFieldDisplayAttributes('taxonName').map((attr) => 'taxonName.' + attr) : []);

    // Parent combo
    const parentControl = this.form.get('parentGroup');
    this.registerAutocompleteField('parentGroup', {
      suggestFn: (value: any, options?: any) => this.suggestParents(value, options),
      attributes: ['rankOrder'].concat(this._parentAttributes),
      showAllOnFocus: true,
      mobile: this.mobile,
    });

    // Taxon name
    const taxonNameControl = this.form.get('taxonName');
    this._state.hold(this.showTaxonName$, (showTaxonName) => {
      if (showTaxonName) {
        // Add required validator on TaxonName
        taxonNameControl.enable();
        taxonNameControl.setValidators([SharedValidators.entity, Validators.required]);
      } else {
        taxonNameControl.disable();
        taxonNameControl.setValidators(null);
      }
    });

    this.registerAutocompleteField('taxonName', {
      items: this.taxonNames$,
      mobile: this.mobile,
    });

    // Fill taxon names, from the parent changes
    if (this.showTaxonName) {
      // Mobile
      if (this.mobile) {
        // Compute taxon names when parent has changed
        let currentParentLabel: string;
        this._state.connect(
          'taxonNames',
          parentControl.valueChanges.pipe(
            filter((parent) => isNotNilOrBlank(parent?.label) && currentParentLabel !== parent.label),
            distinctUntilKeyChanged('label'),
            mergeMap(() => this.suggestTaxonNames()),
            map(({ data }) => data)
          )
        );

        this.waitIdle()
          .then(() => {
            // Init the value on form when there is only 1 value because the input is hidden and never set
            this.registerSubscription(
              this.taxonNames$.pipe(filter((values) => values?.length === 1)).subscribe((values) => {
                taxonNameControl.setValue(values[0], { emitEvent: false });
              })
            );

            // Update taxonName when need
            let lastTaxonName: TaxonNameRef;
            this.registerSubscription(
              combineLatest([this.taxonNames$, taxonNameControl.valueChanges.pipe(tap((v) => (lastTaxonName = v)))])
                .pipe(filter(([items, value]) => isNotNil(items)))
                .subscribe(([items, value]) => {
                  let index = -1;
                  // Compute index in list, and get value
                  if (items && items.length === 1) {
                    index = 0;
                  } else if (ReferentialUtils.isNotEmpty(lastTaxonName)) {
                    index = items.findIndex((v) => TaxonNameRef.equalsOrSameReferenceTaxon(v, lastTaxonName));
                  }
                  const newTaxonName: TaxonNameRef = index !== -1 ? items[index] : null;

                  // Apply to form, if need
                  if (!ReferentialUtils.equals(lastTaxonName, newTaxonName)) {
                    taxonNameControl.setValue(newTaxonName, { emitEvent: false });
                    lastTaxonName = newTaxonName;
                    this.markAsDirty();
                  }

                  // Apply to button index, if need
                  if (this.selectedTaxonNameIndex !== index) {
                    this.selectedTaxonNameIndex = index;
                    this.markForCheck();
                  }
                })
            );
          })
          .catch((err) => console.error(err));
      }

      // Desktop
      else {
        // Reset taxon name combo when parent changed
        this._state.connect(
          'taxonNames',
          parentControl.valueChanges.pipe(
            // Warn: skip the first trigger (ignore set value)
            skip(1),
            debounceTime(250),
            // Ignore changes if parent is not an entity (WARN: we use 'label' because id can be null, when not saved yet)
            filter((parent) => this.form.enabled && EntityUtils.isNotEmpty(parent, 'label')),
            distinctUntilChanged(Batch.equals),
            mergeMap(() => this.suggestTaxonNames()),
            map(({ data }) => data)
          )
        );

        this._state.hold(this.taxonNames$, (data) => {
          // Is only one value
          if (data.length === 1) {
            const defaultTaxonName = data[0];
            // Set the field
            taxonNameControl.patchValue(defaultTaxonName, { emitEVent: false });
            // Remember for next form reset
            this.data.taxonName = defaultTaxonName;
          } else {
            taxonNameControl.reset(null, { emitEVent: false });
            // Remember for next form reset
            this.data.taxonName = undefined;
          }
        });
      }
    }

    // Compute taxon names when parent has changed
    this.registerSubscription(
      parentControl.valueChanges
        .pipe(
          // Detected parent changes
          filter((parentGroup) => parentGroup && !BatchGroupUtils.equals(parentGroup, this.data?.parentGroup))
        )
        .subscribe((parentGroup) => {
          // Remember (for next values changes, or next form reset)
          this.data.parentGroup = parentGroup;

          // Update pmfms (it can depends on the selected parent's taxon group - see mapPmfm())
          if (!this.starting) this._onRefreshPmfms.emit();
        })
    );

    this.registerSubscription(
      this.enableIndividualCountControl.valueChanges.pipe(startWith<any>(this.enableIndividualCountControl.value)).subscribe((enable) => {
        const individualCountControl = this.form.get('individualCount');
        if (enable) {
          individualCountControl.enable();
          individualCountControl.setValidators([Validators.required, Validators.min(0)]);
        } else {
          individualCountControl.disable();
          individualCountControl.setValue(null);
        }
      })
    );

    // Force a pmfms reload when qvPmfm changed, in order by reapply mapPmfms
    this._state.connect(
      'initialPmfms',
      this._state.select('qvPmfm').pipe(
        filter(() => this.loaded),
        map(() => this.initialPmfms?.slice())
      )
    );

    // Listen icthyometer values
    if (this.mobile) {
      this.registerSubscription(this.listenIchthyometer());
    }

    this.ngInitExtension();
  }

  async doNewParentClick(event: Event) {
    if (!this.onNewParentClick) return; // No callback: skip
    const res = await this.onNewParentClick();

    if (res instanceof Batch) {
      this.form.get('parent').setValue(res);
    }
  }

  checkIfSubmit(event: FocusEvent | TouchEvent, submitButton?: IonButton): boolean {
    if (event?.defaultPrevented) return false;

    submitButton = submitButton || this.submitButton;
    if (event.currentTarget === submitButton['el']) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.returnValue = false;
      this.doSubmit(null);
      return false;
    }
    return true;
  }

  protected onApplyingEntity(data: SubBatch, opts?: { linkToParent?: boolean }) {
    super.onApplyingEntity(data);

    // Replace parent with value from availableParents
    if (!opts || opts.linkToParent !== false) {
      this.linkToParentGroup(data);
    }
  }

  protected async updateView(
    data: SubBatch,
    opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; linkToParent?: boolean }
  ) {
    // Reset taxon name button index
    if (this.mobile && data && data.taxonName && isNotNil(data.taxonName.id)) {
      this.selectedTaxonNameIndex = (this.taxonNames || []).findIndex((tn) => tn.id === data.taxonName.id);
    } else {
      this.selectedTaxonNameIndex = -1;
    }

    // Parent not found
    if (!data.parentGroup) {
      // Force to allow parent selection
      this.showParentGroup = this.showParentGroup || true;
    }

    // Inherited method
    await super.updateView(data, opts);
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }): void {
    super.enable(opts);

    if (!this.showTaxonName) {
      this.form.get('taxonName').disable(opts);
    }

    if (this.showIndividualCount && !this.enableIndividualCount) {
      this.form.get('individualCount').disable(opts);
    }

    // Other field to disable by default (e.g. discard reason, in SUMARiS program)
    this._disableByDefaultControls.forEach((c) => c.disable(opts));
  }

  onTaxonNameButtonClick(event: Event | undefined, taxonName: TaxonNameRef, minTabindex: number) {
    this.form.patchValue({ taxonName });
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.focusNextInput(null, { minTabindex });
  }

  focusFirstEmptyInput(event?: Event): boolean {
    return focusNextInput(event, this.inputFields, {
      excludeEmptyInput: true,
      minTabindex: -1,

      // DEBUG
      //debug: this.debug
    });
  }

  focusNextInput(event: Event, opts?: Partial<GetFocusableInputOptions>): boolean {
    // DEBUG
    //return focusNextInput(event, this.inputFields, opts{debug: this.debug, ...opts});

    return focusNextInput(event, this.inputFields, opts);
  }

  focusPreviousInput(event: Event, opts?: Partial<GetFocusableInputOptions>): boolean {
    // DEBUG
    // return focusPreviousInput(event, this.inputFields, {debug: this.debug, ...opts});

    return focusPreviousInput(event, this.inputFields, opts);
  }

  async focusNextInputOrSubmit(event: Event, isLastPmfm: boolean) {
    if (event.defaultPrevented) return; // Skip
    event.preventDefault();

    if (isLastPmfm) {
      if (this.enableIndividualCount) {
        // Focus to last (=individual count input)
        this.inputFields.last.nativeElement.focus();
        return true;
      }

      await this.doSubmit(null);
      return true;
    }

    return this.focusNextInput(event);
  }

  trySubmit(event: any, opts?: { checkValid?: boolean }): boolean {
    if (event?.defaultPrevented) return false;

    super.doSubmit(event, opts);

    return true;
  }

  doSubmit(event: any, opts?: { checkValid?: boolean }): Promise<void> {
    if (event?.defaultPrevented) {
      console.debug('[sub-batch-form] Cancel submit (event.defaultPrevented=true)');
      return;
    }

    return super.doSubmit(event, opts);
  }

  selectInputContent = AppFormUtils.selectInputContent;
  filterNumberInput = AppFormUtils.filterNumberInput;

  /* -- protected method -- */

  protected async ngInitExtension() {
    await this.ready();

    const discardOrLandingControl = this.form.get('measurementValues.' + PmfmIds.DISCARD_OR_LANDING);
    const discardReasonControl = this.form.get('measurementValues.' + PmfmIds.DISCARD_REASON);

    // Manage DISCARD_REASON validator
    if (discardOrLandingControl && discardReasonControl) {
      // Always disable by default, while discard/Landing not set
      this._disableByDefaultControls.push(discardReasonControl);

      this.registerSubscription(
        discardOrLandingControl.valueChanges
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

  protected setAvailableParents(value: BatchGroup[]) {
    this._availableParents = value;

    // DEBUG
    //console.debug('[sub-batch-form] setAvailableParents() ', value);

    // Reset  parentGroup control, if no more in the list
    if (!this.loading && this.showParentGroup) {
      const selectedParent = this.parentGroup;
      const selectedParentExists =
        selectedParent && (this._availableParents || []).findIndex((parent) => BatchGroup.equals(parent, this.parentGroup)) !== -1;
      if (selectedParent && !selectedParentExists) {
        this.form.patchValue({ parentGroup: null, taxonName: null });
      }
    }
  }

  protected async suggestParents(value: any, options?: any): Promise<Batch[]> {
    // Has select a valid parent: return the parent
    if (EntityUtils.isNotEmpty(value, 'label')) return [value];
    value = (typeof value === 'string' && value !== '*' && value) || undefined;
    if (isNilOrBlank(value)) return this._availableParents; // All
    const ucValueParts = value.trim().toUpperCase().split(' ', 1);
    if (this.debug) console.debug(`[sub-batch-form] Searching parent {${value || '*'}}...`);
    // Search on attributes
    return this._availableParents.filter(
      (parent) =>
        ucValueParts.filter(
          (valuePart) => this._parentAttributes.findIndex((attr) => startsWithUpperCase(getPropertyByPath(parent, attr), valuePart.trim())) !== -1
        ).length === ucValueParts.length
    );
  }

  protected async suggestTaxonNames(value?: any, options?: any): Promise<LoadResult<TaxonNameRef>> {
    const parentGroup = this.parentGroup;
    if (isNil(parentGroup)) return { data: [] };
    if (this.debug) console.debug(`[sub-batch-form] Searching taxon name {${value || '*'}}...`);
    return this.programRefService.suggestTaxonNames(value, {
      programLabel: this.programLabel,
      searchAttribute: options && options.searchAttribute,
      taxonGroupId: (parentGroup && parentGroup.taxonGroup && parentGroup.taxonGroup.id) || undefined,
    });
  }

  protected mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    let qvPmfm = this.qvPmfm;
    // Hide the QV pmfm
    if (qvPmfm) {
      const index = pmfms.findIndex((pmfm) => pmfm.id === qvPmfm.id);
      if (index !== -1) {
        qvPmfm = qvPmfm.clone();
        qvPmfm.hidden = true;
        qvPmfm.required = true;
        pmfms[index] = qvPmfm;
      } else {
        console.warn('Cannot found the QV Pmfm#' + qvPmfm.id);
      }
    }

    // If there is a parent: filter on parent's taxon group
    const parentTaxonGroupId = this.parentGroup?.taxonGroup?.id;
    if (isNotNil(parentTaxonGroupId)) {
      pmfms = pmfms.filter(
        (pmfm) => !PmfmUtils.isDenormalizedPmfm(pmfm) || isEmptyArray(pmfm.taxonGroupIds) || pmfm.taxonGroupIds.includes(parentTaxonGroupId)
      );
    }

    // Check weight-length conversion is enabled
    pmfms = pmfms.filter((pmfm) => {
      // If RTP weight: enable conversion, and hidden pmfms
      if (pmfm.id === PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH || pmfm.methodId === MethodIds.CALCULATED_WEIGHT_LENGTH) {
        this.enableLengthWeightConversion = true;
        if (this.weightDisplayedUnit) {
          pmfm = PmfmUtils.setWeightUnitConversion(pmfm, this.weightDisplayedUnit);
        }
        this.weightPmfm = pmfm;
        return false;
      }
      return true;
    });

    return pmfms;
  }

  protected async onUpdateControls(form: UntypedFormGroup): Promise<void> {
    const qvPmfm = this.qvPmfm;
    // If QV: must be required
    if (qvPmfm) {
      const measFormGroup = form.get('measurementValues') as UntypedFormGroup;
      const qvControl = measFormGroup.get(qvPmfm.id.toString());

      if (qvControl) {
        qvControl.setValidators(Validators.required);
      }
    }

    // Weight/length computation
    this._weightConversionSubscription?.unsubscribe();
    if (this.enableLengthWeightConversion) {
      // DEBUG
      if (this.debug) console.debug('[sub-batch-form] Enabling weight/length conversion...');

      try {
        const subscription = this.validatorService.enableWeightLengthConversion(form, {
          pmfms: this.pmfms,
          qvPmfm,
          parentGroup: !this.showParentGroup ? this.parentGroup : undefined /*will use parent control*/,
          onError: (err) => {
            this.warning = (err && err.message) || 'TRIP.SUB_BATCH.ERROR.WEIGHT_LENGTH_CONVERSION_FAILED';
            this.computingWeight = false;
            this.markForCheck();
          },
          markForCheck: () => (this.computingWeight = false),
          // DEBUG
          debug: this.debug,
        });

        if (subscription) {
          subscription.add(() => {
            this.unregisterSubscription(subscription);
            this._weightConversionSubscription = null;
          });
          this.registerSubscription(subscription);
          this._weightConversionSubscription = subscription;
        }
      } catch (err) {
        console.error('[sub-batch-form] Failed to enable weight/length conversion:', err);
      }
    }
  }

  getValue(): SubBatch {
    if (!this.form.dirty) return this.data;

    const json = this.form.value;

    // Read the individual count (if has been disable)
    if (!this.enableIndividualCount) {
      json.individualCount = this.form.get('individualCount').value || 1;
    }

    const measurementValuesForm = this.measurementValuesForm;

    // Adapt measurement values for entity
    if (measurementValuesForm) {
      const pmfms = this.pmfms || [];
      json.measurementValues = Object.assign(
        {},
        this.data.measurementValues || {}, // Keep additional PMFM values
        MeasurementValuesUtils.normalizeValuesToModel(measurementValuesForm.value, pmfms)
      );
    } else {
      json.measurementValues = {};
    }

    this.data.fromObject(json);

    return this.data;
  }

  protected linkToParentGroup(data?: SubBatch) {
    if (!data) return;

    // Find the parent
    const parentGroup = data.parentGroup;
    if (!parentGroup) return; // no parent = nothing to link

    data.parentGroup = (this._availableParents || []).find((p) => Batch.equals(p, parentGroup));

    // Get the parent of the parent (e.g. if parent is a sampling batch)
    if (data.parentGroup && data.parent && !data.parent.hasTaxonNameOrGroup && data.parent.parent && data.parent.parent.hasTaxonNameOrGroup) {
      data.parentGroup = BatchGroup.fromBatch(data.parent.parent);
    }
  }

  listenIchthyometer(): Subscription {
    const stopSubject = new Subject<void>();

    return combineLatest([this.ichthyometerService.enabled$, from(this.ready()), this.pmfms$])
      .pipe(
        filter(([enabled, _, __]) => enabled),
        // DEBUG
        //tap(pmfms => console.debug('[sub-batch-form] Looking for length pmfms: ' + JSON.stringify(pmfms))),
        mergeMap(([_, __, pmfms]) => {
          // Cancel previous watch
          stopSubject.next();

          // Collect all length fields
          const lengthFields = (pmfms || []).filter(PmfmUtils.isLength).reduce((res, pmfm) => {
            const control = this._measurementValuesForm.get(pmfm.id.toString());
            if (!control) return res; // No control: skip
            const unit = (pmfm.unitLabel || 'cm') as LengthUnitSymbol;
            const precision = PmfmUtils.getOrComputePrecision(pmfm, 0.000001); // 6 decimals by default
            return res.concat({ control, unit, precision });
          }, []);

          // No length pmfms found: stop here
          if (isEmptyArray(lengthFields)) {
            console.debug('[sub-batch-form] Cannot used ichthyometer: no length pmfm found');
            return;
          }
          console.debug(`[sub-batch-form] Start watching length from ichthyometer...`);
          return this.ichthyometerService.watchLength().pipe(
            takeUntil(stopSubject),
            map(({ value, unit }) => {
              console.debug(`[sub-batch-form] Receiving value: ${value} ${unit}`);

              // Find first length control enabled
              const lengthField = lengthFields.find((field) => field.control.enabled);

              if (lengthField) {
                // Convert value into the expected unit/precision
                const convertedValue = PmfmValueUtils.convertLengthValue(value, unit, lengthField.unit, lengthField.precision);

                // Apply converted value to control
                lengthField.control.setValue(convertedValue);

                // Try to submit the form (e.g. when only one control)
                this.trySubmit(null);
              }
            })
          );
        })
      )
      .subscribe();
  }
}
