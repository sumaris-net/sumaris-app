var FishingArea_1;
import { __decorate, __metadata } from "tslib";
import { DataEntity } from '../services/model/data-entity.model';
import { EntityClass, isNotNil, ReferentialRef, ReferentialUtils } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Geometries } from '@app/shared/geometries.utils';
import { LocationUtils } from '@app/referential/location/location.utils';
let FishingArea = FishingArea_1 = class FishingArea extends DataEntity {
    // operationId: number;
    constructor() {
        super(FishingArea_1.TYPENAME);
        this.location = null;
        this.distanceToCoastGradient = null;
        this.depthGradient = null;
        this.nearbySpecificArea = null;
        // this.operationId = null;
    }
    static equals(o1, o2) {
        return ((isNotNil(o1 === null || o1 === void 0 ? void 0 : o1.id) && o1.id === (o2 === null || o2 === void 0 ? void 0 : o2.id)) ||
            (!!o1 &&
                o2 &&
                ReferentialUtils.equals(o1 === null || o1 === void 0 ? void 0 : o1.distanceToCoastGradient, o2.distanceToCoastGradient) &&
                ReferentialUtils.equals(o1 === null || o1 === void 0 ? void 0 : o1.depthGradient, o2.depthGradient) &&
                ReferentialUtils.equals(o1 === null || o1 === void 0 ? void 0 : o1.nearbySpecificArea, o2.nearbySpecificArea)));
    }
    static isEmpty(value) {
        return (!value ||
            (ReferentialUtils.isEmpty(value.location) &&
                ReferentialUtils.isEmpty(value.distanceToCoastGradient) &&
                ReferentialUtils.isEmpty(value.depthGradient) &&
                ReferentialUtils.isEmpty(value.nearbySpecificArea)));
    }
    asObject(options) {
        const target = super.asObject(options);
        target.location = (this.location && this.location.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS))) || undefined;
        target.distanceToCoastGradient =
            (this.distanceToCoastGradient && this.distanceToCoastGradient.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS))) || undefined;
        target.depthGradient = (this.depthGradient && this.depthGradient.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS))) || undefined;
        target.nearbySpecificArea = (this.nearbySpecificArea && this.nearbySpecificArea.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS))) || undefined;
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.location = source.location && ReferentialRef.fromObject(source.location);
        this.distanceToCoastGradient = source.distanceToCoastGradient && ReferentialRef.fromObject(source.distanceToCoastGradient);
        this.depthGradient = source.depthGradient && ReferentialRef.fromObject(source.depthGradient);
        this.nearbySpecificArea = source.nearbySpecificArea && ReferentialRef.fromObject(source.nearbySpecificArea);
        // this.operationId = source.operationId;
        return this;
    }
    equals(other) {
        return ((super.equals(other) && isNotNil(this.id)) ||
            (ReferentialUtils.equals(this.location, other.location) &&
                ReferentialUtils.equals(this.distanceToCoastGradient, other.distanceToCoastGradient) &&
                ReferentialUtils.equals(this.depthGradient, other.depthGradient) &&
                ReferentialUtils.equals(this.nearbySpecificArea, other.nearbySpecificArea)));
    }
};
FishingArea = FishingArea_1 = __decorate([
    EntityClass({ typename: 'FishingAreaVO' }),
    __metadata("design:paramtypes", [])
], FishingArea);
export { FishingArea };
export class FishingAreaUtils {
    static createBBoxFilter(boundingBox) {
        return (fa) => {
            var _a;
            const rectBbox = LocationUtils.getBBoxFromRectangleLabel((_a = fa.location) === null || _a === void 0 ? void 0 : _a.label);
            return rectBbox && Geometries.isBBoxInside(rectBbox, boundingBox);
        };
    }
}
//# sourceMappingURL=fishing-area.model.js.map