import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AccountService, isNotNil, PlatformService } from '@sumaris-net/ngx-components';
import { ProgramProperties } from '../services/config/program.config';
import { Strategy } from '../services/model/strategy.model';
import { ProgramService } from '../services/program.service';
import { ReferentialRefService } from '../services/referential-ref.service';
import { SamplingStrategiesTable } from './sampling/sampling-strategies.table';
import { StrategiesTable } from './strategies.table';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ContextService } from '@app/shared/context.service';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { NavController } from '@ionic/angular';
// app-strategies-page
let StrategiesPage = class StrategiesPage {
    constructor(route, router, navController, referentialRefService, programService, programRefService, accountService, platformService, context, cd) {
        this.route = route;
        this.router = router;
        this.navController = navController;
        this.referentialRefService = referentialRefService;
        this.programService = programService;
        this.programRefService = programRefService;
        this.accountService = accountService;
        this.platformService = platformService;
        this.context = context;
        this.cd = cd;
        this.error = null;
        this.enabled = false;
        this.canEdit = false;
        this.canDelete = false;
        this.i18nSuffix = '';
        this.$title = new Subject();
        this.mobile = platformService.mobile;
        const id = this.route.snapshot.params['programId'];
        if (isNotNil(id)) {
            this.load(+id);
        }
    }
    get table() {
        return this.strategyEditor !== 'sampling' ? this.legacyTable : this.samplingTable;
    }
    get loading() {
        var _a;
        return (_a = this.table) === null || _a === void 0 ? void 0 : _a.loading;
    }
    get filterExpansionPanel() {
        var _a;
        return (_a = this.samplingTable) === null || _a === void 0 ? void 0 : _a.filterExpansionPanel;
    }
    get filterCriteriaCount() {
        var _a;
        return (_a = this.samplingTable) === null || _a === void 0 ? void 0 : _a.filterCriteriaCount;
    }
    ngOnInit() {
        // Make to remove old contextual values
        this.resetContext();
    }
    load(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Force the load from network
                const program = yield this.programService.load(id, Object.assign(Object.assign({}, opts), { fetchPolicy: 'network-only' }));
                this.data = program;
                // Check user rights (always readonly if mobile)
                this.canEdit = !this.mobile && this.canUserWrite(program);
                this.canDelete = this.canEdit;
                // Read program's properties
                this.strategyEditor = program.getProperty(ProgramProperties.STRATEGY_EDITOR);
                const i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
                this.i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
                this.$title.next(program.label);
                this.cd.markForCheck();
            }
            catch (err) {
                console.error(err);
                this.error = err && err.message || err;
            }
        });
    }
    onOpenRow(row) {
        return this.navController.navigateForward(['referential', 'programs', this.data.id, 'strategies', this.strategyEditor, row.currentData.id], {
            queryParams: {}
        });
    }
    onNewRow(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return; // Skip
            this.markAsLoading({ emitEvent: false });
            try {
                yield this.navController.navigateForward(['referential', 'programs', this.data.id, 'strategies', this.strategyEditor, 'new'], {
                    queryParams: {}
                });
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    onNewDataFromRow(row, acquisitionLevel) {
        var _a, _b;
        const strategy = row.currentData;
        // Store strategy in context
        this.setContext(strategy);
        // Redirect to editor
        switch (acquisitionLevel) {
            case AcquisitionLevelCodes.LANDING:
                const editor = this.data.getProperty(ProgramProperties.LANDING_EDITOR);
                return this.navController.navigateForward(`/observations/landings/${editor}/new`, {
                    queryParams: {
                        parent: AcquisitionLevelCodes.OBSERVED_LOCATION,
                        program: (_a = this.data) === null || _a === void 0 ? void 0 : _a.label,
                        strategyLabel: strategy.label
                    }
                });
            case AcquisitionLevelCodes.OBSERVED_LOCATION:
            default:
                return this.navController.navigateForward('/observations/new', {
                    queryParams: {
                        program: (_b = this.data) === null || _b === void 0 ? void 0 : _b.label
                    }
                });
        }
    }
    markAsLoading(opts) {
        var _a;
        (_a = this.table) === null || _a === void 0 ? void 0 : _a.markAsLoading(opts);
    }
    markAsLoaded(opts) {
        var _a;
        (_a = this.table) === null || _a === void 0 ? void 0 : _a.markAsLoaded(opts);
    }
    doRefresh(event) {
        var _a;
        (_a = this.table) === null || _a === void 0 ? void 0 : _a.doRefresh(event);
    }
    resetFilter(event) {
        var _a;
        (_a = this.samplingTable) === null || _a === void 0 ? void 0 : _a.resetFilter(event);
    }
    canUserWrite(data) {
        return this.programService.canUserWrite(data);
    }
    setContext(strategy) {
        var _a;
        this.context.setValue('program', (_a = this.data) === null || _a === void 0 ? void 0 : _a.clone());
        this.context.setValue('strategy', Strategy.fromObject(strategy));
    }
    resetContext() {
        this.context.reset();
    }
};
__decorate([
    ViewChild('legacyTable', { static: false }),
    __metadata("design:type", StrategiesTable)
], StrategiesPage.prototype, "legacyTable", void 0);
__decorate([
    ViewChild('samplingTable', { static: false }),
    __metadata("design:type", SamplingStrategiesTable)
], StrategiesPage.prototype, "samplingTable", void 0);
StrategiesPage = __decorate([
    Component({
        selector: 'app-strategies-page',
        templateUrl: 'strategies.page.html',
        styleUrls: ['strategies.page.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(8, Inject(ContextService)),
    __metadata("design:paramtypes", [ActivatedRoute,
        Router,
        NavController,
        ReferentialRefService,
        ProgramService,
        ProgramRefService,
        AccountService,
        PlatformService,
        ContextService,
        ChangeDetectorRef])
], StrategiesPage);
export { StrategiesPage };
//# sourceMappingURL=strategies.page.js.map