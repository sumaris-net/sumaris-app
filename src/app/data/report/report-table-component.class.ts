import { Component, Directive, Input } from '@angular/core';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { SharedPipesModule, isNotNil } from '@sumaris-net/ngx-components';
import { IReportData, IReportI18nContext } from './base-report.class';
import { CommonReportOptions, CommonReportStats } from './common-report.class';
import { ReportComponent } from './report-component.class';
import { PmfmIds } from '@app/referential/services/model/model.enum';

export interface ReportTableTip {
  tipsNum: number;
  text: string;
}

export interface ReportTableComponentPageDimension {}

export interface ReportPmfmsTipsByPmfmIds {
  [key: number]: ReportTableTip;
}
[];

@Component({
  selector: 'table-tips-report-chunk',
  standalone: true,
  imports: [SharedPipesModule],
  template: `
    <ul [style.margin-top]="'10px'">
      <ng-content></ng-content>
      @for (tip of tips; track $index) {
        <li>
          ({{ tip | mapGet: 'tipsNum' }}) :
          <span [innerHTML]="tip | mapGet: 'text'"></span>
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      margin: 0 var(--page-horizontal-margin);
      padding: 0;
      list-style: none;
      font-size: var(--font-small);
    }
  `,
})
export class TableTipsReportChunk {
  @Input({ required: true }) tips: ReportTableTip[];
}

@Component({
  selector: 'table-head-pmfm-name-report-chunk',
  standalone: true,
  imports: [SharedPipesModule, AppReferentialPipesModule],
  template: `
    @if (pmfm | isNotNil) {
      <div>
        {{ pmfm | pmfmName: { i18nPrefix: i18nContext.prefix, i18nSuffix: i18nContext.suffix } }}
        @if (pmfmTipsByPmfmIds | mapGet: pmfm.id | isNotNil) {
          <sup
            ><b>({{ pmfmTipsByPmfmIds | mapGet: pmfm.id | mapGet: 'tipsNum' }})</b></sup
          >
        }
      </div>
    }
  `,
  styles: `
    div {
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
      transform: rotate(-90deg);
      height: var(--col-width);
      width: var(--row-title-height);
      padding: 0 4px;
      position: relative;
      left: calc((var(--col-width) * -1) + 6px);
    }
  `,
})
export class TableHeadPmfmNameReportChunk {
  @Input({ required: true }) pmfm: IPmfm;
  @Input({ required: true }) i18nContext: IReportI18nContext;
  @Input({ required: true }) pmfmTipsByPmfmIds: ReportPmfmsTipsByPmfmIds;
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

  async ngOnStart(opts?: any): Promise<void> {
    this.pageDimensions = this.computePageDimensions();
    return super.ngOnStart(opts);
  }

  protected readonly sortByTipsIndex = function (a: ReportTableTip, b: ReportTableTip) {
    return a.tipsNum == b.tipsNum ? 0 : a.tipsNum - b.tipsNum;
  };

  protected abstract computePageDimensions(): D;

  protected computeTablePart(
    pmfms: IPmfm[],
    availableWidthForTable: number,
    leftPartWidth: number,
    rightPartWidth: number,
    pmfmColumnWidth: number
  ): number[][] {
    const availableWidthOnePage = availableWidthForTable - rightPartWidth - leftPartWidth;
    const nbPmfmsThatCanFitOnOnePage = Math.trunc(availableWidthOnePage / pmfmColumnWidth);

    // If all pmfm column can fit in one page : there is only one table part that contain all pmfms
    if (pmfms.length <= nbPmfmsThatCanFitOnOnePage) return [[0, pmfms.length]];

    const availableWidthOnFirstPage = availableWidthForTable - leftPartWidth;
    const availableWidthOnLastPage = availableWidthForTable - rightPartWidth;

    const nbPmfmsThatCanFitOnFirstPage = Math.trunc(availableWidthOnFirstPage / pmfmColumnWidth);
    const nbPmfmsThatCanFitOnLastPage = Math.trunc(availableWidthOnLastPage / pmfmColumnWidth);

    // If all columns can fit in tow table part : return two table part with all the content
    if (pmfms.length <= nbPmfmsThatCanFitOnFirstPage + nbPmfmsThatCanFitOnLastPage) {
      return [
        [0, nbPmfmsThatCanFitOnFirstPage - 1],
        [nbPmfmsThatCanFitOnFirstPage - 1, pmfms.length],
      ];
    }

    const nbPmfmsThatCanFitOnOtherPage = Math.trunc(availableWidthForTable / pmfmColumnWidth);

    // Else add enough part to display everything
    const result = [[0, nbPmfmsThatCanFitOnFirstPage]];
    for (let i = nbPmfmsThatCanFitOnFirstPage; i <= pmfms.length - nbPmfmsThatCanFitOnLastPage; i += nbPmfmsThatCanFitOnOtherPage) {
      result.push([i, i + nbPmfmsThatCanFitOnOtherPage]);
    }
    // concat add the last part
    return result.concat([result[-1][1], pmfms.length]);
  }

  protected computeReportPmfmsTips(tablePart: number[][], pmfms: IPmfm[]): ReportPmfmsTipsByPmfmIds {
    return tablePart.reduce((result: Array<any>, part, index) => {
      result[index] = pmfms
        .slice(part[0], part[1])
        .filter((pmfm) => isNotNil(pmfm) && PmfmUtils.isQualitative(pmfm))
        .reduce((res, pmfm, index) => {
          res[pmfm.id] = {
            tipsNum: index + 1,
            text: pmfm.qualitativeValues
              .map((qv) => '<b>' + qv.label + ' : </b>' + (this.pmfmsIdToShortCutTips.includes(pmfm.id) ? qv.name.split(',')[0] : qv.name))
              .join(' ; '),
          };
          return res;
        }, {});
      return result;
    }, []);
  }
}
