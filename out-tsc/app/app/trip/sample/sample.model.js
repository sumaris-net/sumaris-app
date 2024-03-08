var Sample_1;
import { __decorate, __metadata } from "tslib";
import { EntityClass, fromDateISOString, isNil, isNotEmptyArray, isNotNil, referentialToString, ReferentialUtils, toDateISOString } from '@sumaris-net/ngx-components';
import { MeasurementUtils, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { ImageAttachment } from '@app/data/image/image-attachment.model';
import { RootDataEntity } from '@app/data/services/model/root-data-entity.model';
let Sample = Sample_1 = class Sample extends RootDataEntity {
    constructor() {
        super(Sample_1.TYPENAME);
        this.label = null;
        this.rankOrder = null;
        this.sampleDate = null;
        this.individualCount = null;
        this.taxonGroup = null;
        this.taxonName = null;
        this.measurementValues = {};
        this.matrixId = null;
        this.batchId = null;
        this.size = null;
        this.sizeUnit = null;
        this.operationId = null;
        this.landingId = null;
        this.parentId = null;
        this.parent = null;
        this.children = null;
    }
    static asObject(source, opts) {
        var _a;
        return (_a = Sample_1.fromObject(source)) === null || _a === void 0 ? void 0 : _a.asObject(opts);
    }
    static fromObjectArrayAsTree(sources, opts) {
        if (!sources)
            return null;
        // Convert to entities
        const targets = (sources || []).map(json => this.fromObject(json, Object.assign(Object.assign({}, opts), { withChildren: false })));
        // Find roots
        const roots = targets.filter(g => isNil(g.parentId));
        // Link to parent (using parentId)
        targets.forEach(t => {
            t.parent = isNotNil(t.parentId) && roots.find(p => p.id === t.parentId) || undefined;
            t.parentId = undefined; // Avoid redundant info on parent
        });
        // Link to children
        roots.forEach(s => s.children = targets.filter(p => p.parent && p.parent === s) || []);
        // Return root
        return roots;
    }
    /**
     * Transform a samples tree, into an array of object.
     * Parent & children links are removed, to keep only a parentId
     *
     * @param sources
     * @param opts
     * @throw Error if a sample has no id
     */
    static treeAsObjectArray(sources, opts) {
        return sources && sources
            // Reduce to array
            .reduce((res, source) => {
            // Convert entity into object, WITHOUT children (will be set later)
            const target = source.asObject ? source.asObject(Object.assign(Object.assign({}, opts), { withChildren: false })) : Object.assign(Object.assign({}, source), { children: undefined });
            // Link target with the given parent
            const parent = opts && opts.parent;
            if (parent) {
                if (isNil(parent.id)) {
                    throw new Error(`Cannot convert sample tree into array: No id found for sample ${parent.label}!`);
                }
                target.parentId = parent.id;
                delete target.parent; // not need
            }
            if (isNotEmptyArray(source.children)) {
                return res.concat(target)
                    .concat(...this.treeAsObjectArray(source.children, Object.assign(Object.assign({}, opts), { parent: target })));
            }
            return res.concat(target);
        }, []) || undefined;
    }
    static equals(s1, s2) {
        return s1 && s2 && (isNotNil(s1.id) && s1.id === s2.id)
            || (s1.rankOrder === s2.rankOrder
                // same operation
                && ((!s1.operationId && !s2.operationId) || s1.operationId === s2.operationId)
                // same label
                && ((!s1.label && !s2.label) || s1.label === s2.label)
            // Warn: compare using the parent ID is too complicated
            );
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.sampleDate = toDateISOString(this.sampleDate);
        target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject(Object.assign(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS), { keepEntityName: true /*fix #32*/ })) || undefined;
        target.taxonName = this.taxonName && this.taxonName.asObject(Object.assign(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS), { keepEntityName: true /*fix #32*/ })) || undefined;
        target.individualCount = isNotNil(this.individualCount) ? this.individualCount : null;
        target.parentId = this.parentId || this.parent && this.parent.id || undefined;
        target.children = this.children && (!opts || opts.withChildren !== false) && this.children.map(c => c.asObject(opts)) || undefined;
        target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
        target.landingId = this.landingId;
        target.operationId = this.operationId;
        target.images = this.images && this.images.map(image => image.asObject(opts)) || undefined;
        if (opts && opts.minify) {
            // Parent not need, as the tree will be used by pod
            delete target.parent;
            delete target.parentId;
        }
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source);
        this.label = source.label;
        this.rankOrder = source.rankOrder;
        this.sampleDate = fromDateISOString(source.sampleDate);
        this.individualCount = isNotNil(source.individualCount) && source.individualCount !== '' ? source.individualCount : null;
        this.taxonGroup = source.taxonGroup && TaxonGroupRef.fromObject(source.taxonGroup) || undefined;
        this.taxonName = source.taxonName && TaxonNameRef.fromObject(source.taxonName) || undefined;
        this.size = source.size;
        this.sizeUnit = source.sizeUnit;
        this.matrixId = source.matrixId;
        this.parentId = source.parentId;
        this.parent = source.parent;
        this.batchId = source.batchId;
        this.operationId = source.operationId;
        this.landingId = source.landingId;
        this.measurementValues = source.measurementValues && Object.assign({}, source.measurementValues) || MeasurementUtils.toMeasurementValues(source.measurements);
        this.images = source.images && source.images.map(ImageAttachment.fromObject) || undefined;
        if (!opts || opts.withChildren !== false) {
            this.children = source.children && source.children.map(child => Sample_1.fromObject(child, opts)) || undefined;
        }
        return this;
    }
    equals(other) {
        // equals by ID
        return (super.equals(other) && isNotNil(this.id))
            // Or by functional attributes
            || (this.rankOrder === other.rankOrder
                // same operation
                && ((!this.operationId && !other.operationId) || this.operationId === other.operationId)
                // same landing
                && ((!this.landingId && !other.landingId) || this.landingId === other.landingId)
                // same label
                && ((!this.label && !other.label) || this.label === other.label)
            // Warn: compare using the parent ID is too complicated
            );
    }
};
Sample = Sample_1 = __decorate([
    EntityClass({ typename: 'SampleVO' }),
    __metadata("design:paramtypes", [])
], Sample);
export { Sample };
export class SampleUtils {
    static parentToString(parent, opts) {
        if (!parent)
            return null;
        opts = opts || { taxonGroupAttributes: ['label', 'name'], taxonNameAttributes: ['label', 'name'] };
        if (opts.pmfm && parent.measurementValues && isNotNil(parent.measurementValues[opts.pmfm.id])) {
            return parent.measurementValues[opts.pmfm.id];
        }
        const hasTaxonGroup = ReferentialUtils.isNotEmpty(parent.taxonGroup);
        const hasTaxonName = ReferentialUtils.isNotEmpty(parent.taxonName);
        // Display only taxon name, if no taxon group or same label
        if (hasTaxonName && (!hasTaxonGroup || parent.taxonGroup.label === parent.taxonName.label)) {
            return referentialToString(parent.taxonName, opts.taxonNameAttributes);
        }
        // Display both, if both exists
        if (hasTaxonName && hasTaxonGroup) {
            return referentialToString(parent.taxonGroup, opts.taxonGroupAttributes) + ' / '
                + referentialToString(parent.taxonName, opts.taxonNameAttributes);
        }
        // Display only taxon group
        if (hasTaxonGroup) {
            return referentialToString(parent.taxonGroup, opts.taxonGroupAttributes);
        }
        // Display rankOrder only (should never occur)
        return `#${parent.rankOrder}`;
    }
    static computeNextRankOrder(sources, acquisitionLevel) {
        return sources.filter(s => this.hasAcquisitionLevel(s, acquisitionLevel))
            .reduce((max, s) => Math.max(max, s.rankOrder || 0), 0) + 1;
    }
    static computeLabel(rankOrder, acquisitionLevel) {
        return acquisitionLevel + '#' + rankOrder;
    }
    static hasAcquisitionLevel(s, acquisitionLevel) {
        return s && s.label && s.label.startsWith(acquisitionLevel + '#');
    }
    static filterByAcquisitionLevel(samples, acquisitionLevel) {
        return samples && samples.filter(s => s.label && s.label.startsWith(acquisitionLevel + '#'));
    }
    static insertOrUpdateChild(parent, child, acquisitionLevel) {
        if (!parent || !child)
            throw new Error('Missing \'parent\' or \'child\' arguments');
        parent.children = parent.children || [];
        const subSampleIndex = parent.children.findIndex(s => Sample.equals(s, child));
        const isNew = subSampleIndex === -1;
        // Add
        if (isNew) {
            child.rankOrder = this.computeNextRankOrder(parent.children, acquisitionLevel);
            child.label = this.computeLabel(parent.rankOrder, acquisitionLevel);
            parent.children.push(child); // Create a copy, to force change detection to recompute pipes
        }
        // Or replace
        else {
            parent.children[subSampleIndex] = child;
        }
        return parent.children;
    }
    static removeChild(parent, child) {
        if (!parent || !child)
            throw new Error('Missing \'parent\' or \'child\' arguments');
        const subSampleIndex = (parent.children || []).findIndex(s => Sample.equals(s, child));
        const exists = subSampleIndex !== -1;
        // Add
        if (exists) {
            parent.children.splice(subSampleIndex, 1);
        }
        return parent.children;
    }
    static logSample(sample, opts) {
        opts = opts || {};
        const indent = opts && opts.indent || '';
        let message = indent + (sample.label || 'NO_LABEL');
        if (opts.showAll) {
            const excludeKeys = ['label', 'parent', 'children', '__typename'];
            Object.keys(sample)
                .filter(key => !excludeKeys.includes(key) && isNotNil(sample[key]))
                .forEach(key => {
                let value = sample[key];
                if (value instanceof Object) {
                    if (!(value instanceof Sample)) {
                        value = JSON.stringify(value);
                    }
                }
                message += ' ' + key + ':' + value;
            });
        }
        else {
            if (isNotNil(sample.id)) {
                message += ' id:' + sample.id;
            }
            // Parent
            if (opts.showParent !== false) {
                if (sample.parent) {
                    if (isNotNil(sample.parent.id)) {
                        message += ' parent.id:' + sample.parent.id;
                    }
                    else if (isNotNil(sample.parent.label)) {
                        message += ' parent.label:' + sample.parent.label;
                    }
                }
                if (isNotNil(sample.parentId)) {
                    message += ' parentId:' + sample.parentId;
                }
            }
            // Taxon
            if (opts.showTaxon !== false) {
                if (sample.taxonGroup) {
                    message += ' taxonGroup:' + (sample.taxonGroup && (sample.taxonGroup.label || sample.taxonGroup.id));
                }
                if (sample.taxonName) {
                    message += ' taxonName:' + (sample.taxonName && (sample.taxonName.label || sample.taxonName.id));
                }
            }
            // Measurement
            if (opts.showMeasure !== false && sample.measurementValues) {
                MeasurementValuesUtils.getPmfmIds(sample.measurementValues)
                    .forEach(pmfmId => {
                    message += ` pmfm#${pmfmId}: ${sample.measurementValues[pmfmId]}`;
                });
            }
        }
        // Print
        if (opts.println)
            opts.println(message);
        else
            console.debug(message);
    }
    static logTree(samples, opts) {
        opts = opts || {};
        samples = samples || [];
        const indent = opts && opts.indent || '';
        const nextIndent = opts && opts.nextIndent || indent;
        samples.forEach(sample => {
            // Log current
            this.logSample(sample, opts);
            // Loop on children
            this.logTree(sample.children, {
                println: opts.println,
                indent: nextIndent + ' |- '
            });
        });
    }
}
SampleUtils.isIndividualMonitoring = (s) => SampleUtils.hasAcquisitionLevel(s, AcquisitionLevelCodes.INDIVIDUAL_MONITORING);
SampleUtils.isIndividualRelease = (s) => SampleUtils.hasAcquisitionLevel(s, AcquisitionLevelCodes.INDIVIDUAL_RELEASE);
SampleUtils.filterIndividualMonitoring = (samples) => SampleUtils.filterByAcquisitionLevel(samples, AcquisitionLevelCodes.INDIVIDUAL_MONITORING);
SampleUtils.filterIndividualRelease = (samples) => SampleUtils.filterByAcquisitionLevel(samples, AcquisitionLevelCodes.INDIVIDUAL_RELEASE);
//# sourceMappingURL=sample.model.js.map