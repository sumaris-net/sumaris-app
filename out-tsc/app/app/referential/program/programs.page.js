import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { AccountService, LocalSettingsService } from '@sumaris-net/ngx-components';
import { ModalController, Platform } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ReferentialTable } from '../table/referential.table';
import { AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
export const ProgramsPageSettingsEnum = {
    PAGE_ID: 'programs',
    FILTER_KEY: AppRootTableSettingsEnum.FILTER_KEY,
};
let ProgramsPage = class ProgramsPage {
    constructor(route, router, platform, location, modalCtrl, accountService, settings, cd) {
        this.route = route;
        this.router = router;
        this.platform = platform;
        this.location = location;
        this.modalCtrl = modalCtrl;
        this.accountService = accountService;
        this.settings = settings;
        this.cd = cd;
        const isAdmin = this.accountService.isAdmin();
        this.canEdit = isAdmin || this.accountService.isSupervisor();
        this.canDelete = isAdmin;
    }
    ngOnInit() {
        this.table.settingsId = ProgramsPageSettingsEnum.PAGE_ID;
        this.table.entityName = 'Program';
        this.table.restoreFilterOrLoad();
    }
};
__decorate([
    ViewChild('table', { static: true }),
    __metadata("design:type", ReferentialTable)
], ProgramsPage.prototype, "table", void 0);
ProgramsPage = __decorate([
    Component({
        selector: 'app-program-page',
        templateUrl: './programs.page.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [ActivatedRoute,
        Router,
        Platform,
        Location,
        ModalController,
        AccountService,
        LocalSettingsService,
        ChangeDetectorRef])
], ProgramsPage);
export { ProgramsPage };
//# sourceMappingURL=programs.page.js.map