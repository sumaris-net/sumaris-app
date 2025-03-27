import { Component, Input, ViewEncapsulation } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { CommonReportComponentStats, ReportAppendixSection, ReportComponent } from '@app/data/report/report-component.class';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { Sale } from '@app/trip/sale/sale.model';
import { EntityAsObjectOptions, ReferentialRef, referentialToString } from '@sumaris-net/ngx-components';

export class SaleFormReportComponentStats extends CommonReportComponentStats {
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
  selector: 'sale-form-report-component',
  templateUrl: './sale-form.report-component.html',
  styleUrls: ['../../../data/report/base-report.scss', '../../../data/report/base-form-report.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SaleFormReportComponent extends ReportComponent<Sale, SaleFormReportComponentStats> {
  @Input({ required: true }) displayAttributes: {
    location: string[];
    taxonGroup: string[];
    vesselSnapshot: string[];
  };
  @Input({ required: true }) observedSpecie: ReferentialRef;

  constructor() {
    super(Sale, SaleFormReportComponentStats);
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    return []; // There is not appendix blocks
  }

  protected async computeStats(data: Sale, opts?: IComputeStatsOpts<SaleFormReportComponentStats>): Promise<SaleFormReportComponentStats> {
    const stats = new SaleFormReportComponentStats();

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
}
