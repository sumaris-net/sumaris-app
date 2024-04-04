import { __decorate, __metadata } from "tslib";
import { RoundWeightConversion } from './round-weight-conversion.model';
import { RoundWeightConversionFilter } from './round-weight-conversion.filter';
import { Component, Injector, Input } from '@angular/core';
import { BaseReferentialTable } from '@app/referential/table/base-referential.table';
import { RoundWeightConversionService } from './round-weight-conversion.service';
import { Validators } from '@angular/forms';
import { StatusIds } from '@sumaris-net/ngx-components';
import { RoundWeightConversionValidatorService } from './round-weight-conversion.validator';
import moment from 'moment';
import { LocationLevelIds, ParameterLabelGroups } from '@app/referential/services/model/model.enum';
let RoundWeightConversionTable = class RoundWeightConversionTable extends BaseReferentialTable {
    get taxonGroupIdControl() {
        return this.filterForm.get('taxonGroupId');
    }
    set taxonGroupId(value) {
        if (this.taxonGroupIdControl.value !== value) {
            this.taxonGroupIdControl.setValue(value);
        }
    }
    get taxonGroupId() {
        return this.taxonGroupIdControl.value;
    }
    set showTaxonGroupIdColumn(show) {
        this.setShowColumn('taxonGroupId', show);
    }
    get showTaxonGroupIdColumn() {
        return this.getShowColumn('taxonGroupId');
    }
    constructor(injector, entityService, validatorService) {
        super(injector, RoundWeightConversion, RoundWeightConversionFilter, entityService, validatorService, {
            i18nColumnPrefix: 'REFERENTIAL.TAXON_GROUP.ROUND_WEIGHT_CONVERSION.',
            canUpload: true,
        });
        this.showTitle = false;
        this.showIdColumn = false;
        this.autoLoad = false; // Wait filter
        this.sticky = true;
        this.logPrefix = '[round-weight-conversion-table] ';
    }
    ngOnInit() {
        super.ngOnInit();
    }
    registerAutocompleteFields() {
        // Location
        this.registerAutocompleteField('location', {
            showAllOnFocus: false,
            service: this.referentialRefService,
            filter: {
                entityName: 'Location',
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
                levelIds: [LocationLevelIds.COUNTRY],
            },
            mobile: this.mobile,
        });
        // Dressing
        this.registerAutocompleteField('dressing', {
            showAllOnFocus: false,
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { levelLabels: ParameterLabelGroups.DRESSING })),
            filter: {
                entityName: 'QualitativeValue',
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
            },
            mobile: this.mobile,
        });
        // Preserving
        this.registerAutocompleteField('preserving', {
            showAllOnFocus: false,
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { levelLabels: ParameterLabelGroups.PRESERVATION })),
            filter: {
                entityName: 'QualitativeValue',
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
            },
            mobile: this.mobile,
        });
    }
    getFilterFormConfig() {
        console.debug(this.logPrefix + ' Creating filter form group...');
        return {
            taxonGroupId: [null, Validators.required],
        };
    }
    defaultNewRowValue() {
        const creationDate = moment(new Date());
        return Object.assign(Object.assign({}, super.defaultNewRowValue()), { startDate: null, endDate: null, taxonGroupId: this.taxonGroupId, creationDate });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], RoundWeightConversionTable.prototype, "taxonGroupId", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], RoundWeightConversionTable.prototype, "showTaxonGroupIdColumn", null);
RoundWeightConversionTable = __decorate([
    Component({
        selector: 'app-round-weight-conversion-table',
        templateUrl: '../../table/base-referential.table.html',
        styleUrls: ['../../table/base-referential.table.scss'],
    })
    // @ts-ignore
    ,
    __metadata("design:paramtypes", [Injector, RoundWeightConversionService, RoundWeightConversionValidatorService])
], RoundWeightConversionTable);
export { RoundWeightConversionTable };
//# sourceMappingURL=round-weight-conversion.table.js.map