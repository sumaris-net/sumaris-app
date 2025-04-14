import {
  DateUtils,
  EntityAsObjectOptions,
  EntityClass,
  EntityUtils,
  fromDateISOString,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  ReferentialRef,
  ReferentialUtils,
  toDateISOString,
  toNumber,
} from '@sumaris-net/ngx-components';
import { DataOrigin } from '@app/activity-calendar/model/data-origin.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { Moment } from 'moment';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Metier } from '@app/referential/metier/metier.model';
import { IWithProgramEntity } from '@app/data/services/model/model.utils';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { FishingArea, FishingAreaUtils } from '@app/data/fishing-area/fishing-area.model';
import { IUseFeatures } from '@app/activity-calendar/model/use-features.model';
import { GearRef } from '@app/referential/gear/gear.model';

@EntityClass({ typename: 'GearUseFeaturesVO' })
export class GearUseFeatures extends DataEntity<GearUseFeatures> implements IWithProgramEntity<GearUseFeatures>, IUseFeatures<GearUseFeatures> {
  static fromObject: (source: any, options?: any) => GearUseFeatures;

  static equals(o1: GearUseFeatures, o2: GearUseFeatures, opts?: { withMeasurementValues: false }) {
    return (!o1 && !o2) || (o1 && GearUseFeatures.fromObject(o1).equals(o2, opts));
  }

  static isNotEmpty(o: GearUseFeatures) {
    return !GearUseFeatures.isEmpty(o);
  }

  static isEmpty(o: GearUseFeatures) {
    return (
      !o ||
      (ReferentialUtils.isEmpty(o.gear) &&
        ReferentialUtils.isEmpty(o.metier) &&
        MeasurementValuesUtils.isEmpty(o.measurementValues) &&
        (!o.fishingAreas || o.fishingAreas.every((fa) => FishingArea.isEmpty(fa))))
    );
  }

  static isSameRemoteUniqueKey(o1: GearUseFeatures, o2: GearUseFeatures): boolean {
    return (
      o1 &&
      o2 &&
      // Same program
      ReferentialUtils.equals(o1.program, o2.program) &&
      // Vessel
      o1.vesselId === o2.vesselId &&
      // Same metier
      ReferentialUtils.equals(o1.metier, o2.metier) &&
      // Same gear
      ReferentialUtils.equals(o1.gear, o2.gear) &&
      // Same date
      DateUtils.equals(o1.startDate, o2.startDate) &&
      DateUtils.equals(o1.endDate, o2.endDate)
      // Same parent (not need here)
      // n1.activityCalendarId === n2.activityCalendarId
      // n1.dailyActivityCalendarId === n2.dailyActivityCalendarId
    );
  }

  program: ReferentialRef = null;
  vesselId: number = null;
  startDate: Moment = null;
  endDate: Moment = null;
  rankOrder: number = null;
  metier: Metier = null;
  gear: GearRef = null;
  dataOrigins: DataOrigin[] = null;
  measurementValues: MeasurementModelValues | MeasurementFormValues = null;
  fishingAreas: FishingArea[] = null;

  //activityCalendarId: number;
  //dailyActivityCalendarId: number;

