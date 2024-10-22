import { BaseReferential, EntityAsObjectOptions, EntityClass, ReferentialRef } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

@EntityClass({ typename: 'UserExpertiseAreaVO' })
export class UserExpertiseArea extends BaseReferential<UserExpertiseArea> {
  static ENTITY_NAME = 'UserExpertiseArea';
  static fromObject: (source: any, opts?: any) => UserExpertiseArea;

  locations: ReferentialRef[] = null;

  constructor() {
    super(UserExpertiseArea.TYPENAME);
    this.entityName = UserExpertiseArea.ENTITY_NAME;
  }

  fromObject(source: any): UserExpertiseArea {
    super.fromObject(source);
    this.entityName = UserExpertiseArea.ENTITY_NAME;
    this.locations = (source.locations || []).map(ReferentialRef.fromObject);
    return this;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);

    target.locations = this.locations?.map((item) => item.asObject({ ...opts, ...NOT_MINIFY_OPTIONS })) || null;
    return target;
  }
}
