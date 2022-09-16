import { Component, ViewChild } from '@angular/core';
import { AppSlidesComponent, IRevealOptions } from '@app/shared/report/slides/slides.component';

@Component({
  selector: 'app-report-test-page',
  templateUrl: './report.testing.html'
})
export class ReportTestPage {

  slidesOptions: Partial<IRevealOptions> = {};
  shouldPrint = true;

  chart = {
    backgroundColor: "rgba(100,100,100,1)",
    labels: ["January"," February"," March"," April"," May"," June"," July"],
    datasets: [
      {
        data: [65,59,80,81,56,55,40],
        label: "My first dataset",
        backgroundColor: "rgba(20,220,220,.8)"
      },
      {
        data: [28,48,40,19,86,27,90],
        label: "My second dataset",
        backgroundColor: "rgba(220,120,120,.8)"
      }
    ]
  };

  @ViewChild(AppSlidesComponent) slides: AppSlidesComponent;

  constructor() {
  }

  print() {
    return this.slides.print();
  }
}
