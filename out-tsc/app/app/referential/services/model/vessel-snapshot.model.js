var VesselSnapshot_1;
import { __decorate, __metadata } from "tslib";
import { Department, Entity, EntityClass, fromDateISOString, Person, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { Vessel } from '@app/vessel/services/model/vessel.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
let VesselSnapshot = VesselSnapshot_1 = class VesselSnapshot extends Entity {
    constructor() {
        super(VesselSnapshot_1.TYPENAME);
        this.vesselType = null;
        this.basePortLocation = null;
        this.registrationLocation = null;
        this.recorderDepartment = null;
        this.recorderPerson = null;
        this.program = null;
    }
    static fromVessel(source) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        if (!source)
            return undefined;
        const target = new VesselSnapshot_1();
        target.fromObject({
            id: source.id,
            vesselType: source.vesselType,
            vesselStatusId: source.statusId,
            name: (_a = source.vesselFeatures) === null || _a === void 0 ? void 0 : _a.name,
            creationDate: source.creationDate,
            updateDate: source.updateDate,
            startDate: (_b = source.vesselFeatures) === null || _b === void 0 ? void 0 : _b.startDate,
            endDate: (_c = source.vesselFeatures) === null || _c === void 0 ? void 0 : _c.endDate,
            exteriorMarking: (_d = source.vesselFeatures) === null || _d === void 0 ? void 0 : _d.exteriorMarking,
            basePortLocation: (_e = source.vesselFeatures) === null || _e === void 0 ? void 0 : _e.basePortLocation,
            grossTonnageGt: (_f = source.vesselFeatures) === null || _f === void 0 ? void 0 : _f.grossTonnageGt,
            grossTonnageGrt: (_g = source.vesselFeatures) === null || _g === void 0 ? void 0 : _g.grossTonnageGrt,
            lengthOverAll: (_h = source.vesselFeatures) === null || _h === void 0 ? void 0 : _h.lengthOverAll,
            registrationId: (_j = source.vesselRegistrationPeriod) === null || _j === void 0 ? void 0 : _j.id,
            registrationCode: (_k = source.vesselRegistrationPeriod) === null || _k === void 0 ? void 0 : _k.registrationCode,
            intRegistrationCode: (_l = source.vesselRegistrationPeriod) === null || _l === void 0 ? void 0 : _l.intRegistrationCode,
            registrationStartDate: (_m = source.vesselRegistrationPeriod) === null || _m === void 0 ? void 0 : _m.startDate,
            registrationEndDate: (_o = source.vesselRegistrationPeriod) === null || _o === void 0 ? void 0 : _o.endDate,
            registrationLocation: (_p = source.vesselRegistrationPeriod) === null || _p === void 0 ? void 0 : _p.registrationLocation,
        });
        return target;
    }
    static toVessel(source) {
        if (!source)
            return undefined;
        return Vessel.fromObject({
            id: source.id,
            vesselType: source.vesselType,
            statusId: source.vesselStatusId,
            creationDate: source.creationDate,
            updateDate: source.updateDate,
            vesselFeatures: {
                vesselId: source.id,
                name: source.name,
                startDate: source.startDate,
                endDate: source.endDate,
                exteriorMarking: source.exteriorMarking,
                grossTonnageGt: source.grossTonnageGt,
                grossTonnageGrt: source.grossTonnageGrt,
                lengthOverAll: source.lengthOverAll,
                basePortLocation: source.basePortLocation,
            },
            vesselRegistrationPeriod: {
                id: source.registrationId,
                vesselId: source.id,
                registrationCode: source.registrationCode,
                intRegistrationCode: source.intRegistrationCode,
                registrationStartDate: source.startDate,
                registrationEndDate: source.endDate,
                registrationLocation: source.registrationLocation
            }
        });
    }
    // TODO: Check if clone is needed
    clone() {
        const target = new VesselSnapshot_1();
        target.fromObject(this);
        target.program = this.program && this.program.clone() || undefined;
        target.vesselType = this.vesselType && this.vesselType.clone() || undefined;
        target.basePortLocation = this.basePortLocation && this.basePortLocation.clone() || undefined;
        target.registrationLocation = this.registrationLocation && this.registrationLocation.clone() || undefined;
        target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.clone() || undefined;
        target.recorderPerson = this.recorderPerson && this.recorderPerson.clone() || undefined;
        return target;
    }
    asObject(options) {
        const target = super.asObject(options);
        target.program = this.program && this.program.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS /*always keep for table*/)) || undefined;
        target.vesselType = this.vesselType && this.vesselType.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.basePortLocation = this.basePortLocation && this.basePortLocation.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.registrationLocation = this.registrationLocation && this.registrationLocation.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.startDate = toDateISOString(this.startDate);
        target.endDate = toDateISOString(this.endDate);
        target.registrationStartDate = !options || options.minify !== true ? toDateISOString(this.registrationStartDate) : undefined;
        target.registrationEndDate = !options || options.minify !== true ? toDateISOString(this.registrationEndDate) : undefined;
        target.creationDate = toDateISOString(this.creationDate);
        target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(options) || undefined;
        target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(options) || undefined;
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.exteriorMarking = source.exteriorMarking;
        this.registrationCode = source.registrationCode;
        this.intRegistrationCode = source.intRegistrationCode;
        this.name = source.name;
        this.comments = source.comments || undefined;
        this.vesselStatusId = source.vesselStatusId;
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.registrationId = source.registrationId;
        this.registrationStartDate = fromDateISOString(source.registrationStartDate);
        this.registrationEndDate = fromDateISOString(source.registrationEndDate);
        this.administrativePower = source.administrativePower || undefined;
        this.lengthOverAll = source.lengthOverAll || undefined;
        this.grossTonnageGt = source.grossTonnageGt || undefined;
        this.grossTonnageGrt = source.grossTonnageGrt || undefined;
        this.creationDate = fromDateISOString(source.creationDate);
        this.vesselType = source.vesselType && ReferentialRef.fromObject(source.vesselType);
        this.basePortLocation = source.basePortLocation && ReferentialRef.fromObject(source.basePortLocation);
        this.registrationLocation = source.registrationLocation && ReferentialRef.fromObject(source.registrationLocation);
        this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
        this.recorderPerson = source.recorderPerson && Person.fromObject(source.recorderPerson);
        this.program = source.program && ReferentialRef.fromObject(source.program);
    }
};
VesselSnapshot = VesselSnapshot_1 = __decorate([
    EntityClass({ typename: 'VesselSnapshotVO', fromObjectReuseStrategy: 'clone' }),
    __metadata("design:paramtypes", [])
], VesselSnapshot);
export { VesselSnapshot };
//# sourceMappingURL=vessel-snapshot.model.js.map