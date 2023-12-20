import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { AppTable, EntitiesTableDataSource, InMemoryEntitiesService, isNil, isNotEmptyArray, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, } from '@sumaris-net/ngx-components';
import { Packet, PacketFilter, PacketUtils } from './packet.model';
import { PacketValidatorService } from './packet.validator';
import { BehaviorSubject } from 'rxjs';
import { PacketModal } from './packet.modal';
import { PacketSaleModal } from '../sale/packet-sale.modal';
import { SaleProductUtils } from '../sale/sale-product.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
let PacketsTable = class PacketsTable extends AppTable {
    constructor(injector, validatorService, memoryDataService, programRefService, cd) {
        super(injector, 
        // columns
        RESERVED_START_COLUMNS.concat(['parent', 'number', 'weight']).concat(RESERVED_END_COLUMNS), new EntitiesTableDataSource(Packet, memoryDataService, validatorService, {
            suppressErrors: true,
            onRowCreated: (row) => this.onRowCreated(row),
        }), null // Filter
        );
        this.validatorService = validatorService;
        this.memoryDataService = memoryDataService;
        this.programRefService = programRefService;
        this.cd = cd;
        this.showToolbar = true;
        this.useSticky = false;
        this.i18nColumnPrefix = 'PACKET.LIST.';
        this.autoLoad = false; // waiting parent to be loaded
        this.inlineEdition = this.validatorService && !this.mobile;
        this.confirmBeforeDelete = true;
        this.defaultPageSize = -1; // Do not use paginator
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    set parentFilter(packetFilter) {
        this.setFilter(packetFilter);
    }
    set program(value) {
        this._program = value;
        if (value) {
            this.loadPmfms();
        }
    }
    get program() {
        return this._program;
    }
    set value(data) {
        this.memoryDataService.value = data;
    }
    get value() {
        return this.memoryDataService.value;
    }
    get dirty() {
        return super.dirty || this.memoryDataService.dirty;
    }
    ngOnInit() {
        super.ngOnInit();
        this.registerAutocompleteField('parent', {
            items: this.$parents,
            attributes: this.parentAttributes,
            columnNames: ['RANK_ORDER', 'REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
            columnSizes: this.parentAttributes.map((attr) => (attr === 'metier.label' ? 3 : attr === 'rankOrderOnPeriod' ? 1 : undefined)),
            mobile: this.mobile,
        });
        this.registerSubscription(this.onStartEditingRow.subscribe((row) => this.onStartEditPacket(row)));
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.memoryDataService.stop();
    }
    loadPmfms() {
        this.programRefService
            .loadProgramPmfms(this.program, { acquisitionLevel: AcquisitionLevelCodes.PACKET_SALE })
            .then((packetSalePmfms) => (this.packetSalePmfms = packetSalePmfms));
    }
    trackByFn(index, row) {
        return row.currentData.rankOrder;
    }
    onRowCreated(row) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = row.currentData; // if validator enable, this will call a getter function
            yield this.onNewEntity(data);
            // Affect new row
            if (row.validator) {
                row.validator.patchValue(data);
                row.validator.markAsDirty();
            }
            else {
                row.currentData = data;
            }
            this.markForCheck();
        });
    }
    addEntityToTable(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                throw new Error('Missing data to add');
            if (this.debug)
                console.debug('[measurement-table] Adding new entity', data);
            const row = yield this.addRowToTable();
            if (!row)
                throw new Error('Could not add row to table');
            yield this.onNewEntity(data);
            // Affect new row
            if (row.validator) {
                row.validator.patchValue(data);
                row.validator.markAsDirty();
            }
            else {
                row.currentData = data;
            }
            // Confirm the created row
            if (!opts || opts.confirmCreate !== false) {
                this.confirmEditCreate(null, row);
                this.editedRow = null;
            }
            else {
                this.editedRow = row;
            }
            this.markAsDirty();
            return row;
        });
    }
    onNewEntity(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(data.rankOrder)) {
                data.rankOrder = (yield this.getMaxRankOrder()) + 1;
            }
        });
    }
    getMaxRankOrder() {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = this.dataSource.getRows();
            return rows.reduce((res, row) => Math.max(res, row.currentData.rankOrder || 0), 0);
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    openRow(id, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            yield this.openComposition(null, row);
            return true;
        });
    }
    openNewRowDetail() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            const { data, role } = yield this.openDetailModal();
            if (data && role !== 'delete') {
                const row = yield this.addEntityToTable(data);
                // Redirect to another modal
                if (role === 'sale') {
                    yield this.openPacketSale(null, row);
                }
            }
            else {
                this.editedRow = null;
            }
            return true;
        });
    }
    openDetailModal(dataToOpen) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const isNew = !dataToOpen && true;
            if (isNew) {
                dataToOpen = new Packet();
                if ((_a = this.filter) === null || _a === void 0 ? void 0 : _a.parent) {
                    dataToOpen.parent = this.filter.parent;
                }
                else if (((_b = this.$parents.value) === null || _b === void 0 ? void 0 : _b.length) === 1) {
                    dataToOpen.parent = this.$parents.value[0];
                }
            }
            const modal = yield this.modalCtrl.create({
                component: PacketModal,
                componentProps: {
                    disabled: this.disabled,
                    mobile: this.mobile,
                    parents: this.$parents.value,
                    parentAttributes: this.parentAttributes,
                    data: dataToOpen,
                    isNew,
                    onDelete: (event, packet) => this.deleteEntity(event, packet),
                },
                backdropDismiss: false,
                cssClass: 'modal-large',
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data, role } = yield modal.onDidDismiss();
            this.markAsLoaded();
            if (this.debug)
                console.debug('[packet-table] packet modal result: ', { data, role });
            return { data: data instanceof Packet ? data : undefined, role };
        });
    }
    deleteEntity(event, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield this.findRowByPacket(data);
            // Row not exists: OK
            if (!row)
                return true;
            const canDeleteRow = yield this.canDeleteRows([row]);
            if (canDeleteRow === true) {
                this.cancelOrDelete(undefined, row, { interactive: false /*already confirmed*/ });
            }
            return canDeleteRow;
        });
    }
    openComposition(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event)
                event.stopPropagation();
            const { data, role } = yield this.openDetailModal(row.currentData);
            if (data && role !== 'delete') {
                row.validator.patchValue(data, { onlySelf: false, emitEvent: true });
                // update sales
                this.updateSaleProducts(row);
                this.markAsDirty({ emitEvent: false });
                this.markForCheck();
                if (role === 'sale') {
                    yield this.openPacketSale(null, row);
                }
            }
        });
    }
    getComposition(row) {
        return PacketUtils.getComposition(row.currentData);
    }
    updateSaleProducts(row) {
        if (row && row.currentData) {
            // update sales if any
            if (isNotEmptyArray(row.currentData.saleProducts)) {
                const updatedSaleProducts = SaleProductUtils.updateAggregatedSaleProducts(row.currentData, this.packetSalePmfms);
                row.validator.patchValue({ saleProducts: updatedSaleProducts }, { emitEvent: true });
            }
        }
    }
    openPacketSale(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event)
                event.stopPropagation();
            const modal = yield this.modalCtrl.create({
                component: PacketSaleModal,
                componentProps: {
                    data: row.currentData,
                    packetSalePmfms: this.packetSalePmfms,
                    disabled: this.disabled,
                    mobile: this.mobile,
                },
                backdropDismiss: false,
                cssClass: 'modal-large',
            });
            yield modal.present();
            const res = yield modal.onDidDismiss();
            if (res && res.data) {
                // patch saleProducts only
                row.validator.patchValue({ saleProducts: res.data.saleProducts }, { emitEvent: true });
                this.markAsDirty({ emitEvent: false });
                this.markForCheck();
            }
        });
    }
    /* -- protected methods -- */
    findRowByPacket(packet) {
        return __awaiter(this, void 0, void 0, function* () {
            return Packet && this.dataSource.getRows().find((r) => Packet.equals(packet, r.currentData));
        });
    }
    onStartEditPacket(row) {
        if (this.filter && this.filter.parent && row.currentData && !row.currentData.parent) {
            row.validator.patchValue({ parent: this.filter.parent });
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", BehaviorSubject)
], PacketsTable.prototype, "$parents", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], PacketsTable.prototype, "parentAttributes", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PacketsTable.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PacketsTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", PacketFilter),
    __metadata("design:paramtypes", [PacketFilter])
], PacketsTable.prototype, "parentFilter", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PacketsTable.prototype, "program", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], PacketsTable.prototype, "value", null);
PacketsTable = __decorate([
    Component({
        selector: 'app-packets-table',
        templateUrl: 'packets.table.html',
        styleUrls: ['packets.table.scss'],
        providers: [
            {
                provide: InMemoryEntitiesService,
                useFactory: () => new InMemoryEntitiesService(Packet, PacketFilter, {
                    equals: Packet.equals,
                }),
            },
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        PacketValidatorService,
        InMemoryEntitiesService,
        ProgramRefService,
        ChangeDetectorRef])
], PacketsTable);
export { PacketsTable };
//# sourceMappingURL=packets.table.js.map