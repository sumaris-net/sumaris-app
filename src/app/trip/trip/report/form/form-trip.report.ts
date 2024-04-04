import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { FormTripReportService } from './form-trip-report.service';
import { TripReportService } from '../trip-report.service';
import { BaseReportStats, IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { TripService } from '../../trip.service';
import { Operation, Trip } from '../../trip.model';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ReferentialRef, isNotNil, splitById } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { PmfmValuePipe } from '@app/referential/pipes/pmfms.pipe';
import { DataStrategyResolution, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementFormValues, MeasurementUtils, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { filter } from 'rxjs';

export class FormTripReportStats extends BaseReportStats {
  // gearPmfms: DenormalizedPmfmStrategy[];
  readonly pmfmIdsMap = PmfmIds;
  subtitle?: string;
  footerText?: string;
  logoHeadLeftUrl?: string;
  logoHeadRightUrl?: string;
  strataEnabled?: boolean;
  saleTypes?: string[];
  locationType?: string[];
  strategy: Strategy;
  measurementValues: {
    trip: MeasurementFormValues;
    operations: MeasurementFormValues[];
  };
  pmfms: {
    trip: IPmfm[];
    operation: IPmfm[];
  };
  pmfmsByIds?: {
    trip?: { [key: number]: IPmfm };
    operation?: { [key: number]: IPmfm };
  };
}

@Component({
  selector: 'app-form-trip-report',
  templateUrl: './form-trip.report.html',
  styleUrls: ['../trip.report.scss', './form-trip.report.scss', '../../../../data/report/base-report.scss'],
  providers: [{ provide: TripReportService, useClass: FormTripReportService }],
  encapsulation: ViewEncapsulation.None,
})
export class FormTripReport extends AppDataEntityReport<Trip, number, FormTripReportStats> {
  protected logPrefix = 'trip-form-report';
  protected readonly isBlankFormParam = 'blank-form';
  protected isBlankForm: boolean;
  protected readonly nbOfOpOnBalankPage = 9;
  protected readonly maxLinePeerTable = 9;

  protected readonly tripService: TripService;
  protected readonly referentialRefService: ReferentialRefService;
  protected readonly strategyRefService: StrategyRefService;

  protected filterPmfmForOperationTable = (pmfm: IPmfm): boolean => {
    return ![PmfmIds.HAS_INDIVIDUAL_MEASURES, PmfmIds.TRIP_PROGRESS].includes(pmfm.id);
  };

  constructor(injector: Injector) {
    super(injector, Trip, FormTripReportStats);
    this.tripService = injector.get(TripService);
    this.referentialRefService = injector.get(ReferentialRefService);
    this.strategyRefService = injector.get(StrategyRefService);

    this.isBlankForm = new URLSearchParams(window.location.search).has(this.isBlankFormParam);
  }

  protected async loadData(id: number, opts?: any): Promise<Trip> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: Trip;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      const realData = await this.tripService.load(id, { ...opts, withOperation: false });
      data = Trip.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
        operations: Array(this.nbOfOpOnBalankPage)
          .fill(null)
          .reduce((acc, _, idx) => {
            const op = Operation.fromObject({ id: idx + 1 });
            acc.push(op);
            return acc;
          }, []),
      });
    } else {
      data = await this.tripService.load(id, { ...opts, withOperation: true });
    }
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return data;
  }

  protected computeSlidesOptions(data: Trip, stats: FormTripReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: 210 * 4,
      height: 297 * 4,
      center: false,
    };
  }

  protected async computeStats(data: Trip, opts?: IComputeStatsOpts<FormTripReportStats>): Promise<FormTripReportStats> {
    const stats = new FormTripReportStats();
    stats.program = await this.programRefService.loadByLabel(data.program.label);
    stats.strategy = await this.loadStrategy(stats.program, data);
    const strategyId = stats.strategy?.id;
    // TODO Load strategy (by program, date/time, location)

    stats.pmfms = isNotNil(strategyId)
      ? {
          trip: await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.TRIP,
            strategyId,
          }),
          operation: await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.OPERATION,
            strategyId,
          }),
        }
      : {
          trip: [],
          operation: [],
        };

    stats.pmfmsByIds = {
      trip: splitById(stats.pmfms.trip),
      operation: splitById(stats.pmfms.operation),
    };

    stats.measurementValues = {
      trip: MeasurementUtils.toMeasurementValues(data.measurements),
      operations: data.operations.map((op) => MeasurementUtils.toMeasurementValues(op.measurements)),
    };

    stats.subtitle = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_SUBTITLE);
    stats.footerText = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_FOOTER);
    stats.logoHeadLeftUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_LEFT_URL);
    stats.logoHeadRightUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_RIGHT_URL);
    stats.strataEnabled = stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLING_STRATA_ENABLE);
    stats.saleTypes = (await this.referentialRefService.loadAll(0, 1000, null, null, { entityName: 'SaleType' })).data.map((i) => i.label);
    stats.locationType = (await this.referentialRefService.loadAll(0, 1000, null, null, { entityName: 'Location' })).data.map((i) => i.label);

    // const mytest = (await this.referentialRefService.loadAll(0, 1000, null, null, { entityName: 'Location' }));
    console.debug('MYTEST TOTO', data, stats, this.i18nContext, this.i18nContextSuffix);
    return stats;
  }

  protected async loadStrategy(program: Program, data: Trip) {
    const strategyResolution = program.getProperty<DataStrategyResolution>(ProgramProperties.DATA_STRATEGY_RESOLUTION);
    switch (strategyResolution) {
      case DataStrategyResolutions.SPATIO_TEMPORAL:
        return this.strategyRefService.loadByFilter({
          programId: program.id,
          acquisitionLevels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION],
          startDate: data.departureDateTime,
          endDate: data.departureDateTime,
          location: data.departureLocation,
        });
      case DataStrategyResolutions.NONE:
        return null;
      case DataStrategyResolutions.LAST:
        return this.strategyRefService.loadByFilter({
          programId: program.id,
          acquisitionLevels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION],
        });
      // TODO : DataStrategyResolutionsUSER_SELECT
    }
  }

  protected async computeTitle(data: Trip, stats: FormTripReportStats): Promise<string> {
    // TODO
    return "DOSSIER D'OBSERVATION EN MER";
  }

  protected computeDefaultBackHref(data: Trip, stats: FormTripReportStats): string {
    return `/trips/${data.id}`;
  }

  protected computeShareBasePath(): string {
    // TODO
    return 'trip/report/form';
  }

  protected(data: Trip, stats: FormTripReportStats): URL {
    // TODO Solve path in parrent fuction
    if (this.uuid) return new URL(`${this.baseHref}/${this.computeShareBasePath()}?uuid=${this.uuid}`);
    else return new URL(window.location.origin + this.computeDefaultBackHref(data, stats) + '/report/form');
  }

  protected computeI18nContext(stats: FormTripReportStats): IReportI18nContext {
    return {
      ...super.computeI18nContext(stats),
      pmfmPrefix: 'TRIP.REPORT.FROM.PMFM.',
    };
  }
}
