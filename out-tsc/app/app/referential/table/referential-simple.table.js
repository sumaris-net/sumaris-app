import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { AccountService, AppInMemoryTable, InMemoryEntitiesService, isNil, Referential, ReferentialUtils, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, StatusById, StatusList, } from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '../services/validator/referential.validator';
import { ReferentialFilter } from '../services/filter/referential.filter';
import { environment } from '@environments/environment';
import { Popovers } from '@app/shared/popover/popover.utils';
import { PopoverController } from '@ionic/angular';
let SimpleReferentialTable = class SimpleReferentialTable extends AppInMemoryTable {
    constructor(injector, accountService, validatorService, memoryDataService, cd) {
        super(injector, 
        // columns
        RESERVED_START_COLUMNS.concat(['label', 'name', 'description', 'status', 'updateDate', 'comments']).concat(RESERVED_END_COLUMNS), Referential, memoryDataService, validatorService, {
            onRowCreated: (row) => this.onRowCreated(row),
            prependNewElements: false,
            suppressErrors: true,
        }, {
            entityName: 'Program',
        });
        this.accountService = accountService;
        this.validatorService = validatorService;
        this.memoryDataService = memoryDataService;
        this.cd = cd;
        this.statusList = StatusList;
        this.statusById = StatusById;
        this.canEdit = false;
        this.canDelete = false;
        this.showToolbar = true;
        this.showPaginator = false;
        this.useSticky = false;
        this.popoverController = injector.get(PopoverController);
        this.i18nColumnPrefix = 'REFERENTIAL.';
        this.inlineEdition = true;
        this.confirmBeforeDelete = true;
        this.autoLoad = false; // waiting parent to load
        this.showUpdateDateColumn = false;
        this.defaultSortBy = 'id';
        this.defaultSortDirection = 'asc';
        this.debug = !environment.production;
    }
    set entityName(entityName) {
        this.setFilter(Object.assign(Object.assign({}, this.filter), { entityName }));
    }
    get entityName() {
        return this.filter.entityName;
    }
    set showIdColumn(value) {
        this.setShowColumn('id', value);
    }
    get showIdColumn() {
        return this.getShowColumn('id');
    }
    set showSelectColumn(value) {
        this.setShowColumn('select', value);
    }
    get showSelectColumn() {
        return this.getShowColumn('select');
    }
    set showUpdateDateColumn(value) {
        this.setShowColumn('updateDate', value);
    }
    get showUpdateDateColumn() {
        return this.getShowColumn('updateDate');
    }
    set showCommentsColumn(value) {
        this.setShowColumn('comments', value);
    }
    get showCommentsColumn() {
        return this.getShowColumn('comments');
    }
    ngOnInit() {
        if (this.hasRankOrder) {
            this.memoryDataService.addSortByReplacement('id', 'rankOrder');
        }
        super.ngOnInit();
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.memoryDataService.stop();
        this.memoryDataService = null;
    }
    openDescriptionPopover(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            const placeholder = this.translate.instant(this.i18nColumnPrefix + 'DESCRIPTION');
            const { data } = yield Popovers.showText(this.popoverController, event, {
                editing: this.inlineEdition && this.enabled,
                autofocus: this.enabled,
                multiline: true,
                text: row.currentData.description,
                placeholder,
            });
            // User cancel
            if (isNil(data) || this.disabled)
                return;
            if (this.inlineEdition) {
                if (row.validator) {
                    row.validator.patchValue({ description: data });
                    row.validator.markAsDirty();
                }
                else {
                    row.currentData.description = data;
                }
            }
        });
    }
    openCommentPopover(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            const placeholder = this.translate.instant(this.i18nColumnPrefix + 'COMMENTS');
            const { data } = yield Popovers.showText(this.popoverController, event, {
                editing: this.inlineEdition && this.enabled,
                autofocus: this.enabled,
                multiline: true,
                text: row.currentData.comments,
                placeholder,
            });
            // User cancel
            if (isNil(data) || this.disabled)
                return;
            if (this.inlineEdition) {
                if (row.validator) {
                    row.validator.patchValue({ comments: data });
                    row.validator.markAsDirty();
                }
                else {
                    row.currentData.comments = data;
                }
            }
        });
    }
    onRowCreated(row) {
        const defaultValues = {
            entityName: this.entityName,
        };
        if (row.validator) {
            row.validator.patchValue(defaultValues);
        }
        else {
            Object.assign(row.currentData, defaultValues);
        }
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], SimpleReferentialTable.prototype, "entityName", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SimpleReferentialTable.prototype, "canEdit", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SimpleReferentialTable.prototype, "canDelete", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SimpleReferentialTable.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SimpleReferentialTable.prototype, "showPaginator", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SimpleReferentialTable.prototype, "hasRankOrder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SimpleReferentialTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SimpleReferentialTable.prototype, "showIdColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SimpleReferentialTable.prototype, "showSelectColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SimpleReferentialTable.prototype, "showUpdateDateColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SimpleReferentialTable.prototype, "showCommentsColumn", null);
SimpleReferentialTable = __decorate([
    Component({
        selector: 'app-simple-referential-table',
        templateUrl: 'referential-simple.table.html',
        styleUrls: ['referential-simple.table.scss'],
        providers: [
            { provide: ValidatorService, useExisting: ReferentialValidatorService },
            {
                provide: InMemoryEntitiesService,
                useFactory: () => new InMemoryEntitiesService(Referential, ReferentialFilter, {
                    equals: ReferentialUtils.equals,
                }),
            },
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        AccountService,
        ValidatorService,
        InMemoryEntitiesService,
        ChangeDetectorRef])
], SimpleReferentialTable);
export { SimpleReferentialTable };
//# sourceMappingURL=referential-simple.table.js.map