import { AppError, arrayDistinct, EntityUtils, isEmptyArray, isNil, isNotEmptyArray, ServerErrorCodes } from '@sumaris-net/ngx-components';
import { ProgramPrivilegeEnum } from '@app/referential/services/model/model.enum';
import { ActivityCalendar } from './model/activity-calendar.model';
import { IUseFeatures, IUseFeaturesUtils } from '@app/activity-calendar/model/use-features.model';
import { Moment } from 'moment';

export class ActivityCalendarUtils {
  static merge(source: ActivityCalendar, remoteEntity: ActivityCalendar): ActivityCalendar {
    const target = remoteEntity.clone();
    EntityUtils.cleanIdAndUpdateDate(target);

    // Check base attributes are equals (without children entities)
    const isSameProperties = source.equals(remoteEntity, { withGearUseFeatures: false, withVesselUseFeatures: false, withMeasurementValues: true });
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
    const { resolved: resolvedVuf, unresolved: unresolvedVuf } = this.mergeUseFeatures(
      source.vesselUseFeatures,
      remoteEntity.vesselUseFeatures,
      writablePeriods
    );

    // Merge GUF
    const { resolved: resolvedGuf, unresolved: unresolvedGuf } = this.mergeUseFeatures(
      source.gearUseFeatures,
      remoteEntity.gearUseFeatures,
      writablePeriods
    );

    // Merge PUF
    const { resolved: resolvedPuf, unresolved: unresolvedPuf } = this.mergeUseFeatures(
      source.gearPhysicalFeatures,
      remoteEntity.gearPhysicalFeatures,
      writablePeriods
    );

    // Cannot merge: throw error
    if (isNotEmptyArray(unresolvedVuf) || isNotEmptyArray(unresolvedGuf)) {
      throw <AppError>{
        code: ServerErrorCodes.BAD_UPDATE_DATE,
        message: 'ERROR.BAD_UPDATE_DATE',
        details: {
          vesselUseFeatures: unresolvedVuf,
          gearUseFeatures: unresolvedGuf,
          physicalUseFeatures: unresolvedPuf,
        },
      };
    }

    target.id = remoteEntity.id;
    target.updateDate = remoteEntity.updateDate;
    target.vesselUseFeatures = resolvedVuf;
    target.gearUseFeatures = resolvedGuf;
    target.gearPhysicalFeatures = resolvedPuf;

    return target;
  }

  static mergeUseFeatures<T extends IUseFeatures<any>>(
    sources: T[],
    remoteEntities: T[],
    writablePeriods: { startDate: Moment; endDate: Moment }[]
  ): { resolved: T[]; unresolved: T[] } {
    const unresolved: T[] = [];
    let localId = 0;

    const mergedSources = sources
      // Keep only source with access right
      .filter((source) => IUseFeaturesUtils.isInPeriods(source, writablePeriods))
      .map((source) => {
        // Has a remote VUF
        const remoteEntity = remoteEntities.find((remoteEntity) =>
          IUseFeaturesUtils.isSame(source, remoteEntity, { withId: true, withMeasurementValues: false })
        );
        // No conflict: we keep the source
        if (!remoteEntity) {
          if (isNil(source.id)) source.id = --localId;
          return source;
        }

        const isSame = IUseFeaturesUtils.isSame(source, remoteEntity, { withId: false, withMeasurementValues: true });
        if (isSame) return remoteEntity; // Same content: kse remote (with a valid update date)

        // Data only changed on local, keep local.
        if (source.updateDate.isSame(remoteEntity.updateDate)) {
          return source;
        }

        // Not same: CONFLICT !
        unresolved.push(source);
        // Keep remote
        return remoteEntity;
      });

    // Add new remote entities
    const resolved = arrayDistinct(mergedSources.concat(remoteEntities), 'id');

    // Clean local id
    resolved.filter(EntityUtils.isLocal).forEach((entity) => (entity.id = undefined));

    return { resolved, unresolved };
  }
}
