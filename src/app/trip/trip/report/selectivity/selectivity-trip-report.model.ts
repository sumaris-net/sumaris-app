import { Entity, toNumber } from '@sumaris-net/ngx-components';
import { RdbExtractionData, RdbPmfmSpeciesLength, RdbPmfmSpeciesList, RdbPmfmStation, RdbPmfmTrip } from '@app/trip/trip/report/trip-report.model';


export interface SelectivityExtractionData<
  TR extends SelectivityTrip = SelectivityTrip,
  FG extends SelectivityGear = SelectivityGear,
  HH extends SelectivityStation = SelectivityStation,
  SL extends SelectivitySpeciesList = SelectivitySpeciesList,
  HL extends SelectivitySpeciesLength = SelectivitySpeciesLength
> extends RdbExtractionData<TR, HH, SL, HL> {
  FG: FG[];
}

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
    this.selectionDevice = source.selectionDevice || source.selectivityDevice ||source.selectivityDeviceApase;
  }
}

export class SelectivityStation extends RdbPmfmStation<SelectivityStation> {
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

export class SelectivitySpeciesList extends RdbPmfmSpeciesList<SelectivitySpeciesList> {
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
