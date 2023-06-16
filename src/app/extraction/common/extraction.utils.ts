/* -- Extraction -- */

import { arraySize, isEmptyArray, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, isNotNilOrBlank } from '@sumaris-net/ngx-components';
import { CRITERION_OPERATOR_LIST, ExtractionColumn, ExtractionFilter, ExtractionFilterCriterion, ExtractionType } from '../type/extraction-type.model';
import { Moment } from 'moment';

export const SPATIAL_COLUMNS: string[] = [
  //'area', FIXME no area geometries in Pod
  'statistical_rectangle',
  //'sub_polygon', FIXME no sub_polygon in Pod
  'square'
];
export const TIME_COLUMNS:   string[] = ['year', 'quarter', 'month'];
export const IGNORED_COLUMNS:   string[] = ['record_type'];

export const DEFAULT_CRITERION_OPERATOR = '=';

export class ExtractionUtils {

  static dispatchColumns(columns: ExtractionColumn[]): {
    timeColumns: ExtractionColumn[];
    spatialColumns: ExtractionColumn[];
    aggColumns: ExtractionColumn[];
    techColumns: ExtractionColumn[];
    criteriaColumns: ExtractionColumn[];
  } {

    const timeColumns = columns.filter(c => TIME_COLUMNS.includes(c.columnName));
    const spatialColumns = columns.filter(c => SPATIAL_COLUMNS.includes(c.columnName));

    // Aggregation columns (numeric columns)
    const aggColumns = columns.filter(c =>
      (!c.type || c.type === 'integer' || c.type === 'double')
      && (c.columnName.endsWith('_count')
      || c.columnName.indexOf('_count_by_') !== -1
      || c.columnName.endsWith('_time')
      || c.columnName.endsWith('weight')
      || c.columnName.endsWith('_length')
      || c.columnName.endsWith('_value')));

    const excludedFilterColumns = spatialColumns
      .concat(timeColumns);

    const techColumns = columns.filter(c => !excludedFilterColumns.includes(c)
      && !IGNORED_COLUMNS.includes(c.columnName)
      && (c.type === 'string' || (c.columnName.endsWith('_class')))
    );
    const criteriaColumns = columns.filter(c => !excludedFilterColumns.includes(c)
      && !IGNORED_COLUMNS.includes(c.columnName));

    return {
      timeColumns,
      spatialColumns,
      aggColumns,
      techColumns,
      criteriaColumns
    };
  }

  static asQueryParams(type: ExtractionType, filter?: ExtractionFilter): any {
    const queryParams: any = {
      category: type && type.category,
      label: type && type.label
    };
    if (filter.sheetName) {
      queryParams.sheet = filter.sheetName;
    }
    if (isNotEmptyArray(filter.criteria)) {
      queryParams.q = this.asCriteriaQueryString(filter.criteria);
    }

    const metaProperties = filter?.meta && Object.entries(filter.meta);
    if (isNotEmptyArray(metaProperties)) {
      queryParams.meta = metaProperties
        .filter(([key, value]) => isNotNil(value))
        .map(([key, value]) => `${key}:${value}`).join(';');
    }
    return queryParams;
  }

  static asCriteriaQueryString(criteria: ExtractionFilterCriterion[]): string {
    if (isEmptyArray(criteria)) return undefined;
    return criteria.reduce((res, criterion) => {
      if (isNilOrBlank(criterion.name)) return res; // Skip if no value or no name
      let value = criterion.value || '';
      let operator = criterion.operator || '=';
      let sheetNamePrefix = criterion.sheetName ? `${criterion.sheetName}:` : '';
      if (isNotNilOrBlank(criterion.endValue)) {
        value += `:${criterion.endValue}`;
      } else if (isNotEmptyArray(criterion.values)) {
        value = criterion.values.join(',');
      }
      return res.concat(`${sheetNamePrefix}${criterion.name}${operator}${value}`);
    }, []).join(";");
  }

  static parseCriteriaFromString(q: string, defaultSheetName?: string): ExtractionFilterCriterion[] {
    const criteria = (q||'').split(';');
    const operationRegexp = new RegExp('(' + CRITERION_OPERATOR_LIST.map(co => co.symbol)
      .map(symbol => symbol.replace(/\\!/, '\\\\!'))
      .join('|') + ')');
    return criteria
      .filter(isNotNilOrBlank)
      .map(criterion => {
        const matches = operationRegexp.exec(criterion);
        const operator = matches && matches[0];
        if (!operator) return;
        const fieldNameParts = criterion.substring(0, matches.index).split(':', 2);
        const sheetName = fieldNameParts.length > 1 ? fieldNameParts[0] : defaultSheetName;
        const name = fieldNameParts.length > 1 ? fieldNameParts[1] : fieldNameParts[0];
        const value = criterion.substring(matches.index + operator.length);
        let values = value.split(':', 2);
        if (values.length === 2) {
          return {sheetName, name, operator, value: values[0], endValue: values[1]};
        }
        else {
          values = value.split(',');
          if (values.length > 1) {
            return {sheetName, name, operator, values};
          }
          return {sheetName, name, operator, value};
        }
      })
      .filter(isNotNilOrBlank)
      .map(ExtractionFilterCriterion.fromObject);
  }

  static parseMetaString(meta: string): any {
    if (isNilOrBlank(meta)) return undefined;
    return meta.split(';')
      .reduce((res, prop) => {
        const parts = prop.split(':');
        const key = parts[0];
        let value: any = parts[1];
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        return {
          ...res,
          [key]: value
        };
      }, {});
  }

  static filterWithValues(columns: ExtractionColumn[], opts?: {allowNullValuesOnNumeric?: boolean}) {
    return this.filterMinValuesCount(columns, 1, opts);
  }

  static filterMinValuesCount(columns: ExtractionColumn[], minSize: number, opts?: {allowNullValuesOnNumeric?: boolean}) {
    const allowNullValuesOnNumeric = opts?.allowNullValuesOnNumeric === true;
    return (columns || []).filter(c =>
      // No values computed = numeric columns
      (allowNullValuesOnNumeric === true && ExtractionColumn.isNumeric(c) && isNil(c.values))
      // If values, check count
      || arraySize(c.values) >= minSize);
  }

  static createTripFilter(programLabel: string, tripIds?: number[]): ExtractionFilter {
    const filter = new ExtractionFilter();
    filter.sheetName = 'TR';
    const criteria: Partial<ExtractionFilterCriterion>[] = [
      {
        sheetName: 'TR',
        name: 'project',
        operator: '=',
        value: programLabel
      }
    ];

    const tripIdsStr = (tripIds || [])
      .filter(isNotNil)
      .map(id => id.toString());
    if (isNotEmptyArray(tripIdsStr)) {
      criteria.push({
          sheetName: 'TR',
          name: 'trip_code',
          operator: '=',
          value: tripIdsStr.length == 1 ? tripIdsStr[0] : undefined,
          values: tripIdsStr.length > 1 ? tripIdsStr : undefined
        });
    }

    filter.criteria = criteria.map(ExtractionFilterCriterion.fromObject);

    return filter;
  }
}

