import { Component, Directive, inject, Input, OnInit, Optional } from '@angular/core';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { AppBaseReport, BASE_REPORT, IReportData, IReportI18nContext } from './base-report.class';
import { CommonReport, CommonReportOptions, CommonReportStats, FormReportPageDimensions } from './common-report.class';
import { EntityAsObjectOptions, isNil, SharedPipesModule, TranslateContextService } from '@sumaris-net/ngx-components';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { Moment } from 'moment';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

export interface ReportAppendixSection {
  title: string;
  blocks: ReportTips[];
}

export interface ReportTips {
  index?: string;
  title?: string;
  text?: string;
  items?: { label: string; name: string }[];
  showOnAppendix: boolean;
}

export interface ReportPmfmsTipsByPmfmIds {
  [key: number]: ReportTips;
}

@Component({
  selector: 'tips-report-chunk',
  standalone: true,
  imports: [SharedPipesModule, TranslatePipe],
  template: `
    <ul [style.margin-top]="'10px'">
      <ng-content></ng-content>
      @for (tip of tips; track $index) {
        <li>
          @if (tip.index | isNotNilOrBlank) {
            ({{ tip.index }})&nbsp;
          }
          @if (tip.title | isNotNilOrBlank) {
            <u [innerHTML]="tip.title | translate"></u>
            &nbsp;:
          }
          @if (tip.showOnAppendix) {
            <i>{{ 'TRIP.REPORT.FORM.REFER_APPENDIX' | translate }}</i>
          } @else {
            @if (tip.text | isNotNilOrBlank) {
              <span [innerHTML]="tip.text | translate"></span>
            } @else {
              @for (item of tip.items; track $index) {
                <span class="tip-item">
                  <b>{{ item.label }}</b>
                  &nbsp;:&nbsp;{{ item.name }}
                </span>
              }
            }
          }
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      margin: 0 calc(var(--page-horizontal-margin) * 1px);
      padding: 0;
      list-style: none;
      font-size: var(--font-small);

      li {
        b:not(:first-child) {
          margin-inline-start: 0.5em;
        }
        .tip-item:not(:first-child) {
          margin-inline-start: 0.5em;
          b {
            margin-inline-start: 0;
          }
        }
      }
    }
  `,
})
export class TipsReportChunk {
  @Input({ required: true }) tips: ReportTips[];
}

export abstract class CommonReportContentStats extends CommonReportStats {
  headerItems: string[];
  fromObject(source: any) {
    this.headerItems = source.headerItems;
  }
  asObject(opts?: EntityAsObjectOptions): any {
    return {
      headerItems: this.headerItems,
    };
  }
}

@Directive()
export abstract class ReportContent<
  T extends IReportData | IReportData[],
  S extends CommonReportStats,
  O extends CommonReportOptions = CommonReportOptions,
> extends CommonReport<T, S, O> {
  protected logPrefix = '[report-content] ';

  protected translate = inject(TranslateService);
  protected translateContext = inject(TranslateContextService);
  protected baseReport: AppBaseReport<any, any, any>;

  @Input({ required: true }) parentPageDimensions: FormReportPageDimensions;
  @Input({ required: true }) revealOptions: Partial<IRevealExtendedOptions>;
  @Input({ required: true }) i18nContext: IReportI18nContext;
  @Input({ required: true }) program: Program;
  @Input({ required: true }) strategy: Strategy;
  @Input({ required: true }) isBlankForm: boolean;
  @Input({ required: true }) logoHeadLeftUrl: string;
  @Input({ required: true }) logoHeadRightUrl: string;
  @Input() titleComplement: string;
  @Input() footerText: string;
  @Input() footerHelp: string;
  @Input() departureDateTime: Moment;
  @Input() vesselName: string;
  @Input({ required: true }) isPrintingPDF: boolean;
  @Input({ required: true }) rankOrder: number;

  protected constructor(
    protected dataType: new () => T,
    protected statsType: new () => S,
    @Optional() protected options?: O
  ) {
    super(dataType, statsType, options);
    this.baseReport = inject(BASE_REPORT);
    this.baseReport.registerReportComponent(this);
  }

  async start(opts?: any) {
    await this.platform.ready();

    this.markAsReady();

    try {
      // Load or fill this.data, this.stats and this.i18nContext
      await this.ngOnStart(opts);
      this.markAsLoaded();
      this.updateView();
      this.markAsReadyToInitialize();
    } catch (err) {
      // TODO Push error to parent
      console.error(err);
      // this.setError(err);
      this.markAsLoaded();
    }
  }

  async ngOnStart(opts?: any): Promise<void> {
    if (isNil(this.stats)) {
      this.stats = await this.computeStats(this.data, opts);
    }
  }

  abstract computeAppendixBlocks(): ReportAppendixSection[];

  protected flatPmfmTipsForAnnex(pmfmTipsByPmfmIdsAndByTablePart: ReportPmfmsTipsByPmfmIds[]): ReportTips[] {
    const result = pmfmTipsByPmfmIdsAndByTablePart.reduce((result: ReportTips[], item) => {
      const tips = Object.keys(item).map((key) => item[key]);
      tips.forEach((t) => {
        if (t.showOnAppendix) {
          result.push(t);
        }
      });
      return result;
    }, []) as ReportTips[];
    return result.sort((a, b) => a.index.localeCompare(b.index));
  }

  protected checkIfStatsAreComputed() {
    if (isNil(this.stats)) {
      throw new Error('Try to read stats before they are computed');
    }
  }
}
