import {ChangeDetectionStrategy, Component, ElementRef, Injector, Input, OnDestroy, OnInit, QueryList, ViewChildren} from '@angular/core';
import {Batch} from '../../services/model/batch.model';
import {MeasurementValuesForm} from '../../measurement/measurement-values.form.class';
import {MeasurementsValidatorService} from '../../services/validator/measurement.validator';
import {AbstractControl, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {ReferentialRefService} from '../../../referential/services/referential-ref.service';
import {SubBatchValidatorService} from '../../services/validator/sub-batch.validator';
import {
  AppFormUtils,
  EntityUtils, firstNotNilPromise,
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
  UsageMode
} from '@sumaris-net/ngx-components';
import { debounceTime, delay, distinctUntilChanged, filter, mergeMap, skip, startWith, tap } from 'rxjs/operators';
import { AcquisitionLevelCodes, ParameterLabelGroups, PmfmIds, QualitativeLabels } from '../../../referential/services/model/model.enum';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { MeasurementValuesUtils } from '../../services/model/measurement.model';
import { PmfmFormField } from '../../../referential/pmfm/pmfm.form-field.component';
import { SubBatch } from '../../services/model/subbatch.model';
import { BatchGroup, BatchGroupUtils } from '../../services/model/batch-group.model';
import { TranslateService } from '@ngx-translate/core';
import { FloatLabelType } from '@angular/material/form-field';
import { ProgramRefService } from '../../../referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '../../../referential/services/model/pmfm.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { environment } from '@environments/environment';


@Component({
  selector: 'app-sub-batch-form',
  templateUrl: 'sub-batch.form.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubBatchForm extends MeasurementValuesForm<SubBatch>
  implements OnInit, OnDestroy {

  protected _qvPmfm: IPmfm;
  protected _availableParents: BatchGroup[] = [];
  protected _parentAttributes: string[];
  protected _showTaxonName: boolean;
  protected _disableByDefaultControls: AbstractControl[] = [];
  protected _weightConversionSubscription: Subscription;

  mobile: boolean;
  enableIndividualCountControl: FormControl;
  freezeTaxonNameControl: FormControl;
  freezeQvPmfmControl: FormControl;
  $taxonNames = new BehaviorSubject<TaxonNameRef[]>(undefined);
  selectedTaxonNameIndex = -1;
  warning: string;

  @Input() title: string;
  @Input() showParentGroup = true;
  @Input() showIndividualCount = true;
  @Input() showError = true;
  @Input() showWarning = true;
  @Input() showSubmitButton = true;
  @Input() displayParentPmfm: IPmfm;
  @Input() enableWeightConversion: boolean;
  @Input() isNew: boolean;
  @Input() tabindex: number;
  @Input() floatLabel: FloatLabelType;
  @Input() usageMode: UsageMode;
  @Input() maxVisibleButtons: number;
  @Input() onNewParentClick: () => Promise<BatchGroup | undefined>;

  @Input() set showTaxonName(show) {
    this._showTaxonName = show;
    const taxonNameControl = this.form && this.form.get('taxonName');
    if (taxonNameControl) {
      if (show) {
        taxonNameControl.setValidators([SharedValidators.entity, Validators.required]);
      } else {
        taxonNameControl.setValidators(null);
      }
    }
  }

  get showTaxonName(): boolean {
    return this._showTaxonName;
  }

  get taxonNames(): TaxonNameRef[] {
    return this.$taxonNames.getValue();
  }

  @Input() set qvPmfm(value: IPmfm) {
    this._qvPmfm = value;
    // If already loaded, re apply pmfms, to be able to execute mapPmfms
    if (value && !this.loading) {
      this.setPmfms(this.$pmfms);
    }
  }

  get qvPmfm(): IPmfm {
    return this._qvPmfm;
  }

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

  get parentGroup(): any {
    return this.form.controls.parentGroup.value;
  }

  @Input()
  set parentGroup(value: any) {
    this.form.controls.parentGroup.setValue(value);
  }

  @ViewChildren(PmfmFormField) measurementFormFields: QueryList<PmfmFormField>;
  @ViewChildren('inputField') inputFields: QueryList<ElementRef>;

  constructor(
    injector: Injector,
    protected measurementValidatorService: MeasurementsValidatorService,
    protected formBuilder: FormBuilder,
    protected programRefService: ProgramRefService,
    protected validatorService: SubBatchValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected translate: TranslateService
  ) {
    super(injector, measurementValidatorService, formBuilder, programRefService,
      validatorService.getFormGroup(null, {
        rankOrderRequired: false, // Avoid to have form.invalid, in Burst mode
      }),
      {
        mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        onUpdateFormGroup: (form) => this.onUpdateControls(form)
      });
    // Remove required label/rankOrder
    this.form.controls.label.setValidators(null);
    this.form.controls.rankOrder.setValidators(null);

    this.mobile = this.settings.mobile;
    this._enable = false;

    // Set default values
    this._acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL;

    // Control for indiv. count enable
    this.enableIndividualCountControl = this.formBuilder.control(false, Validators.required);
    this.enableIndividualCountControl.setValue(false, {emitEvent: false});

    // Freeze QV value control
    this.freezeQvPmfmControl = this.formBuilder.control(true, Validators.required);
    this.freezeQvPmfmControl.setValue(true, {emitEvent: false});

    // Freeze taxon name value control (default: true if NOT mobile)
    this.freezeTaxonNameControl = this.formBuilder.control(!this.mobile, Validators.required);
    this.freezeTaxonNameControl.setValue(!this.mobile, {emitEvent: false});

    // For DEV only
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
    this.isNew = toBoolean(this.isNew, false);
    this.maxVisibleButtons = toNumber(this.maxVisibleButtons, 4);

    // Get display attributes for parent
    this._parentAttributes = this.settings.getFieldDisplayAttributes('taxonGroup').map(attr => 'taxonGroup.' + attr)
      .concat(!this.showTaxonName ? this.settings.getFieldDisplayAttributes('taxonName').map(attr => 'taxonName.' + attr) : []);

    // Parent combo
    const parentControl = this.form.get('parentGroup');
    this.registerAutocompleteField('parentGroup', {
      suggestFn: (value: any, options?: any) => this.suggestParents(value, options),
      attributes: ['rankOrder'].concat(this._parentAttributes),
      showAllOnFocus: true,
      mobile: this.mobile
    });

    // Taxon name
    const taxonNameControl = this.form.get('taxonName');
    if (this.showTaxonName) {
      // Add required validator on TaxonName
      taxonNameControl.setValidators([SharedValidators.entity, Validators.required]);
    }
    this.registerAutocompleteField('taxonName', {
      items: this.$taxonNames,
      mobile: this.mobile
    });

    // Fill taxon names, from the parent changes
    if (this.showTaxonName) {
      // Mobile
      if (this.mobile) {

        // Compute taxon names when parent has changed
        let currentParenLabel;
        this.registerSubscription(
          parentControl.valueChanges
            .pipe(
              filter(parent => isNotNilOrBlank(parent?.label) && currentParenLabel !== parent.label),
              tap(parent => currentParenLabel = parent.label),
              mergeMap((_) => this.suggestTaxonNames()),
              tap(({data}) => this.$taxonNames.next(data)) // Update taxon names
            )
            .subscribe());

        this.waitIdle().then(() => {

          // Init the value on form when there is only 1 value because the input is hidden and never set
          this.registerSubscription(this.$taxonNames.pipe(
            filter(values => values?.length === 1)
          ).subscribe(values => {
              taxonNameControl.setValue(values[0], {emitEvent: false});
            }
          ));

          // Update taxonName when need
          let lastTaxonName: TaxonNameRef;
          this.registerSubscription(
            combineLatest([
              this.$taxonNames,
              taxonNameControl.valueChanges.pipe(
                tap(v => lastTaxonName = v)
              )
            ])
              .pipe(
                filter(([items, value]) => isNotNil(items))
              )
              .subscribe(([items, value]) => {
                let newTaxonName: TaxonNameRef;
                let index = -1;
                // Compute index in list, and get value
                if (items && items.length === 1) {
                  index = 0;
                } else if (ReferentialUtils.isNotEmpty(lastTaxonName)) {
                  index = items.findIndex(v => TaxonNameRef.equalsOrSameReferenceTaxon(v, lastTaxonName));
                }
                newTaxonName = (index !== -1) ? items[index] : null;

                // Apply to form, if need
                if (!ReferentialUtils.equals(lastTaxonName, newTaxonName)) {
                  taxonNameControl.setValue(newTaxonName, {emitEvent: false});
                  lastTaxonName = newTaxonName;
                  this.markAsDirty();
                }

                // Apply to button index, if need
                if (this.selectedTaxonNameIndex !== index) {
                  this.selectedTaxonNameIndex = index;
                  this.markForCheck();
                }
              }));
        });
      }

      // Desktop
      else {

        // Reset taxon name combo when parent changed
        this.registerSubscription(
          parentControl.valueChanges
            .pipe(
              // Warn: skip the first trigger (ignore set value)
              skip(1),
              debounceTime(250),
              // Ignore changes if parent is not an entity (WARN: we use 'label' because id can be null, when not saved yet)
              filter(parent => this.form.enabled && EntityUtils.isNotEmpty(parent, 'label')),
              distinctUntilChanged(Batch.equals),
              mergeMap(() => this.suggestTaxonNames())
            )
            .subscribe(({data}) => {
              // Update taxon names
              this.$taxonNames.next(data);

              // Is only one value
              if (data.length === 1) {
                const defaultTaxonName = data[0];
                // Set the field
                taxonNameControl.patchValue(defaultTaxonName, {emitEVent: false});
                // Remember for next form reset
                this.data.taxonName = defaultTaxonName;
              } else {
                taxonNameControl.reset(null, {emitEVent: false});
                // Remember for next form reset
                this.data.taxonName = undefined;
              }

            }));
      }
    }

    // Compute taxon names when parent has changed
    this.registerSubscription(
      parentControl.valueChanges
        .pipe(
          // Detected parent changes
          filter(parentGroup => parentGroup && !BatchGroupUtils.equals(parentGroup, this.data?.parentGroup))
        )
        .subscribe(parentGroup => {
          // Remember (for next values changes, or next form reset)
          this.data.parentGroup = parentGroup;

          // Update pmfms (it can depends on the selected parent's taxon group - see mapPmfm())
          if (!this.starting) this._onRefreshPmfms.emit();
        }));


    this.registerSubscription(
      this.enableIndividualCountControl.valueChanges
        .pipe(
          startWith<any, any>(this.enableIndividualCountControl.value)
        )
        .subscribe((enable) => {
          const individualCountControl = this.form.get('individualCount');
          if (enable) {
            individualCountControl.enable();
            individualCountControl.setValidators([Validators.required, Validators.min(0)]);
          } else {
            individualCountControl.disable();
            individualCountControl.setValue(null);
          }
        }));

    this.ngInitExtension();
  }

  async doNewParentClick(event: UIEvent) {
    if (!this.onNewParentClick) return; // No callback: skip
    const res = await this.onNewParentClick();

    if (res instanceof Batch) {
      this.form.get('parent').setValue(res);
    }
  }

  protected onApplyingEntity(data: SubBatch, opts?: { linkToParent?: boolean; }) {
    super.onApplyingEntity(data);

    // Replace parent with value from availableParents
    if (!opts || opts.linkToParent !== false) {
      this.linkToParentGroup(data);
    }
  }

  protected async updateView(data: SubBatch, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; linkToParent?: boolean; }) {

    // Reset taxon name button index
    if (this.mobile && data && data.taxonName && isNotNil(data.taxonName.id)) {
      this.selectedTaxonNameIndex = (this.$taxonNames.getValue() || []).findIndex(tn => tn.id === data.taxonName.id);
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

    if (!this.enableIndividualCount) {
      this.form.get('individualCount').disable(opts);
    }

    // Other field to disable by default (e.g. discard reason, in SUMARiS program)
    this._disableByDefaultControls.forEach(c => c.disable(opts));
  }

  onTaxonNameButtonClick(event: UIEvent | undefined, taxonName: TaxonNameRef, minTabindex: number) {
    this.form.patchValue({taxonName});
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.focusNextInput(null, {minTabindex});
  }

  focusFirstEmptyInput(event?: UIEvent): boolean {
    return focusNextInput(event, this.inputFields, {
      excludeEmptyInput: true,
      minTabindex: -1,

      // DEBUG
      //debug: this.debug
    });
  }

  focusNextInput(event: UIEvent, opts?: Partial<GetFocusableInputOptions>): boolean {
    // DEBUG
    //return focusNextInput(event, this.inputFields, opts{debug: this.debug, ...opts});

    return focusNextInput(event, this.inputFields, opts);
  }

  focusPreviousInput(event: UIEvent, opts?: Partial<GetFocusableInputOptions>): boolean {
    // DEBUG
    // return focusPreviousInput(event, this.inputFields, {debug: this.debug, ...opts});

    return focusPreviousInput(event, this.inputFields, opts);
  }

  focusNextInputOrSubmit(event: UIEvent, isLastPmfm: boolean) {

    if (isLastPmfm) {
      if (this.enableIndividualCount) {
        // Focus to last (=individual count input)
        this.inputFields.last.nativeElement.focus();
        return true;
      }

      this.doSubmit(event);
      return true;
    }

    return this.focusNextInput(event);
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
            discardReasonControl.updateValueAndValidity({onlySelf: true});
            this.form.updateValueAndValidity({onlySelf: true});
          } else {
            discardReasonControl.setValue(null);
            discardReasonControl.setValidators(null);
            discardReasonControl.disable();
          }
        }));
    }
  }

  protected setAvailableParents(value: BatchGroup[]) {
    this._availableParents = value;

    // DEBUG
    //console.debug('[sub-batch-form] setAvailableParents() ', value);

    // Reset  parentGroup control, if no more in the list
    if (!this.loading && this.showParentGroup) {
      const selectedParent = this.parentGroup;
      const selectedParentExists = selectedParent && (this._availableParents || []).findIndex(parent => BatchGroup.equals(parent, this.parentGroup)) !== -1;
      if (selectedParent && !selectedParentExists) {
        this.form.patchValue({parentGroup: null, taxonName: null});
      }
    }
  }

  protected async suggestParents(value: any, options?: any): Promise<Batch[]> {
    // Has select a valid parent: return the parent
    if (EntityUtils.isNotEmpty(value, 'label')) return [value];
    value = (typeof value === "string" && value !== "*") && value || undefined;
    if (isNilOrBlank(value)) return this._availableParents; // All
    const ucValueParts = value.trim().toUpperCase().split(" ", 1);
    if (this.debug) console.debug(`[sub-batch-form] Searching parent {${value || '*'}}...`);
    // Search on attributes
    return this._availableParents.filter(parent => ucValueParts
        .filter(valuePart => this._parentAttributes
          .findIndex(attr => startsWithUpperCase(getPropertyByPath(parent, attr), valuePart.trim())) !== -1
        ).length === ucValueParts.length
    );
  }

  protected async suggestTaxonNames(value?: any, options?: any): Promise<LoadResult<TaxonNameRef>> {
    const parentGroup = this.parentGroup;
    if (isNil(parentGroup)) return {data: []};
    if (this.debug) console.debug(`[sub-batch-form] Searching taxon name {${value || '*'}}...`);
    return this.programRefService.suggestTaxonNames(value,
      {
        programLabel: this.programLabel,
        searchAttribute: options && options.searchAttribute,
        taxonGroupId: parentGroup && parentGroup.taxonGroup && parentGroup.taxonGroup.id || undefined
      });
  }

  protected mapPmfms(pmfms: IPmfm[]): IPmfm[] {

    // Hide the QV pmfm
    if (this._qvPmfm) {
      const index = pmfms.findIndex(pmfm => pmfm.id === this._qvPmfm.id);
      if (index !== -1) {
        const qvPmfm = this._qvPmfm.clone();
        qvPmfm.hidden = true;
        qvPmfm.required = true;
        pmfms[index] = qvPmfm;
      } else {
        console.warn('Cannot found the QVPmfm with ID=' + this._qvPmfm.id);
      }
    }

    // If there is a parent: filter on parent's taxon group
    const parentTaxonGroupId = this.parentGroup && this.parentGroup.taxonGroup && this.parentGroup.taxonGroup.id;
    if (isNotNil(parentTaxonGroupId)) {
      pmfms = pmfms.filter(pmfm => !PmfmUtils.isDenormalizedPmfm(pmfm)
        || isEmptyArray(pmfm.taxonGroupIds)
        || pmfm.taxonGroupIds.includes(parentTaxonGroupId));
    }

    return pmfms;
  }

  protected async onUpdateControls(form: FormGroup): Promise<void> {

    // If QV: must be required
    if (this._qvPmfm) {
      const measFormGroup = form.get('measurementValues') as FormGroup;
      const qvControl = measFormGroup.get(this._qvPmfm.id.toString());

      if (qvControl) {
        qvControl.setValidators(Validators.required);
      }
    }

    // Weight/length computation
    this._weightConversionSubscription?.unsubscribe();
    if (this.enableWeightConversion) {
      // DEBUG
      if (this.debug) console.debug('[sub-batch-form] Enabling Weight/Length conversion...');

      this._weightConversionSubscription = this.validatorService.enableWeightLengthConversion(form, {
        pmfms: this.$pmfms.value,
        markForCheck: ()  => this.markForCheck(),
        onError: (err) => {
          this.warning = err && err.message || 'TRIP.SUB_BATCH.ERROR.WEIGHT_LENGTH_CONVERSION_FAILED';
          this.markForCheck();
        },
        // DEBUG
        debug: this.debug
      });

      if (this._weightConversionSubscription) this.registerSubscription(this._weightConversionSubscription);
    }

  }

  protected getValue(): SubBatch {
    if (!this.form.dirty) return this.data;

    const json = this.form.value;

    // Read the individual count (if has been disable)
    if (!this.enableIndividualCount) {
      json.individualCount = this.form.get('individualCount').value || 1;
    }

    const pmfmForm = this.form.get('measurementValues');

    // Adapt measurement values for entity
    if (pmfmForm) {
      json.measurementValues = Object.assign({},
        this.data.measurementValues || {}, // Keep additionnal PMFM values
        MeasurementValuesUtils.normalizeValuesToModel(pmfmForm.value, this.$pmfms.getValue() || []));
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

    data.parentGroup = (this._availableParents || []).find(p => Batch.equals(p, parentGroup));

    // Get the parent of the parent (e.g. if parent is a sample batch)
    if (data.parentGroup && data.parent && !data.parent.hasTaxonNameOrGroup && data.parent.parent && data.parent.parent.hasTaxonNameOrGroup) {
      data.parentGroup = BatchGroup.fromBatch(data.parent.parent);
    }
  }

}
