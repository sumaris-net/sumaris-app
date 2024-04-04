import { isNilOrBlank, isNotNilOrBlank } from '@sumaris-net/ngx-components';
export class Geometries {
    /**
     * Create a polygon from 2 points : bottom left, and top right
     *
     * @param bottomLeftX
     * @param bottomLeftY
     * @param topRightX
     * @param topRightY
     * @param returnHasMultiPolygon
     * @return
     */
    static createRectangleGeometry(bottomLeftX, bottomLeftY, topRightX, topRightY, useMultiPolygon) {
        const coordinates = [
            [bottomLeftX, bottomLeftY],
            [topRightX, bottomLeftY],
            [topRightX, topRightY],
            [bottomLeftX, topRightY]
        ];
        if (useMultiPolygon) {
            return {
                type: 'MultiPolygon',
                coordinates: [[coordinates]]
            };
        }
        return {
            type: 'Polygon',
            coordinates: [coordinates]
        };
    }
    static isLineString(geometry) {
        return geometry && geometry.type === 'LineString';
    }
    static isPolygon(geometry) {
        return geometry && geometry.type === 'Polygon';
    }
    static isMultiPolygon(geometry) {
        return geometry && geometry.type === 'MultiPolygon';
    }
    static parseAsBBox(value) {
        value = value && value.trim();
        if (isNilOrBlank(value))
            return undefined;
        let coords;
        try {
            if (value.startsWith('[') && value.endsWith(']')) {
                coords = JSON.parse(value);
            }
            else if (value.indexOf(',') !== -1) {
                coords = value.split(',')
                    .filter(isNotNilOrBlank)
                    .map(str => parseFloat(str));
            }
        }
        catch (err) {
            throw new Error(`Cannot parse BBox value '${value}' : ${err}`);
        }
        if (this.checkBBox(coords)) {
            return Geometries.normalizeBBox(coords);
        }
        throw new Error(`Invalid BBox value '${value}'. Expected an array of 4 (or 6) numbers`);
    }
    /**
     * Make sure that the first point has lower latitude and longitude, and the second point upper values
     *
     * @param coords
     */
    static normalizeBBox(coords) {
        if ((coords === null || coords === void 0 ? void 0 : coords.length) !== 4 && coords.length !== 6) {
            throw new Error(`Invalid BBox value '${coords}'. Expected an array of 4 (or 6) numbers`);
        }
        const lastOffset = coords.length / 2;
        // 2 dimensions
        if (coords.length === 4) {
            return [
                Math.min(coords[0], coords[lastOffset]),
                Math.min(coords[1], coords[lastOffset + 1]),
                Math.max(coords[0], coords[lastOffset]),
                Math.max(coords[1], coords[lastOffset + 1])
            ];
        }
        // 3 dimensions
        return [
            Math.min(coords[0], coords[lastOffset]),
            Math.min(coords[1], coords[lastOffset + 1]),
            Math.min(coords[2], coords[lastOffset + 2]),
            Math.max(coords[0], coords[lastOffset]),
            Math.max(coords[1], coords[lastOffset + 1]),
            Math.max(coords[2], coords[lastOffset + 2])
        ];
    }
    static checkBBox(coords) {
        if (!coords || !Array.isArray(coords) || (coords.length !== 4 && coords.length !== 6)) {
            return false;
        }
        const lastOffset = coords.length / 2;
        // Check longitude
        if (coords[0] < -180 || coords[0] > 180 || coords[lastOffset] < -180 || coords[lastOffset] > 180) {
            return false;
        }
        // Check latitude
        if (coords[1] < -90 || coords[1] > 90 || coords[lastOffset + 1] < -90 || coords[lastOffset + 1] > 90) {
            return false;
        }
        return true;
    }
    /**
     * @return true if the first object is entirely within the second object and the object boundaries do not touch; otherwise, returns FALSE.
     */
    static isBBoxInside(bbox, upperBBox) {
        if ((bbox === null || bbox === void 0 ? void 0 : bbox.length) !== (upperBBox === null || upperBBox === void 0 ? void 0 : upperBBox.length))
            throw Error('Invalid bbox. should have same dimension (2 or 3)');
        const lastOffset = bbox.length / 2;
        // Longitude
        return bbox[0] >= upperBBox[0] && bbox[lastOffset] <= upperBBox[lastOffset]
            // Latitude
            && bbox[1] >= upperBBox[1] && bbox[lastOffset + 1] <= upperBBox[lastOffset + 1];
    }
    static isNotNilBBox(coords) {
        return this.checkBBox(coords);
    }
    /**
     * @return true if the first object is entirely within the second object and the object boundaries do not touch; otherwise, returns FALSE.
     */
    static isPositionInsideBBox(position, bbox) {
        if ((position === null || position === void 0 ? void 0 : position.length) !== (bbox === null || bbox === void 0 ? void 0 : bbox.length) / 2)
            throw Error('Invalid coordinate or bbox. Should have same dimension (2 or 3)');
        const lastOffset = position.length; // 2 or 3 dimensions
        // Longitude
        return position[0] >= bbox[0] && position[0] <= bbox[lastOffset]
            // Latitude
            && position[1] >= bbox[1] && position[1] <= bbox[lastOffset + 1]
            // Altitude
            && (lastOffset !== 3 || (position[2] >= bbox[2] && position[2] <= bbox[lastOffset + 2]));
    }
}
//# sourceMappingURL=geometries.utils.js.map