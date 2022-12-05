import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { MeasurementValuesForm } from '../measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '../services/validator/measurement.validator';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { AppFormUtils, FormArrayHelper, IReferentialRef, isNil, isNilOrBlank, isNotEmptyArray, LoadResult, toNumber, UsageMode } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes } from '../../referential/services/model/model.enum';
import { SampleValidatorService } from '../services/validator/sample.validator';
import { Sample } from '../services/model/sample.model';
import { environment } from '../../../environments/environment';
import { ProgramRefService } from '../../referential/services/program-ref.service';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { SubSampleValidatorService } from '@app/trip/services/validator/sub-sample.validator';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';

@Component({
  selector: 'app-sample-form',
  templateUrl: 'sample.form.html',
  styleUrls: ['sample.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleForm extends MeasurementValuesForm<Sample>
  implements OnInit, OnDestroy {

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

  constructor(
    injector: Injector,
    protected measurementValidatorService: MeasurementsValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService,
    protected validatorService: SampleValidatorService,
    protected subValidatorService: SubSampleValidatorService
  ) {
    super(injector, measurementValidatorService, formBuilder, programRefService,
      validatorService.getFormGroup(),
      {
        skipDisabledPmfmControl: false,
        skipComputedPmfmControl: false
      }
    );

    // Set default acquisition level
    this._acquisitionLevel = AcquisitionLevelCodes.SAMPLE;
    this._enable = true;
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
        mobile: this.mobile
      });
    }
    else {
      this.registerAutocompleteField('taxonGroup', {
        suggestFn: (value: any, options?: any) => this.programRefService.suggestTaxonGroups(value, {...options, program: this.programLabel}),
        mobile: this.mobile
      });
    }

    // Taxon name combo
    this.registerAutocompleteField('taxonName', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonNames(value, options),
      mobile: this.mobile
    });

    this.focusFieldName = !this.mobile && ((this.showLabel && 'label')
      || (this.showTaxonGroup && 'taxonGroup')
      || (this.showTaxonName && 'taxonName'));
  }

  setChildren(children: Sample[], opts?: { emitEvent?: boolean; }) {
    children = children || [];

    if (this.childrenArrayHelper.size() !== children.length) {
      this.childrenArrayHelper.resize(children.length);
    }

    this.form.patchValue({children}, opts);
  }

  toggleComment() {
    this.showComment = !this.showComment;
    this.markForCheck();
  }

  /* -- protected methods -- */

  protected onApplyingEntity(data: Sample, opts?: { [p: string]: any }) {
    super.onApplyingEntity(data, opts);

    const childrenCount = data.children?.length || 0;
    if (this.childrenArrayHelper.size() !== childrenCount) {
      this.childrenArrayHelper.resize(childrenCount);
    }
  }

  protected getValue(): Sample {
    const value = super.getValue();
    // Reset comment, when hidden
    if (!this.showComment) value.comments = undefined;
    return value;
  }

  protected async suggestTaxonNames(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    const taxonGroup = this.form.get('taxonGroup').value;

    // IF taxonGroup column exists: taxon group must be filled first
    if (this.showTaxonGroup && isNilOrBlank(value) && isNil(taxonGroup)) return {data: []};

    return this.programRefService.suggestTaxonNames(value,
      {
        programLabel: this.programLabel,
        searchAttribute: options && options.searchAttribute,
        taxonGroupId: taxonGroup && taxonGroup.id || undefined
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
      (value) => this.subValidatorService.getFormGroup(value, {
        measurementValuesAsGroup: false, // avoid to pass pmfms list
        requiredParent: false // Not need
      }),
      (v1, v2) => Sample.equals(v1, v2),
      (value) => isNil(value),
      {allowEmptyArray: true}
    );
  }

  isNotHiddenPmfm = PmfmUtils.isNotHidden;
  selectInputContent = AppFormUtils.selectInputContent;
}
