import { isNil } from '@sumaris-net/ngx-components';
import { BBox, MultiPolygon, Polygon } from 'geojson';
import { Geometries } from '@app/shared/geometries.utils';

export class LocationUtils {

  static RECTANGLE_LABEL_REGEXP = /^M?[0-9]{2,3}[A-Z][0-9]{1,2}$/

  /**
   * Return statistical rectangle (ICES or GFCM) from longitude/latitude (in decimal degrees - WG84).
   *
   * @param lat  a latitude (in decimal degrees - WG84)
   * @param lon a longitude (in decimal degrees - WG84)
   * @return A label corresponding to a statistical rectangle, or undefined if no statistical rectangle exists for this position
   */
  static getRectangleLabelByLatLong(lat: number, lon: number): string | undefined {
    if (isNil(lat) || isNil(lat)) return undefined; // Skip

    let result: string;

    // If position inside "Mediterranean and black sea" :
    if (((lon >= 0 && lon < 42) && (lat >= 30 && lat < 47.5))
      || ((lon >= -6 && lon < 0) && (lat >= 35 && lat < 40))) {

      // Number of rectangles, between the given latitude and 30°N :
      const nbdemidegreeLat = Math.floor((lat - 30)) * 2;

      // Number of rectangles, between the given longitude and 6°W :
      const nbdemidegreeLong = Math.floor((lon + 6)) * 2;

      // Letter change every 10 rectangles, starting with 'A' :
      const letter = String.fromCharCode(Math.floor(nbdemidegreeLong / 10) + 65);
      const rest = (nbdemidegreeLong % 10);
      result = `M${nbdemidegreeLat}${letter}${rest}`;
    }

    // If position inside "Atlantic (nord-east)" :
    else if ((lon >= -50 && lon <= 70) && (lat >= 36 && lat <= 89)) {
      const halfDegreesNb = Math.floor((lat - 36) * 2) + 1;
      const degreesNb = Math.floor(lon + 50);
      const letter = String.fromCharCode(Math.floor(degreesNb / 10) + 65);
      const rest = (degreesNb % 10);
      result =  `${halfDegreesNb}${letter}${rest}`;
    }
    return result;
  }

  static isStatisticalRectangleLabel(label: string): boolean {
    return label && LocationUtils.RECTANGLE_LABEL_REGEXP.test(label) || false;
  }

  static getGeometryFromRectangleLabel<T extends Polygon | MultiPolygon> (rectangleLabel: string, opts = {checkValid: true}): Polygon {
    const bbox = LocationUtils.getBBoxFromRectangleLabel(rectangleLabel);
    // Check is valid
    if (opts.checkValid && !bbox) throw new Error(`Invalid statistical rectangle '${rectangleLabel}': unknown format`);

    return bbox && Geometries.createRectangleGeometry(bbox[0], bbox[1], bbox[2], bbox[3], false) || undefined;

  }

  static getBBoxFromRectangleLabel<T extends Polygon | MultiPolygon> (rectangleLabel: string): BBox|undefined {

    if (!rectangleLabel || !this.isStatisticalRectangleLabel(rectangleLabel)) return undefined; // Skip if invalid

    // If rectangle inside "Mediterranean and black sea"
    if (rectangleLabel.startsWith("M")) {
      const rectangleLabelNoLetter = rectangleLabel.substring(1);
      const nbDemiDegreeLat = rectangleLabelNoLetter.substring(0, 2);
      const letter = rectangleLabelNoLetter.substring(2, 3);
      const rest = rectangleLabelNoLetter.substring(3);

      const latitude = +nbDemiDegreeLat * 0.5 + 30;
      const longitude = +rest * 0.5 + (letter.charCodeAt(0) - 65) * 5 - 6;
      return [longitude, latitude, longitude + 0.5, latitude + 0.5];
    }

    // If rectangle inside "Atlantic (nord-east)" :
    else {
      let nbDemiDegreeLat = rectangleLabel.substring(0, 2);
      let letter = rectangleLabel.substring(2, 3);
      let rest = rectangleLabel.substring(3);

      // Special case for '102D0'
      if (rectangleLabel.length == 5) {
        nbDemiDegreeLat = rectangleLabel.substring(0, 3);
        letter = rectangleLabel.substring(3, 4);
        rest = rectangleLabel.substring(4);
      }

      const latitude = +nbDemiDegreeLat * 0.5 + 35.5;
      const longitude = +rest + (letter.charCodeAt(0) - 65) * 10 - 50;

      return [longitude, latitude, longitude + 1, latitude + 0.5];
    }
  }
}
