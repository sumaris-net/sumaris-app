import { Component, Injector } from '@angular/core';
import { Operation } from '@app/trip/services/model/trip.model';
import { OperationReport } from '@app/trip/operation/report/operation.report';

@Component({
  selector: 'app-selectivity',
  templateUrl: './selectivity.report.html',
  styleUrls: ['./selectivity.report.scss']
})
export class SelectivityReport extends OperationReport {

  constructor(injector: Injector) {
    super(injector);
  }

  protected computeDefaultBackHref(data: Operation): string {
    console.debug(`[${this.constructor.name}.computeDefaultBackHref]`, arguments);
    return `/trips/${data.trip.id}/operation/selectivity/${data.id}?tab=1`;
  }

  protected computePrintHref(data: Operation): string {
    console.debug(`[${this.constructor.name}.computePrintHref]`, arguments);
    return `/trips/${data.trip.id}/operation/selectivity/${data.id}/report`;
  }
}
