import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {Moment} from 'moment/moment';
import {
  EntityUtils,
  FormArrayHelper,
  IReferentialRef,
  isNil,
  isNotNil,
  Person,
  ReferentialRef,
  referentialToString
} from '../../core/core.module';
import {DateAdapter} from "@angular/material/core";
import {debounceTime, distinctUntilChanged, filter, pluck} from 'rxjs/operators';
import {AcquisitionLevelCodes, LocationLevelIds, PmfmIds} from '../../referential/services/model/model.enum';
import {Landing2ValidatorService} from "../services/validator/landing2.validator";
import {PersonService} from "../../admin/services/person.service";
import {MeasurementValuesForm} from "../measurement/measurement-values.form.class";
import {MeasurementsValidatorService} from "../services/validator/measurement.validator";
import {FormArray, FormBuilder, FormControl, ValidationErrors, Validators} from "@angular/forms";
import {ModalController} from "@ionic/angular";
import {ReferentialUtils} from "../../core/services/model/referential.model";
import {personToString, UserProfileLabel} from "../../core/services/model/person.model";
import {LocalSettingsService} from "../../core/services/local-settings.service";
import {MatAutocompleteFieldAddOptions, MatAutocompleteFieldConfig} from "../../shared/material/material.autocomplete";
import {VesselSnapshotService} from "../../referential/services/vessel-snapshot.service";
import {toBoolean} from "../../shared/functions";
import {Landing} from "../services/model/landing.model";
import {ReferentialRefFilter, ReferentialRefService} from "../../referential/services/referential-ref.service";
import {ProgramService} from "../../referential/services/program.service";
import {StatusIds} from "../../core/services/model/model.enum";
import {VesselSnapshot} from "../../referential/services/model/vessel-snapshot.model";
import {VesselModal} from "../../referential/vessel/modal/modal-vessel";
import {TaxonNameRef} from "../../referential/services/model/taxon.model";
import {AppliedStrategy, Strategy, TaxonNameStrategy} from "../../referential/services/model/strategy.model";
import {StrategyService} from "../../referential/services/strategy.service";
import {StrategyFilter} from "../../referential/strategy/strategies.table";
import {Sample} from "../services/model/sample.model";
import {PmfmStrategy} from "../../referential/services/model/pmfm-strategy.model";
import {Pmfm} from "../../referential/services/model/pmfm.model";
import {SharedValidators} from "../../shared/validator/validators";
import {TranslateService} from "@ngx-translate/core";

