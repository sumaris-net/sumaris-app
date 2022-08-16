import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { AbstractControl, FormGroup } from '@angular/forms';
import { ReferentialForm } from '../form/referential.form';
import { ParameterValidatorService } from '../services/validator/parameter.validator';
import {
  AccountService,
  AppEntityEditor,
  EntityServiceLoadOptions,
  fadeInOutAnimation,
  FormFieldDefinitionMap,
  HistoryPageReference,
  isNil,
  referentialToString,
  ReferentialUtils,
} from '@sumaris-net/ngx-components';
import { Parameter } from '../services/model/parameter.model';
import { ParameterService } from '../services/parameter.service';
import { ReferentialRefService } from '../services/referential-ref.service';
import { environment } from '../../../environments/environment';
import { SimpleReferentialTable } from '../list/referential-simple.table';

@Component({
  selector: 'app-parameter',
  templateUrl: 'parameter.page.html',
  providers: [
    {provide: ValidatorService, useExisting: ParameterValidatorService}
  ],
  animations: [fadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParameterPage extends AppEntityEditor<Parameter> {

  canEdit: boolean;
  form: FormGroup;
  fieldDefinitions: FormFieldDefinitionMap;

  get type(): string {
    return this.form.controls.type.value;
  }

  get isQualitative(): boolean {
    return this.type === 'qualitative_value';
  }

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;
  @ViewChild('qualitativeValuesTable', { static: true }) qualitativeValuesTable: SimpleReferentialTable;

  constructor(
    protected injector: Injector,
    protected accountService: AccountService,
    protected validatorService: ParameterValidatorService,
    protected parameterService: ParameterService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(injector,
      Parameter,
      parameterService,
      {
        tabCount: 1
      });
    this.form = validatorService.getFormGroup();

    // default values
    this.defaultBackHref = "/referential/parameter";
    this.canEdit = this.accountService.isAdmin();
    this.tabCount = 2;

    this.debug = !environment.production;

    this.fieldDefinitions = {
      type: {
        key: `type`,
        label: `REFERENTIAL.PARAMETER.TYPE`,
        type: 'enum',
        required: true,
        values: ['double', 'string', 'qualitative_value', 'date', 'boolean']
          .map(key => {
            return {key, value: ('REFERENTIAL.PARAMETER.TYPE_ENUM.' + key.toUpperCase()) };
          })
      }
    };
  }
  ngOnInit() {
    super.ngOnInit();

    // Set entity name (required for referential form validator)
    this.referentialForm.entityName = 'Parameter';

    // Check label is unique
    this.form.get('label')
      .setAsyncValidators(async (control: AbstractControl) => {
        const label = control.enabled && control.value;
        return label && (await this.parameterService.existsByLabel(label, {excludedId: this.data && this.data.id})) ?
          {unique: true} : null;
      });

    this.markAsReady();
  }

  /* -- protected methods -- */

  async updateView(data: Parameter | null, opts?: { emitEvent?: boolean; openTabIndex?: number; updateRoute?: boolean }) {
    await super.updateView(data, opts);

    this.tabCount = this.isQualitative ? 2 : 1;
  }


  enable() {
    super.enable();

    if (!this.isNewData) {
      this.form.get('label').disable();
    }
  }

  protected registerForms() {
    this.addChildForms([this.qualitativeValuesTable, this.referentialForm]);
  }

  protected setValue(data: Parameter) {
    if (!data) return; // Skip

    const json = data.asObject();
    json.qualitativeValues = json.qualitativeValues || []; // Make sure to it array

    this.form.patchValue(json, {emitEvent: false});

    // QualitativeValues
    this.qualitativeValuesTable.value = data.qualitativeValues && data.qualitativeValues.slice() || []; // force update

    this.markAsPristine();
  }

  protected async getValue(): Promise<Parameter> {
    const data = await super.getValue();

    // Re add label, because missing when field disable
    data.label = this.form.get('label').value;
    data.label = data.label && data.label.toUpperCase();

    await this.qualitativeValuesTable.save();
    data.qualitativeValues = this.qualitativeValuesTable.value;

    return data;
  }

  protected computeTitle(data: Parameter): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return this.translate.get('REFERENTIAL.PARAMETER.NEW.TITLE').toPromise();
    }

    // Existing data
    return this.translate.get('REFERENTIAL.PARAMETER.EDIT.TITLE', data).toPromise();
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      title: `${this.data.label} - ${this.data.name}`,
      subtitle: 'REFERENTIAL.ENTITY.PARAMETER',
      icon: 'list'
    };
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.referentialForm.invalid) return 0;
    if (this.isQualitative && this.qualitativeValuesTable.invalid) return 1;
    return -1;
  }

  protected async onEntityLoaded(data: Parameter, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onEntityLoaded(data, options);

    this.canEdit = this.canUserWrite(data);
  }

  referentialToString = referentialToString;

  protected markForCheck() {
    this.cd.markForCheck();
  }

}

