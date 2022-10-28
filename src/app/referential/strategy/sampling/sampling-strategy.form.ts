import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { AsyncValidatorFn, UntypedFormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
  AppForm,
  AppFormUtils,
  DEFAULT_PLACEHOLDER_CHAR,
  EntityUtils,
  firstArrayValue,
  firstNotNilPromise,
  FormArrayHelper,
  fromDateISOString,
  IReferentialRef,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  LocalSettingsService,
  MatAutocompleteField,
  ObjectMap,
  ReferentialRef,
  ReferentialUtils,
  removeDuplicatesFromArray,
  SharedValidators,
  StatusIds,
  suggestFromArray,
  toBoolean,
  toNumber
} from '@sumaris-net/ngx-components';
import { PmfmStrategy } from '../../services/model/pmfm-strategy.model';
import { Program } from '../../services/model/program.model';
import { AppliedPeriod, AppliedStrategy, Strategy, StrategyDepartment, TaxonNameStrategy } from '../../services/model/strategy.model';
import { ReferentialRefService } from '../../services/referential-ref.service';
import { StrategyService } from '../../services/strategy.service';
import { StrategyValidatorService } from '../../services/validator/strategy.validator';
import {
  AcquisitionLevelCodes,
  autoCompleteFractions,
  FractionIdGroups,
  LocationLevelIds,
  ParameterLabelGroups,
  PmfmIds,
  ProgramPrivilegeIds,
  TaxonomicLevelIds
} from '../../services/model/model.enum';
import { ProgramProperties } from '../../services/config/program.config';
import { BehaviorSubject, merge } from 'rxjs';
import { PmfmService } from '../../services/pmfm.service';
import { SamplingStrategy, StrategyEffort } from '@app/referential/services/model/sampling-strategy.model';
import { TaxonName, TaxonNameRef, TaxonUtils } from '@app/referential/services/model/taxon-name.model';
import { TaxonNameService } from '@app/referential/services/taxon-name.service';
import { PmfmStrategyValidatorService } from '@app/referential/services/validator/pmfm-strategy.validator';
import { Pmfm } from '@app/referential/services/model/pmfm.model';
import { TaxonNameRefFilter } from '@app/referential/services/filter/taxon-name-ref.filter';
import { TaxonNameFilter } from '@app/referential/services/filter/taxon-name.filter';
import { filter, map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { TaxonNameRefService } from '@app/referential/services/taxon-name-ref.service';
import { PmfmFilter } from '@app/referential/services/filter/pmfm.filter';
import { moment } from '@app/vendor';

type FilterableFieldName = 'analyticReference' | 'location' | 'taxonName' | 'department' | 'lengthPmfm' | 'weightPmfm' | 'maturityPmfm' | 'fractionPmfm';

const MIN_PMFM_COUNT = 2;

const STRATEGY_LABEL_UI_PREFIX_REGEXP = new RegExp(/^\d\d [a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z] ___$/);
const STRATEGY_LABEL_UI_REGEXP = new RegExp(/^\d\d [a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z] \d\d\d$/);

@Component({
  selector: 'app-sampling-strategy-form',
  templateUrl: './sampling-strategy.form.html',
  styleUrls: ['./sampling-strategy.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplingStrategyForm extends AppForm<Strategy> implements OnInit {

  private _$pmfmGroups: BehaviorSubject<ObjectMap<number[]>> = new BehaviorSubject(null);

  initJobs = [];
  mobile: boolean;
  $program = new BehaviorSubject<Program>(null);
  labelMask: (string | RegExp)[] = [/\d/, /\d/, ' ', /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, ' ', /\d/, /\d/, /\d/];
  data: SamplingStrategy;

  hasEffort = false;
  hasLanding = false;

  taxonNamesHelper: FormArrayHelper<TaxonNameStrategy, UntypedFormGroup>;
  departmentsHelper: FormArrayHelper<StrategyDepartment, UntypedFormGroup>;
  appliedStrategiesHelper: FormArrayHelper<AppliedStrategy, UntypedFormGroup>;
  appliedPeriodsHelper: FormArrayHelper<AppliedPeriod, UntypedFormGroup>;
  pmfmsHelper: FormArrayHelper<PmfmStrategy, UntypedFormGroup>;

  lengthPmfmsHelper: FormArrayHelper<PmfmStrategy, UntypedFormGroup>;
  weightPmfmsHelper: FormArrayHelper<PmfmStrategy, UntypedFormGroup>;
  maturityPmfmsHelper: FormArrayHelper<PmfmStrategy, UntypedFormGroup>;
  fractionPmfmsHelper: FormArrayHelper<PmfmStrategy, UntypedFormGroup>;
  locationLevelIds: number[];

  disableEditionListeners: boolean;

  autocompleteFilters = {
    analyticReference: false,
    location: false,
    taxonName: false,
    department: false,

    // Pmfms
    lengthPmfm: false,
    weightPmfm: false,
    maturityPmfm: false,
    fractionPmfm: false
  };

  get value(): any {
    throw new Error("Not implemented! Please use getValue() instead, that is an async function");
  }

  get pmfmGroups(): ObjectMap<number[]> {
    return this._$pmfmGroups.getValue();
  }

  set pmfmGroups(value: ObjectMap<number[]>) {
    this._$pmfmGroups.next(value);
  }

  @Input() set program(value: Program) {
    this.setProgram(value);
  }

  get program(): Program {
    return this.$program.getValue();
  }

  get hasSex(): boolean {
    return this.form.get('sex').value;
  }

  get hasAge(): boolean {
    return this.form.get('age').value;
  }

  @Input() tabIndex: number;
  @Input() showError = true;
  @Input() i18nFieldPrefix = 'PROGRAM.STRATEGY.EDIT.';
  @Input() placeholderChar: string = DEFAULT_PLACEHOLDER_CHAR;

  get appliedStrategiesForm(): UntypedFormArray {
    return this.form.controls.appliedStrategies as UntypedFormArray;
  }

  get appliedStrategyForm(): UntypedFormGroup {
    return this.appliedStrategiesHelper && this.appliedStrategiesHelper.at(0) as UntypedFormGroup;
  }

  get appliedPeriodsForm(): UntypedFormArray {
    const appliedStrategyForm = this.appliedStrategyForm;
    return appliedStrategyForm && appliedStrategyForm.controls.appliedPeriods as UntypedFormArray;
  }

  get departmentsFormArray(): UntypedFormArray {
    return this.form.controls.departments as UntypedFormArray;
  }

  get taxonNamesFormArray(): UntypedFormArray {
    return this.form.controls.taxonNames as UntypedFormArray;
  }

  get pmfmsForm(): UntypedFormArray {
    return this.form.controls.pmfms as UntypedFormArray;
  }

  get minPmfmCount(): number {
    return MIN_PMFM_COUNT;
  }

  get lengthPmfmsForm(): UntypedFormArray {
    return this.form.controls.lengthPmfms as UntypedFormArray;
  }

  get weightPmfmsForm():  UntypedFormArray {
    return this.form.controls.weightPmfms as UntypedFormArray;
  }

  get maturityPmfmsForm():  UntypedFormArray {
    return this.form.controls.maturityPmfms as UntypedFormArray;
  }

  get fractionPmfmsForm(): UntypedFormArray {
    return this.form.controls.fractionPmfms as UntypedFormArray;
  }

  get taxonNameStrategyControl(): UntypedFormGroup {
    return this.taxonNamesHelper?.at(0) as UntypedFormGroup;
  }

  get touched(): boolean {
    return this.form.touched;
  }
  get untouched(): boolean {
    return this.form.untouched;
  }

  $filteredAnalyticsReferences: BehaviorSubject<IReferentialRef[]> = new BehaviorSubject(null);
  $filteredLocations: BehaviorSubject<IReferentialRef[]> = new BehaviorSubject(null);
  $filteredDepartments: BehaviorSubject<IReferentialRef[]> = new BehaviorSubject(null);
  $filteredTaxonNames: BehaviorSubject<TaxonNameRef[]> = new BehaviorSubject(null);
  $filteredLengthPmfms: BehaviorSubject<IReferentialRef[]> = new BehaviorSubject(null);
  $filteredWeightPmfms: BehaviorSubject<IReferentialRef[]> = new BehaviorSubject(null);
  $filteredMaturityPmfms: BehaviorSubject<IReferentialRef[]> = new BehaviorSubject(null);
  $filteredFractionPmfms: BehaviorSubject<IReferentialRef[]> = new BehaviorSubject(null);

  $allFractions: BehaviorSubject<ReferentialRef[]> = new BehaviorSubject(null);


  enable(opts?: { onlySelf?: boolean, emitEvent?: boolean; }) {

    super.enable(opts);

    if (this.hasLanding) {
      this.taxonNamesFormArray.disable();
      this.appliedStrategiesForm.disable();
      this.lengthPmfmsForm.disable();
      this.weightPmfmsForm.disable();
      this.maturityPmfmsForm.disable();
      const form = this.form;
      form.get('analyticReference').disable();
      form.get('year').disable();
      form.get('label').disable();
      form.get('age').disable();
      form.get('sex').disable();

      // Commented, because now all efforts should be edited, even past quarters - Fix issue OBSBIO-48
      /* Allow user to update efforts for current quarter and after even when strategy already has samples (#IMAGINE-471)
      this.appliedPeriodsForm.controls.map(control => {
          const formGroupControl = control as FormGroup;
          if (moment().isAfter((formGroupControl.controls.endDate as FormControl).value)) {
            formGroupControl.disable();
          } else {
            formGroupControl.enable();
          }
        });*/
    }
  }

  disable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.disable(opts);
    // FIXME fractions not disabled
    this.fractionPmfmsHelper.disable();
  }

  constructor(
    injector: Injector,
    protected validatorService: StrategyValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected pmfmService: PmfmService,
    protected strategyService: StrategyService,
    protected settings: LocalSettingsService,
    protected taxonNameService: TaxonNameService,
    protected taxonNameRefService: TaxonNameRefService,
    protected pmfmStrategyValidator: PmfmStrategyValidatorService,
    protected cd: ChangeDetectorRef,
    protected formBuilder: UntypedFormBuilder
  ) {
    super(injector, validatorService.getFormGroup());
    this.mobile = this.settings.mobile;
    this.debug = !environment.production;

    // Add missing control
    this.form.addControl('year', new UntypedFormControl());
    this.form.addControl('sex', new UntypedFormControl());
    this.form.addControl('age', new UntypedFormControl());

    // Init array helpers
    this.initDepartmentsHelper();
    this.initTaxonNameHelper();
    this.initAppliedStrategiesHelper();
    this.initAppliedPeriodHelper();

    this.initPmfmStrategiesHelpers();

    // Start loading items
    this.loadReferentialItems();
  }


  ngOnInit() {
    super.ngOnInit();

    const loadedTest = () => !this.loading;
    this.registerSubscription(
      this.form.get('age').valueChanges
        .pipe(filter(loadedTest))
        .subscribe(hasAge => {
        if (hasAge) {
          this.loadFraction();
          this.fractionPmfmsForm.enable();
        }
        else {
          this.fractionPmfmsForm.disable();
        }
      }));
    this.taxonNamesFormArray.setAsyncValidators(async (_) => {
        this.loadFraction();
        return null;
      });

    this.appliedPeriodsForm.setAsyncValidators([
      async (control: UntypedFormArray) => {
        const appliedPeriodsForm = this.appliedPeriodsForm;
        if (this.loading || appliedPeriodsForm.disabled) return;
        const minLength = 1;
        const appliedPeriods = control.controls;
        if (!isEmptyArray(appliedPeriods)) {
          const values = appliedPeriods.filter(appliedPeriod => toNumber(appliedPeriod.value.acquisitionNumber, 0) >= 1);
          if (!isEmptyArray(values) && values.length >= minLength) {
            SharedValidators.clearError(control, 'minLength');
            return null;
          }
        }
        appliedPeriodsForm.markAllAsTouched();
        appliedPeriodsForm.markAsDirty();
        return <ValidationErrors>{minLength: {minLength}};
      },
      // Check quarter acquisitionNumber is not
      async (control) => {
        const appliedPeriodsForm = this.appliedPeriodsForm;
        if (this.loading || appliedPeriodsForm.disabled) return;
        const appliedPeriods = (control.value as any[]);
        const invalidQuarters = (appliedPeriods || [])
          .map(AppliedPeriod.fromObject)
          .filter(period => {
            const quarter = period.startDate.quarter();
            const quarterEffort: StrategyEffort = this.data && this.data.effortByQuarter && this.data.effortByQuarter[quarter];
            return quarterEffort && quarterEffort.hasRealizedEffort && (isNil(period.acquisitionNumber) || period.acquisitionNumber < 0);
          }).map(period => period.startDate.quarter());
        if (isNotEmptyArray(invalidQuarters)) {
          appliedPeriodsForm.markAllAsTouched();
          appliedPeriodsForm.markAsDirty();
          return <ValidationErrors>{hasRealizedEffort: {quarters: invalidQuarters}};
        }
        SharedValidators.clearError(control, 'hasRealizedEffort');
        return null;
      }
    ]);

    this.appliedPeriodsForm.setErrors({ minLength: true });

    const pmfmValidator: AsyncValidatorFn = (_) => this.validatePmfmsForm();
    this.pmfmsForm.setAsyncValidators(pmfmValidator);
    this.lengthPmfmsForm.setAsyncValidators(pmfmValidator);
    this.weightPmfmsForm.setAsyncValidators(pmfmValidator);
    this.maturityPmfmsForm.setAsyncValidators(pmfmValidator);

    // Force pmfms validation, when sex/age changes
    this.registerSubscription(
      merge(
        this.form.get('sex').valueChanges,
        this.form.get('age').valueChanges
      )
      .pipe(filter(() => !this.loading && !this.disabled && !this.disableEditionListeners))
      .subscribe(() => {
        this.pmfmsForm.updateValueAndValidity();
        this.validatePmfmsForm();
      })
    );

    this.registerSubscription(
      this.form.get('label').valueChanges
        .pipe(filter(() => !this.loading && !this.disabled && !this.disableEditionListeners))
        .subscribe(label => this.onStrategyLabelChanged(label))
    )

    this.registerSubscription(
      merge(
        this.form.get('year').valueChanges.pipe(
          map(_ => 'year')
        ),
        this.taxonNameStrategyControl.valueChanges.pipe(map(_ => 'taxonName'))
      )
      .pipe(
        filter(() => !this.loading && !this.disabled && !this.disableEditionListeners),
        //debounceTime(200) // Need to make sure year date has been updated
      )
      .subscribe(event => this.generateLabelPrefix(event)));

    const idControl = this.form.get('id');
    this.form.get('label').setAsyncValidators(async (control) => {
      if (this.untouched) return;
      const programId = this.program?.id;
      if (isNil(programId)) return; // Skip

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
        programId,
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
    });

    // taxonName autocomplete
    this.registerAutocompleteField('taxonName', {
      suggestFn: (value, filter) => this.suggestTaxonName(value, <Partial<TaxonNameRefFilter>>{
        ...filter,
        searchAttribute: 'name',
        statusIds: [StatusIds.ENABLE],
        levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES]
      }),
      attributes: ['name'],
      columnNames: ['REFERENTIAL.NAME'],
      mobile: this.mobile
    });

    // Department autocomplete
    this.registerAutocompleteField('department', {
      suggestFn: (value, filter) => this.suggestDepartments(value, {
        ...filter, statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }),
      columnSizes: [4, 8],
      mobile: this.mobile
    });

    // appliedStrategy autocomplete
    this.registerAutocompleteField('location', {
      suggestFn: (value, filter) => this.suggestLocations(value, {
        ...filter,
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        // TODO BLA: pourquoi utiliser une constante globale,
        //  et non pas un option de Program ?
        levelIds: LocationLevelIds.LOCATIONS_AREA
      }),
      mobile: this.mobile
    });

    // Analytic reference autocomplete
    this.registerAutocompleteField('analyticReference', {
      suggestFn: (value, filter) => this.suggestAnalyticReferences(value, {
        ...filter, statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }),
      columnSizes: [4, 8],
      mobile: this.mobile
    });

    // length PMFM autocomplete
    this.registerAutocompleteField('lengthPmfm', {
      // suggestFn: (value, filter) => this.suggestLengthPmfms(value, {
      suggestFn: (value, filter) => this.suggestLengthPmfms(value, {
        ...filter,
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        levelLabels: ParameterLabelGroups.LENGTH
      }),
      attributes: ['name', 'unit.label', 'matrix.name', 'fraction.name', 'method.name'],
      columnNames: ['REFERENTIAL.NAME', 'REFERENTIAL.PMFM.UNIT', 'REFERENTIAL.PMFM.MATRIX', 'REFERENTIAL.PMFM.FRACTION', 'REFERENTIAL.PMFM.METHOD'],
      mobile: this.mobile
    });

    // appliedStrategy autocomplete
    this.registerAutocompleteField('weightPmfm', {
      suggestFn: (value, filter) => this.suggestWeightPmfms(value, {
        ...filter,
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        levelLabels: ParameterLabelGroups.WEIGHT
      }),
      attributes: ['name', 'unit.label', 'matrix.name', 'fraction.name', 'method.name'],
      columnNames: ['REFERENTIAL.NAME', 'REFERENTIAL.PMFM.UNIT', 'REFERENTIAL.PMFM.MATRIX', 'REFERENTIAL.PMFM.FRACTION', 'REFERENTIAL.PMFM.METHOD'],
      mobile: this.mobile
    });

    // appliedStrategy autocomplete
    this.registerAutocompleteField('maturityPmfm', {
      suggestFn: (value, filter) => this.suggestMaturityPmfms(value, {
        ...filter,
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        levelLabels: ParameterLabelGroups.MATURITY
      }),
      attributes: ['name', 'unit.label', 'matrix.name', 'fraction.name', 'method.name'],
      columnNames: ['REFERENTIAL.NAME', 'REFERENTIAL.PMFM.UNIT', 'REFERENTIAL.PMFM.MATRIX', 'REFERENTIAL.PMFM.FRACTION', 'REFERENTIAL.PMFM.METHOD'],
      mobile: this.mobile
    });

    // Fraction autocomplete
    this.registerAutocompleteField('fractionPmfm', {
      suggestFn: (value, filter) => this.suggestFractionPmfms(value, {
        ...filter,
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        includedIds: FractionIdGroups.CALCIFIED_STRUCTURE
      }),
      attributes: ['name'],
      columnNames: ['REFERENTIAL.NAME'],
      mobile: this.mobile
    });
  }

  setDisableEditionListeners (disable : boolean) {
    this.disableEditionListeners = disable;
  }

  protected async setProgram(program: Program, opts?: { emitEvent?: boolean; }) {
    if (program && this.program !== program) {
      this.i18nFieldPrefix = 'PROGRAM.STRATEGY.EDIT.';
      const i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX) || '';
      this.i18nFieldPrefix += i18nSuffix !== 'legacy' && i18nSuffix || '';

      // Get location level ids
      this.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.STRATEGY_EDITOR_LOCATION_LEVEL_IDS);

      // Load items from historical data
      this.loadFilteredItems(program);

      this.$program.next(program);

      if (!opts || opts.emitEvent !== false) {
        this.markForCheck();
      }
    }
  }

  async ready(): Promise<void> {
    await super.ready();

    await Promise.all([
      firstNotNilPromise(this.$allFractions),
      firstNotNilPromise(this._$pmfmGroups)
    ]);
  }

  loadFraction(): void {
    const taxonNameStrategies = this.hasAge && this.taxonNamesFormArray.value
    if (isNotEmptyArray(taxonNameStrategies) && taxonNameStrategies[0]?.taxonName) {
      const taxonNameStrategy = taxonNameStrategies[0];
      const fractionName = autoCompleteFractions[taxonNameStrategy.taxonName.id];
      if (fractionName) {
        const fraction = this.$allFractions.value.find(f => f.label.toUpperCase() === fractionName.toUpperCase());
        this.fractionPmfmsForm.patchValue([{fraction}]);
      }
    }
  }

  async loadReferentialItems(): Promise<void> {
    // Make sure all enumerations has been override, by config
    await this.referentialRefService.ready();

    try {
      console.debug('[sampling-strategy-form] Loading referential items...');

      await Promise.all([

        this.referentialRefService.loadAll(0, 1000, null, null, {
          entityName: 'Fraction',
          statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
          includedIds: FractionIdGroups.CALCIFIED_STRUCTURE
        })
          .then(({data}) => this.$allFractions.next(data)),

        // Load pmfm by parameter groups
        this.pmfmService.loadIdsGroupByParameterLabels()
          .then(pmfmGroups => {
            if (this.debug) console.debug('[sampling-strategy-form] Pmfm groups loaded: ', pmfmGroups);
            this._$pmfmGroups.next(pmfmGroups);
          })
      ])
    }
    catch (err) {
      console.error('Error while loading referential items', err);
    }
  }

  async loadFilteredItems(program: Program): Promise<void> {
    // Get load options, from program properties
    const autoEnableFilter = program.getPropertyAsBoolean(ProgramProperties.STRATEGY_EDITOR_PREDOC_ENABLE);
    const fetchSize = program.getPropertyAsInt(ProgramProperties.STRATEGY_EDITOR_PREDOC_FETCH_SIZE);

    const now = Date.now();
    console.info(`[sampling-strategy-form] Loading filtered items... {autoEnableFilter: ${autoEnableFilter}, fetchSize: ${fetchSize}}`);

    await Promise.all([

      // Analytic References
      this.strategyService.loadStrategiesReferentials(program.id, 'AnalyticReference', undefined, 0, fetchSize)
        .then((analyticReferences: ReferentialRef[]) => {
          analyticReferences = removeDuplicatesFromArray(analyticReferences, 'id');
          this.$filteredAnalyticsReferences.next(analyticReferences);
          this.autocompleteFilters.analyticReference = autoEnableFilter && isNotEmptyArray(analyticReferences); // Enable filtering, if need by program
        })
        .catch(err => {
          console.debug('[sampling-strategy-form] Error while loading filtered analyticReferences: ', err);
          this.autocompleteFilters.analyticReference = false;
        }),

      // Departments
      this.strategyService.loadStrategiesReferentials(program.id, 'Department', undefined, 0, fetchSize)
        .then((departments : ReferentialRef[]) => {
          this.$filteredDepartments.next(departments);
          this.autocompleteFilters.department = autoEnableFilter && isNotEmptyArray(departments); // Enable filtering, if need by program
        })
        .catch(err => {
          console.debug('[sampling-strategy-form] Error while loading filtered departments: ', err);
          this.autocompleteFilters.department = false;
        }),

      // Locations
      this.strategyService.loadStrategiesReferentials(program.id, 'Location', 'SEA', 0, fetchSize)
        .then(locations => {
          this.$filteredLocations.next(locations);
          this.autocompleteFilters.location = autoEnableFilter && isNotEmptyArray(locations); // Enable filtering, if need by program
        })
        .catch(err => {
          console.debug('[sampling-strategy-form] Error while loading filtered locations: ', err);
          this.autocompleteFilters.location = false;
        }),

      // Taxons
      this.strategyService.loadStrategiesReferentials<TaxonNameRef>(program.id, 'TaxonName', undefined, 0, fetchSize)
        .then(taxons => {
          this.$filteredTaxonNames.next(taxons);
          this.autocompleteFilters.taxonName = autoEnableFilter && isNotEmptyArray(taxons); // Enable filtering, if need by program
        })
        .catch(err => {
          console.debug('[sampling-strategy-form] Error while loading filtered taxonNames: ', err);
          this.autocompleteFilters.taxonName = false;
        }),

      // Length pmfms
      /*this.strategyService.loadStrategiesReferentials(program.id, 'Pmfm', undefined, 0, fetchSize, 'name')
        .then(lengthPmfms => {
          this.$filteredLengthPmfms.next(lengthPmfms);
          this.autocompleteFilters.lengthPmfm = isNotEmptyArray(lengthPmfms) && autoEnableFilter; // Enable filtering, if need by program
        }),

      // Weight pmfms
      this.strategyService.loadStrategiesReferentials(program.id, 'Pmfm', undefined, 0, fetchSize, 'name')
        .then(weightPmfms => {
          this.$filteredWeightPmfms.next(weightPmfms);
          this.autocompleteFilters.weightPmfm = isNotEmptyArray(weightPmfms) && autoEnableFilter; // Enable filtering, if need by program
        }),

      // Maturity pmfms
      this.strategyService.loadStrategiesReferentials(program.id, 'Pmfm', undefined, 0, fetchSize, 'name')
        .then(maturityPmfms => {
          this.$filteredMaturityPmfms.next(maturityPmfms);
          this.autocompleteFilters.maturityPmfm = isNotEmptyArray(maturityPmfms) && autoEnableFilter; // Enable filtering, if need by program
        }),*/

      // Fractions pmfm
      this.strategyService.loadStrategiesReferentials(program.id, 'Fraction', undefined, 0, fetchSize)
        .then((fractions: ReferentialRef[]) => {
          this.$filteredFractionPmfms.next(fractions);
          this.autocompleteFilters.fractionPmfm = autoEnableFilter && isNotEmptyArray(fractions); // Enable filtering, if need by program
        })
        .catch(err => {
          console.debug('[sampling-strategy-form] Error while loading filtered fractions: ', err);
          this.autocompleteFilters.fractionPmfm = false;
        })
    ])

    console.info(`[sampling-strategy-form] Loading filtered items [OK] in ${Date.now() - now}ms`);

    this.markForCheck();
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

  removeAppliedStrategies(index: number) {
    // first element AND more than one element
    // this.appliedPeriodsForm.controls become empty array
    let appliedPeriodsFormControls: any = null;
    if (index === 0 && this.appliedStrategiesHelper.size() > 1) {
      appliedPeriodsFormControls = this.appliedPeriodsForm.controls;
    }
    this.appliedStrategiesHelper.removeAt(index);
    if (index === 0) {
      if (appliedPeriodsFormControls) {
        this.appliedPeriodsForm.controls = appliedPeriodsFormControls;
      }
    }
  }

  /**
   * Select text that can be changed, using the text mask
   * @param input
   */
  selectMask(input: HTMLInputElement) {
    if (!this.labelMask) input.select();
    const taxonNameControl = this.taxonNamesHelper.at(0);
    const endIndex = this.labelMask.length;
    if (taxonNameControl.hasError('cannotComputeTaxonCode') || taxonNameControl.hasError('uniqueTaxonCode')) {
      input.setSelectionRange(3, endIndex, "backward");
    }
    else
    {
      input.setSelectionRange(11, endIndex, "backward");
    }
  }

  toggleFilter(fieldName: FilterableFieldName, field?: MatAutocompleteField) {
    this.autocompleteFilters[fieldName] = !this.autocompleteFilters[fieldName];
    this.markForCheck();

    if (field) field.reloadItems();
  }


  /**
   * Suggest autocomplete values
   * @param value
   * @param filter - filters to apply
   */
  protected async suggestDepartments(value: any, filter: any): Promise<LoadResult<IReferentialRef>> {
    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
    const newValue = currentControlValue ? '*' : value;

    // Excluded existing locations, BUT keep the current control value
    const excludedIds = (this.departmentsFormArray.value || [])
      .map(pmfmDepartment => pmfmDepartment?.department)
      .filter(ReferentialUtils.isNotEmpty)
      .filter(item => !currentControlValue || currentControlValue !== item)
      .map(item => parseInt(item.id));

    if (this.autocompleteFilters.department) {
      return suggestFromArray(this.$filteredDepartments.getValue(), newValue, {
        ...filter,
        excludedIds
      });
    } else {
      return this.referentialRefService.suggest(newValue, {
        ...filter,
        excludedIds,
        entityName: 'Department'
      });
    }
  }

  protected async suggestTaxonName(value: any, filter: any): Promise<LoadResult<TaxonNameRef>> {
    if (this.autocompleteFilters.taxonName) {
      return suggestFromArray(this.$filteredTaxonNames.getValue(), value, filter);
    } else {
      return this.taxonNameRefService.suggest(value, filter);
    }
  }

  /**
   * Suggest autocomplete values
   * @param value
   * @param filter - filters to apply
   */
  protected async suggestLocations(value: string, filter: any): Promise<LoadResult<IReferentialRef>> {
    filter = {
      levelIds: this.locationLevelIds || [LocationLevelIds.ICES_DIVISION],
      ...filter
    }
    // DEBUG
    //console.debug("Suggest locations: ", filter);
    if (this.autocompleteFilters.location) {
      return suggestFromArray(this.$filteredLocations.getValue(), value, filter);
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
      return suggestFromArray(this.$filteredAnalyticsReferences.getValue(), value, filter);
    } else {
      return this.strategyService.suggestAnalyticReferences(value, filter);
    }
  }

  /**
   * Suggest autocomplete values, for length pmfms
   * @param value
   * @param filter - filters to apply
   */
  protected async suggestLengthPmfms(value: any, filter: any): Promise<LoadResult<IReferentialRef>> {

    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
    const newValue = currentControlValue ? '*' : value;

    // Excluded existing locations, BUT keep the current control value
    const excludedIds = (this.lengthPmfmsForm.value || [])
      .map(ps => ps?.pmfm)
      .filter(ReferentialUtils.isNotEmpty)
      .filter(item => !currentControlValue || currentControlValue !== item)
      .map(item => parseInt(item.id));

    if (this.autocompleteFilters.lengthPmfm) {
      return suggestFromArray(this.$filteredLengthPmfms.value, value, {
        ...filter,
        excludedIds
      });
    } else {
      return this.pmfmService.suggest(newValue, <PmfmFilter>{
        ...filter,
        excludedIds,
        entityName: Pmfm.ENTITY_NAME
      },
      'name');
    }
  }

  /**
   * Suggest autocomplete values, for weight pmfms
   * @param value
   * @param filter - filters to apply
   */
  protected async suggestWeightPmfms(value: string, filter: any): Promise<LoadResult<IReferentialRef>> {
    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
    const newValue = currentControlValue ? '*' : value;

    // Excluded existing locations, BUT keep the current control value
    const excludedIds = (this.weightPmfmsForm.value || [])
      .map(ps => ps?.pmfm)
      .filter(ReferentialUtils.isNotEmpty)
      .filter(item => !currentControlValue || currentControlValue !== item)
      .map(item => parseInt(item.id));

    if (this.autocompleteFilters.weightPmfm) {
      return suggestFromArray(this.$filteredWeightPmfms.value, value, {
        ...filter,
        excludedIds
      });
    } else {
      return this.pmfmService.suggest(newValue, {
        ...filter,
        excludedIds,
        entityName: Pmfm.ENTITY_NAME
      },
      'name');
    }
  }

  /**
   * Suggest autocomplete values, for maturity pmfms
   * @param value
   * @param filter - filters to apply
   */
  protected async suggestMaturityPmfms(value: string, filter: any): Promise<LoadResult<IReferentialRef>> {
    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
    const newValue = currentControlValue ? '*' : value;

    // Excluded existing locations, BUT keep the current control value
    const excludedIds = (this.maturityPmfmsForm.value || [])
      .map(ps => ps?.pmfm)
      .filter(ReferentialUtils.isNotEmpty)
      .filter(item => !currentControlValue || currentControlValue !== item)
      .map(item => parseInt(item.id));

    if (this.autocompleteFilters.maturityPmfm) {
      return suggestFromArray(this.$filteredMaturityPmfms.value, value, filter);
    } else {
      return this.pmfmService.suggest(newValue, {
        ...filter,
        excludedIds,
        entityName: Pmfm.ENTITY_NAME
      },
      'name');
    }
  }

  /**
   * Suggest autocomplete values, for age fraction
   * @param value
   * @param filter - filters to apply
   */
  protected async suggestFractionPmfms(value: string, filter: any): Promise<LoadResult<IReferentialRef>> {
    const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
    const newValue = currentControlValue ? '*' : value;

    // Excluded existing locations, BUT keep the current control value
    const excludedIds = (this.fractionPmfmsForm.value || [])
      .map(ps => ps?.fraction)
      .filter(ReferentialUtils.isNotEmpty)
      .filter(item => !currentControlValue || currentControlValue !== item)
      .map(item => parseInt(item.id));

    if (this.autocompleteFilters.fractionPmfm) {
      return suggestFromArray(this.$filteredFractionPmfms.value, newValue, {
        ...filter,
        excludedIds
      });
    } else {
      const items = await firstNotNilPromise(this.$allFractions);
      return suggestFromArray(items, newValue, {
        ...filter,
        excludedIds
      });
    }
  }


  setValue(data: SamplingStrategy, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    console.debug("[sampling-strategy-form] Setting Strategy value", data);
    if (!data) return;

    this.markAsLoading();
    try {
      const isNew = isNil(data.id);
      this.data = SamplingStrategy.fromObject(data);

      // Fill efforts (need by validator)
      this.hasEffort = this.data.hasRealizedEffort;
      this.hasLanding = this.data.hasLanding;

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
        // INFO CLT : #IMAGINE-643 [Ligne de plan] Décalage heure de début et de fin des efforts
        // We use local timezone for Imagine instead of utc
        const startDate = fromDateISOString(`${year}-${startMonth.toString().padStart(2, '0')}-01T00:00:00.000`);
        const endDate = startDate.clone().add(2, 'month').endOf('month').endOf('day');
        // Find the existing entity, or create a new one
        const appliedPeriod = appliedPeriods && appliedPeriods.find(period => period.startDate.month() === startDate.month())
          || AppliedPeriod.fromObject({acquisitionNumber: undefined});
        appliedPeriod.startDate = startDate;
        appliedPeriod.endDate = endDate;

        return appliedPeriod;
      });

      // Resize applied periods array
      this.appliedPeriodsHelper.resize(4);

      // Get first period
      const firstAppliedPeriod = firstArrayValue(appliedStrategyWithPeriods.appliedPeriods);

      data.year = firstAppliedPeriod ? firstAppliedPeriod.startDate : moment();

      data.pmfms = data.pmfms || [];

      // If new
      if (isNew) {
        // pmfms = [null, null];
        data.sex = null;
        data.age = null;
      } else {
        data.age = data.pmfms.findIndex(p => p.pmfmId && p.pmfmId === PmfmIds.AGE) !== -1;
        data.sex = data.pmfms.findIndex(p => p.pmfmId && p.pmfmId === PmfmIds.SEX) !== -1;
        console.debug("[sampling-strategy-form] Has sex ?", data.sex, PmfmIds.SEX);
        data.label = data.label && data.label.substr(0, 2).concat(' ').concat(data.label.substr(2, 7)).concat(' ').concat(data.label.substr(9, 3));
      }

      data.lengthPmfms = this.getPmfmStrategiesByGroup(data.pmfms, this.pmfmGroups.LENGTH, ParameterLabelGroups.LENGTH);
      data.weightPmfms = this.getPmfmStrategiesByGroup(data.pmfms, this.pmfmGroups.WEIGHT, ParameterLabelGroups.WEIGHT);
      data.maturityPmfms = this.getPmfmStrategiesByGroup(data.pmfms, this.pmfmGroups.MATURITY, ParameterLabelGroups.MATURITY);
      data.fractionPmfms = (data.pmfms || [])
        .filter(p => p.fraction && !p.pmfm)
        .map(ps => {
          ps.fraction = this.$allFractions.value.find(fraction => fraction.id === ps.fraction.id);
          return ps;
        });

      // Min size = 1
      if (isEmptyArray(data.lengthPmfms)) data.lengthPmfms = [new PmfmStrategy()];
      if (isEmptyArray(data.weightPmfms)) data.weightPmfms = [new PmfmStrategy()];
      if (isEmptyArray(data.maturityPmfms)) data.maturityPmfms = [new PmfmStrategy()];
      if (isEmptyArray(data.fractionPmfms)) data.fractionPmfms = [new PmfmStrategy()];

      this.lengthPmfmsHelper.resize(Math.max(1, data.lengthPmfms.length));
      this.weightPmfmsHelper.resize(Math.max(1, data.weightPmfms.length));
      this.maturityPmfmsHelper.resize(Math.max(1, data.maturityPmfms.length));
      this.fractionPmfmsHelper.resize(Math.max(1, data.fractionPmfms.length));

      super.setValue(data, opts);

    }
    catch(err) {
      this.error = err && err.message || err;
      console.error(err);
    }
    finally {
      this.markAsPristine();
      this.markAsLoaded();
    }

  }

  async getValue(): Promise<SamplingStrategy> {

    // DEBUG
    console.debug('[sampling-strategy-form] getValue()');

    const json = this.form.getRawValue();
    const target = SamplingStrategy.fromObject(json);

    target.name = target.label || target.name;
    target.label = target.label || target.name;
    target.description = target.label || target.description;
    target.analyticReference = target.analyticReference && EntityUtils.isNotEmpty(target.analyticReference as any, 'label') ?
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
    let pmfmStrategies: Partial<PmfmStrategy>[] = [
      // Add tag id Pmfm
      {pmfmId: PmfmIds.TAG_ID, isMandatory: false},
      // Add dressing Pmfm
      {pmfmId: PmfmIds.DRESSING, isMandatory: true},
      // Weight
      ...target.weightPmfms,
      // Length
      ...target.lengthPmfms
    ];

    // Add SEX Pmfm
    if (target.sex) {
      pmfmStrategies = pmfmStrategies.concat([
        { pmfmId: PmfmIds.SEX },
        ...target.maturityPmfms
      ]);
    }

    // Add AGE Pmfm
    if (target.age) {
      pmfmStrategies = pmfmStrategies.concat([
        { pmfmId: PmfmIds.AGE },
        ...target.fractionPmfms
      ]);
    }

    // Fill PmfmStrategy defaults
    let rankOrder = 1;
    target.pmfms = pmfmStrategies
      .filter(isNotNil)
      .map(PmfmStrategy.fromObject)
      .map(pmfmStrategy => {
        pmfmStrategy.strategyId = pmfmStrategy.id;
        pmfmStrategy.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;
        pmfmStrategy.acquisitionNumber = 1;
        pmfmStrategy.isMandatory = toBoolean(pmfmStrategy.isMandatory, false);
        pmfmStrategy.rankOrder = rankOrder++;
        return pmfmStrategy;
      })
      // Remove if empty
      .filter(p => isNotNil(p.pmfmId) || isNotNil(p.pmfm) || isNotNil(p.parameter) || isNotNil(p.matrix) || isNotNil(p.fraction) || isNotNil(p.method));


    return target;
  }

  protected async onStrategyLabelChanged(label: string) {
    if (this.disableEditionListeners || this.loading) return;

    const labelControl = this.form.get('label');
    label = label || labelControl.value;
    if (isNilOrBlank(label)) return; // Skip is empty

    const taxonNameStrategyControl = this.taxonNameStrategyControl;
    const taxonCode = label.substring(3, 10);
    const taxonName = taxonNameStrategyControl?.value?.taxonName;

    // Only prefix has been set
    if (label.match(STRATEGY_LABEL_UI_PREFIX_REGEXP)) {
      const isUnique = await this.isTaxonNameUnique(taxonCode, taxonName?.id);
      if (!isUnique) {
        taxonNameStrategyControl.setErrors({ uniqueTaxonCode: true });
      } else {
        SharedValidators.clearError(taxonNameStrategyControl, 'uniqueTaxonCode');
      }
      labelControl.setErrors({pattern: true});
    }

    // Full label filled
    else if (label.match(STRATEGY_LABEL_UI_REGEXP)) {
      const isUnique = await this.isTaxonNameUnique(taxonCode, taxonName?.id);
      if (!isUnique) {
        //taxonNameControl.setErrors({ uniqueTaxonCode: true });
      } else {
        SharedValidators.clearError(taxonNameStrategyControl, 'uniqueTaxonCode');
        labelControl.setValue(label?.replace(/\s/g, '').toUpperCase(), {emitEvent: false});
      }
    }
  }

  private async isTaxonNameUnique(label: string, currentViewTaxonId?: number): Promise<boolean> {
    if (isNilOrBlank(label)) return true;

    const taxonNameFilter: Partial<TaxonNameFilter> = {
      searchAttribute: 'name',
      excludedIds: [currentViewTaxonId],
      statusIds: [StatusIds.ENABLE],
      levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES],
      withSynonyms: false
    };

    const [first, second] = await Promise.all([
      // Try without parenthesis
      this.taxonNameService.countAll({
        ...taxonNameFilter,
        searchText: TaxonUtils.generateNameSearchPatternFromLabel(label, false)
      }),
      // Try WITH parenthesis
      this.taxonNameService.countAll({
        ...taxonNameFilter,
        searchText: TaxonUtils.generateNameSearchPatternFromLabel(label, true)
      })
    ])

    return (first + second) === 0;
  }


  protected async generateLabelPrefix(event?: string) {
    const labelControl = this.form.get('label');
    if (this.loading || labelControl.disabled) return // Skip

    if (this.debug) console.debug('[sampling-strategy-fom] Generating label prefix, from event: ' + event);

    const yearCode = this.yearCode;
    if (!yearCode || !this.program) return; // Skip

    let errors: ValidationErrors;

    const taxonNameStrategyControl = this.taxonNameStrategyControl;
    if (!taxonNameStrategyControl) return;

    const currentViewTaxon = taxonNameStrategyControl.value?.taxonName;
    const currentViewTaxonName = taxonNameStrategyControl.value?.taxonName?.name;
    const storedDataTaxonName = this.data.taxonNames[0]?.taxonName?.name;
    const taxonCode = currentViewTaxonName && TaxonUtils.generateLabelFromName(currentViewTaxonName);
    const isUnique = await this.isTaxonNameUnique(taxonCode, currentViewTaxon?.id);

    const formRawValue = this.form.getRawValue();
    const previousFormTaxonName = formRawValue.taxonNames[0]?.taxonName?.name?.clone;
    const previousFormYear = fromDateISOString(formRawValue.year)?.format('YY');

    if (!taxonCode) {
      errors = {cannotComputeTaxonCode: true};
    } else if (!isUnique) {
      errors = {uniqueTaxonCode: true};
    }

    // Skip generate label when there is no update on year or taxon
    if (currentViewTaxonName && currentViewTaxonName === previousFormTaxonName && yearCode && yearCode === previousFormYear) return;

    // Update label mask
    // @ts-ignore
    this.labelMask = yearCode.split("")
      .concat([' ', /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, /^[a-zA-Z]$/, ' ', /\d/, /\d/, /\d/]);

    if (errors) {
      // if (this.data.label && this.data.label.substring(0, 2) === yearMask && this.data.label.substring(2, 9) === labelControl.value.toUpperCase().substring(2, 9)) {
      //   labelControl.setValue(this.data.label);
      // } else {
        const computedLabel = `${yearCode} `;
        if (!taxonNameStrategyControl.errors) {

          if ((this.data.label && this.data.label === labelControl.value) && (storedDataTaxonName && storedDataTaxonName === currentViewTaxonName)) {
            // When function is called back after save, we do nothing
          }
          else {
            labelControl.setValue(computedLabel);
          }
        }
        taxonNameStrategyControl.setErrors(errors);
      // }
    } else {
      //const computedLabel = this.program && (await this.strategyService.computeNextLabel(this.program.id, `${yearMask}${label}`, 3));
      SharedValidators.clearError(taxonNameStrategyControl, 'cannotComputeTaxonCode');
      //console.info('[sampling-strategy-form] Computed label: ' + computedLabel);
      //labelControl.setValue(computedLabel);
      // if current date and taxon code are same than stored data, set stored data
      const formTaxonCode = labelControl.value?.replace(/\s/g, '').toUpperCase().substring(2, 9);
      if (this.data.label && this.data.label.substring(0, 2) === yearCode && this.data.label.substring(2, 9) === formTaxonCode && formTaxonCode === taxonCode) {
        // Complete label with '___' when increment isn't set in order to throw a warning in validator
        if (this.data.label.length === 9) {
          labelControl.setValue(this.data.label + '___');
        }
        else {
          labelControl.setValue(this.data.label);
        }
      } else {
        // Complete label with '___' when increment isn't set in order to throw a warning in validator
        labelControl.setValue(`${yearCode} ${taxonCode} ___`);
      }

    }

    labelControl.markAsDirty();
  }

  get canGenerateLabel(): boolean {
    return !this.hasLanding && !this.loading && this.program && this.year && this.taxonNameStrategyControl.value?.taxonName && true;
  }

  async generateLabelIncrement() {
    if (this.loading) return; // Skip

    const yearCode = this.yearCode;
    const programId = this.program?.id;
    if (isNil(yearCode) || isNil(programId)) return; // Skip

    // Get label, or computed from label
    const labelControl = this.form.get('label');
    const taxonNameStrategyControl = this.taxonNameStrategyControl;
    let inputLabel = labelControl.value;
    inputLabel = inputLabel && inputLabel.replace(/\s/g, '').toUpperCase();
    let taxonCode = inputLabel && inputLabel.substring(2, 9);
    // No taxon code
    if (isNilOrBlank(taxonCode)) {
      const taxonName = taxonNameStrategyControl.value?.taxonName;
      if (taxonName) {
        taxonCode = TaxonUtils.generateLabelFromName(taxonName.name);
        if (!taxonCode) {
          taxonNameStrategyControl.setErrors({cannotComputeTaxonCode: true});
          return;
        }
        const isUnique = await this.isTaxonNameUnique(taxonCode, taxonName.id);
        if (!isUnique) {
          taxonNameStrategyControl.setErrors({uniqueTaxonCode: true});
          return;
        }
      }
    }

    SharedValidators.clearError(taxonNameStrategyControl, 'uniqueTaxonCode');
    SharedValidators.clearError(taxonNameStrategyControl, 'cannotComputeTaxonCode');

    const labelPrefix = this.yearCode + taxonCode.toUpperCase();
    const label = await this.strategyService.computeNextLabel(programId, labelPrefix, 3);
    labelControl.setValue(label);
  }

  // TaxonName Helper -----------------------------------------------------------------------------------------------
  protected initTaxonNameHelper() {
    // appliedStrategies => appliedStrategies.location ?
    this.taxonNamesHelper = new FormArrayHelper<TaxonNameStrategy, UntypedFormGroup>(
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

  // appliedStrategies Helper -----------------------------------------------------------------------------------------------
  protected initAppliedStrategiesHelper() {
    // appliedStrategiesHelper formControl can't have common validator since quarters efforts are optional
    this.appliedStrategiesHelper = new FormArrayHelper<AppliedStrategy, UntypedFormGroup>(
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

  addLengthPmfm() {
    this.lengthPmfmsHelper.add(new PmfmStrategy());
  }

  addWeightPmfm() {
    this.weightPmfmsHelper.add(new PmfmStrategy());
  }

  addMaturityPmfm() {
    this.maturityPmfmsHelper.add(new PmfmStrategy());
  }

  removeLengthPmfm(idx: number) {
    this.lengthPmfmsHelper.removeAt(idx);
    this.validatePmfmsForm();
  }

  removeWeightPmfm(idx: number) {
    this.weightPmfmsHelper.removeAt(idx);
    this.validatePmfmsForm();
  }

  removeMaturityPmfm(idx: number) {
    this.maturityPmfmsHelper.removeAt(idx);
    this.validatePmfmsForm();
  }

  // appliedStrategies Helper -----------------------------------------------------------------------------------------------
  protected initAppliedPeriodHelper() {
    // Use the first applied strategy form group (created just before)
    const appliedStrategyForm = this.appliedStrategiesHelper.at(0);

    // appliedStrategyForm formControl can't have common validator since quarters efforts are optional
    this.appliedPeriodsHelper = new FormArrayHelper<AppliedPeriod, UntypedFormGroup>(
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
    this.departmentsHelper = new FormArrayHelper<StrategyDepartment, UntypedFormGroup>(
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

  protected initPmfmStrategiesHelpers() {
    this.pmfmsHelper = this.createPmfmStrategiesArrayHelper('pmfms', 0);

    this.lengthPmfmsHelper = this.createPmfmStrategiesArrayHelper('lengthPmfms', 1);
    this.weightPmfmsHelper = this.createPmfmStrategiesArrayHelper('weightPmfms', 1);
    this.maturityPmfmsHelper = this.createPmfmStrategiesArrayHelper('maturityPmfms', 1);
    this.fractionPmfmsHelper = this.createPmfmStrategiesArrayHelper('fractionPmfms', 1);
  }

  protected createPmfmStrategiesArrayHelper(arrayName: string, minSize?: number): FormArrayHelper<PmfmStrategy, UntypedFormGroup> {
    const helper = new FormArrayHelper<PmfmStrategy, UntypedFormGroup>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, arrayName),
      (data) => this.pmfmStrategyValidator.getFormGroup(data, {withDetails: false, required: false}),
      PmfmStrategy.equals,
      PmfmStrategy.isEmpty,
      {
        allowEmptyArray: false
      }
    );
    // Create at least one fishing Area
    if (minSize && helper.size() < minSize) {
      helper.resize(minSize);
    }
    return helper;
  }

  addPmfmFraction() {
    this.fractionPmfmsHelper.add();
  }

  protected markForCheck() {
    if (this.cd) this.cd.markForCheck();
  }

  // Get the year
  protected get year(): number {
    const value = this.form.get('year').value;
    // Value is stored in database in utc, we need to get local timezone moment in order to get year
    var localTimeZoneDate = moment.utc(value).local();
    const year = localTimeZoneDate && +(localTimeZoneDate.format('YYYY'));

    if (year && year < 1970) return; // Skip if too old
    return year;
  }

  // Get year, as string (last 2 digits)
  protected get yearCode(): string {
    const year = this.year;
    return year && (''+year).substr(2,2);
  }

  requiredPeriodMinLength(minLength?: number): ValidatorFn {
    minLength = minLength || 1;
    return (array: UntypedFormArray): ValidationErrors | null => {
      const values = array.value.flat().filter(period => period.acquisitionNumber !== undefined && period.acquisitionNumber !== null && period.acquisitionNumber >= 1);
      if (!values || values.length < minLength) {
        return { minLength: { minLength: minLength } };
      }
      return null;
    };
  }

  isDepartmentDisable(index: number): boolean {
    return this.departmentsHelper.at(index).status === "DISABLED";
  }

  isLocationDisable(index: number): boolean {
    return this.appliedStrategiesHelper.at(index).status === "DISABLED" || this.hasLanding;
  }

  isFractionDisable(index: number): boolean {
    return this.fractionPmfmsHelper.at(index).status === "DISABLED";
  }

  isLengthPmfmDisable(index: number): boolean {
    return this.lengthPmfmsHelper.at(index).status === "DISABLED";
  }

  isWeightPmfmDisable(index: number): boolean {
    return this.weightPmfmsHelper.at(index).status === "DISABLED";
  }

  isMaturityPmfmDisable(index: number): boolean {
    return this.maturityPmfmsHelper.at(index).status === "DISABLED";
  }

  markAsDirty() {
    this.form.markAsDirty();
  }

  /**
   * get pmfm by type
   * @param pmfms
   * @param pmfmIds
   * @param parameterLabels
   * @protected
   */
  protected getPmfmStrategiesByGroup(pmfms: PmfmStrategy[], pmfmIds: number[], parameterLabels: string[]) {
    return (pmfms || []).filter(p => {
      if (p) {
        const pmfmId = toNumber(p.pmfmId, p.pmfm && p.pmfm.id);
        const hasParameterId = p.parameter && p.parameter.label && parameterLabels.includes(p.parameter.label);
        return pmfmIds.includes(pmfmId) || hasParameterId;
      }
      return false;
    });
  }

  protected async validatePmfmsForm(): Promise<ValidationErrors | null> {
    const pmfmsForm = this.pmfmsForm;
    if (this.loading || pmfmsForm.disabled) return;

    // DEBUG
    //console.debug('DEV Call validatePmfmsForm()...');

    const weightPmfmsCount = (this.weightPmfmsForm.value || []).filter(PmfmStrategy.isNotEmpty).length;
    const lengthPmfmsCount = (this.lengthPmfmsForm.value || []).filter(PmfmStrategy.isNotEmpty).length;
    const maturityPmfmsCount = (this.maturityPmfmsForm.value || []).filter(PmfmStrategy.isNotEmpty).length;

    let errors: ValidationErrors;

    // Check weight OR length is present
    if (weightPmfmsCount === 0 && lengthPmfmsCount === 0 ) {
      errors = {
        weightOrSize: true
      };
    }
    else {
      SharedValidators.clearError(pmfmsForm, 'weightOrSize');
    }

    let length = (this.hasAge ? 1 : 0)
      + (this.hasSex ? (1 + maturityPmfmsCount) : 0)
      + weightPmfmsCount
      + lengthPmfmsCount;

    if (length < this.minPmfmCount) {
      errors = {
        ...errors,
        minLength: { minLength: this.minPmfmCount }
      };
    }
    else {
      SharedValidators.clearError(pmfmsForm, 'minLength');
    }
    pmfmsForm.setErrors(errors);
    if (errors) {
      pmfmsForm.markAllAsTouched();
      pmfmsForm.markAsDirty();
    }
    return null;
  }

  selectInputContent = AppFormUtils.selectInputContent;

}
