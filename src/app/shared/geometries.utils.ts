import { BBox, GeoJsonObject, LineString, MultiPolygon, Polygon, Position } from 'geojson';
import { isNilOrBlank, isNotNil, isNotNilOrBlank } from '@sumaris-net/ngx-components';

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
  static createRectangleGeometry<T extends Polygon | MultiPolygon>(bottomLeftX: number,
                                 bottomLeftY: number,
                                 topRightX: number,
                                 topRightY: number,
                                 useMultiPolygon: boolean): T {
    const coordinates: Position[] = [
      [bottomLeftX, bottomLeftY],
      [topRightX, bottomLeftY],
      [topRightX, topRightY],
      [bottomLeftX, topRightY]
    ];
    if (useMultiPolygon) {
      return <MultiPolygon>{
        type: 'MultiPolygon',
        coordinates: [[coordinates]]
      } as T;
    }
    return <Polygon>{
      type: 'Polygon',
      coordinates: [coordinates]
    } as T;
  }

  static isLineString(geometry: GeoJsonObject): geometry is LineString {
    return geometry && geometry.type === 'LineString';
  }

  static isPolygon(geometry: GeoJsonObject): geometry is Polygon {
    return geometry && geometry.type === 'Polygon';
  }

  static isMultiPolygon(geometry: GeoJsonObject): geometry is MultiPolygon {
    return geometry && geometry.type === 'MultiPolygon';
  }

  static parseAsBBox(value: string | undefined): BBox | undefined {
    value = value && value.trim();
    if (isNilOrBlank(value)) return undefined;

    let coords: number[];
    try {
      if (value.startsWith('[') && value.endsWith(']')) {
            coords = JSON.parse(value);
      }
      else if (value.indexOf(',') !== -1) {
        coords = value.split(',')
          .filter(isNotNilOrBlank)
          .map(str => parseFloat(str));
      }
    } catch(err) {
      throw new Error(`Cannot parse BBox value '${value}' : ${err}`);
    }
    if (!coords || !Array.isArray(coords) || (coords.length !== 4 && coords.length !== 6)) {
      throw new Error(`Invalid BBox value '${value}'. Expected an array of 4 (or 6) numbers`);
    }
    return coords as BBox;
  }
}
