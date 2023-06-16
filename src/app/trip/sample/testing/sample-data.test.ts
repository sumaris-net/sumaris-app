import { DateUtils, isNotNil, toDateISOString } from '@sumaris-net/ngx-components';
import { PmfmIds } from '../../../referential/services/model/model.enum';
import { Moment } from 'moment';

export function getMeasValues(opts?: {
  totalLength?: number;
  sex?: 'M'|'F';
  weight?: number;
  tagId: string;
}) {
  opts = {
    tagId: 'TAG-1',
    ...opts
  }
  const res = {};

  res[PmfmIds.TAG_ID] = opts.tagId;
  res[PmfmIds.IS_DEAD] = 1;
  if (isNotNil(opts.totalLength)) {
    res[PmfmIds.LENGTH_TOTAL_CM] = opts.totalLength;
  }
  if (isNotNil(opts.sex)) {
    res[PmfmIds.SEX] = opts.sex === 'M' ? 185 : 186;
  }
  if (isNotNil(opts.weight)) {
    res[PmfmIds.SAMPLE_MEASURED_WEIGHT] = opts.weight;
  }
  return res;
}

export function getMonitoringMeasValues(opts?: {
  tagId: string;
  dateTime?: string;
}) {
  opts = {
    tagId: 'TAG-1',
    ...opts
  }
  const res = {};

  res[PmfmIds.TAG_ID] = opts.tagId;
  if (isNotNil(opts.dateTime)) {
    res[PmfmIds.MEASURE_TIME] = opts.dateTime;
  }
  return res;
}

export function getReleaseMeasValues(opts?: {
  tagId: string;
  latitude?: number;
  longitude?: number;
  dateTime?: string|Moment;
}) {
  opts = {
    tagId: 'TAG-1',
    ...opts
  }
  const res = {};

  res[PmfmIds.TAG_ID] = opts.tagId;
  if (isNotNil(opts.latitude)) {
    res[PmfmIds.RELEASE_LATITUDE] = opts.latitude;
  }
  if (isNotNil(opts.longitude)) {
    res[PmfmIds.RELEASE_LONGITUDE] = opts.longitude;
  }
  if (isNotNil(opts.dateTime)) {
    res[PmfmIds.MEASURE_TIME] = toDateISOString(opts.dateTime);
  }
  return res;
}
export const SAMPLE_TREE_EXAMPLES: {[key: string]: any} = {
  'default': [{
    label: 'SAMPLE#1', rankOrder: 1,
    sampleDate: DateUtils.moment(),
    taxonGroup: { id: 1122, label: 'MNZ', name: 'Baudroie nca' },
    taxonName: { id: 1034, label: 'ANK', name: 'Lophius budegassa' },
    measurementValues: getMeasValues({ tagId: 'TAG-1', totalLength: 100, sex: 'M' }),
    children: [
      {
        label: 'INDIVIDUAL_MONITORING#1',
        rankOrder: 1,
        sampleDate: DateUtils.moment(),
        measurementValues: getMonitoringMeasValues({ tagId: 'TAG-1' }),
      },
      {
        label: 'INDIVIDUAL_RELEASE#1',
        rankOrder: 1,
        sampleDate: DateUtils.moment(),
        measurementValues: getReleaseMeasValues({ tagId: 'TAG-1', latitude: 11, longitude: 11, dateTime: DateUtils.moment() }),
      }
    ]
  }],

  // No data
  'empty': [{id: 100, label: 'CATCH_BATCH', rankOrder: 1}],

  'SIH-OBSBIO': [{
    label: 'SAMPLE#1', rankOrder: 1,
    sampleDate: DateUtils.moment(),
    measurementValues: getMeasValues({ tagId: '20LEUCCIR001-001'}),
    children: []
  }],
};

export function getExampleTree(key: string, programLabel?: string): any {
  key = programLabel && Object.keys(SAMPLE_TREE_EXAMPLES).includes(programLabel) ? programLabel : key;
  return SAMPLE_TREE_EXAMPLES[key];
}
