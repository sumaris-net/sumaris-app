import { Entity, toNumber } from '@sumaris-net/ngx-components';
import { RdbPmfmSpeciesLength, RdbPmfmSpeciesList, RdbPmfmStation, RdbPmfmTrip } from '@app/trip/trip/report/trip-report.model';
export class SelectivityTrip extends RdbPmfmTrip {
}
export class SelectivityGear extends Entity {
    fromObject(source) {
        super.fromObject(source);
        this.gearIdentifier = toNumber(source.gearIdentifier);
        this.subGearIdentifier = toNumber(source.subGearIdentifier);
        this.selectionDevice = source.selectionDevice || source.selectivityDevice || source.selectivityDeviceApase;
    }
}
export class SelectivityStation extends RdbPmfmStation {
    fromObject(source) {
        super.fromObject(source);
        this.gearIdentifier = toNumber(source.gearIdentifier);
        this.seabedFeatures = source.seabedFeatures;
        this.seaState = source.seaState;
        this.gearSpeed = toNumber(source.gearSpeed);
    }
}
export class SelectivitySpeciesList extends RdbPmfmSpeciesList {
    fromObject(source) {
        super.fromObject(source);
        this.gearIdentifier = toNumber(source.gearIdentifier);
        this.subGearIdentifier = toNumber(source.subGearIdentifier);
        this.subGearPosition = source.subGearPosition;
    }
}
export class SelectivitySpeciesLength extends RdbPmfmSpeciesLength {
    fromObject(source) {
        super.fromObject(source);
        this.subGearPosition = source.subGearPosition;
        this.subGearIdentifier = toNumber(source.subGearIdentifier);
    }
}
//# sourceMappingURL=selectivity-trip-report.model.js.map