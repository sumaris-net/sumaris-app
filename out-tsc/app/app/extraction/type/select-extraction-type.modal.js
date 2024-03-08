import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { first, map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { propertyComparator } from '@sumaris-net/ngx-components';
import { ExtractionTypeUtils } from '@app/extraction/type/extraction-type.model';
import { ExtractionTypeFilter } from '@app/extraction/type/extraction-type.filter';
import { ExtractionTypeService } from '@app/extraction/type/extraction-type.service';
let SelectExtractionTypeModal = class SelectExtractionTypeModal {
    constructor(viewCtrl, service, translate, cd) {
        this.viewCtrl = viewCtrl;
        this.service = service;
        this.translate = translate;
        this.cd = cd;
        this.loading = true;
        this.title = null;
        this.helpText = null;
        this.filter = null;
    }
    ngOnInit() {
        // Load items
        this.types$ = this.service.watchAll(0, 100, null, null, this.filter, {})
            .pipe(map(({ data }) => 
        // Compute i18n name
        data.map(t => ExtractionTypeUtils.computeI18nName(this.translate, t))
            // Then sort by name
            .sort(propertyComparator('name'))));
        // Update loading indicator
        this.types$.pipe(first()).subscribe((_) => this.markAsLoaded());
    }
    selectType(type) {
        this.close(type);
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewCtrl.dismiss(event);
        });
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewCtrl.dismiss();
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    markAsLoaded() {
        this.loading = false;
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], SelectExtractionTypeModal.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SelectExtractionTypeModal.prototype, "helpText", void 0);
__decorate([
    Input(),
    __metadata("design:type", ExtractionTypeFilter)
], SelectExtractionTypeModal.prototype, "filter", void 0);
SelectExtractionTypeModal = __decorate([
    Component({
        selector: 'app-select-extraction-type-modal',
        templateUrl: './select-extraction-type.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [ModalController,
        ExtractionTypeService,
        TranslateService,
        ChangeDetectorRef])
], SelectExtractionTypeModal);
export { SelectExtractionTypeModal };
//# sourceMappingURL=select-extraction-type.modal.js.map