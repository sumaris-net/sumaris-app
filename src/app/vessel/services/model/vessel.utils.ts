import { DateUtils, IEntity, equals, isNotNil } from '@sumaris-net/ngx-components';
import { Moment } from 'moment/moment';
import { VesselFeatures } from './vessel.model';

export interface IVesselPeriodEntity<T extends IEntity<T> = IEntity<any>> extends IEntity<T> {
  vesselId: number;
  startDate: Moment;
  endDate?: Moment;
}

export class VesselUtils {
  static mergeContiguousVesselFeatures(vesselFeatures: VesselFeatures[]) {
    return vesselFeatures.reduce((accumulator, vesselFeature) => {
      const filteredVesselFeatures = vesselFeatures.filter((vf) => vf.id != vesselFeature.id);

      const vesselClone = vesselFeature.clone();
      const duplicateVesselFeatures = this.getDuplicateVesselFeatures(vesselClone, filteredVesselFeatures);
      const contiguousItems = this.getContiguousVesselFeatures(vesselFeature, duplicateVesselFeatures);

      // If there are contiguous items, update the original feature
      if (contiguousItems.length > 0) {
        const maxEndDate = contiguousItems.reduce((max, item) => (item.endDate > max ? item.endDate : max), vesselFeature.endDate);
        const minStartDate = contiguousItems.reduce((min, item) => (item.startDate < min ? item.startDate : min), vesselFeature.startDate);
        vesselFeature.startDate = minStartDate;
        vesselFeature.endDate = maxEndDate;
      }

      // check if data is not already in the accumulator with a bigger end date
      const accumulatorItem = this.getDuplicateVesselFeatures(vesselClone, accumulator);

      if (accumulatorItem.length > 0) {
        for (const item of accumulatorItem) {
          if (
            DateUtils.moment(vesselFeature.startDate).isSameOrAfter(item.startDate) &&
            DateUtils.moment(vesselFeature.endDate).isSameOrBefore(item.endDate)
          ) {
            //if the data is already in the accumulator with a bigger end date, we remove it
            accumulator.splice(accumulator.indexOf(item), 1);
            return accumulator;
          }
        }
      }
      accumulator.push(vesselFeature);
      return accumulator;
    }, []);
  }

  static getDuplicateVesselFeatures(vesselClone: VesselFeatures, vesselFeatures: VesselFeatures[]): VesselFeatures[] {
    delete vesselClone.id;
    delete vesselClone.startDate;
    delete vesselClone.endDate;
    delete vesselClone.updateDate;

    // Check if there are vessel features that have the same values as the current vesselFeature
    const duplicateVesselFeatures = vesselFeatures.filter((vf) => {
      const vfClone = vf.clone();
      delete vfClone.id;
      delete vfClone.startDate;
      delete vfClone.endDate;
      delete vfClone.updateDate;
      return equals(vesselClone, vfClone);
    });

    return duplicateVesselFeatures;
  }

  static getContiguousVesselFeatures(vesselFeature: VesselFeatures, duplicateVesselFeatures: VesselFeatures[]): VesselFeatures[] {
    // Check if there are identical vessel features that are contiguous
    const contiguousItems = [];
    if (isNotNil(vesselFeature.endDate) && isNotNil(vesselFeature.startDate)) {
      duplicateVesselFeatures.forEach((vf) => {
        if (
          vesselFeature.endDate.isSame(vf.startDate) ||
          vesselFeature.endDate.clone().add(1, 'days').isSame(vf.startDate) ||
          vesselFeature.startDate.isSame(vf.endDate) ||
          vesselFeature.startDate.clone().add(1, 'days').isSame(vf.endDate)
        ) {
          contiguousItems.push(vf);
        }
      });
    }
    return contiguousItems;
  }
}
