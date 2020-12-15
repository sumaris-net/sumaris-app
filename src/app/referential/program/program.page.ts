import {ChangeDetectionStrategy, Component, Injector, OnInit, ViewChild, OnDestroy, ComponentFactoryResolver} from "@angular/core";
import {TableElement, ValidatorService} from "@e-is/ngx-material-table";
import {AbstractControl, FormBuilder, FormGroup} from "@angular/forms";
import {AppEntityEditor, EntityUtils, isNil} from "../../core/core.module";
import {Program} from "../services/model/program.model";
import {Strategy} from "../services/model/strategy.model";
import {ProgramService} from "../services/program.service";
import {ReferentialForm} from "../form/referential.form";
import {ProgramValidatorService} from "../services/validator/program.validator";
import {StrategiesTable} from "../strategy/strategies.table";
import {SimpleStrategiesTable} from "../simpleStrategy/simpleStrategies/simpleStrategies.table";
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
import {ProgramProperties} from "../services/config/program.config";
import {ActivatedRoute} from "@angular/router";


export enum AnimationState {
  ENTER = 'enter',
  LEAVE = 'leave'
}

@Component({
  selector: 'app-program',
  templateUrl: 'program.page.html',
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
export class ProgramPage extends AppEntityEditor<Program, ProgramService> implements OnInit {

  propertyDefinitions = Object.getOwnPropertyNames(ProgramProperties).map(name => ProgramProperties[name]);
  fieldDefinitions: FormFieldDefinitionMap = {};
  form: FormGroup;
  i18nFieldPrefix = 'PROGRAM.';
  strategyFormState: AnimationState;
  detailsPathSimpleStrategy = "/referential/simpleStrategy/:id"
  simpleStrategiesOption = false;

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;
  @ViewChild('propertiesForm', { static: true }) propertiesForm: AppPropertiesForm;
  @ViewChild('simpleStrategiesTable', { static: true }) simpleStrategiesTable: SimpleStrategiesTable;
  @ViewChild('strategiesTable', { static: true }) strategiesTable: StrategiesTable;
  @ViewChild('strategyForm', { static: true }) strategyForm: StrategyForm;

  constructor(
    protected injector: Injector,
    protected formBuilder: FormBuilder,
    protected accountService: AccountService,
    protected validatorService: ProgramValidatorService,
    dataService: ProgramService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
    protected activatedRoute : ActivatedRoute
  ) {
    super(injector,
      Program,
      dataService);
    this.form = validatorService.getFormGroup();

    // default values
    this._enabled = this.accountService.isAdmin();
    this.tabCount = 4;

    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();
    console.log("programId : " + this.activatedRoute.snapshot.paramMap.get('id'));

    // update simpleStrategiesOption when UpdateView
    this.onUpdateView
      .subscribe(async option => {
        this.simpleStrategiesOption=  option.getPropertyAsBoolean(ProgramProperties.SIMPLE_STRATEGIES);
        this.markForCheck();
      }
  );

    this.registerSubscription(this.simpleStrategiesTable.onOpenRow
      .subscribe(row => this.onOpenSimpleStrategy(row)));
    this.registerSubscription(this.simpleStrategiesTable.onNewRow
      .subscribe((event) => this.addSimpleStrategy(event)));
    this.registerSubscription(this.strategiesTable.onStartEditingRow
        .subscribe(row => this.onStartEditStrategy(row)));
    this.registerSubscription(this.strategiesTable.onConfirmEditCreateRow
        .subscribe(row => this.onConfirmEditCreateStrategy(row)));
    this.registerSubscription(this.strategiesTable.onCancelOrDeleteRow
        .subscribe(row => this.onCancelOrDeleteStrategy(row)));


    // Set entity name (required for referential form validator)
    this.referentialForm.entityName = 'Program';

    // Check label is unique
    this.form.get('label')
      .setAsyncValidators(async (control: AbstractControl) => {
        const label = control.enabled && control.value;
        return label && (await this.service.existsByLabel(label)) ? {unique: true} : null;
      });

    this.registerFormField('gearClassification', {
      type: 'entity',
      autocomplete: {
        suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
        filter: {
          entityName: 'GearClassification'
        }
      }
    });

    this.registerFormField('taxonGroupType', {
      key: 'taxonGroupType',
      type: 'entity',
      autocomplete: {
        suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
        filter: {
          entityName: 'TaxonGroupType'
        }
      }
    });

  }

  /* -- protected methods -- */

  async load(id?: number, opts?: EntityServiceLoadOptions): Promise<void> {
    // Force the load from network
    return super.load(id, {...opts, fetchPolicy: "network-only"});
  }

  protected registerFormField(fieldName: string, def: Partial<FormFieldDefinition>) {
    const definition = <FormFieldDefinition>{
      key: fieldName,
      label: this.i18nFieldPrefix + changeCaseToUnderscore(fieldName).toUpperCase(),
      ...def
    }
    this.fieldDefinitions[fieldName] = definition;
  }

  protected canUserWrite(data: Program): boolean {
    // TODO : check user is in program managers
    return (this.isNewData && this.accountService.isAdmin())
      || (ReferentialUtils.isNotEmpty(data) && this.accountService.isSupervisor());

  }

  enable() {
    super.enable();

    if (!this.isNewData) {
      this.form.get('label').disable();
    }
  }

  protected registerForms() {
    this.addChildForms([
      this.referentialForm,
      this.propertiesForm,
      this.simpleStrategiesTable,
      this.strategiesTable
    ]);
}

  protected setValue(data: Program) {
    if (!data) return; // Skip

    this.form.patchValue({...data, properties: [], strategies: []}, {emitEvent: false});
    this.propertiesForm.value = EntityUtils.getObjectAsArray(data.properties);

    // simples strategies
    this.simpleStrategiesTable.value = data.strategies && data.strategies.slice() || []; // force update

    // strategies
    this.strategiesTable.value = data.strategies && data.strategies.slice() || []; // force update

    this.markForCheck();
  }

  protected async getJsonValueToSave(): Promise<any> {
    const data = await super.getJsonValueToSave();

    // Re add label, because missing when field disable
    data.label = this.form.get('label').value;
    data.properties = this.propertiesForm.value;

    // Finish edition of simple strategies
    if(this.simpleStrategiesOption){
    if (this.simpleStrategiesTable.dirty) {
      if (this.simpleStrategiesTable.editedRow) {
        await this.onConfirmEditCreateStrategy(this.simpleStrategiesTable.editedRow);
      }
      await this.simpleStrategiesTable.save();
    }
    data.strategies = this.simpleStrategiesTable.value;
  }

  // Finish edition of strategy
  if(!this.simpleStrategiesOption){
    if (this.strategiesTable.dirty) {

      if (this.strategiesTable.editedRow) {

        await this.onConfirmEditCreateStrategy(this.strategiesTable.editedRow);
      }
      await this.strategiesTable.save();
    }
    data.strategies = this.strategiesTable.value;
  }

    return data;
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
    if (this.referentialForm.invalid) return 0;
    if (this.propertiesForm.invalid) return 1;
    if (this.strategiesTable.invalid || this.strategyForm.enabled && this.strategyForm.invalid) return 2;
        return 0;
  }


  async onOpenSimpleStrategy(row: TableElement<Strategy>){
    const savedOrContinue = await this.saveIfDirtyAndConfirm();
    if (savedOrContinue) {
      this.loading = true;
      try {
        await this.router.navigateByUrl(`/referential/simpleStrategy/${row.id}`);
      }
      finally {
        this.loading = false;
      }
    }
  }

  async  addSimpleStrategy(event?: any) {
    const savePromise: Promise<boolean> = this.isOnFieldMode && this.dirty
      // If on field mode: try to save silently
      ? this.save(event)
      // If desktop mode: ask before save
      : this.saveIfDirtyAndConfirm();

    const savedOrContinue = await savePromise;
    if (savedOrContinue) {
      this.loading = true;
      this.markForCheck();
      try {
        await this.router.navigateByUrl('/referential/simpleStrategy/new');
      }
      finally {
        this.loading = false;
        this.markForCheck();
      }
    }
  }


  protected async onStartEditStrategy(row: TableElement<Strategy>) {

    if (!row) return; // skip

    const strategy = this.loadOrCreateStrategy(row.currentData);
    console.debug("[program] Start editing strategy", strategy);

    if (!row.isValid()) {
      row.validator.valueChanges
        .pipe(
          debounceTime(450),
          filter(() => row.isValid()),
          first()
        )
        .subscribe(() => {
          strategy.fromObject(row.currentData);
          this.showStrategyForm(strategy);
        });
    }
    else {


      this.showStrategyForm(strategy);
    }
  }
  protected async onCancelOrDeleteStrategy(row: TableElement<Strategy>) {
    if (!row) return; // skip

    this.hideStrategyForm();
  }

  protected async onConfirmEditCreateStrategy(row: TableElement<Strategy>) {
    if (!row) return; // skip

    // DEBUG
    console.debug('[program] Confirm edit/create of a strategy row', row);

    // Copy some properties from row
    const source = row.currentData;
    this.strategyForm.form.patchValue({
      label: source.label,
      name: source.name,
      description: source.description,
      statusId: source.statusId,
      comments: source.comments
    });

    let target = await this.strategyForm.saveAndGetDataIfValid();
    if (!target) throw new Error('strategyForm has error');

    // Update the row
    row.validator = this.strategyForm.form;

    console.debug("[program] End editing strategy", row.currentData);

    this.hideStrategyForm();
  }

  showStrategyForm(strategy: Strategy) {
    this.strategyForm.program = this.data;
    this.strategyForm.updateView(strategy);

    if (this.strategyFormState !== AnimationState.ENTER) {
      // Wait 200ms, during form loading, then start animation
      setTimeout(() => {
        this.strategyFormState = AnimationState.ENTER;
        this.markForCheck();
      }, 200);
    }
  }

  hideStrategyForm() {
    if (this.strategyFormState == AnimationState.ENTER) {
      this.strategyFormState = AnimationState.LEAVE;
      this.markForCheck();
    }
  }

  onStrategyAnimationDone(event: AnimationEvent): void {
    if (event.phaseName === 'done') {

      // After enter
      if (event.toState === AnimationState.ENTER) {
        // Enable form
        this.strategyForm.enable();
      }

      // After leave
      else if (event.toState === AnimationState.LEAVE) {

        // Disable form
        this.strategyForm.disable({emitEvent: false});
      }
    }
  }

  protected loadOrCreateStrategy(json: any): Strategy|undefined {
    const existingStrategy = this.data.strategies.find(s => s.equals(json));
    if (existingStrategy) return existingStrategy;
    return Strategy.fromObject(json);
  }

  protected updateStrategy(strategy: Strategy) {

    const existingStrategy = this.data.strategies.find(s => s.equals(strategy));
    if (!existingStrategy) {
      this.data.strategies.push(strategy);
      return strategy;
    }
    else {
      // Copy
      existingStrategy.fromObject(strategy);
      return existingStrategy;
    }

  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

}
