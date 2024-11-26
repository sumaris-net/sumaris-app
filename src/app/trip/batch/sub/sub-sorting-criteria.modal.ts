import { ChangeDetectorRef, Component, Inject, Injector, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormFieldDefinition, isNil, isNotNil, LoadResult, LocalSettingsService } from '@sumaris-net/ngx-components';
import { BatchGroup } from '../group/batch-group.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { SUB_BATCHES_TABLE_OPTIONS, SubBatchesTable } from './sub-batches.table';
import { SubBatchValidatorService } from './sub-batch.validator';
import { BaseMeasurementsTableConfig } from '@app/data/measurement/measurements-table.class';
import { SubBatch } from './sub-batch.model';
import { APP_MAIN_CONTEXT_SERVICE, ContextService } from '@app/shared/context.service';
import { RxState } from '@rx-angular/state';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { Pmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';

@Component({
  selector: 'app-sub-sorting-criteria.modal',
  styleUrls: ['sub-sorting-criteria.modal.scss'],
  templateUrl: 'sub-sorting-criteria.modal.html',
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
export class SubSortingCriteriaModal extends SubBatchesTable implements OnInit {
  protected pmfmDefinition: FormFieldDefinition[];
  protected sortingCriteriaForm: FormGroup;
  protected criteriaPmfms: Pmfm[];
  protected qvPmfms: Pmfm[];
  isMandatoryQvPmfm: boolean = false;
  disabledPrecision: boolean = false;
  showQvPmfm: boolean = false;

  @Input() parentGroup: BatchGroup;
  @Input() programLabel: string;
  @Input() sortcriteriaPmfms: Pmfm[];
  @Input() denormalizedPmfmStrategy: DenormalizedPmfmStrategy[];

  constructor(
    injector: Injector,
    settings: LocalSettingsService,
    protected pmfmService: PmfmService,
    protected programRefService: ProgramRefService,
    validatorService: SubBatchValidatorService,
    @Inject(SUB_BATCHES_TABLE_OPTIONS) options: BaseMeasurementsTableConfig<SubBatch>,
    private fb: FormBuilder
    // autres services nécessaires
  ) {
    super(injector, settings.mobile ? null : validatorService /*no validator = not editable*/, options);
  }

  ngOnInit() {
    // Pmfms filtered by type
    this.qvPmfms = this.sortcriteriaPmfms.filter((pmfm) => PmfmUtils.isQualitative(pmfm));
    this.criteriaPmfms = this.sortcriteriaPmfms.filter((pmfm) => !PmfmUtils.isQualitative(pmfm));

    // TODO MF à REVOIR SI Y A PLUSIEUR PMFM OBLIGATOIRE OU UN OBLIGATOIRE ET UN OPTIONNEL
    this.isMandatoryQvPmfm = this.denormalizedPmfmStrategy
      .filter((strategy) => {
        return this.qvPmfms.find((pmfm) => pmfm.id === strategy.id);
      })
      .some((strategy) => strategy.isMandatory);

    this.sortingCriteriaForm = this.fb.group({
      taxonName: ['', Validators.required],
      criteriaPmfm: ['', Validators.required],
      min: ['', [Validators.required]],
      max: ['', [Validators.required]],
      precision: ['', [Validators.required]],
      qvPmfm: [''],
      useOptionalCriteria: [false],
    });

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

    this.pmfmDefinition = [
      {
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
      {
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
    ];
    this.autoUpdateForm();
  }

  async dismiss(data?: any) {
    await this.modalCtrl.dismiss(data);
  }

  async cancel() {
    await this.dismiss();
  }

  async confirm() {
    //TODO: temporaire à supprimer une fois que le poc sera validé
    const data = this.sortingCriteriaForm.value;
    const min = this.sortingCriteriaForm.get('min').value;
    const max = this.sortingCriteriaForm.get('max').value;
    if (min > max) {
      this.sortingCriteriaForm.setErrors({ minMaxError: true });
      return;
    }
    if (this.sortingCriteriaForm.invalid) {
      this.sortingCriteriaForm.markAllAsTouched();
      return;
    }

    // map pmfm
    if (isNotNil(data.qvPmfm)) {
      data.qvPmfm = this.denormalizedPmfmStrategy.find((strategy) => strategy.id === data.qvPmfm.id);
    }
    await this.dismiss(data);
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
    return this.pmfmService.suggest(value, {
      searchJoin: 'parameter',

      includedIds: pmfms.map((pmfm) => pmfm.id),
    });
  }

  protected autoUpdateForm() {
    //check if there is only one pmfm in the mandatory pmfms
    if (this.criteriaPmfms.length === 1) {
      this.sortingCriteriaForm.get('criteriaPmfm').setValue(this.criteriaPmfms[0]);
      this.markAllAsTouched();
    }
    if (isNotNil(this.qvPmfms) && this.qvPmfms.length === 1 && this.isMandatoryQvPmfm) {
      this.showQvPmfm = true;
      this.sortingCriteriaForm.get('qvPmfm').setValue(this.qvPmfms[0]);
    } else if (isNotNil(this.qvPmfms)) {
      this.showQvPmfm = true;
    }
  }
}