@Component({
  selector: 'app-landing2-form',
  templateUrl: './landing2.form.html',
  styleUrls: ['./landing2.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Landing2Form extends MeasurementValuesForm<Landing> implements OnInit {

  private _showObservers: boolean;
  private _vessel: any;
  observersHelper: FormArrayHelper<Person>;
  observerFocusIndex = -1;
  mobile: boolean;

  enableTaxonNameFilter = false;
  canFilterTaxonName = true;

  @Input() required = true;

  referenceTaxon : ReferentialRef;
  fishingAreas : ReferentialRef[];
  fishingAreaHelper: FormArrayHelper<AppliedStrategy>;
  _sampleRowCode: string;
  _defaultTaxonNameFromStrategy: TaxonNameStrategy;

  appliedStrategies: AppliedStrategy[];

  @Input() showProgram = true;
  @Input() showSampleRowCode = true;
  @Input() showVessel = true;
  @Input() showDateTime = true;
  @Input() showLocation = true;
  @Input() showFishingArea = true;
  @Input() showTargetSpecies = true;
  @Input() showComment = true;
  @Input() showMeasurements = true;
  @Input() showError = true;
  @Input() showButtons = true;
  @Input() locationLevelIds: number[];


  warning;


  @Input() set showObservers(value: boolean) {
    if (this._showObservers !== value) {
      this._showObservers = value;
      this.initObserversHelper();
      this.markForCheck();
    }
  }

  get showObservers(): boolean {
    return this._showObservers;
  }

  @Input()
  set sampleRowCode(value: string) {
    if (this._sampleRowCode !== value && isNotNil(value)) {
      this._sampleRowCode = value;
    }
  }

  get sampleRowCode(): string {
    return this._sampleRowCode;
  }

  @Input()
  set defaultTaxonNameFromStrategy(value: TaxonNameStrategy) {
    if (this._defaultTaxonNameFromStrategy !== value && isNotNil(value)) {
      this._defaultTaxonNameFromStrategy = value;
    }
  }

  get defaultTaxonNameFromStrategy(): TaxonNameStrategy {
    return this._defaultTaxonNameFromStrategy;
  }

  @Input()
  set vessel(value: string) {
    if (this._vessel !== value && isNotNil(value)) {
      this._vessel = value;
    }
  }

  get vessel(): string {
    return this._vessel;
  }

  get empty(): any {
    const value = this.value;
    return ReferentialUtils.isEmpty(value.location)
      && (!value.dateTime)
      && (!value.comments || !value.comments.length);
  }

  get valid(): any {
    return this.form && (this.required ? this.form.valid : (this.form.valid || this.empty));
  }

  get observersForm(): FormArray {
    return this.form.controls.observers as FormArray;
  }

  getReferenceTaxonControl(): FormControl {
    return null; //this.form.controls.observers;
  }

  get fishingAreasFormArray(): FormArray {
    return this.form.controls.appliedStrategies as FormArray;
  }

  get sampleRowCodeControl(): FormControl {
    return this.form.controls.sampleRowCode as FormControl;
  }

  taxonNameHelper: FormArrayHelper<TaxonNameStrategy>;
  get taxonNamesForm(): FormArray {
    return this.form.controls.samples as FormArray;
  }

  constructor(
    protected dateAdapter: DateAdapter<Moment>,
    protected measurementValidatorService: MeasurementsValidatorService,
    protected formBuilder: FormBuilder,
    protected programService: ProgramService,
    protected validatorService: Landing2ValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected personService: PersonService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected settings: LocalSettingsService,
    protected translate: TranslateService,
    protected modalCtrl: ModalController,
    protected cd: ChangeDetectorRef,
    protected strategyService: StrategyService
  ) {
    super(dateAdapter, measurementValidatorService, formBuilder, programService, settings, cd, validatorService.getFormGroup());
    this._enable = false;
    this.mobile = this.settings.mobile;

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;
    this.strategyService = strategyService;
  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.showObservers = toBoolean(this.showObservers, true); // Will init the observers helper
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
    if (isNil(this.locationLevelIds)) {
      this.locationLevelIds = [LocationLevelIds.PORT];
    }

    // Combo: programs
    this.registerAutocompleteField('program', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Program'
      }
    });

    // Combo: sampleRowCode
    this.registerAutocompleteField('sampleRowCode', {
      service: this.strategyService,
      attributes: this.settings.getFieldDisplayAttributes('sampleRowCode', ['name'])//,
      // filter: {
      //   // FIXME CLT : id program to retrieve
      //   programId: '40'
      // }
    });

    // Combo: vessels
    const vesselField = this.registerAutocompleteField('vesselSnapshot', {
      service: this.vesselSnapshotService,
      attributes: this.settings.getFieldDisplayAttributes('vesselSnapshot', ['exteriorMarking', 'name']),
      filter: {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }
    });
    // Add base port location
    vesselField.attributes = vesselField.attributes.concat(this.settings.getFieldDisplayAttributes('location').map(key => 'basePortLocation.' + key));

    // Propagate program
    this.registerSubscription(
      this.form.get('program').valueChanges
        .pipe(
          debounceTime(250),
          filter(ReferentialUtils.isNotEmpty),
          pluck('label'),
          distinctUntilChanged()
        )
        .subscribe(programLabel => this.program = programLabel as string));

    // Combo location
    this.registerAutocompleteField('location', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelIds: this.locationLevelIds
      }
    });

    // Combo: observers
    const profileLabels: UserProfileLabel[] = ['SUPERVISOR', 'USER', 'GUEST'];
    this.registerAutocompleteField('person', {
      service: this.personService,
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
        userProfiles: profileLabels
      },
      attributes: ['lastName', 'firstName', 'department.name'],
      displayWith: personToString
    });


    // Combo: fishingArea
    const fishingAreaAttributes = this.settings.getFieldDisplayAttributes('fishingArea');
    this.registerAutocompleteField('fishingArea', {
      service: this.referentialRefService,
      attributes: fishingAreaAttributes,
      // Increase default column size, for 'label'
      columnSizes: fishingAreaAttributes.map(a => a === 'label' ? 4 : undefined/*auto*/),
      filter: <ReferentialRefFilter>{
        entityName: 'Location'
      },
      mobile: this.mobile
    });

    // Combo: taxon / targetSpecies
    // const taxonNameAttributes = this.settings.getFieldDisplayAttributes('taxonName');
    // const taxonNameField = this.registerAutocompleteField('taxonName', {
    //   service: this.referentialRefService,
    //   attributes: taxonNameAttributes,
    //   // Increase default column size, for 'label'
    //   columnSizes: taxonNameAttributes.map(a => a === 'label' ? 4 : undefined/*auto*/),
    //   filter: <ReferentialRefFilter>{
    //     entityName: 'TaxonName'
    //   },
    //   mobile: this.mobile
    // });

    this.registerAutocompleteField('taxonName', {
      suggestFn: (value, filter) => this.suggest(value, {
          ...filter, statusId : 1
        },
        'TaxonName',
        this.enableTaxonNameFilter),
      attributes: ['name'],
      columnNames: [ 'REFERENTIAL.NAME'],
      columnSizes: [2,10],
      mobile: this.settings.mobile
    });

    this.initTaxonNameHelper();
    this.initAppliedStrategiesHelper();
    this.initAppliedStrategiesValidator();
  }

  // TaxonName Helper -----------------------------------------------------------------------------------------------
  protected initTaxonNameHelper() {
    // appliedStrategies => appliedStrategies.location ?
    this.taxonNameHelper = new FormArrayHelper<TaxonNameStrategy>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'samples'),
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

  // get value(): any {
  //   const json = this.form.value;
  //
  //   // Add sampleRowCode, because if control disabled the value is missing
  //   json.sampleRowCode = this.form.get('sampleRowCode').value;
  //
  //   return json;
  // }

  public setValue(value: Landing) {
    if (!value) return;
    let taxonNames = value.samples.filter(sample => sample.taxonName);

    if (this._defaultTaxonNameFromStrategy) {

      if (!taxonNames) {
        taxonNames = [];
      }
      if (taxonNames.length == 0) {
        let emptySampleWithTaxon = new Sample();
        emptySampleWithTaxon.taxonName = this._defaultTaxonNameFromStrategy.taxonName;
        taxonNames.push(emptySampleWithTaxon);
      }
    }

    value.samples = value.samples.filter(sample => !sample.taxonName);

    // Make sure to have (at least) one observer
    value.observers = value.observers && value.observers.length ? value.observers : [null];

    // Resize observers array
    if (this._showObservers) {
      this.observersHelper.resize(Math.max(1, value.observers.length));
    } else {
      this.observersHelper.removeAllEmpty();
    }

    // Propagate the program
    if (value.program && value.program.label) {
      this.program = value.program.label;
    }
    if (this.appliedStrategies)
    {
      this.fishingAreaHelper.resize(Math.max(1, this.appliedStrategies.length));
    }
    else {
      this.fishingAreaHelper.resize(1);
    }


    let sampleRowCode=[];
    let sample = new Strategy();
    sample.label = this.sampleRowCode;
    sample.name = this.sampleRowCode;
    sampleRowCode.push(sample);

    // Send value for form
    super.setValue(value);

    const taxonNameControl = this.taxonNamesForm;
    taxonNameControl.patchValue(taxonNames);
    if (!this.appliedStrategies)
    {
      this.appliedStrategies = [];
    }
    this.fishingAreasFormArray.patchValue(this.appliedStrategies);

    this.sampleRowCodeControl.patchValue(sample);
  }

  addObserver() {
    this.observersHelper.add();
    if (!this.mobile) {
      this.observerFocusIndex = this.observersHelper.size() - 1;
    }
  }

  enable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }): void {
    super.enable(opts);

    // Leave program disable once data has been saved
    if (isNotNil(this.data.id) && !this.form.controls['program'].disabled) {
      this.form.controls['program'].disable({emitEvent: false});
      this.markForCheck();
    }
  }

  async addVesselModal(): Promise<any> {
    const modal = await this.modalCtrl.create({ component: VesselModal });
    modal.onDidDismiss().then(res => {
      // if new vessel added, use it
      if (res && res.data instanceof VesselSnapshot) {
        console.debug("[landing-form] New vessel added : updating form...", res.data);
        this.form.controls['vesselSnapshot'].setValue(res.data);
        this.markForCheck();
      }
      else {
        console.debug("[landing-form] No vessel added (user cancelled)");
      }
    });
    return modal.present();
  }

  public registerAutocompleteField(fieldName: string, options?: MatAutocompleteFieldAddOptions): MatAutocompleteFieldConfig {
    return super.registerAutocompleteField(fieldName, options);
  }

  referentialToString = referentialToString;

  /* -- protected method -- */

  protected initObserversHelper() {
    if (isNil(this._showObservers)) return; // skip if not loading yet
    this.observersHelper = new FormArrayHelper<Person>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'observers'),
      (person) => this.validatorService.getObserverControl(person),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {allowEmptyArray: !this._showObservers}
    );

    if (this._showObservers) {
      // Create at least one observer
      if (this.observersHelper.size() === 0) {
        this.observersHelper.resize(1);
      }
    }
    else if (this.observersHelper.size() > 0) {
      this.observersHelper.resize(0);
    }
  }

  // appliedStrategies Helper
  protected initAppliedStrategiesHelper() {
    // appliedStrategiesHelper formControl can't have common validator since quarters efforts are optional
    this.fishingAreaHelper = new FormArrayHelper<AppliedStrategy>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'appliedStrategies'),
      (appliedStrategy) => this.formBuilder.group({location: [appliedStrategy && appliedStrategy.location, Validators.compose([Validators.required])]}),
      (s1, s2) => EntityUtils.equals(s1.location, s2.location, 'label'),
      value => isNil(value) && isNil(value.location),
    );
    // Create at least one fishing Area
    if (this.fishingAreaHelper.size() === 0) {
      this.fishingAreaHelper.resize(1);
    }
  }

  // Add validator on expected effort for this sampleRow (issue #175)
  protected initAppliedStrategiesValidator() {
    this.form.get('sampleRowCode').setAsyncValidators(async (control) => {
      if (!this.appliedStrategies.length) return null;

      const landingDateTime = this.value.dateTime;
      let appliedPeriods = this.appliedStrategies.length && this.appliedStrategies[0].appliedPeriods || [];
      let appliedPeriod = appliedPeriods.find(period => landingDateTime.isBetween(period.startDate, period.endDate, 'day'))

      console.debug("[landing-form] Validating effort: ", landingDateTime, appliedPeriod);

      if (!appliedPeriod || isNil(appliedPeriod.acquisitionNumber)) {
        return <ValidationErrors>{noEffort: this.translate.instant('LANDING.ERROR.NO_STRATEGY_EFFORT_ERROR')};
      } else if (appliedPeriod.acquisitionNumber == 0) {
        // TODO must be a warning, not error
        //return <ValidationErrors>{noEffort: this.translate.instant('LANDING.ERROR.ZERO_STRATEGY_EFFORT_ERROR')};
        this.warning = {noEffort: this.translate.instant('LANDING.ERROR.ZERO_STRATEGY_EFFORT_ERROR')};
        return null;
      } else {
        SharedValidators.clearError(control, 'noEffort');
        this.warning = null;
      }
      return null;
    });
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }


  toggleFilteredItems(fieldName: string){
    let value : boolean;
    switch (fieldName) {
      case 'taxonName':
        this.enableTaxonNameFilter = value = !this.enableTaxonNameFilter;
        break;
      default:
        break;
    }
    this.markForCheck();
    console.debug(`[landing] set enable filtered ${fieldName} items to ${value}`);
  }

  /**
   * Suggest autocomplete values
   * @param value
   * @param filter - filters to apply
   * @param entityName - referential to request
   * @param filtered - boolean telling if we load prefilled data
   */
  protected async suggest(value: string, filter: any, entityName: string, filtered: boolean) : Promise<IReferentialRef[]> {

    if(filtered) {
      //TODO a remplacer par recuperation des donnees deja saisies
      const res = await this.referentialRefService.loadAll(0, 5, null, null,
        { ...filter,
          entityName : entityName
        },
        { withTotal: false /* total not need */ }
      );
      return res.data;
    } else {
      return this.referentialRefService.suggest(value, {
        ...filter,
        entityName : entityName
      });
    }
  }

  /**
   * Override refreshPmfms in order to keep sampleRowCode pmfmStrategy in measurement values even if it doesn't belong to strategy.pmfmStrategies
   */
  protected async refreshPmfms(event?: any) {
    // Skip if missing: program, acquisition (or gear, if required)
    if (isNil(this._program) || isNil(this._acquisitionLevel) || (this.requiredGear && isNil(this._gearId))) {
      return;
    }

    if (this.debug) console.debug(`${this.logPrefix} refreshPmfms(${event})`);

    this.loading = true;
    this.loadingPmfms = true;

    this.$pmfms.next(null);

    try {
      // Load pmfms
      let pmfms = (await this.programService.loadProgramPmfms(
        this._program,
        {
          acquisitionLevel: this._acquisitionLevel,
          gearId: this._gearId
        })) || [];
      pmfms = pmfms.filter(pmfm => (pmfm.pmfmId && pmfm.type));

      let sampleRowPmfmStrategy = new PmfmStrategy();
      let sampleRowPmfm = new Pmfm();
      sampleRowPmfm.id = PmfmIds.SAMPLE_ROW_CODE;
      sampleRowPmfm.type = 'string';
      sampleRowPmfmStrategy.pmfm = sampleRowPmfm;
      sampleRowPmfmStrategy.pmfmId = PmfmIds.SAMPLE_ROW_CODE;
      sampleRowPmfmStrategy.type = 'string';
      pmfms.push(sampleRowPmfmStrategy)

      if (!pmfms.length && this.debug) {
        console.warn(`${this.logPrefix} No pmfm found, for {program: ${this._program}, acquisitionLevel: ${this._acquisitionLevel}, gear: ${this._gearId}}. Make sure programs/strategies are filled`);
      }
      else {

        // If force to optional, create a copy of each pmfms that should be forced
        if (this._forceOptional) {
          pmfms = pmfms.map(pmfm => {
            if (pmfm.required) {
              pmfm = pmfm.clone(); // Keep original entity
              pmfm.required = false;
              return pmfm;
            }
            // Return original pmfm, as not need to be overrided
            return pmfm;
          });
        }
      }

      // Apply
      await this.setPmfms(pmfms.slice());
    }
    catch (err) {
      console.error(`${this.logPrefix} Error while loading pmfms: ${err && err.message || err}`, err);
      this.loadingPmfms = false;
      this.$pmfms.next(null); // Reset pmfms
    }
    finally {
      if (this.enabled) this.loading = false;
      this.markForCheck();
    }
  }
}
