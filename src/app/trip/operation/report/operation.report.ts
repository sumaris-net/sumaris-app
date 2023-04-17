import { Component, Injector } from '@angular/core';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { Operation } from '@app/trip/services/model/trip.model';
import { OperationService } from '@app/trip/services/operation.service';
import { TripService } from '@app/trip/services/trip.service';

import moment from 'moment';
import {Function} from '@app/shared/functions';
import {Program} from '@app/referential/services/model/program.model';
import {TaxonGroupRef} from '@app/referential/services/model/taxon-group.model';

export interface OperationStats {
  // sampleCount: number;
  // images?: Image[];
  // pmfms: IPmfm[];
  program: Program;
  // weightDisplayedUnit: WeightUnitSymbol;
  i18nSuffix: string;
  taxonGroup: TaxonGroupRef;
}

@Component({
  selector: 'app-operation-report',
  templateUrl: './operation.report.html',
})
export class OperationReport extends AppDataEntityReport<Operation> {

  private tipService: TripService;
  private operationService: OperationService;

  constructor(
    injector: Injector,
  ) {
    super(injector, Operation, {});
    this.tipService = injector.get(TripService);
    this.operationService = injector.get(OperationService);
  }

  protected async load(id: number): Promise<Operation> {
    console.debug(`[${this.constructor.name}.loadData]`, arguments);
    const data = await this.operationService.load(id);
    data.trip = await this.tipService.load(data.tripId);

    const program = await this.programRefService.loadByLabel(data.trip.program.label);
    const i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    this.i18nContext.suffix = i18nSuffix === 'legacy' ? '' : i18nSuffix;

    return data;
  }

  protected computeDefaultBackHref(data: Operation): string {
    console.debug(`[${this.constructor.name}.computeDefaultBackHref]`, arguments);
    return `/trips/${data.trip.id}/operation/${data.id}`;
  }

  protected computePrintHref(data: Operation): string {
    console.debug(`[${this.constructor.name}.computePrintHref]`, arguments);
    return `/trips/${data.trip.id}/operation/${data.id}/report`;
  }

  protected async computeTitle(data: Operation, opts?: { withPrefix?: boolean }): Promise<string> {
    console.debug(`[${this.constructor.name}.computeTitle]`, arguments);
    const titlePrefix = (!opts || opts.withPrefix) && (await this.translate.get('TRIP.OPERATION.TITLE_PREFIX', {
      vessel: data.trip && data.trip.vesselSnapshot && (data.trip.vesselSnapshot.exteriorMarking || data.trip.vesselSnapshot.name),
      departureDateTime: data.trip && data.trip.departureDateTime && this.dateFormat.transform(data.trip.departureDateTime),
    }).toPromise());
    let title: string;
    if (this.settings.mobile) {
      const startDateTime = moment().isSame(data.startDateTime, 'day')
        ? this.dateFormat.transform(data.startDateTime, { pattern: 'HH:mm' })
        : this.dateFormat.transform(data.startDateTime, { time: true });
      title = await this.translate.get('TRIP.OPERATION.REPORT.TITLE_NO_RANK', { startDateTime }).toPromise();
    } else {
      const rankOrder = await this.operationService.computeRankOrder(data, { fetchPolicy: 'cache-first' });
      const startDateTime = this.dateFormat.transform(data.startDateTime, { time: true });
      title = await this.translate.get('TRIP.OPERATION.REPORT.TITLE', { startDateTime, rankOrder }).toPromise();
    }
    return titlePrefix + title;
  }

  protected async computeStats(data: Operation, opts?: {
    getSubCategory?: Function<any, string>;
    stats?: OperationStats;
    cache?: boolean;
  }): Promise<OperationStats> {
    const stats = opts?.stats || <OperationStats>{};
    // stats.program = await this.programRefService.loadByLabel(this.parent.program.label);

    // Compute agg data
    stats.taxonGroup = (data.samples || []).find(s => !!s.taxonGroup?.name)?.taxonGroup;
    // stats.weightDisplayedUnit = stats.program.getProperty(ProgramProperties.LANDING_WEIGHT_DISPLAYED_UNIT) as WeightUnitSymbol;

    // let pmfm = await this.programRefService.loadProgramPmfms(stats.program.label, {
    //   acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
    //   taxonGroupId: stats.taxonGroup?.id
    // });
    // stats.pmfms = (stats.weightDisplayedUnit)
    //   ? PmfmUtils.setWeightUnitConversions(pmfm, this.weightDisplayedUnit)
    //   : pmfm;

    stats.i18nSuffix = stats.program.getProperty(ProgramProperties.I18N_SUFFIX);

    // TODO This is not the place for this
    this.i18nContext.suffix = stats.i18nSuffix === 'legacy' ? '' : stats.i18nSuffix;

    return stats;
  }
}
