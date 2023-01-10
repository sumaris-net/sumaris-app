import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  AccountService,
  AppForm, AppFormArray,
  AppFormUtils,
  arrayDistinct,
  firstNotNilPromise,
  FormFieldDefinition,
  FormFieldType,
  isNil,
  isNotEmptyArray,
  isNotNil,
  LocalSettingsService,
  toBoolean,
  waitFor,
  WaitForOptions
} from '@sumaris-net/ngx-components';
import { CRITERION_OPERATOR_LIST, ExtractionColumn, ExtractionFilterCriterion, ExtractionType } from '../type/extraction-type.model';
import { ExtractionService } from '../common/extraction.service';
import { FormGroup, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { filter, map, switchMap } from 'rxjs/operators';
import { ExtractionCriteriaValidatorService } from './extraction-criterion.validator';
import { DEFAULT_CRITERION_OPERATOR } from '@app/extraction/common/extraction.utils';

export const DEFAULT_EXTRACTION_COLUMNS: Partial<ExtractionColumn>[] = [
  {columnName: 'project', name: 'EXTRACTION.COLUMNS.PROJECT', label: 'project', type: 'string'},
  {columnName: 'year', name: 'EXTRACTION.COLUMNS.YEAR', label: 'year', type: 'integer'},
]

@Component({
  selector: 'app-extraction-criteria-form',
  templateUrl: './extraction-criteria.form.html',
  styleUrls: ['./extraction-criteria.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtractionCriteriaForm<E extends ExtractionType<E> = ExtractionType<any>>
  extends AppForm<ExtractionFilterCriterion[]> implements OnInit {

  private _sheetName: string;
  private _type: E;

  operators = CRITERION_OPERATOR_LIST;

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
    if (isNotEmptyArray(value)) {
      this.$columns.next(value);
    }
    else {
      const columns = DEFAULT_EXTRACTION_COLUMNS.map(col => {
        col.name = this.translate.instant(col.name);
        return ExtractionColumn.fromObject(col);
      })
      this.$columns.next(columns);
    }
  }

  get sheetCriteriaForm(): AppFormArray<ExtractionFilterCriterion, FormGroup> {
    return this._sheetName && (this.form.get(this._sheetName) as AppFormArray<ExtractionFilterCriterion, FormGroup>) || undefined;
  }

  get criteriaCount(): number {
    return Object.values(this.form.controls)
      .map(sheetForm => (sheetForm as UntypedFormArray))
      .map(sheetForm => sheetForm.controls
        .map(criterionForm => (criterionForm as UntypedFormGroup).value)
        .filter(criterion => ExtractionFilterCriterion.isNotEmpty(criterion) && criterion.hidden !== true)
        .length
      )
      .reduce((count, length) => count + length, 0);
  }

  constructor(
    injector: Injector,
    protected formBuilder: UntypedFormBuilder,
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

  ngOnDestroy() {
    this.resetColumnDefinitions();
    this.$columnValueDefinitions.unsubscribe();
    this.$columns.unsubscribe();
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

    let sheetCriteriaForm = this.form.get(sheetName) as UntypedFormArray;

    // No criterion array found, for this sheet: create a new
    if (!sheetCriteriaForm) {
      sheetCriteriaForm = this.validatorService.getCriterionFormArray([], sheetName);
      this.form.addControl(sheetName, sheetCriteriaForm);
    }

    this._sheetName = sheetName;

    // Reset all definitions
    this.resetColumnDefinitions();
    this.markForCheck();
  }

  addFilterCriterion(criterion?: ExtractionFilterCriterion|any, opts?: { appendValue?: boolean; emitEvent?: boolean; }): boolean {
    opts = opts || {};
    opts.appendValue = toBoolean(opts.appendValue, false);
    console.debug("[extraction-form] Adding filter criterion");

    let hasChanged = false;
    let index = -1;

    const sheetName = criterion && criterion.sheetName || this.sheetName;
    let arrayControl = this.form.get(sheetName) as UntypedFormArray;
    if (!arrayControl) {
      arrayControl = this.validatorService.getCriterionFormArray([], sheetName);
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
        const criterionForm = arrayControl.at(index) as UntypedFormGroup;
        const existingCriterion = criterionForm.value as ExtractionFilterCriterion;
        opts.appendValue = opts.appendValue && isNotNil(criterion.value) && isNotNil(existingCriterion.value)
          && (existingCriterion.operator === '=' || existingCriterion.operator === '!=');

        // Append value to existing value
        if (opts.appendValue) {
          existingCriterion.value += ", " + criterion.value;
          this.validatorService.setCriterionValue(criterionForm, existingCriterion);
        }

        // Replace existing criterion value
        else {
          this.validatorService.setCriterionValue(criterionForm, criterion);
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

    if (hasChanged && this._sheetName === criterion.sheetName && criterion?.name && index >= 0) {
      this.updateCriterionValueDefinition(index, criterion.name, false);
    }

    if (hasChanged && (!opts || opts.emitEvent !== false)) {
      this.markForCheck();
    }

    return hasChanged;
  }

  hasFilterCriteria(sheetName?: string): boolean {
    sheetName = sheetName || this.sheetName;
    const sheetCriteriaForm = sheetName && (this.form.get(sheetName) as UntypedFormArray);
    return sheetCriteriaForm && sheetCriteriaForm.controls
      .map(c => c.value)
      .some(c => ExtractionFilterCriterion.isNotEmpty(c) && c.hidden !== true);
  }

  removeFilterCriterion($event: MouseEvent, index: number) {
    const arrayControl = this.sheetCriteriaForm;
    if (!arrayControl) return; // skip

    // Count visible criteria
    const visibleCriteriaCount = arrayControl.value
      .filter(criterion => criterion.hidden !== true)
      .length;

    // Do not remove if last criterion
    if (visibleCriteriaCount === 1) {
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

    this.validatorService.setCriterionValue(arrayControl.at(index), null);

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
      operator: DEFAULT_CRITERION_OPERATOR,
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
    const arrayControl = this.sheetCriteriaForm;
    if (!arrayControl) return;

    // Make sure to wait $columnValueDefinitions has been loaded
    if (!this.$columnValueDefinitions.value) {
      return this.$columnValueDefinitions
        .pipe(
          switchMap(_ => this.updateCriterionValueDefinition(index, columnName, resetValue))
        );
    }

    const criterionForm = arrayControl.at(index) as UntypedFormGroup;
    columnName = columnName || (criterionForm && criterionForm.controls.name.value);
    const operator = criterionForm && criterionForm.controls.operator.value || '=';
    let definition = (operator === 'NULL' || operator === 'NOT NULL')
      ? undefined
      : columnName && (this.$columnValueDefinitions.value || []).find(d => d.key === columnName) || null;

    // Workaround : use a default string definition, when column cannot be found
    if (definition == null) {
      console.warn('[extraction-form] Cannot find column definition for ' + columnName);
      definition = <FormFieldDefinition>{key: columnName, type: 'string'};
    }

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

  async waitIdle(opts?: WaitForOptions): Promise<any> {
    await Promise.all([
      waitFor(() => !!this.type, {stop: this.destroySubject, ...opts}),
      firstNotNilPromise(this.$columnValueDefinitions, {stop: this.destroySubject, ...opts})
    ]);
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




  async setValue(data: ExtractionFilterCriterion[], opts?: {emitEvent?: boolean; onlySelf?: boolean }): Promise<void>{

    await this.ready();
    await this.waitIdle();

    // Create a map (using sheetname as key)
    const json = (data || [])
      .reduce((res, criterion) => {
        criterion.sheetName = criterion.sheetName || this.sheetName;
        criterion.operator = criterion.operator || DEFAULT_CRITERION_OPERATOR;
        criterion.value = criterion.value || (criterion.values?.join(','));
        res[criterion.sheetName] = res[criterion.sheetName] || [];
        res[criterion.sheetName].push(criterion);
      return res;
    }, {});

    const sheetNames = arrayDistinct(Object.keys(json));

    // Create a sub form for each sheet
    sheetNames.forEach(sheet => {
      const formArray = this.form.get(sheet);
      if (!formArray) {
        this.form.addControl(sheet, this.validatorService.getCriterionFormArray(undefined, sheet));
      }
    });

    this.form.patchValue(json);

    if (!opts || opts.emitEvent !== true) {
      this.markForCheck();
    }
  }

  getValue(): ExtractionFilterCriterion[] {
    const disabled = this.form.disabled;
    if (disabled) this.form.enable({emitEvent: false});

    try {
      const json = this.form.value;

      if (!json) return undefined;

      // Flat the map by sheet
      return Object.getOwnPropertyNames(json)
        .reduce((res, sheetName) => {
          return res.concat(json[sheetName]);
        }, [])
        .map(ExtractionFilterCriterion.fromObject);
    }
    finally {
      // Restore disable state
      if (disabled) this.form.disable({emitEvent: false});
    }
  }

  /* -- protected method -- */

  protected resetColumnDefinitions() {

    Object.values(this.$columnValueDefinitionsByIndex).forEach(subject => {
      subject.next(null);
      subject.unsubscribe();
    })
    this.$columnValueDefinitionsByIndex = {};
  }


  protected markForCheck() {
    this.cd.markForCheck();
  }

}
