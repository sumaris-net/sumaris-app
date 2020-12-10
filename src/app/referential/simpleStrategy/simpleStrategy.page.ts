import {ChangeDetectionStrategy, Component, Injector, Input, OnInit, ViewChild} from "@angular/core";
import {ValidatorService} from "@e-is/ngx-material-table";
import {FormBuilder, FormGroup} from "@angular/forms";
import {
  AppEntityEditor,
  EntityUtils,
  IReferentialRef,
  isNil,
  Referential,
  ReferentialRef
} from "../../core/core.module";
import {Program} from "../services/model/program.model";
import {AppliedStrategy, Strategy, StrategyDepartment, TaxonNameStrategy} from "../services/model/strategy.model";
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
import {TaxonNameRef} from "../services/model/taxon.model";
import {PmfmStrategy} from "../services/model/pmfm-strategy.model";
import {Pmfm} from "../services/model/pmfm.model";


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
    protected activatedRoute : ActivatedRoute
  ) {
    super(injector,
      Strategy,
      dataService);
    this.form = validatorService.getFormGroup();
    // default values
    this.defaultBackHref = "/referential?entity=Program";
    //this.defaultBackHref = "/referential/program/10?tab=2"; =>TODO : remplace 10 by id row
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

    //Sample row code
    data.label =  this.planificationForm.form.get("label").value;
    data.name = this.planificationForm.form.get("label").value;
    //statusId
    data.statusId=1;

    //eotp
    data.analyticReference=this.planificationForm.form.get("analyticReference").value.label;

    //comments
    data.description = this.planificationForm.form.get("description").value;


   // get Id program from route
    console.log("programId : " + this.activatedRoute.snapshot.paramMap.get('id'));

    //get Laboratories -------------------------------------------------------------------------------------------------

    let laboratories =  this.planificationForm.laboratoriesForm.value;
    let strategyDepartment: StrategyDepartment = new StrategyDepartment();
    let strategyDepartments: StrategyDepartment [] =[];


    if(laboratories){

      let observer : IReferentialRef = new ReferentialRef();
      observer.id =2;
      observer.label ="Observer";
      observer.name ="Observer privilege";
      observer.statusId =1;
      observer.entityName ="ProgramPrivilege";


      strategyDepartments   = laboratories.map(lab => ({
        strategyId : data.id,
        location : null,
        privilege :observer, //FIXME : get observer from referential ?
        department : lab
      })) ;

     // const result = strategyDepartments as StrategyDepartment [];
      data.strategyDepartments = strategyDepartments;
    }

    //TaxonNames -------------------------------------------------------------------------------------------------------

    let taxonNameStrategy =  this.planificationForm.taxonNamesForm.value;
    let taxonName: TaxonNameStrategy = new TaxonNameStrategy();
    let taxonNameStrategies: TaxonNameStrategy [] =[];

    if(taxonNameStrategy){
      taxonName.strategyId= data.id;
      taxonName.priorityLevel=null;
      taxonName.taxonName=taxonNameStrategy[0];
      //set reference TaxonId
      taxonName.taxonName.referenceTaxonId = taxonName.taxonName.id;
      taxonNameStrategies.push(taxonName);
      data.taxonNames =taxonNameStrategies;
    }

    //Fishig Area ----------------------------------------------------------------------------------------------------

    let fishingArea = this.planificationForm.fishingAreasForm.value;
    let fishingAreas : AppliedStrategy [] = [];

    if (fishingArea) {
      fishingAreas = fishingArea.map(fish => ({
          strategyId: data.id,
          location: fish,
          appliedPeriods: null //FIXME : get appliedPeriods ?
        })
      );

      //const result = fishingAreas as AppliedStrategy [];
      data.appliedStrategies = fishingAreas;
    }



    //PSFM ---------------------------------------------------------------------------------------------------



    //calcified type
    let calcifiedType = this.planificationForm.calcifiedTypesForm.value;
    let calcifiedTypes : PmfmStrategy [] = [];


    if (calcifiedType) {
       calcifiedTypes = calcifiedType.map(cal => ({
         strategyId : data.id,
         pmfm : null,
         fractionId : cal.id,
         qualitativeValue : undefined,
         acquisitionLevel :'SAMPLE',
         acquisitionNumber : 1,
         isMandatory : false,
         rankOrder : 1 //FIXME
        })
      );

     // const result = calcifiedTypes as PmfmStrategy [];
      data.pmfmStrategies = calcifiedTypes;
    }





    //age
    // sex
    // matirity
    //WEIGHT
    //Size
    //efforts




    return data
  }

}

