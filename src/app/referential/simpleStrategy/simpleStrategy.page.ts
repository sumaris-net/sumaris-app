import {ChangeDetectionStrategy, Component, Injector, OnInit, ViewChild} from "@angular/core";
import {TableElement, ValidatorService} from "@e-is/ngx-material-table";
import {AbstractControl, FormBuilder, FormGroup} from "@angular/forms";
import {AppEntityEditor, EntityUtils, isNil} from "../../core/core.module";
import {Program} from "../services/model/program.model";
import {Strategy} from "../services/model/strategy.model";
import {ProgramService} from "../services/program.service";
import {SimpleStrategyForm} from "../simpleStrategy/form/simpleStrategy.form";
import {ProgramValidatorService} from "../services/validator/program.validator";
import {StrategiesTable} from "../strategy/strategies.table";
import {changeCaseToUnderscore, EntityServiceLoadOptions, fadeInOutAnimation} from "../../shared/shared.module";
import {AccountService} from "../../core/services/account.service";
import {ReferentialUtils} from "../../core/services/model/referential.model";
import {AppPropertiesForm} from "../../core/form/properties.form";
import {ReferentialRefService} from "../services/referential-ref.service";
import {ModalController} from "@ionic/angular";
import {FormFieldDefinition, FormFieldDefinitionMap} from "../../shared/form/field.model";
import {StrategyForm} from "../strategy/strategy.form";
import {animate, AnimationEvent, state, style, transition, trigger} from "@angular/animations";
import {debounceTime, filter, first} from "rxjs/operators";
import {AppFormHolder} from "../../core/form/form.utils";
import {ProgramProperties} from "../services/config/program.config";


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
export class SimpleStrategyPage extends AppEntityEditor<Program, ProgramService> implements OnInit {

  propertyDefinitions = Object.getOwnPropertyNames(ProgramProperties).map(name => ProgramProperties[name]);
  fieldDefinitions: FormFieldDefinitionMap = {};
  form: FormGroup;
  i18nFieldPrefix = 'PROGRAM.';
  strategyFormState: AnimationState;

  @ViewChild('simpleStrategyForm', { static: true }) simpleStrategyForm: SimpleStrategyForm;


  constructor(
    protected injector: Injector,
    protected formBuilder: FormBuilder,
    protected accountService: AccountService,
    protected validatorService: ProgramValidatorService,
    dataService: ProgramService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController
  ) {
    super(injector,
      Program,
      dataService);
    this.form = validatorService.getFormGroup();
    // default values
    this.defaultBackHref = "/referential?entity=Program";
    this._enabled = this.accountService.isAdmin();
    this.tabCount = 4;

  }

  ngOnInit() {
 //  super.ngOnInit();

    // Set entity name (required for referential form validator)
    this.simpleStrategyForm.entityName = 'Program';


   }

   protected canUserWrite(data: Program): boolean {
    // TODO : check user is in program managers
    return (this.isNewData && this.accountService.isAdmin())
      || (ReferentialUtils.isNotEmpty(data) && this.accountService.isSupervisor());

  }

  protected computeTitle(data: Program): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return this.translate.get('PROGRAM.NEW.TITLE').toPromise();
    }

    // Existing data
    return this.translate.get('PROGRAM.EDIT.TITLE', data).toPromise();
  }


  protected getFirstInvalidTabIndex(): number {
    if (this.simpleStrategyForm.invalid) return 0;
   // TODO
    return 0;
  }

  protected registerForms() {
    this.addChildForms([
      this.simpleStrategyForm
       // TODO
    ]);
  }

  protected setValue(data: Program) {
    if (!data) return; // Skip

    this.form.patchValue({...data, properties: [], strategies: []}, {emitEvent: false});
    // TODO
    this.markAsPristine();
  }

}

