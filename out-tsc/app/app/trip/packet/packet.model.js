var Packet_1, PacketComposition_1;
import { __decorate, __metadata } from "tslib";
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { EntityClass, equalsOrNil, isNil, isNotNil, isNotNilOrNaN, referentialToString, ReferentialUtils, } from '@sumaris-net/ngx-components';
import { Product } from '../product/product.model';
import { DataEntityFilter } from '@app/data/services/model/data-filter.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
const PacketNumber = 6; // default packet number for SFA
export const PacketIndexes = [...Array(PacketNumber).keys()]; // produce: [0,1,2,3,4,5] with PacketNumber = 6
export class PacketFilter extends DataEntityFilter {
    static fromParent(parent) {
        return PacketFilter.fromObject({ parent });
    }
    static fromObject(source) {
        if (!source || source instanceof PacketFilter)
            return source;
        const target = new PacketFilter();
        target.fromObject(source);
        return target;
    }
    static searchFilter(source) {
        return source && PacketFilter.fromObject(source).asFilterFn();
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.parent = source.parent;
    }
    asFilterFn() {
        if (isNil(this.parent))
            return undefined;
        return (p) => p.parent && this.parent.equals(p.parent);
    }
}
let Packet = Packet_1 = class Packet extends DataEntity {
    constructor() {
        super(Packet_1.TYPENAME);
        this.rankOrder = null;
        this.number = null;
        this.weight = null;
        this.composition = [];
        this.saleProducts = [];
        this.parent = null;
        this.operationId = null;
    }
    static equals(p1, p2) {
        return p1 && p2 && ((isNotNil(p1.id) && p1.id === p2.id)
            // Or by functional attributes
            || (p1.rankOrder === p2.rankOrder
                // same operation
                && ((!p1.operationId && !p2.operationId) || p1.operationId === p2.operationId)
                && (p1.number === p2.number)
                && (p1.weight === p2.weight)));
    }
    asObject(opts) {
        const target = super.asObject(opts);
        const sampledWeights = [];
        PacketIndexes.forEach(index => {
            sampledWeights.push(this['sampledWeight' + index]);
            delete target['sampledWeight' + index];
        });
        target.sampledWeights = sampledWeights;
        target.composition = this.composition && this.composition.map(c => c.asObject(opts)) || undefined;
        if (!opts || opts.minify !== true) {
            target.saleProducts = this.saleProducts && this.saleProducts.map(saleProduct => {
                const s = saleProduct.asObject(opts);
                // Affect batchId (=packet.id)
                s.batchId = this.id;
                return s;
            }) || [];
        }
        else {
            delete target.saleProducts;
        }
        delete target.parent;
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.rankOrder = source.rankOrder;
        this.number = source.number;
        this.weight = source.weight;
        const sampledWeights = source.sampledWeights || [];
        PacketIndexes.forEach(index => this['sampledWeight' + index] = sampledWeights[index] || source['sampledWeight' + index]);
        this.composition = source.composition && source.composition.map(c => PacketComposition.fromObject(c));
        this.saleProducts = source.saleProducts && source.saleProducts.map(saleProduct => Product.fromObject(saleProduct)) || [];
        this.operationId = source.operationId;
        this.parent = source.parent;
        return this;
    }
    equals(other) {
        return (super.equals(other) && isNotNil(this.id))
            || (this.rankOrder === other.rankOrder && equalsOrNil(this.number, other.number) && equalsOrNil(this.weight, other.weight));
    }
};
Packet = Packet_1 = __decorate([
    EntityClass({ typename: 'PacketVO' }),
    __metadata("design:paramtypes", [])
], Packet);
export { Packet };
let PacketComposition = PacketComposition_1 = class PacketComposition extends DataEntity {
    constructor() {
        super(PacketComposition_1.TYPENAME);
        this.rankOrder = null;
        this.taxonGroup = null;
        this.weight = null;
    }
    asObject(options) {
        const target = super.asObject(options);
        target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject(Object.assign(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS), { keepEntityName: true })) || undefined;
        const ratios = [];
        PacketIndexes.forEach(index => {
            ratios.push(this['ratio' + index]);
            delete target['ratio' + index];
        });
        target.ratios = ratios;
        delete target.weight;
        delete target.qualityFlagId;
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.rankOrder = source.rankOrder || undefined;
        this.taxonGroup = source.taxonGroup && TaxonGroupRef.fromObject(source.taxonGroup) || undefined;
        const ratios = source.ratios || [];
        PacketIndexes.forEach(index => this['ratio' + index] = ratios[index] || source['ratio' + index]);
        return this;
    }
    equals(other) {
        return (super.equals(other) && isNotNil(this.id))
            || (this.taxonGroup.equals(other.taxonGroup) && this.rankOrder === other.rankOrder);
    }
};
PacketComposition = PacketComposition_1 = __decorate([
    EntityClass({ typename: 'PacketCompositionVO' }),
    __metadata("design:paramtypes", [])
], PacketComposition);
export { PacketComposition };
export class PacketUtils {
    static isPacketEmpty(packet) {
        return !packet || isNil(packet.number);
    }
    static isPacketCompositionEmpty(composition) {
        return !composition || isNil(composition.taxonGroup);
    }
    static isPacketCompositionEquals(composition1, composition2) {
        return (composition1 === composition2) || (isNil(composition1) && isNil(composition2)) || (composition1 && composition2 && ReferentialUtils.equals(composition1.taxonGroup, composition2.taxonGroup)
            && PacketIndexes.every(index => composition1['ratio' + index] === composition2['ratio' + index]));
    }
    static getComposition(packet) {
        return packet && packet.composition && packet.composition.map(composition => referentialToString(composition.taxonGroup)).join('\n') || '';
    }
    static getCompositionAverageRatio(packet, composition) {
        const ratios = PacketIndexes.map(index => composition['ratio' + index]).filter(value => isNotNilOrNaN(value));
        const sum = ratios.reduce((a, b) => a + b, 0);
        const avg = (sum / PacketUtils.getSampledPacketCount(packet)) || 0;
        return avg / 100;
    }
    static getSampledPacketCount(packet) {
        let count = 0;
        PacketIndexes.forEach(index => {
            if (!!packet['sampledWeight' + index])
                count++;
        });
        return count;
    }
}
//# sourceMappingURL=packet.model.js.map