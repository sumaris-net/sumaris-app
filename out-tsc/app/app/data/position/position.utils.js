import { GeolocationUtils } from '@sumaris-net/ngx-components';
import { Geometries } from '@app/shared/geometries.utils';
export class PositionUtils {
    static createBBoxFilter(boundingBox) {
        return (p) => PositionUtils.isInsideBBox(p, boundingBox);
    }
    static isInsideBBox(p, boundingBox) {
        return p && Geometries.isPositionInsideBBox([p.longitude, p.latitude], boundingBox);
    }
}
PositionUtils.isNotNilAndValid = GeolocationUtils.isNotNilAndValid;
PositionUtils.isNilOrInvalid = GeolocationUtils.isNilOrInvalid;
PositionUtils.computeDistanceInMiles = GeolocationUtils.computeDistanceInMiles;
PositionUtils.getCurrentPosition = GeolocationUtils.getCurrentPosition;
//# sourceMappingURL=position.utils.js.map