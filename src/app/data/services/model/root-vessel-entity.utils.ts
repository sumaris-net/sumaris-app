import { VesselIds } from '@app/referential/services/model/model.enum';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { arrayPluck } from '@app/shared/functions';
import { Landing } from '@app/trip/landing/landing.model';
import { arrayDistinct } from '@sumaris-net/ngx-components';

export class RootVesselEntityUtils {
  public static removeUnknownVessel(vessels: VesselSnapshot[]): VesselSnapshot[] {
    return vessels.filter((vessel) => vessel.id != VesselIds.UNKNOWN);
  }

  public static getDistinctVessel(landings: Landing[]): VesselSnapshot[] {
    const vessels = arrayPluck(landings, 'vesselSnapshot', true) as VesselSnapshot[];
    const distinctVessel = arrayDistinct(RootVesselEntityUtils.removeUnknownVessel(vessels), 'id');
    return distinctVessel;
  }
}
