import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { AccountService, AppEntityEditor, firstNotNilPromise, isNil, isNotEmptyArray, isNotNil, PlatformService, SharedValidators, StatusIds, toNumber, } from '@sumaris-net/ngx-components';
import { ProgramProperties } from '../../services/config/program.config';
import { PmfmStrategy } from '../../services/model/pmfm-strategy.model';
import { PmfmService } from '../../services/pmfm.service';
import { SamplingStrategyForm } from './sampling-strategy.form';
import { BehaviorSubject } from 'rxjs';
import { ProgramService } from '../../services/program.service';
import { AcquisitionLevelCodes, PmfmIds } from '../../services/model/model.enum';
import { SamplingStrategyService } from '@app/referential/services/sampling-strategy.service';
import { SamplingStrategy } from '@app/referential/services/model/sampling-strategy.model';
import moment from 'moment';
let SamplingStrategyPage = class SamplingStrategyPage extends AppEntityEditor {
    constructor(injector, formBuilder, accountService, samplingStrategyService, programService, pmfmService, platform) {
        super(injector, SamplingStrategy, samplingStrategyService, {
            pathIdAttribute: 'strategyId',
            tabCount: 1,
            enableListenChanges: true,
        });
        this.injector = injector;
        this.formBuilder = formBuilder;
        this.accountService = accountService;
        this.samplingStrategyService = samplingStrategyService;
        this.programService = programService;
        this.pmfmService = pmfmService;
        this.platform = platform;
        this.$program = new BehaviorSubject(null);
        // default values
        this.defaultBackHref = '/referential/programs';
        this._enabled = this.accountService.isAdmin();
    }
    get form() {
        return this.strategyForm.form;
    }
    ngOnInit() {
        super.ngOnInit();
        // Update back href, when program changed
        this.registerSubscription(this.$program.subscribe((program) => this.setProgram(program)));
    }
    load(id, opts) {
        const _super = Object.create(null, {
            load: { get: () => super.load }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Force the load from network
            return _super.load.call(this, id, Object.assign(Object.assign({}, opts), { fetchPolicy: 'network-only' }));
        });
    }
    canUserWrite(data, opts) {
        return super.canUserWrite(data, Object.assign(Object.assign({}, opts), { 
            // Important: sent the opts.program, to check if user is a program manager
            program: this.$program.value }));
    }
    /* -- protected functions -- */
    onNewEntity(data, options) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onNewEntity.call(this, data, options);
            // Load program, form the route path
            if (options && isNotNil(options.programId)) {
                const program = yield this.programService.load(options.programId);
                this.$program.next(program);
                data.programId = program && program.id;
            }
            // Set defaults
            data.statusId = toNumber(data.statusId, StatusIds.ENABLE);
            data.creationDate = moment();
            // Fill default PmfmStrategy (e.g. the PMFM to store the strategy's label)
            this.fillPmfmStrategyDefaults(data);
            this.markAsPristine();
            this.markAsReady();
        });
    }
    onEntityLoaded(data, options) {
        const _super = Object.create(null, {
            onEntityLoaded: { get: () => super.onEntityLoaded }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onEntityLoaded.call(this, data, options);
            // Load program, form the entity's program
            if (data && isNotNil(data.programId)) {
                const program = yield this.programService.load(data.programId);
                this.$program.next(program);
            }
            // Load full analytic reference, from label
            if (data.analyticReference && typeof data.analyticReference === 'string') {
                data.analyticReference = yield this.samplingStrategyService.loadAnalyticReferenceByLabel(data.analyticReference);
            }
            this.markAsReady();
        });
    }
    onEntitySaved(data) {
        const _super = Object.create(null, {
            onEntitySaved: { get: () => super.onEntitySaved }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onEntitySaved.call(this, data);
            // Restore analyticReference object
            data.analyticReference = this.form.get('analyticReference').value;
        });
    }
    registerForms() {
        this.addChildForm(this.strategyForm);
    }
    setProgram(program) {
        if (program && isNotNil(program.id)) {
            this.defaultBackHref = `/referential/programs/${program.id}/strategies`;
            this.markForCheck();
        }
    }
    /**
     * Compute the title
     *
     * @param data
     * @param opts
     */
    computeTitle(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = yield firstNotNilPromise(this.$program, { stop: this.destroySubject });
            let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            i18nSuffix = (i18nSuffix !== 'legacy' && i18nSuffix) || '';
            // new strategy
            if (!data || isNil(data.id)) {
                return this.translate.instant(`PROGRAM.STRATEGY.NEW.${i18nSuffix}TITLE`);
            }
            // Existing strategy
            return this.translate.instant(`PROGRAM.STRATEGY.EDIT.${i18nSuffix}TITLE`, {
                program: program.label,
                label: data && data.label,
            });
        });
    }
    getFirstInvalidTabIndex() {
        if (this.strategyForm.invalid)
            return 0;
        return -1;
    }
    loadFromRoute() {
        return super.loadFromRoute();
    }
    setValue(data, opts) {
        if (!data)
            return; // Skip
        this.strategyForm.setValue(data);
    }
    getValue() {
        return __awaiter(this, void 0, void 0, function* () {
            const value = (yield this.strategyForm.getValue());
            // Add default PmfmStrategy
            this.fillPmfmStrategyDefaults(value);
            return value;
        });
    }
    /**
     * Clear previous cannotComputeTaxonCode warning / error if label match regex constraints
     */
    clearCannotComputeTaxonBeforeSave() {
        return __awaiter(this, void 0, void 0, function* () {
            const taxonNameControl = this.strategyForm.taxonNamesHelper.at(0);
            if (taxonNameControl.hasError('cannotComputeTaxonCode')) {
                const labelRegex = new RegExp(/^\d\d[a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z]\d\d\d/);
                if (this.form.get('label').value.match(labelRegex)) {
                    SharedValidators.clearError(taxonNameControl, 'cannotComputeTaxonCode');
                }
            }
        });
    }
    save(event, options) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Disable form listeners (e.g. label)
            this.strategyForm.setDisableEditionListeners(true);
            // Prepare label
            this.form.get('label').setValue((_a = this.form.get('label').value) === null || _a === void 0 ? void 0 : _a.replace(/\s/g, '')); // remove whitespace
            yield this.clearCannotComputeTaxonBeforeSave();
            this.form.get('label').updateValueAndValidity();
            try {
                // Call inherited save
                return yield _super.save.call(this, event, options);
            }
            finally {
                // Enable form listeners
                this.strategyForm.setDisableEditionListeners(false);
            }
        });
    }
    /**
     * Fill default PmfmStrategy (e.g. the PMFM to store the strategy's label)
     *
     * @param target
     */
    fillPmfmStrategyDefaults(target) {
        var _a, _b, _c, _d, _e, _f;
        target.pmfms = target.pmfms || [];
        const pmfmIds = [];
        target.pmfms.forEach((pmfmStrategy) => {
            var _a;
            // Keep only pmfmId
            pmfmStrategy.pmfmId = toNumber((_a = pmfmStrategy.pmfm) === null || _a === void 0 ? void 0 : _a.id, pmfmStrategy.pmfmId);
            // delete pmfmStrategy.pmfm;
            // Remember PMFM Ids
            pmfmIds.push(pmfmStrategy.pmfmId);
        });
        // Add a Pmfm for the strategy label, if missing
        if (!pmfmIds.includes(PmfmIds.STRATEGY_LABEL)) {
            console.debug(`[sampling-strategy-page] Adding new PmfmStrategy on Pmfm {id: ${PmfmIds.STRATEGY_LABEL}} to hold the strategy label, on ${AcquisitionLevelCodes.LANDING}`);
            target.pmfms.push(PmfmStrategy.fromObject({
                // Restore existing id
                id: ((_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.pmfms.find((ps) => ps.pmfmId === PmfmIds.STRATEGY_LABEL && ps.acquisitionLevel === AcquisitionLevelCodes.LANDING)) === null || _b === void 0 ? void 0 : _b.id) ||
                    undefined,
                pmfm: { id: PmfmIds.STRATEGY_LABEL },
                acquisitionLevel: AcquisitionLevelCodes.LANDING,
                isMandatory: true,
                acquisitionNumber: 1,
                rankOrder: 1, // Should be the only one PmfmStrategy on Landing
            }));
        }
        // Add a TAG_ID Pmfm, if missing
        if (!pmfmIds.includes(PmfmIds.TAG_ID)) {
            console.debug(`[sampling-strategy-page] Adding new PmfmStrategy on Pmfm {id: ${PmfmIds.TAG_ID}} to hold the tag id, on ${AcquisitionLevelCodes.SAMPLE}`);
            target.pmfms.push(PmfmStrategy.fromObject({
                id: ((_d = (_c = this.data) === null || _c === void 0 ? void 0 : _c.pmfms.find((ps) => ps.pmfmId === PmfmIds.TAG_ID && ps.acquisitionLevel === AcquisitionLevelCodes.SAMPLE)) === null || _d === void 0 ? void 0 : _d.id) || undefined,
                pmfm: { id: PmfmIds.TAG_ID },
                acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
                isMandatory: false,
                acquisitionNumber: 1,
                rankOrder: 1, // Should be the only one PmfmStrategy on Landing
            }));
        }
        // Add a DRESSING_ID Pmfm, if missing
        if (!pmfmIds.includes(PmfmIds.DRESSING)) {
            console.debug(`[sampling-strategy-page] Adding new PmfmStrategy on Pmfm {id: ${PmfmIds.DRESSING}} to hold the dressing, on ${AcquisitionLevelCodes.SAMPLE}`);
            target.pmfms.push(PmfmStrategy.fromObject({
                id: ((_f = (_e = this.data) === null || _e === void 0 ? void 0 : _e.pmfms.find((ps) => ps.pmfmId === PmfmIds.DRESSING && ps.acquisitionLevel === AcquisitionLevelCodes.SAMPLE)) === null || _f === void 0 ? void 0 : _f.id) || undefined,
                pmfm: { id: PmfmIds.DRESSING },
                acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
                isMandatory: true,
                acquisitionNumber: 1,
                rankOrder: 2, // Should be the only one PmfmStrategy on Landing
            }));
        }
        // Remove unused attributes
        delete target.denormalizedPmfms;
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { matIcon: 'date_range', title: `${this.data.label} - ${this.data.name}`, subtitle: 'REFERENTIAL.ENTITY.PROGRAM' });
        });
    }
    updateRoute(data, queryParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = this.computePageUrl(isNotNil(data.id) ? data.id : 'new');
            const commands = path && typeof path === 'string' ? path.split('/') : path;
            if (isNotEmptyArray(commands)) {
                commands.pop();
                // commands.push('strategy');
                // commands.push('sampling');
                // commands.push(data.id);
                return yield this.router.navigate(commands, {
                    replaceUrl: true,
                    queryParams: this.queryParams,
                });
            }
            else {
                console.warn('Skip page route update. Invalid page path: ', path);
            }
        });
    }
};
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", SamplingStrategyForm)
], SamplingStrategyPage.prototype, "strategyForm", void 0);
SamplingStrategyPage = __decorate([
    Component({
        selector: 'app-sampling-strategy-page',
        templateUrl: 'sampling-strategy.page.html',
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        AccountService,
        SamplingStrategyService,
        ProgramService,
        PmfmService,
        PlatformService])
], SamplingStrategyPage);
export { SamplingStrategyPage };
//# sourceMappingURL=sampling-strategy.page.js.map