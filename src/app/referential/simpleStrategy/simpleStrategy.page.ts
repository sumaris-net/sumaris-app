import {ChangeDetectionStrategy, Component, Injector, Input, OnInit, ViewChild} from "@angular/core";
import {ValidatorService} from "@e-is/ngx-material-table";
import {FormBuilder, FormGroup} from "@angular/forms";
import {
  AppEntityEditor, IReferentialRef,
  isNil, ReferentialRef,
} from "../../core/core.module";
import {
  AppliedPeriod,
  AppliedStrategy,
  Strategy,
  TaxonNameStrategy
} from "../services/model/strategy.model";
import {ProgramValidatorService} from "../services/validator/program.validator";
import {
  fadeInOutAnimation
} from "../../shared/shared.module";
import {AccountService} from "../../core/services/account.service";
import {ReferentialUtils} from "../../core/services/model/referential.model";
import {ReferentialRefService} from "../services/referential-ref.service";
import {ModalController} from "@ionic/angular";
import {FormFieldDefinitionMap} from "../../shared/form/field.model";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {ProgramProperties} from "../services/config/program.config";
import {StrategyService} from "../services/strategy.service";
import {PlanificationForm} from "../planification/planification.form";
import {ActivatedRoute} from "@angular/router";
import {PmfmStrategy} from "../services/model/pmfm-strategy.model";
import * as moment from 'moment'
import {PmfmService} from "../services/pmfm.service";

export enum AnimationState {
  ENTER = 'enter',
  LEAVE = 'leave'
}

