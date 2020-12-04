import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {Moment} from 'moment/moment';
import {DateAdapter} from "@angular/material/core";
import {LocalSettingsService} from "../../core/services/local-settings.service";
import {ControlValueAccessor, FormBuilder, FormArray} from "@angular/forms";
import {ReferentialRefService} from "../../referential/services/referential-ref.service";
import {StrategyService} from "../services/strategy.service";
import {
  AppForm,
  ReferentialRef,
  IReferentialRef,
  FormArrayHelper,
  Referential
} from '../../core/core.module';
import {BehaviorSubject, Observable} from "rxjs";
import { Program } from '../services/model/program.model';
import { DEFAULT_PLACEHOLDER_CHAR } from 'src/app/shared/constants';
import { InputElement } from 'src/app/shared/shared.module';
import { ReferentialUtils} from "../../core/services/model/referential.model";
import * as moment from "moment";
import {SimpleStrategyValidatorService} from "../services/validator/simpleStrategy.validator";
import {SimpleStrategy} from "../services/model/simpleStrategy.model";
import {Strategy} from "../services/model/strategy.model";
import {filter, map} from "rxjs/operators";
import {Pmfm} from "../services/model/pmfm.model";
import {removeDuplicatesFromArray} from "../../shared/functions";
import {PmfmStrategy} from "../services/model/pmfm-strategy.model";
import {AppFormHolder, IAppForm, IAppFormFactory} from "../../core/form/form.utils";



@Component({
  selector: 'form-planification',
  templateUrl: './planification.form.html',
  styleUrls: ['./planification.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {provide: SimpleStrategyValidatorService}
  ],
})
export class PlanificationForm extends AppForm<SimpleStrategy> implements OnInit, ControlValueAccessor, InputElement {

  protected formBuilder: FormBuilder;
  private _eotpSubject = new BehaviorSubject<IReferentialRef[]>(undefined);
  private _calcifiedTypeSubject = new BehaviorSubject<IReferentialRef[]>(undefined);


  private eotpList: Array<{id,label: string, name: string, statusId : number, entityName: string}> = [
    {id: '1', label: 'P101-0001-01-DF', name: 'GRAND PORT MARITIME DE GUADELOUPE - FCT', statusId:1,entityName:"Eotp"},
    {id: '2', label: 'P101-0002-01-RE', name: 'SOCLE HALIEUTIQUE - RE', statusId:1,entityName:"Eotp"},
    {id: '3', label: 'P101-0003-01-RE', name: 'DCF- Recettes',statusId:1,entityName:"Eotp"},
    {id: '4', label: 'P101-0005-01-DF', name: 'CONV TRIPARTITE AAMP-DPMA-IFR-FCT',statusId:1,entityName:"Eotp"},
    {id: '5', label: 'P101-0006-01-DF', name: 'APP EMR DGEC - état des lieux - DF',statusId:1,entityName:"Eotp"}
  ];

  private FiltredEotpList: Array<{id,label: string, name: string, statusId : number, entityName: string}> = [
    {id: '3', label: 'P101-0003-01-RE', name: 'DCF- Recettes',statusId:1,entityName:"Eotp"},
    {id: '5', label: 'P101-0006-01-DF', name: 'APP EMR DGEC - état des lieux - DF',statusId:1,entityName:"Eotp"}
  ];

  mobile: boolean;
  programId = -1;

  enableTaxonNameFilter = true;
  canFilterTaxonName = true;

  enableEotpFilter = true;
  canFilterEotp = true;

  enableLaboratoryFilter = true;
  canFilterLaboratory = true;
  laboratoryHelper: FormArrayHelper<ReferentialRef>;
  laboratoryFocusIndex = -1;

  enableFishingAreaFilter = true;
  canFilterFishingArea = true;
  fishingAreaHelper: FormArrayHelper<ReferentialRef>;
  fishingAreaFocusIndex = -1;

