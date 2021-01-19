import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, ValidationErrors, ValidatorFn } from "@angular/forms";
import { DateAdapter } from "@angular/material/core";
import * as moment from "moment";
import { Moment } from 'moment/moment';
import { DEFAULT_PLACEHOLDER_CHAR } from 'src/app/shared/constants';
import { SharedValidators } from 'src/app/shared/validator/validators';
import { AppForm, EntityUtils, FormArrayHelper, IReferentialRef, ReferentialRef } from '../../core/core.module';
import { LocalSettingsService } from "../../core/services/local-settings.service";
import { ReferentialUtils } from "../../core/services/model/referential.model";
import { fromDateISOString, isNil } from "../../shared/functions";
import { PmfmStrategy } from "../services/model/pmfm-strategy.model";
import { Program } from '../services/model/program.model';
import { AppliedPeriod, AppliedStrategy, Strategy, StrategyDepartment, TaxonNameStrategy } from "../services/model/strategy.model";
import { ReferentialRefService } from "../services/referential-ref.service";
import { StrategyService } from "../services/strategy.service";
import { StrategyValidatorService } from '../services/validator/strategy.validator';
import { PmfmStrategiesTable } from "../strategy/pmfm-strategies.table";
import {TaxonNameRef} from "../services/model/taxon.model";
import {LocationLevelIds, ParameterLabelStrategies} from '../services/model/model.enum';

@Component({
  selector: 'form-simple-strategy',
  templateUrl: './simple-strategy.form.html',
  styleUrls: ['./simple-strategy.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: StrategyValidatorService }
  ],
})
export class SimpleStrategyForm extends AppForm<Strategy> implements OnInit {

  mobile: boolean;
  programId = -1;

  enableTaxonNameFilter = false;
  canFilterTaxonName = true;
  taxonNameHelper: FormArrayHelper<TaxonNameStrategy>;

  enableEotpFilter = false;
  canFilterEotp = true;

  enableStrategyDepartmentFilter = false;
  canFilterStrategyDepartment = true;
  strategyDepartmentHelper: FormArrayHelper<StrategyDepartment>;
  StrategyDepartmentFocusIndex = -1;

  enableAppliedStrategyFilter = false;
  canFilterAppliedStrategy = true;
  appliedStrategiesHelper: FormArrayHelper<AppliedStrategy>;
  appliedStrategiesIndex = -1;

  appliedPeriodHelper: FormArrayHelper<AppliedPeriod>;
  appliedPeriodIndex = -1;

  enablePmfmStrategiesFractionFilter = false;
  canFilterPmfmStrategiesFraction = true;
  PmfmStrategiesFractionHelper: FormArrayHelper<PmfmStrategy>;
  PmfmStrategiesFractionFocusIndex = -1;

  pmfmStrategiesHelper: FormArrayHelper<PmfmStrategy>;
  pmfmStrategiesFocusIndex = -1;

  @Input() program: Program;
  @Input() showError = true;
  @Input() entityName;
  label: string = '';

  IsSamples = true;

  @Input() placeholderChar: string = DEFAULT_PLACEHOLDER_CHAR;

  public sampleRowMask = ['2', '0', '2', '1', '-', 'B', 'I', 'O', '-', /\d/, /\d/, /\d/, /\d/];

  get appliedStrategiesForm(): FormArray {
    return this.form.controls.appliedStrategies as FormArray;
  }

  get strategyDepartmentFormArray(): FormArray {
    return this.form.controls.strategyDepartments as FormArray;
  }

  get taxonNamesForm(): FormArray {
    return this.form.controls.taxonNames as FormArray;
  }

  get appliedPeriodsForm(): FormArray {
    return this.form.controls.appliedPeriods as FormArray;
  }

  get pmfmStrategiesForm(): FormArray {
    return this.form.controls.pmfmStrategies as FormArray;
  }

  get pmfmStrategiesFractionForm(): FormArray {
    return this.form.controls.pmfmStrategiesFraction as FormArray;
  }

  @ViewChild('weightPmfmStrategiesTable', { static: true }) weightPmfmStrategiesTable: PmfmStrategiesTable;
  @ViewChild('sizePmfmStrategiesTable', { static: true }) sizePmfmStrategiesTable: PmfmStrategiesTable;
  @ViewChild('maturityPmfmStrategiesTable', { static: true }) maturityPmfmStrategiesTable: PmfmStrategiesTable;

