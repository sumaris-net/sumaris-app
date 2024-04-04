var Program_1, ProgramDepartment_1, ProgramPerson_1;
import { __decorate, __metadata } from "tslib";
import { BaseReferential, Entity, EntityClass, EntityUtils, isNotEmptyArray, isNotNil, Person, ReferentialRef, ReferentialUtils, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { Strategy } from './strategy.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { ProgramPropertiesUtils } from '@app/referential/services/config/program.config';
import { DenormalizedPmfmStrategy, PmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
let Program = Program_1 = class Program extends BaseReferential {
    constructor() {
        super(Program_1.TYPENAME);
        this.properties = {};
        this.gearClassification = null;
        this.taxonGroupType = null;
        this.locationClassifications = null;
        this.locations = null;
        this.departments = null;
        this.persons = null;
        this.privileges = null;
        this.strategies = null;
    }
    fromObject(source) {
        super.fromObject(source);
        if (source.properties && source.properties instanceof Array) {
            this.properties = EntityUtils.getPropertyArrayAsObject(source.properties);
        }
        else {
            this.properties = Object.assign({}, source.properties);
        }
        this.gearClassification = source.gearClassification && ReferentialRef.fromObject(source.gearClassification);
        this.taxonGroupType = (source.taxonGroupType && ReferentialRef.fromObject(source.taxonGroupType)) ||
            (isNotNil(source.taxonGroupTypeId) ? ReferentialRef.fromObject({ id: source.taxonGroupTypeId }) : undefined);
        this.locationClassifications = source.locationClassifications && source.locationClassifications.map(ReferentialRef.fromObject) || [];
        this.locations = source.locations && source.locations.map(ReferentialRef.fromObject) || [];
        this.departments = source.departments && source.departments.map(ProgramDepartment.fromObject) || [];
        this.persons = source.persons && source.persons.map(ProgramPerson.fromObject) || [];
        this.acquisitionLevelLabels = source.acquisitionLevelLabels || [];
        this.privileges = source.privileges || [];
        this.strategies = source.strategies && source.strategies.map(Strategy.fromObject) || [];
    }
    asObject(opts) {
        if (opts && opts.minify) {
            return {
                id: this.id,
                __typename: opts.keepTypename && this.__typename || undefined
            };
        }
        const target = super.asObject(opts);
        target.properties = Object.assign({}, this.properties);
        target.gearClassification = this.gearClassification && this.gearClassification.asObject(opts);
        target.taxonGroupType = this.taxonGroupType && this.taxonGroupType.asObject(opts);
        target.locationClassifications = this.locationClassifications && this.locationClassifications.map(item => item.asObject(opts)) || [];
        target.locations = this.locations && this.locations.map(item => item.asObject(opts)) || [];
        target.departments = this.departments && this.departments.map(s => s.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)));
        target.persons = this.persons && this.persons.map(s => s.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)));
        target.privileges = this.privileges;
        target.strategies = this.strategies && this.strategies.map(s => s.asObject(opts));
        return target;
    }
    equals(other) {
        return (super.equals(other) && isNotNil(this.id))
            || (other && this.label === other.label);
    }
    getPropertyAsBoolean(definition) {
        const value = this.getProperty(definition);
        return isNotNil(value) ? (value && value !== 'false') : undefined;
    }
    getPropertyAsInt(definition) {
        const value = this.getProperty(definition);
        return isNotNil(value) ? parseInt(value) : undefined;
    }
    getPropertyAsNumbers(definition) {
        const value = this.getProperty(definition);
        if (typeof value === 'string')
            return value.split(',').map(parseFloat) || undefined;
        return isNotNil(value) ? [parseFloat(value)] : undefined;
    }
    getPropertyAsStrings(definition) {
        const value = this.getProperty(definition);
        return value && value.split(',') || undefined;
    }
    getProperty(definition) {
        if (!definition)
            throw new Error('Missing \'definition\' argument');
        return isNotNil(this.properties[definition.key]) ? this.properties[definition.key] : definition.defaultValue;
    }
};
Program.ENTITY_NAME = 'Program';
Program = Program_1 = __decorate([
    EntityClass({ typename: 'ProgramVO' }),
    __metadata("design:paramtypes", [])
], Program);
export { Program };
let ProgramDepartment = ProgramDepartment_1 = class ProgramDepartment extends Entity {
    constructor() {
        super(ProgramDepartment_1.TYPENAME);
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
        this.programId = source.programId;
        this.location = source.location && ReferentialRef.fromObject(source.location);
        this.privilege = source.privilege && ReferentialRef.fromObject(source.privilege);
        this.department = source.department && ReferentialRef.fromObject(source.department);
    }
};
ProgramDepartment = ProgramDepartment_1 = __decorate([
    EntityClass({ typename: 'ProgramDepartmentVO' }),
    __metadata("design:paramtypes", [])
], ProgramDepartment);
export { ProgramDepartment };
let ProgramPerson = ProgramPerson_1 = class ProgramPerson extends Entity {
    constructor() {
        super(ProgramPerson_1.TYPENAME);
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.location = this.location && this.location.asObject(opts) || undefined;
        target.privilege = this.privilege && this.privilege.asObject(opts);
        target.person = this.person && this.person.asObject(opts);
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.programId = source.programId;
        this.location = source.location && ReferentialRef.fromObject(source.location);
        this.privilege = source.privilege && ReferentialRef.fromObject(source.privilege);
        this.person = source.person && Person.fromObject(source.person);
    }
    equals(other) {
        return ProgramPerson_1.equals(this, other);
    }
};
ProgramPerson.equals = (o1, o2) => EntityUtils.equals(o1, o2)
    || (o1 && o2
        && ReferentialUtils.equals(o1.person, o2.person)
        && ReferentialUtils.equals(o1.privilege, o2.privilege)
        && ReferentialUtils.equals(o1.location, o2.location));
ProgramPerson = ProgramPerson_1 = __decorate([
    EntityClass({ typename: 'ProgramPersonVO' }),
    __metadata("design:paramtypes", [])
], ProgramPerson);
export { ProgramPerson };
export class ProgramUtils {
    static getAcquisitionLevels(program) {
        // If has been filled directly in the program: use it
        if (isNotEmptyArray(program.acquisitionLevelLabels))
            return program.acquisitionLevelLabels;
        // No strategies (e.g. may be not fetched) - should never occur
        if (isNotEmptyArray(program.strategies)) {
            console.warn('[program-utils] Cannot get acquisition levels from the given program: missing attributes \'acquisitionLevelLabels\' or \'strategies\'');
            return [];
        }
        // Or get list from strategie
        const acquisitionLevelLabels = program.strategies
            .flatMap(strategy => (strategy.denormalizedPmfms || strategy.pmfms || [])
            .map(pmfm => {
            var _a;
            if (pmfm && pmfm instanceof PmfmStrategy) {
                return (typeof pmfm.acquisitionLevel === 'string' ? pmfm.acquisitionLevel : (_a = pmfm.acquisitionLevel) === null || _a === void 0 ? void 0 : _a.label);
            }
            if (pmfm && pmfm instanceof DenormalizedPmfmStrategy) {
                return pmfm.acquisitionLevel;
            }
        })
            .filter(isNotNil));
        return removeDuplicatesFromArray(acquisitionLevelLabels);
    }
    static getLocationLevelIds(program) {
        return ProgramPropertiesUtils.getPropertyAsNumbersByEntityName(program, 'LocationLevel');
    }
}
//# sourceMappingURL=program.model.js.map