import { BaseReferential, EntityAsObjectOptions, EntityClass, ReferentialRef } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

export interface IExpertiseAreaProperties {
  locationIds: number[];
  locationLevelIds: number[];
}

@EntityClass({ typename: 'ExpertiseAreaVO' })
export class ExpertiseArea extends BaseReferential<ExpertiseArea> {
  static ENTITY_NAME = 'ExpertiseArea';
  static fromObject: (source: any, opts?: any) => ExpertiseArea;

  locations: ReferentialRef[] = null;
  locationLevels: ReferentialRef[] = null;

  constructor() {
    super(ExpertiseArea.TYPENAME);
    this.entityName = ExpertiseArea.ENTITY_NAME;
  }

  fromObject(source: any): ExpertiseArea {
    super.fromObject(source);
    this.entityName = ExpertiseArea.ENTITY_NAME;
    this.locations = (source.locations || []).map(ReferentialRef.fromObject);
    this.locationLevels = (source.locationLevels || []).map(ReferentialRef.fromObject);
    return this;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);

    target.locations = this.locations?.map((item) => item.asObject({ ...opts, ...NOT_MINIFY_OPTIONS })) || null;
    target.locationLevels = this.locationLevels?.map((item) => item.asObject({ ...opts, ...NOT_MINIFY_OPTIONS })) || null;
    return target;
  }
}
