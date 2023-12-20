import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN, PhysicalGearService } from './physicalgear.service';
import { isNotNil, LocalSettingsService, ReferentialRef, toBoolean } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { PhysicalGearFilter } from './physical-gear.filter';
import { PhysicalGearTable } from '@app/trip/physicalgear/physical-gears.table';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
let SelectPhysicalGearModal = class SelectPhysicalGearModal {
    constructor(modalCtrl, settings, cd, dataService) {
        this.modalCtrl = modalCtrl;
        this.settings = settings;
        this.cd = cd;
        this.dataService = dataService;
        this.filter = null;
        this.mobile = settings.mobile;
    }
    get loadingSubject() {
        return this.table.loadingSubject;
    }
    ngOnInit() {
        // Init table
        this.table.dataService = this.dataService;
        this.filter = PhysicalGearFilter.fromObject(this.filter);
        this.filter.program = ReferentialRef.fromObject(Object.assign(Object.assign({}, this.filter.program), { label: this.programLabel }));
        this.table.filter = this.filter;
        this.table.dataSource.watchAllOptions = {
            distinctBy: this.distinctBy || ['gear.id', 'rankOrder', `measurementValues.${PmfmIds.GEAR_LABEL}`],
            withOffline: this.withOffline
        };
        this.table.acquisitionLevel = this.acquisitionLevel || AcquisitionLevelCodes.PHYSICAL_GEAR;
        this.table.programLabel = this.programLabel;
        this.table.markAsReady();
        this.table.onRefresh.emit();
        // Set defaults
        this.allowMultiple = toBoolean(this.allowMultiple, false);
    }
    selectRow(row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (row && this.table) {
                // Select the clicked row, then close
                if (!this.allowMultiple) {
                    this.table.selection.clear();
                    this.table.selection.select(row);
                    yield this.close();
                }
                // Add clicked row to selection
                else {
                    this.table.selection.select(row);
                }
            }
        });
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.hasSelection())
                return; // Skip if nothing selected
            const gears = (this.table.selection.selected || [])
                .map(row => row.currentData)
                .map(PhysicalGear.fromObject)
                .filter(isNotNil);
            return this.modalCtrl.dismiss(gears);
        });
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.modalCtrl.dismiss();
        });
    }
    hasSelection() {
        return this.table && this.table.selection.hasValue() && (this.allowMultiple || this.table.selection.selected.length === 1);
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectPhysicalGearModal.prototype, "allowMultiple", void 0);
__decorate([
    Input(),
    __metadata("design:type", PhysicalGearFilter)
], SelectPhysicalGearModal.prototype, "filter", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SelectPhysicalGearModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SelectPhysicalGearModal.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SelectPhysicalGearModal.prototype, "distinctBy", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectPhysicalGearModal.prototype, "withOffline", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SelectPhysicalGearModal.prototype, "showGearColumn", void 0);
__decorate([
    ViewChild(PhysicalGearTable, { static: true }),
    __metadata("design:type", PhysicalGearTable)
], SelectPhysicalGearModal.prototype, "table", void 0);
SelectPhysicalGearModal = __decorate([
    Component({
        selector: 'app-select-physical-gear-modal',
        templateUrl: './select-physical-gear.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush,
        providers: [
            {
                provide: PHYSICAL_GEAR_DATA_SERVICE_TOKEN,
                useExisting: PhysicalGearService
            }
        ]
    }),
    __param(3, Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN)),
    __metadata("design:paramtypes", [ModalController,
        LocalSettingsService,
        ChangeDetectorRef, Object])
], SelectPhysicalGearModal);
export { SelectPhysicalGearModal };
//# sourceMappingURL=select-physical-gear.modal.js.map