  constructor(
    protected dateAdapter: DateAdapter<Moment>,
    protected validatorService: StrategyValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected strategyService: StrategyService,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef,
    protected formBuilder: FormBuilder,
  ) {
    super(dateAdapter, validatorService.getRowValidator(), settings);
    this.mobile = this.settings.mobile;
  }
  tabIndex?: number;
  hidden?: boolean;
  appliedYear: string = '';

  async setPmfmStrategies() {
    const pmfms = [];

    await this.weightPmfmStrategiesTable.save();
    await this.sizePmfmStrategiesTable.save();
    await this.maturityPmfmStrategiesTable.save();

    this.weightPmfmStrategiesTable.selection.clear();
    this.sizePmfmStrategiesTable.selection.clear();
    this.maturityPmfmStrategiesTable.selection.clear();

    const weights = this.weightPmfmStrategiesTable.value.filter(p => p.pmfm || p.parameterId);
    const sizes = this.sizePmfmStrategiesTable.value.filter(p => p.pmfm || p.parameterId);
    const maturities = this.maturityPmfmStrategiesTable.value.filter(p => p.pmfm || p.parameterId);

    pmfms.push(this.pmfmStrategiesHelper.at(0).value);
    pmfms.push(this.pmfmStrategiesHelper.at(1).value);
    pmfms.push(weights);
    pmfms.push(sizes);
    pmfms.push(maturities);

    if (weights.length <= 0) { this.weightPmfmStrategiesTable.value = [new PmfmStrategy()]; }
    if (sizes.length <= 0) { this.sizePmfmStrategiesTable.value = [new PmfmStrategy()]; }
    if (maturities.length <= 0) { this.maturityPmfmStrategiesTable.value = [new PmfmStrategy()]; }

    this.form.controls.pmfmStrategies.patchValue(pmfms);
    this.pmfmStrategiesForm.markAsTouched();
    this.markAsDirty();
  }

  ngOnInit() {
    super.ngOnInit();

    this.weightPmfmStrategiesTable.simpleStrategyDeleteRow.subscribe(() => this.setPmfmStrategies());
    this.sizePmfmStrategiesTable.simpleStrategyDeleteRow.subscribe(() => this.setPmfmStrategies());
    this.maturityPmfmStrategiesTable.simpleStrategyDeleteRow.subscribe(() => this.setPmfmStrategies());
    this.weightPmfmStrategiesTable.onConfirmEditCreateRow.subscribe(() => this.setPmfmStrategies());
    this.sizePmfmStrategiesTable.onConfirmEditCreateRow.subscribe(() => this.setPmfmStrategies());
    this.maturityPmfmStrategiesTable.onConfirmEditCreateRow.subscribe(() => this.setPmfmStrategies());


    //Call service Observation individuelles
    this.IsSamples = false;

    // register year field changes
    this.registerSubscription(
      this.form.get('creationDate').valueChanges
        .subscribe(async (date: Moment) => this.onDateChange(date))
    );

    // taxonName autocomplete
    this.registerAutocompleteField('taxonName', {
      suggestFn: (value, filter) => this.suggestTaxonName(value, {
        ...filter, statusId: 1
      },
      'TaxonName',
      this.enableTaxonNameFilter),
      attributes: ['name'],
      columnNames: ['REFERENTIAL.NAME'],
      mobile: this.settings.mobile
    });

    // laboratory autocomplete
    this.registerAutocompleteField('strategyDepartment', {
      suggestFn: (value, filter) => this.suggest(value, {
        ...filter, statusId: 1
      },
      'Department',
      this.enableStrategyDepartmentFilter),
      columnSizes: [4, 8],
      mobile: this.settings.mobile
    });

    // appliedStrategy autocomplete
    this.registerAutocompleteField('appliedStrategy', {
      suggestFn: (value, filter) => this.suggest(value, {
        ...filter, statusIds: [0, 1], levelIds: [LocationLevelIds.ICES_DIVISION]
      },
      'Location',
      this.enableAppliedStrategyFilter),
      mobile: this.settings.mobile
    });

    // eotp combo -------------------------------------------------------------------
    this.registerAutocompleteField('analyticReference', {
      suggestFn: (value, filter) => this.suggest(value, {
        ...filter, statusIds: [0, 1]
      },
        'AnalyticReference',
        this.enableEotpFilter),
      columnSizes: [4, 6],
      mobile: this.settings.mobile
    });

    this.registerAutocompleteField('pmfmStrategiesFraction', {
      suggestFn: (value, filter) => this.suggest(value, {
        ...filter, statusId: 1
      },
        'Fraction',
        this.enablePmfmStrategiesFractionFilter),
      attributes: ['name'],
      columnNames: ['REFERENTIAL.NAME'],
      columnSizes: [2, 10],
      mobile: this.settings.mobile
    });

    //init helpers
    this.initstrategyDepartmentHelper();
    this.initTaxonNameHelper();
    this.initPmfmStrategiesHelper();
    this.initAppliedStrategiesHelper();
    this.initAppliedPeriodHelper();
    this.initPmfmStrategiesFractionHelper();
  }

