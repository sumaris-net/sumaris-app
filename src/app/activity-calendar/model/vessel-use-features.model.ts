import { EntityAsObjectOptions, EntityClass, fromDateISOString, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { IWithVesselSnapshotEntity, VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { DataOrigin } from '@app/activity-calendar/model/data-origin.model';
import { Moment } from 'moment';
import { IWithProgramEntity } from '@app/data/services/model/model.utils';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

export const VesselUseFeaturesIsActiveEnum = {
  INACTIVE: 0,
  ACTIVE: 1,
  NOT_EXISTS: 2,
};

@EntityClass({ typename: 'VesselUseFeaturesVO' })
export class VesselUseFeatures extends DataEntity<VesselUseFeatures>
  implements IWithVesselSnapshotEntity<VesselUseFeatures>, IWithProgramEntity<VesselUseFeatures>{
  static fromObject: (source: any, options?: any) => VesselUseFeatures;

  program: ReferentialRef;
  vesselId: number = null;
  vesselSnapshot: VesselSnapshot;
  startDate: Moment;
  endDate: Moment;
  isActive: number;
  basePortLocation?: ReferentialRef;
  dataOrigins: DataOrigin[];
  measurementValues: MeasurementModelValues | MeasurementFormValues = null;

  constructor() {
    super(VesselUseFeatures.TYPENAME);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.program = this.program?.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.vesselSnapshot = this.vesselSnapshot?.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    target.basePortLocation = this.basePortLocation?.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.dataOrigins = this.dataOrigins?.map(origin => origin.asObject(opts)) || undefined;
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);

    return target;
  }

  fromObject(source: any, opts?: EntityAsObjectOptions) {
    super.fromObject(source, opts);
    this.program = source.program && ReferentialRef.fromObject(source.program);
    this.vesselId = source.vesselId;
    this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.isActive = source.isActive;
    this.basePortLocation = source.basePortLocation && ReferentialRef.fromObject(source.basePortLocation);
    this.dataOrigins = source.dataOrigins?.map(DataOrigin.fromObject) || undefined;
    this.measurementValues = { ...source.measurementValues }; // Copy values
  }
}
