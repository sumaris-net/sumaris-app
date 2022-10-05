import { PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { isNotNil } from '@sumaris-net/ngx-components';

function getSortingMeasValues(opts: {
  gearPosition?: 'B'|'T';
  weight?: number;
  discardOrLanding?: 'LAN'|'DIS';
  sizeCategory?: number
}) {

  const res = {};

  if (isNotNil(opts.gearPosition)) {
    res[PmfmIds.BATCH_GEAR_POSITION] = ''+ (opts.gearPosition === 'B' ? QualitativeValueIds.BATCH_GEAR_POSITION.PORT : QualitativeValueIds.BATCH_GEAR_POSITION.STARBOARD); // Bâbord, Tribord
  }
  if (isNotNil(opts.sizeCategory)) {
    res[PmfmIds.TRAWL_SIZE_CAT] = opts.sizeCategory;
  }
  if (isNotNil(opts.discardOrLanding)) {
    res[PmfmIds.DISCARD_OR_LANDING] = opts.discardOrLanding === 'LAN' ? QualitativeValueIds.DISCARD_OR_LANDING.LANDING : QualitativeValueIds.DISCARD_OR_LANDING.DISCARD;
  }
  if (isNotNil(opts.weight)) {
    res[PmfmIds.BATCH_MEASURED_WEIGHT] = opts.weight;
  }

  return res;
}

function getIndivMeasValues(opts?: {
  length?: number;
  discardOrLanding?: 'LAN'|'DIS';
  weight?: number;
}) {
  opts = {
    discardOrLanding: 'LAN',
    ...opts
  }
  const res = {};

  if (isNotNil(opts.discardOrLanding)) {
    res[PmfmIds.DISCARD_OR_LANDING] = opts.discardOrLanding === 'LAN' ? QualitativeValueIds.DISCARD_OR_LANDING.LANDING : QualitativeValueIds.DISCARD_OR_LANDING.DISCARD;
  }
  if (isNotNil(opts.length)) {
    res[PmfmIds.LENGTH_TOTAL_CM] = opts.length;
  }

  // Computed weight, by Weight/Length conversion
  if (isNotNil(opts.weight)) {
    res[PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH] = opts.weight;
  }

  return res;
}

export const BATCH_TREE_EXAMPLES = ['default', 'selectivity', 'empty'];

export function getExampleTree(key: string, programLabel?: string): any {
  const samplingRatioText = (programLabel === 'APASE') ? '1/2' : '50%';
  switch (key) {
    case 'default':
      return {
        label: 'CATCH_BATCH', rankOrder: 1, children: [
          {
            label: 'SORTING_BATCH#1',
            rankOrder: 1,
            taxonGroup: { id: 1122, label: 'MNZ', name: 'Baudroie nca' },
            measurementValues: undefined,
            children: [
              {
                label: 'SORTING_BATCH#1.LAN', rankOrder: 1,
                measurementValues: getSortingMeasValues({ discardOrLanding: 'LAN', weight: 100 }),
                children: [
                  {
                    label: 'SORTING_BATCH#1.LAN.%',
                    rankOrder: 1,
                    samplingRatio: 0.5,
                    samplingRatioText,
                    children: [
                      {
                        label: 'SORTING_BATCH_INDIVIDUAL#1',
                        rankOrder: 1,
                        taxonName: { id: 1033, label: 'MON', name: 'Lophius piscatorius' },
                        measurementValues: getIndivMeasValues({ discardOrLanding: 'LAN', length: 11, weight: 0.026051 }),
                        individualCount: 1
                      },
                      {
                        label: 'SORTING_BATCH_INDIVIDUAL#3',
                        rankOrder: 3,
                        taxonName: { id: 1034, label: 'ANK', name: 'Lophius budegassa' },
                        measurementValues: getIndivMeasValues({ discardOrLanding: 'LAN', length: 33, weight: 0.512244 }),
                        individualCount: 1
                      }
                    ]
                  }
                ]
              },
              {
                label: 'SORTING_BATCH#1.DIS', rankOrder: 2,
                measurementValues: getSortingMeasValues({ discardOrLanding: 'DIS' }),
                children: [
                  {
                    label: 'SORTING_BATCH#1.DIS.%',
                    rankOrder: 1,
                    samplingRatio: 0.5,
                    samplingRatioText,
                    children: [
                      {
                        label: 'SORTING_BATCH_INDIVIDUAL#2',
                        rankOrder: 2,
                        taxonName: { id: 1034, label: 'ANK', name: 'Lophius budegassa' },
                        measurementValues: getIndivMeasValues({ discardOrLanding: 'DIS', length: 22, weight: 0.162100 }),
                        individualCount: 1
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

    case 'selectivity':
      return {
        label: 'CATCH_BATCH', rankOrder: 1, comments:'Selectivity', children: [
          {
            label: 'SORTING_BATCH#B',
            rankOrder: 1,
            measurementValues: getSortingMeasValues({ gearPosition: 'B'}),
            children: [
              {
                label: 'SORTING_BATCH#B.LAN',
                rankOrder: 1,
                measurementValues: getSortingMeasValues({ discardOrLanding: 'LAN' }),
                children: [
                  {
                    label: 'SORTING_BATCH#B.LAN.1',
                    rankOrder: 1,
                    taxonGroup: { id: 1122, label: 'MNZ', name: 'Baudroie nca' },
                    measurementValues: getSortingMeasValues({ sizeCategory: 324 /*10*/, weight: 100 }),
                    children: [
                      {
                        label: 'SORTING_BATCH#B.LAN.1.%',
                        rankOrder: 1,
                        samplingRatio: 0.5,
                        samplingRatioText: '1/2',
                        children: [
                          {
                            label: 'SORTING_BATCH_INDIVIDUAL#1',
                            rankOrder: 1,
                            taxonName: { id: 1033, label: 'MON', name: 'Lophius piscatorius' },
                            measurementValues: getIndivMeasValues({ length: 11, weight: 0.026051 }),
                            individualCount: 1
                          },
                          {
                            label: 'SORTING_BATCH_INDIVIDUAL#3',
                            rankOrder: 3,
                            taxonName: { id: 1034, label: 'ANK', name: 'Lophius budegassa' },
                            measurementValues: getIndivMeasValues({ length: 33, weight: 0.512244 }),
                            individualCount: 1
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                label: 'SORTING_BATCH#B.DIS',
                rankOrder: 2,
                measurementValues: getSortingMeasValues({ discardOrLanding: 'DIS' }),
                children: [
                  {
                    label: 'SORTING_BATCH#B.DIS.1',
                    rankOrder: 1,
                    taxonGroup: { id: 1122, label: 'MNZ', name: 'Baudroie nca' },
                    measurementValues: getSortingMeasValues({ sizeCategory: 319 /*SANS*/ }),
                    children: [
                      {
                        label: 'SORTING_BATCH#B.DIS.1.%',
                        rankOrder: 1,
                        samplingRatio: 0.5,
                        samplingRatioText: '50%',
                        children: [
                          {
                            label: 'SORTING_BATCH_INDIVIDUAL#2',
                            rankOrder: 2,
                            taxonName: { id: 1034, label: 'ANK', name: 'Lophius budegassa' },
                            measurementValues: getIndivMeasValues({ length: 22, weight: 0.162100 }),
                            individualCount: 1
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]

          }
        ]
      };

    case 'empty':
      return { id: 100, label: 'CATCH_BATCH', rankOrder: 1 };
  }

  throw new Error('Unknown key: ' + key);
}
