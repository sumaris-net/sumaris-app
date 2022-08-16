import { DataEntity, DataEntityAsObjectOptions } from './data-entity.model';
import { EntityClass, isNotNil, ReferentialRef, ReferentialUtils } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Geometries } from '@app/shared/geometries.utils';
import { BBox } from 'geojson';
import { LocationUtils } from '@app/referential/location/location.utils';

@EntityClass({typename: 'FishingAreaVO'})
export class FishingArea extends DataEntity<FishingArea> {

  static fromObject: (source: any, opts?: any) => FishingArea;

  location: ReferentialRef;

  distanceToCoastGradient: ReferentialRef;
  depthGradient: ReferentialRef;
  nearbySpecificArea: ReferentialRef;

  // operationId: number;

  constructor() {
    super(FishingArea.TYPENAME);
    this.location = null;
    this.distanceToCoastGradient = null;
    this.depthGradient = null;
    this.nearbySpecificArea = null;
    // this.operationId = null;
  }

  asObject(options?: DataEntityAsObjectOptions): any {
    const target = super.asObject(options);
    target.location = this.location && this.location.asObject({...options, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.distanceToCoastGradient = this.distanceToCoastGradient && this.distanceToCoastGradient.asObject({...options, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.depthGradient = this.depthGradient && this.depthGradient.asObject({...options, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.nearbySpecificArea = this.nearbySpecificArea && this.nearbySpecificArea.asObject({...options, ...NOT_MINIFY_OPTIONS}) || undefined;
    return target;
  }

  fromObject(source: any): FishingArea {
    super.fromObject(source);
    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.distanceToCoastGradient = source.distanceToCoastGradient && ReferentialRef.fromObject(source.distanceToCoastGradient);
    this.depthGradient = source.depthGradient && ReferentialRef.fromObject(source.depthGradient);
    this.nearbySpecificArea = source.nearbySpecificArea && ReferentialRef.fromObject(source.nearbySpecificArea);
    // this.operationId = source.operationId;
    return this;
  }

  equals(other: FishingArea): boolean {
    return (super.equals(other) && isNotNil(this.id))
      || (
        ReferentialUtils.equals(this.location, other.location)
        && ReferentialUtils.equals(this.distanceToCoastGradient, other.distanceToCoastGradient)
        && ReferentialUtils.equals(this.depthGradient, other.depthGradient)
        && ReferentialUtils.equals(this.nearbySpecificArea, other.nearbySpecificArea)
      );
  }

}

export class FishingAreaUtils {
  static createBBoxFilter(boundingBox: BBox): (f: FishingArea) => boolean {
    return (fa) => {
      const rectBbox = LocationUtils.getBBoxFromRectangleLabel(fa.location?.label);
      return rectBbox && Geometries.isBBoxInside(rectBbox, boundingBox);
    };
  }
}
