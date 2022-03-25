import { GeoJsonObject, LineString, MultiPolygon, Polygon, Position } from 'geojson';

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
}
