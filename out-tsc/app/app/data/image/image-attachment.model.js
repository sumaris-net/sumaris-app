var ImageAttachment_1;
import { __decorate, __metadata } from "tslib";
import { EntityClass, EntityFilter, fromDateISOString, isNotNil, Person, toDateISOString, toNumber } from '@sumaris-net/ngx-components';
import { DataEntity } from '@app/data/services/model/data-entity.model';
export class ImageAttachmentComparators {
    static sortByIdOrRankOrder(n1, n2) {
        const d1 = toNumber(n1.id, n1.rankOrder);
        const d2 = toNumber(n2.id, n2.rankOrder);
        return d1 === d2 ? 0 : d1 > d2 ? 1 : -1;
    }
}
let ImageAttachment = ImageAttachment_1 = class ImageAttachment extends DataEntity {
    constructor() {
        super(ImageAttachment_1.TYPENAME);
        this.url = null;
        this.dataUrl = null;
        this.comments = null;
        this.dateTime = null;
        this.rankOrder = null;
        this.creationDate = null;
    }
    static fillRankOrder(images) {
        // Make sure to set a rankOrder (keep original order)
        // This is need by the equals() function
        images.map((image, index) => {
            image.rankOrder = index + 1;
        });
    }
    static equals(s1, s2) {
        return isNotNil(s1.id) && s1.id === s2.id
            // Or functional equals
            || (
            // Same xxx attribute
            s1.rankOrder === s2.rankOrder
                && s1.comments === s2.comments);
    }
    static isEmpty(source) {
        return !source.url && !source.comments && !source.dataUrl;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.url = source.url;
        this.dataUrl = source.dataUrl;
        this.comments = source.comments;
        this.dateTime = fromDateISOString(source.dateTime);
        this.creationDate = fromDateISOString(source.creationDate);
        this.recorderPerson = source.recorderPerson && Person.fromObject(source.recorderPerson);
        this.rankOrder = source.rankOrder;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.dateTime = toDateISOString(this.dateTime);
        target.creationDate = toDateISOString(this.creationDate);
        target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts) || undefined;
        // For pod
        if (opts && opts.keepLocalId === false) {
            // Reset unused attributes
            delete target.rankOrder;
        }
        return target;
    }
    get title() {
        return this.comments;
    }
    set title(value) {
        this.comments = value;
    }
};
ImageAttachment = ImageAttachment_1 = __decorate([
    EntityClass({ typename: 'ImageAttachmentVO' }),
    __metadata("design:paramtypes", [])
], ImageAttachment);
export { ImageAttachment };
let ImageAttachmentFilter = class ImageAttachmentFilter extends EntityFilter {
};
ImageAttachmentFilter = __decorate([
    EntityClass({ typename: 'ImageAttachmentFilterVO' })
], ImageAttachmentFilter);
export { ImageAttachmentFilter };
//# sourceMappingURL=image-attachment.model.js.map