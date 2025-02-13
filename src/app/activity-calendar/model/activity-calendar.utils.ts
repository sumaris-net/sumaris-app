import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { GearUseFeaturesUtils } from '@app/activity-calendar/model/gear-use-features.model';
import {
  AppError,
  DateUtils,
  EntityUtils,
  fromDateISOString,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  ReferentialRef,
  removeDuplicatesFromArray,
  ServerErrorCodes,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
import { IUseFeatures, IUseFeaturesUtils } from '@app/activity-calendar/model/use-features.model';
import { Moment } from 'moment/moment';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';

export class ActivityCalendarUtils {
  static merge(source: ActivityCalendar, remoteEntity: ActivityCalendar): ActivityCalendar {
    const target = remoteEntity.clone();

    // Remote all ids, in order to make next equals works
    EntityUtils.cleanIdAndUpdateDate(target);

    // Check base attributes are equals (without children entities)
    const sameProperties = source.equals(target, { withGearUseFeatures: false, withVesselUseFeatures: false, withMeasurementValues: true });
    if (!sameProperties) {
      // Cannot merge: stop here
      throw <AppError>{
        code: ServerErrorCodes.BAD_UPDATE_DATE,
        message: 'ERROR.BAD_UPDATE_DATE',
      };
    }

    const writablePeriods = (remoteEntity.vesselRegistrationPeriods || [])?.filter((vrp) => !vrp.readonly);
    if (isEmptyArray(writablePeriods)) return remoteEntity; // No access write

    // Merge VUF
    target.vesselUseFeatures = this.mergeUseFeatures(source.vesselUseFeatures, target.vesselUseFeatures, writablePeriods);

    // Merge GUF
    target.gearUseFeatures = this.mergeUseFeatures(source.gearUseFeatures, target.gearUseFeatures, writablePeriods);

    // Merge GUF
    //target.gearPhysicalFeatures = this.mergeUseFeatures(source.gearPhysicalFeatures, target.gearPhysicalFeatures, writablePeriods);

    // Update local entity
    target.id = remoteEntity.id;
    target.updateDate = remoteEntity.updateDate;

    if (this.hasSomeConflict(target)) {
      // Mark as conflictual
      target.qualityFlagId = QualityFlagIds.CONFLICTUAL;
      const conflictualStartDates = removeDuplicatesFromArray(
        [...target.vesselUseFeatures, ...target.gearUseFeatures, ...target.gearPhysicalFeatures].map((e) => e.startDate).map(toDateISOString)
      ).map(fromDateISOString);

      // Keep only conflictual data
      target.vesselUseFeatures = target.vesselUseFeatures.filter((vuf) =>
        conflictualStartDates.some((date) => DateUtils.isSame(date, vuf.startDate))
      );
      target.gearUseFeatures = target.gearUseFeatures.filter((guf) => conflictualStartDates.some((date) => DateUtils.isSame(date, guf.startDate)));
      target.gearPhysicalFeatures = target.gearPhysicalFeatures.filter((gpf) => gpf.qualityFlagId === QualityFlagIds.CONFLICTUAL);
    }

    return target;
  }

  static mergeUseFeatures<T extends IUseFeatures<any>>(
    sources: T[],
    remoteEntities: T[],
    writablePeriods: { startDate: Moment; endDate?: Moment }[]
  ): T[] {
    const conflictualRemoteEntities: T[] = [];

    // Keep only source with access right
    const writableSources = sources.filter((source) => IUseFeaturesUtils.intersectSomePeriods(source, writablePeriods));

    let mergedSources = writableSources.map((source) => {
      const existingRemoteEntities = remoteEntities.filter((remoteEntity) =>
        IUseFeaturesUtils.isSame(source, remoteEntity, { withId: true, withMeasurementValues: false })
      );

      // Keep source if no corresponding remote entities
      if (isEmptyArray(existingRemoteEntities)) return source;

      const remoteEntity = existingRemoteEntities.length === 1 ? existingRemoteEntities[0] : undefined;
      if (remoteEntity) {
        // Keep source if was using the last remote updateDate
        if (remoteEntity.id === source.id && remoteEntity.updateDate?.isSame(source.updateDate)) return source;

        const isSame = IUseFeaturesUtils.isSame(source, remoteEntity, { withId: false, withMeasurementValues: true });
        if (isSame) return remoteEntity; // Same content: keep the remote entity (with a valid update date)
      }

      // Mark all remote entities as conflictual
      existingRemoteEntities.forEach((remoteEntity) => {
        const unresolvedEntity = remoteEntity.clone();
        DataEntityUtils.markAsConflictual(unresolvedEntity);
        conflictualRemoteEntities.push(unresolvedEntity);
      });

      return source;
    });

    if (isNotEmptyArray(conflictualRemoteEntities)) return conflictualRemoteEntities;

    // Fill id, using a local id
    let localId = -1;
    mergedSources.filter((e) => isNil(e.id)).forEach((entity) => (entity.id = localId--));

    // Add remote entities, if not already exists
    mergedSources = removeDuplicatesFromArray(mergedSources.concat(remoteEntities), 'id');

    // Clean local id
    mergedSources.filter(EntityUtils.isLocal).forEach((entity) => (entity.id = undefined));

    return mergedSources;
  }

  static hasSomeConflict(calendar: ActivityCalendar): boolean {
    if (!calendar) return false;
    return (
      calendar.qualityFlagId === QualityFlagIds.CONFLICTUAL ||
      calendar.vesselUseFeatures?.some((vuf) => vuf?.qualityFlagId === QualityFlagIds.CONFLICTUAL) ||
      calendar.gearUseFeatures?.some((guf) => guf?.qualityFlagId === QualityFlagIds.CONFLICTUAL) ||
      calendar.gearPhysicalFeatures?.some((gpf) => gpf?.qualityFlagId === QualityFlagIds.CONFLICTUAL) ||
      false
    );
  }

  /**
   * Workaround to avoid remote error on GUF and FISHING_AREA unique key (see issue #899 and #883)
   * @param localActivityCalendar
   * @param remoteActivityCalendar
   */
  static fixRemoteUniqueKeyError(localActivityCalendar: ActivityCalendar, remoteActivityCalendar: ActivityCalendar): void {
    if (!localActivityCalendar || !remoteActivityCalendar) return; // Nothing to fix

    // Fix gear use features unique key error
    GearUseFeaturesUtils.fixRemoteUniqueKeyError(localActivityCalendar.gearUseFeatures, remoteActivityCalendar.gearUseFeatures);
  }

  static setYear(data: ActivityCalendar, year: number) {
    data.year = year;
    data.startDate = data.startDate?.year(year);
    (data.vesselUseFeatures || []).forEach((vuf) => {
      vuf.startDate = vuf.startDate.year(year);
      vuf.endDate = vuf.endDate?.year(year);
    });
    (data.gearUseFeatures || []).forEach((guf) => {
      guf.startDate = guf.startDate.year(year);
      guf.endDate = guf.endDate?.year(year);
    });
    (data.gearPhysicalFeatures || []).forEach((gpf) => {
      gpf.startDate = gpf.startDate.year(year);
      gpf.endDate = gpf.endDate?.year(year);
    });
  }

  static setProgram(data: ActivityCalendar, program: ReferentialRef) {
    data.program = program;
    (data.vesselUseFeatures || []).forEach((vuf) => {
      vuf.program = program;
    });
    (data.gearUseFeatures || []).forEach((guf) => {
      guf.program = program;
    });
    (data.gearPhysicalFeatures || []).forEach((gpf) => {
      gpf.program = program;
    });
  }
}
