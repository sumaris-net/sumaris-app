import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, ViewChild} from '@angular/core';
import {FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn} from '@angular/forms';
import {DateAdapter} from '@angular/material/core';
import * as momentImported from 'moment';
import {Moment} from 'moment';
import {
  AppForm,
  AppFormUtils,
  DEFAULT_PLACEHOLDER_CHAR,
  EntityUtils,
  firstArrayValue,
  firstNotNilPromise,
  FormArrayHelper, FormErrors,
  fromDateISOString,
  IReferentialRef,
  isEmptyArray,
  isNil, isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LoadResult,
  LocalSettingsService,
  MatAutocompleteField,
  ObjectMap,
  ReferentialRef,
  ReferentialUtils,
  removeDuplicatesFromArray, SharedValidators,
  StatusIds,
  suggestFromArray,
  toNumber
} from '@sumaris-net/ngx-components';
import {PmfmStrategy} from '../../services/model/pmfm-strategy.model';
import {Program} from '../../services/model/program.model';
import {AppliedPeriod, AppliedStrategy, Strategy, StrategyDepartment, TaxonNameStrategy} from '../../services/model/strategy.model';
import {TaxonNameRef, TaxonUtils} from '../../services/model/taxon.model';
import {ReferentialRefService} from '../../services/referential-ref.service';
import {StrategyService} from '../../services/strategy.service';
import {StrategyValidatorService} from '../../services/validator/strategy.validator';
import {PmfmStrategiesTable} from '../pmfm-strategies.table';
import {AcquisitionLevelCodes, autoCompleteFractions, LocationLevelIds, ParameterLabelGroups, PmfmIds, ProgramPrivilegeIds, TaxonomicLevelIds} from '../../services/model/model.enum';
import {ProgramProperties} from '../../services/config/program.config';
import {BehaviorSubject, merge} from 'rxjs';
import {SamplingStrategyService} from '../../services/sampling-strategy.service';
import {PmfmFilter, PmfmService} from '../../services/pmfm.service';
import {SamplingStrategy, StrategyEffort} from '@app/referential/services/model/sampling-strategy.model';
import {TaxonName} from '@app/referential/services/model/taxon-name.model';

const moment = momentImported;

