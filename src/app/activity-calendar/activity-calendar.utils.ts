import { AppError, arrayDistinct, EntityUtils, isEmptyArray, ServerErrorCodes } from '@sumaris-net/ngx-components';
import { ProgramPrivilegeEnum, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { ActivityCalendar } from './model/activity-calendar.model';
import { IUseFeatures, IUseFeaturesUtils } from '@app/activity-calendar/model/use-features.model';
import { Moment } from 'moment';

export class ActivityCalendarUtils {
  static merge(source: ActivityCalendar, remoteEntity: ActivityCalendar): ActivityCalendar {
    const target = remoteEntity.clone();
    EntityUtils.cleanIdAndUpdateDate(target);

    // Check base attributes are equals (without children entities)
    const isSameProperties = source.equals(target, { withGearUseFeatures: false, withVesselUseFeatures: false, withMeasurementValues: true });
    if (!isSameProperties) {
      // Cannot merge: stop here
      throw <AppError>{
        code: ServerErrorCodes.BAD_UPDATE_DATE,
        message: 'ERROR.BAD_UPDATE_DATE',
      };
    }

    const writablePeriods = remoteEntity.vesselRegistrationPeriodsByPrivileges?.[ProgramPrivilegeEnum.OBSERVER] || [];
    if (isEmptyArray(writablePeriods)) return remoteEntity; // No access write

    // Merge VUF
    target.vesselUseFeatures = this.mergeUseFeatures(source.vesselUseFeatures, remoteEntity.vesselUseFeatures, writablePeriods);

    // Merge GUF
    target.gearUseFeatures = this.mergeUseFeatures(source.gearUseFeatures, remoteEntity.gearUseFeatures, writablePeriods);

    // Merge PUF
    // const { resolved: resolvedPuf, unresolved: unresolvedPuf } = this.mergeUseFeatures(
    target.gearPhysicalFeatures = this.mergeUseFeatures(source.gearPhysicalFeatures, remoteEntity.gearPhysicalFeatures, writablePeriods);

    target.id = remoteEntity.id;
    target.updateDate = remoteEntity.updateDate;

    return target;
  }

  static mergeUseFeatures<T extends IUseFeatures<any>>(
    sources: T[],
    remoteEntities: T[],
    writablePeriods: { startDate: Moment; endDate: Moment }[]
  ): T[] {
    const unresolved: T[] = [];
    // TODO : need this ???
    // const localId = 0;

    console.debug('MYTEST ActivityCalendarUtils.mergeUseFeatures: source, remoteEntities', { sources, remoteEntities });
    let mergedSources = sources
      // Keep only source with access right
      .filter((source) => IUseFeaturesUtils.isInPeriods(source, writablePeriods))
      .map((source) => {
        // Has a remote VUF
        const remoteEntity = remoteEntities.find((remoteEntity) =>
          IUseFeaturesUtils.isSame(source, remoteEntity, { withId: true, withMeasurementValues: false })
        );
        // No conflict: we keep the source
        if (!remoteEntity) {
          // if (isNil(source.id)) source.id = --localId;
          return source;
        }

        const isSame = IUseFeaturesUtils.isSame(source, remoteEntity, { withId: false, withMeasurementValues: true });
        if (isSame) return remoteEntity; // Same content: kse remote (with a valid update date)

        if (source.updateDate.isSameOrBefore(remoteEntity.updateDate)) {
          // If source update date is same or before remote update date :
          // - the remote is conflictual so :
          //   - flag remote data as conflictual
          //   - add it into conflictual data
          // - else keep source data as it
          remoteEntity.qualityFlagId = QualityFlagIds.CONFLICTUAL;
          unresolved.push(remoteEntity);
        }

        return source;
      });

    // Clean local id
    // resolved.filter(EntityUtils.isLocal).forEach((entity) => (entity.id = undefined));

    // Add remote data that are not yet present on sources data
    mergedSources = arrayDistinct(mergedSources.concat(remoteEntities), 'id');

    // Add unresolved entities
    mergedSources = mergedSources.concat(unresolved);

    console.debug('MYTEST ActivityCalendarUtils.mergeUseFeatures: mergedSources', mergedSources);
    return mergedSources;
  }
}
