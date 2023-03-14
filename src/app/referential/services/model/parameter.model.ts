import { BaseReferential, EntityAsObjectOptions, EntityClass, isNotNil, Referential } from '@sumaris-net/ngx-components';

export declare type ParameterType = 'double' | 'string' | 'qualitative_value' | 'date' | 'boolean' ;

@EntityClass({typename: 'ParameterVO'})
export class Parameter extends BaseReferential<Parameter> {

  static ENTITY_NAME = 'Parameter';
  static fromObject: (source: any, opts?: any) => Parameter;

  type: string | ParameterType;
  qualitativeValues: Referential[];

  constructor() {
    super(Parameter.TYPENAME);
    this.entityName = Parameter.ENTITY_NAME;
  }

// TODO : Check if clone is needed
  clone(): Parameter {
    const target = new Parameter();
    target.fromObject(this);
    target.qualitativeValues = this.qualitativeValues && this.qualitativeValues.map(qv => qv.clone()) || undefined;
    return target;
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target: any = super.asObject(options);
    target.qualitativeValues = this.qualitativeValues && this.qualitativeValues.map(qv => qv.asObject(options)) || undefined;
    return target;
  }

  fromObject(source: any): Parameter {
    super.fromObject(source);
    this.entityName = source.entityName || Parameter.ENTITY_NAME;
    this.type = source.type;
    this.qualitativeValues = source.qualitativeValues && source.qualitativeValues.map(Referential.fromObject) || [];
    return this;
  }

  get isNumeric(): boolean {
    return isNotNil(this.type) && (this.type === 'double');
  }

  get isQualitative(): boolean {
    return isNotNil(this.type) && (this.type === 'qualitative_value');
  }
}
