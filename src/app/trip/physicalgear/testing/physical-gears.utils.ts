import { MeasurementModelValues } from '@app/trip/services/model/measurement.model';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { isNotNil, ReferentialRef } from '@sumaris-net/ngx-components';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';

export class PhysicalGearTestUtils {
  static EXAMPLES = ['default', 'empty'];

  static getExample(key: string): Partial<PhysicalGear>[] {
    switch (key) {
      case 'default':
        return [{
          id: null,
          rankOrder: 1,
          gear: <ReferentialRef>{ id: 7, label: 'OTT', name: 'Chaluts jumeaux à panneaux', __typename: 'ReferentialVO', entityName: 'Gear' },
          measurementValues: this.getMeasurementValues({label: 'Gear #1', meshSize: 110}),
          children: <PhysicalGear[]>[{
            id: null,
            rankOrder: 1,
            gear: <ReferentialRef>{ id: 7, label: 'OTT', name: 'Chaluts jumeaux à panneaux', __typename: 'ReferentialVO', entityName: 'Gear' },
            measurementValues: this.getMeasurementValues({label: 'Chalut sélectif mailles carrées', meshSize: 110, selectiveDevice: 'MACAR'})
          },
          {
            id: null,
            rankOrder: 2,
            gear: <ReferentialRef>{ id: 7, label: 'OTT', name: 'Chaluts jumeaux à panneaux', __typename: 'ReferentialVO', entityName: 'Gear' },
            measurementValues: this.getMeasurementValues({label: 'Chalut sélectif T90', meshSize: 150, selectiveDevice: 'T90'}),
          }]
        }];

      case 'empty':
        return [];
    }

    throw new Error('Unknown key: ' + key);
  }


  static getMeasurementValues(values: { label?: string, meshSize: number; selectiveDevice?: 'T90'|'MACAR' }): MeasurementModelValues {
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
