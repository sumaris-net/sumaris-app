import { Component, Injector, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppForm, FormFieldDefinitionMap, isEmptyArray, isNil, isNotEmptyArray, LoadResult, LocalSettingsService } from '@sumaris-net/ngx-components';
import { BatchGroup } from '../group/batch-group.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { RxState } from '@rx-angular/state';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { IPmfm, Pmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';

export interface SubSortingCriteria {
  taxonName: TaxonNameRef;
  criteriaPmfm: IPmfm;
  min: number;
  max: number;
  precision: number;
  qvPmfm: IPmfm;
  useOptionalCriteria: boolean;
}
@Component({
  selector: 'app-sub-sorting-criteria-form',
  styleUrls: ['sub-sorting-criteria.form.scss'],
  templateUrl: 'sub-sorting-criteria.form.html',
  providers: [RxState],
})
export class SubSortingCriteriaForm extends AppForm<SubSortingCriteria> implements OnInit, OnDestroy {
  protected fieldDefinitions: FormFieldDefinitionMap = {};
  protected sortingCriteriaForm: FormGroup;
  protected criteriaPmfms: IPmfm[];
  protected qvPmfms: IPmfm[];
  protected isMandatoryQvPmfm: boolean = false;
  protected disabledPrecision: boolean = false;
  protected showQvPmfm: boolean = false;

  @Input() parentGroup: BatchGroup;
  @Input() programLabel: string;
  @Input() pmfmDenormalized: DenormalizedPmfmStrategy[];
  @Input() pmfmsFiltered: IPmfm[];

  constructor(
    injector: Injector,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected pmfmService: PmfmService,
    protected programRefService: ProgramRefService,
    private fb: FormBuilder
  ) {
    super(
      injector,
      fb.group({
        taxonName: ['', Validators.required],
        criteriaPmfm: ['', Validators.required],
        min: ['', [Validators.required, Validators.min(0)]],
        max: ['', [Validators.required, Validators.max(100)]],
        precision: ['', [Validators.required]],
        qvPmfm: [''],
        useOptionalCriteria: [false],
      })
    );
  }

  ngOnInit() {
    super.ngOnInit();
    // Pmfms filtered by type
    this.qvPmfms = this.pmfmsFiltered.filter((pmfm) => PmfmUtils.isQualitative(pmfm));
    this.criteriaPmfms = this.pmfmsFiltered.filter((pmfm) => !PmfmUtils.isQualitative(pmfm));

    // TODO MF à REVOIR SI Y A PLUSIEUR PMFM OBLIGATOIRE OU UN OBLIGATOIRE ET UN OPTIONNEL
    this.isMandatoryQvPmfm = this.pmfmDenormalized
      .filter((strategy) => {
        return this.qvPmfms.find((pmfm) => pmfm.id === strategy.id);
      })
      .some((strategy) => strategy.isMandatory);

    this.registerSubscription(
      this.form.get('criteriaPmfm').valueChanges.subscribe((value) => {
        if (value.precision) {
          this.form.get('precision').setValue(value.precision);
          this.disabledPrecision = true;
        } else {
          this.disabledPrecision = false;
        }
      })
    );

    this.registerSubscription(
      this.form.valueChanges.subscribe(() => {
        if (this.form.hasError('minMaxError')) {
          this.form.get('maxStep').setErrors({ minMaxError: true });
        }
      })
    );

    this.registerAutocompleteField('taxonName', {
      suggestFn: (value, filter) => this.suggestTaxonNames(value, filter),
      panelClass: 'min-width-large',
      selectInputContentOnFocus: true,
    });

    const basePmfmAttributes = this.settings.getFieldDisplayAttributes('pmfm', ['name']);
    const pmfmAttributes = basePmfmAttributes.concat(['matrix.name', 'fraction.name', 'method.name']);
    const pmfmColumnNames = basePmfmAttributes
      .map((attr) => 'REFERENTIAL.' + attr.toUpperCase())
      .concat(['REFERENTIAL.PMFM.MATRIX', 'REFERENTIAL.PMFM.FRACTION', 'REFERENTIAL.PMFM.METHOD']);

    this.fieldDefinitions = {
      criteriaPmfm: {
        key: 'criteriaPmfm',
        type: 'entity',
        label: 'REFERENTIAL.PMFM',
        required: true,
        autocomplete: this.registerAutocompleteField('criteriaPmfm', {
          suggestFn: (value, opts) => this.suggestPmfms(value, { ...opts, isQvPmfm: false }),
          attributes: pmfmAttributes,
          columnNames: pmfmColumnNames,
          showAllOnFocus: false,
          panelClass: 'width-medium',
        }),
      },
      qvPmfm: {
        key: 'qvPmfm',
        type: 'entity',
        label: 'REFERENTIAL.PMFM',
        required: false,
        autocomplete: this.registerAutocompleteField('qvPmfm', {
          suggestFn: (value, opts) => this.suggestPmfms(value, { ...opts, isQvPmfm: true }),
          attributes: basePmfmAttributes,
          columnNames: pmfmColumnNames,
          showAllOnFocus: false,
          panelClass: 'width-large',
        }),
      },
    };

    // Fill form default values
    // Check if there is only one pmfm in the mandatory pmfms
    if (this.criteriaPmfms.length === 1) {
      this.form.get('criteriaPmfm').setValue(this.criteriaPmfms[0]);
    }
    if (isNotEmptyArray(this.qvPmfms) && this.qvPmfms.length === 1 && this.isMandatoryQvPmfm) {
      this.showQvPmfm = true;
      this.form.get('qvPmfm').setValue(this.qvPmfms[0]);
    } else if (isNotEmptyArray(this.qvPmfms)) {
      this.showQvPmfm = true;
    }

    this.enable();
  }

  protected async suggestTaxonNames(value?: any, options?: any): Promise<LoadResult<TaxonNameRef>> {
    const parentGroup = this.parentGroup;
    if (isNil(parentGroup)) return { data: [] };
    return this.programRefService.suggestTaxonNames(value, {
      programLabel: this.programLabel,
      searchAttribute: options && options.searchAttribute,
      taxonGroupId: (parentGroup && parentGroup.taxonGroup && parentGroup.taxonGroup.id) || undefined,
    });
  }

  protected async suggestPmfms(value: any, opts?: { isQvPmfm?: boolean }): Promise<LoadResult<Pmfm>> {
    const pmfms = opts.isQvPmfm ? this.qvPmfms : this.criteriaPmfms;
    if (isEmptyArray(pmfms)) return { data: [] };
    return this.pmfmService.suggest(value, {
      searchJoin: 'parameter',
      includedIds: pmfms.map((pmfm) => pmfm.id),
    });
  }

  doSubmit() {
    const formValue = this.form.value;
    return super.doSubmit(formValue);
  }
}
