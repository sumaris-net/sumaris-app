import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { SubSampleValidatorService } from '../sub-sample.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { SubSamplesTable } from '../sub-samples.table';
let IndividualReleasesTable = class IndividualReleasesTable extends SubSamplesTable {
    constructor(injector) {
        super(injector);
        this.acquisitionLevel = AcquisitionLevelCodes.INDIVIDUAL_RELEASE;
    }
    /* -- protected functions -- */
    onPmfmsLoaded(pmfms) {
    }
};
IndividualReleasesTable = __decorate([
    Component({
        selector: 'app-individual-releases-table',
        templateUrl: '../sub-samples.table.html',
        styleUrls: ['../sub-samples.table.scss', 'individual-releases.table.scss'],
        providers: [
            { provide: ValidatorService, useExisting: SubSampleValidatorService }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector])
], IndividualReleasesTable);
export { IndividualReleasesTable };
//# sourceMappingURL=individual-releases.table.js.map