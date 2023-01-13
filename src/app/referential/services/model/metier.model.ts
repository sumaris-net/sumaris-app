import {
  BaseReferential,
  EntityClass,
  ReferentialAsObjectOptions,
  ReferentialRef,
  uncapitalizeFirstLetter
} from "@sumaris-net/ngx-components";

export interface MetierFromObjectOptions {
  useChildAttributes?: false | "TaxonGroup" | "Gear";
}

@EntityClass({ typename: "MetierVO" })
export class Metier extends BaseReferential<Metier, number, ReferentialAsObjectOptions, MetierFromObjectOptions> {
  static ENTITY_NAME = 'Metier';
  static fromObject: (source: any, opts?: MetierFromObjectOptions) => Metier;

  gear: ReferentialRef = null;
  taxonGroup: ReferentialRef = null;

  constructor() {
    super(Metier.TYPENAME);
    this.entityName = Metier.ENTITY_NAME;
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target = super.asObject(opts);
    if (!opts || opts.minify !== true) {
      target.gear = this.gear && this.gear.asObject(opts) || undefined;

      if (target.gear && !target.gear.entityName) {
        // Fixme gear entityName here
        console.warn("Missing gear.entityName in Metier instance", this);
        target.gear.entityName = "Gear";
      }

      target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject(opts) || undefined;
    }
    return target;
  }

  fromObject(source: any, opts?: MetierFromObjectOptions) {
    super.fromObject(source);
    this.entityName = source.entityName || Metier.ENTITY_NAME;
    this.gear = source.gear && ReferentialRef.fromObject(source.gear);
    this.taxonGroup = source.taxonGroup && ReferentialRef.fromObject(source.taxonGroup);

    // Copy label/name from child (TaxonGroup or Gear)
    if (opts && opts.useChildAttributes) {
      const childKey = uncapitalizeFirstLetter(opts.useChildAttributes);
      if (source[childKey]) {
        this.label = source[childKey].label || this.label;
        this.name = source[childKey].name || this.name;
      }
    }
  }
}
