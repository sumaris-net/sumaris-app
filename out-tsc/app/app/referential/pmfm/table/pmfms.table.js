import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { AppTable, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, StatusById, StatusList } from '@sumaris-net/ngx-components';
import { debounceTime, filter } from 'rxjs/operators';
import { environment } from '@environments/environment';
let PmfmsTable = class PmfmsTable extends AppTable {
    constructor(injector, formBuilder, cd) {
        super(injector, 
        // columns
        RESERVED_START_COLUMNS
            .concat([
            'name',
            'unit',
            'matrix',
            'fraction',
            'method',
            'status'
        ])
            .concat(RESERVED_END_COLUMNS));
        this.cd = cd;
        this.statusList = StatusList;
        this.statusById = StatusById;
        this.showToolbar = false;
        this.showFilter = true;
        this.allowMultipleSelection = true;
        this.showPaginator = true;
        this.sticky = true;
        this.i18nColumnPrefix = 'REFERENTIAL.';
        this.inlineEdition = false;
        this.autoLoad = false; // waiting dataSource to be set
        this.filterForm = formBuilder.group({
            searchText: [null]
        });
        // Update filter when changes
        this.registerSubscription(this.filterForm.valueChanges
            .pipe(debounceTime(250), filter(() => this.filterForm.valid))
            // Applying the filter
            .subscribe((json) => this.setFilter(Object.assign(Object.assign({}, this.filter), json), { emitEvent: this.mobile })));
        this.debug = !environment.production;
    }
    clearControlValue(event, formControl) {
        if (event)
            event.stopPropagation(); // Avoid to enter input the field
        formControl.setValue(null);
        return false;
    }
    /* -- protected methods -- */
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmsTable.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmsTable.prototype, "showFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmsTable.prototype, "allowMultipleSelection", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmsTable.prototype, "showPaginator", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmsTable.prototype, "sticky", void 0);
PmfmsTable = __decorate([
    Component({
        selector: 'app-pmfms-table',
        templateUrl: './pmfms.table.html',
        styleUrls: ['./pmfms.table.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        ChangeDetectorRef])
], PmfmsTable);
export { PmfmsTable };
//# sourceMappingURL=pmfms.table.js.map