  /**
   * Suggest autocomplete values
   * @param value
   * @param filter - filters to apply
   * @param entityName - referential to request
   * @param filtered - boolean telling if we load prefilled data
   */
  protected async suggest(value: string, filter: any, entityName: string, filtered: boolean): Promise<IReferentialRef[]> {

    // Special case: AnalyticReference
    if (entityName == "AnalyticReference") {
      if (filtered) {
        //TODO a remplacer par recuperation des donnees deja saisies
        return this.strategyService.LoadAllAnalyticReferences(0, 5, null, null, filter);
      } else {
        return this.strategyService.suggestAnalyticReferences(value, filter);
      }
    }

    if (filtered) {
      //TODO a remplacer par recuperation des donnees deja saisies
      const res = await this.referentialRefService.loadAll(0, 5, null, null,
        {
          ...filter,
          entityName: entityName
        },
        { withTotal: false /* total not need */ }
      );
      return res.data;
    } else {
      return this.referentialRefService.suggest(value, {
        ...filter,
        entityName: entityName
      });
    }
  }

  protected async suggestTaxonName(value: string, filter: any, entityName: string, filtered: boolean): Promise<TaxonNameRef[]> {
    if (filtered) {
      // if TaxonNme filtred : //TODO a remplacer par recuperation des donnees deja saisies
      const res = await this.referentialRefService.loadAllTaxonNames(0, 5, null, null,
        {
          ...filter,
          entityName: entityName
        },
        { withTotal: false /* total not need */ }
      );
      return res;
    }
    else {
      const res = await this.referentialRefService.suggestTaxonNames(value,
        {
          ...filter,
          entityName: entityName
        },
      );
      return res;
    }
  }

  toggleFilteredItems(fieldName: string) {
    let value: boolean;
    switch (fieldName) {
      case 'eotp':
        this.enableEotpFilter = value = !this.enableEotpFilter;
        break;
      case 'strategyDepartment':
        this.enableStrategyDepartmentFilter = value = !this.enableStrategyDepartmentFilter;
        break;
      case 'appliedStrategy':
        this.enableAppliedStrategyFilter = value = !this.enableAppliedStrategyFilter;
        break;
      case 'taxonName':
        this.enableTaxonNameFilter = value = !this.enableTaxonNameFilter;
        break;
      case 'pmfmStrategiesFraction':
        this.enablePmfmStrategiesFractionFilter = value = !this.enablePmfmStrategiesFractionFilter;
        break;
      default:
        break;
    }
    this.markForCheck();
    console.debug(`[simpleStrategy] set enable filtered ${fieldName} items to ${value}`);
  }

