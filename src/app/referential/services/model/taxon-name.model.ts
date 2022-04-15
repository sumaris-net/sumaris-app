import {
  BaseReferential,
  Entity,
  EntityAsObjectOptions,
  EntityClass,
  IReferentialRef,
  isNil,
  isNotNil,
  ReferentialAsObjectOptions,
  ReferentialRef,
  ReferentialUtils
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';

@EntityClass({typename: 'TaxonNameVO'})
export class TaxonName extends BaseReferential<TaxonName> {

  static ENTITY_NAME = 'TaxonName';
  static fromObject: (source: any, opts?: any) => TaxonName;

  isReferent: boolean;
  isNaming: boolean;
  isVirtual: boolean;
  taxonGroupIds: number[];
  referenceTaxonId: number;
  taxonomicLevel: ReferentialRef;
  parentTaxonName: ReferentialRef;
  useExistingReferenceTaxon: boolean;
  startDate: Moment;
  endDate: Moment;

  constructor() {
    super(TaxonName.TYPENAME);
    this.entityName = TaxonName.ENTITY_NAME;
  }

// TODO : Check if clone is needed
  clone(): TaxonName {
    const target = new TaxonName();
    target.fromObject(this);
    return target;
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target: any = super.asObject({
      ...options,
      minify: false // Do NOT minify itself
    });

    if (options && options.minify) {
      target.parentId = this.parentTaxonName && this.parentTaxonName.id;
      target.taxonomicLevelId = this.taxonomicLevel && this.taxonomicLevel.id;
      delete target.taxonomicLevel;
      delete target.parentTaxonName;
      delete target.useExistingReferenceTaxon;
    } else {
      target.parentTaxonName = this.parentTaxonName && this.parentTaxonName.asObject(options);

    }
    return target;
  }

  fromObject(source: any): TaxonName {
    super.fromObject(source);

    this.isReferent = source.isReferent;
    this.isNaming = source.isNaming;
    this.isVirtual = source.isVirtual;
    this.referenceTaxonId = source.referenceTaxonId;
    this.taxonomicLevel = source.taxonomicLevel && ReferentialRef.fromObject(source.taxonomicLevel);
    this.taxonGroupIds = source.taxonGroupIds;
    this.entityName = source.entityName || TaxonName.TYPENAME;
    this.parentTaxonName = source.parentTaxonName && ReferentialRef.fromObject(source.parentTaxonName);
    this.startDate = source.startDate;
    this.endDate = source.endDate;

    return this;
  }

  get taxonomicLevelId(): number {
    return this.taxonomicLevel && this.taxonomicLevel.id;
  }
}

export const TaxonomicLevelIds = {
  ORDO: 13,
  FAMILY: 17,
  GENUS: 26,
  SUBGENUS: 27,
  SPECIES: 28,
  SUBSPECIES: 29
};

@EntityClass({ typename: 'TaxonNameVO' })
export class TaxonNameRef
  extends Entity<TaxonNameRef, number, ReferentialAsObjectOptions>
  implements IReferentialRef<TaxonNameRef> {

  static ENTITY_NAME = 'TaxonName';
  static fromObject: (source: any, opts?: any) => TaxonNameRef;

  static equalsOrSameReferenceTaxon(v1: TaxonNameRef, v2: TaxonNameRef): boolean {
    return ReferentialUtils.equals(v1, v2) || (v1 && v2 && isNotNil(v1.referenceTaxonId) && v1.referenceTaxonId === v2.referenceTaxonId);
  }

  label: string;
  name: string;
  statusId: number;
  rankOrder: number;
  entityName: string;

  levelId: number;
  taxonGroupIds: number[];

  referenceTaxonId: number;

  constructor() {
    super(TaxonNameRef.TYPENAME);
    this.entityName = TaxonNameRef.ENTITY_NAME;
  }

  asObject(options?: ReferentialAsObjectOptions): any {
    if (options && options.minify) {
      return {
        id: this.id,
        __typename: options.keepTypename && this.__typename || undefined
      };
    }
    const target: any = super.asObject(options);
    if (options && options.keepEntityName !== true) delete target.entityName; // delete by default

    if (target.taxonGroupIds) {
      console.log('TODO Check why need to delete taxonGroupIds. May be to save on pod ?', target);
    }
    delete target.taxonGroupIds; // Not need
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.label = source.label;
    this.name = source.name;
    this.statusId = source.statusId;
    this.entityName = source.entityName || TaxonNameRef.ENTITY_NAME;
    this.levelId = source.levelId;
    this.referenceTaxonId = source.referenceTaxonId;
    this.taxonGroupIds = source.taxonGroupIds;
  }
}

export class TaxonUtils {

  static generateLabelFromName(taxonName: string): string {
    if (isNil(taxonName)) return undefined;
    const taxonNameWithoutStartParentheses = taxonName.replace(/\(/g, '');
    const taxonNameWithoutParentheses = taxonNameWithoutStartParentheses.replace(/\)/g, '');
    const genusWord = /^[a-zA-Z]{4,}$/;
    const speciesWord = /^[a-zA-Z]{3,}$/;

    // Rubin code for "Leucoraja circularis": LEUC CIR
    const parts = taxonNameWithoutParentheses.split(' ');
    if ((parts.length > 1) && parts[0].match(genusWord) && parts[1].match(speciesWord)) {
      return parts[0].slice(0, 4).toUpperCase() + parts[1].slice(0, 3).toUpperCase();
    }

    return undefined;
  }

  static generateNameSearchPatternFromLabel(label: string, optionalParenthese ?: boolean) {
    if (!label || label.length !== 7) {
      throw new Error('Invalid taxon name label (expected 7 characters)');
    }
    if (optionalParenthese) {
      return label.slice(0, 4) + '* (' + label.slice(4) + '*';
    }
    return label.slice(0, 4) + '* ' + label.slice(4) + '*';
  }

}
