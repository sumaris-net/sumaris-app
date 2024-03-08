import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, Optional } from '@angular/core';
// import fade in animation
import { mergeMap, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AppRootDataEntityEditor } from '../form/root-data-editor.class';
import { fadeInAnimation, isNil, isNotNil, LocalSettingsService } from '@sumaris-net/ngx-components';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { debounceTime } from 'rxjs/operators';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
export const STRATEGY_SUMMARY_DEFAULT_I18N_PREFIX = 'PROGRAM.STRATEGY.SUMMARY.';
let StrategySummaryCardComponent = class StrategySummaryCardComponent {
    constructor(router, localSettings, programRefService, cd, editor) {
        this.router = router;
        this.localSettings = localSettings;
        this.programRefService = programRefService;
        this.cd = cd;
        this._subscription = new Subscription();
        this.data = null;
        this.loading = true;
        this.displayAttributes = {
            strategy: undefined,
            location: undefined,
            taxonName: undefined,
            taxonGroup: undefined
        };
        this.canOpenLink = false;
        this.i18nPrefix = STRATEGY_SUMMARY_DEFAULT_I18N_PREFIX;
        this.showOpenLink = true;
        this.compact = true;
        this.showName = true;
        this.showLocations = false;
        this.showTaxonGroups = false;
        this.showTaxonNames = false;
        this.editor = editor;
        Object.keys(this.displayAttributes).forEach(fieldName => {
            this.displayAttributes[fieldName] = localSettings.getFieldDisplayAttributes(fieldName, ['label', 'name']);
        });
        // Some fixed display attributes
        this.displayAttributes.strategy = ['name'];
        this.displayAttributes.taxonName = ['name'];
    }
    set value(value) {
        this.updateView(value);
    }
    get value() {
        return this.data;
    }
    ngOnInit() {
        // Check editor exists
        if (!this.editor)
            throw new Error('Missing mandatory \'editor\' input!');
        this.title = this.title || (this.i18nPrefix + 'TITLE');
        // Subscribe to refresh events
        this._subscription.add(this.editor.onUpdateView
            .pipe(mergeMap(_ => this.editor.strategy$))
            .pipe(debounceTime(450))
            .subscribe((data) => this.updateView(data)));
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    /* -- protected method -- */
    updateView(data) {
        data = data || this.data || (this.editor && this.editor.strategy);
        // DEBUG
        //console.debug('[strategy-summary-card] updating strategy #' +  data?.id);
        if (isNil(data) || isNil(data.id)) {
            this.loading = true;
            this.data = null;
            this.canOpenLink = false;
            this.markForCheck();
        }
        else if (this.data !== data || this.loading) {
            // DEBUG
            //console.debug('[strategy-summary-card] Updating view using strategy:', data);
            this.data = data;
            this.canOpenLink = this.showOpenLink && isNotNil(data.programId);
            this.loading = false;
            this.markForCheck();
        }
    }
    open(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.canOpenLink)
                return;
            console.debug('[strategy-summary-card] Opening strategy...');
            if (event) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            }
            const programId = this.data && this.data.programId;
            if (isNil(programId) || isNil(this.data.id))
                return; // Skip if missing ids
            // Get the strategy editor to use
            const program = yield this.programRefService.load(programId, { fetchPolicy: 'cache-first' });
            const strategyEditor = program.getProperty(ProgramProperties.STRATEGY_EDITOR);
            // Open the expected editor page
            return this.router.navigateByUrl(`/referential/programs/${programId}/strategies/${strategyEditor}/${this.data.id}`);
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategySummaryCardComponent.prototype, "i18nPrefix", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], StrategySummaryCardComponent.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategySummaryCardComponent.prototype, "showOpenLink", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategySummaryCardComponent.prototype, "compact", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategySummaryCardComponent.prototype, "showName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategySummaryCardComponent.prototype, "showLocations", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategySummaryCardComponent.prototype, "showTaxonGroups", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategySummaryCardComponent.prototype, "showTaxonNames", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], StrategySummaryCardComponent.prototype, "value", null);
__decorate([
    Input(),
    __metadata("design:type", AppRootDataEntityEditor)
], StrategySummaryCardComponent.prototype, "editor", void 0);
StrategySummaryCardComponent = __decorate([
    Component({
        selector: 'app-strategy-summary-card',
        templateUrl: './strategy-summary-card.component.html',
        styleUrls: ['./strategy-summary-card.component.scss'],
        animations: [fadeInAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(4, Optional()),
    __param(4, Inject(APP_DATA_ENTITY_EDITOR)),
    __metadata("design:paramtypes", [Router,
        LocalSettingsService,
        ProgramRefService,
        ChangeDetectorRef,
        AppRootDataEntityEditor])
], StrategySummaryCardComponent);
export { StrategySummaryCardComponent };
//# sourceMappingURL=strategy-summary-card.component.js.map