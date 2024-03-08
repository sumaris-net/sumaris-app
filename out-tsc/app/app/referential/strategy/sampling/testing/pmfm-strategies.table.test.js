import { __decorate, __metadata } from "tslib";
import { Component, ViewChild } from '@angular/core';
import { ParameterLabelGroups } from 'src/app/referential/services/model/model.enum';
import { PmfmStrategy } from 'src/app/referential/services/model/pmfm-strategy.model';
import { PmfmStrategiesTable } from '../../pmfm-strategies.table';
let PmfmStrategiesTableTestPage = class PmfmStrategiesTableTestPage {
    constructor() {
        this.enabled = true;
        this.pmfmFilters = {
            table1: {
                levelLabels: ParameterLabelGroups.WEIGHT
            }
        };
    }
    ngOnInit() {
        this.table1.value = [new PmfmStrategy(), new PmfmStrategy()];
    }
};
__decorate([
    ViewChild('table1', { static: true }),
    __metadata("design:type", PmfmStrategiesTable)
], PmfmStrategiesTableTestPage.prototype, "table1", void 0);
PmfmStrategiesTableTestPage = __decorate([
    Component({
        selector: 'app-pmfm-strategies-table-test',
        templateUrl: './pmfm-strategies.table.test.html'
    }),
    __metadata("design:paramtypes", [])
], PmfmStrategiesTableTestPage);
export { PmfmStrategiesTableTestPage };
//# sourceMappingURL=pmfm-strategies.table.test.js.map