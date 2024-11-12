import { Component, Inject, Injector, Input, input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
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
import { Pmfm } from '@app/referential/services/model/pmfm.model';

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
        reservedStartColumns: ['taxonName', 'pmfm'],
      }),
      deps: [LocalSettingsService],
    },
    RxState,
  ],
})
export class SubSortingCriteriaModal extends SubBatchesTable implements OnInit {
  protected columnDefinitions: FormFieldDefinition[] = [];
  protected pmfmDefinition: FormFieldDefinition;
  sortingCriteriaForm: FormGroup;
  speciesList: any[] = [];

  @Input() parentGroup: BatchGroup;
  @Input() programLabel: string;

  constructor(
    injector: Injector,
    settings: LocalSettingsService,
    protected pmfmService: PmfmService,
    modalCtrl: ModalController,
    protected programRefService: ProgramRefService,
    validatorService: SubBatchValidatorService,
    @Inject(SUB_BATCHES_TABLE_OPTIONS) options: BaseMeasurementsTableConfig<SubBatch>,
    private fb: FormBuilder
    // autres services nécessaires
  ) {
    super(injector, settings.mobile ? null : validatorService /*no validator = not editable*/, options);
    this.sortingCriteriaForm = this.fb.group({
      taxonName: ['', Validators.required],
      pmfm: [''],
    });
  }

  ngOnInit() {
    console.log('SubSortingCriteriaModal');

    this.registerAutocompleteField('taxonName', {
      suggestFn: (value, filter) => this.suggestTaxonNames(value, filter),
      panelClass: 'min-width-large',
      selectInputContentOnFocus: true,
    });

    const basePmfmAttributes = this.settings.getFieldDisplayAttributes('pmfm', ['label', 'name']);
    const pmfmAttributes = basePmfmAttributes
      .map((attr) => (attr === 'label' && true ? 'parameter.label' : attr === 'name' ? 'parameter.name' : attr))
      .concat(['unit.label', 'matrix.name', 'fraction.name', 'method.name']);
    const pmfmColumnNames = basePmfmAttributes
      .map((attr) => 'REFERENTIAL.' + attr.toUpperCase())
      .concat(['REFERENTIAL.PMFM.UNIT', 'REFERENTIAL.PMFM.MATRIX', 'REFERENTIAL.PMFM.FRACTION', 'REFERENTIAL.PMFM.METHOD']);

    this.pmfmDefinition = {
      key: 'pmfm',
      type: 'entity',
      label: 'REFERENTIAL.PMFM',
      required: false,
      autocomplete: this.registerAutocompleteField('pmfm', {
        suggestFn: (value, opts) => this.suggestPmfms(value, opts),
        attributes: pmfmAttributes,
        columnSizes: pmfmAttributes.map((attr) => {
          switch (attr) {
            case 'label':
              return 2;
            case 'name':
              return 3;
            case 'unit.label':
              return 1;
            case 'method.name':
              return 4;
            default:
              return undefined;
          }
        }),
        columnNames: pmfmColumnNames,
        displayWith: (pmfm) => this.displayPmfm(pmfm, { withUnit: true, withDetails: true }),
        showAllOnFocus: false,
        panelClass: 'full-width',
      }),
    };
  }

  async dismiss(data?: any) {
    await this.modalCtrl.dismiss(data);
  }

  async cancel() {
    await this.dismiss();
  }

  async confirm(data?: any) {
    await this.dismiss(data);
  }

  async openSortingCriteriaModal() {
    const modal = await this.modalCtrl.create({
      component: SubSortingCriteriaModal,
    });
    console.log('SubSortingCriteriaModal openSortingCriteriaModal');
    // Open the modal
    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      // Traiter les données retournées
      // this.handleSortingCriteria(data);
    }

    return data;
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

  protected async suggestPmfms(value: any, opts?: any): Promise<LoadResult<Pmfm>> {
    return this.pmfmService.suggest(value, {
      searchJoin: 'parameter',
      //searchAttribute: !this.showPmfmLabel ? 'name' : undefined /*label + name*/,
      // ...this.pmfmFilter,
    });
  }

  protected displayPmfm(
    pmfm: Pmfm,
    opts?: {
      withUnit?: boolean;
      html?: boolean;
      withDetails?: boolean;
    }
  ): string {
    if (!pmfm) return undefined;

    let name = pmfm.parameter?.name;
    if (opts?.withDetails) {
      name = [name, pmfm.matrix?.name, pmfm.fraction?.name, pmfm.method?.name].filter(isNotNil).join(' - ');
    }

    // Append unit
    const unitLabel = (pmfm.type === 'integer' || pmfm.type === 'double') && pmfm.unit?.label;
    if ((!opts || opts.withUnit !== false) && unitLabel) {
      if (opts?.html) {
        name += `<small><br/>(${unitLabel})</small>`;
      } else {
        name += ` (${unitLabel})`;
      }
    }
    return name;
  }
}
