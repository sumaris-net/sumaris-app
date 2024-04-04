import { __decorate, __metadata } from "tslib";
import { Component, ViewChild } from '@angular/core';
import { RevealComponent } from '@app/shared/report/reveal/reveal.component';
let ReportEmbeddedChildTestPage = class ReportEmbeddedChildTestPage {
    constructor() {
        this.revealOptions = {};
    }
    ngAfterViewInit() {
    }
};
__decorate([
    ViewChild(RevealComponent),
    __metadata("design:type", RevealComponent)
], ReportEmbeddedChildTestPage.prototype, "reveal", void 0);
ReportEmbeddedChildTestPage = __decorate([
    Component({
        selector: 'app-report-embedded-child-test-page',
        template: `
    <app-reveal [options]="revealOptions" [embedded]="true">
      <ng-template sectionDef>
        <section>
          <section>
            <h1>Diapo 3 a</h1>
          </section>
          <section>
            <h1>Dipo 3 b</h1>
          </section>
        </section>
      </ng-template>
      <ng-content></ng-content>
    </app-reveal>
  `,
    }),
    __metadata("design:paramtypes", [])
], ReportEmbeddedChildTestPage);
export { ReportEmbeddedChildTestPage };
let ReportEmbeddedTestPage = class ReportEmbeddedTestPage {
    constructor() {
        this.revealOptions = {};
    }
    ngAfterViewInit() {
    }
    print() {
        return this.reveal.print();
    }
};
__decorate([
    ViewChild(RevealComponent),
    __metadata("design:type", RevealComponent)
], ReportEmbeddedTestPage.prototype, "reveal", void 0);
__decorate([
    ViewChild(ReportEmbeddedChildTestPage),
    __metadata("design:type", ReportEmbeddedChildTestPage)
], ReportEmbeddedTestPage.prototype, "embeddedReport", void 0);
ReportEmbeddedTestPage = __decorate([
    Component({
        selector: 'app-report-embedded-test-page',
        templateUrl: './report-embedded.testing.html'
    }),
    __metadata("design:paramtypes", [])
], ReportEmbeddedTestPage);
export { ReportEmbeddedTestPage };
//# sourceMappingURL=report-embedded.testing.js.map