@Component({
  selector: 'app-simpleStrategy',
  templateUrl: 'simpleStrategy.page.html',
  providers: [
    {provide: ValidatorService, useExisting: ProgramValidatorService}
  ],
  animations: [fadeInOutAnimation,
    // Fade in
    trigger('fadeIn', [
      state('*', style({opacity: 0, display: 'none', visibility: 'hidden'})),
      state(AnimationState.ENTER, style({opacity: 1, display: 'inherit', visibility: 'inherit'})),
      state(AnimationState.LEAVE, style({opacity: 0, display: 'none', visibility: 'hidden'})),
      // Modal
      transition(`* => ${AnimationState.ENTER}`, [
        style({display: 'inherit',  visibility: 'inherit', transform: 'translateX(50%)'}),
        animate('0.4s ease-out', style({opacity: 1, transform: 'translateX(0)'}))
      ]),
      transition(`${AnimationState.ENTER} => ${AnimationState.LEAVE}`, [
        animate('0.2s ease-out', style({opacity: 0, transform: 'translateX(50%)'})),
        style({display: 'none',  visibility: 'hidden'})
      ]) ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleStrategyPage extends AppEntityEditor<Strategy, StrategyService> implements OnInit {

  propertyDefinitions = Object.getOwnPropertyNames(ProgramProperties).map(name => ProgramProperties[name]);
  fieldDefinitions: FormFieldDefinitionMap = {};
  form: FormGroup;
  i18nFieldPrefix = 'PROGRAM.';
  strategyFormState: AnimationState;

  @ViewChild('planificationForm', { static: true }) planificationForm: PlanificationForm;


  constructor(
    protected injector: Injector,
    protected formBuilder: FormBuilder,
    protected accountService: AccountService,
    protected validatorService: ProgramValidatorService,
    dataService: StrategyService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
    protected activatedRoute : ActivatedRoute,
    protected pmfmService: PmfmService,

  ) {
    super(injector,
      Strategy,
      dataService);
    this.form = validatorService.getFormGroup();
    // default values
    this.defaultBackHref = "/referential?entity=Program";
    this._enabled = this.accountService.isAdmin();
    this.tabCount = 4;

  }

  ngOnInit() {
    //  Call editor routing
  super.ngOnInit();
    // Set entity name (required for referential form validator)
    this.planificationForm.entityName = 'planificationForm';

   }

   protected canUserWrite(data: Strategy): boolean {
    // TODO : check user is in program managers
    return (this.isNewData && this.accountService.isAdmin())
      || (ReferentialUtils.isNotEmpty(data) && this.accountService.isSupervisor());

  }

  protected computeTitle(data: Strategy): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return this.translate.get('PROGRAM.NEW.TITLE').toPromise();
    }

    // Existing data
    return this.translate.get('PROGRAM.EDIT.TITLE', data).toPromise();
  }


  protected getFirstInvalidTabIndex(): number {
    if (this.planificationForm.invalid) return 0;
   // TODO
    return 0;
  }

  protected registerForms() {
    this.addChildForms([
      this.planificationForm
    ]);
  }

  updateView(data: Strategy | null, opts?: { emitEvent?: boolean; openTabIndex?: number; updateRoute?: boolean }) {
    super.updateView(data, opts);

    //if (this.isNewData && this.showBatchTables && isNotEmptyArray(this.batchTree.defaultTaxonGroups)) {
    //  this.batchTree.autoFill();
    //}
  }

  //protected setValue(data: Strategy) {
  protected setValue(data: Strategy, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {

      if (!data) return; // Skip

    this.form.patchValue({...data, properties: [], strategies: []}, {emitEvent: false});

    /*this.simpleStrategyForm.value = data;
    //this.simpleStrategyForm.program = 40;*/
    //this.simpleStrategyForm.statusList =
   /* this.simpleStrategyForm.entityName= 'strategy';*/


    this.planificationForm.value = data;
    //this.simpleStrategyForm.program = 40;
    //this.simpleStrategyForm.statusList =
    //this.planificationForm.entityName= 'strategy';


    // Make sure to set entityName if set from Input()
    /*const entityNameControl = this.form.get('entityName');
    if (entityNameControl && this.entityName && entityNameControl.value !== this.entityName) {
      entityNameControl.setValue(this.entityName);
    }*/
    // Propagate value to planification form when automatic binding isn't set in super.setValue()
   // this.planificationForm.entityName= 'strategy';
    this.planificationForm.setValueSimpleStrategy(data, opts);


    this.markAsPristine();
  }



  protected async getJsonValueToSave(): Promise<Strategy> {

    const data = await super.getJsonValueToSave();
    // TODO : get programId
    data.programId=40;


    console.log(data);

    //Sample row code
    data.label =  this.planificationForm.form.get("label").value;
    data.name = this.planificationForm.form.get("label").value;
    data.statusId=1;

    //eotp
    if(this.planificationForm.form.get("analyticReference").value){
      data.analyticReference=this.planificationForm.form.get("analyticReference").value.label;
    }

    //comments
    data.description = this.planificationForm.form.get("description").value;

    // get Id program from route ?
    console.log("programId : " + this.activatedRoute.snapshot.paramMap.get('id'));

    //get creationDate -------------------------------------------------------------------------------------------------
    let creationDate = this.planificationForm.form.get("creationDate").value;
    let year = new Date(creationDate).getFullYear();

    //get Laboratories -------------------------------------------------------------------------------------------------

    let laboratories =  this.planificationForm.strategyDepartmentFormArray.value;

    if(laboratories){
       // FIXME
      let observer : ReferentialRef = new ReferentialRef();
      observer.id =2;
      observer.label ="Observer";
      observer.name ="Observer privilege";
      observer.statusId =1;
      observer.entityName ="ProgramPrivilege";



      // set strategyId and provilege
      for( let i =0;i <laboratories.length; i++){
        laboratories[i].strategyId = data.id;
        laboratories[i].privilege= observer;
      }
      data.strategyDepartments = laboratories;
    }

    //TaxonNames -------------------------------------------------------------------------------------------------------
    let taxonNameStrategy =  this.planificationForm.taxonNamesForm.value;
    let taxonName: TaxonNameStrategy = new TaxonNameStrategy();
    let taxonNameStrategies: TaxonNameStrategy [] =[];

    if(taxonNameStrategy){
      taxonName.strategyId= data.id;
      taxonName.priorityLevel=null;
      taxonName.taxonName=taxonNameStrategy[0];
      taxonName.taxonName.referenceTaxonId = taxonName.taxonName.id;
      taxonNameStrategies.push(taxonName);

      data.taxonNames =taxonNameStrategies;
    }

    //Fishig Area + Efforts --------------------------------------------------------------------------------------------
    let fishingArea = this.planificationForm.fishingAreasForm.value;
    let fishingAreas : AppliedStrategy [] = [];
    let appliedPeriods: AppliedPeriod[] = [];
    let fishingAreasResult : AppliedStrategy [] = [];

    if (fishingArea) {
      // get quarters
      for(let i =0; i< 4;i++){
        let appliedPeriod: AppliedPeriod = new AppliedPeriod();
        appliedPeriod.appliedStrategyId =data.id;
        appliedPeriod.acquisitionNumber =fishingArea[i];

        //quarter 1
        if(i == 0){
          appliedPeriod.startDate = moment(year+"-01-01");
          appliedPeriod.endDate = moment(year+"-03-31");
        }

        //quarter 2
        if(i == 1){
          appliedPeriod.startDate =moment(year+"-04-01");
          appliedPeriod.endDate = moment(year+"-06-30");
        }

        //quarter 3
        if(i == 2){
          appliedPeriod.startDate = moment(year+"-07-01");
          appliedPeriod.endDate = moment(year+"-09-30");
        }

        //quarter 4
        if(i == 3){
          appliedPeriod.startDate = moment(year+"-10-01");
          appliedPeriod.endDate = moment(year+"-12-31");
        }

        //push only when acquisitionNumber is not null
        if(fishingArea[i] !== null){
          appliedPeriods.push(appliedPeriod);
        }
      }

      fishingAreas = fishingArea.map(fish => ({
          strategyId: data.id,
          location: fish,
          appliedPeriods: null
        })
      );


      // i = 0 => effort quarter 1
      // i = 1 => effort quarter 2
      // i = 2 => effort quarter 3
      // i = 3 => effort quarter 4
      // set fishing areas
      fishingAreasResult = fishingAreas.slice(4);
      // put effort on first fishing area
      fishingAreasResult[0].appliedPeriods = appliedPeriods;

      data.appliedStrategies = fishingAreasResult;
    }



    //PMFM + Fractions -------------------------------------------------------------------------------------------------
    let pmfmStrategie = this.planificationForm.pmfmStrategiesForm.value;
    let pmfmStrategies : PmfmStrategy [] = [];

    let sex = pmfmStrategie[0];
    let age = pmfmStrategie[1];

    // i == 0 age
    // i == 1 sex

    let lengthList = pmfmStrategie[2];
    let sizeList = pmfmStrategie[3];
    let maturityList = pmfmStrategie[4];

    for( let  i =0; i<lengthList.length;i++){
      pmfmStrategies.push(lengthList[i]);
    }
    for( let  i =0; i<sizeList.length;i++){
      pmfmStrategies.push(sizeList[i]);
    }
    for( let  i =0; i<maturityList.length;i++){
      pmfmStrategies.push(maturityList[i]);
    }


    for( let i = 0; i < pmfmStrategie.length; i++){
      // fractions
      if(i > 4) {
        let calcifiedTypes : PmfmStrategy = new PmfmStrategy();
        calcifiedTypes.strategyId = data.id;
        calcifiedTypes.pmfm = null;
        calcifiedTypes.fractionId = pmfmStrategie[i].id;
        calcifiedTypes.qualitativeValues =undefined;
        calcifiedTypes.acquisitionLevel='SAMPLE'
        calcifiedTypes.acquisitionNumber=1;
        calcifiedTypes.isMandatory = false;
        calcifiedTypes.rankOrder = 1;

        pmfmStrategies.push(calcifiedTypes);
      }
    }

    if(sex){
      let pmfmStrategySex : PmfmStrategy = new PmfmStrategy();
      let pmfmSex = await this.getPmfms("SEX");

      pmfmStrategySex.strategyId = data.id;
      pmfmStrategySex.pmfm = pmfmSex[0];
      pmfmStrategySex.fractionId = null;
      pmfmStrategySex.qualitativeValues =undefined;
      pmfmStrategySex.acquisitionLevel='SAMPLE'
      pmfmStrategySex.acquisitionNumber=1;
      pmfmStrategySex.isMandatory = false;
      pmfmStrategySex.rankOrder = 1;

      pmfmStrategies.push(pmfmStrategySex);
    }
    if(age){
      let pmfmStrategyAge : PmfmStrategy = new PmfmStrategy();
      let pmfmAge = await this.getPmfms("AGE");

      pmfmStrategyAge.strategyId = data.id;
      pmfmStrategyAge.pmfm = pmfmAge[0];
      pmfmStrategyAge.fractionId = null;
      pmfmStrategyAge.qualitativeValues =undefined;
      pmfmStrategyAge.acquisitionLevel='SAMPLE'
      pmfmStrategyAge.acquisitionNumber=1;
      pmfmStrategyAge.isMandatory = false;
      pmfmStrategyAge.rankOrder = 1;

      pmfmStrategies.push(pmfmStrategyAge);

    }
    data.pmfmStrategies= pmfmStrategies;
  //--------------------------------------------------------------------------------------------------------------------

    return data;
  }


  /**
   * get pmfm
   * @param label
   * @protected
   */
   protected async getPmfms(label : string){
     const res = await this.pmfmService.loadAll(0, 1000, null, null, {
         entityName: 'Pmfm',
         levelLabels: [label]
         // searchJoin: "Parameter" is implied in pod filter
       },
       {
         withTotal: false,
         withDetails: true
       });
     return res.data;
   }

}

