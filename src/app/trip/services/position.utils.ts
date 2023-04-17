import { IPosition } from '@app/trip/services/model/position.model';
import { GeolocationUtils } from '@sumaris-net/ngx-components';
import { BBox } from 'geojson';
import { Geometries } from '@app/shared/geometries.utils';


export abstract class PositionUtils {

  static isNotNilAndValid = GeolocationUtils.isNotNilAndValid;
  static isNilOrInvalid = GeolocationUtils.isNilOrInvalid;
  static computeDistanceInMiles = GeolocationUtils.computeDistanceInMiles;
  static getCurrentPosition = GeolocationUtils.getCurrentPosition;

  static createBBoxFilter(boundingBox: BBox): (p: IPosition) => boolean {
    return (p) => PositionUtils.isInsideBBox(p, boundingBox);
  }

  static isInsideBBox(p: IPosition, boundingBox: BBox): boolean {
    return p && Geometries.isPositionInsideBBox([p.longitude, p.latitude], boundingBox);
  }
}