  setValue(data: Strategy, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    console.debug("[simpleStrategy-form] Setting Strategy value", data);
    if (!data) return;

    // TODO : look if it's possible to init programId in another way
    this.programId = data.programId;

    // Resize strategy department array
    this.strategyDepartmentHelper.resize(Math.max(1, data.strategyDepartments.length));

    // Resize strategy department array
    this.appliedStrategiesHelper.resize(Math.max(1, data.appliedStrategies.length));

    // Resize pmfm strategy array
    this.taxonNameHelper.resize(Math.max(1, data.taxonNames.length));

    // Resize pmfm strategy array
    // this.pmfmStrategiesHelper.resize(Math.max(1, data.pmfmStrategies.length));

    // Resize strategy department array
    this.appliedPeriodHelper.resize(4);

    // APPLIED_PERIODS
    // get model appliedPeriods which are stored in first applied strategy
    const appliedPeriodControl = this.appliedPeriodsForm;
    const appliedPeriods = data.appliedStrategies.length && data.appliedStrategies[0].appliedPeriods || [];
    const appliedStrategyId = data.appliedStrategies.length && data.appliedStrategies[0].strategyId || undefined;

    // format periods for applied conrol period in view and init default period by quarter if no set
    const quarter1 = appliedPeriods.find(period => (fromDateISOString(period.startDate).month() + 1) === 1) || {
      appliedStrategyId: appliedStrategyId,
      startDate: moment("2020-01-01"),
      endDate: moment("2020-03-31"),
      acquisitionNumber: undefined
    };
    const quarter2 = appliedPeriods.find(period => (fromDateISOString(period.startDate).month() + 1) === 4) || {
      appliedStrategyId: appliedStrategyId,
      startDate: moment("2020-04-01"),
      endDate: moment("2020-06-30"),
      acquisitionNumber: undefined
    };
    const quarter3 = appliedPeriods.find(period => (fromDateISOString(period.startDate).month() + 1) === 7) || {
      appliedStrategyId: appliedStrategyId,
      startDate: moment("2020-07-01"),
      endDate: moment("2020-09-30"),
      acquisitionNumber: undefined
    };
    const quarter4 = appliedPeriods.find(period => (fromDateISOString(period.startDate).month() + 1) === 10) || {
      appliedStrategyId: appliedStrategyId,
      startDate: moment("2020-10-01"),
      endDate: moment("2020-12-31"),
      acquisitionNumber: undefined
    };
    const formattedAppliedPeriods = [quarter1, quarter2, quarter3, quarter4];

    // patch the control value
    appliedPeriodControl.patchValue(formattedAppliedPeriods);

    super.setValue(data, opts);

    // fixme get eotp from referential by label = data.analyticReference
    const analyticReferenceToSet: IReferentialRef = new ReferentialRef();
    analyticReferenceToSet.label = data.analyticReference;
    this.form.get('analyticReference').setValue(analyticReferenceToSet);

    const pmfmStrategiesControl = this.pmfmStrategiesForm;
    let pmfmStrategies: any[];

    // If new
    if (!data.id) {
      pmfmStrategies = [null, null];
    } else {
      const age = data.pmfmStrategies.filter(p => p.pmfm && p.pmfm.parameter && p.pmfm.parameter.label === ParameterLabelStrategies.AGE);
      const sex = data.pmfmStrategies.filter(p => p.pmfm && p.pmfm.parameter && p.pmfm.parameter.label === ParameterLabelStrategies.SEX);
      pmfmStrategies = [sex.length > 0 ? true : false, age.length > 0 ? true : false];
    }

    //Weights
    const weightPmfmStrategy = (data.pmfmStrategies || []).filter(
      p => 
      (p.pmfm && p.pmfm.parameter && ParameterLabelStrategies.WEIGHTS.includes(p.pmfm.parameter.label)) ||
      (p['parameter'] && ParameterLabelStrategies.WEIGHTS.includes(p['parameter'].label))
    );
    pmfmStrategies.push(weightPmfmStrategy.length > 0 ? weightPmfmStrategy : []);
    this.weightPmfmStrategiesTable.value = weightPmfmStrategy.length > 0 ? weightPmfmStrategy : [new PmfmStrategy()];

    //Sizes
    const sizePmfmStrategy = (data.pmfmStrategies || []).filter(
      p => 
      (p.pmfm && p.pmfm.parameter && ParameterLabelStrategies.LENGTHS.includes(p.pmfm.parameter.label)) ||
      (p['parameter'] && ParameterLabelStrategies.LENGTHS.includes(p['parameter'].label))
    );
    pmfmStrategies.push(sizePmfmStrategy.length > 0 ? sizePmfmStrategy : []);
    this.sizePmfmStrategiesTable.value = sizePmfmStrategy.length > 0 ? sizePmfmStrategy : [new PmfmStrategy()];

    //Maturities
    const maturityPmfmStrategy = (data.pmfmStrategies || []).filter(
      p => 
      (p.pmfm && p.pmfm.parameter && ParameterLabelStrategies.MATURITIES.includes(p.pmfm.parameter.label)) ||
      (p['parameter'] && ParameterLabelStrategies.MATURITIES.includes(p['parameter'].label))
    );
    pmfmStrategies.push(maturityPmfmStrategy.length > 0 ? maturityPmfmStrategy : []);
    this.maturityPmfmStrategiesTable.value = maturityPmfmStrategy.length > 0 ? maturityPmfmStrategy : [new PmfmStrategy()];

    pmfmStrategiesControl.patchValue(pmfmStrategies);

    // TODO
    this.referentialRefService.loadAll(0, 0, null, null,
      {
        entityName: 'Fraction'
      },
      { withTotal: false /* total not need */ }
    ).then(res => {
      const calcifiedTypeControl = this.pmfmStrategiesFractionForm;
      const PmfmStrategiesFraction = (data.pmfmStrategies || []).filter(p => p.fractionId && !p.pmfm);
      const fractions = PmfmStrategiesFraction.map(cal => {
        return {
          id: cal.fractionId,
          name: res.data.find(fraction => fraction.id === cal.fractionId).name,
        }
      });
      calcifiedTypeControl.clear();
      this.PmfmStrategiesFractionHelper.resize(Math.max(1, PmfmStrategiesFraction.length));
      calcifiedTypeControl.patchValue(fractions);
    })
  }

