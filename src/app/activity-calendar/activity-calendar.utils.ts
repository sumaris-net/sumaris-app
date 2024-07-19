import {
  AppError,
  DateUtils,
  EntityUtils,
  fromDateISOString,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  removeDuplicatesFromArray,
  ServerErrorCodes,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
import { ActivityCalendar } from './model/activity-calendar.model';
import { Moment } from 'moment';
import { IUseFeatures, IUseFeaturesUtils } from '@app/activity-calendar/model/use-features.model';
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
    const writableSources = sources.filter((source) => IUseFeaturesUtils.isInPeriods(source, writablePeriods));

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
}
