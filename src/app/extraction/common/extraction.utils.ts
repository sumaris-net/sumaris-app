/* -- Extraction -- */

import {arraySize, isNotEmptyArray} from "@sumaris-net/ngx-components";
import {ExtractionColumn, ExtractionFilter, ExtractionType} from "../type/extraction-type.model";
import {ExtractionProduct} from "../product/product.model";

export const SPATIAL_COLUMNS: string[] = [
  //'area', FIXME no area geometries in Pod
  'statistical_rectangle',
  //'sub_polygon', FIXME no sub_polygon in Pod
  'square'
];
export const TIME_COLUMNS:   string[] = ['year', 'quarter', 'month'];
export const IGNORED_COLUMNS:   string[] = ['record_type'];

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
      queryParams.q = filter.criteria.reduce((res, criterion) => {
        if (criterion.endValue) {
          return res.concat(`${criterion.name}${criterion.operator}${criterion.value}:${criterion.endValue}`);
        } else {
          return res.concat(`${criterion.name}${criterion.operator}${criterion.value}`);
        }
      }, []).join(";");
    }
    return queryParams;
  }

  static filterWithValues(columns: ExtractionColumn[]) {
    return this.filterValuesMinSize(columns, 1);
  }

  static filterValuesMinSize(columns: ExtractionColumn[], minSize: number) {
    return (columns || []).filter(c => arraySize(c.values) >= minSize);
  }
}

