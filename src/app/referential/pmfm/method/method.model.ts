import { BaseReferential, EntityAsObjectOptions, EntityClass, toBoolean } from '@sumaris-net/ngx-components';

@EntityClass({typename: 'MethodVO'})
export class Method extends BaseReferential<Method> {

  static ENTITY_NAME = 'Method';
  static fromObject: (source: any, opts?: any) => Method;

  isCalculated: boolean = null;
  isEstimated: boolean = null;

  constructor() {
    super(Method.TYPENAME);
    this.entityName = Method.ENTITY_NAME;
  }

  fromObject(source: any): Method {
    super.fromObject(source);
    this.entityName = Method.ENTITY_NAME;
    this.isCalculated = source.isCalculated;
    this.isEstimated = source.isEstimated;
    return this;
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target: any = super.asObject(options);
    return target;
  }
}
