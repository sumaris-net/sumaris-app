import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { isNotEmptyArray, StatusIds } from '@sumaris-net/ngx-components';
import { filter, switchMap, tap } from 'rxjs/operators';
import { ExtractionTypeService } from '../../extraction/type/extraction-type.service';
import { RxState } from '@rx-angular/state';
import { MatMenuTrigger } from '@angular/material/menu';
let AppExtractionButton = class AppExtractionButton extends RxState {
    constructor(extractionTypeService) {
        super();
        this.extractionTypeService = extractionTypeService;
        this.disabled = false;
        this.title = 'COMMON.BTN_DOWNLOAD';
        this.typesTitle = 'EXTRACTION.TYPES_MENU.LIVE_DIVIDER';
        this.icon = null;
        this.matIcon = 'download';
        this.style = 'mat-icon-button';
        this.downloadAsJson = new EventEmitter();
        this.downloadAsType = new EventEmitter();
        this.set({
            isSpatial: false,
            category: 'LIVE'
        });
        // Extraction types
        this.types$ = this.select(['programLabels', 'isSpatial', 'category'], res => res)
            .pipe(
        // DEBUG
        tap(({ programLabels }) => console.debug(`[entity-extraction-button] Watching extraction types {programLabels: [${programLabels === null || programLabels === void 0 ? void 0 : programLabels.join(', ')}]}...`)), filter(({ programLabels }) => isNotEmptyArray(programLabels)), 
        // DEBUG
        tap(({ programLabels }) => console.debug(`[entity-extraction-button] Watching extraction types {programLabels: [${programLabels.join(', ')}]}...`)), 
        // Load extraction types, from program's formats
        switchMap(({ programLabels, isSpatial, category }) => this.extractionTypeService.watchAllByProgramLabels(programLabels, {
            statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
            isSpatial,
            category
        }, { fetchPolicy: 'cache-first' })));
    }
    set programLabels(values) {
        this.set('programLabels', _ => values);
    }
    get programLabels() {
        return this.get('programLabels');
    }
    set programLabel(value) {
        this.set('programLabels', _ => value ? [value] : null);
    }
    get programLabel() {
        var _a;
        return (_a = this.get('programLabels')) === null || _a === void 0 ? void 0 : _a[0];
    }
    set isSpatial(isSpatial) {
        this.set('isSpatial', _ => isSpatial);
    }
    get isSpatial() {
        return this.get('isSpatial');
    }
    set category(category) {
        this.set('category', _ => category);
    }
    get category() {
        return this.get('category');
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppExtractionButton.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppExtractionButton.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppExtractionButton.prototype, "typesTitle", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppExtractionButton.prototype, "icon", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppExtractionButton.prototype, "matIcon", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], AppExtractionButton.prototype, "style", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], AppExtractionButton.prototype, "programLabels", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], AppExtractionButton.prototype, "programLabel", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AppExtractionButton.prototype, "isSpatial", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], AppExtractionButton.prototype, "category", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], AppExtractionButton.prototype, "downloadAsJson", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], AppExtractionButton.prototype, "downloadAsType", void 0);
__decorate([
    ViewChild(MatMenuTrigger),
    __metadata("design:type", MatMenuTrigger)
], AppExtractionButton.prototype, "menuTrigger", void 0);
__decorate([
    ViewChild('typesTemplate'),
    __metadata("design:type", TemplateRef)
], AppExtractionButton.prototype, "typesTemplate", void 0);
AppExtractionButton = __decorate([
    Component({
        selector: 'app-extraction-button',
        templateUrl: 'extraction-button.component.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [ExtractionTypeService])
], AppExtractionButton);
export { AppExtractionButton };
//# sourceMappingURL=extraction-button.component.js.map