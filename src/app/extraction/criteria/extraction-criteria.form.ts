import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {TranslateService} from '@ngx-translate/core';
import {BehaviorSubject, Observable} from 'rxjs';
import { firstNotNilPromise, isNil, isNotEmptyArray, isNotNil, sleep, toBoolean } from '@sumaris-net/ngx-components';
import {CriterionOperator, ExtractionColumn, ExtractionFilterCriterion, ExtractionType} from "../type/extraction-type.model";
import {ExtractionService} from "../common/extraction.service";
import {AbstractControl, FormArray, FormBuilder, FormGroup} from "@angular/forms";
import {filter, map} from "rxjs/operators";
import {DateAdapter} from "@angular/material/core";
import {Moment} from "moment";
import {ExtractionCriteriaValidatorService} from "./extraction-criterion.validator";
import {FormFieldDefinition, FormFieldType} from "@sumaris-net/ngx-components";
import {AccountService}  from "@sumaris-net/ngx-components";
import {LocalSettingsService}  from "@sumaris-net/ngx-components";
import {AppForm}  from "@sumaris-net/ngx-components";
import { AppFormUtils } from '@sumaris-net/ngx-components/src/app/core/form/form.utils';


export const DEFAULT_CRITERION_OPERATOR = '=';

@Component({
  selector: 'app-extraction-criteria-form',
  templateUrl: './extraction-criteria.form.html',
  styleUrls: ['./extraction-criteria.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtractionCriteriaForm<E extends ExtractionType<E> = ExtractionType<any>> extends AppForm<ExtractionFilterCriterion[]> implements OnInit {

  private _sheetName: string;
  private _type: E;

  operators: { symbol: CriterionOperator; name?: String; }[] = [
    {symbol: '='},
    {symbol: '!='},
    {symbol: '>'},
    {symbol: '>='},
    {symbol: '<'},
    {symbol: '<='},
    {symbol: 'BETWEEN', name: "EXTRACTION.FILTER.BETWEEN"},
    {symbol: 'NULL', name: "EXTRACTION.FILTER.NULL"},
    {symbol: 'NOT NULL', name: "EXTRACTION.FILTER.NOT_NULL"}
  ];

  $columns = new BehaviorSubject<ExtractionColumn[]>(undefined);
  $columnValueDefinitions = new BehaviorSubject<FormFieldDefinition[]>(undefined);
  $columnValueDefinitionsByIndex: { [index: number]: BehaviorSubject<FormFieldDefinition> } = {};

  @Input() set type(value: E) {
    this.setType(value);
  }

  get type(): E {
    return this._type;
  }

  @Input() set sheetName(value) {
    this.setSheetName(value);
  }

  get sheetName(): string {
    return this._sheetName;
  }

  @Input() showSheetsTab = true;

  @Input()
  set columns(value: ExtractionColumn[]) {
    this.$columns.next(value);
  }

  get sheetCriteriaForm(): FormArray {
    return this._sheetName && (this.form.get(this._sheetName) as FormArray) || undefined;
  }

  get criteriaCount(): number {
    return Object.values(this.form.controls)
      .map(sheetForm => (sheetForm as FormArray))
      .map(sheetForm => sheetForm.controls
        .map(criterionForm => (criterionForm as FormGroup).value)
        .filter(ExtractionFilterCriterion.isNotEmpty)
        .length
      )
      .reduce((count, length) => count + length, 0);
  }

  constructor(
    injector: Injector,
    protected formBuilder: FormBuilder,
    protected route: ActivatedRoute,
    protected router: Router,
    protected translate: TranslateService,
    protected service: ExtractionService,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    protected validatorService: ExtractionCriteriaValidatorService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector,
      // Empty form, that will be filled by setType() and setSheetName()
      formBuilder.group({}));
  }

  ngOnInit() {
    super.ngOnInit();

    this.registerSubscription(
      this.$columns
        .pipe(
          filter(isNotNil),
          map(columns => columns.map(c => this.toFieldDefinition(c)))
        )
        .subscribe(definitions => this.$columnValueDefinitions.next(definitions))
    );
  }

  setType(type: E) {

    if (!type || type === this.type) return; // skip

    this._type = type;

    // Create a form
    this.reset();

    this.markForCheck();
  }

  setSheetName(sheetName: string, opts?: {emitEvent?: boolean; onlySelf?: boolean}) {
    // Skip if same, or loading
    if (isNil(sheetName) || this._sheetName === sheetName) return;

    let sheetCriteriaForm = this.form.get(sheetName) as FormArray;

    // No criterion array found, for this sheet: create a new
    if (!sheetCriteriaForm) {
      sheetCriteriaForm = this.formBuilder.array([]);
      this.form.addControl(sheetName, sheetCriteriaForm);
    }

    this._sheetName = sheetName;
  }

  addFilterCriterion(criterion?: ExtractionFilterCriterion|any, opts?: { appendValue?: boolean; emitEvent?: boolean; }): boolean {
    opts = opts || {};
    opts.appendValue = toBoolean(opts.appendValue, false);
    console.debug("[extraction-form] Adding filter criterion");

    let hasChanged = false;
    let index = -1;

    const sheetName = criterion && criterion.sheetName || this.sheetName;
    let arrayControl = this.form.get(sheetName) as FormArray;
    if (!arrayControl) {
      arrayControl = this.formBuilder.array([]);
      this.form.addControl(sheetName, arrayControl);
    } else {

      // Search by name on existing criteria
      if (criterion && isNotNil(criterion.name)) {
        index = (arrayControl.value || []).findIndex(c => (c.name === criterion.name));
      }

      // If last criterion has no value: use it
      if (index === -1 && arrayControl.length) {
        // Find last criterion (so reverse array order)
        const lastCriterion = arrayControl.at(arrayControl.length - 1).value as ExtractionFilterCriterion;
        index = isNil(lastCriterion.name) && isNil(lastCriterion.value) ? arrayControl.length - 1 : -1;
      }
    }

    // Replace the existing criterion value
    if (index >= 0) {
      if (criterion && criterion.name) {
        const criterionForm = arrayControl.at(index) as FormGroup;
        const existingCriterion = criterionForm.value as ExtractionFilterCriterion;
        opts.appendValue = opts.appendValue && isNotNil(criterion.value) && isNotNil(existingCriterion.value)
          && (existingCriterion.operator === '=' || existingCriterion.operator === '!=');

        // Append value to existing value
        if (opts.appendValue) {
          existingCriterion.value += ", " + criterion.value;
          this.setCriterionValue(criterionForm, existingCriterion);
        }

        // Replace existing criterion value
        else {
          this.setCriterionValue(criterionForm, criterion);
        }
        hasChanged = true;
      }
    }

    // Add a new criterion (formGroup + value)
    else {
      const criterionForm = this.validatorService.getCriterionFormGroup(criterion, this.sheetName);
      arrayControl.push(criterionForm);
      hasChanged = true;
      index = arrayControl.length - 1;
    }

    // Mark filter form as dirty (if need)
    if (hasChanged && criterion && criterion.value) {
      this.form.markAsDirty({onlySelf: true});
    }

    if (hasChanged && criterion && criterion.name && index >= 0) {
      this.updateCriterionValueDefinition(index, criterion.name, false);
    }

    if (hasChanged && (!opts || opts.emitEvent !== false)) {
      this.markForCheck();
    }

    return hasChanged;
  }

  hasFilterCriteria(sheetName?: string): boolean {
    sheetName = sheetName || this.sheetName;
    const sheetCriteriaForm = sheetName && (this.form.get(sheetName) as FormArray);
    return sheetCriteriaForm && sheetCriteriaForm.controls
      .map(c => c.value)
      .findIndex(ExtractionFilterCriterion.isNotEmpty) !== -1;
  }

  removeFilterCriterion($event: MouseEvent, index: number) {
    const arrayControl = this.sheetCriteriaForm;
    if (!arrayControl) return; // skip

    // Do not remove if last criterion
    if (arrayControl.length === 1) {
      this.clearFilterCriterion($event, index);
      return;
    }

    arrayControl.removeAt(index);

    if (!$event.ctrlKey) {
      this.onSubmit.emit();
    } else {
      this.form.markAsDirty();
    }
  }

  clearFilterCriterion($event: MouseEvent, index: number): boolean {
    const arrayControl = this.sheetCriteriaForm;
    if (!arrayControl) return;

    const oldValue = arrayControl.at(index).value;
    const needClear = (isNotNil(oldValue.name) || isNotNil(oldValue.value));
    if (!needClear) return false;

    this.setCriterionValue(arrayControl.at(index), null);

    if (!$event.ctrlKey) {
      this.onSubmit.emit();
    } else {
      this.form.markAsDirty();
    }
    return false;
  }

  reset(data?: any, opts?: {emitEvent?: boolean}) {
    // Remove all criterion
    Object.getOwnPropertyNames(this.form.controls).forEach(sheetName => this.form.removeControl(sheetName));

    // Add the default (empty), for each sheet
    (this._type && this._type.sheetNames || []).forEach(sheetName => this.addFilterCriterion({
      name: null,
      operator: '=',
      sheetName: sheetName
    }));

    if (!opts || opts.emitEvent !== false) {
      this.markForCheck();
    }
  }

  getCriterionValueDefinition(index: number): Observable<FormFieldDefinition> {
    return this.$columnValueDefinitionsByIndex[index] || this.updateCriterionValueDefinition(index);
  }

  updateCriterionValueDefinition(index: number, columnName?: string, resetValue?: boolean): Observable<FormFieldDefinition> {
    const criterionForm = this.sheetCriteriaForm.at(index) as FormGroup;
    columnName = columnName || (criterionForm && criterionForm.controls.name.value);
    const operator = criterionForm && criterionForm.controls.operator.value || '=';
    const definition = (operator === 'NULL' || operator === 'NOT NULL') ? undefined
      : columnName && (this.$columnValueDefinitions.value || []).find(d => d.key === columnName) || null;

    // Reset the criterion value, is ask by caller
    if (resetValue) criterionForm.patchValue({value: null});

    let subject = this.$columnValueDefinitionsByIndex[index];
    if (!subject) {
      subject = new BehaviorSubject(definition);
      this.$columnValueDefinitionsByIndex[index] = subject;
    }
    else {
      subject.next(definition);
    }
    return subject;
  }

  waitIdle(): Promise<any> {
    if (!this.type) {
      return sleep(200).then(() => this.waitIdle());
    }
    return firstNotNilPromise(this.$columnValueDefinitions);
  }

  protected toFieldDefinition(column: ExtractionColumn): FormFieldDefinition {
    if (isNotEmptyArray(column.values)) {
      return {
        key: column.columnName,
        label: column.name,
        type: 'entity',
        autocomplete: {
          items: column.values,
          attributes: [undefined],
          columnNames: [column.name/*'EXTRACTION.FILTER.CRITERION_VALUE'*/],
          displayWith: (value) => '' + value
        }
      };
    }
    else {
      let type = column.type as FormFieldType;
      // Always use 'string' for number, to be able to set list
      if (type === 'integer' || type === 'double') {
        type = 'string';
      }
      return  {
        key: column.columnName,
        label: column.name,
        type
      };
    }
  }




  setValue(data: ExtractionFilterCriterion[], opts?: {emitEvent?: boolean; onlySelf?: boolean }): Promise<void> | void {

    // Create a map (using sheetname as key)
    const json = (data || [])
      .reduce((res, criterion) => {
        criterion.sheetName = criterion.sheetName || this.sheetName;
        criterion.operator = criterion.operator || DEFAULT_CRITERION_OPERATOR
        res[criterion.sheetName] = res[criterion.sheetName] || [];
        res[criterion.sheetName].push(criterion);
      return res;
    }, {});

    // Convert object to json, then apply it to form (e.g. convert 'undefined' into 'null')
    AppFormUtils.copyEntity2Form(json, this.form, {emitEvent: false, onlySelf: true, ...opts});

    if (!opts || opts.emitEvent !== true) {
      this.markForCheck();
    }
  }

  getValue(): ExtractionFilterCriterion[] {
    if (!this._enable) this.form.enable({emitEvent: false});
    const json = this.form.value;
    if (!this._enable) this.form.disable({emitEvent: false});
    if (!json) return undefined;

    const criteria = Object.getOwnPropertyNames(json).reduce((res, sheetName) => {
      return res.concat(json[sheetName]);
    }, []);
    return criteria;
  }

  /* -- protected method -- */

  protected setCriterionValue(control: AbstractControl, criterion?: ExtractionFilterCriterion) {
    control.setValue({
      name: criterion && criterion.name || null,
      operator: criterion && criterion.operator || DEFAULT_CRITERION_OPERATOR,
      value: criterion && criterion.value || null,
      endValue: criterion && criterion.endValue || null,
      sheetName: criterion && criterion.sheetName || this.sheetName || null
    });
  }



  protected markForCheck() {
    this.cd.markForCheck();
  }

}
