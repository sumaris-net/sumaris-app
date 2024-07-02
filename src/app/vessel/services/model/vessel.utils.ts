import { DateUtils, IEntity, equals } from '@sumaris-net/ngx-components';
import { Moment } from 'moment/moment';
import { VesselFeatures } from './vessel.model';
// import _ from 'lodash';

export interface IVesselPeriodEntity<T extends IEntity<T> = IEntity<any>> extends IEntity<T> {
  vesselId: number;
  startDate: Moment;
  endDate?: Moment;
}

export class VesselUtils {
  static mergeContiguousVesselFeature(vesselFeatures: VesselFeatures[]) {
    return vesselFeatures.reduce((accumulator, vesselFeature) => {
      const contiguousItems = [];

      const filteredVesselFeatures = vesselFeatures.filter((vf) => vf.id != vesselFeature.id);
      const vesselClone = vesselFeature.clone();
      delete vesselClone.id;
      delete vesselClone.startDate;
      delete vesselClone.endDate;

      filteredVesselFeatures.filter((vf) => {
        // Check if all non-id, startDate, endDate properties match
        const vfClone = vf.clone();
        delete vfClone.id;
        delete vfClone.startDate;
        delete vfClone.endDate;
        const result = equals(vesselClone, vfClone);
        // var result = _.isEqual(_.omit(vesselFeature, ['id', 'startDate', 'endDate']), _.omit(vf, ['id', 'startDate', 'endDate']));
        return result;
      });

      // Check if the date range is contiguous + 1 day
      for (const vf of filteredVesselFeatures) {
        if (vesselFeature.endDate.isSame(vf.startDate) || vesselFeature.endDate.clone().add(1, 'days').isSame(vf.startDate)) {
          contiguousItems.push(vf);
        }
      }

      // If there are contiguous items, update the original feature
      if (contiguousItems.length > 0) {
        const maxEndDate = contiguousItems.reduce((max, item) => (item.endDate > max ? item.endDate : max), vesselFeature.endDate);
        vesselFeature.endDate = maxEndDate;
      }

      // check if data is not already in the accumulator with a bigger end date
      const accumulatorItem = accumulator.filter((vf) => {
        // var result = _.isEqual(_.omit(vesselFeature, ['id', 'startDate', 'endDate']), _.omit(vf, ['id', 'startDate', 'endDate']));
        const vfClone = vf.clone();
        delete vfClone.id;
        delete vfClone.startDate;
        delete vfClone.endDate;
        const result = equals(vesselClone, vfClone);
        return result;
      });
      if (accumulatorItem.length > 0) {
        for (const item of accumulatorItem) {
          if (
            DateUtils.moment(vesselFeature.startDate).isSameOrAfter(item.startDate) &&
            DateUtils.moment(vesselFeature.endDate).isSameOrBefore(item.endDate)
          ) {
            return accumulator;
          }
        }
      }

      accumulator.push(vesselFeature);
      return accumulator;
    }, []);
  }
}
