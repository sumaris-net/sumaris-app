var CatchBatchForm_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, forwardRef, Injector, Input } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { BatchValidatorService } from '../common/batch.validator';
import { isNotEmptyArray } from '@sumaris-net/ngx-components';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes, MatrixIds, PmfmIds } from '@app/referential/services/model/model.enum';
import { BatchForm } from '@app/trip/batch/common/batch.form';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { environment } from '@environments/environment';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
let CatchBatchForm = CatchBatchForm_1 = class CatchBatchForm extends BatchForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, referentialRefService, validatorService) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, referentialRefService, validatorService);
        this.gearPmfms$ = this._state.select('gearPmfms');
        this.onDeckPmfms$ = this._state.select('onDeckPmfms');
        this.sortingPmfms$ = this._state.select('sortingPmfms');
        this.catchPmfms$ = this._state.select('catchPmfms');
        this.otherPmfms$ = this._state.select('otherPmfms');
        this.gridColCount$ = this._state.select('gridColCount');
        this.labelColSize = 1;
        this.rxStrategy = 'userBlocking';
        // Set defaults
        this.acquisitionLevel = AcquisitionLevelCodes.CATCH_BATCH;
        this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
        this.showTaxonGroup = false;
        this.showTaxonName = false;
        //this.samplingBatchEnabled = false;
        // DEBUG
        this.debug = !environment.production;
    }
    enable(opts) {
        super.enable(opts);
    }
    get otherPmfms() {
        return this._state.get('otherPmfms');
    }
    /* -- protected functions -- */
    // @ts-ignore
    dispatchPmfms(pmfms) {
        const _super = Object.create(null, {
            dispatchPmfms: { get: () => super.dispatchPmfms }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!pmfms)
                return; // Skip
            // If a catch batch (root)
            if (this.acquisitionLevel === AcquisitionLevelCodes.CATCH_BATCH) {
                const { weightPmfms, defaultWeightPmfm, weightPmfmsByMethod, pmfms: updatedPmfms } = yield _super.dispatchPmfms.call(this, pmfms);
                const onDeckPmfms = pmfms.filter(p => { var _a; return ((_a = p.label) === null || _a === void 0 ? void 0 : _a.indexOf('ON_DECK_')) === 0; });
                const sortingPmfms = pmfms.filter(p => { var _a; return ((_a = p.label) === null || _a === void 0 ? void 0 : _a.indexOf('SORTING_')) === 0; });
                const catchPmfms = pmfms.filter(p => {
                    var _a;
                    return (PmfmUtils.isWeight(p) || ((_a = p.label) === null || _a === void 0 ? void 0 : _a.indexOf('_WEIGHT')) !== -1)
                        && !onDeckPmfms.includes(p)
                        && !sortingPmfms.includes(p);
                });
                const gearPmfms = pmfms.filter(p => p.matrixId === MatrixIds.GEAR || p.id === PmfmIds.CHILD_GEAR);
                // Compute grid column count
                const gridColCount = this.labelColSize /*label*/
                    + Math.min(3, Math.max(onDeckPmfms.length, sortingPmfms.length, catchPmfms.length, gearPmfms.length));
                const otherPmfms = pmfms.filter(p => !onDeckPmfms.includes(p)
                    && !sortingPmfms.includes(p)
                    && !catchPmfms.includes(p)
                    && !gearPmfms.includes(p));
                // Update state
                return {
                    weightPmfms,
                    defaultWeightPmfm,
                    weightPmfmsByMethod,
                    onDeckPmfms,
                    sortingPmfms,
                    catchPmfms,
                    gearPmfms,
                    otherPmfms,
                    pmfms: updatedPmfms,
                    hasContent: pmfms.length > 0,
                    gridColCount,
                    showWeight: false,
                    showIndividualCount: false,
                    showSamplingBatch: false,
                    samplingBatchEnabled: false,
                    showEstimatedWeight: false,
                    showExhaustiveInventory: false
                };
            }
            // When using inside a batch tree (.e.g need by APASE)
            else {
                const state = yield _super.dispatchPmfms.call(this, pmfms);
                // Reset some attributes, to keep value from @Input()
                delete state.samplingBatchEnabled;
                delete state.showSamplingBatch;
                return Object.assign(Object.assign({}, state), { onDeckPmfms: [], sortingPmfms: [], catchPmfms: [], gearPmfms: [], otherPmfms: [], gridColCount: 12, showWeight: isNotEmptyArray(state.weightPmfms) });
            }
        });
    }
    listenHasContent() {
        return combineLatest([
            super.listenHasContent(),
            this._state.select('showExhaustiveInventory'),
            this._state.select(['onDeckPmfms', 'sortingPmfms', 'catchPmfms', 'gearPmfms', 'otherPmfms'], pmfmsMap => Object.values(pmfmsMap).some(isNotEmptyArray))
            // DEBUG
            //.pipe(tap(hasPmfms => console.debug(this._logPrefix + ' listenHasContent() - hasPmfms=' + hasPmfms)))
        ])
            .pipe(map(values => values.some(v => v === true)));
    }
    markAsPristine(opts) {
        super.markAsPristine(opts);
    }
    markAsUntouched(opts) {
        super.markAsUntouched(opts);
    }
    markAsDirty(opts) {
        super.markAsDirty(opts);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], CatchBatchForm.prototype, "labelColSize", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], CatchBatchForm.prototype, "rxStrategy", void 0);
CatchBatchForm = CatchBatchForm_1 = __decorate([
    Component({
        selector: 'app-form-catch-batch',
        templateUrl: './catch.form.html',
        styleUrls: ['./catch.form.scss'],
        providers: [
            { provide: BatchValidatorService, useClass: BatchValidatorService },
            { provide: BatchForm, useExisting: forwardRef(() => CatchBatchForm_1) },
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        ReferentialRefService,
        BatchValidatorService])
], CatchBatchForm);
export { CatchBatchForm };
//# sourceMappingURL=catch.form.js.map