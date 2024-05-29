import { Moment } from 'moment';
import {
  DateUtils,
  Department,
  Entity,
  EntityAsObjectOptions,
  EntityClass,
  fromDateISOString,
  isNil,
  isNilOrBlank,
  isNotNil,
  Person,
  ReferentialAsObjectOptions,
  ReferentialRef,
  ReferentialUtils,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { RootDataEntity } from '@app/data/services/model/root-data-entity.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

@EntityClass({ typename: 'VesselVO' })
export class Vessel extends RootDataEntity<Vessel> {
  static ENTITY_NAME = 'Vessel';
  static fromObject: (source: any, opts?: any) => Vessel;

  vesselType: ReferentialRef = null;
  statusId: number = null;
  vesselFeatures: VesselFeatures = null;
  vesselRegistrationPeriod: VesselRegistrationPeriod = null;

  constructor() {
    super(Vessel.TYPENAME);
  }

  clone(): Vessel {
    const target = new Vessel();
    this.copy(target);
    target.vesselType = (this.vesselType && this.vesselType.clone()) || undefined;
    target.program = (this.program && this.program.clone()) || undefined;
    target.vesselFeatures = (this.vesselFeatures && this.vesselFeatures.clone()) || undefined;
    target.vesselRegistrationPeriod = (this.vesselRegistrationPeriod && this.vesselRegistrationPeriod.clone()) || undefined;
    target.recorderDepartment = (this.recorderDepartment && this.recorderDepartment.clone()) || undefined;
    target.recorderPerson = (this.recorderPerson && this.recorderPerson.clone()) || undefined;

    return target;
  }

  copy(target: Vessel): Vessel {
    target.fromObject(this);
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.statusId = source.statusId;
    this.vesselType = source.vesselType && ReferentialRef.fromObject(source.vesselType);
    this.vesselFeatures = source.vesselFeatures && VesselFeatures.fromObject(source.vesselFeatures);
    this.vesselRegistrationPeriod = source.vesselRegistrationPeriod && VesselRegistrationPeriod.fromObject(source.vesselRegistrationPeriod);
    this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
  }

  asObject(options?: ReferentialAsObjectOptions): any {
    const target: any = super.asObject(options);
    target.vesselType = (this.vesselType && this.vesselType.asObject({ ...options, ...NOT_MINIFY_OPTIONS })) || undefined;
    target.vesselFeatures =
      (this.vesselFeatures && !this.vesselFeatures.empty && this.vesselFeatures.asObject({ ...options, ...NOT_MINIFY_OPTIONS })) || undefined;
    target.vesselRegistrationPeriod =
      (this.vesselRegistrationPeriod &&
        !this.vesselRegistrationPeriod.empty &&
        this.vesselRegistrationPeriod.asObject({ ...options, ...NOT_MINIFY_OPTIONS })) ||
      undefined;
    target.recorderDepartment = (this.recorderDepartment && this.recorderDepartment.asObject(options)) || undefined;
    return target;
  }

  equals(other: Vessel): boolean {
    return (
      super.equals(other) &&
      isNotNil(this.id) &&
      (this.vesselFeatures.id === other.vesselFeatures.id || this.vesselFeatures.startDate.isSame(other.vesselFeatures.startDate)) &&
      (this.vesselRegistrationPeriod.id === other.vesselRegistrationPeriod.id ||
        this.vesselRegistrationPeriod.startDate.isSame(other.vesselRegistrationPeriod.startDate))
    );
  }
}

@EntityClass({ typename: 'VesselFeaturesVO' })
export class VesselFeatures extends Entity<VesselFeatures> {
  static fromObject: (source: any, opts?: any) => VesselFeatures;

  name: string;
  startDate: Moment;
  endDate: Moment;
  exteriorMarking: string;
  administrativePower: number;
  lengthOverAll: number;
  grossTonnageGt: number;
  grossTonnageGrt: number;
  constructionYear: number;
  ircs: string;
  fpc: boolean;
  hullMaterial: ReferentialRef;
  basePortLocation: ReferentialRef;
  creationDate: Moment;
  recorderDepartment: Department;
  recorderPerson: Person;
  comments: string;
  qualityFlagId: number;

  // Parent
  vesselId: number;

  get empty(): boolean {
    return isNil(this.id) && isNilOrBlank(this.exteriorMarking) && isNilOrBlank(this.name) && isNil(this.startDate);
  }

  constructor() {
    super(VesselFeatures.TYPENAME);
    this.hullMaterial = null;
    this.basePortLocation = null;
    this.recorderDepartment = null;
    this.recorderPerson = null;
  }

  // TODO : Check if clone is needed
  clone(): VesselFeatures {
    const target = new VesselFeatures();
    this.copy(target);
    target.hullMaterial = (this.hullMaterial && this.hullMaterial.clone()) || undefined;
    target.basePortLocation = (this.basePortLocation && this.basePortLocation.clone()) || undefined;
    target.vesselId = this.vesselId || undefined;
    target.recorderDepartment = (this.recorderDepartment && this.recorderDepartment.clone()) || undefined;
    target.recorderPerson = (this.recorderPerson && this.recorderPerson.clone()) || undefined;
    return target;
  }

  copy(target: VesselFeatures): VesselFeatures {
    target.fromObject(this);
    return target;
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target: any = super.asObject(options);

    target.vesselId = this.vesselId;
    target.hullMaterial = (this.hullMaterial && this.hullMaterial.asObject({ ...options, ...NOT_MINIFY_OPTIONS })) || undefined;
    target.basePortLocation = (this.basePortLocation && this.basePortLocation.asObject({ ...options, ...NOT_MINIFY_OPTIONS })) || undefined;
    target.startDate = toDateISOString(DateUtils.markTime(this.startDate));
    target.endDate = toDateISOString(DateUtils.markTime(this.endDate));
    target.creationDate = toDateISOString(this.creationDate);
    target.recorderDepartment = (this.recorderDepartment && this.recorderDepartment.asObject(options)) || undefined;
    target.recorderPerson = (this.recorderPerson && this.recorderPerson.asObject(options)) || undefined;
    target.qualityFlagId = isNotNil(this.qualityFlagId) ? this.qualityFlagId : undefined;
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.vesselId = source.vesselId;
    this.exteriorMarking = source.exteriorMarking;
    this.name = source.name;
    this.comments = source.comments || undefined;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.administrativePower = source.administrativePower;
    this.lengthOverAll = source.lengthOverAll;
    this.grossTonnageGt = source.grossTonnageGt;
    this.grossTonnageGrt = source.grossTonnageGrt;
    this.constructionYear = source.constructionYear;
    this.ircs = source.ircs;
    this.fpc = source.fpc;
    this.hullMaterial = source.hullMaterial && ReferentialRef.fromObject(source.hullMaterial);
    this.basePortLocation = source.basePortLocation && ReferentialRef.fromObject(source.basePortLocation);

    this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
    this.recorderPerson = source.recorderPerson && Person.fromObject(source.recorderPerson);
    this.creationDate = fromDateISOString(source.creationDate);
    this.qualityFlagId = source.qualityFlagId;
  }
}

@EntityClass({ typename: 'VesselRegistrationPeriodVO' })
export class VesselRegistrationPeriod extends Entity<VesselRegistrationPeriod> {
  static fromObject: (source: any, opts?: any) => VesselRegistrationPeriod;

  vesselId: number = null;
  startDate: Moment = null;
  endDate: Moment = null;
  registrationCode: string = null;
  intRegistrationCode: string = null;
  registrationLocation: ReferentialRef = null;

  get empty(): boolean {
    return (
      isNil(this.id) &&
      isNilOrBlank(this.registrationCode) &&
      isNilOrBlank(this.intRegistrationCode) &&
      ReferentialUtils.isEmpty(this.registrationLocation) &&
      isNil(this.startDate)
    );
  }

  constructor() {
    super(VesselRegistrationPeriod.TYPENAME);
  }

  // TODO : Check if clone is needed
  clone(): VesselRegistrationPeriod {
    const target = new VesselRegistrationPeriod();
    this.copy(target);
    target.registrationLocation = (this.registrationLocation && this.registrationLocation.clone()) || undefined;
    return target;
  }

  copy(target: VesselRegistrationPeriod): VesselRegistrationPeriod {
    target.fromObject(this);
    return target;
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target: any = super.asObject(options);

    target.registrationLocation =
      (this.registrationLocation && this.registrationLocation.asObject({ ...options, ...NOT_MINIFY_OPTIONS })) || undefined;
    target.startDate = toDateISOString(DateUtils.markTime(this.startDate));
    target.endDate = toDateISOString(DateUtils.markTime(this.endDate));

    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.registrationCode = source.registrationCode;
    this.intRegistrationCode = source.intRegistrationCode;
    this.vesselId = source.vesselId;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.registrationLocation = (source.registrationLocation && ReferentialRef.fromObject(source.registrationLocation)) || undefined;
  }
}
