var TranscribingItemType_1, TranscribingItem_1;
import { __decorate, __metadata } from "tslib";
import { BaseReferential, EntityClass, isNotNil, isNotNilOrBlank, ReferentialRef, toNumber, } from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from '@app/referential/services/filter/referential.filter';
let TranscribingItemType = TranscribingItemType_1 = class TranscribingItemType extends BaseReferential {
    constructor() {
        super(TranscribingItemType_1.TYPENAME);
    }
    fromObject(source) {
        super.fromObject(source);
        this.objectType = source.objectType && ReferentialRef.fromObject(source.objectType);
        this.system = source.system && ReferentialRef.fromObject(source.system);
        this.items = source.items && source.items.map((item) => TranscribingItem.fromObject(item));
    }
    asObject(opts) {
        var _a, _b, _c, _d;
        const target = super.asObject(opts);
        target.objectType = (_a = this.objectType) === null || _a === void 0 ? void 0 : _a.asObject(opts);
        target.items = (_b = this.items) === null || _b === void 0 ? void 0 : _b.map((item) => item.asObject(opts));
        target.systemId = toNumber(this.systemId, (_c = this.system) === null || _c === void 0 ? void 0 : _c.id);
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            delete target.items;
            delete target.system;
        }
        else {
            target.system = (_d = this.system) === null || _d === void 0 ? void 0 : _d.asObject(opts);
        }
        return target;
    }
};
TranscribingItemType.ENTITY_NAME = 'TranscribingItemType';
TranscribingItemType = TranscribingItemType_1 = __decorate([
    EntityClass({ typename: 'TranscribingItemTypeVO' }),
    __metadata("design:paramtypes", [])
], TranscribingItemType);
export { TranscribingItemType };
let TranscribingItem = TranscribingItem_1 = class TranscribingItem extends BaseReferential {
    constructor() {
        super(TranscribingItem_1.TYPENAME);
        this.type = null;
        this.object = null;
        // Properties to expose (detected by Object.keys())
        // Used to create columns in base referential table
        this.statusId = null;
        this.label = null;
    }
    static equals(o1, o2) {
        var _a, _b, _c, _d;
        return o1 && o2 && o1.id === o2.id
            // Or
            || (
            // Same label
            (o1.label === o2.label)
                // Same object id
                && (toNumber(o1.objectId, (_a = o1.object) === null || _a === void 0 ? void 0 : _a.id) === toNumber(o2.objectId, (_b = o2.object) === null || _b === void 0 ? void 0 : _b.id))
                // Same type id
                && (toNumber(o1.typeId, (_c = o1.type) === null || _c === void 0 ? void 0 : _c.id) === toNumber(o2.typeId, (_d = o2.type) === null || _d === void 0 ? void 0 : _d.id)));
    }
    fromObject(source) {
        var _a, _b;
        super.fromObject(source);
        this.typeId = toNumber(source.typeId, (_a = source.type) === null || _a === void 0 ? void 0 : _a.id);
        this.type = source.object && ReferentialRef.fromObject(source.type);
        this.objectId = toNumber(source.objectId, (_b = source.object) === null || _b === void 0 ? void 0 : _b.id);
        this.object = source.object && ReferentialRef.fromObject(source.object);
    }
    asObject(opts) {
        var _a, _b;
        const target = super.asObject(opts);
        target.type = (_a = this.type) === null || _a === void 0 ? void 0 : _a.asObject(opts);
        target.object = (_b = this.object) === null || _b === void 0 ? void 0 : _b.asObject(opts);
        return target;
    }
};
TranscribingItem.ENTITY_NAME = 'TranscribingItem';
TranscribingItem = TranscribingItem_1 = __decorate([
    EntityClass({ typename: 'TranscribingItemVO' }),
    __metadata("design:paramtypes", [])
], TranscribingItem);
export { TranscribingItem };
let TranscribingItemFilter = class TranscribingItemFilter extends BaseReferentialFilter {
    fromObject(source) {
        var _a;
        super.fromObject(source);
        this.typeId = toNumber(source.typeId, (_a = source.type) === null || _a === void 0 ? void 0 : _a.id);
        this.type = source.object && ReferentialRef.fromObject(source.type);
    }
    asObject(opts) {
        var _a;
        const target = super.asObject(opts);
        target.type = (_a = this.type) === null || _a === void 0 ? void 0 : _a.asObject(opts);
        return target;
    }
    buildFilter() {
        var _a, _b;
        const filterFns = super.buildFilter();
        // Type
        const typeId = toNumber(this.typeId, (_a = this.type) === null || _a === void 0 ? void 0 : _a.id);
        if (isNotNil(typeId)) {
            filterFns.push(t => { var _a; return t.typeId === typeId || ((_a = t.type) === null || _a === void 0 ? void 0 : _a.id) === typeId; });
        }
        else {
            const typeLabel = (_b = this.type) === null || _b === void 0 ? void 0 : _b.label;
            if (isNotNilOrBlank(typeLabel)) {
                filterFns.push(t => { var _a; return ((_a = t.type) === null || _a === void 0 ? void 0 : _a.label) === typeLabel; });
            }
        }
        return filterFns;
    }
};
TranscribingItemFilter = __decorate([
    EntityClass({ typename: 'TranscribingItemVO' })
], TranscribingItemFilter);
export { TranscribingItemFilter };
//# sourceMappingURL=transcribing.model.js.map