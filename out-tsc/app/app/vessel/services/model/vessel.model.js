var Vessel_1, VesselFeatures_1, VesselRegistrationPeriod_1;
import { __decorate, __metadata } from "tslib";
import { DateUtils, Department, Entity, EntityClass, fromDateISOString, isNil, isNilOrBlank, isNotNil, Person, ReferentialRef, ReferentialUtils, toDateISOString } from '@sumaris-net/ngx-components';
import { RootDataEntity } from '@app/data/services/model/root-data-entity.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
let Vessel = Vessel_1 = class Vessel extends RootDataEntity {
    constructor() {
        super(Vessel_1.TYPENAME);
        this.vesselType = null;
        this.statusId = null;
        this.vesselFeatures = null;
        this.vesselRegistrationPeriod = null;
    }
    // TODO : Check if clone is needed
    clone() {
        const target = new Vessel_1();
        this.copy(target);
        target.vesselType = this.vesselType && this.vesselType.clone() || undefined;
        target.program = this.program && this.program.clone() || undefined;
        target.vesselFeatures = this.vesselFeatures && this.vesselFeatures.clone() || undefined;
        target.vesselRegistrationPeriod = this.vesselRegistrationPeriod && this.vesselRegistrationPeriod.clone() || undefined;
        target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.clone() || undefined;
        target.recorderPerson = this.recorderPerson && this.recorderPerson.clone() || undefined;
        return target;
    }
    copy(target) {
        target.fromObject(this);
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.statusId = source.statusId;
        this.vesselType = source.vesselType && ReferentialRef.fromObject(source.vesselType);
        this.vesselFeatures = source.vesselFeatures && VesselFeatures.fromObject(source.vesselFeatures);
        this.vesselRegistrationPeriod = source.vesselRegistrationPeriod && VesselRegistrationPeriod.fromObject(source.vesselRegistrationPeriod);
        this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
    }
    asObject(options) {
        const target = super.asObject(options);
        target.vesselType = this.vesselType && this.vesselType.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.vesselFeatures = this.vesselFeatures && !this.vesselFeatures.empty && this.vesselFeatures.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.vesselRegistrationPeriod = this.vesselRegistrationPeriod && !this.vesselRegistrationPeriod.empty && this.vesselRegistrationPeriod.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(options) || undefined;
        return target;
    }
    equals(other) {
        return (super.equals(other) && isNotNil(this.id))
            && (this.vesselFeatures.id === other.vesselFeatures.id || this.vesselFeatures.startDate.isSame(other.vesselFeatures.startDate))
            && (this.vesselRegistrationPeriod.id === other.vesselRegistrationPeriod.id || this.vesselRegistrationPeriod.startDate.isSame(other.vesselRegistrationPeriod.startDate));
    }
};
Vessel.ENTITY_NAME = 'Vessel';
Vessel = Vessel_1 = __decorate([
    EntityClass({ typename: 'VesselVO' }),
    __metadata("design:paramtypes", [])
], Vessel);
export { Vessel };
let VesselFeatures = VesselFeatures_1 = class VesselFeatures extends Entity {
    constructor() {
        super(VesselFeatures_1.TYPENAME);
        this.hullMaterial = null;
        this.basePortLocation = null;
        this.recorderDepartment = null;
        this.recorderPerson = null;
    }
    get empty() {
        return isNil(this.id) && isNilOrBlank(this.exteriorMarking) && isNilOrBlank(this.name) && isNil(this.startDate);
    }
    // TODO : Check if clone is needed
    clone() {
        const target = new VesselFeatures_1();
        this.copy(target);
        target.hullMaterial = this.hullMaterial && this.hullMaterial.clone() || undefined;
        target.basePortLocation = this.basePortLocation && this.basePortLocation.clone() || undefined;
        target.vesselId = this.vesselId || undefined;
        target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.clone() || undefined;
        target.recorderPerson = this.recorderPerson && this.recorderPerson.clone() || undefined;
        return target;
    }
    copy(target) {
        target.fromObject(this);
        return target;
    }
    asObject(options) {
        const target = super.asObject(options);
        target.vesselId = this.vesselId;
        target.hullMaterial = this.hullMaterial && this.hullMaterial.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.basePortLocation = this.basePortLocation && this.basePortLocation.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.startDate = toDateISOString(DateUtils.markTime(this.startDate));
        target.endDate = toDateISOString(DateUtils.markTime(this.endDate));
        target.creationDate = toDateISOString(this.creationDate);
        target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(options) || undefined;
        target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(options) || undefined;
        target.qualityFlagId = isNotNil(this.qualityFlagId) ? this.qualityFlagId : undefined;
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.vesselId = source.vesselId;
        this.exteriorMarking = source.exteriorMarking;
        this.name = source.name;
        this.comments = source.comments || undefined;
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.administrativePower = source.administrativePower;
        this.lengthOverAll = source.lengthOverAll;
        this.grossTonnageGt = source.grossTonnageGt;
        this.grossTonnageGrt = source.grossTonnageGrt;
        this.constructionYear = source.constructionYear;
        this.ircs = source.ircs;
        this.hullMaterial = source.hullMaterial && ReferentialRef.fromObject(source.hullMaterial);
        this.basePortLocation = source.basePortLocation && ReferentialRef.fromObject(source.basePortLocation);
        this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
        this.recorderPerson = source.recorderPerson && Person.fromObject(source.recorderPerson);
        this.creationDate = fromDateISOString(source.creationDate);
        this.qualityFlagId = source.qualityFlagId;
    }
};
VesselFeatures = VesselFeatures_1 = __decorate([
    EntityClass({ typename: 'VesselFeaturesVO' }),
    __metadata("design:paramtypes", [])
], VesselFeatures);
export { VesselFeatures };
let VesselRegistrationPeriod = VesselRegistrationPeriod_1 = class VesselRegistrationPeriod extends Entity {
    constructor() {
        super(VesselRegistrationPeriod_1.TYPENAME);
        this.vesselId = null;
        this.startDate = null;
        this.endDate = null;
        this.registrationCode = null;
        this.intRegistrationCode = null;
        this.registrationLocation = null;
    }
    get empty() {
        return isNil(this.id) && isNilOrBlank(this.registrationCode) && isNilOrBlank(this.intRegistrationCode)
            && ReferentialUtils.isEmpty(this.registrationLocation)
            && isNil(this.startDate);
    }
    // TODO : Check if clone is needed
    clone() {
        const target = new VesselRegistrationPeriod_1();
        this.copy(target);
        target.registrationLocation = this.registrationLocation && this.registrationLocation.clone() || undefined;
        return target;
    }
    copy(target) {
        target.fromObject(this);
        return target;
    }
    asObject(options) {
        const target = super.asObject(options);
        target.registrationLocation = this.registrationLocation && this.registrationLocation.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.startDate = toDateISOString(DateUtils.markTime(this.startDate));
        target.endDate = toDateISOString(DateUtils.markTime(this.endDate));
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.registrationCode = source.registrationCode;
        this.intRegistrationCode = source.intRegistrationCode;
        this.vesselId = source.vesselId;
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.registrationLocation = source.registrationLocation && ReferentialRef.fromObject(source.registrationLocation) || undefined;
    }
};
VesselRegistrationPeriod = VesselRegistrationPeriod_1 = __decorate([
    EntityClass({ typename: 'VesselRegistrationPeriodVO' }),
    __metadata("design:paramtypes", [])
], VesselRegistrationPeriod);
export { VesselRegistrationPeriod };
//# sourceMappingURL=vessel.model.js.map