import { __decorate } from "tslib";
import { EntityClass, EntityUtils, fromDateISOString, isNotEmptyArray, isNotNil, ReferentialRef, ReferentialUtils, toDateISOString, toNumber, } from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from '@app/referential/services/filter/referential.filter';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
let StrategyFilter = class StrategyFilter extends BaseReferentialFilter {
    fromObject(source) {
        super.fromObject(source);
        this.levelId = toNumber(this.levelId, source.programId);
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.department = (source.department && ReferentialRef.fromObject(source.department)) || undefined;
        this.location = (source.location && ReferentialRef.fromObject(source.location)) || undefined;
        this.taxonName = (source.taxonName && TaxonNameRef.fromObject(source.taxonName)) || undefined;
        this.analyticReference = (source.analyticReference && ReferentialRef.fromObject(source.analyticReference)) || undefined;
        this.parameterIds = source.parameterIds;
        this.periods = source.periods;
        this.acquisitionLevel = source.acquisitionLevel;
        this.acquisitionLevels = source.acquisitionLevels;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.startDate = toDateISOString(this.startDate);
        target.endDate = toDateISOString(this.endDate);
        target.acquisitionLevels = target.acquisitionLevel ? [target.acquisitionLevel] : target.acquisitionLevels;
        if (opts && opts.minify) {
            target.departmentIds = ReferentialUtils.isNotEmpty(this.department) ? [this.department.id] : undefined;
            target.locationIds = ReferentialUtils.isNotEmpty(this.location) ? [this.location.id] : undefined;
            target.referenceTaxonIds = EntityUtils.isNotEmpty(this.taxonName, 'referenceTaxonId') ? [this.taxonName.referenceTaxonId] : undefined;
            target.analyticReferences = EntityUtils.isNotEmpty(this.analyticReference, 'label') ? [this.analyticReference.label] : undefined;
            delete target.department;
            delete target.location;
            delete target.taxonName;
            delete target.analyticReference;
            delete target.programId;
            delete target.acquisitionLevel;
        }
        else {
            target.department = this.department && this.department.asObject(opts);
            target.location = this.location && this.location.asObject(opts);
            target.taxonName = this.taxonName && this.taxonName.asObject(opts);
            target.analyticReference = this.analyticReference && this.analyticReference.asObject(opts);
        }
        return target;
    }
    buildFilter() {
        var _a, _b, _c, _d;
        const levelId = this.levelId;
        const levelIds = this.levelIds;
        const programIds = isNotNil(levelId) ? [levelId] : levelIds;
        // Remove, to avoid filter on LevelId and levelIds
        this.levelId = null;
        this.levelIds = null;
        const filterFns = super.buildFilter();
        // Restore values
        this.levelId = levelId;
        this.levelIds = levelIds;
        // Filter on program (= level)
        if (isNotEmptyArray(programIds)) {
            filterFns.push((t) => programIds.includes(toNumber(t.programId, t.levelId)));
        }
        // Reference taxon
        const referenceTaxonId = (_a = this.taxonName) === null || _a === void 0 ? void 0 : _a.referenceTaxonId;
        if (isNotNil(referenceTaxonId)) {
            filterFns.push((t) => t.taxonNames && t.taxonNames.some((tns) => { var _a; return ((_a = tns.taxonName) === null || _a === void 0 ? void 0 : _a.referenceTaxonId) === referenceTaxonId; }));
        }
        // Department
        const departmentId = (_b = this.department) === null || _b === void 0 ? void 0 : _b.id;
        if (isNotNil(departmentId)) {
            filterFns.push((t) => t.departments && t.departments.some((d) => d.id === departmentId));
        }
        // Location
        const locationId = (_c = this.location) === null || _c === void 0 ? void 0 : _c.id;
        if (isNotNil(locationId)) {
            filterFns.push((t) => t.appliedStrategies && t.appliedStrategies.some((as) => { var _a; return ((_a = as.location) === null || _a === void 0 ? void 0 : _a.id) === locationId; }));
        }
        // Analytic reference
        const analyticReference = (_d = this.analyticReference) === null || _d === void 0 ? void 0 : _d.label;
        if (isNotNil(analyticReference)) {
            filterFns.push((t) => t.analyticReference === analyticReference);
        }
        // Start/end period
        if (this.startDate || this.endDate) {
            const startDate = this.startDate && this.startDate.clone();
            const endDate = this.endDate && this.endDate.clone().add(1, 'day').startOf('day');
            const appliedPeriodTest = (ap) => (!startDate || startDate.isSameOrBefore(ap.endDate)) && (!endDate || endDate.isAfter(ap.startDate));
            filterFns.push((t) => t.appliedStrategies && t.appliedStrategies.some((as) => as.appliedPeriods && as.appliedPeriods.some(appliedPeriodTest)));
        }
        // Acquisition levels
        const acquisitionLevels = this.acquisitionLevel ? [this.acquisitionLevel] : this.acquisitionLevels;
        if (isNotEmptyArray(acquisitionLevels)) {
            filterFns.push((t) => (t.denormalizedPmfms || t.pmfms || []).some((p) => {
                var _a;
                const acquisitionLevel = typeof p.acquisitionLevel === 'string' ? p.acquisitionLevel : (_a = p.acquisitionLevel) === null || _a === void 0 ? void 0 : _a.label;
                return acquisitionLevels.includes(acquisitionLevel);
            }));
        }
        // TODO: filter on parameters
        return filterFns;
    }
    get programId() {
        return this.levelId;
    }
    set programId(value) {
        this.levelId = value;
    }
};
StrategyFilter = __decorate([
    EntityClass({ typename: 'StrategyFilterVO' })
], StrategyFilter);
export { StrategyFilter };
//# sourceMappingURL=strategy.filter.js.map