/* -- Extraction -- */

import { BaseReferential, capitalizeFirstLetter, Department, Entity, EntityAsObjectOptions, EntityClass, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, Person } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { TranslateService } from '@ngx-translate/core';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

export declare type ExtractionCategoryType = 'PRODUCT' | 'LIVE';
export const ExtractionCategories = {
  PRODUCT: 'PRODUCT',
  LIVE: 'LIVE',
};

export type ExtractionCacheDurationType = 'short'|'default'|'medium'|'long'|'eternal';

@EntityClass({typename: 'ExtractionTypeVO'})
export class ExtractionType<
  T extends ExtractionType<T> = ExtractionType<any>,
  >
  extends BaseReferential<T> {

  static fromObject: (source: any, opts?: any) => ExtractionType;
  static equals(o1: ExtractionType, o2: ExtractionType): boolean {
    return o1 && o2 ? o1.label === o2.label && o1.format === o2.format && o1.version === o2.version : o1 === o2;
  }

  format: string = null;
  version: string = null;
  sheetNames: string[] = null;
  isSpatial: boolean = null;
  docUrl: string = null;

  recorderPerson: Person = null;
  recorderDepartment: Department = null;

  constructor(__typename?: string) {
    super(__typename || ExtractionType.TYPENAME);
    this.recorderDepartment = null;
  }

  fromObject(source: any, opts?: EntityAsObjectOptions) {
    super.fromObject(source, opts);
    this.format = source.format;
    this.version = source.version;
    this.sheetNames = source.sheetNames;
    this.isSpatial = source.isSpatial;
    this.docUrl = source.docUrl;
    this.recorderPerson = source.recorderPerson && Person.fromObject(source.recorderPerson) || null;
    this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target = super.asObject({...options, ...NOT_MINIFY_OPTIONS});
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(options) || undefined;
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(options) || undefined;
    return target;
  }

  get category(): ExtractionCategoryType {
    return (isNil(this.id) || this.id < 0) ? 'LIVE' : 'PRODUCT';
  }
}

export class ExtractionResult {

  static fromObject(source: any): ExtractionResult {
    if (!source || source instanceof ExtractionResult) return source;
    const target = new ExtractionResult();
    target.fromObject(source);
    return target;
  }

  columns: ExtractionColumn[];
  rows: ExtractionRow[];
  total: number;

  fromObject(source: any): ExtractionResult {
    this.total = source.total;
    this.columns = source.columns && source.columns.map(ExtractionColumn.fromObject) || null;
    this.rows = source.rows && source.rows.slice() || null;
    return this;
  }
}


export class ExtractionColumn {
  static fromObject(source: any): ExtractionColumn {
    if (!source || source instanceof ExtractionColumn) return source;
    const target = new ExtractionColumn();
    target.fromObject(source);
    return target;
  }

  id: number;
  creationDate: Moment;
  index?: number;
  label: string;
  name: string;
  columnName: string;
  type: string;
  description?: String;
  rankOrder: number;
  values?: string[];

  fromObject(source: any): ExtractionColumn {
    this.id = source.id;
    this.creationDate = source.creationDate;
    this.index = source.index;
    this.label = source.label;
    this.name = source.name;
    this.columnName = source.columnName;
    this.type = source.type;
    this.description = source.description;
    this.rankOrder = source.rankOrder;
    this.values = source.values && source.values.slice();
    return this;
  }
}

export class ExtractionRow extends Array<any> {
  constructor(...items: any[]) {
    super(...items);
  }
}

export class ExtractionFilter {
  searchText?: string;
  criteria?: ExtractionFilterCriterion[];
  sheetName?: string;
}

export declare type CriterionOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'BETWEEN' | 'NULL' | 'NOT NULL';

export class ExtractionFilterCriterion extends Entity<ExtractionFilterCriterion> {

  static fromObject(source: any): ExtractionFilterCriterion {
    const res = new ExtractionFilterCriterion();
    res.fromObject(source);
    return res;
  }

  static isNotEmpty(criterion: ExtractionFilterCriterion): boolean {
    return criterion && (
      isNotNilOrBlank(criterion.value)
      || isNotEmptyArray(criterion.values)
      || criterion.operator === 'NULL'
      || criterion.operator === 'NOT NULL');
  }

  name?: string;
  operator: CriterionOperator;
  value?: string;
  values?: string[];
  endValue?: string;
  sheetName?: string;

  constructor() {
    super();
  }

  fromObject(source: any): ExtractionFilterCriterion {
    super.fromObject(source);
    this.name = source.name;
    this.operator = source.operator;
    this.value = source.value;
    this.endValue = source.endValue;
    this.sheetName = source.sheetName;
    return this;
  }

  asObject(options?: EntityAsObjectOptions): any {
    return super.asObject(options);
  }
}

export class ExtractionTypeUtils {
  static computeI18nName<T extends ExtractionType = ExtractionType>(
    translate: TranslateService,
    type: T | undefined): T | undefined {
    if (isNil(type)) return undefined;
    if (type.name) return type; // Skip if already has a name

    // Get format, from label
    const format = type.label && type.label.split('-')[0].toUpperCase();

    let key = `EXTRACTION.${type.category || 'LIVE'}.${format}.TITLE`.toUpperCase();
    let name = translate.instant(key, type);

    // No I18n translation
    if (name === key) {
      // Use name, or label (but replace underscore with space)
      key = type.name || (format && format.replace(/[_-]+/g, " ").toUpperCase());
      // First letter as upper case
      name = capitalizeFirstLetter(key.toLowerCase());
    }

    if (typeof type.clone === 'function') {
      type = type.clone() as T;
    }

    type.name = name;

    return type;
  }

  static minify(type: ExtractionType): any {
    return {
      id: type.id,
      label: type.label,
      //category: type.category,
      format: type.format,
      version: type.version
    };
  }

  static isProduct(type: ExtractionType): boolean {
    return isNotNil(type.id) && type.id >= 0;
  }
}
