import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core';
import { InMemoryEntitiesService } from '@sumaris-net/ngx-components';
import { Batch } from './batch.model';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AbstractBatchesTable } from '@app/trip/batch/common/batches.table.class';
import { BatchValidatorService } from '@app/trip/batch/common/batch.validator';
import { BatchModal } from '@app/trip/batch/common/batch.modal';
export const BATCH_RESERVED_START_COLUMNS = ['taxonGroup', 'taxonName', 'weight'];
let BatchesTable = class BatchesTable extends AbstractBatchesTable {
    constructor(injector, memoryDataService, validatorService) {
        super(injector, Batch, BatchFilter, memoryDataService, validatorService, {
            reservedStartColumns: BATCH_RESERVED_START_COLUMNS
        });
        this.memoryDataService = memoryDataService;
        this.compactFields = true;
    }
    setModalOption(key, value) {
        this.modalOptions = this.modalOptions || {};
        this.modalOptions[key] = value;
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.memoryDataService.stop();
    }
    /* -- protected methods  -- */
    openDetailModal(dataToOpen) {
        return __awaiter(this, void 0, void 0, function* () {
            const isNew = !dataToOpen && true;
            if (isNew) {
                dataToOpen = new this.dataType();
                yield this.onNewEntity(dataToOpen);
            }
            this.markAsLoading();
            const modal = yield this.modalCtrl.create({
                component: BatchModal,
                componentProps: Object.assign({ programLabel: this.programLabel, acquisitionLevel: this.acquisitionLevel, disabled: this.disabled, data: dataToOpen, isNew, showTaxonGroup: this.showTaxonGroupColumn, showTaxonName: this.showTaxonNameColumn, 
                    // Not need on a root species batch (fill in sub-batches)
                    showTotalIndividualCount: false, showIndividualCount: false, mobile: this.mobile, usageMode: this.usageMode, i18nSuffix: this.i18nColumnSuffix, maxVisibleButtons: 3 }, this.modalOptions),
                keyboardClose: true
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data, role } = yield modal.onDidDismiss();
            if (data && this.debug)
                console.debug('[batches-table] Batch modal result: ', data, role);
            this.markAsLoaded();
            return { data: (data instanceof Batch) ? data : undefined, role };
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchesTable.prototype, "modalOptions", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchesTable.prototype, "compactFields", void 0);
BatchesTable = __decorate([
    Component({
        selector: 'app-batches-table',
        templateUrl: 'batches.table.html',
        styleUrls: ['batches.table.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
        providers: [
            { provide: BatchValidatorService, useClass: BatchValidatorService },
            { provide: InMemoryEntitiesService, useFactory: () => new InMemoryEntitiesService(Batch, BatchFilter, {
                    equals: Batch.equals,
                    sortByReplacement: { id: 'rankOrder' }
                })
            }
        ]
    }),
    __metadata("design:paramtypes", [Injector,
        InMemoryEntitiesService,
        BatchValidatorService])
], BatchesTable);
export { BatchesTable };
//# sourceMappingURL=batches.table.js.map