  protected async onDateChange(date: Moment) {

    const labelControl = this.form.get('label');

    //update mask
    let year;
    if (date && (typeof date === 'object') && (date.year())) {
      year = date.toDate().getFullYear().toString();
    }
    else if (date && (typeof date === 'string')) {
      const dateAsString = date as string;
      year = moment(dateAsString).toDate().getFullYear().toString()
    }
    this.sampleRowMask = [...year.split(''), '-', 'B', 'I', 'O', '-', /\d/, /\d/, /\d/, /\d/];

    // get new label sample row code
    const updatedLabel = await this.strategyService.findStrategyNextLabel(this.programId, `${year}-BIO-`, 4);

    const label = labelControl.value;
    if (isNil(label)) {
      labelControl.setValue(updatedLabel);
    } else {
      const oldYear = label.split('-').shift();
      // Update the label, if year change
      if (year && oldYear && year !== oldYear) {
        labelControl.setValue(updatedLabel);
      } else {
        labelControl.setValue(label);
      }
    }
  }

  // TaxonName Helper -----------------------------------------------------------------------------------------------
  protected initTaxonNameHelper() {
    // appliedStrategies => appliedStrategies.location ?
    this.taxonNameHelper = new FormArrayHelper<TaxonNameStrategy>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'taxonNames'),
      (ts) => this.validatorService.getTaxonNameStrategyControl(ts),
      (t1, t2) => EntityUtils.equals(t1.taxonName, t2.taxonName, 'name'),
      value => isNil(value) && isNil(value.taxonName),
      {
        allowEmptyArray: false
      }
    );
    // Create at least one fishing Area
    if (this.taxonNameHelper.size() === 0) {
      this.taxonNameHelper.resize(1);
    }
  }

  // pmfmStrategies Helper -----------------------------------------------------------------------------------------------
  protected initPmfmStrategiesHelper() {
    // appliedStrategies => appliedStrategies.location ?
    this.pmfmStrategiesHelper = new FormArrayHelper<PmfmStrategy>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'pmfmStrategies'),
      (pmfmStrategy) => this.formBuilder.control(pmfmStrategy || null),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: false,
        validators: [
          this.requiredPmfmMinLength(2),
          this.requiredWeightOrSize()
        ]
      }
    );
    // Create at least one fishing Area
    if (this.pmfmStrategiesHelper.size() === 0) {
      this.pmfmStrategiesHelper.resize(5);
    }
  }

  addPmfmStrategies() {
    this.pmfmStrategiesHelper.add();
    if (!this.mobile) {
      this.pmfmStrategiesFocusIndex = this.pmfmStrategiesHelper.size() - 1;
    }
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
    if (!this.mobile) {
      this.appliedStrategiesIndex = this.appliedStrategiesHelper.size() - 1;
    }
  }

  // appliedStrategies Helper -----------------------------------------------------------------------------------------------
  protected initAppliedPeriodHelper() {
    // appliedStrategiesHelper formControl can't have common validator since quarters efforts are optional
    this.appliedPeriodHelper = new FormArrayHelper<AppliedPeriod>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'appliedPeriods'),
      (appliedPeriod) => this.validatorService.getAppliedPeriodsControl(appliedPeriod),
      (p1, p2) => EntityUtils.equals(p1, p2, 'startDate'),
      value => isNil(value),
      {
        allowEmptyArray: false,
        validators: [
          this.requiredPeriodMinLength(1)
        ]
      }
    );
    // Create at least one fishing Area
    if (this.appliedStrategiesHelper.size() === 0) {
      this.strategyDepartmentHelper.resize(1);
    }
  }

  // Laboratory Helper -----------------------------------------------------------------------------------------------
  protected initstrategyDepartmentHelper() {
    this.strategyDepartmentHelper = new FormArrayHelper<StrategyDepartment>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'strategyDepartments'),
      (department) => this.validatorService.getStrategyDepartmentsControl(department),
      (d1, d2) => EntityUtils.equals(d1.department, d2.department, 'label'),
      value => isNil(value) && isNil(value.department),
      {
        allowEmptyArray: false
      }
    );
    // Create at least one laboratory
    if (this.strategyDepartmentHelper.size() === 0) {
      this.strategyDepartmentHelper.resize(1);
    }
  }
  addStrategyDepartment() {
    this.strategyDepartmentHelper.add(new StrategyDepartment());
    if (!this.mobile) {
      this.StrategyDepartmentFocusIndex = this.strategyDepartmentHelper.size() - 1;
    }
  }

  // PmfmStrategiesFractionHelper - Pièces calcifiées ------------------------------------------------------------------------------------------
  protected initPmfmStrategiesFractionHelper() {
    this.PmfmStrategiesFractionHelper = new FormArrayHelper<PmfmStrategy>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'pmfmStrategiesFraction'),
      (pmfmStrategiesFraction) => this.formBuilder.control(pmfmStrategiesFraction || null, [SharedValidators.entity]),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: false
      }
    );
    // Create at least one PmfmStrategiesFraction
    if (this.PmfmStrategiesFractionHelper.size() === 0) {
      this.PmfmStrategiesFractionHelper.resize(1);
    }
  }
  addPmfmStrategiesFraction() {
    this.PmfmStrategiesFractionHelper.add();
    if (!this.mobile) {
      this.PmfmStrategiesFractionFocusIndex = this.PmfmStrategiesFractionHelper.size() - 1;
    }
  }

  protected markForCheck() {
    if (this.cd) this.cd.markForCheck();
  }

  requiredPmfmMinLength(minLength?: number): ValidatorFn {
    minLength = minLength || 2;
    return (array: FormArray): ValidationErrors | null => {
      const values = array.value.flat().filter(pmfm => pmfm && pmfm !== false);
      if (!values || values.length < minLength) {
        return { minLength: { minLength: minLength } };
      }
      return null;
    };
  }

  requiredPeriodMinLength(minLength?: number): ValidatorFn {
    minLength = minLength || 1;
    return (array: FormArray): ValidationErrors | null => {
      const values = array.value.flat().filter(period => period.acquisitionNumber !== undefined && period.acquisitionNumber !== null && period.acquisitionNumber >= 0);
      if (!values || values.length < minLength) {
        return { minLength: { minLength: minLength } };
      }
      return null;
    };
  }

  requiredWeightOrSize(): ValidatorFn {
    return (array: FormArray): ValidationErrors | null => {
      if (Array.isArray(array.value[2])) {
        const weight = (array.value[2] || []).filter(p => p.pmfm);
        if (weight && weight.length > 0) {
          return null;
        }
      }
      if (Array.isArray(array.value[3])) {
        const size = (array.value[3] || []).filter(p => p.pmfm);
        if (size && size.length > 0) {
          return null;
        }
      }
      return { weightOrSize: {weightOrSize: false} };
    };
  }

  ifSex() : boolean {
    const sex = this.pmfmStrategiesForm.value[0];
    return sex;
  }

  ifAge() : boolean {
    const sex = this.pmfmStrategiesForm.value[1];
    return sex;
  }

}
