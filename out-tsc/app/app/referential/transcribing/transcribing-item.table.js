import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, Component, Inject, InjectionToken, Injector, Input, Self } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { StrategyValidatorService } from '@app/referential/services/validator/strategy.validator';
import { TranscribingItem, TranscribingItemFilter, TranscribingItemType } from '@app/referential/transcribing/transcribing.model';
import { BaseReferentialTable } from '@app/referential/table/base-referential.table';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { TranscribingItemValidatorService } from '@app/referential/transcribing/transcribing-item.validator';
import { DateUtils, EntityUtils, InMemoryEntitiesService, SharedValidators, StatusIds } from '@sumaris-net/ngx-components';
import { Validators } from '@angular/forms';
import { RxState } from '@rx-angular/state';
export const TRANSCRIBING_ITEM_DATA_SERVICE_TOKEN = new InjectionToken('TranscribingItemService');
let TranscribingItemTable = class TranscribingItemTable extends BaseReferentialTable {
    constructor(injector, dataService, validatorService, referentialRefService, state) {
        super(injector, TranscribingItem, TranscribingItemFilter, dataService, validatorService, {
            i18nColumnPrefix: 'REFERENTIAL.TRANSCRIBING_ITEM.',
            canUpload: true
        });
        this.referentialRefService = referentialRefService;
        this.state = state;
        this.showTitle = false;
        this.showIdColumn = false;
        this.autoLoad = false; // Wait filter
        this.sticky = true;
        this.logPrefix = '[transcribing-item-table] ';
    }
    set value(data) {
        this.memoryDataService.value = data;
    }
    get value() {
        return this.memoryDataService.value;
    }
    set objectFilter(value) {
        this.state.set('objectFilter', _ => value);
    }
    get objectFilter() {
        return this.state.get('objectFilter');
    }
    set type(value) {
        this.state.set('type', _ => value);
    }
    get type() {
        return this.state.get('type');
    }
    ngOnInit() {
        super.ngOnInit();
    }
    registerAutocompleteFields() {
        // Type
        this.registerAutocompleteField('type', {
            showAllOnFocus: false,
            service: this.referentialRefService,
            filter: {
                entityName: TranscribingItemType.ENTITY_NAME,
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
            },
            mobile: this.mobile
        });
        // Object
        this.registerAutocompleteField('object', {
            showAllOnFocus: false,
            suggestFn: (value, filter) => this.suggestObject(value, filter),
            filter: {
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            },
            mobile: this.mobile
        });
    }
    getFilterFormConfig() {
        console.debug(this.logPrefix + ' Creating filter form group...');
        return {
            searchText: [null],
            type: [null, Validators.compose([SharedValidators.entity, Validators.required])]
        };
    }
    defaultNewRowValue() {
        return Object.assign(Object.assign({}, super.defaultNewRowValue()), { type: this.type, creationDate: DateUtils.moment() });
    }
    suggestObject(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), this.objectFilter));
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], TranscribingItemTable.prototype, "value", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], TranscribingItemTable.prototype, "objectFilter", null);
__decorate([
    Input(),
    __metadata("design:type", TranscribingItemType),
    __metadata("design:paramtypes", [TranscribingItemType])
], TranscribingItemTable.prototype, "type", null);
TranscribingItemTable = __decorate([
    Component({
        selector: 'app-transcribing-item-table',
        templateUrl: '../table/base-referential.table.html',
        styleUrls: [
            '../table/base-referential.table.scss',
            './transcribing-item.table.scss'
        ],
        providers: [
            { provide: ValidatorService, useExisting: StrategyValidatorService },
            {
                provide: TRANSCRIBING_ITEM_DATA_SERVICE_TOKEN,
                useFactory: () => new InMemoryEntitiesService(TranscribingItem, TranscribingItemFilter, {
                    equals: TranscribingItem.equals,
                    onSort: (data, sortBy = 'label', sortDirection) => EntityUtils.sort(data, sortBy, sortDirection),
                })
            },
            RxState
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(1, Self()),
    __param(1, Inject(TRANSCRIBING_ITEM_DATA_SERVICE_TOKEN)),
    __metadata("design:paramtypes", [Injector, Object, TranscribingItemValidatorService,
        ReferentialRefService,
        RxState])
], TranscribingItemTable);
export { TranscribingItemTable };
//# sourceMappingURL=transcribing-item.table.js.map