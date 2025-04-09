import { Component, Input, ViewEncapsulation, inject } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { CommonReportContentStats, ReportAppendixSection, ReportContent } from '@app/data/report/report.content.class';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { DenormalizedBatchService } from '@app/trip/denormalized-batch/denormalized-batch.service';
import { Sale } from '@app/trip/sale/sale.model';
import { EntityAsObjectOptions, ReferentialRef, referentialToString } from '@sumaris-net/ngx-components';

export class SaleFormReportContentStats extends CommonReportContentStats {
  fromObject(source: any) {
    super.fromObject(source);
  }
  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, AppReferentialPipesModule, ReportChunkModule],
  selector: 'sale-form-report-content',
  templateUrl: './sale-form.report.content.html',
  styleUrls: ['../../../data/report/base-report.scss', '../../../data/report/base-form-report.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SaleFormReportContent extends ReportContent<Sale, SaleFormReportContentStats> {
  @Input({ required: true }) displayAttributes: {
    location: string[];
    taxonGroup: string[];
    vesselSnapshot: string[];
  };
  protected readonly denormalizedBatchService: DenormalizedBatchService = inject(DenormalizedBatchService);

  @Input({ required: true }) observedSpecie: ReferentialRef;

  constructor() {
    super(Sale, SaleFormReportContentStats);
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    return []; // There is not appendix blocks
  }

  protected async computeStats(data: Sale, opts?: IComputeStatsOpts<SaleFormReportContentStats>): Promise<SaleFormReportContentStats> {
    const stats = new SaleFormReportContentStats();

    stats.headerItems = this.computeHeaderItems(data);

    return stats;
  }

  private computeHeaderItems(sale: Sale): string[] {
    const vessel = this.isBlankForm
      ? '.................................'
      : referentialToString(sale.vesselSnapshot, this.displayAttributes.vesselSnapshot);
    const observedSpecie = this.isBlankForm
      ? '.................................'
      : referentialToString(this.observedSpecie, this.displayAttributes.taxonGroup);
    return [
      `${this.translate.instant('SALE.REPORT.FORM.VESSEL')}${this.translate.instant('COMMON.COLON')}&nbsp;${vessel}`,
      `${this.translate.instant('SALE.REPORT.FORM.SPECIE')}${this.translate.instant('COMMON.COLON')}&nbsp;${observedSpecie}`,
    ];
  }

  //private async computeDenormalizedBatchByLanding(data: Landings) {
  //await this.denormalizedBatchService.denormalizeObservedLocation
  //}
}
