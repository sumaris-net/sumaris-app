import { RoundWeightConversion } from './round-weight-conversion.model';
import { RoundWeightConversionFilter } from './round-weight-conversion.filter';
import { Component, Injector, Input } from '@angular/core';
import { BaseReferentialTable } from '@app/referential/table/base-referential.table';
import { RoundWeightConversionService } from './round-weight-conversion.service';
import { Validators } from '@angular/forms';
import { ReferentialRef, StatusIds } from '@sumaris-net/ngx-components';
import { RoundWeightConversionValidatorService } from './round-weight-conversion.validator';
import moment from 'moment';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { LocationLevelIds, ParameterLabelGroups } from '@app/referential/services/model/model.enum';

@Component({
  selector: 'app-round-weight-conversion-table',
  templateUrl: '../table/base-referential.table.html',
  styleUrls: [
    '../table/base-referential.table.scss'
  ]
})
// @ts-ignore
export class RoundWeightConversionTable extends BaseReferentialTable<RoundWeightConversion, RoundWeightConversionFilter> {

   get taxonGroupIdControl() {
    return this.filterForm.get('taxonGroupId');
  }

  @Input() set taxonGroupId(value: number) {
     if (this.taxonGroupIdControl.value !== value) {
       this.taxonGroupIdControl.setValue(value);
     }
  }

  get taxonGroupId(): number {
    return this.taxonGroupIdControl.value;
  }

  @Input() set showTaxonGroupIdColumn(show: boolean) {
    this.setShowColumn('taxonGroupId', show);
  }
  get showTaxonGroupIdColumn(): boolean {
    return this.getShowColumn('taxonGroupId');
  }

  constructor(injector: Injector,
              entityService: RoundWeightConversionService,
              validatorService: RoundWeightConversionValidatorService
  ) {
    super(injector,
      RoundWeightConversion,
      RoundWeightConversionFilter,
      entityService,
      validatorService,
      {
        i18nColumnPrefix: 'REFERENTIAL.TAXON_GROUP.ROUND_WEIGHT_CONVERSION.',
        canUpload: true
      }
      );
    this.showTitle = false;
    this.showIdColumn = false;
    this.autoLoad = false; // Wait filter
    this.sticky = true;
    this.logPrefix = '[round-weight-conversion-table] ';
  }

  ngOnInit() {
    super.ngOnInit();
  }

  protected registerAutocompleteFields() {

    // Location
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('location', {
      showAllOnFocus: false,
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
        levelIds: [LocationLevelIds.COUNTRY]
      },
      mobile: this.mobile
    });

    // Dressing
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('dressing', {
      showAllOnFocus: false,
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        levelLabels: ParameterLabelGroups.DRESSING
      }),
      filter: {
        entityName: 'QualitativeValue',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      },
      mobile: this.mobile
    });

    // Preserving
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('preserving', {
      showAllOnFocus: false,
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        levelLabels: ParameterLabelGroups.PRESERVATION
      }),
      filter: {
        entityName: 'QualitativeValue',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      },
      mobile: this.mobile
    });
  }

  protected getFilterFormConfig(): any {
    console.debug(this.logPrefix + ' Creating filter form group...');
    return {
      taxonGroupId: [null, Validators.required]
    };
  }

  protected defaultNewRowValue(): any {
    const creationDate = moment(new Date());
    return {
      ...super.defaultNewRowValue(),
      startDate: null,
      endDate: null,
      taxonGroupId: this.taxonGroupId,
      creationDate
    };
  }

}
