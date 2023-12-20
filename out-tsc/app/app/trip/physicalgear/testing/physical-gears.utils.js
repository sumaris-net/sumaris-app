import { PmfmIds } from '@app/referential/services/model/model.enum';
import { isNotNil } from '@sumaris-net/ngx-components';
export class PhysicalGearTestUtils {
    static getExample(key) {
        switch (key) {
            case 'default':
                return [{
                        id: null,
                        rankOrder: 1,
                        gear: { id: 7, label: 'OTT', name: 'Chaluts jumeaux à panneaux', __typename: 'ReferentialVO', entityName: 'Gear' },
                        measurementValues: this.getMeasurementValues({ label: 'Gear #1', meshSize: 110 }),
                        children: [{
                                id: null,
                                rankOrder: 1,
                                gear: { id: 7, label: 'OTT', name: 'Chaluts jumeaux à panneaux', __typename: 'ReferentialVO', entityName: 'Gear' },
                                measurementValues: this.getMeasurementValues({ label: 'Chalut sélectif mailles carrées', meshSize: 110, selectiveDevice: 'MACAR' })
                            },
                            {
                                id: null,
                                rankOrder: 2,
                                gear: { id: 7, label: 'OTT', name: 'Chaluts jumeaux à panneaux', __typename: 'ReferentialVO', entityName: 'Gear' },
                                measurementValues: this.getMeasurementValues({ label: 'Chalut sélectif T90', meshSize: 150, selectiveDevice: 'T90' }),
                            }]
                    }];
            case 'empty':
                return [];
        }
        throw new Error('Unknown key: ' + key);
    }
    static getMeasurementValues(values) {
        const result = {};
        result[PmfmIds.GEAR_LABEL] = (values === null || values === void 0 ? void 0 : values.label) || null;
        result['3'] = isNotNil(values === null || values === void 0 ? void 0 : values.meshSize) ? '' + (values === null || values === void 0 ? void 0 : values.meshSize) : null;
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
PhysicalGearTestUtils.EXAMPLES = ['default', 'empty'];
//# sourceMappingURL=physical-gears.utils.js.map