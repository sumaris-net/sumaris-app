import { BaseReferential, EntityAsObjectOptions, EntityClass, isNotNilOrBlank, Property, ReferentialRef } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { arrayPluck } from '@app/shared/functions';

@EntityClass({ typename: 'ExpertiseAreaVO' })
export class ExpertiseArea extends BaseReferential<ExpertiseArea> {
  static ENTITY_NAME = 'ExpertiseArea';
  static fromObject: (source: any, opts?: any) => ExpertiseArea;

  locations: ReferentialRef[] = null;

  constructor() {
    super(ExpertiseArea.TYPENAME);
    this.entityName = ExpertiseArea.ENTITY_NAME;
  }

  fromObject(source: any): ExpertiseArea {
    super.fromObject(source);
    this.entityName = ExpertiseArea.ENTITY_NAME;
    this.locations = (source.locations || []).map(ReferentialRef.fromObject);
    return this;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);

    target.locations = this.locations?.map((item) => item.asObject({ ...opts, ...NOT_MINIFY_OPTIONS })) || null;
    return target;
  }
}

// TODO remove if not used
export class ExpertiseAreaUtils {
  static deserialize(value: string | ExpertiseArea[]): ExpertiseArea[] {
    if (Array.isArray(value)) return value;

    return value.split(',').map((source) => {
      const [name, values] = source.split('|', 2);
      return ExpertiseArea.fromObject({
        name,
        locations: values.split(';').map((id) => <any>{ entityName: 'Location', id: +id }),
      });
    });
  }

  static asProperties(value: string | ExpertiseArea[]): Property[] {
    return (
      ExpertiseAreaUtils.deserialize(value)
        // Transform into property
        .map((source) => <Property>{ key: arrayPluck(source.locations, 'id').join(','), value: source.name })
        // Filter empty name or locations
        .filter((item) => isNotNilOrBlank(item.key) && isNotNilOrBlank(item.value))
    );
  }
}