@Component({
  selector: 'app-sampling-strategy-form',
  templateUrl: './sampling-strategy.form.html',
  styleUrls: ['./sampling-strategy.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplingStrategyForm extends AppForm<Strategy> implements OnInit {

  private _$pmfmGroups: BehaviorSubject<ObjectMap<number[]>> = new BehaviorSubject(null);

  mobile: boolean;
  $program = new BehaviorSubject<Program>(null);
  labelMask: (string | RegExp)[];
  data: SamplingStrategy;

  hasEffort = false;

  taxonNamesHelper: FormArrayHelper<TaxonNameStrategy>;
  departmentsHelper: FormArrayHelper<StrategyDepartment>;
  appliedStrategiesHelper: FormArrayHelper<AppliedStrategy>;
  appliedPeriodsHelper: FormArrayHelper<AppliedPeriod>;
  calcifiedFractionsHelper: FormArrayHelper<PmfmStrategy>;
  sexAndAgeHelper: FormArrayHelper<PmfmStrategy>;

  autocompleteFilters = {
    analyticReference: false,
    location: false,
    taxonName: false,
    department: false,
    fraction: false
  };

  readonly pmfmFilters = {
    weight: <PmfmFilter>{
      levelLabels: ParameterLabelGroups.WEIGHT
    },
    length: <PmfmFilter>{
      levelLabels: ParameterLabelGroups.LENGTH
    },
    maturity: <PmfmFilter>{
      levelLabels: ParameterLabelGroups.MATURITY
    }
  };

  get value(): any {
    throw new Error("Not implemented! Please use getValue() instead, that is an async function");
  }

  @Input() set program(value: Program) {
    this.setProgram(value);
  }

  get program(): Program {
    return this.$program.getValue();
  }

  @Input() tabIndex: number;
  @Input() showError = true;
  @Input() i18nFieldPrefix = 'PROGRAM.STRATEGY.EDIT.';
  @Input() placeholderChar: string = DEFAULT_PLACEHOLDER_CHAR;


  get appliedStrategiesForm(): FormArray {
    return this.form.controls.appliedStrategies as FormArray;
  }

  get appliedStrategyForm(): FormGroup {
    return this.appliedStrategiesHelper && this.appliedStrategiesHelper.at(0) as FormGroup;
  }

  get appliedPeriodsForm(): FormArray {
    const appliedStrategyForm = this.appliedStrategyForm;
    return appliedStrategyForm && appliedStrategyForm.controls.appliedPeriods as FormArray;
  }

  get departmentsFormArray(): FormArray {
    return this.form.controls.departments as FormArray;
  }

  get taxonNamesFormArray(): FormArray {
    return this.form.controls.taxonNames as FormArray;
  }


  get pmfmsForm(): FormArray {
    return this.form.controls.pmfms as FormArray;
  }

  get pmfmsFractionForm(): FormArray {
    return this.form.controls.pmfmsFraction as FormArray;
  }

  @ViewChild('weightPmfmStrategiesTable', { static: true }) weightPmfmStrategiesTable: PmfmStrategiesTable;
  @ViewChild('lengthPmfmStrategiesTable', { static: true }) lengthPmfmStrategiesTable: PmfmStrategiesTable;
  @ViewChild('maturityPmfmStrategiesTable', { static: true }) maturityPmfmStrategiesTable: PmfmStrategiesTable;

  analyticsReferenceItems: BehaviorSubject<ReferentialRef[]> = new BehaviorSubject(null);
  locationItems: BehaviorSubject<ReferentialRef[]> = new BehaviorSubject(null);
  departmentItems: BehaviorSubject<ReferentialRef[]> = new BehaviorSubject(null);
  fractionItems: BehaviorSubject<ReferentialRef[]> = new BehaviorSubject(null);
  taxonNameItems: BehaviorSubject<TaxonNameRef[]> = new BehaviorSubject(null);

  allFractionItems: BehaviorSubject<ReferentialRef[]> = new BehaviorSubject(null);

  constructor(
    protected dateAdapter: DateAdapter<Moment>,
    protected validatorService: StrategyValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected samplingStrategyService: SamplingStrategyService,
    protected pmfmService: PmfmService,
    protected strategyService: StrategyService,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef,
    protected formBuilder: FormBuilder
  ) {
    super(dateAdapter, validatorService.getFormGroup(), settings);
    this.mobile = this.settings.mobile;

    // Add missing control
    this.form.addControl('year', new FormControl());
    this.form.addControl('sex', new FormControl());
    this.form.addControl('age', new FormControl());

    // Init array helpers
    this.initDepartmentsHelper();
    this.initTaxonNameHelper();
    this.initPmfmStrategiesHelper();
    this.initAppliedStrategiesHelper();
    this.initAppliedPeriodHelper();
    this.initPmfmStrategiesFractionHelper();
  }

  enable(opts?: { onlySelf?: boolean, emitEvent?: boolean; }) {
    super.enable(opts);
    if (this.hasEffort) {
      this.weightPmfmStrategiesTable.disable();
      this.lengthPmfmStrategiesTable.disable();
      this.maturityPmfmStrategiesTable.disable();
      this.taxonNamesFormArray.disable();
      this.appliedStrategiesForm.disable();
      this.form.get('analyticReference').disable();
      this.form.get('year').disable();
      this.form.get('label').disable();
      this.form.get('age').disable();
      this.form.get('sex').disable();
    }
  }

  ngOnInit() {
    super.ngOnInit();

    this.referentialRefService.loadAll(0, 0, null, null, { entityName: 'Fraction' }).then((res) => {
      this.allFractionItems.next(res.data);
    });

    this.pmfmService.loadIdsGroupByParameterLabels(ParameterLabelGroups).then(map => this._$pmfmGroups.next(map));

    this.registerSubscription(
      merge(
        // Delete a row
        this.weightPmfmStrategiesTable.onCancelOrDeleteRow,
        this.lengthPmfmStrategiesTable.onCancelOrDeleteRow,
        this.maturityPmfmStrategiesTable.onCancelOrDeleteRow,

        // Add a row
        this.weightPmfmStrategiesTable.onConfirmEditCreateRow,
        this.lengthPmfmStrategiesTable.onConfirmEditCreateRow,
        this.maturityPmfmStrategiesTable.onConfirmEditCreateRow
      )
        .subscribe(() => this.initPmfmStrategies())
    );

    this.registerSubscription(this.form.get('age').valueChanges.subscribe(res => this.loadFraction()));
    this.taxonNamesFormArray.setAsyncValidators([
      async (control) => {
        this.loadFraction();
        return null;
      }
    ]);

    this.appliedPeriodsForm.setAsyncValidators([
      async (control) => {
        const minLength = 1;
        const appliedPeriods = control.value;
        if (!isEmptyArray(appliedPeriods)) {
          const values = appliedPeriods.filter(appliedPeriod => toNumber(appliedPeriod.acquisitionNumber, 0) >= 1);
          if (!isEmptyArray(values) && values.length >= minLength) {
            SharedValidators.clearError(control, 'minLength');
            return null;
          }
        }
        return <ValidationErrors>{ minLength: { minLength } };
      },
      // Check quarter acquisitionNumber is not
      async (control) => {
        const appliedPeriods = (control.value as any[]);
        const invalidQuarters = (appliedPeriods || [])
          .map(AppliedPeriod.fromObject)
          .filter(period => {
            const quarter = period.startDate.quarter();
            const quarterEffort: StrategyEffort = this.data && this.data.effortByQuarter && this.data.effortByQuarter[quarter];
            return quarterEffort && quarterEffort.hasRealizedEffort && (isNil(period.acquisitionNumber) || period.acquisitionNumber < 0);
          }).map(period => period.startDate.quarter());
        if (isNotEmptyArray(invalidQuarters)) {
          return <ValidationErrors>{ hasRealizedEffort: { quarters: invalidQuarters } };
        }
        SharedValidators.clearError(control, 'hasRealizedEffort');
        return null;
      }
    ]);

    this.form.get('pmfms').setAsyncValidators([
      //Check if WEIGHT or LENGTH
      async (control) => {
        const pmfms = control.value.flat();
        if (!isEmptyArray(pmfms)) {
          const pmfmGroups = await firstNotNilPromise(this._$pmfmGroups);
          const weight = this.getPmfmsByType(pmfms, pmfmGroups.WEIGHT, ParameterLabelGroups.WEIGHT);
          const length = this.getPmfmsByType(pmfms, pmfmGroups.LENGTH, ParameterLabelGroups.LENGTH);
          if (isEmptyArray(weight) && isEmptyArray(length)) {
            return <ValidationErrors>{ weightOrSize: true };
          }
          SharedValidators.clearError(control, 'weightOrSize');
        } else {
          return <ValidationErrors>{ weightOrSize: true };
        }
      }
    ]);

    this.form.setAsyncValidators([
      async (control) => {
        // allow user to save without valid pmfm table
        await this.weightPmfmStrategiesTable.save();
        await this.lengthPmfmStrategiesTable.save();
        await this.maturityPmfmStrategiesTable.save();
        //Check number of selected pmfms
        const minLength = 2;
        const pmfms = control.get('pmfms').value.flat();
        const sex = control.get('sex').value;
        const age = control.get('age').value;
        let length = 0;
        if (age) length++;
        if (sex) length++;

        if (!isEmptyArray(pmfms)) {
          const pmfmGroups = await firstNotNilPromise(this._$pmfmGroups);
          length += this.getPmfmsByType(pmfms, pmfmGroups.WEIGHT, ParameterLabelGroups.WEIGHT).length;
          length += this.getPmfmsByType(pmfms, pmfmGroups.LENGTH, ParameterLabelGroups.LENGTH).length;
          if (sex) length += this.getPmfmsByType(pmfms, pmfmGroups.MATURITY, ParameterLabelGroups.MATURITY).length;
        }

        if (length < minLength) {
          return <ValidationErrors>{ minLength: { minLength } };
        }
        SharedValidators.clearError(control, 'minLength');
      }
    ]);

    this.registerSubscription(this.form.get('label').valueChanges.subscribe(value => this.onEditLabel(value)));
    // register year field changes
    this.registerSubscription(this.form.get('year').valueChanges.subscribe(date => this.onDateChange(date)));
    this.registerSubscription(this.taxonNamesFormArray.valueChanges.subscribe(() => this.onTaxonChange()));
    this.taxonNamesFormArray.valueChanges.subscribe(res => this.loadFilteredPmfm());

    const idControl = this.form.get('id');
    this.form.get('label').setAsyncValidators([
    async (control) => {
      const label = control.value;
      const parts = label.split(" ");
      if (parts.some(str => str.indexOf("_") !== -1)) {
        return <ValidationErrors>{ required: true };
      }
      if (label.includes('000')) {
        return <ValidationErrors>{ zero: true };
      }
      console.debug('[sampling-strategy-form] Checking of label is unique...');
        const exists = await this.strategyService.existsByLabel(label, {
          programId: this.program && this.program.id,
          excludedIds: isNotNil(idControl.value) ? [idControl.value] : undefined,
          fetchPolicy: 'network-only' // Force to check remotely
        });
        if (exists) {
          console.warn('[sampling-strategy-form] Label not unique!');
          return <ValidationErrors>{ unique: true };
        }

        console.debug('[sampling-strategy-form] Checking of label is unique [OK]');
        SharedValidators.clearError(control, 'unique');
        SharedValidators.clearError(control, 'zero');
      }
    ]);

    // taxonName autocomplete
    this.registerAutocompleteField('taxonName', {
      suggestFn: (value, filter) => this.suggestTaxonName(value, {
        ...filter,
        statusIds: [StatusIds.ENABLE],
        levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES]
      }),
      attributes: ['name'],
      columnNames: ['REFERENTIAL.NAME'],
      mobile: this.settings.mobile
    });

    // Department autocomplete
    this.registerAutocompleteField('department', {
      suggestFn: (value, filter) => this.suggestDepartments(value, {
        ...filter, statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }),
      columnSizes: [4, 8],
      mobile: this.settings.mobile
    });

    // appliedStrategy autocomplete
    this.registerAutocompleteField('location', {
      suggestFn: (value, filter) => this.suggestLocations(value, {
        ...filter,
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        levelIds: [LocationLevelIds.ICES_DIVISION]
      }),
      mobile: this.settings.mobile
    });

    // Analytic reference autocomplete
    this.registerAutocompleteField('analyticReference', {
      suggestFn: (value, filter) => this.suggestAnalyticReferences(value, {
        ...filter, statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }),
      columnSizes: [4, 6],
      mobile: this.settings.mobile
    });

    // Fraction autocomplete
    this.registerAutocompleteField('fraction', {
      suggestFn: (value, filter) => this.suggestAgeFractions(value, {
        ...filter, statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }),
      attributes: ['name'],
      columnNames: ['REFERENTIAL.NAME'],
      mobile: this.settings.mobile
    });
  }


  protected setProgram(program: Program, opts?: { emitEvent?: boolean; }) {
    if (program && this.program !== program) {
      this.i18nFieldPrefix = 'PROGRAM.STRATEGY.EDIT.';
      const i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX) || '';
      this.i18nFieldPrefix += i18nSuffix !== 'legacy' && i18nSuffix || '';

      // Load items from historical data
      this.loadFilteredItems(program);

      this.$program.next(program);

      if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }

      // When program is loaded, reload increment
      this.onDateChange();
    }
  }

  loadFraction(): void {
    if (this.ifAge() && this.taxonNamesFormArray.value && this.taxonNamesFormArray.value[0]) {
      const taxon = this.taxonNamesFormArray.value[0];
      const fractionName = autoCompleteFractions[taxon.taxonName.id];
      if (fractionName) {
        const fraction = this.allFractionItems.value.find(f => f.label.toUpperCase() === fractionName.toUpperCase());
        this.pmfmsFractionForm.patchValue([fraction]);
      }
    }
  }

  async loadFilteredPmfm() {
    const program = this.$program.value;
    const taxon = isNotEmptyArray(this.taxonNamesFormArray.value) && this.taxonNamesFormArray.value[0] && this.taxonNamesFormArray.value[0].taxonName;
    if (program) {
      const strategies = await this.samplingStrategyService.loadAll(0, 1000, 'label', 'desc', {
        levelId: program.id,
        // searchJoin: 'referenceTaxons.referenceTaxon',
        // searchAttribute: 'id',
        // searchText: taxon.id
      });
    }
  }

  async loadFilteredItems(program: Program): Promise<void> {

    const sortFn = (a: ReferentialRef, b: ReferentialRef) => {
      if (a.label < b.label) { return -1; }
      if (a.label > b.label) { return 1; }
      return 0;
    };
    const sortFnByName = (a: ReferentialRef, b: ReferentialRef) => {
      if (a.name < b.name) { return -1; }
      if (a.name > b.name) { return 1; }
      return 0;
    };

    // Load historical data
    // TODO BLA: check if sort by label works fine
    const items = await this.samplingStrategyService.loadAll(0, 20, 'label', 'desc', {
      levelId: program.id
    });

    const data = (items.data || []);

    // Departments
    const departments: ReferentialRef[] = removeDuplicatesFromArray(
      data.reduce((res, strategy) =>
        res.concat(...strategy.departments), [])
        .reduce((res, department: StrategyDepartment) => res.concat([department.department]), []),
      'id');
    departments.sort(sortFn);
    this.departmentItems.next(departments);

    // Locations
    const locations: ReferentialRef[] = removeDuplicatesFromArray(
      data.reduce((res, strategy) =>
        res.concat(...strategy.appliedStrategies), [])
        .reduce((res, appliedStrategy: AppliedStrategy) =>
          res.concat([appliedStrategy.location]), []),
      'id');
    locations.sort(sortFn);
    this.locationItems.next(locations);

    // Taxons
    const taxons: TaxonNameRef[] = removeDuplicatesFromArray(
      data.reduce((res, strategy) =>
        res.concat(...strategy.taxonNames), [])
        .reduce((res, taxonName: TaxonNameStrategy): TaxonNameRef[] =>
          res.concat([taxonName.taxonName]), []),
      'id');
    taxons.sort(sortFnByName);
    this.taxonNameItems.next(taxons);

    // Fractions
    const fractionIds: number[] = removeDuplicatesFromArray(data
      .reduce((res, strategy) => res.concat(...strategy.pmfms), [])
      .reduce((res, pmfmStrategie) => res.concat(pmfmStrategie.fraction && pmfmStrategie.fraction.id), [])
    );

    const fractions = (
      await Promise.all(
        fractionIds.map(id => this.referentialRefService.loadAll(0, 1, null, null, { includedIds: [id], entityName: 'Fraction' })
          .then(res => res && firstArrayValue(res.data)))
      ))
      .filter(isNotNil)
      .sort(sortFn);
    this.fractionItems.next(fractions);

    // Analytic References
    try {
      const analyticReferences: ReferentialRef[] = (
        await Promise.all(
          data
            .map(strategy => strategy.analyticReference)
            .filter(isNotNilOrBlank)

            .map(analyticReference =>
              this.strategyService.loadAllAnalyticReferences(0, 1, 'label', 'desc', { label: analyticReference })
                .then(res => res && firstArrayValue(res.data)))
        ))
        .filter(isNotNil)
        .sort(sortFn);
      this.analyticsReferenceItems.next(removeDuplicatesFromArray(analyticReferences, 'id'));
    } catch (err) {
      console.debug('Error on load AnalyticReference');
    }

    // set label if data already exist
    const labelAlreadyExist = this.form.get('id').value
    if (labelAlreadyExist) {
      const currentData = data.find(elem => elem.id === labelAlreadyExist)
      this.form.get('label').setValue(currentData.label);
    }
  }


  async getAnalyticReferenceByLabel(label: string): Promise<ReferentialRef> {
    if (isNilOrBlank(label)) return undefined;
    try {
      const res = await this.strategyService.loadAllAnalyticReferences(0, 1, 'label', 'desc', { label });
      return firstArrayValue(res && res.data || []);
    } catch (err) {
      console.debug('Error on load AnalyticReference');
    }
  }

  async initPmfmStrategies() {
    const pmfms = [];

    // TODO BLA: review this code

    await this.weightPmfmStrategiesTable.save();
    await this.lengthPmfmStrategiesTable.save();
    await this.maturityPmfmStrategiesTable.save();

    const weights = this.weightPmfmStrategiesTable.value.filter(p => p.pmfm || p.parameter);
    const lengths = this.lengthPmfmStrategiesTable.value.filter(p => p.pmfm || p.parameter);
    const maturities = this.maturityPmfmStrategiesTable.value.filter(p => p.pmfm || p.parameter);

    pmfms.push(weights);
    pmfms.push(lengths);
    pmfms.push(maturities);

    if (weights.length <= 0) { this.weightPmfmStrategiesTable.value = [new PmfmStrategy()]; }
    if (lengths.length <= 0) { this.lengthPmfmStrategiesTable.value = [new PmfmStrategy()]; }
    if (maturities.length <= 0) { this.maturityPmfmStrategiesTable.value = [new PmfmStrategy()]; }

    this.form.controls.pmfms.patchValue(pmfms);
    this.pmfmsForm.markAsTouched();
    this.markAsDirty();
  }

  /**
   * Select text that can be changed, using the text mask
   * @param input
   */
  selectMask(input: HTMLInputElement) {
    if (!this.labelMask) input.select();
    const startIndex = this.labelMask.findIndex(c => c instanceof RegExp);
    const endIndex = this.labelMask.length;
    input.setSelectionRange(startIndex, endIndex, "backward");
  }

  toggleFilter(fieldName: string, field?: MatAutocompleteField) {
    this.autocompleteFilters[fieldName] = !this.autocompleteFilters[fieldName];
    this.markForCheck();

    if (field) field.reloadItems();
  }

  /**
   * Suggest autocomplete values
   * @param value
   * @param filter - filters to apply
   */
  protected async suggestLocations(value: string, filter: any): Promise<LoadResult<IReferentialRef>> {
    if (this.autocompleteFilters.location) {
      return suggestFromArray(this.locationItems.getValue(), value, filter);
    } else {
      return this.referentialRefService.suggest(value, {
        ...filter,
        entityName: 'Location'
      });
    }
  }

  /**
   * Suggest autocomplete values
   * @param value
   * @param filter - filters to apply
   */
  protected async suggestAnalyticReferences(value: string, filter: any): Promise<LoadResult<IReferentialRef>> {
    if (this.autocompleteFilters.analyticReference) {
      return suggestFromArray(this.analyticsReferenceItems.getValue(), value, filter);
    } else {
      return this.strategyService.suggestAnalyticReferences(value, filter);
    }
  }



  /**
   * Suggest autocomplete values, for age fraction
   * @param value
   * @param filter - filters to apply
   */
  protected async suggestAgeFractions(value: string, filter: any): Promise<LoadResult<IReferentialRef>> {
    if (this.autocompleteFilters.fraction) {
      return suggestFromArray(this.fractionItems.getValue(), value, filter);
    } else {
      return this.referentialRefService.suggest(value, {
        ...filter,
        entityName: 'Fraction'
      });
    }
  }

  /**
   * Suggest autocomplete values
   * @param value
   * @param filter - filters to apply
   */
  protected async suggestDepartments(value: string, filter: any): Promise<LoadResult<IReferentialRef>> {
    if (this.autocompleteFilters.department) {
      return suggestFromArray(this.departmentItems.getValue(), value, filter);
    } else {
      return this.referentialRefService.suggest(value, {
        ...filter,
        entityName: 'Department'
      });
    }
  }

  protected async suggestTaxonName(value: string, filter: any): Promise<LoadResult<TaxonNameRef>> {
    if (this.autocompleteFilters.taxonName) {
      return suggestFromArray(this.taxonNameItems.getValue(), value, filter);
    } else {
      return this.referentialRefService.suggestTaxonNames(value,
        {
          ...filter,
          entityName: 'TaxonName'
        },
      );
    }
  }

  setValue(data: Strategy, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    console.debug("[sampling-strategy-form] Setting Strategy value", data);
    if (!data) return;

    this.data = new SamplingStrategy();
    this.data.fromObject(data);

    // Fill efforts (need by validator)
    this.samplingStrategyService.fillEfforts([this.data]).then((test) => {
      this.hasEffort = this.data.hasRealizedEffort;
      this.enable();
    });

    // Make sure to have (at least) one department
    data.departments = data.departments && data.departments.length ? data.departments : [null];
    // Resize strategy department array
    this.departmentsHelper.resize(Math.max(1, data.departments.length));

    data.appliedStrategies = isNotEmptyArray(data.appliedStrategies) ? data.appliedStrategies : [new AppliedStrategy()];
    // Resize strategy department array
    this.appliedStrategiesHelper.resize(Math.max(1, data.appliedStrategies.length));

    data.taxonNames = data.taxonNames && data.taxonNames.length ? data.taxonNames : [null];
    // Resize pmfm strategy array
    this.taxonNamesHelper.resize(Math.max(1, data.taxonNames.length));


    // APPLIED_PERIODS
    // get model appliedPeriods which are stored in first applied strategy
    const appliedStrategyWithPeriods = firstArrayValue((data.appliedStrategies || []).filter(as => as && isNotEmptyArray(as.appliedPeriods)))
      || firstArrayValue(data.appliedStrategies || []);
    const appliedPeriods = appliedStrategyWithPeriods.appliedPeriods || [];

    // Find year, from applied period, or use current
    const year: number = firstArrayValue(appliedPeriods.map(ap => ap.startDate.year())) || moment().year();

    // format periods for applied period in view and init default period by quarter if no set
    appliedStrategyWithPeriods.appliedPeriods = [1, 2, 3, 4].map(quarter => {
      const startMonth = (quarter - 1) * 3 + 1;
      const startDate = fromDateISOString(`${year}-${startMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`).utc();
      const endDate = startDate.clone().add(2, 'month').endOf('month').startOf('day');
      // Find the existing entity, or create a new one
      const appliedPeriod = appliedPeriods && appliedPeriods.find(period => period.startDate.month() === startDate.month())
        || AppliedPeriod.fromObject({ acquisitionNumber: undefined });
      appliedPeriod.startDate = startDate;
      appliedPeriod.endDate = endDate;

      return appliedPeriod;
    });

    // Resize applied periods array
    this.appliedPeriodsHelper.resize(4);

    super.setValue(data, opts);

    // Get fisrt period
    const firstAppliedPeriod = firstArrayValue(appliedStrategyWithPeriods.appliedPeriods);

    this.getAnalyticReferenceByLabel(data.analyticReference).then(data => {
      this.form.patchValue({
        year: firstAppliedPeriod ? firstAppliedPeriod.startDate : moment(),
        analyticReference: data && { label: data.label, name: data.name } || null
      });
    });

    // If new
    if (isNil(data.id)) {
      // pmfms = [null, null];
      this.form.get('sex').patchValue(null);
      this.form.get('age').patchValue(null);
    } else {
      // pmfms = [hasSex, hasAge];
      this.form.get('age').patchValue((data.pmfms || []).findIndex(p => p.pmfmId && p.pmfmId === PmfmIds.AGE) !== -1);
      this.form.get('sex').patchValue((data.pmfms || []).findIndex(p => p.pmfmId && p.pmfmId === PmfmIds.SEX) !== -1);
    }


    firstNotNilPromise(this._$pmfmGroups).then((pmfmGroups) => {
      const pmfms = [];

      //WEIGHT
      const weightPmfmStrategy = this.getPmfmsByType(data.pmfms, pmfmGroups.WEIGHT, ParameterLabelGroups.WEIGHT);
      pmfms.push(weightPmfmStrategy.length > 0 ? weightPmfmStrategy : []);
      this.weightPmfmStrategiesTable.value = weightPmfmStrategy.length > 0 ? weightPmfmStrategy : [new PmfmStrategy()];

      // LENGTH
      const lengthPmfmStrategies = this.getPmfmsByType(data.pmfms, pmfmGroups.LENGTH, ParameterLabelGroups.LENGTH);
      pmfms.push(lengthPmfmStrategies.length > 0 ? lengthPmfmStrategies : []);
      this.lengthPmfmStrategiesTable.value = lengthPmfmStrategies.length > 0 ? lengthPmfmStrategies : [new PmfmStrategy()];

      // MATURITY
      const maturityPmfmStrategies = this.getPmfmsByType(data.pmfms, pmfmGroups.MATURITY, ParameterLabelGroups.MATURITY);
      pmfms.push(maturityPmfmStrategies.length > 0 ? maturityPmfmStrategies : []);
      this.maturityPmfmStrategiesTable.value = maturityPmfmStrategies.length > 0 ? maturityPmfmStrategies : [new PmfmStrategy()];

      this.pmfmsForm.patchValue(pmfms);
    });

    this.referentialRefService.loadAll(0, 1000, null, null,
      {
        entityName: 'Fraction'
      },
      { withTotal: false /* total not need */ }
    ).then(res => {
      const calcifiedTypeControl = this.pmfmsFractionForm;
      const pmfmStrategiesWithFraction = (data.pmfms || []).filter(p => p.fraction && !p.pmfm);
      const fractions = pmfmStrategiesWithFraction.map(cal => {
        return {
          id: cal.fraction.id,
          name: res.data.find(fraction => fraction.id === cal.fraction.id).name,
        };
      });
      calcifiedTypeControl.clear();
      this.calcifiedFractionsHelper.resize(Math.max(1, pmfmStrategiesWithFraction.length));
      calcifiedTypeControl.patchValue(fractions);
    });
  }


  async getValue(): Promise<Strategy> {
    const json = this.form.value;
    const target = Strategy.fromObject(json);

    target.name = target.label || target.name;
    target.label = target.label || target.name;
    target.description = target.label || target.description;
    target.analyticReference = target.analyticReference && EntityUtils.isNotEmpty(target.analyticReference, 'label') ?
      target.analyticReference['label'] :
      EntityUtils.isNotEmpty(this.form.get('analyticReference').value, 'label') ?
        this.form.get('analyticReference').value.label :
        this.form.get('analyticReference').value;

    // get taxonName and
    target.taxonNames = (this.form.controls.taxonNames.value || []).map(TaxonNameStrategy.fromObject);
    target.taxonNames.forEach(taxonNameStrategy => {
      delete taxonNameStrategy.strategyId; // Not need when saved
      taxonNameStrategy.priorityLevel = taxonNameStrategy.priorityLevel || 1;
      taxonNameStrategy.taxonName = TaxonNameRef.fromObject({
        ...taxonNameStrategy.taxonName,
        taxonGroupIds: undefined
      });
    });

    // Apply observer privilege to departments
    const observerPrivilege = ReferentialRef.fromObject({ id: ProgramPrivilegeIds.OBSERVER, entityName: 'ProgramPrivilege' });
    target.departments = (target.departments || []).map(StrategyDepartment.fromObject);
    target.departments.forEach(department => {
      department.privilege = observerPrivilege;
    });

    // Compute year
    const year = isNotNil(this.form.controls.year.value) ? moment(this.form.controls.year.value).year() : moment().year();

    // Fishing Area + Efforts --------------------------------------------------------------------------------------------

    const appliedStrategyWithPeriods = firstArrayValue((target.appliedStrategies || []).filter(as => isNotEmptyArray(as.appliedPeriods)));
    if (appliedStrategyWithPeriods) {
      appliedStrategyWithPeriods.appliedPeriods = (appliedStrategyWithPeriods && appliedStrategyWithPeriods.appliedPeriods || [])
        // Exclude period without acquisition number
        .filter(period => isNotNil(period.acquisitionNumber))
        .map(ap => {
          // Set year (a quarter should be already set)
          ap.startDate.set('year', year);
          ap.endDate.set('year', year);
          ap.appliedStrategyId = appliedStrategyWithPeriods.id;
          return ap;
        });

      // Clean periods, on each other applied strategies
      (target.appliedStrategies || [])
        .filter(as => as !== appliedStrategyWithPeriods)
        .forEach(appliedStrategy => appliedStrategy.appliedPeriods = []);
    }

    // PMFM + Fractions -------------------------------------------------------------------------------------------------
    const sex = this.form.get('sex').value;
    const age = this.form.get('age').value;

    // Save before get PMFM values
    await this.weightPmfmStrategiesTable.save();
    await this.lengthPmfmStrategiesTable.save();

    let pmfmStrategies: any[] = [
      // Add tag id Pmfm
      <PmfmStrategy>{ pmfm: { id: PmfmIds.TAG_ID } },
      // Add dressing Pmfm
      <PmfmStrategy>{ pmfm: { id: PmfmIds.DRESSING } },
      // Add weights Pmfm
      ...this.weightPmfmStrategiesTable.value,
      // Add length Pmfm
      ...this.lengthPmfmStrategiesTable.value
    ];

    // Add SEX Pmfm
    if (sex) {
      pmfmStrategies.push(<PmfmStrategy>{ pmfm: { id: PmfmIds.SEX } });

      // Add maturity pmfms
      await this.maturityPmfmStrategiesTable.save();
      pmfmStrategies = pmfmStrategies.concat(
        ...this.maturityPmfmStrategiesTable.value
      );
    }

    // Add AGE Pmfm
    if (age) {
      pmfmStrategies.push(<PmfmStrategy>{ pmfm: { id: PmfmIds.AGE } });

      // Pièces calcifiées
      (json.pmfmsFraction || [])
        .map(fraction => <PmfmStrategy>{ fraction })
        .filter(isNotNil)
        .forEach(pmfm => pmfmStrategies.push(pmfm));
    }

    // Fill PmfmStrategy defaults
    let rankOrder = 1;
    target.pmfms = pmfmStrategies
      .map(PmfmStrategy.fromObject)
      .map(pmfmStrategy => {
        pmfmStrategy.strategyId = pmfmStrategy.id;
        pmfmStrategy.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;
        pmfmStrategy.acquisitionNumber = 1;
        pmfmStrategy.isMandatory = false;
        pmfmStrategy.rankOrder = rankOrder++;
        return pmfmStrategy;
      })
      // Remove if empty
      .filter(p => isNotNil(p.pmfm) || isNotNil(p.parameter) || isNotNil(p.matrix) || isNotNil(p.fraction) || isNotNil(p.method));


    return target;
  }

  protected async onEditLabel(value: string) {
    const labelControl = this.form.get('label');
    const taxonNameControl = this.taxonNamesHelper.at(0);
    if (taxonNameControl.hasError('cannotComputeTaxonCode') || taxonNameControl.hasError('uniqueTaxonCode')) {
      const labelRegex = new RegExp(/^\d\d [a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z]/);
      if (value.match(labelRegex)) {
        const isUnique = (await this.referentialRefService.countAll({
          entityName: TaxonName.ENTITY_NAME,
          searchText: TaxonUtils.generateNameSearchPatternFromLabel(value.substring(3, 10)),
          searchAttribute: 'name',
          statusIds: [StatusIds.ENABLE],
          levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES]
        })) === 0;
        if (!isUnique) {
          taxonNameControl.setErrors({ uniqueTaxonCode: true });
        } else {
          SharedValidators.clearError(this.taxonNamesHelper.at(0), 'cannotComputeTaxonCode');
          SharedValidators.clearError(this.taxonNamesHelper.at(0), 'uniqueTaxonCode');
          const computedLabel = this.program && (await this.strategyService.computeNextLabel(this.program.id, value.substring(0, 10).toUpperCase(), 3));
          labelControl.setValue(computedLabel);
        }
      }
    }
  }

  protected async onDateChange(date?: Moment) {
    date = fromDateISOString(date || this.form.get('year').value);
    if (!date || !this.program) return; // Skip if date or program are missing

    const finalMaskYear = date.format('YY');
    return await this.generateLabel(finalMaskYear);
  }

  protected async onTaxonChange(date?: Moment) {
    date = fromDateISOString(date || this.form.get('year').value);
    if (!date || !this.program) return; // Skip if program is missing

    const finalMaskYear = date.format('YY');
    return await this.generateLabel(finalMaskYear);
  }

  protected async generateLabel(finalMaskYear: any) {
    let finalMaskTaxonName;
    let errors: ValidationErrors;
    const taxonNameControl = this.taxonNamesHelper.at(0);
    const taxonName = taxonNameControl?.value?.taxonName;

    const label = taxonName && TaxonUtils.generateLabelFromName(taxonName.name);
    const isUnique = label && (await this.referentialRefService.countAll({
      entityName: TaxonName.ENTITY_NAME,
      searchText: TaxonUtils.generateNameSearchPatternFromLabel(label),
      searchAttribute: 'name',
      excludedIds: [taxonName.id],
      statusIds: [StatusIds.ENABLE],
      levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES]
    })) === 0;
    if (!label) {
      errors = { cannotComputeTaxonCode: true };
    } else if (!isUnique) {
      errors = { uniqueTaxonCode: true };
    } else {
      finalMaskTaxonName = [...label];
    }

    if (errors) {
      finalMaskTaxonName = [/^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/];
    }

    let labelMaskArray = finalMaskYear.split("");
    labelMaskArray = labelMaskArray.concat([' ']);
    labelMaskArray = labelMaskArray.concat(finalMaskTaxonName);
    // @ts-ignore
    labelMaskArray = labelMaskArray.concat([' ', /\d/, /\d/, /\d/]);
    this.labelMask = labelMaskArray;

    const finalMaskTaxonNameString = finalMaskTaxonName.join("");

    const labelControl = this.form.get('label');

    if (errors && taxonNameControl) {
      // Lorsque l'on saisi une espece valide, puis une espece non valide le code ligne de plan garde la valeur de l'espece precedente valide
      // Il faut saisir une deuxieme fois une espece invalide pour que le code ligne de plan prenne la valeur attendue
      const computedLabel = `${finalMaskYear} _______`;
      labelControl.setValue(computedLabel);
      taxonNameControl.setErrors(errors);
    } else {
      const computedLabel = this.program && (await this.strategyService.computeNextLabel(this.program.id, `${finalMaskYear}${finalMaskTaxonNameString}`, 3));
      SharedValidators.clearError(taxonNameControl, 'cannotComputeTaxonCode');
      console.info('[sampling-strategy-form] Computed label: ' + computedLabel);
      labelControl.setValue(computedLabel);
    }
  }

  // TaxonName Helper -----------------------------------------------------------------------------------------------
  protected initTaxonNameHelper() {
    // appliedStrategies => appliedStrategies.location ?
    this.taxonNamesHelper = new FormArrayHelper<TaxonNameStrategy>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'taxonNames'),
      (ts) => this.validatorService.getTaxonNameStrategyControl(ts),
      (t1, t2) => EntityUtils.equals(t1.taxonName, t2.taxonName, 'name'),
      value => isNil(value) && isNil(value.taxonName),
      {
        allowEmptyArray: false
      }
    );
    // Create at least one fishing Area
    if (this.taxonNamesHelper.size() === 0) {
      this.taxonNamesHelper.resize(1);
    }
  }

  // pmfms Helper -----------------------------------------------------------------------------------------------
  protected initPmfmStrategiesHelper() {
    // appliedStrategies => appliedStrategies.location ?
    this.sexAndAgeHelper = new FormArrayHelper<PmfmStrategy>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'pmfms'),
      (pmfmStrategy) => this.formBuilder.control(pmfmStrategy || null),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: false
      }
    );
    // Create at least one fishing Area
    if (this.sexAndAgeHelper.size() === 0) {
      this.sexAndAgeHelper.resize(3);
    }
  }

  addPmfmStrategies() {
    this.sexAndAgeHelper.add();
  }

  // appliedStrategies Helper -----------------------------------------------------------------------------------------------
  protected initAppliedStrategiesHelper() {
    // appliedStrategiesHelper formControl can't have common validator since quarters efforts are optional
    this.appliedStrategiesHelper = new FormArrayHelper<AppliedStrategy>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'appliedStrategies'),
      (appliedStrategy) => this.validatorService.getAppliedStrategiesControl(appliedStrategy),
      (s1, s2) => EntityUtils.equals(s1.location, s2.location, 'label'),
      value => isNil(value) && isNil(value.location),
      {
        allowEmptyArray: false
      }
    );
    // Create at least one fishing Area
    if (this.appliedStrategiesHelper.size() === 0) {
      this.appliedStrategiesHelper.resize(1);
    }
  }

  addAppliedStrategy() {
    this.appliedStrategiesHelper.add(new AppliedStrategy());
  }

  // appliedStrategies Helper -----------------------------------------------------------------------------------------------
  protected initAppliedPeriodHelper() {
    // Use the first applied strategy form group (created just before)
    const appliedStrategyForm = this.appliedStrategiesHelper.at(0) as FormGroup;

    // appliedStrategiesHelper formControl can't have common validator since quarters efforts are optional
    this.appliedPeriodsHelper = new FormArrayHelper<AppliedPeriod>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, appliedStrategyForm, 'appliedPeriods'),
      (appliedPeriod) => this.validatorService.getAppliedPeriodsControl(appliedPeriod),
      (p1, p2) => EntityUtils.equals(p1, p2, 'startDate'),
      value => isNil(value),
      {
        allowEmptyArray: false,
        validators: [
          // this.requiredPeriodMinLength(1)
        ]
      }
    );
    // Create at least one fishing Area
    if (this.appliedStrategiesHelper.size() === 0) {
      this.departmentsHelper.resize(1);
    }
  }

  // Laboratory Helper -----------------------------------------------------------------------------------------------
  protected initDepartmentsHelper() {
    this.departmentsHelper = new FormArrayHelper<StrategyDepartment>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'departments'),
      (department) => this.validatorService.getStrategyDepartmentsControl(department),
      (d1, d2) => EntityUtils.equals(d1.department, d2.department, 'label'),
      value => isNil(value) && isNil(value.department),
      {
        allowEmptyArray: false
      }
    );
    // Create at least one laboratory
    if (this.departmentsHelper.size() === 0) {
      this.departmentsHelper.resize(1);
    }
  }

  addDepartment() {
    this.departmentsHelper.add(new StrategyDepartment());
  }

  // PmfmStrategiesFractionHelper - Pièces calcifiées ------------------------------------------------------------------------------------------
  protected initPmfmStrategiesFractionHelper() {
    this.calcifiedFractionsHelper = new FormArrayHelper<PmfmStrategy>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'pmfmsFraction'),
      (pmfmsFraction) => this.formBuilder.control(pmfmsFraction || null, [SharedValidators.entity]),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: false
      }
    );
    // Create at least one PmfmStrategiesFraction
    if (this.calcifiedFractionsHelper.size() === 0) {
      this.calcifiedFractionsHelper.resize(1);
    }
  }
  addPmfmStrategiesFraction() {
    this.calcifiedFractionsHelper.add();
  }

  protected markForCheck() {
    if (this.cd) this.cd.markForCheck();
  }

  requiredPeriodMinLength(minLength?: number): ValidatorFn {
    minLength = minLength || 1;
    return (array: FormArray): ValidationErrors | null => {
      const values = array.value.flat().filter(period => period.acquisitionNumber !== undefined && period.acquisitionNumber !== null && period.acquisitionNumber >= 1);
      if (!values || values.length < minLength) {
        return { minLength: { minLength: minLength } };
      }
      return null;
    };
  }

  isLocationDisable(index: number): boolean {
    return this.appliedStrategiesHelper.at(index).status === "DISABLED";
  }

  ifSex(): boolean {
    return this.form.get('sex').value;
  }

  ifAge(): boolean {
    return this.form.get('age').value;
  }

  /**
   * get pmfms
   * @param parameterLabels
   * @protected
   */
  protected async getPmfmsByParameterLabels(parameterLabels: string[]) {
    const res = await this.pmfmService.loadAll(0, 1000, null, null, {
      levelLabels: parameterLabels
    },
      {
        withTotal: false,
        withDetails: true,
        fetchPolicy: "cache-first"
      });
    return res.data;
  }

  markAsDirty() {
    this.form.markAsDirty();
  }

  /**
   * get pmfm by type
   * @param pmfms
   * @param pmfmGroups
   * @param type
   * @protected
   */
  protected getPmfmsByType(pmfms: PmfmStrategy[], pmfmGroups: number[], type: any) {
    return (pmfms || []).filter(p => {
      if (p) {
        const pmfmId = toNumber(p.pmfmId, p.pmfm && p.pmfm.id);
        const hasParameterId = p.parameter && p.parameter.label && type.includes(p.parameter.label);
        return pmfmGroups.includes(pmfmId) || hasParameterId;
      }
      return false;
    });
  }

  selectInputContent = AppFormUtils.selectInputContent;

}
