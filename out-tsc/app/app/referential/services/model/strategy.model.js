var Strategy_1, StrategyDepartment_1;
import { __decorate, __metadata } from "tslib";
import { BaseReferential, Entity, EntityClass, EntityUtils, fromDateISOString, isNotNil, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { TaxonGroupRef } from './taxon-group.model';
import { DenormalizedPmfmStrategy, PmfmStrategy } from './pmfm-strategy.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { AppReferentialUtils, MINIFY_OPTIONS, NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
let Strategy = Strategy_1 = class Strategy extends BaseReferential {
    constructor() {
        super();
        this.analyticReference = null;
        this.appliedStrategies = null;
        this.pmfms = null;
        this.denormalizedPmfms = null;
        this.departments = null;
        this.gears = null;
        this.taxonGroups = null;
        this.taxonNames = null;
        this.programId = null;
        this.__typename = Strategy_1.TYPENAME;
    }
    clone() {
        const target = new Strategy_1();
        target.fromObject(this);
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.analyticReference = source.analyticReference;
        this.programId = source.programId;
        this.appliedStrategies = source.appliedStrategies && source.appliedStrategies.map(AppliedStrategy.fromObject) || [];
        this.pmfms = source.pmfms && source.pmfms.map(PmfmStrategy.fromObject) || [];
        this.denormalizedPmfms = source.denormalizedPmfms && source.denormalizedPmfms.map(DenormalizedPmfmStrategy.fromObject) || [];
        this.departments = source.departments && source.departments.map(StrategyDepartment.fromObject) || [];
        this.gears = source.gears && source.gears.map(ReferentialRef.fromObject) || [];
        // Taxon groups, sorted by priority level
        this.taxonGroups = source.taxonGroups && source.taxonGroups.map(TaxonGroupStrategy.fromObject) || [];
        this.taxonNames = source.taxonNames && source.taxonNames.map(TaxonNameStrategy.fromObject) || [];
    }
    asObject(opts) {
        const target = super.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS));
        target.programId = this.programId;
        target.appliedStrategies = this.appliedStrategies && this.appliedStrategies.map(s => s.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)));
        target.pmfms = this.pmfms && this.pmfms.map(s => s.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)));
        target.denormalizedPmfms = this.denormalizedPmfms && this.denormalizedPmfms.map(s => s.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)));
        target.departments = this.departments && this.departments.map(s => s.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)));
        target.gears = this.gears && this.gears.map(s => s.asObject(opts));
        target.taxonGroups = this.taxonGroups && this.taxonGroups.map(s => s.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)));
        target.taxonNames = this.taxonNames && this.taxonNames.map(s => s.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)));
        if (opts && opts.keepRemoteId === false) {
            AppReferentialUtils.cleanIdAndDates(target, true, ['gears', 'taxonGroups', 'taxonNames']);
            delete target.programId;
        }
        return target;
    }
    equals(other) {
        return (super.equals(other) && isNotNil(this.id))
            // Or by functional attributes
            || (
            // Same label
            this.label === other.label
                // Same program
                && ((!this.programId && !other.programId) || this.programId === other.programId));
    }
};
Strategy.ENTITY_NAME = 'Strategy';
Strategy = Strategy_1 = __decorate([
    EntityClass({ typename: 'StrategyVO' }),
    __metadata("design:paramtypes", [])
], Strategy);
export { Strategy };
let StrategyDepartment = StrategyDepartment_1 = class StrategyDepartment extends Entity {
    constructor() {
        super(StrategyDepartment_1.TYPENAME);
    }
    clone() {
        const target = new StrategyDepartment_1();
        target.fromObject(this);
        return target;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.location = this.location && this.location.asObject(opts) || undefined;
        target.privilege = this.privilege && this.privilege.asObject(opts);
        target.department = this.department && this.department.asObject(opts);
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.strategyId = source.strategyId;
        this.location = source.location && ReferentialRef.fromObject(source.location);
        this.privilege = source.privilege && ReferentialRef.fromObject(source.privilege);
        this.department = source.department && ReferentialRef.fromObject(source.department);
    }
};
StrategyDepartment = StrategyDepartment_1 = __decorate([
    EntityClass({ typename: 'StrategyDepartmentVO' }),
    __metadata("design:paramtypes", [])
], StrategyDepartment);
export { StrategyDepartment };
export class AppliedStrategy extends Entity {
    constructor() {
        super();
        this.__typename = AppliedStrategy.TYPENAME;
    }
    static fromObject(source) {
        if (!source || source instanceof AppliedStrategy)
            return source;
        const res = new AppliedStrategy();
        res.fromObject(source);
        return res;
    }
    clone() {
        const target = new AppliedStrategy();
        target.fromObject(this);
        return target;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.location = this.location && this.location.asObject(opts);
        target.appliedPeriods = this.appliedPeriods && this.appliedPeriods.map(p => p.asObject(opts)) || undefined;
        // Clean remote id
        if (opts && opts.keepRemoteId === false) {
            delete target.id;
            delete target.updateDate; // Make to sens to keep updateDate of a local entity to save
            delete target.strategyId;
            if (EntityUtils.isRemoteId(target.location.id))
                delete target.location.id;
        }
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.strategyId = source.strategyId;
        this.location = source.location && ReferentialRef.fromObject(source.location);
        this.appliedPeriods = source.appliedPeriods && source.appliedPeriods.map(AppliedPeriod.fromObject) || [];
    }
    equals(other) {
        return (super.equals(other) && isNotNil(this.id))
            // Same strategyId and location
            || (this.strategyId === other.strategyId
                && ((!this.location && !other.location) || (this.location && other.location && this.location.id === other.location.id)));
    }
}
AppliedStrategy.TYPENAME = 'AppliedStrategyVO';
export class AppliedPeriod {
    constructor() {
        this.__typename = AppliedPeriod.TYPENAME;
    }
    static fromObject(source) {
        if (!source || source instanceof AppliedPeriod)
            return source;
        const res = new AppliedPeriod();
        res.fromObject(source);
        return res;
    }
    asObject(opts) {
        const target = Object.assign({}, this); //= {...this};
        if (!opts || opts.keepTypename !== true)
            delete target.__typename;
        target.startDate = toDateISOString(this.startDate);
        target.endDate = toDateISOString(this.endDate);
        // Clean remote id
        if (opts && opts.keepRemoteId === false && EntityUtils.isRemoteId(target.appliedStrategyId)) {
            delete target.appliedStrategyId;
        }
        return target;
    }
    fromObject(source) {
        this.appliedStrategyId = source.appliedStrategyId;
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.acquisitionNumber = source.acquisitionNumber;
    }
    // TODO : Check if clone is needed
    clone() {
        const target = new AppliedPeriod();
        target.fromObject(this.asObject());
        return target;
    }
}
AppliedPeriod.TYPENAME = 'AppliedPeriodVO';
export class TaxonGroupStrategy {
    static fromObject(source) {
        if (!source || source instanceof TaxonGroupStrategy)
            return source;
        const res = new TaxonGroupStrategy();
        res.fromObject(source);
        return res;
    }
    asObject(opts) {
        const target = Object.assign({}, this); //= {...this};
        if (!opts || opts.keepTypename !== true)
            delete target.__typename;
        target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject(Object.assign(Object.assign({}, opts), MINIFY_OPTIONS));
        return target;
    }
    fromObject(source) {
        this.strategyId = source.strategyId;
        this.priorityLevel = source.priorityLevel;
        this.taxonGroup = source.taxonGroup && TaxonGroupRef.fromObject(source.taxonGroup);
    }
}
export class TaxonNameStrategy {
    static fromObject(source) {
        if (!source || source instanceof TaxonNameStrategy)
            return source;
        const res = new TaxonNameStrategy();
        res.fromObject(source);
        return res;
    }
    // TODO : Check if clone is needed
    clone() {
        const target = new TaxonNameStrategy();
        target.fromObject(this);
        return target;
    }
    asObject(opts) {
        const target = Object.assign({}, this); //= {...this};
        if (!opts || opts.keepTypename !== true)
            delete target.taxonName.__typename;
        return target;
    }
    fromObject(source) {
        this.strategyId = source.strategyId;
        this.priorityLevel = source.priorityLevel;
        this.taxonName = source.taxonName && TaxonNameRef.fromObject(source.taxonName);
    }
}
//# sourceMappingURL=strategy.model.js.map