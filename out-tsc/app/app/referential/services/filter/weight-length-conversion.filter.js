import { __decorate } from "tslib";
import { EntityClass, EntityFilter, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
let WeightLengthConversionFilter = class WeightLengthConversionFilter extends EntityFilter {
    constructor() {
        super(...arguments);
        this.month = null;
        this.year = null;
        this.referenceTaxonId = null;
        this.locationId = null;
        this.sexId = null;
        this.lengthParameterId = null;
        this.lengthUnitId = null;
        this.lengthPmfmId = null;
        this.rectangleLabel = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.month = source.month;
        this.year = source.year;
        this.statusIds = source.statusIds;
        this.referenceTaxonId = source.referenceTaxonId;
        this.referenceTaxonIds = source.referenceTaxonIds;
        this.locationId = source.locationId;
        this.locationIds = source.locationIds;
        this.lengthParameterId = source.lengthParameterId;
        this.lengthParameterIds = source.lengthParameterIds;
        this.lengthUnitId = source.lengthUnitId;
        this.lengthUnitIds = source.lengthUnitIds;
        this.lengthPmfmId = source.lengthPmfmId;
        this.lengthPmfmIds = source.lengthPmfmIds;
        this.rectangleLabel = source.rectangleLabel;
        this.rectangleLabels = source.rectangleLabels;
        this.sexId = source.sexId;
        this.sexIds = source.sexIds;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            target.referenceTaxonIds = isNotNil(this.referenceTaxonId) ? [this.referenceTaxonId] : this.referenceTaxonIds;
            delete target.referenceTaxonId;
            target.locationIds = isNotNil(this.locationId) ? [this.locationId] : this.locationIds;
            delete target.locationId;
            target.sexIds = isNotNil(this.sexId) ? [this.sexId] : this.sexIds;
            delete target.sexId;
            target.lengthParameterIds = isNotNil(this.lengthParameterId) ? [this.lengthParameterId] : this.lengthParameterIds;
            delete target.lengthParameterId;
            target.lengthUnitIds = isNotNil(this.lengthUnitId) ? [this.lengthUnitId] : this.lengthUnitIds;
            delete target.lengthUnitId;
            target.lengthPmfmIds = isNotNil(this.lengthPmfmId) ? [this.lengthPmfmId] : this.lengthPmfmIds;
            delete target.lengthPmfmId;
            target.rectangleLabels = isNotNil(this.rectangleLabel) ? [this.rectangleLabel] : this.rectangleLabels;
            delete target.rectangleLabel;
        }
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // Year
        const year = this.year;
        if (isNotNil(year)) {
            filterFns.push(t => t.year === year);
        }
        // Month
        const month = this.month;
        if (isNotNil(month)) {
            filterFns.push(t => (t.startMonth <= month) && (month <= t.endMonth));
        }
        // Status
        const statusIds = this.statusIds;
        if (isNotEmptyArray(statusIds)) {
            filterFns.push(t => statusIds.includes(t.statusId));
        }
        // Location
        const locationId = this.locationId;
        if (isNotNil(locationId)) {
            filterFns.push(t => (t.locationId === locationId));
        }
        // Reference Taxon
        const referenceTaxonId = this.referenceTaxonId;
        if (isNotNil(referenceTaxonId)) {
            filterFns.push(t => (t.referenceTaxonId === referenceTaxonId));
        }
        // Rectangle
        const rectangleLabel = this.rectangleLabel;
        if (isNotNil(rectangleLabel)) {
            filterFns.push(t => { var _a; return ((_a = t.rectangleLabels) === null || _a === void 0 ? void 0 : _a.includes(rectangleLabel)); });
        }
        // Length Pmfm
        const lengthPmfmId = this.lengthPmfmId;
        if (isNotNil(lengthPmfmId)) {
            filterFns.push(t => { var _a; return ((_a = t.lengthPmfmIds) === null || _a === void 0 ? void 0 : _a.includes(lengthPmfmId)); });
        }
        // Sex
        const sexId = this.sexId;
        if (isNotNil(sexId)) {
            filterFns.push(t => t.id === sexId);
        }
        return filterFns;
    }
};
WeightLengthConversionFilter = __decorate([
    EntityClass({ typename: 'WeightLengthConversionFilterVO' })
], WeightLengthConversionFilter);
export { WeightLengthConversionFilter };
//# sourceMappingURL=weight-length-conversion.filter.js.map