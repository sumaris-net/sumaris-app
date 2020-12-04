import {Entity, EntityUtils, PropertiesMap} from "../../../core/services/model/entity.model";
import {Moment} from "moment";
import {ReferentialAsObjectOptions, ReferentialRef} from "../../../core/services/model/referential.model";
import {fromDateISOString, isNotNil, toDateISOString} from "../../../shared/functions";
import {FormFieldDefinition} from "../../../shared/form/field.model";
import {Strategy} from "./strategy.model";


export class Program extends Entity<Program> {

  static fromObject(source: any): Program {
    if (!source || source instanceof Program) return source;
    const res = new Program();
    res.fromObject(source);
    return res;
  }

  label: string;
  name: string;
  description: string;
  comments: string;
  creationDate: Moment;
  statusId: number;
  properties: PropertiesMap;

  gearClassification: ReferentialRef;
  taxonGroupType: ReferentialRef;
  locationClassifications: ReferentialRef[];
  locations: ReferentialRef[];

  strategies: Strategy[];

  constructor(data?: {
    id?: number,
    label?: string,
    name?: string
  }) {
    super();
    this.id = data && data.id;
    this.label = data && data.label;
    this.name = data && data.name;
  }

  clone(): Program {
    const target = new Program();
    target.fromObject(this);
    return target;
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    if (opts && opts.minify) {
      return {
        id: this.id,
        __typename: opts.keepTypename && this.__typename || undefined
      };
    }
    const target: any = super.asObject(opts);
    target.creationDate = toDateISOString(this.creationDate);
    target.properties = this.properties;
    target.gearClassification = this.gearClassification && this.gearClassification.asObject(opts);
    target.taxonGroupType = this.taxonGroupType && this.taxonGroupType.asObject(opts);
    target.locationClassifications = this.locationClassifications  && this.locationClassifications.map(item => item.asObject(opts)) || [];
    target.locations = this.locations && this.locations.map(item => item.asObject(opts)) || [];

    target.strategies = this.strategies && this.strategies.map(s => s.asObject(opts));
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.label = source.label;
    this.name = source.name;
    this.description = source.description;
    this.comments = source.comments;
    this.statusId = source.statusId;
    this.creationDate = fromDateISOString(source.creationDate);
    if (source.properties && source.properties instanceof Array) {
      this.properties = EntityUtils.getPropertyArrayAsObject(source.properties);
    } else {
      this.properties = source.properties;
    }
    this.gearClassification = source.gearClassification && ReferentialRef.fromObject(source.gearClassification);
    this.taxonGroupType = source.taxonGroupType && ReferentialRef.fromObject(source.taxonGroupType);
    this.locationClassifications = source.locationClassifications  && source.locationClassifications.map(ReferentialRef.fromObject) || [];
    this.locations = source.locations && source.locations.map(ReferentialRef.fromObject) || [];

    this.strategies = source.strategies && source.strategies.map(Strategy.fromObject) || [];
  }

  equals(other: Program): boolean {
    return super.equals(other) || this.label === other.label;
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
    return isNotNil(this.properties[definition.key]) ? this.properties[definition.key] : (definition.defaultValue || undefined);
  }
}
