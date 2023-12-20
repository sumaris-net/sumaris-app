import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { firstValueFrom, isObservable, Observable } from 'rxjs';
import { filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MeasurementValuesUtils } from './measurement.model';
import { EntityUtils, firstNotNil, firstNotNilPromise, InMemoryEntitiesService, isNil, isNotNil, StartableService, waitForFalse, } from '@sumaris-net/ngx-components';
import { Directive, Injector, Optional } from '@angular/core';
import { PMFM_ID_REGEXP } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { equals } from '@app/shared/functions';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';
let MeasurementsTableEntitiesService = class MeasurementsTableEntitiesService extends StartableService {
    constructor(injector, dataType, delegate, options) {
        super(null);
        this.dataType = dataType;
        this.options = options;
        this._delegate = delegate;
        this.programRefService = injector.get(ProgramRefService);
        // Init state defaults
        const requiredGear = (options === null || options === void 0 ? void 0 : options.requiredGear) === true;
        this._state.set({
            requiredStrategy: options === null || options === void 0 ? void 0 : options.requiredStrategy,
            strategyId: null,
            strategyLabel: null,
            requiredGear,
            gearId: requiredGear ? undefined : null,
        });
        // Load pmfms
        this._state.connect('pmfms', this._state.select(['programLabel', 'acquisitionLevel', 'requiredStrategy', 'strategyId', 'strategyLabel', 'requiredGear', 'gearId'], s => s)
            .pipe(filter((s) => this.canLoadPmfms(s)), switchMap((s) => this.watchProgramPmfms(s))));
        // Apply pmfms
        this._state.hold(this.pmfms$, (pmfms) => this.applyPmfms(pmfms));
        // DEBUG
        this._debug = options && options.debug;
    }
    set delegate(value) {
        this._delegate = value;
    }
    get delegate() {
        return this._delegate;
    }
    get stopped() {
        return super.stopped || this.pmfms === undefined || false;
    }
    ngOnStart() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.stopped)
                throw Error('MeasurementService is not restartable!');
            try {
                return yield firstValueFrom(firstNotNil(this.pmfms$));
            }
            catch (err) {
                if (this.stopped) {
                    // Service stopped: silent
                }
                else {
                    console.error(err);
                }
            }
        });
    }
    ngOnStop() {
        return __awaiter(this, void 0, void 0, function* () {
            this._state.ngOnDestroy();
            if (this._delegate instanceof InMemoryEntitiesService) {
                yield this._delegate.stop();
            }
        });
    }
    set(state) {
        this._state.set(state);
    }
    watchAll(offset, size, sortBy, sortDirection, selectionFilter, options) {
        if (!this.started)
            this.start();
        return this.pmfms$
            .pipe(filter(isNotNil), switchMap(pmfms => {
            let cleanSortBy = sortBy;
            // Do not apply sortBy to delegated service, when sort on a pmfm
            let sortPmfm;
            if (cleanSortBy && PMFM_ID_REGEXP.test(cleanSortBy)) {
                sortPmfm = pmfms.find(pmfm => pmfm.id === parseInt(sortBy));
                // A pmfm was found, do not apply the sort here
                if (sortPmfm)
                    cleanSortBy = undefined;
            }
            return this.delegate.watchAll(offset, size, cleanSortBy, sortDirection, selectionFilter, options)
                .pipe(map((res) => {
                // Prepare measurement values for reactive form
                res.data = (res.data || []).slice();
                res.data.forEach(entity => MeasurementValuesUtils.normalizeEntityToForm(entity, pmfms));
                // Apply sort on pmfm
                if (sortPmfm) {
                    // Compute attributes path
                    cleanSortBy = 'measurementValues.' + sortBy;
                    if (sortPmfm.type === 'qualitative_value') {
                        cleanSortBy += '.label';
                    }
                    // Execute a simple sort
                    res.data = EntityUtils.sort(res.data, cleanSortBy, sortDirection);
                }
                return res;
            }));
        }));
    }
    saveAll(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._debug)
                console.debug('[meas-service] converting measurement values before saving...');
            const pmfms = this.pmfms || [];
            const dataToSaved = data.map(json => {
                const entity = new this.dataType();
                entity.fromObject(json);
                // Adapt measurementValues to entity, but :
                // - keep the original JSON object measurementValues, because may be still used (e.g. in table without validator, in row.currentData)
                // - keep extra pmfm's values, because table can have filtered pmfms, to display only mandatory PMFM (e.g. physical gear table)
                entity.measurementValues = Object.assign({}, json.measurementValues, MeasurementValuesUtils.normalizeValuesToModel(json.measurementValues, pmfms));
                return entity;
            });
            return this.delegate.saveAll(dataToSaved, options);
        });
    }
    deleteAll(data, options) {
        return this.delegate.deleteAll(data, options);
    }
    asFilter(filter) {
        return this.delegate.asFilter(filter);
    }
    waitIdle(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            yield waitForFalse(this.loading$, opts);
        });
    }
    /* -- private methods -- */
    canLoadPmfms(state) {
        if (isNil(state.programLabel) || isNil(state.acquisitionLevel)) {
            return false;
        }
        if (state.requiredStrategy && isNil(state.strategyLabel) && isNil(state.strategyId)) {
            //if (this._debug)
            console.debug('[meas-service] Cannot watch Pmfms yet. Missing required strategy.');
            return false;
        }
        if (state.requiredGear && isNil(state.gearId)) {
            if (this._debug)
                console.debug('[meas-service] Cannot watch Pmfms yet. Missing required \'gearId\'.');
            return false;
        }
        return true;
    }
    watchProgramPmfms(state) {
        this.markAsLoading();
        // DEBUG
        //if (this._debug)
        console.debug(`[meas-service] Loading pmfms... {program: '${state.programLabel}', acquisitionLevel: '${state.acquisitionLevel}', strategyId: ${state.strategyId} (required? ${state.requiredStrategy}), gearId: ${state.gearId}}}̀̀`);
        // Watch pmfms
        let pmfm$ = this.programRefService.watchProgramPmfms(state.programLabel, {
            acquisitionLevel: state.acquisitionLevel,
            strategyId: state.strategyId,
            strategyLabel: state.strategyLabel,
            gearId: state.gearId
        })
            .pipe(takeUntil(this.stopSubject));
        // DEBUG log
        if (this._debug) {
            pmfm$ = pmfm$.pipe(tap(pmfms => {
                if (!pmfms.length) {
                    console.debug(`[meas-service] No pmfm found for {program: '${this.programLabel}', acquisitionLevel: '${state.acquisitionLevel}', strategyLabel: '${state.strategyLabel}'}. Please fill program's strategies !`);
                }
                else {
                    console.debug(`[meas-service] Pmfm found for {program: '${this.programLabel}', acquisitionLevel: '${state.acquisitionLevel}', strategyLabel: '${state.strategyLabel}'}`, pmfms);
                }
            }));
        }
        return pmfm$;
    }
    applyPmfms(pmfms) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!pmfms)
                return false; // skip
            this.markAsLoading();
            try {
                // Wait loaded
                if (isObservable(pmfms)) {
                    if (this._debug)
                        console.debug(`[meas-service] setPmfms(): waiting pmfms observable...`);
                    pmfms = yield firstNotNilPromise(pmfms, { stop: this.stopSubject });
                    if (this._debug)
                        console.debug(`[meas-service] setPmfms(): waiting pmfms observable [OK]`);
                }
                // Map
                if (this.options && this.options.mapPmfms) {
                    pmfms = yield this.options.mapPmfms(pmfms);
                }
                // Make pmfms is an array
                if (!Array.isArray(pmfms)) {
                    console.error(`[meas-service] Invalid pmfms. Should be an array:`, pmfms);
                    return false;
                }
                // Check if changes
                if (equals(pmfms, this.pmfms))
                    return false; // Skip if same
                // DEBUG log
                //if (this._debug) console.debug(`[meas-service] Pmfms to applied: `, pmfms);
                this.pmfms = pmfms;
                return true;
            }
            catch (err) {
                if (!this.stopped) {
                    console.error(`[meas-service] Error while applying pmfms: ${err && err.message || err}`, err);
                }
            }
            finally {
                // Mark as loaded
                this.markAsLoaded();
            }
        });
    }
    markAsLoading() {
        if (!this.loading) {
            this.loading = true;
        }
    }
    markAsLoaded() {
        if (this.loading) {
            this.loading = false;
        }
    }
};
__decorate([
    RxStateRegister(),
    __metadata("design:type", RxState)
], MeasurementsTableEntitiesService.prototype, "_state", void 0);
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], MeasurementsTableEntitiesService.prototype, "pmfms$", void 0);
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], MeasurementsTableEntitiesService.prototype, "loading$", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", String)
], MeasurementsTableEntitiesService.prototype, "programLabel", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", String)
], MeasurementsTableEntitiesService.prototype, "acquisitionLevel", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Boolean)
], MeasurementsTableEntitiesService.prototype, "requiredStrategy", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Number)
], MeasurementsTableEntitiesService.prototype, "strategyId", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", String)
], MeasurementsTableEntitiesService.prototype, "strategyLabel", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Boolean)
], MeasurementsTableEntitiesService.prototype, "requiredGear", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Number)
], MeasurementsTableEntitiesService.prototype, "gearId", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Array)
], MeasurementsTableEntitiesService.prototype, "pmfms", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Boolean)
], MeasurementsTableEntitiesService.prototype, "loading", void 0);
MeasurementsTableEntitiesService = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __param(3, Optional()),
    __metadata("design:paramtypes", [Injector, Function, Object, Object])
], MeasurementsTableEntitiesService);
export { MeasurementsTableEntitiesService };
//# sourceMappingURL=measurements-table.service.js.map