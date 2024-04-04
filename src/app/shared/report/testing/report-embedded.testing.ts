import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { IRevealOptions } from '@app/shared/report/reveal/reveal.utils';

@Component({
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
})
export class ReportEmbeddedChildTestPage implements AfterViewInit {
  revealOptions: Partial<IRevealOptions> = {};

  @ViewChild(RevealComponent) reveal: RevealComponent;

  constructor() {}

  ngAfterViewInit() {}
}

@Component({
  selector: 'app-report-embedded-test-page',
  templateUrl: './report-embedded.testing.html',
})
export class ReportEmbeddedTestPage implements AfterViewInit {
  revealOptions: Partial<IRevealOptions> = {};

  @ViewChild(RevealComponent) reveal: RevealComponent;
  @ViewChild(ReportEmbeddedChildTestPage) embeddedReport: ReportEmbeddedChildTestPage;

  constructor() {}

  ngAfterViewInit() {}

  print() {
    return this.reveal.print();
  }
}