  constructor() {
    super(GearUseFeatures.TYPENAME);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.program = this.program?.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }) || undefined;
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    target.metier =
      (this.metier && this.metier.asObject({ ...opts, ...NOT_MINIFY_OPTIONS /*Always minify=false, because of operations tables cache*/ })) ||
      undefined;
    target.gear = (this.gear && this.gear.asObject({ ...opts, ...NOT_MINIFY_OPTIONS })) || undefined;
    if (target.gear && !target.gear.entityName) {
      console.warn('Fixme: manually set gear entityName!');
      target.gear.entityName = 'GearVO';
    }
    target.fishingAreas = this.fishingAreas?.map((fa) => fa.asObject(opts)) || undefined;
    target.dataOrigins = this.dataOrigins?.map((origin) => origin.asObject(opts)) || undefined;
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);

    return target;
  }

  fromObject(source: any, opts?: EntityAsObjectOptions) {
    super.fromObject(source, opts);
    this.program = source.program && ReferentialRef.fromObject(source.program);
    this.vesselId = source.vesselId;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.metier = source.metier && Metier.fromObject(source.metier);
    this.gear = source.gear && GearRef.fromObject(source.gear);
    this.rankOrder = source.rankOrder;
    this.dataOrigins = source.dataOrigins?.map(DataOrigin.fromObject) || undefined;
    this.measurementValues = { ...source.measurementValues }; // Copy values
    this.fishingAreas = source.fishingAreas?.map(FishingArea.fromObject) || undefined;
    this.dataOrigins = source.dataOrigins?.map(DataOrigin.fromObject) || undefined;
  }

  equals(
    other: GearUseFeatures,
    opts: { withProgram?: boolean; withMeasurementValues?: boolean } = { withProgram: true, withMeasurementValues: false }
  ): boolean {
    return (
      (super.equals(other) && isNotNil(this.id)) ||
      // Same metier
      (ReferentialUtils.equals(this.metier, other.metier) &&
        // Same gear
        ReferentialUtils.equals(this.gear, other.gear) &&
        // Same date
        DateUtils.equals(this.startDate, other.startDate) &&
        DateUtils.equals(this.endDate, other.endDate) &&
        // Same rankOrder
        this.rankOrder === other.rankOrder &&
        // Same parent (activity calendar or daily activity calendar)
        //((!this.activityCalendarId && !other.activityCalendarId) || this.activityCalendarId === other.activityCalendarId) &&
        //((!this.dailyActivityCalendarId && !other.dailyActivityCalendarId) || this.dailyActivityCalendarId === other.dailyActivityCalendarId) &&
        // Same program
        (opts.withProgram === false || ReferentialUtils.equals(this.program, other.program)) &&
        // Same measurementsValues
        (opts.withMeasurementValues !== true || MeasurementValuesUtils.equals(this.measurementValues, other.measurementValues)))
    );
  }
}

export class GearUseFeaturesComparators {
  static sortByDateAndRankOrderFn(n1: GearUseFeatures, n2: GearUseFeatures): number {
    return DateUtils.compare(n1.startDate, n2.startDate) || GearUseFeaturesComparators.sortByRankOrderFn(n1, n2);
  }
  static sortByMonthAndRankOrderFn(n1: GearUseFeatures, n2: GearUseFeatures): number {
    return (
      DateUtils.compare(n1.startDate, n2.startDate?.clone().year(n1.startDate.year()), 'month') ||
      GearUseFeaturesComparators.sortByRankOrderFn(n1, n2)
    );
  }
  static sortByRankOrderFn(n1: GearUseFeatures, n2: GearUseFeatures): number {
    const d1 = toNumber(n1.rankOrder, 9999);
    const d2 = toNumber(n2.rankOrder, 9999);
    return d1 === d2 ? 0 : d1 > d2 ? 1 : -1;
  }
}

export class GearUseFeaturesUtils {
  /**
   * Fixes issues related to duplicate unique keys in remote `GearUseFeatures` or `FishingArea` entries.
   * This is implemented as a workaround to remote errors caused by such duplicates.
   *
   * @param {GearUseFeatures[]} remoteGearUseFeatures - The array of `GearUseFeatures` obtained from a remote source.
   * It will be filtered to retain only those with a valid ID.
   * @param {GearUseFeatures[]} localGearUseFeatures - The array of `GearUseFeatures` from the local system
   * which will be processed for any overlapping unique keys with the remote data.
   * @return {void} - Does not return a value. Operates by processing and mutating local and remote `GearUseFeatures` data as needed.
   */
  static fixRemoteUniqueKeyError(localGearUseFeatures: GearUseFeatures[], remoteGearUseFeatures: GearUseFeatures[]): void {
    if (isEmptyArray(localGearUseFeatures)) return; // Nothing to fix

    // Keep only GUF with an id
    remoteGearUseFeatures = (remoteGearUseFeatures || []).filter((guf) => isNotNil(guf.id));
    if (isEmptyArray(remoteGearUseFeatures)) return; // OK, no remote data (e.g. first save)

    // Workaround to avoid remote error on GUF unique key (see issue #899)
    localGearUseFeatures
      .filter((guf) => remoteGearUseFeatures.some((p) => guf.id !== p.id && GearUseFeatures.isSameRemoteUniqueKey(guf, p)))
      // Clean id, to force a deletion of the duplication, then a new insert
      .forEach(EntityUtils.cleanIdAndUpdateDate);

    // Workaround to avoid remote error on FISHING_AREA unique key (see issue #883)
    localGearUseFeatures
      .filter((guf) => isNotEmptyArray(guf.fishingAreas))
      .forEach((guf) => {
        const remoteFishingAreas = remoteGearUseFeatures.find((p) => p.id === guf.id)?.fishingAreas;
        FishingAreaUtils.fixRemoteUniqueKeyError(guf.fishingAreas, remoteFishingAreas);
      });
  }
}
