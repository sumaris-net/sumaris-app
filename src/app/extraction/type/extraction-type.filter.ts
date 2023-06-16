import { EntityAsObjectOptions, EntityClass, FilterFn, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from '@app/referential/services/filter/referential.filter';
import { ExtractionCategoryType, ExtractionType } from '@app/extraction/type/extraction-type.model';
import { isNonEmptyArray } from '@apollo/client/utilities';

@EntityClass({typename: 'ExtractionTypeFilterVO'})
export class ExtractionTypeFilter extends BaseReferentialFilter<ExtractionTypeFilter, ExtractionType> {

  static fromObject: (source: any, opts?: any) => ExtractionTypeFilter;
  static fromType(source: ExtractionType): ExtractionTypeFilter {
    source = ExtractionType.fromObject(source);
    const target = ExtractionTypeFilter.fromObject(source.asObject({keepTypename: false}));
    return target;
  }

  category: ExtractionCategoryType = null;
  format: string = null;
  formats: string[] = null;
  version: string = null;
  isSpatial: boolean = null;

  fromObject(source: any, opts?: EntityAsObjectOptions) {
    super.fromObject(source, opts);
    this.isSpatial = source.isSpatial;
    this.category = source.category;
    this.format = source.format;
    this.formats = source.formats;
    this.version = source.version;
  }

  protected buildFilter(): FilterFn<ExtractionType>[] {
    const filterFns = super.buildFilter();
    // Filter by spatial
    if (isNotNil(this.isSpatial)) {
        filterFns.push(entity => this.isSpatial === entity.isSpatial);
    }

    // Filter by category
    if (isNotNil(this.category)) {
      filterFns.push(entity => this.category === entity.category);
    }

    // Filter by label
    if (isNotNil(this.label)) {
      filterFns.push(entity => this.label === entity.label);
    }

    // Filter by format
    if (isNotNil(this.format)) {
      filterFns.push(entity => this.format === entity.format);
    }
    // Filter by formats
    else if (isNonEmptyArray(this.formats)) {
      const formats = this.formats;
      filterFns.push(entity => formats.includes(entity.format));
    }

    // Filter by version
    if (isNotNil(this.version)) {
      filterFns.push(entity => this.version === entity.version);
    }

    return filterFns;
  }
}
