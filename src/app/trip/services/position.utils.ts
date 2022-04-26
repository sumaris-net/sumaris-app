import { IPosition } from '@app/trip/services/model/position.model';
import { isNil } from '@sumaris-net/ngx-components';
import { Geolocation, GeolocationOptions, Geoposition } from '@ionic-native/geolocation/ngx';
import { BBox } from 'geojson';
import { Geometries } from '@app/shared/geometries.utils';


export abstract class PositionUtils {

  static isNilOrInvalid(position: IPosition, opts?: {debug?: boolean}) {
    // Incomplete value: cannot compute
    if (!position || isNil(position.latitude) || isNil(position.longitude)) return true;

    // Invalid lat/lon
    if (position.latitude < -90 || position.latitude > 90
      || position.longitude < -180 || position.longitude > 180) {

      // /!\ Log in console, because should never occur
      if (opts && opts.debug) console.warn('Invalid lat/long position:  ', position);
      return true;
    }

    return false;
  }

  static computeDistanceInMiles(position1: IPosition, position2: IPosition): number {
    // Invalid position(s): skip
    if (PositionUtils.isNilOrInvalid(position1, {debug: true})
      || PositionUtils.isNilOrInvalid(position2, {debug: true})) return;

    const latitude1Rad = Math.PI * position1.latitude / 180;
    const longitude1Rad = Math.PI * position1.longitude / 180;
    const latitude2Rad = Math.PI * position2.latitude / 180;
    const longitude2Rad = Math.PI * position2.longitude / 180;

    let distance = 2 * 6371 * Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((latitude1Rad - latitude2Rad) / 2), 2)
        + Math.cos(latitude1Rad) * Math.cos(latitude2Rad) * Math.pow(Math.sin((longitude2Rad - longitude1Rad) / 2), 2)
      ));
    distance = Math.round((((distance / 1.852) + Number.EPSILON) * 100)) / 100;
    return distance;
  }

  /**
   * Get the position by geo loc sensor
   */
  static async getCurrentPosition(geolocation?: Geolocation, options?: GeolocationOptions): Promise<IPosition> {
    options = {
      maximumAge: 30000/*30s*/,
      timeout: 10000/*10s*/,
      enableHighAccuracy: true,
      ...options
    };

    // Use ionic-native plugin
    if (geolocation) {
      console.info('[position-utils] Get current geo position, using cordova plugin...')
      try {
        const pos: Geoposition = await geolocation.getCurrentPosition(options);
        return <IPosition>{
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
      } catch (err) {
        console.error('[position-utils] Cannot get current geo position, using cordova plugin:', err);
        throw err;
      }
    }

    // Or fallback to navigator
    console.info('[position-utils] Get current geo position, using browser...')
    return new Promise<IPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition((res) => {
          resolve(<IPosition>{
            latitude: res.coords.latitude,
            longitude: res.coords.longitude
          });
        },
        (err) => {
          console.error('[position-utils] Cannot get current geo position, using browser:', err);
          reject(err);
        },
        options
      );
    });
  }

  static createBBoxFilter(boundingBox: BBox): (p: IPosition) => boolean {
    return (p) => PositionUtils.isInsideBBox(p, boundingBox);
  }

  static isInsideBBox(p: IPosition, boundingBox: BBox): boolean {
    return p && Geometries.isPositionInsideBBox([p.longitude, p.latitude], boundingBox);
  }
}
