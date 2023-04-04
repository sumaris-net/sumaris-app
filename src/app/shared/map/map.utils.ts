/**
 *  Create a Canvas as ImageOverlay to draw the Lat/Lon Graticule,
 *  and show the axis tick label on the edge of the map.
 *  Author: lanwei@cloudybay.com.tw
 */

import * as L from 'leaflet';
import { GeoJSONOptions } from 'leaflet';
import { Configuration, formatLatitude, formatLongitude, LatLongFormatOptions, LatLongPattern } from '@sumaris-net/ngx-components';
import { EXTRACTION_CONFIG_OPTIONS } from '@app/extraction/common/extraction.config';

export interface MapCenter {
  center: L.LatLng;
  zoom: number;
}

export class MapUtils {
  static MAX_ZOOM = 10;

  static getMapCenter(config: Configuration): MapCenter {
    let centerCoords = config.getPropertyAsNumbers(EXTRACTION_CONFIG_OPTIONS.EXTRACTION_MAP_CENTER_LAT_LNG);
    centerCoords = (centerCoords?.length === 2) ? centerCoords : [0, 0];
    const zoom = config.getPropertyAsInt(EXTRACTION_CONFIG_OPTIONS.EXTRACTION_MAP_CENTER_ZOOM);
    return <MapCenter>{
      center: L.latLng(centerCoords as [number, number]),
      zoom: zoom || this.MAX_ZOOM
    };
  }
}
