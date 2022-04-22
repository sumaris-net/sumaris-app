import {
  BaseReferential,
  Entity,
  EntityClass,
  EntityUtils,
  FormFieldDefinition,
  isNotNil,
  Person,
  PropertiesMap,
  ReferentialAsObjectOptions,
  ReferentialRef,
  ReferentialUtils,
  removeDuplicatesFromArray
} from '@sumaris-net/ngx-components';
import { Strategy } from './strategy.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { ProgramPropertiesUtils } from '@app/referential/services/config/program.config';
import { IDenormalizedPmfm } from '@app/referential/services/model/pmfm.model';
import { DenormalizedPmfmStrategy, PmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';

@EntityClass({typename: 'ProgramVO'})
export class Program extends BaseReferential<Program> {

  static ENTITY_NAME = 'Program';
  static fromObject: (source: any, opts?: any) => Program;

  properties: PropertiesMap = {};
  gearClassification: ReferentialRef = null;
  taxonGroupType: ReferentialRef = null;
  locationClassifications: ReferentialRef[] = null;
  locations: ReferentialRef[] = null;
  departments: ProgramDepartment[] = null;
  persons: ProgramPerson[] = null;

  acquisitionLevelLabels: string[]; // Need to filter local programs

  strategies: Strategy[] = null;

  constructor() {
    super(Program.TYPENAME);
  }


  fromObject(source: any) {
    super.fromObject(source);
    if (source.properties && source.properties instanceof Array) {
      this.properties = EntityUtils.getPropertyArrayAsObject(source.properties);
    } else {
      this.properties = {...source.properties};
    }
    this.gearClassification = source.gearClassification && ReferentialRef.fromObject(source.gearClassification);
    this.taxonGroupType = (source.taxonGroupType && ReferentialRef.fromObject(source.taxonGroupType)) ||
      (isNotNil(source.taxonGroupTypeId) ? ReferentialRef.fromObject({id: source.taxonGroupTypeId}) : undefined);
    this.locationClassifications = source.locationClassifications  && source.locationClassifications.map(ReferentialRef.fromObject) || [];
    this.locations = source.locations && source.locations.map(ReferentialRef.fromObject) || [];
    this.departments = source.departments && source.departments.map(ProgramDepartment.fromObject) || [];
    this.persons = source.persons && source.persons.map(ProgramPerson.fromObject) || [];
    this.acquisitionLevelLabels = source.acquisitionLevelLabels || [];

    this.strategies = source.strategies && source.strategies.map(Strategy.fromObject) || [];
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    if (opts && opts.minify) {
      return {
        id: this.id,
        __typename: opts.keepTypename && this.__typename || undefined
      };
    }
    const target: any = super.asObject(opts);
    target.properties = {...this.properties};
    target.gearClassification = this.gearClassification && this.gearClassification.asObject(opts);
    target.taxonGroupType = this.taxonGroupType && this.taxonGroupType.asObject(opts);
    target.locationClassifications = this.locationClassifications  && this.locationClassifications.map(item => item.asObject(opts)) || [];
    target.locations = this.locations && this.locations.map(item => item.asObject(opts)) || [];
    target.departments = this.departments && this.departments.map(s => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
    target.persons = this.persons && this.persons.map(s => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));

    target.strategies = this.strategies && this.strategies.map(s => s.asObject(opts));

    return target;
  }


  equals(other: Program): boolean {
    return (super.equals(other) && isNotNil(this.id))
      || this.label === other.label;
  }

  getPropertyAsBoolean(definition: FormFieldDefinition): boolean {
    const value = this.getProperty(definition);
    return isNotNil(value) ? (value && value !== "false") : undefined;
  }

  getPropertyAsInt(definition: FormFieldDefinition): number {
    const value = this.getProperty(definition);
    return isNotNil(value) ? parseInt(value) : undefined;
  }

  getPropertyAsNumbers(definition: FormFieldDefinition): number[] {
    const value = this.getProperty(definition);
    if (typeof value === 'string') return value.split(',').map(parseFloat) || undefined;
    return isNotNil(value) ? [parseFloat(value)] : undefined;
  }

  getPropertyAsStrings(definition: FormFieldDefinition): string[] {
    const value = this.getProperty(definition);
    return value && value.split(',') || undefined;
  }

  getProperty<T = string>(definition: FormFieldDefinition): T {
    if (!definition) throw new Error("Missing 'definition' argument");
    return isNotNil(this.properties[definition.key]) ? this.properties[definition.key] : definition.defaultValue;
  }
}

@EntityClass({typename: 'ProgramDepartmentVO'})
export class ProgramDepartment extends Entity<ProgramDepartment> {
  static fromObject: (source: any, opts?: any) => ProgramDepartment;

  programId: number;
  location: ReferentialRef;
  privilege: ReferentialRef;
  department: ReferentialRef;

  constructor() {
    super(ProgramDepartment.TYPENAME);
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.location = this.location && this.location.asObject(opts) || undefined;
    target.privilege = this.privilege && this.privilege.asObject(opts);
    target.department = this.department && this.department.asObject(opts);
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.programId = source.programId;
    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.privilege = source.privilege && ReferentialRef.fromObject(source.privilege);
    this.department = source.department && ReferentialRef.fromObject(source.department);
  }

}


@EntityClass({typename: 'ProgramPersonVO'})
export class ProgramPerson extends Entity<ProgramPerson> {
  static fromObject: (source: any, opts?: any) => ProgramPerson;
  static equals = (o1, o2) => EntityUtils.equals(o1, o2)
    || (
      o1 && o2
      && ReferentialUtils.equals(o1.person, o2.person)
      && ReferentialUtils.equals(o1.privilege, o2.privilege)
      && ReferentialUtils.equals(o1.location, o2.location)
    )

  programId: number;
  location: ReferentialRef;
  privilege: ReferentialRef;
  person: Person;

  constructor() {
    super(ProgramPerson.TYPENAME);
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.location = this.location && this.location.asObject(opts) || undefined;
    target.privilege = this.privilege && this.privilege.asObject(opts);
    target.person = this.person && this.person.asObject(opts);
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.programId = source.programId;
    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.privilege = source.privilege && ReferentialRef.fromObject(source.privilege);
    this.person = source.person && Person.fromObject(source.person);
  }

  equals(other: ProgramPerson): boolean {
    return ProgramPerson.equals(this, other);
  }
}

export class ProgramUtils {

  static getAcquisitionLevels(program: Program): string[] {

    const acquisitionLevels = (program.strategies || []).flatMap(strategy => ((strategy.denormalizedPmfms || strategy.pmfms || []) as (IDenormalizedPmfm|PmfmStrategy)[])
      .map(pmfm => {
        if (pmfm && pmfm instanceof PmfmStrategy) {
          return (typeof pmfm.acquisitionLevel === 'string' ? pmfm.acquisitionLevel : pmfm.acquisitionLevel?.label);
        }
        if (pmfm && pmfm instanceof DenormalizedPmfmStrategy) {
          return pmfm.acquisitionLevel;
        }
      })
      .filter(isNotNil)
    );

    return removeDuplicatesFromArray(acquisitionLevels);
  }

  static getLocationLevelIds(program) {
    return ProgramPropertiesUtils.getPropertyAsNumbersByEntityName(program, 'LocationLevel');
  }
}
