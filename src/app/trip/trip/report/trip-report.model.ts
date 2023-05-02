import { DateUtils, Entity, fromDateISOString, ReferentialRef, toNumber } from '@sumaris-net/ngx-components';
import { Operation, Trip } from '@app/trip/trip/trip.model';
import { VesselPosition } from '@app/data/position/vessel/vessel-position.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Moment } from 'moment';

export interface RdbExtractionData<
  TR extends RdbTrip = RdbTrip,
  HH extends RdbStation = RdbStation,
  SL extends RdbSpeciesList = RdbSpeciesList,
  HL extends RdbSpeciesLength = RdbSpeciesLength
> {
  TR: TR[];
  HH: HH[];
  SL: SL[];
  HL: HL[];
}

export class RdbTrip<S = any> extends Entity<RdbTrip<S>> {
  tripCode: number;
  project: string;
  vesselIdentifier: number;
  vesselLength: number;
  vesselSize: number;

  meta?: {
    [key: string]: any;
  };

  clone(opts?: any): RdbTrip<S> {
    return super.clone(opts);
  }

  fromObject(source: any){
    this.tripCode = toNumber(source.tripCode);
    this.project = source.project;
    this.vesselIdentifier = toNumber(source.vesselIdentifier);
    this.vesselLength = toNumber(source.vesselLength);
    this.vesselSize = toNumber(source.vesselSize);
  }

  asTrip(): Trip {
    const target = new Trip();
    target.id = this.tripCode;
    target.program = ReferentialRef.fromObject({label: this.project});
    target.vesselSnapshot = VesselSnapshot.fromObject({id: this.vesselIdentifier, lengthOverAll: this.vesselLength, grossTonnageGt: this.vesselSize});
    return target;
  }
}

export class RdbStation<S = any> extends Entity<RdbStation<S>> {
  tripCode: number;
  stationNumber: number;
  date: string;
  time: string;
  fishingTime: number;
  posStartLat: number;
  posStartLon: number;
  posEndLat: number;
  posEndLon: number;

  meta?: {
    [key: string]: any;
  };

  fromObject(source: any){
    this.tripCode = +source.tripCode;
    this.stationNumber = toNumber(source.stationNumber);
    this.date = source.date;
    this.time = source.time;
    this.fishingTime = toNumber(source.fishingTime, source.fishingDuration);
    this.posStartLat = +source.posStartLat;
    this.posStartLon = +source.posStartLon;
    this.posEndLat = +source.posEndLat;
    this.posEndLon = +source.posEndLon;
  }

  asOperation(): Operation {
    const target = new Operation();
    target.id = this.stationNumber;
    target.tripId = this.tripCode;
    target.fishingStartDateTime = fromDateISOString(`${this.date}T${this.time}:00.000Z`);
    target.fishingEndDateTime = target.fishingStartDateTime.clone().add(this.fishingTime, 'minutes');
    target.startPosition = VesselPosition.fromObject(<VesselPosition>{latitude: this.posStartLat, longitude: this.posStartLon, dateTime: target.fishingStartDateTime, operationId: target.id});
    target.endPosition = VesselPosition.fromObject(<VesselPosition>{latitude: this.posEndLat, longitude: this.posEndLon, dateTime: target.fishingEndDateTime, operationId: target.id});
    target.positions = [target.startPosition, target.endPosition];
    return target;
  }
}

export type CatchCategoryType = 'LAN'|'DIS';

export class RdbSpeciesList<SL = any> extends Entity<RdbSpeciesList<SL>>{
  tripCode: number;
  stationNumber: number;
  species: string;
  catchCategory: CatchCategoryType;
  lengthCode: string;
  weight: number;
  subsampleWeight: number;

  meta?: {
    subCategory?: string;
    [key: string]: any;
  };

  fromObject(source: any){
    this.tripCode = toNumber(source.tripCode);
    this.stationNumber = toNumber(source.stationNumber);
    this.species = source.species;
    this.catchCategory = source.catchCategory;
    this.weight = toNumber(source.weight);
    this.subsampleWeight = toNumber(source.subsampleWeight);
    this.lengthCode = source.lengthCode;
  }

  get isLanding(): boolean {
    return this.catchCategory === 'LAN';
  }
  get isDiscard(): boolean {
    return this.catchCategory === 'DIS';
  }
}

export class RdbSpeciesLength<HL = any> extends Entity<RdbSpeciesLength<HL>>{
  species: string;
  catchCategory: CatchCategoryType;
  stationNumber: number;
  lengthClass: number;
  numberAtLength: number;

  meta?: {
    subCategory?: string;
    [key: string]: any;
  };

  fromObject(source: any){
    this.stationNumber = toNumber(source.stationNumber);
    this.species = source.species;
    this.catchCategory = source.catchCategory;
    this.lengthClass = toNumber(source.lengthClass);
    this.numberAtLength = toNumber(source.numberAtLength);
  }
}

/* -- RDB Pmfm extraction classes -- */

export interface RdbPmfmExtractionData<
  TR extends RdbPmfmTrip = RdbPmfmTrip,
  HH extends RdbPmfmStation = RdbPmfmStation,
  SL extends RdbPmfmSpeciesList = RdbPmfmSpeciesList,
  HL extends RdbPmfmSpeciesLength = RdbPmfmSpeciesLength
> extends RdbExtractionData<TR, HH, SL, HL> {

}

export class RdbPmfmTrip<S = any> extends RdbTrip<S> {
  departureDateTime: Moment;
  returnDateTime: Moment;

  fromObject(source: any){
    super.fromObject(source)
    this.departureDateTime = source.departureDateTime;
    this.returnDateTime = source.returnDateTime;
  }

  asTrip(): Trip {
    const target = super.asTrip();
    target.departureDateTime = DateUtils.moment(this.departureDateTime, 'YYYY-MM-DD HH:mm:ss.SSSZ');
    target.returnDateTime = DateUtils.moment(this.returnDateTime, 'YYYY-MM-DD HH:mm:ss.SSSZ');
    return target;
  }
}
export class RdbPmfmStation<HH = any> extends RdbStation<HH>{

}

export class RdbPmfmSpeciesList<SL = any> extends RdbSpeciesList<SL>{

}

export class RdbPmfmSpeciesLength<HL = any> extends RdbSpeciesLength<HL>{
  elevateNumberAtLength: number;
  taxonGroupId: number;
  referenceTaxonId: number;

  fromObject(source: any){
    super.fromObject(source);
    this.elevateNumberAtLength = toNumber(source.elevateNumberAtLength);
    this.taxonGroupId = toNumber(source.taxonGroupId);
    this.referenceTaxonId = toNumber(source.referenceTaxonId);
  }
}
