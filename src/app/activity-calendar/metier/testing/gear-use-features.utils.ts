import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { Metier } from '@app/referential/metier/metier.model';

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
}
