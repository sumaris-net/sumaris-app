import { DataEntity, DataEntityAsObjectOptions } from '@app/data/services/model/data-entity.model';
import {
  EntityClass,
  equalsOrNil,
  FilterFn,
  IEntity,
  isNil,
  isNotNil,
  isNotNilOrNaN,
  ReferentialAsObjectOptions,
  ReferentialRef,
  referentialToString,
  ReferentialUtils,
} from '@sumaris-net/ngx-components';
import { Product } from './product.model';
import { DataEntityFilter } from '@app/data/services/model/data-filter.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

const PacketNumber = 6; // default packet number for SFA
export const PacketIndexes = [...Array(PacketNumber).keys()]; // produce: [0,1,2,3,4,5] with PacketNumber = 6

export interface IWithPacketsEntity<T, ID = number>
  extends IEntity<T, ID> {
  packets: Packet[];
}

export class PacketFilter extends DataEntityFilter<PacketFilter, Packet> {

  static fromParent(parent: IWithPacketsEntity<any, any>): PacketFilter {
    return PacketFilter.fromObject({parent});
  }

  static fromObject(source: Partial<PacketFilter>): PacketFilter {
    if (!source || source instanceof PacketFilter) return source as PacketFilter;
    const target = new PacketFilter();
    target.fromObject(source);
    return target;
  }

  static searchFilter(source: Partial<PacketFilter>): FilterFn<Packet>{
    return source && PacketFilter.fromObject(source).asFilterFn();
  }

  parent?: IWithPacketsEntity<any, any>;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.parent = source.parent;
  }

  asFilterFn<E extends Packet>(): FilterFn<E> {
    if (isNil(this.parent)) return undefined;
    return (p) => p.parent && this.parent.equals(p.parent);
  }

}

@EntityClass({typename: 'PacketVO'})
export class Packet extends DataEntity<Packet> {

  static fromObject: (source: any, opts?: any) => Packet;

  static equals(p1: Packet | any, p2: Packet | any): boolean {
    return p1 && p2 && ((isNotNil(p1.id) && p1.id === p2.id)
      // Or by functional attributes
      || (p1.rankOrder === p2.rankOrder
        // same operation
        && ((!p1.operationId && !p2.operationId) || p1.operationId === p2.operationId)
        && (p1.number === p2.number)
        && (p1.weight === p2.weight)
      ));
  }

  rankOrder: number;
  number: number;
  weight: number;
  composition: PacketComposition[];
  parent: IWithPacketsEntity<any, any>;
  operationId: number;

  // Not serialized
  saleProducts: Product[];

  constructor() {
    super(Packet.TYPENAME);
    this.rankOrder = null;
    this.number = null;
    this.weight = null;
    this.composition = [];
    this.saleProducts = [];
    this.parent = null;
    this.operationId = null;
  }

  asObject(opts?: DataEntityAsObjectOptions): any {
    const target = super.asObject(opts);
    const sampledWeights = [];
    PacketIndexes.forEach(index => {
      sampledWeights.push(this['sampledWeight' + index]);
      delete target['sampledWeight' + index];
    })
    target.sampledWeights = sampledWeights;

    target.composition = this.composition && this.composition.map(c => c.asObject(opts)) || undefined;

    if (!opts || opts.minify !== true) {
      target.saleProducts = this.saleProducts && this.saleProducts.map(saleProduct => {
        const s = saleProduct.asObject(opts);
        // Affect batchId (=packet.id)
        s.batchId = this.id;
        return s;
      }) || [];
    } else {
      delete target.saleProducts;
    }

    delete target.parent;
    return target;
  }

  fromObject(source: any): DataEntity<Packet> {
    super.fromObject(source);
    this.rankOrder = source.rankOrder;
    this.number = source.number;
    this.weight = source.weight;
    const sampledWeights = source.sampledWeights || [];
    PacketIndexes.forEach(index => this['sampledWeight' + index] = sampledWeights[index] || source['sampledWeight' + index])
    this.composition = source.composition && source.composition.map(c => PacketComposition.fromObject(c));

    this.saleProducts = source.saleProducts && source.saleProducts.map(saleProduct => Product.fromObject(saleProduct)) || [];

    this.operationId = source.operationId;
    this.parent = source.parent;
    return this;
  }

  equals(other: Packet): boolean {
    return (super.equals(other) && isNotNil(this.id))
      || (
        this.rankOrder === other.rankOrder && equalsOrNil(this.number, other.number) && equalsOrNil(this.weight, other.weight)
      );
  }

}

@EntityClass({typename: 'PacketCompositionVO'})
export class PacketComposition extends DataEntity<PacketComposition> {

  static fromObject: (source: any, opts?: any) => PacketComposition;

  rankOrder: number;
  taxonGroup: ReferentialRef;
  weight: number;

  constructor() {
    super(PacketComposition.TYPENAME);
    this.rankOrder = null;
    this.taxonGroup = null;
    this.weight = null;
  }

  asObject(options?: DataEntityAsObjectOptions): any {
    const target = super.asObject(options);

    target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject({...options, ...NOT_MINIFY_OPTIONS, keepEntityName: true} as ReferentialAsObjectOptions) || undefined;
    const ratios = [];
    PacketIndexes.forEach(index => {
      ratios.push(this['ratio' + index]);
      delete target['ratio' + index];
    })
    target.ratios = ratios;
    delete target.weight;
    delete target.qualityFlagId;

    return target;
  }

  fromObject(source: any): PacketComposition {
    super.fromObject(source);
    this.rankOrder = source.rankOrder || undefined;
    this.taxonGroup = source.taxonGroup && ReferentialRef.fromObject(source.taxonGroup) || undefined;
    const ratios = source.ratios || [];
    PacketIndexes.forEach(index => this['ratio' + index] = ratios[index] || source['ratio' + index])
    return this;
  }

  equals(other: PacketComposition): boolean {
    return (super.equals(other) && isNotNil(this.id))
      || (
        this.taxonGroup.equals(other.taxonGroup) && this.rankOrder === other.rankOrder
      );
  }

}

export class PacketUtils {

  static isPacketEmpty(packet: Packet): boolean {
    return !packet || isNil(packet.number);
  }

  static isPacketCompositionEmpty(composition: PacketComposition): boolean {
    return !composition || isNil(composition.taxonGroup);
  }

  static isPacketCompositionEquals(composition1: PacketComposition, composition2: PacketComposition): boolean {
    return (composition1 === composition2) || (isNil(composition1) && isNil(composition2)) || (
      composition1 && composition2 && ReferentialUtils.equals(composition1.taxonGroup, composition2.taxonGroup)
      && PacketIndexes.every(index => composition1['ratio'+index] === composition2['ratio'+index])
    );
  }

  static getComposition(packet: Packet) {
    return packet && packet.composition && packet.composition.map(composition => referentialToString(composition.taxonGroup)).join('\n') || "";
  }

  static getCompositionAverageRatio(packet: Packet, composition: PacketComposition): number {
    const ratios: number[] = PacketIndexes.map(index => composition['ratio' + index]).filter(value => isNotNilOrNaN(value));
    const sum = ratios.reduce((a, b) => a + b, 0);
    const avg = (sum / PacketUtils.getSampledPacketCount(packet)) || 0;
    return avg / 100;
  }

  static getSampledPacketCount(packet: Packet): number {
    let count = 0;
    PacketIndexes.forEach(index => {
      if (!!packet['sampledWeight' + index])
        count++;
    });
    return count
  }

}
