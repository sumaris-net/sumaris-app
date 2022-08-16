
import {RootDataEntity} from "./root-data-entity.model";
import {DataEntityAsObjectOptions} from "./data-entity.model";
import {IWithVesselSnapshotEntity, VesselSnapshot} from "../../../referential/services/model/vessel-snapshot.model";
import { NOT_MINIFY_OPTIONS } from "@app/core/services/model/referential.utils";


export abstract class DataRootVesselEntity<
  T extends DataRootVesselEntity<any, ID>,
  ID = number,
  O extends DataEntityAsObjectOptions = DataEntityAsObjectOptions, F = any>
  extends RootDataEntity<T, ID, O, F>
  implements IWithVesselSnapshotEntity<T, ID> {

  vesselSnapshot: VesselSnapshot;

  protected constructor(__typename?: string) {
    super(__typename);
    this.vesselSnapshot = null;
  }

  asObject(options?: O): any {
    const target = super.asObject(options);
    target.vesselSnapshot = this.vesselSnapshot && this.vesselSnapshot.asObject({ ...options, ...NOT_MINIFY_OPTIONS }) || undefined;
    return target;
  }

  fromObject(source: any, opts?: F) {
    super.fromObject(source);
    this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
  }
}
