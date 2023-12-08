import { EntityClass, FilterFn } from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from '@app/referential/services/filter/referential.filter';
import { TaxonName } from '@app/referential/services/model/taxon-name.model';

@EntityClass({ typename: 'TaxonNameFilterVO' })
export class TaxonNameFilter extends BaseReferentialFilter<TaxonNameFilter, TaxonName> {
  static fromObject: (source: any, opts?: any) => TaxonNameFilter;

  withSynonyms: boolean = null;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.withSynonyms = source.withSynonyms;
  }

  protected buildFilter(): FilterFn<TaxonName>[] {
    const filterFns = super.buildFilter();

    // Filter by spatial
    if (this.withSynonyms === false) {
      filterFns.push((entity) => entity.isReferent);
    }

    return filterFns;
  }
}
