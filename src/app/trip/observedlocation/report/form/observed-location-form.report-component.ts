import { Component, Input, ViewEncapsulation } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { CommonReportComponentStats, ReportAppendixSection, ReportComponent } from '@app/data/report/report-component.class';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { EntityAsObjectOptions } from '@sumaris-net/ngx-components';
import { ObservedLocation } from '../../observed-location.model';

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
  imports: [AppCoreModule, AppSharedReportModule, AppReferentialPipesModule, ReportChunkModule],
  selector: 'observed-location-form-report-component',
  templateUrl: './observed-location-form.report-component.html',
  styleUrls: ['../../../../data/report/base-report.scss', '../../../../data/report/base-form-report.scss', './observed-location-form.report.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ObservedLocationFormReportComponent extends ReportComponent<ObservedLocation, ObservedLocationFormReportComponentStats> {
  @Input({ required: true }) displayAttributesLocation: string[];
  @Input({ required: true }) pmfms: IPmfm[];
  @Input({ required: true }) footerText: string;

  constructor() {
    super(ObservedLocation, ObservedLocationFormReportComponentStats);
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    return []; // There is not appendix blocks
  }

  protected async computeStats(
    data: ObservedLocation,
    opts?: IComputeStatsOpts<ObservedLocationFormReportComponentStats>
  ): Promise<ObservedLocationFormReportComponentStats> {
    const stats = new ObservedLocationFormReportComponentStats();

    stats.options = {
      subtitle: this.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_SUBTITLE) || this.program.description,
    };

    return stats;
  }
}
