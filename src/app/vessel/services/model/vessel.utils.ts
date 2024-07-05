import { DateUtils, equals, IEntity, isNotEmptyArray, lastArrayValue, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { Moment, unitOfTime } from 'moment/moment';
import { VesselFeatures } from './vessel.model';

export interface IVesselPeriodEntity<T extends IEntity<T> = IEntity<any>> extends IEntity<T> {
  vesselId: number;
  startDate: Moment;
  endDate?: Moment;
}

export class VesselFeaturesUtils {
  static reduceVesselFeatures(vesselFeatures: VesselFeatures[], opts?: { fillHighlightedProperties?: boolean }): VesselFeatures[] {
    return vesselFeatures.reduce(
      (res, current) => {
        let previous = lastArrayValue(res);

        // If contiguous AND same content
        const canMerge =
          previous &&
          VesselFeaturesUtils.isContiguousPeriod(previous, current, 24, 'hours') &&
          VesselFeatures.equals(previous, current, { withId: false, withDates: false });
        // Merge: keep previous with an extended period
        if (canMerge) {
          previous = previous.clone(); // Keep original item unchanged
          previous.startDate = DateUtils.min(previous.startDate, current.startDate);
          previous.endDate = DateUtils.max(previous.endDate, current.endDate);
          return res
            .slice(0, res.length - 1) // remove previous
            .concat(previous); // Reinsert previous
        }

        // previous != current
        if (previous && opts?.fillHighlightedProperties) {
          let highlightedProperties = Object.keys(current)
            .filter((key) => !['id', 'startDate', 'endDate', 'creationDate', 'updateDate', 'recorderPerson', 'recorderDepartment'].includes(key))
            .filter((key) => !equals(previous[key], current[key]));
          if (isNotEmptyArray(highlightedProperties)) {
            highlightedProperties = removeDuplicatesFromArray([...(current.__highlightedProperties || []), ...highlightedProperties]);
            current = current.clone();
            current.__highlightedProperties = highlightedProperties;
            console.log('TODO __highlightedProperties=', highlightedProperties);
          }
        }

        return res.concat(current);
      },
      <VesselFeatures[]>[]
    );
  }

  static isContiguousPeriod(o1: IVesselPeriodEntity, o2: IVesselPeriodEntity, maxDelta: number = 24, deltaUnit: unitOfTime.Base = 'hours') {
    return (
      (o1.endDate && DateUtils.moment.duration(o1.endDate.diff(o2.startDate)).abs().as(deltaUnit) <= maxDelta) ||
      (o2.endDate && DateUtils.moment.duration(o1.startDate.diff(o2.endDate)).abs().as(deltaUnit) <= maxDelta)
    );
  }
}
