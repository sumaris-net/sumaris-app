import { Component, Input, inject } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { MeasurementFormValues, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/component/form/report-chunk.module';
import { ReportComponent } from '@app/data/report/report-component.class';
import { AppReferentialModule } from '@app/referential/referential.module';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { FormTripReportPageDimensions } from '@app/trip/trip/report/form/form-trip.report';
import { Operation } from '@app/trip/trip/trip.model';
import { EntityAsObjectOptions, LatLongPattern, LocalSettingsService, arrayDistinct, isNil, isNotNil, splitById } from '@sumaris-net/ngx-components';

export class OperationFromReportComponentStats extends BaseReportStats {
  options: {
    showStartDate: boolean;
    showEndDate: boolean;
    showFishingStartDateTime: boolean;
    showFishingEndDateTime: boolean;
    allowParentOperation: boolean;
    latLongPattern: LatLongPattern;
  };
  pmfms: IPmfm[];
  pmfmsById: { [key: number]: IPmfm };
  childPmfms: IPmfm[];
  childPmfmsById: { [key: number]: IPmfm };
  tableHeadColspan: number;
  hasPmfm: {
    hasIndividualMeasure: boolean;
    tripProgress: boolean;
  };
  pmfmsTipsByPmfmId: {
    [key: number]: {
      tipsNum: number;
      text: string;
    };
  };
  measurementValues: MeasurementFormValues[];

  fromObject(source: any): void {
    super.fromObject(source);
    this.options = source.options;
    this.pmfms = source.pmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.pmfmsById = splitById(this.pmfms);
    this.childPmfms = source.childPmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.childPmfmsById = splitById(this.childPmfms);
    this.tableHeadColspan = source.tableHeadColspan;
    this.hasPmfm = source.hasPmfm;
    this.pmfmsTipsByPmfmId = source.pmfmsLegendByPmfmId;
    this.measurementValues = source.measurementValues;
  }

  asObject(opts?: EntityAsObjectOptions) {
    return {
      ...super.asObject(opts),
      options: this.options,
      pmfms: this.pmfms.map((pmfm) => pmfm.asObject(opts)),
      childPmfms: this.childPmfms.map((pmfm) => pmfm.asObject(opts)),
      tableHeadColspan: this.tableHeadColspan,
      hasPmfm: this.hasPmfm,
      pmfmsLegendByPmfmId: this.pmfmsTipsByPmfmId,
      measurementValues: this.measurementValues,
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, AppReferentialModule, AppDataModule, ReportChunkModule],
  selector: 'operation-form-report-component',
  templateUrl: './operation-form.report-component.html',
  styleUrls: ['./operation-form.report-component.scss', '../../../../data/report/base-form-report.scss'],
})
export class OperationFormReportComponent extends ReportComponent<Operation[], OperationFromReportComponentStats> {
  readonly pmfmIdsMap = PmfmIds;
  readonly pageDimensions = Object.freeze({});

  @Input() nbOperationByPage = 20;
  @Input({ required: true }) parentPageDimension: FormTripReportPageDimensions;

  protected logPrefix = '[operation-form-report] ';
  protected programRefService: ProgramRefService = inject(ProgramRefService);

  constructor(protected settings: LocalSettingsService) {
    super(Array<Operation>, OperationFromReportComponentStats);
  }

  protected async computeStats(
    data: Operation[],
    _?: IComputeStatsOpts<OperationFromReportComponentStats>
  ): Promise<OperationFromReportComponentStats> {
    const stats = new OperationFromReportComponentStats();

    const strategyId = this.strategy?.id;

    stats.options = {
      showStartDate: !this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE),
      showEndDate: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE),
      showFishingStartDateTime: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE),
      showFishingEndDateTime: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE),
      allowParentOperation: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION),
      latLongPattern: this.settings.latLongFormat,
    };

    // In the case the header will be more hight, so we have less place du display lines
    if (stats.options.allowParentOperation) {
      this.nbOperationByPage = 8;
    }

    stats.pmfms = isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(this.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.OPERATION,
          strategyId,
        })
      : [];
    stats.pmfmsById = splitById(stats.pmfms);
    stats.childPmfms = isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(this.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.CHILD_OPERATION,
          strategyId,
        })
      : [];
    stats.pmfmsById = splitById(stats.childPmfms);

    // In case of allowParentOperation, also display child pmfm in it own
    // header line for operation table. We also need each array (parent and
    // child pmfms) has the same size to be displayed correctly as table column
    if (stats.options.allowParentOperation) {
      const nbOperationPmfms = stats.pmfms.filter(this.filterPmfmForOperationTable).length;
      const nbChildOperationPmfms = stats.childPmfms.filter(this.filterPmfmForOperationTable).length;
      if (nbOperationPmfms > nbChildOperationPmfms) {
        const diff = nbOperationPmfms - nbChildOperationPmfms;
        stats.childPmfms = [...stats.childPmfms, ...Array(diff - 1).fill(null)];
      } else if (nbChildOperationPmfms > nbOperationPmfms) {
        const diff = nbChildOperationPmfms - nbOperationPmfms;
        stats.pmfms = [...stats.pmfms, ...Array(diff - 1).fill(null)];
      }
    }

    stats.hasPmfm = {
      hasIndividualMeasure: isNotNil(stats.pmfmsById?.[this.pmfmIdsMap.HAS_INDIVIDUAL_MEASURES]),
      tripProgress: isNotNil(stats.pmfmsById?.[this.pmfmIdsMap.TRIP_PROGRESS]),
    };

    stats.tableHeadColspan = 2 + Object.values(stats.hasPmfm).filter((v) => v).length;

    stats.pmfmsTipsByPmfmId = arrayDistinct(
      stats.pmfms
        .concat(stats.options.allowParentOperation ? stats.childPmfms : [])
        .filter((pmfm) => isNotNil(pmfm) && PmfmUtils.isQualitative(pmfm)),
      'id'
    ).reduce((res, pmfm, index) => {
      res[pmfm.id] = {
        tipsNum: index + 1,
        text: pmfm.qualitativeValues.map((qv) => qv.label + ' : ' + qv.name).join(' ; '),
      };
      return res;
    }, {});

    // Get all needed measurement values in suitable format
    stats.measurementValues = data.map((op) => MeasurementUtils.toMeasurementValues(op.measurements));

    return stats;
  }

  protected filterPmfmForOperationTable(pmfm: IPmfm): boolean {
    return isNil(pmfm) || ![PmfmIds.HAS_INDIVIDUAL_MEASURES, PmfmIds.TRIP_PROGRESS].includes(pmfm.id);
  }

  protected markAsLoaded(opts = { emitEvent: true }) {
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }
}
