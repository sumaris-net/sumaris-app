import { toNumber } from '@sumaris-net/ngx-components';
import { SpeciesLength, SpeciesList, Station } from '@app/trip/trip/report/trip-report.model';

export class SelectivityStation extends Station<SelectivityStation> {
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

export class SelectivitySpeciesList extends SpeciesList<SelectivitySpeciesList> {
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

export class SelectivitySpeciesLength extends SpeciesLength<SelectivitySpeciesLength> {
  subGearIdentifier: number;
  subGearPosition: 'B' | 'T';

  fromObject(source: any) {
    super.fromObject(source);
    this.subGearPosition = source.subGearPosition;
    this.subGearIdentifier = toNumber(source.subGearIdentifier);
  }
}
