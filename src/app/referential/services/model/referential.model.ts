import {
  BaseReferential,
  EntityClass,
  IReferentialRef,
  isNotNil,
  ReferentialAsObjectOptions,
  ReferentialRef,
  ReferentialUtils
} from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

@EntityClass({ typename: 'ReferentialVO' })
export class FullReferential<T extends FullReferential<T, ID> = FullReferential<any, any>,
  ID = number,
  AO extends ReferentialAsObjectOptions = ReferentialAsObjectOptions,
  FO = any>
  extends BaseReferential<T, ID, AO, FO> {

  static fromObject: (source: any, opts?: any) => FullReferential;

  parent: IReferentialRef = null;

  constructor(__typename?: string) {
    super(__typename || FullReferential.TYPENAME);
    this.label = null;
    this.name = null;
    this.description = null;
    this.comments = null;
    this.creationDate = null;
    this.statusId = null;
    this.levelId = null;
  }

  fromObject(source: any, opts?: FO) {
    super.fromObject(source, opts);
    this.parent = source.parent && ReferentialRef.fromObject(source.parent) || isNotNil(source.parentId) && ReferentialRef.fromObject({ id: source.parentId });
  }

  asObject(opts?: AO): any {
    const target = super.asObject(opts);
    target.statusId = ReferentialUtils.isNotEmpty(target.statusId) ? target.statusId.id : target.statusId;
    target.levelId = ReferentialUtils.isNotEmpty(target.levelId) ? target.levelId.id : target.levelId;
    target.parent = this.parent && this.parent.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }) || undefined;

    if (opts && opts.minify) {
      target.parentId = ReferentialUtils.isNotEmpty(target.parent) ? target.parent.id : target.parentId;
      delete target.parent;
    }

    return target;
  }
}
