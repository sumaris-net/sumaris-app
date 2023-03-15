import { BaseReferential, EntityClass, FilterFn, isNotNil, isNotNilOrBlank, ReferentialAsObjectOptions, ReferentialRef, toNumber } from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from '@app/referential/services/filter/referential.filter';
import { MeasurementValuesUtils } from '@app/trip/services/model/measurement.model';

@EntityClass({typename: 'TranscribingItemTypeVO'})
export class TranscribingItemType extends BaseReferential<TranscribingItemType> {

  static ENTITY_NAME = 'TranscribingItemType';
  static fromObject: (source: any, opts?: any) => TranscribingItemType;

  objectType: ReferentialRef;
  items: TranscribingItem[];

  systemId: number;
  system: ReferentialRef;

  constructor() {
    super(TranscribingItemType.TYPENAME);
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.objectType = source.objectType && ReferentialRef.fromObject(source.objectType);
    this.system = source.system && ReferentialRef.fromObject(source.system);
    this.items = source.items && source.items.map(item => TranscribingItem.fromObject(item));
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.objectType = this.objectType?.asObject(opts);
    target.items = this.items?.map(item => item.asObject(opts));
    target.systemId = toNumber(this.systemId, this.system?.id);
    if (opts?.minify) {
      delete target.items;
      delete target.system;
    }
    else {
      target.system = this.system?.asObject(opts);
    }
    return target;
  }
}

@EntityClass({typename: 'TranscribingItemVO'})
export class TranscribingItem extends BaseReferential<TranscribingItem> {

  static ENTITY_NAME = 'TranscribingItem';
  static fromObject: (source: any, opts?: any) => TranscribingItem;
  static equals(o1, o2): boolean {
    return o1 && o2 && o1.id === o2.id
      // Or
      || (
        // Same label
        (o1.label == o2.label)
        // Same object id
        && (toNumber(o1.objectId, o1.object?.id) === toNumber(o2.objectId, o2.object?.id))
        // Same type id
        && (toNumber(o1.typeId, o1.type?.id) === toNumber(o2.typeId, o2.type?.id))
      );
  }

  constructor() {
    super(TranscribingItem.TYPENAME);

    // Properties to expose (detected by Object.keys())
    // Used to create columns in base referential table
    this.statusId = null;
    this.label = null;
  }

  type: ReferentialRef = null;
  object: ReferentialRef = null;

  // If minify
  typeId: number;
  objectId: number;

  fromObject(source: any) {
    super.fromObject(source);
    this.typeId = toNumber(source.typeId, source.type?.id);
    this.type = source.object && ReferentialRef.fromObject(source.type);
    this.objectId = toNumber(source.objectId, source.object?.id);
    this.object = source.object && ReferentialRef.fromObject(source.object);
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.type = this.type?.asObject(opts);
    target.object = this.object?.asObject(opts);
    return target;
  }
}

@EntityClass({typename: 'TranscribingItemVO'})
export class TranscribingItemFilter extends BaseReferentialFilter<TranscribingItemFilter, TranscribingItem> {
  static fromObject: (source: any, opts?: any) => TranscribingItemFilter;

  typeId: number;
  type: ReferentialRef;

  fromObject(source: any) {
    super.fromObject(source);
    this.typeId = toNumber(source.typeId, source.type?.id);
    this.type = source.object && ReferentialRef.fromObject(source.type);
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.type = this.type?.asObject(opts);
    return target;
  }

  buildFilter(): FilterFn<TranscribingItem>[] {
    const filterFns = super.buildFilter();

    // Type
    const typeId = toNumber(this.typeId, this.type?.id);
    if (isNotNil(typeId)) {
      filterFns.push(t => t.typeId === typeId || t.type?.id === typeId);
    }
    else {
      const typeLabel = this.type?.label;
      if (isNotNilOrBlank(typeLabel)) {
        filterFns.push(t => t.type?.label === typeLabel);
      }
    }

    return filterFns;
  }
}
