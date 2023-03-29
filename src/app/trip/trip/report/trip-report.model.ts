import { Entity, fromDateISOString, toNumber } from '@sumaris-net/ngx-components';
import { Operation } from '@app/trip/services/model/trip.model';
import { VesselPosition } from '@app/data/services/model/vessel-position.model';

export class Station<S = any> extends Entity<Station<S>> {
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

  clone(opts?: any): Station<S> {
    return super.clone(opts);
  }

  fromObject(source: any){
    this.tripCode = +source.tripCode;
    this.stationNumber = +source.stationNumber;
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

export class SpeciesList<SL = any> extends Entity<SpeciesList<SL>>{
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

  clone(opts?: any): SpeciesList<SL> {
    return super.clone(opts);
  }

  fromObject(source: any){
    this.tripCode = source.tripCode;
    this.stationNumber = source.stationNumber;
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

export class SpeciesLength<HL = any> extends Entity<SpeciesLength<HL>>{
  species: string;
  catchCategory: CatchCategoryType;
  stationNumber: number;
  lengthClass: number;
  numberAtLength: number;
  elevateNumberAtLength: number;

  taxonGroupId: number;
  referenceTaxonId: number;

  meta?: {
    subCategory?: string;
    [key: string]: any;
  };

  clone(opts?: any): SpeciesLength<HL> {
    return super.clone(opts);
  }

  fromObject(source: any){
    this.stationNumber = source.stationNumber;
    this.species = source.species;
    this.catchCategory = source.catchCategory;
    this.lengthClass = toNumber(source.lengthClass);
    this.numberAtLength = toNumber(source.numberAtLength);
    this.elevateNumberAtLength = toNumber(source.elevateNumberAtLength);
    this.taxonGroupId = toNumber(source.taxonGroupId);
    this.referenceTaxonId = toNumber(source.referenceTaxonId);
  }
}


/* -- APASE classes -- */

