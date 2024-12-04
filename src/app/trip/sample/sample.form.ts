import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import {
  AppFormUtils,
  FormArrayHelper,
  IFormPathTranslator,
  IFormPathTranslatorOptions,
  IReferentialRef,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNilOrBlank,
  LoadResult,
  toNumber,
  UsageMode,
} from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { SampleValidatorService } from './sample.validator';
import { Sample } from './sample.model';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { SubSampleValidatorService } from '@app/trip/sample/sub-sample.validator';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { PmfmValueColorFn } from '@app/referential/pipes/pmfms.pipe';
import { RxState } from '@rx-angular/state';
import { IDataFormPathTranslatorOptions } from '@app/data/services/data-service.class';

@Component({
  selector: 'app-sample-form',
  templateUrl: 'sample.form.html',
  styleUrls: ['sample.form.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleForm extends MeasurementValuesForm<Sample> implements OnInit, OnDestroy, IFormPathTranslator {
  childrenArrayHelper: FormArrayHelper<Sample>;
  focusFieldName: string;

  @Input() i18nSuffix: string;
  @Input() mobile: boolean;
  @Input() tabindex: number;
  @Input() usageMode: UsageMode;
  @Input() availableTaxonGroups: TaxonGroupRef[] = null;
  @Input() requiredLabel = true;
  @Input() showLabel = true;
  @Input() showSampleDate = true;
  @Input() showTaxonGroup = true;
  @Input() showTaxonName = true;
  @Input() showComment = true;
  @Input() showError = true;
  @Input() maxVisibleButtons: number;
  @Input() pmfmValueColor: PmfmValueColorFn;

  constructor(
    injector: Injector,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService,
    protected validatorService: SampleValidatorService,
    protected subValidatorService: SubSampleValidatorService
  ) {
    super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(), {
      skipDisabledPmfmControl: false,
      skipComputedPmfmControl: false,
      onUpdateFormGroup: (form) => this.onUpdateFormGroup(form),
    });

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;
    this._enabled = true;
    this.i18nPmfmPrefix = 'TRIP.SAMPLE.PMFM.';
    this.childrenArrayHelper = this.getChildrenFormHelper(this.form);

    // for DEV only
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.tabindex = toNumber(this.tabindex, 1);
    this.maxVisibleButtons = toNumber(this.maxVisibleButtons, 4);

    // Taxon group combo
    if (isNotEmptyArray(this.availableTaxonGroups)) {
      this.registerAutocompleteField('taxonGroup', {
        items: this.availableTaxonGroups,
        mobile: this.mobile,
      });
    } else {
      this.registerAutocompleteField('taxonGroup', {
        suggestFn: (value: any, options?: any) =>
          this.programRefService.suggestTaxonGroups(value, {
            ...options,
            program: this.programLabel,
          }),
        mobile: this.mobile,
      });
    }

    // Taxon name combo
    this.registerAutocompleteField('taxonName', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonNames(value, options),
      mobile: this.mobile,
    });

    this.focusFieldName =
      !this.mobile && ((this.showLabel && 'label') || (this.showTaxonGroup && 'taxonGroup') || (this.showTaxonName && 'taxonName'));
  }

  setChildren(children: Sample[], opts?: { emitEvent?: boolean }) {
    children = children || [];

    if (this.childrenArrayHelper.size() !== children.length) {
      this.childrenArrayHelper.resize(children.length);
    }

    this.form.patchValue({ children }, opts);
  }

  toggleComment() {
    this.showComment = !this.showComment;

    // Mark form as dirty, if need to reset comment (see getValue())
    if (!this.showComment && isNotNilOrBlank(this.form.get('comments').value)) this.form.markAsDirty();

    this.markForCheck();
  }

  translateFormPath(path: string, opts?: IDataFormPathTranslatorOptions): string {
    opts = { i18nPrefix: this.i18nFieldPrefix, i18nSuffix: this.i18nSuffix, ...opts };
    // Translate specific path
    let fieldName: string;
    switch (path) {
      case 'sampleDate':
        fieldName = 'SAMPLE_DATE';
        break;
      case 'taxonGroup':
        fieldName = 'TAXON_GROUP';
        break;
      case 'taxonName':
        fieldName = 'TAXON_NAME';
        break;
    }
    if (fieldName) {
      const i18nKey = (opts.i18nFieldPrefix || 'TRIP.SAMPLE.EDIT.') + fieldName;
      return this.translateContext.instant(i18nKey, opts.i18nSuffix);
    }

    // Default translation (pmfms)
    return super.translateFormPath(path, { ...opts, pmfms: this.initialPmfms /*give the full list*/ });
  }

  /* -- protected methods -- */

  protected onUpdateFormGroup(form: UntypedFormGroup) {
    this.validatorService.updateFormGroup(form, {
      requiredLabel: this.requiredLabel,
    });
  }

  protected onApplyingEntity(data: Sample, opts?: { [p: string]: any }) {
    super.onApplyingEntity(data, opts);

    this.showComment = this.showComment || isNotNilOrBlank(data.comments);

    const childrenCount = data.children?.length || 0;
    if (this.childrenArrayHelper.size() !== childrenCount) {
      this.childrenArrayHelper.resize(childrenCount);
    }
  }

  getValue(): Sample {
    const value = super.getValue();
    // Reset comment, when hidden
    if (!this.showComment) value.comments = undefined;
    return value;
  }

  protected async suggestTaxonNames(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    const taxonGroup = this.form.get('taxonGroup').value;

    // IF taxonGroup column exists: taxon group must be filled first
    if (this.showTaxonGroup && isNilOrBlank(value) && isNil(taxonGroup)) return { data: [] };

    return this.programRefService.suggestTaxonNames(value, {
      programLabel: this.programLabel,
      searchAttribute: options && options.searchAttribute,
      taxonGroupId: (taxonGroup && taxonGroup.id) || undefined,
    });
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected getChildrenFormHelper(form: UntypedFormGroup): FormArrayHelper<Sample> {
    let arrayControl = form.get('children') as UntypedFormArray;
    if (!arrayControl) {
      arrayControl = this.formBuilder.array([]);
      form.addControl('children', arrayControl);
    }
    return new FormArrayHelper<Sample>(
      arrayControl,
      (value) =>
        this.subValidatorService.getFormGroup(value, {
          measurementValuesAsGroup: false, // avoid to pass pmfms list
          requiredParent: false, // Not need
        }),
      (v1, v2) => Sample.equals(v1, v2),
      (value) => isNil(value),
      { allowEmptyArray: true }
    );
  }

  isNotHiddenPmfm = PmfmUtils.isNotHidden;
  selectInputContent = AppFormUtils.selectInputContent;
}
