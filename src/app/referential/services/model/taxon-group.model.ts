import { Entity, EntityClass, IReferentialRef, ReferentialAsObjectOptions } from '@sumaris-net/ngx-components';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';

export const TaxonGroupTypeIds = {
  FAO: 2,
  METIER_DCF_5: 3,
  METIER_NATIONAL: 4,
};

export const TaxonGroupLabels = {
  FISH: 'MZZ',
};

@EntityClass({ typename: 'TaxonGroupVO' })
export class TaxonGroupRef extends Entity<TaxonGroupRef, number, ReferentialAsObjectOptions> implements IReferentialRef<TaxonGroupRef> {
  static ENTITY_NAME = 'TaxonGroup';
  static fromObject: (source: any, opts?: any) => TaxonGroupRef;

  entityName: string;
  label: string;
  name: string;
  statusId: number;
  rankOrder: number;
  taxonNames: TaxonNameRef[];
  priority: number;

  constructor() {
    super(TaxonGroupRef.TYPENAME);
    this.entityName = TaxonGroupRef.ENTITY_NAME;
  }

  asObject(options?: ReferentialAsObjectOptions): any {
    if (options && options.minify) {
      return {
        id: this.id,
        __typename: (options.keepTypename && this.__typename) || undefined,
      };
    }
    const target: any = super.asObject(options);
    if (options && options.keepEntityName !== true) delete target.entityName; // delete by default
    delete target.taxonNames; // Not need
    delete target.priority;
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.label = source.label;
    this.name = source.name;
    this.statusId = source.statusId;
    this.entityName = source.entityName || TaxonGroupRef.ENTITY_NAME;
    this.taxonNames = (source.taxonNames && source.taxonNames.map(TaxonNameRef.fromObject)) || [];
    this.priority = source.priority;
  }
}
