var FullReferential_1;
import { __decorate, __metadata } from "tslib";
import { BaseReferential, EntityClass, isNotNil, ReferentialRef, ReferentialUtils } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
let FullReferential = FullReferential_1 = class FullReferential extends BaseReferential {
    constructor(__typename) {
        super(__typename || FullReferential_1.TYPENAME);
        this.parent = null;
        this.label = null;
        this.name = null;
        this.description = null;
        this.comments = null;
        this.creationDate = null;
        this.statusId = null;
        this.levelId = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.parent = source.parent && ReferentialRef.fromObject(source.parent) || isNotNil(source.parentId) && ReferentialRef.fromObject({ id: source.parentId });
        if (isNotNil(this.levelId) && ReferentialUtils.isNotEmpty(source.level)) {
            this.levelId = source.level.id;
        }
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.statusId = ReferentialUtils.isNotEmpty(target.statusId) ? target.statusId.id : target.statusId;
        target.levelId = ReferentialUtils.isNotEmpty(target.levelId) ? target.levelId.id : target.levelId;
        target.parent = this.parent && this.parent.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
        if (opts && opts.minify) {
            target.parentId = ReferentialUtils.isNotEmpty(target.parent) ? target.parent.id : target.parentId;
            delete target.parent;
        }
        return target;
    }
};
FullReferential = FullReferential_1 = __decorate([
    EntityClass({ typename: 'ReferentialVO' }),
    __metadata("design:paramtypes", [String])
], FullReferential);
export { FullReferential };
//# sourceMappingURL=referential.model.js.map