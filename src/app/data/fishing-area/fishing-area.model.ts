import { DataEntity, DataEntityAsObjectOptions } from '../services/model/data-entity.model';
import { EntityClass, EntityUtils, isEmptyArray, isNotNil, ReferentialRef, ReferentialUtils } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Geometries } from '@app/shared/geometries.utils';
import { BBox } from 'geojson';
import { LocationUtils } from '@app/referential/location/location.utils';

@EntityClass({ typename: 'FishingAreaVO' })
export class FishingArea extends DataEntity<FishingArea> {
  static fromObject: (source: any, opts?: any) => FishingArea;

  static equals(o1: FishingArea | any, o2: FishingArea | any): boolean {
    return (
      (isNotNil(o1?.id) && o1.id === o2?.id) ||
      (!!o1 &&
        !!o2 &&
        ReferentialUtils.equals(o1.location, o2.location) &&
        ReferentialUtils.equals(o1.distanceToCoastGradient, o2.distanceToCoastGradient) &&
        ReferentialUtils.equals(o1.depthGradient, o2.depthGradient) &&
        ReferentialUtils.equals(o1.nearbySpecificArea, o2.nearbySpecificArea))
    );
  }

  static isSameRemoteUniqueKey(o1: FishingArea | any, o2: FishingArea | any): boolean {
    return (
      !!o1 &&
      !!o2 &&
      ReferentialUtils.equals(o1.location, o2.location) &&
      ReferentialUtils.equals(o1.distanceToCoastGradient, o2.distanceToCoastGradient) &&
      ReferentialUtils.equals(o1.depthGradient, o2.depthGradient)
      // Same parent (not need here)
      // n1.operationId === n2.operationId
      // n1.gearUseFeaturesId === n2.gearUseFeaturesId
      // n1.vesselUseFeaturesId === n2.vesselUseFeaturesId
    );
  }

  static isNotEmpty(o: Partial<FishingArea>): boolean {
    return !FishingArea.isEmpty(o);
  }

  static isEmpty(o: Partial<FishingArea>): boolean {
    return (
      !o ||
      (ReferentialUtils.isEmpty(o.location) &&
        ReferentialUtils.isEmpty(o.distanceToCoastGradient) &&
        ReferentialUtils.isEmpty(o.depthGradient) &&
        ReferentialUtils.isEmpty(o.nearbySpecificArea))
    );
  }

  static hasLocation(fa: Partial<FishingArea>): boolean {
    return ReferentialUtils.isNotEmpty(fa?.location);
  }

  location: ReferentialRef;

  distanceToCoastGradient: ReferentialRef;
  depthGradient: ReferentialRef;
  nearbySpecificArea: ReferentialRef;

  // Parent: not need, because always FishingArea holds by a parent entity
  // operationId: number;
  // gearUseFeaturesId: number;
  // vesselUseFeaturesId: number;

  constructor() {
    super(FishingArea.TYPENAME);
    this.location = null;
    this.distanceToCoastGradient = null;
    this.depthGradient = null;
    this.nearbySpecificArea = null;
    // this.operationId = null;
    // this.gearUseFeaturesId = null;
    // this.vesselUseFeaturesId = null;
  }

  asObject(options?: DataEntityAsObjectOptions): any {
    const target = super.asObject(options);
    target.location = (this.location && this.location.asObject({ ...options, ...NOT_MINIFY_OPTIONS })) || undefined;
    target.distanceToCoastGradient =
      (this.distanceToCoastGradient && this.distanceToCoastGradient.asObject({ ...options, ...NOT_MINIFY_OPTIONS })) || undefined;
    target.depthGradient = (this.depthGradient && this.depthGradient.asObject({ ...options, ...NOT_MINIFY_OPTIONS })) || undefined;
    target.nearbySpecificArea = (this.nearbySpecificArea && this.nearbySpecificArea.asObject({ ...options, ...NOT_MINIFY_OPTIONS })) || undefined;
    return target;
  }

  fromObject(source: any): FishingArea {
    super.fromObject(source);
    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.distanceToCoastGradient = source.distanceToCoastGradient && ReferentialRef.fromObject(source.distanceToCoastGradient);
    this.depthGradient = source.depthGradient && ReferentialRef.fromObject(source.depthGradient);
    this.nearbySpecificArea = source.nearbySpecificArea && ReferentialRef.fromObject(source.nearbySpecificArea);
    // this.operationId = source.operationId;
    // this.gearUseFeaturesId = source.gearUseFeaturesId;
    // this.vesselUseFeaturesId = source.vesselUseFeaturesId;
    return this;
  }

  equals(other: FishingArea): boolean {
    return (
      (super.equals(other) && isNotNil(this.id)) ||
      (ReferentialUtils.equals(this.location, other.location) &&
        ReferentialUtils.equals(this.distanceToCoastGradient, other.distanceToCoastGradient) &&
        ReferentialUtils.equals(this.depthGradient, other.depthGradient) &&
        ReferentialUtils.equals(this.nearbySpecificArea, other.nearbySpecificArea))
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

  static sameArray(a1: FishingArea[], a2: FishingArea[]) {
    return (!a1 && !a2) || (a1?.length === a2?.length && a1.every((fa1) => a2.some((fa2) => FishingArea.equals(fa1, fa2))));
  }

  /**
   * Workaround to avoid remote error on FISHING_AREA unique key (see issue #883)
   * @param localFishingAreas
   * @param remoteFishingAreas
   */
  static fixRemoteUniqueKeyError(localFishingAreas: FishingArea[], remoteFishingAreas: FishingArea[]): void {
    if (isEmptyArray(localFishingAreas)) return; // OK: nothing to fix

    remoteFishingAreas = remoteFishingAreas?.filter((fa) => isNotNil(fa.id));
    if (isEmptyArray(remoteFishingAreas)) return; // OK, no remote data

    localFishingAreas
      .filter((fa) => remoteFishingAreas.some((p) => fa.id !== p.id && FishingArea.isSameRemoteUniqueKey(fa, p)))
      // Clean id, to force a deletion of the duplication, then a new insert
      .forEach(EntityUtils.cleanIdAndUpdateDate);
  }
}
