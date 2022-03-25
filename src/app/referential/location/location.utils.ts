import { isNil } from '@sumaris-net/ngx-components';

export class LocationUtils {

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
}
