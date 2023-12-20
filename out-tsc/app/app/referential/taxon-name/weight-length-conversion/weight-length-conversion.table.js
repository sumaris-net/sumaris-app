import { __awaiter, __decorate, __metadata } from "tslib";
import { WeightLengthConversion } from './weight-length-conversion.model';
import { WeightLengthConversionFilter } from '../../services/filter/weight-length-conversion.filter';
import { Component, Injector, Input } from '@angular/core';
import { BaseReferentialTable } from '@app/referential/table/base-referential.table';
import { WeightLengthConversionService } from '@app/referential/taxon-name/weight-length-conversion/weight-length-conversion.service';
import { Validators } from '@angular/forms';
import { DateUtils, firstNotNilPromise, StatusIds } from '@sumaris-net/ngx-components';
import { WeightLengthConversionValidatorService } from '@app/referential/taxon-name/weight-length-conversion/weight-length-conversion.validator';
import moment from 'moment';
import { LocationLevelGroups, ParameterLabelGroups, UnitLabelGroups } from '@app/referential/services/model/model.enum';
import { ParameterService } from '@app/referential/services/parameter.service';
import { BehaviorSubject } from 'rxjs';
let WeightLengthConversionTable = class WeightLengthConversionTable extends BaseReferentialTable {
    constructor(injector, entityService, validatorService, parameterService) {
        super(injector, WeightLengthConversion, WeightLengthConversionFilter, entityService, validatorService, {
            i18nColumnPrefix: 'REFERENTIAL.TAXON_NAME.WEIGHT_LENGTH_CONVERSION.',
            canUpload: true,
        });
        this.parameterService = parameterService;
        this._$lengthParameters = new BehaviorSubject([]);
        this._$lengthUnits = new BehaviorSubject([]);
        this.showTitle = false;
        this.showIdColumn = false;
        this.autoLoad = false; // Wait filter
        this.sticky = true;
        this.logPrefix = '[weight-length-conversion-table] ';
    }
    get referenceTaxonIdControl() {
        return this.filterForm.get('referenceTaxonId');
    }
    set referenceTaxonId(value) {
        if (this.referenceTaxonIdControl.value !== value) {
            this.referenceTaxonIdControl.setValue(value);
        }
    }
    get referenceTaxonId() {
        return this.referenceTaxonIdControl.value;
    }
    set showReferenceTaxonIdColumn(show) {
        this.setShowColumn('referenceTaxonId', show);
    }
    get showReferenceTaxonIdColumn() {
        return this.getShowColumn('referenceTaxonId');
    }
    ngOnInit() {
        super.ngOnInit();
        this.loadLengthParameters();
    }
    ready() {
        const _super = Object.create(null, {
            ready: { get: () => super.ready }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.ready.call(this);
            yield firstNotNilPromise(this._$lengthParameters);
        });
    }
    registerAutocompleteFields() {
        // Location
        this.registerAutocompleteField('location', {
            showAllOnFocus: false,
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { levelIds: this._locationLevelIds })),
            filter: {
                entityName: 'Location',
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE, StatusIds.DISABLE /*CIEM division are disabled*/],
            },
            mobile: this.mobile,
        });
        // Sex
        this.registerAutocompleteField('sex', {
            showAllOnFocus: false,
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { searchAttributes: ['name'], levelLabels: ParameterLabelGroups.SEX })),
            filter: {
                entityName: 'QualitativeValue',
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY, StatusIds.DISABLE /*Non sexe*/],
            },
            attributes: ['name'],
            mobile: this.mobile,
        });
        // Length parameter
        this.registerAutocompleteField('lengthParameter', {
            showAllOnFocus: false,
            items: this._$lengthParameters,
            attributes: this.settings.getFieldDisplayAttributes('parameter'),
            mobile: this.mobile,
        });
        // Length unit
        this.registerAutocompleteField('lengthUnit', {
            showAllOnFocus: false,
            items: this._$lengthUnits,
            attributes: ['label'],
            mobile: this.mobile,
        });
    }
    getFilterFormConfig() {
        console.debug(this.logPrefix + ' Creating filter form group...');
        return {
            // Not used
            //year: [null, Validators.compose([SharedValidators.integer, Validators.min(1970)])],
            referenceTaxonId: [null, Validators.required],
        };
    }
    defaultNewRowValue() {
        const creationDate = moment(new Date());
        const year = creationDate.get('year');
        return Object.assign(Object.assign({}, super.defaultNewRowValue()), { referenceTaxonId: this.referenceTaxonId, year, startMonth: 1, endMonth: 12, creationDate });
    }
    parseCsvRowsToEntities(headers, rows) {
        const _super = Object.create(null, {
            parseCsvRowsToEntities: { get: () => super.parseCsvRowsToEntities }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const entities = yield _super.parseCsvRowsToEntities.call(this, headers, rows);
            // Force referenceTaxonId
            const creationDate = DateUtils.moment();
            entities.forEach((e) => {
                e.referenceTaxonId = this.referenceTaxonId;
                e.creationDate = creationDate;
            });
            return entities;
        });
    }
    loadLengthParameters() {
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure service uis ready (e.g. enumerations has been overridden)
            yield this.referentialRefService.ready();
            // Set the location levels used to filter
            this._locationLevelIds = LocationLevelGroups.WEIGHT_LENGTH_CONVERSION_AREA;
            // Length parameters
            yield this.parameterService
                .loadAllByLabels(ParameterLabelGroups.LENGTH, { toEntity: false })
                .then((items) => this._$lengthParameters.next(items));
            // Length units
            yield this.referentialRefService
                .loadAllByLabels(UnitLabelGroups.LENGTH, 'Unit', { statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY] })
                .then((items) => this._$lengthUnits.next(items));
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], WeightLengthConversionTable.prototype, "referenceTaxonId", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], WeightLengthConversionTable.prototype, "showReferenceTaxonIdColumn", null);
WeightLengthConversionTable = __decorate([
    Component({
        selector: 'app-weight-length-conversion-table',
        templateUrl: '../../table/base-referential.table.html',
        styleUrls: ['../../table/base-referential.table.scss'],
    })
    // @ts-ignore
    ,
    __metadata("design:paramtypes", [Injector,
        WeightLengthConversionService,
        WeightLengthConversionValidatorService,
        ParameterService])
], WeightLengthConversionTable);
export { WeightLengthConversionTable };
//# sourceMappingURL=weight-length-conversion.table.js.map