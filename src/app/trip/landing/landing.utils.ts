import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Landing } from './landing.model';
import { StatusIds, isNotNil, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';

export class LandingUtils {
  // Merge landings and divider values
  static injectDividerLines(landings: Landing[], dividerPmfm: IPmfm): Landing[] {
    const dividerValues =
      dividerPmfm?.qualitativeValues ||
      removeDuplicatesFromArray(
        landings.map((landing) => landing.measurementValues?.[dividerPmfm.id] || QualitativeValueIds.SPECIES_LIST_ORIGIN.UNK).filter(isNotNil)
      );

    if (dividerPmfm.id === PmfmIds.SPECIES_LIST_ORIGIN) {
      // Put UNK value at the beginning (if present)
      const unkValueIndex = dividerValues.findIndex((qv) => PmfmValueUtils.equals(qv, QualitativeValueIds.SPECIES_LIST_ORIGIN.UNK));
      if (unkValueIndex !== -1) {
        const unkValue = dividerValues.splice(unkValueIndex, 1)[0];
        dividerValues.unshift(unkValue);
      }

      // Put random value at the end (if present)
      const randomValueIndex = dividerValues.findIndex((qv) => PmfmValueUtils.equals(qv, QualitativeValueIds.SPECIES_LIST_ORIGIN.RANDOM));
      if (randomValueIndex !== -1) {
        const randomValue = dividerValues.splice(randomValueIndex, 1)[0];
        dividerValues.push(randomValue);
      }
    }

    // Merge landings and divider values
    const result = dividerValues.reduce((acc, dividerValue) => {
      const divider = Landing.fromObject({
        measurementValues: { [dividerPmfm.id]: dividerValue },
      });
      DataEntityUtils.markAsDivider(divider);
      const realLandings = landings.filter((landing: Landing) =>
        PmfmValueUtils.equals(landing.measurementValues?.[dividerPmfm.id] || QualitativeValueIds.SPECIES_LIST_ORIGIN.UNK, dividerValue)
      );
      // Hide unknown divider value
      if (dividerValue.id === QualitativeValueIds.SPECIES_LIST_ORIGIN.UNK) {
        return acc.concat(landings);
      }
      // Hide disabled divider value, if has no landing
      if (dividerValue?.statusId === StatusIds.DISABLE && !realLandings.length) {
        return acc;
      }
      return acc.concat([divider, ...realLandings]);
    }, []);

    return result;
  }
}
