import { __decorate, __metadata } from "tslib";
import { Component, ViewChild } from '@angular/core';
import { RevealComponent } from '@app/shared/report/reveal/reveal.component';
let ReportTestPage = class ReportTestPage {
    constructor() {
        this.revealOptions = {};
        this.chart = {
            type: 'bar',
            options: {
                backgroundColor: 'rgba(100,100,100,1)',
                responsive: true,
                animation: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Chart Title'
                    }
                }
            },
            data: {
                labels: ['January', ' February', ' March', ' April', ' May', ' June', ' July'],
                datasets: [
                    {
                        data: [65, 59, 80, 81, 56, 55, 40],
                        label: 'My first dataset',
                        backgroundColor: 'rgba(20,220,220,.8)'
                    },
                    {
                        data: [28, 48, 40, 19, 86, 27, 90],
                        label: 'My second dataset',
                        backgroundColor: 'rgba(220,120,120,.8)'
                    }
                ]
            }
        };
    }
    print() {
        return this.reveal.print();
    }
};
__decorate([
    ViewChild(RevealComponent),
    __metadata("design:type", RevealComponent)
], ReportTestPage.prototype, "reveal", void 0);
ReportTestPage = __decorate([
    Component({
        selector: 'app-report-test-page',
        templateUrl: './report.testing.html'
    }),
    __metadata("design:paramtypes", [])
], ReportTestPage);
export { ReportTestPage };
//# sourceMappingURL=report.testing.js.map