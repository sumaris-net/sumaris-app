var SelectivityOperationPage_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { DateUtils, fadeInOutAnimation } from '@sumaris-net/ngx-components';
import { TripContextService } from '@app/trip/trip-context.service';
import { OperationPage } from '@app/trip/operation/operation.page';
import { OperationService } from '@app/trip/operation/operation.service';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import moment from 'moment';
import { environment } from '@environments/environment';
import { RxState } from '@rx-angular/state';
import { ContextService } from '@app/shared/context.service';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
let SelectivityOperationPage = SelectivityOperationPage_1 = class SelectivityOperationPage extends OperationPage {
    get invalid() {
        var _a, _b;
        // Allow batchTree to be invalid, if on field mode
        return ((_a = this.opeForm) === null || _a === void 0 ? void 0 : _a.invalid) || ((_b = this.measurementsForm) === null || _b === void 0 ? void 0 : _b.invalid) || (!this.isOnFieldMode && this.batchTree.invalid) || false;
    }
    constructor(injector, dataService) {
        super(injector, dataService, {
            pathIdAttribute: 'selectivityOperationId',
            tabCount: 2,
        });
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    registerForms() {
        // Register sub forms & table
        this.addChildForms([this.opeForm, this.measurementsForm, this.batchTree]);
    }
    mapPmfms(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!event || !event.detail.success)
                return; // Skip (missing callback)
            let pmfms = event.detail.pmfms;
            // If PMFM date/time, set default date, in on field mode
            if (this.isNewData && this.isOnFieldMode && (pmfms === null || pmfms === void 0 ? void 0 : pmfms.some(PmfmUtils.isDate))) {
                pmfms = pmfms.map((p) => {
                    if (PmfmUtils.isDate(p)) {
                        p = p.clone();
                        p.defaultValue = DateUtils.markNoTime(DateUtils.resetTime(moment()));
                    }
                    return p;
                });
            }
            event.detail.success(pmfms);
        });
    }
    updateFormGroup(event) {
        event.detail.success();
    }
    onNewFabButtonClick(event) {
        const selectedTabIndex = this.selectedTabIndex;
        if (selectedTabIndex === OperationPage.TABS.CATCH) {
            this.batchTree.addRow(event);
        }
        else {
            super.onNewFabButtonClick(event);
        }
    }
    get showFabButton() {
        return false;
    }
    saveAndControl(event, opts) {
        const _super = Object.create(null, {
            saveAndControl: { get: () => super.saveAndControl }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (this.batchTree.dirty) {
                yield this.batchTree.save();
            }
            return _super.saveAndControl.call(this, event, opts);
        });
    }
    updateTablesState() {
        this.tabCount = this.showCatchTab ? 2 : 1;
        super.updateTablesState();
    }
    setProgram(program) {
        const _super = Object.create(null, {
            setProgram: { get: () => super.setProgram }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.setProgram.call(this, program);
            // Force suffix
            this.i18nContext.suffix = 'TRAWL_SELECTIVITY.';
            // Force rankOrder to be recompute
            // this is required because batch tree container can generate same batch label, for individual sorting batch
            this.saveOptions.computeBatchRankOrder = true;
        });
    }
    computePageUrl(id, tripId) {
        const parentUrl = this.getParentPageUrl();
        return parentUrl && `${parentUrl}/operation/selectivity/${id}`;
    }
    getFirstInvalidTabIndex() {
        var _a, _b;
        // find invalids tabs (keep order)
        const invalidTabs = [this.opeForm.invalid || this.measurementsForm.invalid, (this.showCatchTab && ((_a = this.batchTree) === null || _a === void 0 ? void 0 : _a.invalid)) || false];
        // Open the first invalid tab
        const invalidTabIndex = invalidTabs.indexOf(true);
        // If catch tab, open the invalid sub tab
        if (invalidTabIndex === OperationPage.TABS.CATCH) {
            this.selectedSubTabIndex = (_b = this.batchTree) === null || _b === void 0 ? void 0 : _b.getFirstInvalidTabIndex();
            this.updateTablesState();
        }
        return invalidTabIndex;
    }
};
SelectivityOperationPage = SelectivityOperationPage_1 = __decorate([
    Component({
        selector: 'app-selectivity-operation-page',
        templateUrl: './selectivity-operation.page.html',
        styleUrls: ['../operation.page.scss'],
        animations: [fadeInOutAnimation],
        providers: [
            { provide: APP_DATA_ENTITY_EDITOR, useExisting: SelectivityOperationPage_1 },
            { provide: ContextService, useExisting: TripContextService },
            RxState,
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector, OperationService])
], SelectivityOperationPage);
export { SelectivityOperationPage };
//# sourceMappingURL=selectivity-operation.page.js.map