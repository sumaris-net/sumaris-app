import {Moment} from 'moment';
import {Department, Entity, EntityAsObjectOptions, EntityClass, fromDateISOString, IEntity, Person, ReferentialAsObjectOptions, ReferentialRef, toDateISOString} from '@sumaris-net/ngx-components';
import { Vessel, VesselFeatures, VesselRegistrationPeriod } from '@app/vessel/services/model/vessel.model';
import { NOT_MINIFY_OPTIONS } from "@app/core/services/model/referential.utils";


export interface IWithVesselSnapshotEntity<T, ID = number> extends IEntity<T, ID> {
  vesselSnapshot: VesselSnapshot;
}

@EntityClass({typename: 'VesselSnapshotVO', fromObjectReuseStrategy: 'clone'})
export class VesselSnapshot extends Entity<VesselSnapshot> {

  static fromObject: (source: any, opts?: any) => VesselSnapshot;

  static fromVessel(source: Partial<Vessel>): VesselSnapshot {
    if (!source) return undefined;
    const target = new VesselSnapshot();
    target.fromObject({
      id: source.id,
      vesselType: source.vesselType,
      vesselStatusId: source.statusId,
      name: source.vesselFeatures?.name,
      creationDate: source.creationDate,
      updateDate: source.updateDate,
      startDate: source.vesselFeatures?.startDate,
      endDate: source.vesselFeatures?.endDate,
      exteriorMarking: source.vesselFeatures?.exteriorMarking,
      basePortLocation: source.vesselFeatures?.basePortLocation,
      grossTonnageGt: source.vesselFeatures?.grossTonnageGt,
      grossTonnageGrt: source.vesselFeatures?.grossTonnageGrt,
      lengthOverAll: source.vesselFeatures?.lengthOverAll,
      registrationId: source.vesselRegistrationPeriod?.id,
      registrationCode: source.vesselRegistrationPeriod?.registrationCode,
      intRegistrationCode: source.vesselRegistrationPeriod?.intRegistrationCode,
      registrationStartDate: source.vesselRegistrationPeriod?.startDate,
      registrationEndDate: source.vesselRegistrationPeriod?.endDate,
      registrationLocation: source.vesselRegistrationPeriod?.registrationLocation,
    });
    return target;
  }


  static toVessel(source: Partial<VesselSnapshot>): Vessel {
    if (!source) return undefined;
    return Vessel.fromObject({
      id: source.id,
      vesselType: source.vesselType,
      statusId : source.vesselStatusId,
      creationDate : source.creationDate,
      updateDate : source.updateDate,
      vesselFeatures : <Partial<VesselFeatures>>{
        vesselId: source.id,
        name: source.name,
        startDate: source.startDate,
        endDate: source.endDate,
        exteriorMarking: source.exteriorMarking,
        grossTonnageGt: source.grossTonnageGt,
        grossTonnageGrt: source.grossTonnageGrt,
        lengthOverAll: source.lengthOverAll,
        basePortLocation: source.basePortLocation,
      },
      vesselRegistrationPeriod: <Partial<VesselRegistrationPeriod>>{
        id: source.registrationId,
        vesselId: source.id,
        registrationCode: source.registrationCode,
        intRegistrationCode: source.intRegistrationCode,
        registrationStartDate: source.startDate,
        registrationEndDate: source.endDate,
        registrationLocation: source.registrationLocation
      }
    });
  }

  program: ReferentialRef;
  vesselType: ReferentialRef;
  vesselStatusId: number;
  name: string;
  startDate: Moment;
  endDate: Moment;
  exteriorMarking: string;
  registrationId: number; // TODO remove this ?
  registrationCode: string;
  intRegistrationCode: string;
  registrationStartDate: Moment;
  registrationEndDate: Moment;
  administrativePower: number;
  lengthOverAll: number;
  grossTonnageGt: number;
  grossTonnageGrt: number;
  basePortLocation: ReferentialRef;
  registrationLocation: ReferentialRef;
  creationDate: Moment;
  recorderDepartment: Department;
  recorderPerson: Person;
  comments: string;

  constructor() {
    super(VesselSnapshot.TYPENAME);
    this.vesselType = null;
    this.basePortLocation = null;
    this.registrationLocation = null;
    this.recorderDepartment = null;
    this.recorderPerson = null;
    this.program = null;
  }

 // TODO: Check if clone is needed
  clone(): VesselSnapshot {
    const target = new VesselSnapshot();
    target.fromObject(this);
    target.program = this.program && this.program.clone() || undefined;
    target.vesselType = this.vesselType && this.vesselType.clone() || undefined;
    target.basePortLocation = this.basePortLocation && this.basePortLocation.clone() || undefined;
    target.registrationLocation = this.registrationLocation && this.registrationLocation.clone() || undefined;
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.clone() || undefined;
    target.recorderPerson = this.recorderPerson && this.recorderPerson.clone() || undefined;
    return target;
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target: any = super.asObject(options);

    target.program = this.program && this.program.asObject({ ...options, ...NOT_MINIFY_OPTIONS /*always keep for table*/ } as ReferentialAsObjectOptions) || undefined;
    target.vesselType = this.vesselType && this.vesselType.asObject({ ...options,  ...NOT_MINIFY_OPTIONS }) || undefined;
    target.basePortLocation = this.basePortLocation && this.basePortLocation.asObject({ ...options,  ...NOT_MINIFY_OPTIONS }) || undefined;
    target.registrationLocation = this.registrationLocation && this.registrationLocation.asObject({ ...options,  ...NOT_MINIFY_OPTIONS }) || undefined;
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    target.registrationStartDate = !options || options.minify !== true ? toDateISOString(this.registrationStartDate) : undefined;
    target.registrationEndDate = !options || options.minify !== true ? toDateISOString(this.registrationEndDate) : undefined;
    target.creationDate = toDateISOString(this.creationDate);
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(options) || undefined;
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(options) || undefined;

    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.exteriorMarking = source.exteriorMarking;
    this.registrationCode = source.registrationCode;
    this.intRegistrationCode = source.intRegistrationCode;
    this.name = source.name;
    this.comments = source.comments || undefined;
    this.vesselStatusId = source.vesselStatusId;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.registrationId = source.registrationId;
    this.registrationStartDate = fromDateISOString(source.registrationStartDate);
    this.registrationEndDate = fromDateISOString(source.registrationEndDate);
    this.administrativePower = source.administrativePower || undefined;
    this.lengthOverAll = source.lengthOverAll || undefined;
    this.grossTonnageGt = source.grossTonnageGt || undefined;
    this.grossTonnageGrt = source.grossTonnageGrt || undefined;
    this.creationDate = fromDateISOString(source.creationDate);
    this.vesselType = source.vesselType && ReferentialRef.fromObject(source.vesselType);
    this.basePortLocation = source.basePortLocation && ReferentialRef.fromObject(source.basePortLocation);
    this.registrationLocation = source.registrationLocation && ReferentialRef.fromObject(source.registrationLocation);
    this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
    this.recorderPerson = source.recorderPerson && Person.fromObject(source.recorderPerson);
    this.program = source.program && ReferentialRef.fromObject(source.program);
  }
}
