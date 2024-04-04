var DevicePosition_1;
import { __decorate, __metadata } from "tslib";
import { DateUtils, Department, EntityClass, EntityFilter, fromDateISOString, isNotNil, Person, Referential, ReferentialUtils, toDateISOString } from '@sumaris-net/ngx-components';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
let DevicePosition = DevicePosition_1 = class DevicePosition extends DataEntity {
    constructor() {
        super(DevicePosition_1.TYPENAME);
        this.recorderDepartment = null;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.dateTime = toDateISOString(this.dateTime);
        target.latitude = this.latitude;
        target.longitude = this.longitude;
        target.objectId = this.objectId;
        target.objectType = this.objectType && this.objectType.asObject(Object.assign(Object.assign({}, opts), { minify: false }));
        target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts);
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.dateTime = fromDateISOString(source.dateTime);
        this.latitude = source.latitude;
        this.longitude = source.longitude;
        this.objectId = source.objectId;
        this.objectType = Referential.fromObject(source.objectType);
        this.recorderPerson = Person.fromObject(source.recorderPerson, opts);
    }
};
DevicePosition.ENTITY_NAME = 'DevicePosition';
DevicePosition = DevicePosition_1 = __decorate([
    EntityClass({ typename: 'DevicePositionVO' }),
    __metadata("design:paramtypes", [])
], DevicePosition);
export { DevicePosition };
let DevicePositionFilter = class DevicePositionFilter extends EntityFilter {
    constructor() {
        super(...arguments);
        this.objectType = null;
        this.objectId = null;
        this.startDate = null;
        this.endDate = null;
        this.recorderPerson = null;
        this.recorderDepartment = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.objectType = Referential.fromObject(source.objectType);
        this.objectId = source.objectId;
        this.recorderPerson = Person.fromObject(source.recorderPerson)
            || isNotNil(source.recorderPersonId) && Person.fromObject({ id: source.recorderPersonId }) || undefined;
        this.recorderDepartment = Department.fromObject(source.recorderDepartment)
            || isNotNil(source.recorderDepartmentId) && Department.fromObject({ id: source.recorderDepartmentId })
            || undefined;
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
    }
    asObject(opts) {
        var _a, _b, _c;
        const target = super.asObject(opts);
        target.startDate = toDateISOString(this.startDate);
        target.endDate = toDateISOString(this.endDate);
        target.objectId = this.objectId;
        if (opts && opts.minify) {
            target.objectTypeLabel = this.objectType && ((_a = this.objectType) === null || _a === void 0 ? void 0 : _a.label);
            delete target.objectType;
            target.recorderPersonId = this.recorderPerson && ((_b = this.recorderPerson) === null || _b === void 0 ? void 0 : _b.id);
            delete target.recorderPerson;
            target.recorderDepartmentId = this.recorderDepartment && ((_c = this.recorderDepartment) === null || _c === void 0 ? void 0 : _c.id);
            delete target.recorderDepartment;
            target.startDate = this.startDate ? DateUtils.resetTime(this.startDate) : undefined;
            target.endDate = this.endDate ? DateUtils.resetTime(this.endDate.add(1, 'day')) : undefined;
        }
        else {
            target.objectType = this.objectType && this.objectType.asObject(opts) || undefined;
            target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
            target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS));
        }
        return target;
    }
    buildFilter() {
        var _a;
        const filterFns = super.buildFilter();
        if (this.objectId) {
            const objectId = this.objectId;
            if (isNotNil(objectId))
                filterFns.push(t => (t.objectId === objectId));
        }
        if (this.objectType) {
            const objectTypeLabel = (_a = this.objectType) === null || _a === void 0 ? void 0 : _a.label;
            if (isNotNil(objectTypeLabel))
                filterFns.push(t => (t.objectType.label === objectTypeLabel));
        }
        if (ReferentialUtils.isNotEmpty(this.recorderPerson)) {
            const recorderPersonId = this.recorderPerson.id;
            filterFns.push(t => (t.recorderPerson && t.recorderPerson.id === recorderPersonId));
        }
        if (ReferentialUtils.isNotEmpty(this.recorderDepartment)) {
            const recorderDepartmentId = this.recorderDepartment.id;
            filterFns.push(t => (t.recorderDepartment && t.recorderDepartment.id === recorderDepartmentId));
        }
        return filterFns;
    }
};
DevicePositionFilter.TYPENAME = 'DevicePositionVO';
DevicePositionFilter = __decorate([
    EntityClass({ typename: 'DevicePositionFilterVO' })
], DevicePositionFilter);
export { DevicePositionFilter };
//# sourceMappingURL=device-position.model.js.map