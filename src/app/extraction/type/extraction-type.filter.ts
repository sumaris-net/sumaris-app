import { EntityAsObjectOptions, EntityClass, FilterFn, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from '@app/referential/services/filter/referential.filter';
import { ExtractionCategoryType, ExtractionType } from '@app/extraction/type/extraction-type.model';

@EntityClass({typename: 'ExtractionTypeFilterVO'})
export class ExtractionTypeFilter extends BaseReferentialFilter<ExtractionTypeFilter, ExtractionType> {

  static fromObject: (source: any, opts?: any) => ExtractionTypeFilter;

  category: ExtractionCategoryType = null;
  format: string = null;
  isSpatial: boolean = null;

  fromObject(source: any, opts?: EntityAsObjectOptions) {
    super.fromObject(source, opts);
    this.isSpatial = source.isSpatial;
    this.category = source.category;
    this.format = source.format;
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

    // Filter by format
    if (isNotNil(this.format)) {
      filterFns.push(entity => this.format === entity.format);
    }

    return filterFns;
  }
}
