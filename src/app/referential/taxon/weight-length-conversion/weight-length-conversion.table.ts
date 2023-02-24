import { WeightLengthConversion } from './weight-length-conversion.model';
import { WeightLengthConversionFilter } from '../../services/filter/weight-length-conversion.filter';
import { Component, Injector, Input } from '@angular/core';
import { BaseReferentialTable } from '@app/referential/table/base-referential.table';
import { WeightLengthConversionService } from '@app/referential/taxon/weight-length-conversion/weight-length-conversion.service';
import { Validators } from '@angular/forms';
import { DateUtils, firstNotNilPromise, FormFieldDefinition, ReferentialRef, StatusIds } from '@sumaris-net/ngx-components';
import { WeightLengthConversionValidatorService } from '@app/referential/taxon/weight-length-conversion/weight-length-conversion.validator';
import moment from 'moment';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { LocationLevelGroups, ParameterLabelGroups, UnitLabelGroups } from '@app/referential/services/model/model.enum';
import { ParameterService } from '@app/referential/services/parameter.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-weight-length-conversion-table',
  templateUrl: '../../table/base-referential.table.html',
  styleUrls: [
    '../../table/base-referential.table.scss'
  ]
})
// @ts-ignore
export class WeightLengthConversionTable extends BaseReferentialTable<WeightLengthConversion, WeightLengthConversionFilter> {

   get referenceTaxonIdControl() {
    return this.filterForm.get('referenceTaxonId');
  }

  @Input() set referenceTaxonId(value: number) {
     if (this.referenceTaxonIdControl.value !== value) {
       this.referenceTaxonIdControl.setValue(value);
     }
  }

  get referenceTaxonId(): number {
    return this.referenceTaxonIdControl.value;
  }

  @Input() set showReferenceTaxonIdColumn(show: boolean) {
    this.setShowColumn('referenceTaxonId', show);
  }
  get showReferenceTaxonIdColumn(): boolean {
    return this.getShowColumn('referenceTaxonId');
  }

  private _$lengthParameters = new BehaviorSubject<ReferentialRef[]>([])
  private _$lengthUnits = new BehaviorSubject<ReferentialRef[]>([])
  private _locationLevelIds: number[];

  constructor(injector: Injector,
              entityService: WeightLengthConversionService,
              validatorService: WeightLengthConversionValidatorService,
              protected parameterService: ParameterService
  ) {
    super(injector,
      WeightLengthConversion,
      WeightLengthConversionFilter,
      entityService,
      validatorService,
      {
        i18nColumnPrefix: 'REFERENTIAL.TAXON_NAME.WEIGHT_LENGTH_CONVERSION.',
        canUpload: true
      }
      );
    this.showTitle = false;
    this.showIdColumn = false;
    this.autoLoad = false; // Wait filter
    this.sticky = true;
    this.logPrefix = '[weight-length-conversion-table] ';
  }

  ngOnInit() {
    super.ngOnInit();

    this.loadLengthParameters();
  }

  async ready(): Promise<void> {
    await super.ready();
    await firstNotNilPromise(this._$lengthParameters);
  }


  protected registerAutocompleteFields() {

    // Location
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('location', {
      showAllOnFocus: false,
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        levelIds: this._locationLevelIds
      }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE, StatusIds.DISABLE /*CIEM division are disabled*/]
      },
      mobile: this.mobile
    });

    // Sex
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('sex', {
      showAllOnFocus: false,
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        searchAttributes: ['name'],
        levelLabels: ParameterLabelGroups.SEX
      }),
      filter: {
        entityName: 'QualitativeValue',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY, StatusIds.DISABLE /*Non sexe*/]
      },
      attributes: ['name'],
      mobile: this.mobile
    });

    // Length parameter
    this.registerAutocompleteField('lengthParameter', {
      showAllOnFocus: false,
      items: this._$lengthParameters,
      attributes: this.settings.getFieldDisplayAttributes('parameter'),
      mobile: this.mobile
    });

    // Length unit
    this.registerAutocompleteField('lengthUnit', {
      showAllOnFocus: false,
      items: this._$lengthUnits,
      attributes: ['label'],
      mobile: this.mobile
    });
  }

  protected getFilterFormConfig(): any {
    console.debug(this.logPrefix + ' Creating filter form group...');
    return {
      // Not used
      //year: [null, Validators.compose([SharedValidators.integer, Validators.min(1970)])],
      referenceTaxonId: [null, Validators.required]
    };
  }

  protected defaultNewRowValue(): any {
    const creationDate = moment(new Date());
    const year = creationDate.get('year');
    return {
      ...super.defaultNewRowValue(),
      referenceTaxonId: this.referenceTaxonId,
      year,
      startMonth: 1,
      endMonth: 12,
      creationDate
    };
  }

  protected async parseCsvRowsToEntities(headers: FormFieldDefinition[], rows: string[][]): Promise<WeightLengthConversion[]> {
    const entities = await super.parseCsvRowsToEntities(headers, rows);

    // Force referenceTaxonId
    const creationDate = DateUtils.moment();
    entities.forEach(e => {
      e.referenceTaxonId = this.referenceTaxonId;
      e.creationDate = creationDate;
    });

    return entities;
  }

  protected async loadLengthParameters() {
     // Make sure service uis ready (e.g. enumerations has been overridden)
    await this.referentialRefService.ready();

    // Set the location levels used to filter
    this._locationLevelIds = LocationLevelGroups.WEIGHT_LENGTH_CONVERSION_AREA;

    // Length parameters
    await this.parameterService.loadAllByLabels(ParameterLabelGroups.LENGTH, {toEntity: false})
      .then(items => this._$lengthParameters.next(items));

    // Length units
    await this.referentialRefService.loadAllByLabels(UnitLabelGroups.LENGTH, 'Unit', {statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]})
      .then(items => this._$lengthUnits.next(items));
  }

}
