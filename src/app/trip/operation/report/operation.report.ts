import { Component, Injector } from '@angular/core';
import {AppDataEntityReport} from '@app/data/report/data-entity-report.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import {Operation, Trip} from '@app/trip/services/model/trip.model';
import { OperationService } from '@app/trip/services/operation.service';
import { TripService } from '@app/trip/services/trip.service';

import moment from 'moment';
import {Function} from '@app/shared/functions';
import {AcquisitionLevelCodes, WeightUnitSymbol} from '@app/referential/services/model/model.enum';
import {IPmfm, Pmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import { isNotNilOrNaN } from '@sumaris-net/ngx-components';
import {Program} from '@app/referential/services/model/program.model';
import {TaxonGroupRef} from '@app/referential/services/model/taxon-group.model';
import {IReportStats} from '@app/data/report/base-report.class';

export interface OperationStats extends IReportStats {
  sampleCount: number;
  pmfms: IPmfm[];
  program: Program;
  weightDisplayedUnit: WeightUnitSymbol;
  i18nSuffix: string;
  taxonGroup: TaxonGroupRef;
}

@Component({
  selector: 'app-operation-report',
  templateUrl: './operation.report.html',
})
export class OperationReport extends AppDataEntityReport<Operation> {

  protected logPrefix = 'operation-report';

  protected tipService: TripService;
  protected operationService: OperationService;

  constructor(
    injector: Injector,
  ) {
    super(injector, Operation, {});
    this.tipService = injector.get(TripService);
    this.operationService = injector.get(OperationService);
  }

  protected async loadData(id: number, opts?: any): Promise<Operation> {
    if (this.debug) console.debug(`[${this.logPrefix}.loadData]`, arguments);
    const data = await this.operationService.load(id);

    await this.fillParent(data);

    return data;
  }

  dataFromObject(source:object): Operation {
    return Operation.fromObject(source)
  }

  statsFromObject(source:any): OperationStats {
    return  {
      i18nSuffix: source.i18nSuffix,
      sampleCount: source.sampleCount,
      pmfms: source.pmfms.map(item => Pmfm.fromObject(item)),
      program: Program.fromObject(source.program),
      weightDisplayedUnit: source.weightDisplayedUnit,
      taxonGroup: TaxonGroupRef.fromObject(source.taxonGroup),
    };
  }

  statsAsObject(source:OperationStats): any {
    return {
      i18nSuffix: source.i18nSuffix,
      sampleCount: source.sampleCount,
      pmfms: source.pmfms.map(item => item.asObject()),
      program: source.program.asObject(),
      weightDisplayedUnit: source.weightDisplayedUnit,
      taxonGroup: source.taxonGroup.asObject(),
    };
  }

  protected async fillParent(data: Operation){
    let parent: Trip;
    if (isNotNilOrNaN(data.tripId)) {
      // TODO Check if trip is the good parent in this case
      parent = await this.tipService.load(data.tripId);
    }
    if (!parent) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    data.trip = parent;
    return parent;
  }

  protected computeDefaultBackHref(data: Operation): string {
    if (this.debug) console.debug(`[${this.logPrefix}.computeDefaultBackHref]`, arguments);
    return `/trips/${data.trip.id}/operation/${data.id}`;
  }

  protected computePrintHref(data: Operation): string {
    if (this.debug) console.debug(`[${this.logPrefix}.computePrintHref]`, arguments);
    return `/trips/${data.trip.id}/operation/${data.id}/report`;
  }

  protected async computeTitle(data: Operation, stats: OperationStats): Promise<string> {
    if (this.debug) console.debug(`[${this.logPrefix}.computeTitle]`, arguments);
    // TODO Need option with prefix
    // const titlePrefix = (!opts || opts.withPrefix) && (await this.translate.get('TRIP.OPERATION.TITLE_PREFIX', {
    const titlePrefix = (await this.translate.get('TRIP.OPERATION.TITLE_PREFIX', {
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
    if (this.debug) console.log(`[${this.logPrefix}] Computing stats...`);
    // TODO When we need to get stats from opts ?
    const stats = opts?.stats || <OperationStats>{};
    // TODO Check and send error if data.trip is empty (must be filled `computeParent` in `loadData`)
    const parent = data.trip as Trip;
    stats.program = await this.programRefService.loadByLabel(parent.program.label);

    // Compute agg data
    stats.taxonGroup = (data.samples || []).find(s => !!s.taxonGroup?.name)?.taxonGroup;
    stats.weightDisplayedUnit = stats.program.getProperty(ProgramProperties.LANDING_WEIGHT_DISPLAYED_UNIT) as WeightUnitSymbol;

    let pmfm = await this.programRefService.loadProgramPmfms(stats.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
      taxonGroupId: stats.taxonGroup?.id
    });
    stats.pmfms = (stats.weightDisplayedUnit)
      ? PmfmUtils.setWeightUnitConversions(pmfm, stats.weightDisplayedUnit)
      : pmfm;

    stats.i18nSuffix = stats.program.getProperty(ProgramProperties.I18N_SUFFIX);

    return stats;
  }

}
