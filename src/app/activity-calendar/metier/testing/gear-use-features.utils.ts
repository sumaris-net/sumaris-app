import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { MeasurementModelValues } from '@app/data/measurement/measurement.model';
import { Metier } from '@app/referential/metier/metier.model';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { isNotNil } from '@sumaris-net/ngx-components';

export class GearUseFeaturesTestUtils {
  static EXAMPLES = ['default', 'empty'];

  static getExample(key: string): Partial<GearUseFeatures>[] {
    switch (key) {
      case 'default':
        return [
          {
            id: null,
            rankOrder: 1,
            controlDate: undefined,
            qualificationDate: undefined,
            qualificationComments: undefined,
            qualityFlagId: undefined,
            metier: <Metier>{
              id: 1000,
              updateDate: undefined,
              __typename: 'MetierVO',
              label: 'OTBNEP',
              name: 'Chaluts de fond à panneaux (1 Navire) à Langoustine commune',
              description: undefined,
              comments: undefined,
              creationDate: undefined,
              statusId: undefined,
              validityStatusId: undefined,
              levelId: undefined,
              parentId: undefined,
              entityName: 'Metier',
              icon: undefined,
            },

            //measurementValues: this.getMeasurementValues({ label: 'Gear #1', meshSize: 110 }),
          },
        ];

      case 'empty':
        return [];
    }

    throw new Error('Unknown key: ' + key);
  }

  static getMeasurementValues(values: { label?: string; meshSize: number; selectiveDevice?: 'T90' | 'MACAR' }): MeasurementModelValues {
    const result: MeasurementModelValues = {};
    result[PmfmIds.GEAR_LABEL] = values?.label || null;
    result['3'] = isNotNil(values?.meshSize) ? '' + values?.meshSize : null;
    if (values.selectiveDevice) {
      switch (values.selectiveDevice) {
        case 'T90':
          result['4'] = '36';
          break;
        case 'MACAR':
          result['4'] = '10';
          break;
      }
    }

    return result;
  }
}
