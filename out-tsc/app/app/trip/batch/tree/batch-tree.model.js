var BatchModel_1, BatchModelFilter_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { arrayDistinct, Entity, EntityClass, EntityFilter, getPropertyByPath, isEmptyArray, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, isNotNilOrBlank, TreeItemEntityUtils, waitWhilePending, } from '@sumaris-net/ngx-components';
import { Batch } from '@app/trip/batch/common/batch.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { FormArray } from '@angular/forms';
import { MeasurementUtils, MeasurementValuesTypes, MeasurementValuesUtils, } from '@app/data/measurement/measurement.model';
import { RuleUtils } from '@app/referential/services/model/rule.model';
let BatchModel = BatchModel_1 = class BatchModel extends Entity {
    constructor(init) {
        super();
        this.parentId = null;
        this.parent = null;
        this.children = null;
        this.validator = init === null || init === void 0 ? void 0 : init.validator;
        if (init)
            Object.assign(this, init);
        this.state = {};
        this.childrenState = {};
    }
    static fromBatch(batch, pmfms, rules, 
    // Internal arguments (used by recursive call)
    maxTreeDepth = 4, treeDepth = 0, parent = null, path = '') {
        pmfms = pmfms || [];
        // Make sure the first batch is a catch batch
        const isCatchBatch = treeDepth === 0 || BatchUtils.isCatchBatch(batch);
        if (isCatchBatch && !batch) {
            batch = Batch.fromObject({ label: AcquisitionLevelCodes.CATCH_BATCH, rankOrder: 1 });
        }
        const model = new BatchModel_1({
            parent,
            path,
            originalData: batch
        });
        // Apply rule on childrenPmfms
        if (rules === null || rules === void 0 ? void 0 : rules.length) {
            // Build rules
            RuleUtils.build(rules, false /*keep previous compilation*/);
            pmfms = pmfms.filter(pmfm => RuleUtils.valid({ model, pmfm }, rules));
        }
        // Find the first QV pmfm
        const qvPmfm = PmfmUtils.getFirstQualitativePmfm(pmfms, {
            excludeHidden: true,
            minQvCount: 2,
            maxQvCount: 3,
            excludePmfmIds: [PmfmIds.CHILD_GEAR], // Avoid child gear be a qvPmfm
            //filterFn: pmfm => RuleUtils.valid({model, pmfm: pmfm}, rules)
        });
        if (qvPmfm) {
            const qvPmfmIndex = pmfms.indexOf(qvPmfm);
            if (qvPmfmIndex > 0) {
                model.state.pmfms = pmfms.slice(0, qvPmfmIndex);
            }
            // Prepare next iteration
            pmfms = pmfms.slice(qvPmfmIndex + 1);
            treeDepth++;
            if (treeDepth < maxTreeDepth && isNotEmptyArray(pmfms)) {
                const samplingBatch = BatchUtils.getSamplingChild(batch);
                const childLabelPrefix = isCatchBatch ?
                    `${AcquisitionLevelCodes.SORTING_BATCH}#` : `${(samplingBatch === null || samplingBatch === void 0 ? void 0 : samplingBatch.label) || batch.label}.`;
                const childrenPath = isCatchBatch ? 'children' :
                    (samplingBatch
                        ? `${path}.children.0.children`
                        : `${path}.children`);
                // Create children batches
                model.children = qvPmfm.qualitativeValues.map((qv, index) => {
                    const childQvPmfm = qvPmfm.clone();
                    childQvPmfm.hidden = true;
                    childQvPmfm.defaultValue = qv.id;
                    const childBatch = ((samplingBatch === null || samplingBatch === void 0 ? void 0 : samplingBatch.children) || batch.children || []).find(c => { var _a; return PmfmValueUtils.equals((_a = c.measurementValues) === null || _a === void 0 ? void 0 : _a[childQvPmfm.id], qv); })
                        || Batch.fromObject({
                            measurementValues: {
                                __typename: MeasurementValuesTypes.MeasurementModelValues,
                                [childQvPmfm.id]: qv.id.toString()
                            }
                        });
                    childBatch.measurementValues.__typename = childBatch.measurementValues.__typename || MeasurementValuesTypes.MeasurementModelValues;
                    childBatch.label = `${childLabelPrefix}${qv.label}`;
                    childBatch.rankOrder = index + 1;
                    // Recursive call
                    const childModel = BatchModel_1.fromBatch(childBatch, pmfms, rules, maxTreeDepth, treeDepth, model, `${childrenPath}.${index}`);
                    childModel.pmfms = [
                        childQvPmfm,
                        ...(childModel.pmfms || [])
                    ];
                    // Set name
                    childModel.name = qv.name;
                    return childModel;
                });
            }
            else {
                model.childrenPmfms = [
                    qvPmfm,
                    ...pmfms
                ];
            }
        }
        else {
            // No QV pmfm found
            model.pmfms = [];
            model.childrenPmfms = pmfms;
        }
        // Disabled root node, if no visible pmfms (e.g. when catch batch has no pmfm)
        model.disabled = !(model.pmfms || []).some(p => !p.hidden)
            && !model.isLeaf
            && !model.parent;
        // if is disabled and no parent
        model.hidden = model.disabled && !model.parent;
        // Leaf = leaf in the batch model tree, NOT in the final batch tree
        model.isLeaf = isEmptyArray(model.children) || isNotEmptyArray(model.childrenPmfms);
        model.pmfms = model.pmfms || [];
        model.childrenPmfms = model.childrenPmfms || [];
        model.state.showExhaustiveInventory = false;
        return model;
    }
    static equals(b1, b2) {
        return b1 && b2 && ((isNotNil(b1.id) && b1.id === b2.id)
            // Or by functional attributes
            // Same path
            || (b1.path === b2.path));
    }
    static isEmpty(b1) {
        return !b1 || (!b1.originalData && !b1.validator);
    }
    fromObject(source, opts) {
        var _a, _b;
        super.fromObject(source);
        this.name = source.name;
        this.icon = source.icon;
        this.originalData = source.originalData;
        this.state = source.rootState && {
            pmfms: source.state.pmfms || []
        } || {};
        this.childrenState = source.childrenState && {
            pmfms: source.childrenState.pmfms || []
        } || {};
        this.disabled = source.disabled || false;
        this.hidden = source.hidden || false;
        this.isLeaf = source.isLeaf || (((_b = (_a = this.childrenState) === null || _a === void 0 ? void 0 : _a.pmfms) === null || _b === void 0 ? void 0 : _b.length) > 0);
        this.path = source.path || null;
        this.parent = source.parent || null;
        this.children = source.children || source.children.map(BatchModel_1.fromObject) || null;
        this.rowCount = source.rowCount;
    }
    get fullName() {
        if (this.parent && this.parent.hidden !== true)
            return [this.parent.fullName, this.name].join(' &gt; ');
        return this.name;
    }
    get invalid() {
        return !this.valid;
    }
    get valid() {
        if (isNil(this._valid) && this.editing) {
            this._valid = this.validator.valid;
        }
        if (!this._valid)
            return false;
        return true;
        //return !this.children || !this.children.some(c => !c.valid);
    }
    set valid(value) {
        this._valid = value;
    }
    get rowCount() {
        var _a;
        if (isNil(this._rowCount) && this.isLeaf) {
            const data = this.validator.value;
            const samplingBatch = BatchUtils.getSamplingChild(data) || data;
            this._rowCount = ((_a = samplingBatch === null || samplingBatch === void 0 ? void 0 : samplingBatch.children) === null || _a === void 0 ? void 0 : _a.length) || 0;
        }
        return this._rowCount || 0;
    }
    set rowCount(value) {
        this._rowCount = value;
    }
    get childrenValid() {
        return !this.children || !this.children.some(c => !c.valid);
    }
    get childrenInvalid() {
        return !this.childrenValid;
    }
    get dirty() {
        var _a;
        return ((_a = this.validator) === null || _a === void 0 ? void 0 : _a.dirty) || false;
    }
    get touched() {
        return this.validator.touched;
    }
    get untouched() {
        return this.validator.untouched;
    }
    get editing() {
        var _a;
        return ((_a = this.validator) === null || _a === void 0 ? void 0 : _a.enabled) || false;
    }
    set editing(enable) {
        var _a, _b;
        if (enable) {
            this.validator.enable({ onlySelf: true });
            let childrenForm = this.validator.get('children');
            if (((_a = this.state) === null || _a === void 0 ? void 0 : _a.showSamplingBatch) && childrenForm instanceof FormArray) {
                childrenForm = (_b = childrenForm.at(0)) === null || _b === void 0 ? void 0 : _b.get('children');
            }
            childrenForm === null || childrenForm === void 0 ? void 0 : childrenForm.disable({ onlySelf: true });
        }
        else {
            if (this.validator.enabled) {
                // Save the valid state
                this._valid = this.validator.valid;
            }
            this.validator.disable();
        }
    }
    get isExpanded() {
        return !this.isLeaf;
    }
    isValid() {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            // Enable temporarily the validator to get the valid status
            const disabled = (_a = this.validator) === null || _a === void 0 ? void 0 : _a.disabled;
            if (disabled) {
                this.validator.enable({ emitEvent: false, onlySelf: true });
            }
            try {
                if (!((_b = this.validator) === null || _b === void 0 ? void 0 : _b.valid)) {
                    // Wait end of async validation
                    if ((_c = this.validator) === null || _c === void 0 ? void 0 : _c.pending) {
                        yield waitWhilePending(this.validator);
                    }
                    // Quit if really invalid
                    if ((_d = this.validator) === null || _d === void 0 ? void 0 : _d.invalid) {
                        return false;
                    }
                }
                return true;
            }
            finally {
                // Re-disabled, if need
                if (disabled) {
                    this.validator.disable({ emitEvent: false, onlySelf: true });
                }
            }
        });
    }
    set currentData(value) {
        this.validator.patchValue(value);
    }
    get currentData() {
        var _a;
        return (_a = this.validator) === null || _a === void 0 ? void 0 : _a.getRawValue();
    }
    get(path) {
        if (isNilOrBlank(path))
            return this;
        return getPropertyByPath(this, path);
    }
    get pmfms() {
        var _a;
        return (_a = this.state) === null || _a === void 0 ? void 0 : _a.pmfms;
    }
    set pmfms(pmfms) {
        this.state = Object.assign(Object.assign({}, this.state), { pmfms });
        this._weightPmfms = null; // Reset cache
    }
    get childrenPmfms() {
        var _a;
        return (_a = this.childrenState) === null || _a === void 0 ? void 0 : _a.pmfms;
    }
    set childrenPmfms(pmfms) {
        this.childrenState = Object.assign(Object.assign({}, this.childrenState), { pmfms });
    }
    get weightPmfms() {
        var _a;
        if (isNil(this._weightPmfms)) {
            this._weightPmfms = ((_a = this.pmfms) === null || _a === void 0 ? void 0 : _a.filter(PmfmUtils.isWeight)) || [];
        }
        return this._weightPmfms;
    }
};
BatchModel = BatchModel_1 = __decorate([
    EntityClass({ typename: 'BatchModelVO' }),
    __metadata("design:paramtypes", [Object])
], BatchModel);
export { BatchModel };
let BatchModelFilter = BatchModelFilter_1 = class BatchModelFilter extends EntityFilter {
    constructor() {
        super(...arguments);
        this.measurementValues = null;
        this.pmfmIds = null;
        this.isLeaf = null;
        this.hidden = null;
        this.parentFilter = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.measurementValues = source.measurementValues && Object.assign({}, source.measurementValues) || MeasurementUtils.toMeasurementValues(source.measurements);
        this.pmfmIds = source.pmfmIds;
        this.isLeaf = source.isLeaf;
        this.hidden = source.hidden;
        this.parentFilter = source.parentFilter && BatchModelFilter_1.fromObject(source.parentFilter);
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
        target.pmfmIds = this.pmfmIds;
        target.isLeaf = this.isLeaf;
        target.hidden = this.hidden;
        target.parentFilter = this.parentFilter && this.parentFilter.asObject(opts);
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        if (isNotNil(this.measurementValues)) {
            Object.keys(this.measurementValues).forEach(pmfmId => {
                const pmfmValue = this.measurementValues[pmfmId];
                if (isNotNil(pmfmValue)) {
                    filterFns.push(b => {
                        const measurementValues = (b.currentData || b.originalData).measurementValues;
                        return measurementValues && isNotNil(measurementValues[pmfmId]) && PmfmValueUtils.equals(measurementValues[pmfmId], pmfmValue);
                    });
                }
            });
        }
        // Check all expected pmfms has value
        if (isNotEmptyArray(this.pmfmIds)) {
            const pmfmIds = [...this.pmfmIds];
            filterFns.push(b => {
                const measurementValues = (b.currentData || b.originalData).measurementValues;
                return pmfmIds.every(pmfmId => PmfmValueUtils.isNotEmpty(measurementValues[pmfmId]));
            });
        }
        // Hidden
        if (isNotNil(this.hidden)) {
            const hidden = this.hidden;
            filterFns.push(b => b.hidden === hidden);
        }
        // is leaf
        if (isNotNil(this.isLeaf)) {
            const isLeaf = this.isLeaf;
            filterFns.push(b => b.isLeaf === isLeaf);
        }
        // Parent filter
        const parentFilter = BatchModelFilter_1.fromObject(this.parentFilter);
        if (parentFilter && !parentFilter.isEmpty()) {
            const parentFilterFn = parentFilter.asFilterFn();
            filterFns.push(b => b.parent && parentFilterFn(b.parent));
        }
        return filterFns;
    }
};
BatchModelFilter = BatchModelFilter_1 = __decorate([
    EntityClass({ typename: 'BatchModelFilterVO' })
], BatchModelFilter);
export { BatchModelFilter };
export class BatchModelUtils {
    static createModel(data, opts) {
        if (isEmptyArray(opts === null || opts === void 0 ? void 0 : opts.sortingPmfms))
            throw new Error('Missing required argument \'opts.sortingPmfms\'');
        // Create a batch model
        const model = BatchModel.fromBatch(data, opts.sortingPmfms, opts.rules);
        if (!model)
            return;
        // Add catch batches pmfms
        model.state.pmfms = arrayDistinct([
            ...(opts.catchPmfms || []),
            ...(model.state.pmfms || [])
        ], 'id');
        // Disabled root node, if no visible pmfms (e.g. when catch batch has no pmfm)
        model.disabled = !(model.pmfms || []).some(p => !p.hidden)
            && !model.isLeaf
            && !model.parent;
        // Set default catch batch name
        if (!model.parent && !model.name) {
            model.name = 'TRIP.BATCH.EDIT.CATCH_BATCH';
        }
        return model;
    }
    /**
     * Find matches batches (recursively)
     *
     * @param batch
     * @param filter
     */
    static findByFilterInTree(model, filter) {
        return TreeItemEntityUtils.findByFilter(model, BatchModelFilter.fromObject(filter));
    }
    /**
     * Delete matches batches (recursively)
     *
     * @param batch
     * @param filter
     */
    static deleteByFilterInTree(model, filter) {
        return TreeItemEntityUtils.deleteByFilter(model, BatchModelFilter.fromObject(filter));
    }
    static logTree(model, treeDepth = 0, treeIndent = '', result = []) {
        const isCatchBatch = treeDepth === 0;
        // Append current batch to result array
        let name = isCatchBatch ? 'Catch' : (model.name || model.originalData.label);
        const pmfmLabelsStr = (model.pmfms || []).map(p => p.label).join(', ');
        if (isNotNilOrBlank(pmfmLabelsStr))
            name += `: ${pmfmLabelsStr}`;
        if (model.hidden)
            name += ' (hidden)';
        result.push(`${treeIndent} - ${name}`);
        // Recursive call, for each children
        if (isNotEmptyArray(model.children)) {
            treeDepth++;
            treeIndent = `${treeIndent}\t`;
            model.children.forEach(child => this.logTree(child, treeDepth, treeIndent, result));
        }
        // Display result, if root
        if (isCatchBatch && isNotEmptyArray(result)) {
            console.debug(`[batch-tree-container] Batch model:\n${result.join('\n')}`);
        }
    }
}
//# sourceMappingURL=batch-tree.model.js.map