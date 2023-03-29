import { Entity, toNumber } from '@sumaris-net/ngx-components';
import { RdbPmfmSpeciesLength, RdbPmfmTrip, RdbSpeciesLength, RdbSpeciesList, RdbStation, RdbTrip } from '@app/trip/trip/report/trip-report.model';

export class SelectivityTrip extends RdbPmfmTrip<SelectivityTrip> {

}

export class SelectivityGear extends Entity<SelectivityGear> {
  gearIdentifier: number;
  subGearIdentifier: number;
  selectionDevice: string;

  fromObject(source: any) {
    super.fromObject(source);
    this.gearIdentifier = toNumber(source.gearIdentifier);
    this.subGearIdentifier = toNumber(source.subGearIdentifier);
    this.selectionDevice = source.selectionDevice || source.selectivityDeviceApase;
  }
}

export class SelectivityStation extends RdbStation<SelectivityStation> {
  gearIdentifier: number;
  seabedFeatures: string;
  seaState: string;
  gearSpeed: number;

  fromObject(source: any) {
    super.fromObject(source);
    this.gearIdentifier = toNumber(source.gearIdentifier);
    this.seabedFeatures = source.seabedFeatures;
    this.seaState = source.seaState;
    this.gearSpeed = toNumber(source.gearSpeed);
  }
}

export class SelectivitySpeciesList extends RdbSpeciesList<SelectivitySpeciesList> {
  gearIdentifier: number;
  subGearPosition: 'B' | 'T';
  subGearIdentifier: number;

  fromObject(source: any) {
    super.fromObject(source);
    this.gearIdentifier = toNumber(source.gearIdentifier);
    this.subGearIdentifier = toNumber(source.subGearIdentifier);
    this.subGearPosition = source.subGearPosition;
  }
}

export class SelectivitySpeciesLength extends RdbPmfmSpeciesLength<SelectivitySpeciesLength> {
  subGearIdentifier: number;
  subGearPosition: 'B' | 'T';

  fromObject(source: any) {
    super.fromObject(source);
    this.subGearPosition = source.subGearPosition;
    this.subGearIdentifier = toNumber(source.subGearIdentifier);
  }
}
