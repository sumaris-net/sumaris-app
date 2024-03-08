var Batch_1;
import { __decorate, __metadata } from "tslib";
import { AcquisitionLevelCodes, PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { MeasurementUtils, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { EntityClass, isNil, isNilOrBlank, isNotNil, isNotNilOrBlank, ReferentialUtils, toNumber } from '@sumaris-net/ngx-components';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
// WARN: always recreate en entity, even if source is a Batch
// because options can have changed
let Batch = Batch_1 = class Batch extends DataEntity {
    constructor(__typename) {
        super(__typename || Batch_1.TYPENAME);
        this.label = null;
        this.rankOrder = null;
        this.exhaustiveInventory = null;
        this.samplingRatio = null;
        this.samplingRatioText = null;
        this.samplingRatioComputed = null;
        this.individualCount = null;
        this.taxonGroup = null;
        this.taxonName = null;
        this.comments = null;
        this.measurementValues = {};
        this.weight = null;
        this.childrenWeight = null;
        this.operationId = null;
        this.saleId = null;
        this.parentId = null;
        this.parent = null;
        this.children = null;
    }
    static fromObjectArrayAsTree(sources) {
        if (!sources)
            return null;
        const batches = (sources || []).map(json => this.fromObject(json));
        const catchBatch = batches.find(b => isNil(b.parentId) && (isNilOrBlank(b.label) || b.label === AcquisitionLevelCodes.CATCH_BATCH)) || undefined;
        if (!catchBatch)
            return undefined;
        batches.forEach(s => {
            // Link to parent
            s.parent = isNotNil(s.parentId) && batches.find(p => p.id === s.parentId) || undefined;
            s.parentId = undefined; // Avoid redundant info on parent
        });
        // Link to children
        batches.forEach(s => s.children = batches.filter(p => p.parent && p.parent === s) || []);
        // Fill catch children
        if (!catchBatch.children || !catchBatch.children.length) {
            catchBatch.children = batches.filter(b => b.parent === catchBatch);
        }
        //console.debug("[batch-model] fromObjectArrayAsTree()", this.catchBatch);
        return catchBatch;
    }
    /**
     * Transform a batch entity tree, into a array of object.
     * Parent/.children link are removed, to keep only a parentId/
     *
     * @param source
     * @param opts
     * @throw Error if a batch has no id
     */
    static treeAsObjectArray(source, opts) {
        if (!source)
            return null;
        // Convert entity into object, WITHOUT children (will be add later)
        const target = source.asObject ? source.asObject(Object.assign(Object.assign({}, opts), { withChildren: false })) : Object.assign(Object.assign({}, source), { children: undefined });
        // Link target with the given parent
        const parent = opts && opts.parent;
        if (parent) {
            if (isNil(parent.id)) {
                throw new Error(`Cannot convert batch tree into array: No id found for batch ${parent.label}!`);
            }
            target.parentId = parent.id;
            delete target.parent; // not need
        }
        return (source.children || []).reduce((res, batch) => res.concat(this.treeAsObjectArray(batch, Object.assign(Object.assign({}, opts), { parent: target })) || []), [target]) || undefined;
    }
    static equals(b1, b2) {
        return b1 && b2 && ((isNotNil(b1.id) && b1.id === b2.id)
            // Or by functional attributes
            || (b1.rankOrder === b2.rankOrder
                // same operation
                && ((!b1.operationId && !b2.operationId) || b1.operationId === b2.operationId)
                // same sale
                && ((!b1.saleId && !b2.saleId) || b1.saleId === b2.saleId)
                // same label
                && ((!b1.label && !b2.label) || b1.label === b2.label)
            // Warn: compare using the parent ID is too complicated
            ));
    }
    /**
     * Sort batch, by id (if exists) or by rankOrder (if no id)
     *
     * @param sortDirection
     */
    static idOrRankOrderComparator(sortDirection = 'asc') {
        const sign = !sortDirection || sortDirection !== 'desc' ? 1 : -1;
        return (b1, b2) => {
            const id1 = toNumber(b1.id, Number.MAX_SAFE_INTEGER);
            const id2 = toNumber(b2.id, Number.MAX_SAFE_INTEGER);
            const rankOrder1 = toNumber(b1.rankOrder, Number.MAX_SAFE_INTEGER);
            const rankOrder2 = toNumber(b2.rankOrder, Number.MAX_SAFE_INTEGER);
            if (id1 !== id2) {
                return sign * (Math.abs(id1) - Math.abs(id2)); // Need ABS to make localId be positive
            }
            else {
                return sign * (rankOrder1 - rankOrder2);
            }
        };
    }
    asObject(opts) {
        const parent = this.parent;
        this.parent = null; // avoid to process the parent
        const target = super.asObject(opts);
        delete target.parentBatch;
        this.parent = parent;
        target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject(Object.assign(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS), { keepEntityName: true /*fix #32*/ })) || undefined;
        target.taxonName = this.taxonName && this.taxonName.asObject(Object.assign(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS), { keepEntityName: true /*fix #32*/ })) || undefined;
        target.children = this.children && (!opts || opts.withChildren !== false) && this.children.map(c => c.asObject && c.asObject(opts) || c) || undefined;
        target.parentId = this.parentId || this.parent && this.parent.id || undefined;
        target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
        if (opts && opts.minify) {
            // Parent Id not need, as the tree batch will be used by pod
            delete target.parent;
            delete target.parentId;
            // Remove computed properties
            delete target.samplingRatioComputed;
            delete target.weight;
            delete target.childrenWeight;
            if (target.measurementValues)
                delete target.measurementValues.__typename;
            // Can occur on SubBatch
            delete target.parentGroup;
        }
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source);
        this.label = source.label;
        this.rankOrder = +source.rankOrder;
        this.exhaustiveInventory = source.exhaustiveInventory;
        this.samplingRatio = isNotNilOrBlank(source.samplingRatio) ? parseFloat(source.samplingRatio) : null;
        this.samplingRatioText = source.samplingRatioText;
        this.samplingRatioComputed = source.samplingRatioComputed;
        this.individualCount = isNotNilOrBlank(source.individualCount) ? parseInt(source.individualCount) : null;
        this.taxonGroup = source.taxonGroup && TaxonGroupRef.fromObject(source.taxonGroup) || undefined;
        this.taxonName = source.taxonName && TaxonNameRef.fromObject(source.taxonName) || undefined;
        this.comments = source.comments;
        this.operationId = source.operationId;
        this.saleId = source.saleId;
        this.parentId = source.parentId;
        this.parent = source.parent;
        this.weight = source.weight && Object.assign({}, source.weight) || undefined;
        this.childrenWeight = source.childrenWeight && Object.assign({}, source.childrenWeight) || undefined;
        if (source.measurementValues) {
            this.measurementValues = Object.assign({}, source.measurementValues);
        }
        // Convert measurement lists to map
        else if (source.sortingMeasurements || source.quantificationMeasurements) {
            const measurements = (source.sortingMeasurements || []).concat(source.quantificationMeasurements);
            this.measurementValues = MeasurementUtils.toMeasurementValues(measurements);
        }
        if (!opts || opts.withChildren !== false) {
            this.children = source.children && source.children.map(child => Batch_1.fromObject(child, opts)) || undefined;
        }
    }
    equals(other) {
        // equals by ID
        return (super.equals(other) && isNotNil(this.id))
            // Or by functional attributes
            || (this.rankOrder === other.rankOrder
                // same operation
                && ((!this.operationId && !other.operationId) || this.operationId === other.operationId)
                // same sale
                && ((!this.saleId && !other.saleId) || this.saleId === other.saleId)
                // same label
                && ((!this.label && !other.label) || this.label === other.label)
            // Warn: compare using the parent ID is too complicated
            );
    }
    get hasTaxonNameOrGroup() {
        return (ReferentialUtils.isNotEmpty(this.taxonName) || ReferentialUtils.isNotEmpty(this.taxonGroup)) && true;
    }
    get isLanding() {
        var _a;
        return PmfmValueUtils.equals((_a = this.measurementValues) === null || _a === void 0 ? void 0 : _a[PmfmIds.DISCARD_OR_LANDING], QualitativeValueIds.DISCARD_OR_LANDING.LANDING);
    }
};
Batch.SAMPLING_BATCH_SUFFIX = '.%';
Batch = Batch_1 = __decorate([
    EntityClass({ typename: 'BatchVO', fromObjectReuseStrategy: 'clone' }),
    __metadata("design:paramtypes", [String])
], Batch);
export { Batch };
//# sourceMappingURL=batch.model.js.map