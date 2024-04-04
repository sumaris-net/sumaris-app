import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { AccountService, AppForm, arrayDistinct, firstNotNilPromise, isNil, isNotEmptyArray, isNotNil, LocalSettingsService, toBoolean, waitFor, } from '@sumaris-net/ngx-components';
import { CRITERION_OPERATOR_LIST, ExtractionColumn, ExtractionFilterCriterion } from '../type/extraction-type.model';
import { ExtractionService } from '../common/extraction.service';
import { UntypedFormBuilder } from '@angular/forms';
import { filter, map, switchMap } from 'rxjs/operators';
import { ExtractionCriteriaValidatorService } from './extraction-criterion.validator';
import { DEFAULT_CRITERION_OPERATOR } from '@app/extraction/common/extraction.utils';
export const DEFAULT_EXTRACTION_COLUMNS = [
    { columnName: 'project', name: 'EXTRACTION.COLUMNS.PROJECT', label: 'project', type: 'string' },
    { columnName: 'year', name: 'EXTRACTION.COLUMNS.YEAR', label: 'year', type: 'integer' },
];
let ExtractionCriteriaForm = class ExtractionCriteriaForm extends AppForm {
    constructor(injector, formBuilder, route, router, translate, service, accountService, settings, validatorService, cd) {
        super(injector, 
        // Empty form, that will be filled by setType() and setSheetName()
        formBuilder.group({}));
        this.formBuilder = formBuilder;
        this.route = route;
        this.router = router;
        this.translate = translate;
        this.service = service;
        this.accountService = accountService;
        this.settings = settings;
        this.validatorService = validatorService;
        this.cd = cd;
        this.operators = CRITERION_OPERATOR_LIST;
        this.$columns = new BehaviorSubject(undefined);
        this.$columnValueDefinitions = new BehaviorSubject(undefined);
        this.$columnValueDefinitionsByIndex = {};
        this.showSheetsTab = true;
    }
    set type(value) {
        this.setType(value);
    }
    get type() {
        return this._type;
    }
    set sheetName(value) {
        this.setSheetName(value);
    }
    get sheetName() {
        return this._sheetName;
    }
    set columns(value) {
        if (isNotEmptyArray(value)) {
            this.$columns.next(value);
        }
        else {
            const columns = DEFAULT_EXTRACTION_COLUMNS.map(col => {
                col.name = this.translate.instant(col.name);
                return ExtractionColumn.fromObject(col);
            });
            this.$columns.next(columns);
        }
    }
    get sheetCriteriaForm() {
        return this._sheetName && this.form.get(this._sheetName) || undefined;
    }
    get criteriaCount() {
        return Object.values(this.form.controls)
            .map(sheetForm => sheetForm)
            .map(sheetForm => sheetForm.controls
            .map(criterionForm => criterionForm.value)
            .filter(criterion => ExtractionFilterCriterion.isNotEmpty(criterion) && criterion.hidden !== true)
            .length)
            .reduce((count, length) => count + length, 0);
    }
    ngOnInit() {
        super.ngOnInit();
        this.registerSubscription(this.$columns
            .pipe(filter(isNotNil), map(columns => columns.map(c => this.toFieldDefinition(c))))
            .subscribe(definitions => this.$columnValueDefinitions.next(definitions)));
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.resetColumnDefinitions();
        this.$columnValueDefinitions.unsubscribe();
        this.$columns.unsubscribe();
    }
    setType(type) {
        if (!type || type === this.type)
            return; // skip
        this._type = type;
        // Create a form
        this.reset();
        this.markForCheck();
    }
    setSheetName(sheetName, opts) {
        // Skip if same, or loading
        if (isNil(sheetName) || this._sheetName === sheetName)
            return;
        let sheetCriteriaForm = this.form.get(sheetName);
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
    addFilterCriterion(criterion, opts) {
        opts = opts || {};
        opts.appendValue = toBoolean(opts.appendValue, false);
        console.debug('[extraction-form] Adding filter criterion');
        let hasChanged = false;
        let index = -1;
        const sheetName = criterion && criterion.sheetName || this.sheetName;
        let arrayControl = this.form.get(sheetName);
        if (!arrayControl) {
            arrayControl = this.validatorService.getCriterionFormArray([], sheetName);
            this.form.addControl(sheetName, arrayControl);
        }
        else {
            // Search by name on existing criteria
            if (criterion && isNotNil(criterion.name)) {
                index = (arrayControl.value || []).findIndex(c => (c.name === criterion.name));
            }
            // If last criterion has no value: use it
            if (index === -1 && arrayControl.length) {
                // Find last criterion (so reverse array order)
                const lastCriterion = arrayControl.at(arrayControl.length - 1).value;
                index = isNil(lastCriterion.name) && isNil(lastCriterion.value) ? arrayControl.length - 1 : -1;
            }
        }
        // Replace the existing criterion value
        if (index >= 0) {
            if (criterion && criterion.name) {
                const criterionForm = arrayControl.at(index);
                const existingCriterion = criterionForm.value;
                opts.appendValue = opts.appendValue && isNotNil(criterion.value) && isNotNil(existingCriterion.value)
                    && (existingCriterion.operator === '=' || existingCriterion.operator === '!=');
                // Append value to existing value
                if (opts.appendValue) {
                    existingCriterion.value += ', ' + criterion.value;
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
            this.form.markAsDirty({ onlySelf: true });
        }
        if (hasChanged && (criterion === null || criterion === void 0 ? void 0 : criterion.name) && this._sheetName === (criterion === null || criterion === void 0 ? void 0 : criterion.sheetName) && index >= 0) {
            this.updateDefinitionAt(index, criterion.name, false);
        }
        if (hasChanged && (!opts || opts.emitEvent !== false)) {
            this.markForCheck();
        }
        return hasChanged;
    }
    hasFilterCriteria(sheetName) {
        sheetName = sheetName || this.sheetName;
        const sheetCriteriaForm = sheetName && this.form.get(sheetName);
        return sheetCriteriaForm && sheetCriteriaForm.controls
            .map(c => c.value)
            .some(c => ExtractionFilterCriterion.isNotEmpty(c) && c.hidden !== true);
    }
    removeFilterCriterion($event, index) {
        const arrayControl = this.sheetCriteriaForm;
        if (!arrayControl)
            return; // skip
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
        }
        else {
            this.form.markAsDirty();
        }
    }
    clearFilterCriterion($event, index) {
        const arrayControl = this.sheetCriteriaForm;
        if (!arrayControl)
            return;
        const oldValue = arrayControl.at(index).value;
        const needClear = (isNotNil(oldValue.name) || isNotNil(oldValue.value));
        if (!needClear)
            return false;
        this.validatorService.setCriterionValue(arrayControl.at(index), null);
        if (!$event.ctrlKey) {
            this.onSubmit.emit();
        }
        else {
            this.form.markAsDirty();
        }
        return false;
    }
    reset(data, opts) {
        // Remove all criterion
        Object.getOwnPropertyNames(this.form.controls).forEach(sheetName => this.form.removeControl(sheetName));
        // Add the default (empty), for each sheet
        (this._type && this._type.sheetNames || []).forEach(sheetName => this.addFilterCriterion({
            name: null,
            operator: DEFAULT_CRITERION_OPERATOR,
            sheetName
        }));
        if (!opts || opts.emitEvent !== false) {
            this.markForCheck();
        }
    }
    getCriterionValueDefinition(index) {
        let definition$ = this.$columnValueDefinitionsByIndex[index];
        if (!definition$) {
            definition$ = this.updateDefinitionAt(index);
        }
        return definition$;
    }
    updateDefinitionAt(index, columnName, resetValue) {
        var _a, _b, _c;
        const arrayControl = this.sheetCriteriaForm;
        if (!arrayControl)
            return;
        // Make sure to wait $columnValueDefinitions has been loaded
        if (!this.$columnValueDefinitions.value) {
            return this.$columnValueDefinitions
                .pipe(filter(isNotNil), switchMap(_ => this.updateDefinitionAt(index, columnName, resetValue)));
        }
        const criterionForm = arrayControl.at(index);
        columnName = columnName || (criterionForm && criterionForm.controls.name.value);
        const operator = criterionForm && criterionForm.controls.operator.value || '=';
        let definition = (operator === 'NULL' || operator === 'NOT NULL')
            ? undefined
            : columnName && (this.$columnValueDefinitions.value || []).find(d => d.key === columnName) || null;
        // Workaround: use a default string definition, when column cannot be found
        if (definition == null) {
            console.warn('[extraction-form] Cannot find column definition for ' + columnName);
            definition = { key: columnName, type: 'string' };
        }
        // Reset the criterion value, is ask by caller
        if (resetValue) {
            setTimeout(() => {
                criterionForm.get('value').reset(null);
            }, 250);
        }
        let subject = this.$columnValueDefinitionsByIndex[index];
        const items = (_a = definition.autocomplete) === null || _a === void 0 ? void 0 : _a.items;
        let $items = (_c = (_b = subject === null || subject === void 0 ? void 0 : subject.value) === null || _b === void 0 ? void 0 : _b.autocomplete) === null || _c === void 0 ? void 0 : _c.items;
        if (items) {
            if ($items instanceof BehaviorSubject) {
                $items.next(items);
            }
            else {
                $items = new BehaviorSubject(items);
            }
            definition = Object.assign(Object.assign({}, definition), { autocomplete: Object.assign(Object.assign({}, definition.autocomplete), { items: $items }) });
        }
        if (!subject) {
            subject = new BehaviorSubject(definition);
            this.$columnValueDefinitionsByIndex[index] = subject;
        }
        else {
            subject.next(definition);
            this.markForCheck();
        }
        return subject;
    }
    waitIdle(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                waitFor(() => !!this.type, Object.assign({ stop: this.destroySubject }, opts)),
                firstNotNilPromise(this.$columnValueDefinitions, Object.assign({ stop: this.destroySubject }, opts))
            ]);
        });
    }
    toFieldDefinition(column) {
        if (isNotEmptyArray(column.values)) {
            return {
                key: column.columnName,
                label: column.name,
                // type: 'enum',
                // values: column.values.map(v => ({value: v, key: v})),
                type: 'entity',
                autocomplete: {
                    items: column.values,
                    attributes: [undefined],
                    columnNames: [column.name /*'EXTRACTION.FILTER.CRITERION_VALUE'*/],
                    mobile: false,
                    displayWith: (value) => 
                    // DEBUG
                    //console.debug('TODO display with', value);
                    isNil(value) ? '' : value
                }
            };
        }
        else {
            let type = column.type;
            // Always use 'string' for number, to be able to set list
            if (type === 'integer' || type === 'double') {
                type = 'string';
            }
            return {
                key: column.columnName,
                label: column.name,
                type
            };
        }
    }
    setValue(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ready();
            yield this.waitIdle();
            // Create a map (using sheetname as key)
            const json = (data || [])
                .reduce((res, criterion) => {
                var _a;
                criterion.sheetName = criterion.sheetName || this.sheetName;
                criterion.operator = criterion.operator || DEFAULT_CRITERION_OPERATOR;
                criterion.value = criterion.value || ((_a = criterion.values) === null || _a === void 0 ? void 0 : _a.join(','));
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
        });
    }
    getValue() {
        const disabled = this.form.disabled;
        if (disabled)
            this.form.enable({ emitEvent: false });
        try {
            const json = this.form.value;
            if (!json)
                return undefined;
            // Flat the map by sheet
            return Object.getOwnPropertyNames(json)
                .reduce((res, sheetName) => res.concat(json[sheetName]), [])
                .map(ExtractionFilterCriterion.fromObject);
        }
        finally {
            // Restore disable state
            if (disabled)
                this.form.disable({ emitEvent: false });
        }
    }
    /* -- protected method -- */
    resetColumnDefinitions() {
        Object.values(this.$columnValueDefinitionsByIndex).forEach(subject => {
            subject.next(null);
            subject.unsubscribe();
        });
        this.$columnValueDefinitionsByIndex = {};
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], ExtractionCriteriaForm.prototype, "type", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [Object])
], ExtractionCriteriaForm.prototype, "sheetName", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ExtractionCriteriaForm.prototype, "showSheetsTab", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], ExtractionCriteriaForm.prototype, "columns", null);
ExtractionCriteriaForm = __decorate([
    Component({
        selector: 'app-extraction-criteria-form',
        templateUrl: './extraction-criteria.form.html',
        styleUrls: ['./extraction-criteria.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        ActivatedRoute,
        Router,
        TranslateService,
        ExtractionService,
        AccountService,
        LocalSettingsService,
        ExtractionCriteriaValidatorService,
        ChangeDetectorRef])
], ExtractionCriteriaForm);
export { ExtractionCriteriaForm };
//# sourceMappingURL=extraction-criteria.form.js.map