  enableCalcifiedTypeFilter = true;
  canFilterCalcifiedType = true;
  calcifiedTypeHelper: FormArrayHelper<ReferentialRef>;
  calcifiedTypeFocusIndex = -1;

  @Input() program: Program;
  @Input() showError = true;
  @Input() entityName;
  sampleRowCode: string = '';

  @Input() placeholderChar: string = DEFAULT_PLACEHOLDER_CHAR;


  public sampleRowMask = ['2', '0', '2', '0', '-', 'B', 'I', '0', '-', /\d/, /\d/, /\d/, /\d/];

  get calcifiedTypesForm(): FormArray {
    return this.form.controls.calcifiedTypes as FormArray;
  }

  get laboratoriesForm(): FormArray {
    return this.form.controls.laboratories as FormArray;
  }

  get fishingAreasForm(): FormArray {
    return this.form.controls.fishingAreas as FormArray;
  }

  constructor(
    protected dateAdapter: DateAdapter<Moment>,
    protected validatorService: SimpleStrategyValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected strategyService: StrategyService,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef
  ) {
    super(dateAdapter, validatorService.getFormGroup(), settings);
  }
  tabIndex?: number;
  hidden?: boolean;
  appliedYear: string ='';

  focus() {
    throw new Error('Method not implemented.');
  }
  writeValue(value: any): void {
    //  if (value !== this.sampleRowCode) {
    //       this.sampleRowCode = value;
    //     }
  }
  registerOnChange(fn: any): void {
    throw new Error('Method not implemented.');
  }
  registerOnTouched(fn: any): void {
    throw new Error('Method not implemented.');
  }
  setDisabledState?(isDisabled: boolean): void {
    throw new Error('Method not implemented.');
  }

