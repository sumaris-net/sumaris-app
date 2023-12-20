import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Inject, Input, Output, Self } from '@angular/core';
import { APP_IMAGE_ATTACHMENT_SERVICE } from './image-attachment.service';
import { ImageAttachment, ImageAttachmentFilter } from './image-attachment.model';
import { BehaviorSubject, of, Subscription } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { EntitiesTableDataSource, EntityUtils, InMemoryEntitiesService, isNil, LocalSettingsService, toBoolean, } from '@sumaris-net/ngx-components';
import { startWith, switchMap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { getMaxRankOrder } from '@app/data/services/model/model.utils';
let AppImageAttachmentGallery = class AppImageAttachmentGallery {
    constructor(modalCtrl, settings, cd, dataService) {
        this.modalCtrl = modalCtrl;
        this.settings = settings;
        this.cd = cd;
        this.dataService = dataService;
        this._subscription = new Subscription();
        this.readySubject = new BehaviorSubject(false);
        this.dirtySubject = new BehaviorSubject(false);
        this.cardColor = 'light';
        this.disabled = false;
        this.readOnly = false;
        this.autoLoad = true;
        this.refresh = new EventEmitter();
        this.dataSource = new EntitiesTableDataSource(ImageAttachment, this.dataService, null, {
            prependNewElements: false,
        });
        this.debug = !environment.production;
    }
    set value(value) {
        // DEBUG
        if (this.debug)
            console.debug(`[image-gallery] Setting ${(value === null || value === void 0 ? void 0 : value.length) || 0} image(s): `);
        // Fill rankOrder (keep original order) - need by the equals() function
        ImageAttachment.fillRankOrder(value);
        this.dataService.setValue(value);
    }
    get value() {
        return (this.dataService.value || []).map(ImageAttachment.fromObject);
    }
    get galleryDataSource() {
        return this.dataSource;
    }
    get enabled() {
        return !this.disabled;
    }
    get dirty() {
        return this.dataService.dirty || this.dirtySubject.value;
    }
    enable(opts) {
        if (this.disabled) {
            this.disabled = false;
            this.markForCheck();
        }
    }
    disable(opts) {
        if (!this.disabled) {
            this.disabled = true;
            this.markForCheck();
        }
    }
    markAsReady() {
        if (!this.readySubject.value) {
            this.readySubject.next(true);
        }
    }
    markAsDirty() {
        if (!this.dirtySubject.value) {
            this.dirtySubject.next(true);
        }
    }
    markAsPristine() {
        if (this.dirtySubject.value) {
            this.dirtySubject.next(false);
        }
    }
    ngOnInit() {
        // Set defaults
        this.mobile = toBoolean(this.mobile, this.settings.mobile);
        this.showToolbar = toBoolean(this.showToolbar, !this.mobile);
        // Call datasource refresh, on each refresh events
        this._subscription.add(this.refresh
            .pipe(startWith((this.autoLoad ? {} : 'skip')), switchMap((event) => {
            if (event === 'skip') {
                return of(undefined);
            }
            if (this.debug)
                console.debug('[image-attachment-gallery] Calling dataSource.watchAll()...');
            return this.dataSource.watchAll(0, 100, null, null, null);
        }))
            .subscribe());
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    onAfterAddRows(rows) {
        return __awaiter(this, void 0, void 0, function* () {
            // Fill rankOrder
            let rankOrder = getMaxRankOrder(this.dataSource.getData()) + 1;
            (rows || []).forEach((row) => {
                const data = row.currentData;
                if (isNil(data.rankOrder)) {
                    data.rankOrder = rankOrder++;
                    row.currentData = data;
                }
            });
            yield this.save();
            this.markAsDirty();
        });
    }
    save() {
        return this.dataSource.save();
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], AppImageAttachmentGallery.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], AppImageAttachmentGallery.prototype, "mode", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], AppImageAttachmentGallery.prototype, "cardColor", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppImageAttachmentGallery.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppImageAttachmentGallery.prototype, "readOnly", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], AppImageAttachmentGallery.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], AppImageAttachmentGallery.prototype, "showFabButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], AppImageAttachmentGallery.prototype, "showAddCardButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppImageAttachmentGallery.prototype, "autoLoad", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], AppImageAttachmentGallery.prototype, "value", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], AppImageAttachmentGallery.prototype, "refresh", void 0);
AppImageAttachmentGallery = __decorate([
    Component({
        selector: 'app-image-attachment-gallery',
        templateUrl: './image-attachment-gallery.component.html',
        styleUrls: ['./image-attachment-gallery.component.scss'],
        providers: [
            {
                provide: APP_IMAGE_ATTACHMENT_SERVICE,
                useFactory: () => new InMemoryEntitiesService(ImageAttachment, ImageAttachmentFilter, {
                    equals: ImageAttachment.equals,
                    onSort: (data, sortBy = 'rankOrder', sortDirection) => EntityUtils.sort(data, sortBy, sortDirection),
                }),
            },
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __param(3, Self()),
    __param(3, Inject(APP_IMAGE_ATTACHMENT_SERVICE)),
    __metadata("design:paramtypes", [ModalController,
        LocalSettingsService,
        ChangeDetectorRef,
        InMemoryEntitiesService])
], AppImageAttachmentGallery);
export { AppImageAttachmentGallery };
//# sourceMappingURL=image-attachment-gallery.component.js.map