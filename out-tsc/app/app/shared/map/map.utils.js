/**
 *  Create a Canvas as ImageOverlay to draw the Lat/Lon Graticule,
 *  and show the axis tick label on the edge of the map.
 *  Author: lanwei@cloudybay.com.tw
 */
import * as L from 'leaflet';
import { EXTRACTION_CONFIG_OPTIONS } from '@app/extraction/common/extraction.config';
export class MapUtils {
    static getMapCenter(config) {
        let centerCoords = config.getPropertyAsNumbers(EXTRACTION_CONFIG_OPTIONS.EXTRACTION_MAP_CENTER_LAT_LNG);
        centerCoords = ((centerCoords === null || centerCoords === void 0 ? void 0 : centerCoords.length) === 2) ? centerCoords : [0, 0];
        const zoom = config.getPropertyAsInt(EXTRACTION_CONFIG_OPTIONS.EXTRACTION_MAP_CENTER_ZOOM);
        return {
            center: L.latLng(centerCoords),
            zoom: zoom || this.MAX_ZOOM
        };
    }
}
MapUtils.MAX_ZOOM = 12;
//# sourceMappingURL=map.utils.js.map