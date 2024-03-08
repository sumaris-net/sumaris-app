import { Entity, EntityAsObjectOptions, EntityClass, ReferentialRef } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

@EntityClass({ typename: 'DataOriginVO' })
export class DataOrigin extends Entity<DataOrigin> {
  static fromObject: (source: any, options?: any) => DataOrigin;

  program: ReferentialRef;
  acquisitionLevel: string;
  vesselUseFeaturesId: number;
  gearUseFeaturesId: number;

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.program = (this.program && this.program.asObject({ ...opts, ...NOT_MINIFY_OPTIONS })) || undefined;
    return target;
  }

  fromObject(source: any, opts?: EntityAsObjectOptions) {
    super.fromObject(source, opts);
    this.program = ReferentialRef.fromObject(source.program);
    this.acquisitionLevel = source.acquisitionLevel;
    this.vesselUseFeaturesId = source.vesselUseFeaturesId;
    this.gearUseFeaturesId = source.gearUseFeaturesId;
  }
}
