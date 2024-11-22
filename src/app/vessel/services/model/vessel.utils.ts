import { DateUtils, equals, IEntity, isNotEmptyArray, lastArrayValue, ReferentialRef, ReferentialUtils } from '@sumaris-net/ngx-components';
import { Moment, unitOfTime } from 'moment';
import { VesselFeatures } from './vessel.model';

export interface IVesselPeriodEntity<T extends IEntity<T> = IEntity<any>> extends IEntity<T> {
  vesselId: number;
  startDate: Moment;
  endDate?: Moment;
}

export class VesselFeaturesUtils {
  static CHANGES_IGNORED_PROPERTIES = [
    'id',
    'startDate',
    'endDate',
    'creationDate',
    'updateDate',
    'recorderPerson',
    'recorderDepartment',
    '__changedProperties',
  ];

  static mergeAll(sources: VesselFeatures[], excludedProperties?: string[]): VesselFeatures[] {
    // Function to clean ignored properties
    const cloneAndSanitize = (source: VesselFeatures) =>
      source &&
      (excludedProperties || []).reduce((res, key) => {
        delete res[key];
        return res;
      }, source.clone());

    return (sources || []).reduce(
      (res, current) => {
        // Keep original items unchanged
        let previous = lastArrayValue(res);
        current = cloneAndSanitize(current);

        // If contiguous AND same content
        const canMerge =
          previous &&
          VesselFeaturesUtils.isContiguousPeriod(previous, current, 24, 'hours') &&
          VesselFeatures.equals(previous, current, { withId: false, withDates: false });

        // Merge: keep previous item, with an extended period
        if (canMerge) {
          previous.startDate = DateUtils.min(previous.startDate, current.startDate);
          previous.endDate = DateUtils.max(previous.endDate, current.endDate);
          res[res.length - 1] = previous;
          return res;
        }

        return res.concat(current);
      },
      <VesselFeatures[]>[]
    );
  }

  static isContiguousPeriod(o1: IVesselPeriodEntity, o2: IVesselPeriodEntity, maxDelta: number = 24, deltaUnit: unitOfTime.Base = 'hours') {
    return (
      (o1.endDate && DateUtils.diffAbs(o1.endDate, o2.startDate, deltaUnit) <= maxDelta) ||
      (o2.endDate && DateUtils.diffAbs(o1.startDate, o2.endDate, deltaUnit) <= maxDelta)
    );
  }

  static fillChangedProperties(sources: VesselFeatures[], excludedProperties?: string[]) {
    excludedProperties = excludedProperties || this.CHANGES_IGNORED_PROPERTIES;
    return (sources || []).reduce(
      (res, current) => {
        const previous = lastArrayValue(res);
        // previous != current
        if (previous) {
          const changedProperties = Object.keys(current).filter((key) => {
            const isReferentialRef = previous[key] instanceof ReferentialRef && current[key] instanceof ReferentialRef;
            const isEqual = isReferentialRef ? ReferentialUtils.equals(previous[key], current[key]) : equals(previous[key], current[key]);
            return !excludedProperties.includes(key) && !isEqual;
          });
          if (isNotEmptyArray(changedProperties)) {
            current = current.clone();
            current.__changedProperties = changedProperties;

            // DEBUG
            console.debug('[vessel-features-utils] Detect changed properties:', changedProperties);
          }
        }
        return res.concat(current);
      },
      <VesselFeatures[]>[]
    );
  }
}
