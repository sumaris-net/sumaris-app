import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { isNotNil, joinPropertiesPath, MatAutocompleteFieldConfig, Referential } from '@sumaris-net/ngx-components';
import { ReferentialService } from '@app/referential/services/referential.service';
import { RoundWeightConversionTable } from '@app/referential/taxon-group/round-weight-conversion/round-weight-conversion.table';
import { TaxonGroupValidatorService } from '@app/referential/taxon-group/taxon-group.validator';
import { AppReferentialEditor } from '@app/referential/form/referential-editor.class';
import { ReferentialForm } from '@app/referential/form/referential.form';
import { TaxonName } from '@app/referential/services/model/taxon-name.model';

@Component({
  selector: 'app-taxon-group',
  templateUrl: 'taxon-group.page.html',
  styleUrls: ['taxon-group.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaxonGroupPage extends AppReferentialEditor<Referential, ReferentialService> {

  get useExistingReferenceTaxon(): boolean {
    return this.form.controls.useExistingReferenceTaxon.value;
  }

  @ViewChild('referentialForm', {static: true}) referentialForm: ReferentialForm;
  @ViewChild('rwcTable', {static: true}) rwcTable: RoundWeightConversionTable;

  constructor(
    injector: Injector,
    dataService: ReferentialService,
    validatorService: TaxonGroupValidatorService
  ) {
    super(injector,
      Referential,
      dataService,
      validatorService.getFormGroup(),
      {
        entityName: 'TaxonGroup',
        uniqueLabel: false,
        withLevels: true,
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
      key: 'level',
      label: `REFERENTIAL.TAXON_GROUP.TAXON_GROUP_TYPE`,
      type: 'entity',
      autocomplete: {
        items: this.$levels,
        displayWith: (value) => value && joinPropertiesPath(value, ['label', 'name']),
        attributes: ['label', 'name'],
        columnSizes: [6, 6]
      }
    });
    this.registerFieldDefinition({
      key: 'parent',
      label: `REFERENTIAL.TAXON_GROUP.PARENT`,
      type: 'entity',
      autocomplete: {
        ...autocompleteConfig,
        filter: {entityName: 'TaxonGroup', statusIds: [0, 1]}
      }
    });

  }

  /* -- protected methods -- */

  protected registerForms() {
    this.addChildForms([
      this.referentialForm,
      this.rwcTable
    ]);
  }

  protected setValue(data: Referential) {

    super.setValue(data);

    // Set table filter
    if (isNotNil(data?.id)) {
      this.rwcTable.setFilter({
        taxonGroupId: data.id
      });
      this.rwcTable.markAsReady();
    }
  }

  protected async onEntitySaved(data: TaxonName): Promise<void> {

    // Save table
    if (this.rwcTable.dirty) {
      await this.rwcTable.save();
    }
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.referentialForm.invalid) return 0;
    if (this.rwcTable.invalid) return 1;
    return -1;
  }

}

