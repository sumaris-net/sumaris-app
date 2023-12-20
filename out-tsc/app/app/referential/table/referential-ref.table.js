import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { AppTable, changeCaseToUnderscore, EntityUtils, isNotEmptyArray, ReferentialUtils, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, StatusById, StatusList, } from '@sumaris-net/ngx-components';
import { UntypedFormBuilder } from '@angular/forms';
import { debounceTime, filter } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { BehaviorSubject } from 'rxjs';
import { ReferentialI18nKeys } from '@app/referential/referential.utils';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
let ReferentialRefTable = class ReferentialRefTable extends AppTable {
    constructor(injector, formBuilder, referentialRefService, cd) {
        super(injector, 
        // columns
        RESERVED_START_COLUMNS
            .concat([
            'label',
            'name',
            'description',
            'status',
            'comments'
        ])
            .concat(RESERVED_END_COLUMNS));
        this.referentialRefService = referentialRefService;
        this.cd = cd;
        this._mode = 'edit';
        this.statusList = StatusList;
        this.statusById = StatusById;
        this.$levels = new BehaviorSubject(undefined);
        this.showFilter = true;
        this.showLevelFilter = true;
        this.showStatusFilter = true;
        this.showToolbar = false;
        this.showPaginator = true;
        this.i18nColumnPrefix = 'REFERENTIAL.';
        this.inlineEdition = false;
        this.autoLoad = false; // waiting dataSource to be set
        this.filterForm = formBuilder.group({
            searchText: [null],
            level: [null],
            statusId: [null]
        });
        // Update filter when changes
        this.registerSubscription(this.filterForm.valueChanges
            .pipe(debounceTime(250), filter(() => this.filterForm.valid))
            // Applying the filter
            .subscribe((json) => {
            // Copy previous filter
            const baseFilter = Object.assign({}, this.filter);
            // Override levelId/levelIds, if user choose a level
            if (ReferentialUtils.isNotEmpty(json.level)) {
                json.levelIds = [json.level.id];
                baseFilter.levelIds = null;
                baseFilter.levelId = null;
            }
            this.setFilter(Object.assign(Object.assign({}, baseFilter), json), { emitEvent: this.mobile || !this.showToolbar });
        }));
        this.debug = !environment.production;
    }
    set entityName(entityName) {
        this.setFilter(Object.assign(Object.assign({}, this.filter), { entityName }));
    }
    get entityName() {
        var _a;
        return (_a = this.filter) === null || _a === void 0 ? void 0 : _a.entityName;
    }
    get mode() {
        return this._mode;
    }
    set mode(value) {
        this.setTableMode(value);
    }
    ngOnInit() {
        const _super = Object.create(null, {
            ngOnInit: { get: () => super.ngOnInit }
        });
        return __awaiter(this, void 0, void 0, function* () {
            _super.ngOnInit.call(this);
            // Level autocomplete
            this.registerAutocompleteField('level', {
                items: this.$levels,
                showAllOnFocus: true,
                mobile: this.mobile
            });
            // Load levels
            yield this.loadLevels(this.entityName);
        });
    }
    clearControlValue(event, formControl) {
        if (event)
            event.stopPropagation(); // Avoid to enter input the field
        formControl.setValue(null);
        return false;
    }
    /* -- protected methods -- */
    loadLevels(entityName) {
        return __awaiter(this, void 0, void 0, function* () {
            let levels = yield this.referentialRefService.loadLevels(entityName);
            // Filter with input levelIds, if any
            const filter = this.filter;
            if (levels && isNotEmptyArray(filter === null || filter === void 0 ? void 0 : filter.levelIds)) {
                levels = levels.filter(l => filter.levelIds.includes(l.id));
            }
            // Sort by label
            if (levels)
                levels.sort(EntityUtils.sortComparator('label', 'asc'));
            this.$levels.next(levels);
            if (isNotEmptyArray(levels)) {
                const typeName = levels[0].entityName;
                const i18nLevelName = 'REFERENTIAL.ENTITY.' + changeCaseToUnderscore(typeName).toUpperCase();
                const levelName = this.translate.instant(i18nLevelName);
                this.i18nLevelName = (levelName !== i18nLevelName) ? levelName : ReferentialI18nKeys.DEFAULT_I18N_LEVEL_NAME;
            }
            else {
                this.i18nLevelName = ReferentialI18nKeys.DEFAULT_I18N_LEVEL_NAME;
            }
            this.showLevelFilter = this.showLevelFilter && isNotEmptyArray(levels);
            return levels;
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    setTableMode(value) {
        this._mode = value;
        switch (value) {
            case 'select':
                this.inlineEdition = false;
                this.initPermanentSelection();
                break;
            case 'edit':
            default:
                this.inlineEdition = true;
                this.permanentSelection = null;
                break;
        }
        this.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialRefTable.prototype, "showFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialRefTable.prototype, "showLevelFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialRefTable.prototype, "showStatusFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialRefTable.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialRefTable.prototype, "showPaginator", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], ReferentialRefTable.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], ReferentialRefTable.prototype, "entityName", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], ReferentialRefTable.prototype, "mode", null);
ReferentialRefTable = __decorate([
    Component({
        selector: 'app-referential-ref-table',
        templateUrl: './referential-ref.table.html',
        styleUrls: ['./referential-ref.table.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        ReferentialRefService,
        ChangeDetectorRef])
], ReferentialRefTable);
export { ReferentialRefTable };
//# sourceMappingURL=referential-ref.table.js.map