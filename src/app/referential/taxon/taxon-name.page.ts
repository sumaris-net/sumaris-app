import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { EntityServiceLoadOptions, HistoryPageReference, isNil, isNotNil, joinPropertiesPath, MatAutocompleteFieldConfig, referentialToString } from '@sumaris-net/ngx-components';
import { TaxonName } from '../services/model/taxon-name.model';
import { TaxonNameService } from '../services/taxon-name.service';
import { TaxonNameValidatorService } from '../services/validator/taxon-name.validator';
import { WeightLengthConversionTable } from '@app/referential/weight-length-conversion/weight-length-conversion.table';
import { AppReferentialEditor } from '@app/referential/form/referential-editor.class';
import { ReferentialForm } from '@app/referential/form/referential.form';

@Component({
  selector: 'app-taxon-name',
  templateUrl: 'taxon-name.page.html',
  styleUrls: ['taxon-name.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaxonNamePage extends AppReferentialEditor<TaxonName, TaxonNameService> {

  get useExistingReferenceTaxon(): boolean {
    return this.form.controls.useExistingReferenceTaxon.value;
  }

  @ViewChild('referentialForm', {static: true}) referentialForm: ReferentialForm;
  @ViewChild('wlcTable', {static: true}) wlcTable: WeightLengthConversionTable;

  constructor(
    protected injector: Injector,
    dataService: TaxonNameService,
    validatorService: TaxonNameValidatorService
  ) {
    super(injector,
      TaxonName,
      dataService,
      validatorService.getFormGroup(),
      {
        entityName: TaxonName.ENTITY_NAME,
        tabCount: 2
      }
    );

  }

  ngOnInit() {
    super.ngOnInit();

    const autocompleteConfig: MatAutocompleteFieldConfig = {
      suggestFn: (value, opts) => this.referentialRefService.suggest(value, opts),
      displayWith: (value) => value && joinPropertiesPath(value, ['label', 'name']),
      attributes: ['label', 'name'],
      columnSizes: [6, 6]
    };

    this.registerFieldDefinition({
      key: 'parentTaxonName',
      label: `REFERENTIAL.TAXON_NAME.PARENT`,
      type: 'entity',
      autocomplete: {
        ...autocompleteConfig,
        filter: {entityName: 'TaxonName', statusIds: [0, 1]}
      }
    });
    this.registerFieldDefinition({
      key: `taxonomicLevel`,
      label: `REFERENTIAL.TAXON_NAME.TAXONOMIC_LEVEL`,
      type: 'entity',
      autocomplete: {
        ...autocompleteConfig,
        filter: {entityName: 'TaxonomicLevel'}
      }
    });
    this.registerFieldDefinition({
      key: `isReferent`,
      label: `REFERENTIAL.TAXON_NAME.IS_REFERENT`,
      type: 'boolean'
    });
    this.registerFieldDefinition({
      key: `isNaming`,
      label: `REFERENTIAL.TAXON_NAME.IS_NAMING`,
      type: 'boolean'
    });
    this.registerFieldDefinition({
      key: `isVirtual`,
      label: `REFERENTIAL.TAXON_NAME.IS_VIRTUAL`,
      type: 'boolean'
    });
  }

  enable() {
    //When reload after save new Taxon name, super.enable() set referenceTaxonId to null, that why we save the value before.
    const referenceTaxonId = this.form.get('referenceTaxonId').value;
    super.enable();

    if (!this.isNewData) {
      this.form.get('referenceTaxonId').setValue(referenceTaxonId);
      this.form.get('referenceTaxonId').disable();
    }
  }

  /* -- protected methods -- */

  protected registerForms() {
    this.addChildForms([
      this.referentialForm,
      this.wlcTable
    ]);
  }

  protected setValue(data: TaxonName) {
    if (!data) return; // Skip

    super.setValue(data);

    // Set table's filter
    if (isNotNil(data.referenceTaxonId)) {
      this.wlcTable.setFilter({
        referenceTaxonId: data.referenceTaxonId
      });
      this.wlcTable.markAsReady();
    }
  }

  protected async getValue(): Promise<TaxonName> {
    const data = await super.getValue();

    // Re add reference taxon (field can be disabled)
    data.referenceTaxonId = this.form.get('referenceTaxonId').value;

    return data;
  }

  protected async onEntitySaved(data: TaxonName): Promise<void> {

    // Save table
    if (this.wlcTable.dirty) {
      await this.wlcTable.save();
    }
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.referentialForm.invalid) return 0;
    if (this.wlcTable.invalid) return 1;
    return -1;
  }

  protected async onNewEntity(data: TaxonName, options?: EntityServiceLoadOptions): Promise<void> {

    // Check Reference Taxon exists
    this.form.get('referenceTaxonId')
      .setAsyncValidators(async (control: AbstractControl) => {
        const useExistingReferenceTaxon = this.form.get('useExistingReferenceTaxon').value;
        if (this.isNewData && useExistingReferenceTaxon) {
          const referenceTaxon = control.enabled && control.value;
          if (!referenceTaxon) {
            return {required: true};
          } else if (!await this.dataService.referenceTaxonExists(referenceTaxon)) {
            return {not_exist: true};
          }
        }
        return null;
      });

    this.form.get('useExistingReferenceTaxon')
      .setAsyncValidators(async (control: AbstractControl) => {
        const useExistingReferenceTaxon = this.form.controls['useExistingReferenceTaxon'].value;
        if (useExistingReferenceTaxon) {
          this.form.get('referenceTaxonId').updateValueAndValidity();
        } else {
          this.form.get('referenceTaxonId').setValue(null);
        }
        return null;
      });

    await super.onNewEntity(data, options);
  }
}

