import { Component, Inject, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormFieldDefinitionMap, isEmptyArray, isNil, isNotEmptyArray, LoadResult, LocalSettingsService } from '@sumaris-net/ngx-components';
import { BatchGroup } from '../group/batch-group.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { SUB_BATCHES_TABLE_OPTIONS, SubBatchesTable } from './sub-batches.table';
import { SubBatchValidatorService } from './sub-batch.validator';
import { SubBatch } from './sub-batch.model';
import { APP_MAIN_CONTEXT_SERVICE, ContextService } from '@app/shared/context.service';
import { RxState } from '@rx-angular/state';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { IPmfm, Pmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { SubBatchFormState } from './sub-batch.form';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';

@Component({
  selector: 'app-sub-sorting-criteria-form',
  styleUrls: ['sub-sorting-criteria.form.scss'],
  templateUrl: 'sub-sorting-criteria.form.html',
  providers: [
    {
      provide: ContextService,
      deps: [APP_MAIN_CONTEXT_SERVICE],
    },
    { provide: SubBatchValidatorService, useClass: SubBatchValidatorService },
    {
      provide: SUB_BATCHES_TABLE_OPTIONS,
      useFactory: (settings: LocalSettingsService) => ({
        prependNewElements: settings.mobile,
        suppressErrors: true,
      }),
      deps: [LocalSettingsService],
    },
    RxState,
  ],
})
export class SubSortingCriteriaForm extends MeasurementValuesForm<SubBatch, SubBatchFormState> implements OnInit, OnDestroy {
  protected readonly minimumValue = 0;
  protected readonly maximumValue = 100;
  protected fieldDefinitions: FormFieldDefinitionMap = {};
  protected sortingCriteriaForm: FormGroup;
  protected criteriaPmfms: IPmfm[];
  protected qvPmfms: IPmfm[];
  // protected pmfmsFiltered: IPmfm[];
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
    super(injector, measurementsValidatorService, fb, programRefService);
  }

  async ngOnInit() {
    this.sortingCriteriaForm = this.fb.group({
      taxonName: ['', Validators.required],
      criteriaPmfm: ['', Validators.required],
      min: ['', [Validators.required, Validators.min(this.minimumValue)]],
      max: ['', [Validators.required, Validators.max(this.maximumValue)]],
      precision: ['', [Validators.required]],
      qvPmfm: [''],
      useOptionalCriteria: [false],
    });

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
      this.sortingCriteriaForm.get('criteriaPmfm').valueChanges.subscribe((value) => {
        if (value.precision) {
          this.sortingCriteriaForm.get('precision').setValue(value.precision);
          this.disabledPrecision = true;
        } else {
          this.disabledPrecision = false;
        }
      })
    );

    this.registerSubscription(
      this.sortingCriteriaForm.valueChanges.subscribe(() => {
        if (this.sortingCriteriaForm.hasError('minMaxError')) {
          this.sortingCriteriaForm.get('maxStep').setErrors({ minMaxError: true });
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
      this.sortingCriteriaForm.get('criteriaPmfm').setValue(this.criteriaPmfms[0]);
      this.markAllAsTouched();
    }
    if (isNotEmptyArray(this.qvPmfms) && this.qvPmfms.length === 1 && this.isMandatoryQvPmfm) {
      this.showQvPmfm = true;
      this.sortingCriteriaForm.get('qvPmfm').setValue(this.qvPmfms[0]);
    } else if (isNotEmptyArray(this.qvPmfms)) {
      this.showQvPmfm = true;
    }
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
}
