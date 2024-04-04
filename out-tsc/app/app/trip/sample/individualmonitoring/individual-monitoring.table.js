import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { SubSampleValidatorService } from '../sub-sample.validator';
import { Validators } from '@angular/forms';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { SubSamplesTable } from '../sub-samples.table';
let IndividualMonitoringTable = class IndividualMonitoringTable extends SubSamplesTable {
    constructor(injector) {
        super(injector);
        this.acquisitionLevel = AcquisitionLevelCodes.INDIVIDUAL_MONITORING;
    }
    onPmfmsLoaded(pmfms) {
        // Listening on column 'IS_DEAD' value changes
        const hasIsDeadPmfm = pmfms.findIndex(p => p.id === PmfmIds.IS_DEAD) !== -1;
        if (hasIsDeadPmfm) {
            const isDeadControlPath = `measurementValues.${PmfmIds.IS_DEAD}`;
            this.registerSubscription(this.registerCellValueChanges('isDead', isDeadControlPath, true)
                .subscribe((isDeadValue) => {
                if (!this.editedRow)
                    return; // Should never occur
                const row = this.editedRow;
                const controls = row.validator.get('measurementValues').controls;
                if (isDeadValue) {
                    if (controls[PmfmIds.DEATH_TIME]) {
                        if (row.validator.enabled) {
                            controls[PmfmIds.DEATH_TIME].enable();
                        }
                        controls[PmfmIds.DEATH_TIME].setValidators(Validators.required);
                    }
                    if (controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS]) {
                        if (row.validator.enabled) {
                            controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].enable();
                        }
                        controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].setValidators(Validators.required);
                    }
                }
                else {
                    if (controls[PmfmIds.DEATH_TIME]) {
                        controls[PmfmIds.DEATH_TIME].disable();
                        controls[PmfmIds.DEATH_TIME].setValue(null);
                        controls[PmfmIds.DEATH_TIME].setValidators(null);
                    }
                    if (controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS]) {
                        controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].setValue(null);
                        controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].setValidators(null);
                        controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].disable();
                    }
                }
            }));
        }
    }
};
IndividualMonitoringTable = __decorate([
    Component({
        selector: 'app-individual-monitoring-table',
        templateUrl: '../sub-samples.table.html',
        styleUrls: ['../sub-samples.table.scss', 'individual-monitoring.table.scss'],
        providers: [
            { provide: ValidatorService, useExisting: SubSampleValidatorService }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector])
], IndividualMonitoringTable);
export { IndividualMonitoringTable };
//# sourceMappingURL=individual-monitoring.table.js.map