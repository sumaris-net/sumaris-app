import { WeightLengthConversion } from '../services/model/weight-length-conversion.model';
import { WeightLengthConversionFilter } from '../services/filter/weight-length-conversion.filter';
import { Component, Injector, Input } from '@angular/core';
import { BaseReferentialTable, BaseReferentialTableOptions } from '@app/referential/table/base-referential.table';
import { WeightLengthConversionService } from '@app/referential/services/weight-length-conversion.service';
import { Validators } from '@angular/forms';
import { firstNotNilPromise, FormFieldDefinition, isNotNil, ReferentialRef, SharedValidators, StatusIds } from '@sumaris-net/ngx-components';
import { WeightLengthConversionValidatorService } from '@app/referential/services/validator/weight-length-conversion.validator';
import { TableElement } from '@e-is/ngx-material-table';
import moment from 'moment';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { LocationLevelIds, ParameterLabelGroups, UnitLabelGroups } from '@app/referential/services/model/model.enum';
import { Parameter } from '@app/referential/services/model/parameter.model';
import { ParameterService } from '@app/referential/services/parameter.service';
import { BehaviorSubject } from 'rxjs';
import { ErrorCodes } from '@app/referential/services/errors';

@Component({
  selector: 'app-weight-length-conversion-table',
  templateUrl: '../table/base-referential.table.html',
  styleUrls: [
    '../table/base-referential.table.scss'
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
        i18nColumnPrefix: 'REFERENTIAL.TAXON_NAME.WEIGHT_LENGTH_CONVERSION.'
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


  async upload(event: UIEvent) {

  }


  protected registerAutocompleteFields() {

    // Location
    const locationAttributes = this.settings.getFieldDisplayAttributes('location');
    this.registerAutocompleteField('location', {
      showAllOnFocus: false,
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        searchAttributes: locationAttributes,
        levelIds: this._locationLevelIds
      }),
      filter: <Partial<ReferentialRefFilter>>{
        entityName: 'Location',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      attributes: locationAttributes,
      mobile: this.mobile
    });

    // Sex
    this.registerAutocompleteField('sex', {
      showAllOnFocus: false,
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        searchAttributes: ['name'],
        levelLabels: ParameterLabelGroups.SEX
      }),
      filter: <ReferentialRefFilter>{
        entityName: 'QualitativeValue',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
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
      year: [null, Validators.compose([SharedValidators.integer, Validators.min(1970)])],
      referenceTaxonId: [null, Validators.required]
    };
  }

  protected onDefaultRowCreated(row: TableElement<WeightLengthConversion>) {
    super.onDefaultRowCreated(row);

    const creationDate = moment(new Date());
    const year = creationDate.get('year');
    row.validator.patchValue({
      year,
      startMonth: 1,
      endMonth: 12,
      statusId: StatusIds.ENABLE,
      creationDate
    })
  }

  protected async loadLengthParameters() {
     // Make sure service uis ready (e.g. enumerations has been overridden)
    await this.referentialRefService.ready();

    // Set the location levels used to filter
    this._locationLevelIds = LocationLevelIds.WEIGHT_LENGTH_CONVERSION_AREA;

    // Length parameters
    await this.parameterService.loadAllByLabels(ParameterLabelGroups.LENGTH, {toEntity: false})
      .then(items => this._$lengthParameters.next(items));

    // Length units
    await Promise.all(
      UnitLabelGroups.LENGTH.map(label => this.referentialRefService.loadAll(0, 1, null, null, { label, entityName: 'Unit'})
        .then(res => res?.data[0])
        .catch(err => {
            if (err && err.code === ErrorCodes.LOAD_REFERENTIAL_ERROR) return undefined; // Skip if not found
            throw err;
          })
      ))
      .then(items => this._$lengthUnits.next(items.filter(isNotNil)));
  }
}
