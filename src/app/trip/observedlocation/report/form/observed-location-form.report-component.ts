import { Component, Input, ViewEncapsulation, numberAttribute } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { CommonReportComponentStats, ReportAppendixSection, ReportComponent } from '@app/data/report/report-component.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { EntityAsObjectOptions } from '@sumaris-net/ngx-components';
import { ObservedLocation } from '../../observed-location.model';
import { IDenormalizedPmfm } from '@app/referential/services/model/pmfm.model';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';

export class ObservedLocationFormReportComponentStats extends CommonReportComponentStats {
  options: {
    subtitle: string;
  };
  fromObject(source: any) {
    this.fromObject(source);
    this.options = source.options;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      options: this.options,
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, AppReferentialPipesModule],
  selector: 'observed-location-form-report-component',
  templateUrl: './observed-location-form.report-component.html',
  styleUrls: ['../../../../data/report/base-report.scss', '../../../../data/report/base-form-report.scss', './observed-location-form.report.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ObservedLocationFormReportComponent extends ReportComponent<ObservedLocation, ObservedLocationFormReportComponentStats> {
  @Input({ required: true }) displayAttributesLocation: string[];
  @Input({ required: true }) pmfms: IDenormalizedPmfm[];
  constructor() {
    super(ObservedLocation, ObservedLocationFormReportComponentStats);
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    return []; // TODO
  }

  protected async computeStats(
    data: ObservedLocation,
    opts?: IComputeStatsOpts<ObservedLocationFormReportComponentStats>
  ): Promise<ObservedLocationFormReportComponentStats> {
    const stats = new ObservedLocationFormReportComponentStats();

    stats.options = {
      subtitle: this.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_SUBTITLE) || this.program.description,
    };

    console.debug('MYTEST data/stats', { data, stats });
    return stats;
  }
}