  ngOnInit() {

    // register year field changes
    this.registerSubscription(
      this.form.get('year').valueChanges
        .subscribe(async (date : Moment) => {
          //update mask
          const year = date.year().toString()
          this.sampleRowMask = [...year.split(''), '-', 'B', 'I', '0', '-', /\d/, /\d/, /\d/, /\d/];
          // set sample row code
          //TODO : replace 40 with this.program.id
          this.sampleRowCode = await this.strategyService.findStrategyNextLabel(40,`${year}-BIO-`, 4);
        })
    );

    // taxonName autocomplete
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

    // laboratory autocomplete
    this.registerAutocompleteField('laboratory', {
      suggestFn: (value, filter) => this.suggest(value, {
          ...filter, statusId : 1
        },
        'Department',
        this.enableLaboratoryFilter),
      columnSizes : [4,6],
      mobile: this.settings.mobile
    });

    // fishingArea autocomplete
    this.registerAutocompleteField('fishingArea', {
      suggestFn: (value, filter) => this.suggest(value, {
          ...filter, statusId : 0, levelId : 111
        },
        'Location',
        this.enableFishingAreaFilter),
      mobile: this.settings.mobile
    });


    // eotp combo -------------------------------------------------------------------
    this.registerAutocompleteField('eotp', {
      columnSizes : [4,6],
      items: this._eotpSubject,
      mobile: this.mobile
    });
    this.loadEotps();

    // Calcified type combo ------------------------------------------------------------
    this.registerAutocompleteField('calcifiedType', {
      attributes: ['name'],
      columnNames: [ 'REFERENTIAL.NAME'],
      items: this._calcifiedTypeSubject,
      mobile: this.mobile
    });
    this.loadCalcifiedType();

    //set current date to year field
    this.form.get('year').setValue(moment());

    //init helpers
    this.initCalcifiedTypeHelper();
    this.initLaboratoryHelper();
    this.initFishingAreaHelper();

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

  toggleFilteredItems(fieldName: string){
    let value : boolean;
    switch (fieldName) {
      case 'eotp':
        this.enableEotpFilter = value = !this.enableEotpFilter;
        this.loadEotps();
        break;
      case 'laboratory':
        this.enableLaboratoryFilter = value = !this.enableLaboratoryFilter;
        break;
      case 'fishingArea':
        this.enableFishingAreaFilter = value = !this.enableFishingAreaFilter;
        break;
      case 'taxonName':
        this.enableTaxonNameFilter = value = !this.enableTaxonNameFilter;
        break;
      case 'calcifiedType':
        this.enableCalcifiedTypeFilter = value = !this.enableCalcifiedTypeFilter;
        this.loadCalcifiedType();
        break;
      default:
        break;
    }
    this.markForCheck();
    console.debug(`[planification] set enable filtered ${fieldName} items to ${value}`);
  }

  setValueSimpleStrategy(data: Referential, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    console.debug("[planification-form] Setting SimpleStrategy value", data);
    if (!data) return;

    if (data instanceof Strategy)
    {
      var simpleStrategy : SimpleStrategy = data as SimpleStrategy;
      this.programId = simpleStrategy.programId;

      // SAMPLE ROW CODE
      const sampleRowCodeControl = this.form.get("sampleRowCode");
      sampleRowCodeControl.patchValue(simpleStrategy.label);

      // EOTP
      if (this.enableEotpFilter)
      {
        this.toggleFilteredItems('eotp');
      }
      const eotpControl = this.form.get("eotp");
      let eotp = simpleStrategy.analyticReference;
      let eotpValues = this._eotpSubject.getValue();
      let eotpObject = eotpValues.find(e => e.label && e.label === eotp);

      eotpControl.patchValue(eotpObject);

      // LABORATORIES
      const laboratoriesControl = this.laboratoriesForm;
      let strategyDepartments = simpleStrategy.strategyDepartments;
      let laboratories = strategyDepartments.map(strategyDepartment => { return strategyDepartment.department;
      });
      laboratoriesControl.patchValue(laboratories);

      // FISHING AREA
      const fishingAreaControl = this.fishingAreasForm;
      // applied_strategy.location_fk + program2location (zones en mer / configurables)
      let appliedStrategies = simpleStrategy.appliedStrategies;
      let fishingArea = appliedStrategies.map(appliedStrategy => { return appliedStrategy.location;
      });
      fishingAreaControl.patchValue(fishingArea);


      // TAXONS
      const taxonControl = this.form.get("taxonName");
      let taxonNameStrategy = (simpleStrategy.taxonNames || []).find(t => t.taxonName.id);
      if (taxonNameStrategy)
      {
        let taxon = taxonNameStrategy.taxonName;
        taxonControl.patchValue(taxon);
      }


      // YEAR
      //  Automatic binding

      // EFFORT
      const appliedStrategiesControl = this.form.get("appliedStrategies");


      // WEIGHT PMFMS
      const weightPmfmsControl = this.form.get("weightPmfmStrategies");
       let weightPmfmStrategy = (simpleStrategy.pmfmStrategies || []).filter(p => p.pmfm && p.pmfm.parameter && p.pmfm.parameter.label === 'WEIGHT');

      if (weightPmfmStrategy)
      {
        let weightPmfm = weightPmfmStrategy.map(pmfmStrategy =>  {return pmfmStrategy.pmfm;});
        //weightPmfmsControl.patchValue(weightPmfm);
        weightPmfmsControl.patchValue(weightPmfmStrategy);
      }

      // Size
      const sizePmfmsControl = this.form.get("sizePmfmStrategies");
      const sizeValues = ['LENGTH_PECTORAL_FORK', 'LENGTH_CLEITHRUM_KEEL_CURVE', 'LENGTH_PREPELVIC', 'LENGTH_FRONT_EYE_PREPELVIC', 'LENGTH_LM_FORK', 'LENGTH_PRE_SUPRA_CAUDAL', 'LENGTH_CLEITHRUM_KEEL', 'LENGTH_LM_FORK_CURVE', 'LENGTH_PECTORAL_FORK_CURVE', 'LENGTH_FORK_CURVE', 'STD_STRAIGTH_LENGTH', 'STD_CURVE_LENGTH', 'SEGMENT_LENGTH', 'LENGTH_MINIMUM_ALLOWED', 'LENGTH', 'LENGTH_TOTAL', 'LENGTH_STANDARD', 'LENGTH_PREANAL', 'LENGTH_PELVIC', 'LENGTH_CARAPACE', 'LENGTH_FORK', 'LENGTH_MANTLE'];
      let sizePmfmStrategy = (simpleStrategy.pmfmStrategies || []).filter(p => p.pmfm && p.pmfm.parameter && sizeValues.includes(p.pmfm.parameter.label));
      if (sizePmfmStrategy)
      {
        let sizePmfm = sizePmfmStrategy.map(pmfmStrategy =>  {return pmfmStrategy.pmfm;});
        sizePmfmsControl.patchValue(sizePmfm);
      }

      // SEX
      const sexControl = this.form.get("sex");
      let sexPmfmStrategy =  simpleStrategy.pmfmStrategies.filter(p => p.pmfm && p.pmfm.parameter && p.pmfm.parameter.label ===  "SEX");
      if (sexPmfmStrategy) {
            sexControl.patchValue(true);
        }
      else {
        sexControl.patchValue(false);
      }


      // MATURITY PMFMS
      const maturityPmfmsControl = this.form.get("maturityPmfmStrategies");
      const maturityValues = ['MATURITY_STAGE_3_VISUAL', 'MATURITY_STAGE_4_VISUAL', 'MATURITY_STAGE_5_VISUAL', 'MATURITY_STAGE_6_VISUAL', 'MATURITY_STAGE_7_VISUAL', 'MATURITY_STAGE_9_VISUAL'];
      let maturityPmfmStrategy = (simpleStrategy.pmfmStrategies || []).filter(p => p.pmfm && p.pmfm.parameter && maturityValues.includes(p.pmfm.parameter.label));
      if (maturityPmfmStrategy)
      {
        let maturityPmfm = maturityPmfmStrategy.map(pmfmStrategy =>  {return pmfmStrategy.pmfm;});
        maturityPmfmsControl.patchValue(maturityPmfm);
      }


      // AGE
      const ageControl = this.form.get("age");
      let agePmfmStrategy =  (simpleStrategy.pmfmStrategies || []).find(p => p.pmfm && p.pmfm.parameter && p.pmfm.parameter.label ===   "AGE");
      if (agePmfmStrategy) {
        ageControl.patchValue(true);
      }
      else {
        ageControl.patchValue(false);
      }


        // CALCIFIED TYPES
      const calcifiedTypesControl = this.form.get("calcifiedTypes");
      let calcifiedTypesPmfmStrategy = (simpleStrategy.pmfmStrategies || []).filter(p => p.fractionId && !p.pmfm);

      if (calcifiedTypesPmfmStrategy)
      {
        let calcifiedTypesFractionIds = calcifiedTypesPmfmStrategy.map(pmfmStrategy =>  {return pmfmStrategy.fractionId;});

        // Not initialiezd since loadCalcifiedTypes ares loaded asynchronously
        //this._calcifiedTypeSubject.getValue();
        // @ts-ignore
        //for (let item of this._calcifiedTypeSubject.asObservable())
        //{
        //  item.toString();
       // }
        //calcifiedTypesControl.patchValue(calcifiedTypesFractionId);
      }



    }
    console.debug(data.entityName);
  }

  // save button
  save(){
    console.log("save work");

    console.log(this.form.get("comments"));

    /* console.log("comment : "+this.form.get("comment").value);*/
  }

  cancel(){
    console.log("cancel works");
  }

  add(){
    console.log("add works");
  }

  close(){
    console.log("close works");
  }

  // fishingArea Helper -----------------------------------------------------------------------------------------------
  protected initFishingAreaHelper() {
    this.fishingAreaHelper = new FormArrayHelper<ReferentialRef>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'fishingAreas'),
      (fishingArea) => this.validatorService.getControl(fishingArea),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: false
      }
    );
    // Create at least one fishing Area
    if (this.fishingAreaHelper.size() === 0) {
      this.fishingAreaHelper.resize(1);
    }
  }
  addFishingArea() {
    this.fishingAreaHelper.add();
    if (!this.mobile) {
      this.fishingAreaFocusIndex = this.fishingAreaHelper.size() - 1;
    }
  }

  // Laboratory Helper -----------------------------------------------------------------------------------------------
  protected initLaboratoryHelper() {
    this.laboratoryHelper = new FormArrayHelper<ReferentialRef>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'laboratories'),
      (laboratory) => this.validatorService.getControl(laboratory),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: false
      }
    );
    // Create at least one laboratory
    if (this.laboratoryHelper.size() === 0) {
      this.laboratoryHelper.resize(1);
    }
  }
  addLaboratory() {
    this.laboratoryHelper.add();
    if (!this.mobile) {
      this.laboratoryFocusIndex = this.laboratoryHelper.size() - 1;
    }
  }
  // CalcifiedTypeHelper -----------------------------------------------------------------------------------------------

  protected initCalcifiedTypeHelper() {
    this.calcifiedTypeHelper = new FormArrayHelper<ReferentialRef>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'calcifiedTypes'),
      (calcifiedType) => this.validatorService.getControl(calcifiedType),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: false
      }
    );
    // Create at least one calcifiedType
    if (this.calcifiedTypeHelper.size() === 0) {
      this.calcifiedTypeHelper.resize(1);
    }
  }
  addCalcifiedType() {
    this.calcifiedTypeHelper.add();
    if (!this.mobile) {
      this.calcifiedTypeFocusIndex = this.calcifiedTypeHelper.size() - 1;
    }
  }

  // Calcified Type ---------------------------------------------------------------------------------------------
  protected async loadCalcifiedType() {
    const calcifiedTypeControl = this.form.get('calcifiedTypes');
    calcifiedTypeControl.enable();
    // Refresh filtred departments
    if (this.enableCalcifiedTypeFilter) {
      const allcalcifiedTypes = await this.loadFilteredCalcifiedTypesMethod();
      this._calcifiedTypeSubject.next(allcalcifiedTypes);
    } else {
      // TODO Refresh filtred departments
      const filtredCalcifiedTypes = await this.loadCalcifiedTypesMethod();
      this._calcifiedTypeSubject.next(filtredCalcifiedTypes);
    }
  }
  // Load CalcifiedTypes Service
  protected async loadCalcifiedTypesMethod(): Promise<ReferentialRef[]> {
    const res = await this.referentialRefService.loadAll(0, 200, null,null,
      {
        entityName: 'Fraction',
        searchAttribute: "description",
        searchText: "individu"
      });
    return res.data;
  }

  //TODO : Load filtred CalcifiedTypes Service : another service to implement
  protected async loadFilteredCalcifiedTypesMethod(): Promise<ReferentialRef[]> {
    const res = await this.referentialRefService.loadAll(0, 1, null,null,
      {
        entityName: 'Fraction',
        searchAttribute: "description",
        searchText: "individu"
      });
    return res.data;
  }
  // EOTP  ---------------------------------------------------------------------------------------------------

  protected  loadEotps() {
    const eotpAreaControl = this.form.get('eotp');
    eotpAreaControl.enable();

    if (this.enableEotpFilter) {
      // Refresh filtred eotp
      const eotps =  this.FiltredEotpList;
      this._eotpSubject.next(eotps);
    }
    else {
      // Refresh eotp
      const eotps =  this.eotpList;
      this._eotpSubject.next(eotps);
    }
  }

  protected markForCheck() {
    if (this.cd) this.cd.markForCheck();
  }

}
