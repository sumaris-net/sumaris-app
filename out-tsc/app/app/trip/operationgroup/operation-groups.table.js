import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { OperationGroupValidatorService } from './operation-group.validator';
import { InMemoryEntitiesService, isNil, LocalSettingsService, referentialToString } from '@sumaris-net/ngx-components';
import { MetierService } from '@app/referential/services/metier.service';
import { OperationGroup } from '../trip/trip.model';
import { environment } from '@environments/environment';
import { OperationGroupModal } from '@app/trip/operationgroup/operation-group.modal';
import { OperationGroupFilter } from '@app/trip/operationgroup/operation-group.filter';
export const OPERATION_GROUP_RESERVED_START_COLUMNS = ['metier'];
export const OPERATION_GROUP_RESERVED_START_COLUMNS_NOT_MOBILE = ['gear', 'targetSpecies'];
export const OPERATION_GROUP_RESERVED_END_COLUMNS = ['comments'];
let OperationGroupTable = class OperationGroupTable extends BaseMeasurementsTable {
    constructor(injector, settings, dataService, validatorService, metierService, cd) {
        super(injector, OperationGroup, OperationGroupFilter, dataService, validatorService, {
            reservedStartColumns: settings.mobile ? OPERATION_GROUP_RESERVED_START_COLUMNS : OPERATION_GROUP_RESERVED_START_COLUMNS.concat(OPERATION_GROUP_RESERVED_START_COLUMNS_NOT_MOBILE),
            reservedEndColumns: settings.mobile ? [] : OPERATION_GROUP_RESERVED_END_COLUMNS,
            mapPmfms: (pmfms) => this.mapPmfms(pmfms),
            i18nColumnPrefix: 'TRIP.OPERATION.LIST.'
        });
        this.metierService = metierService;
        this.cd = cd;
        this.referentialToString = referentialToString;
        this.useSticky = false;
        this.autoLoad = false; // waiting parent to be loaded
        this.inlineEdition = this.validatorService && !this.mobile;
        this.confirmBeforeDelete = true;
        this.defaultPageSize = -1; // Do not use paginator
        // Set default acquisition level
        this.acquisitionLevel = AcquisitionLevelCodes.OPERATION;
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    set value(data) {
        this.memoryDataService.value = data;
    }
    get value() {
        return this.memoryDataService.value;
    }
    ngOnInit() {
        super.ngOnInit();
        this.displayAttributes = {
            gear: this.settings.getFieldDisplayAttributes('gear'),
            taxonGroup: ['taxonGroup.label', 'taxonGroup.name'],
            metier: this.settings.getFieldDisplayAttributes('metier')
        };
        // Metier combo
        this.registerAutocompleteField('metier', {
            showAllOnFocus: true,
            items: this.metiers,
            attributes: this.displayAttributes.metier,
            columnSizes: this.displayAttributes.metier.map(attr => attr === 'label' ? 3 : undefined),
            mobile: this.mobile
        });
        // Add sort replacement
        this.memoryDataService.addSortByReplacement('gear', this.displayAttributes.gear[0]);
        this.memoryDataService.addSortByReplacement('taxonGroup', this.displayAttributes.taxonGroup[0]);
        this.memoryDataService.addSortByReplacement('targetSpecies', this.displayAttributes.metier[0]);
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.memoryDataService.stop();
    }
    openDetailModal(dataToOpen) {
        return __awaiter(this, void 0, void 0, function* () {
            const isNew = !dataToOpen && true;
            if (isNew) {
                dataToOpen = new this.dataType();
                yield this.onNewEntity(dataToOpen);
            }
            this.markAsLoading();
            const modal = yield this.modalCtrl.create({
                component: OperationGroupModal,
                componentProps: {
                    programLabel: this.programLabel,
                    acquisitionLevel: this.acquisitionLevel,
                    metiers: this.metiers,
                    disabled: this.disabled,
                    mobile: this.mobile,
                    data: dataToOpen,
                    isNew,
                    onDelete: (event, item) => this.deleteEntity(event, item)
                },
                keyboardClose: true
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data } = yield modal.onDidDismiss();
            if (data && this.debug)
                console.debug('[operation-groups-table] operation-groups modal result: ', data);
            this.markAsLoaded();
            if (data instanceof OperationGroup) {
                return data;
            }
            // Exit if empty
            return undefined;
        });
    }
    getMaxRankOrderOnPeriod() {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = this.dataSource.getRows();
            return rows.reduce((res, row) => Math.max(res, row.currentData.rankOrderOnPeriod || 0), 0);
        });
    }
    onMetierChange($event, row) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (row && row.currentData && row.currentData.metier) {
                console.debug('[operation-group.table] onMetierChange', $event, row.currentData.metier);
                const operationGroup = row.currentData;
                if (((_a = operationGroup.metier) === null || _a === void 0 ? void 0 : _a.id) && (!((_b = operationGroup.metier) === null || _b === void 0 ? void 0 : _b.gear) || !((_c = operationGroup.metier) === null || _c === void 0 ? void 0 : _c.taxonGroup))) {
                    // First, load the Metier (with children)
                    const metier = yield this.metierService.load(operationGroup.metier.id);
                    // affect to current row
                    row.validator.controls['metier'].setValue(metier);
                }
            }
        });
    }
    /* -- protected methods -- */
    mapPmfms(pmfms) {
        // if (this.mobile) {
        //   pmfms.forEach(pmfm => pmfm.hidden = true);
        //   // return [];
        // }
        return pmfms;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    openNewRowDetail() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            const data = yield this.openDetailModal();
            if (data) {
                yield this.addEntityToTable(data);
            }
            return true;
        });
    }
    openRow(id, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            const data = this.toEntity(row, true);
            const updatedData = yield this.openDetailModal(data);
            if (updatedData) {
                yield this.updateEntityToTable(updatedData, row, { confirmEdit: false });
            }
            else {
                this.editedRow = null;
            }
            return true;
        });
    }
    onNewEntity(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(data.rankOrderOnPeriod)) {
                data.rankOrderOnPeriod = (yield this.getMaxRankOrderOnPeriod()) + 1;
            }
        });
    }
    findRowByOperationGroup(operationGroup) {
        return __awaiter(this, void 0, void 0, function* () {
            return OperationGroup && this.dataSource.getRows().find(r => operationGroup.equals(r.currentData));
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationGroupTable.prototype, "metiers", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], OperationGroupTable.prototype, "value", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationGroupTable.prototype, "useSticky", void 0);
OperationGroupTable = __decorate([
    Component({
        selector: 'app-operation-group-table',
        templateUrl: 'operation-groups.table.html',
        styleUrls: ['operation-groups.table.scss'],
        providers: [
            {
                provide: InMemoryEntitiesService,
                useFactory: () => new InMemoryEntitiesService(OperationGroup, OperationGroupFilter, {
                    equals: OperationGroup.equals,
                    sortByReplacement: { id: 'rankOrder' }
                })
            }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        LocalSettingsService,
        InMemoryEntitiesService,
        OperationGroupValidatorService,
        MetierService,
        ChangeDetectorRef])
], OperationGroupTable);
export { OperationGroupTable };
//# sourceMappingURL=operation-groups.table.js.map