import { Component, Directive, Input, inject } from '@angular/core';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { IDenormalizedPmfm, IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IReferentialRef, SharedPipesModule, isNotNil } from '@sumaris-net/ngx-components';
import { IReportData, IReportI18nContext } from './base-report.class';
import { CommonReportOptions, CommonReportStats } from './common-report.class';
import { ReportComponent } from './report-component.class';

export interface ReportTips {
  index?: string;
  title?: string;
  text?: string;
  items?: { label: string; name: string }[];
  showOnAnnex: boolean;
}

export interface ReportTableComponentPageDimension {}

export interface ReportPmfmsTipsByPmfmIds {
  [key: number]: ReportTips;
}
[];

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
            <u>{{ tip.title }}</u>
            &nbsp;:
          }
          @if (tip.showOnAnnex) {
            <i>{{ 'TRIP.REPORT.FORM.SHOW_ANNEX' | translate }}</i>
          } @else {
            @if (tip.text | isNotNilOrBlank) {
              <span>
                {{ tip.text }}
              </span>
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
    .tip-item {
      margin: 0 0.5em;
    }
    ul {
      margin: 0 var(--page-horizontal-margin);
      padding: 0;
      list-style: none;
      font-size: var(--font-small);
    }
  `,
})
export class TipsReportChunk {
  @Input({ required: true }) tips: ReportTips[];
}

@Component({
  selector: 'table-head-pmfm-name-report-chunk',
  standalone: true,
  imports: [SharedPipesModule, AppReferentialPipesModule],
  template: `
    @if (pmfm | isNotNil) {
      <div [class.compact]="compact" [class.tips]="pmfmTipsByPmfmIds | mapGet: pmfm.id | isNotNil">
        {{ pmfm | pmfmName: { i18nPrefix: i18nContext.prefix, i18nSuffix: i18nContext.suffix } }}
        @if (pmfmTipsByPmfmIds | mapGet: pmfm.id | isNotNil) {
          <sup
            ><b>({{ pmfmTipsByPmfmIds | mapGet: pmfm.id | mapGet: 'index' }})</b></sup
          >
        }
      </div>
    }
  `,
  styles: `
    div {
      margin: 0 2px;
      &.tips {
        width: calc(100% - 4px);
      }
      &.compact {
        text-align: center;
        display: flex;
        justify-content: center;
        align-items: center;
        transform: rotate(-90deg);
        height: var(--col-width);
        width: var(--row-title-height);
        padding: 0 4px;
        position: relative;
        left: calc((var(--col-width) * -1));
        line-height: 8px;
      }
    }
  `,
})
export class TableHeadPmfmNameReportChunk {
  @Input({ required: true }) pmfm: IPmfm;
  @Input({ required: true }) i18nContext: IReportI18nContext;
  @Input({ required: true }) pmfmTipsByPmfmIds: ReportPmfmsTipsByPmfmIds;
  @Input() compact: boolean = true;
}

@Directive()
export abstract class ReportTableComponent<
  T extends IReportData | IReportData[],
  S extends CommonReportStats,
  D extends ReportTableComponentPageDimension,
  O extends CommonReportOptions = CommonReportOptions,
> extends ReportComponent<T, S, O> {
  protected logPrefix = '[report-table-component] ';
  protected pageDimensions: D;
  protected readonly pmfmsIdToShortCutTips = [PmfmIds.SEA_STATE];

  protected translate = inject(TranslateService);

  async ngOnStart(opts?: any): Promise<void> {
    this.pageDimensions = this.computePageDimensions();
    return super.ngOnStart(opts);
  }

  protected readonly sortByTipsIndex = function (a: ReportTips, b: ReportTips) {
    return (a.index || '').localeCompare(b.index || '');
  };

  protected abstract computePageDimensions(): D;

  protected computeReportPmfmsTips(tablePart: number[][], pmfms: IDenormalizedPmfm[], limitToPutInAnnex: number): ReportPmfmsTipsByPmfmIds[] {
    return tablePart.reduce((result: Array<any>, part, index) => {
      result[index] = pmfms
        .slice(part[0], part[1])
        .filter((pmfm) => isNotNil(pmfm) && PmfmUtils.isQualitative(pmfm))
        .reduce((res, pmfm, index) => {
          res[pmfm.id] = {
            index: (index + 1).toString(),
            title: pmfm.name,
            showOnAnnex: pmfm.qualitativeValues.length > limitToPutInAnnex,
            items: pmfm.qualitativeValues.map((qv) => {
              return {
                label: qv.label,
                name: this.pmfmsIdToShortCutTips.includes(pmfm.id) ? qv.name.split(',')[0] : qv.name,
              };
            }),
          };
          return res;
        }, {});
      return result;
    }, []);
  }

  protected computeReferentialRefTips(index: string, title: string, refs: IReferentialRef[], limitToPutInAnnex: number): ReportTips {
    return {
      index: index,
      title: title,
      showOnAnnex: refs.length > limitToPutInAnnex,
      items: refs.map((ref) => {
        return { label: ref.label, name: ref.name };
      }),
    };
  }
}
