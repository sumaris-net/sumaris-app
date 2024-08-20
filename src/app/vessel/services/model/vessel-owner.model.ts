import {
  Entity,
  EntityClass,
  fromDateISOString,
  isNotNil,
  ReferentialAsObjectOptions,
  ReferentialRef,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Moment } from 'moment';

@EntityClass({ typename: 'VesselOwnerVO' })
export class VesselOwner extends Entity<VesselOwner> {
  static ENTITY_NAME = 'VesselOwner';
  static fromObject: (source: any, opts?: any) => VesselOwner;

  id: number = null;
  lastName: string = null;
  firstName: string = null;
  registrationCode: string = null;
  activityStartDate: Moment = null;
  retirementDate: Moment = null;
  street: string = null;
  zipCode: string = null;
  city: string;
  dateOfBirth: Moment = null;
  phoneNumber: string = null;
  mobileNumber: string = null;
  faxNumber: string = null;
  email: string = null;

  program: ReferentialRef = null;

  constructor() {
    super(VesselOwner.TYPENAME);
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.id = source.id;
    this.lastName = source.lastName;
    this.firstName = source.firstName;
    this.registrationCode = source.registrationCode;
    this.activityStartDate = fromDateISOString(source.activityStartDate);
    this.retirementDate = fromDateISOString(source.retirementDate);

    this.street = source.street;
    this.zipCode = source.zipCode;
    this.city = source.city;
    this.dateOfBirth = fromDateISOString(source.dateOfBirth);
    this.phoneNumber = source.phoneNumber;
    this.mobileNumber = source.mobileNumber;
    this.faxNumber = source.faxNumber;
    this.email = source.email;

    this.program = source.program && ReferentialRef.fromObject(source.program);
  }

  asObject(options?: ReferentialAsObjectOptions): any {
    const target: any = super.asObject(options);
    target.activityStartDate = toDateISOString(this.activityStartDate);
    target.retirementDate = toDateISOString(this.retirementDate);

    // TODO : Export Administrative infos (lastName, city, ect...)

    target.program =
      (this.program && this.program.asObject({ ...options, ...NOT_MINIFY_OPTIONS /*always keep for table*/ } as ReferentialAsObjectOptions)) ||
      undefined;

    if (options?.minify) {
      if (target.program) delete target.program.entityName;
    }
    return target;
  }

  equals(other: VesselOwner): boolean {
    return (
      (isNotNil(this.id) && super.equals(other)) ||
      // Compare functional properties
      (this.program && this.program.equals(other?.program) && this.lastName === other.lastName && this.firstName === other.firstName)
    );
  }
}
