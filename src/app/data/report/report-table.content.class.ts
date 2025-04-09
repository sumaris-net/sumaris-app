import { Component, Directive, inject, Input, numberAttribute } from '@angular/core';
import { AppReferentialModule } from '@app/referential/referential.module';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { IDenormalizedPmfm, IPmfm } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IReferentialRef, isNotNil, SharedPipesModule } from '@sumaris-net/ngx-components';
import { IReportData, IReportI18nContext } from './base-report.class';
import { CommonReportOptions, CommonReportStats } from './common-report.class';
import { ReportContent, ReportPmfmsTipsByPmfmIds, ReportTips } from './report.content.class';
import { PmfmUtils } from '@app/referential/services/model/pmfm-utils';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';

export class ReportTableContentPageDimension {
  columnPmfmWidth: number;
  columnPmfmWidthCompact: number;
  columnPmfmBooleanWidth: number;
  columnPmfmNumberWidth: number;
  columnPmfmDateTimeWidth: number;
  columnPmfmQualitativeValueWidth: number;
  columnPmfmLatLongWidth: number;
}

@Component({
  selector: 'table-head-pmfm-name-report-chunk',
  standalone: true,
  imports: [SharedPipesModule, AppReferentialModule],
  template: `
    @if (pmfm | isNotNil) {
      <div [class.tips]="pmfmTipsByPmfmIds | mapGet: pmfm.id | isNotNil" [class.optional]="!pmfm.required">
        <span>
          {{ pmfm | pmfmName: { i18nPrefix: i18nContext.pmfmPrefix || i18nContext.prefix, i18nSuffix: i18nContext.suffix } }}
          @if ((pmfm | getPmfmExtendedType) === 'boolean') {
            ({{ 'TRIP.REPORT.FORM.YES_OR_NO' | translate }})
          }
        </span>
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
      &.tips {
        width: calc(100% - 4px);
      }
    }
  `,
})
export class TableHeadPmfmNameReportChunk {
  @Input({ required: true }) pmfm: IPmfm;
  @Input({ required: true }) i18nContext: IReportI18nContext;
  @Input({ required: true }) pmfmTipsByPmfmIds: ReportPmfmsTipsByPmfmIds;
}

@Directive()
export abstract class ReportTableContent<
  T extends IReportData | IReportData[],
  S extends CommonReportStats,
  D extends ReportTableContentPageDimension,
  O extends CommonReportOptions = CommonReportOptions,
> extends ReportContent<T, S, O> {
  protected logPrefix = '[report-table-content] ';
  protected pageDimensions: D;
  protected readonly pmfmsIdToShortCutTips = [PmfmIds.SEA_STATE];
  protected readonly programRefService = inject(ProgramRefService);
  protected readonly pmfmNamePipe = inject(PmfmNamePipe);
  protected readonly pmfmIds = PmfmIds;

  @Input() hiddenPmfms: number[] = [];

  @Input({ required: true, transform: numberAttribute }) limitTipsToShowOnAppendix: number;

  async ngOnStart(opts?: any): Promise<void> {
    this.pageDimensions = this.computePageDimensions();
    return super.ngOnStart(opts);
  }

  protected readonly sortByTipsIndex = function (a: ReportTips, b: ReportTips) {
    return (a.index || '').localeCompare(b.index || '');
  };

  protected _computePageDimensions(): ReportTableContentPageDimension {
    return {
      columnPmfmWidth: 90,
      columnPmfmWidthCompact: 30,
      columnPmfmBooleanWidth: 30,
      columnPmfmNumberWidth: 60,
      columnPmfmDateTimeWidth: 135,
      columnPmfmQualitativeValueWidth: 45,
      columnPmfmLatLongWidth: 145,
    };
  }

  protected abstract computePageDimensions(): D;

  protected computeReportPmfmsTips(tablePart: number[][], pmfms: IDenormalizedPmfm[], limitToPutInAnnex: number): ReportPmfmsTipsByPmfmIds[] {
    return tablePart.reduce((result: Array<any>, part, index) => {
      result[index] = pmfms
        .slice(part[0], part[1])
        .filter((pmfm) => isNotNil(pmfm) && PmfmUtils.isQualitative(pmfm))
        .reduce((res, pmfm, index) => {
          const title = this.pmfmNamePipe.transform(pmfm, { i18nPrefix: this.i18nContext?.pmfmPrefix, i18nSuffix: this.i18nContext?.suffix });
          res[pmfm.id] = {
            index: (index + 1).toString(),
            title: pmfm.name,
            showOnAppendix: pmfm.qualitativeValues.length > limitToPutInAnnex,
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
      showOnAppendix: refs.length > limitToPutInAnnex,
      items: refs.map((ref) => {
        return { label: ref.label, name: ref.name };
      }),
    };
  }

  protected computePmfmColumnsWidthByPmfmIds(
    pmfms: IPmfm[],
    compact: boolean,
    showQualitativeValuesCheckBox: boolean,
    defaultColumnWidthByPmfmId?: { [key: number]: number }
  ): { [key: number]: number } {
    if (compact) {
      return pmfms.reduce((result, pmfm) => {
        if (isNotNil(defaultColumnWidthByPmfmId?.[pmfm.id])) {
          result[pmfm.id] = defaultColumnWidthByPmfmId[pmfm.id];
        } else {
          result[pmfm.id] = this.pageDimensions.columnPmfmWidthCompact;
        }
        return result;
      }, {});
    }
    const result: { [key: number]: number } = {};
    for (const pmfm of pmfms) {
      if (isNotNil(defaultColumnWidthByPmfmId?.[pmfm.id])) {
        result[pmfm.id] = defaultColumnWidthByPmfmId[pmfm.id];
        continue;
      }
      const type = PmfmUtils.getExtendedType(pmfm);
      if (type === 'boolean') {
        // Boolean -> half size
        result[pmfm.id] = this.pageDimensions.columnPmfmBooleanWidth;
      } else if (type === 'integer' || type === 'double') {
        result[pmfm.id] = this.pageDimensions.columnPmfmNumberWidth;
      } else if (type === 'dateTime') {
        result[pmfm.id] = this.pageDimensions.columnPmfmDateTimeWidth;
      } else if (type === 'qualitative_value') {
        if (showQualitativeValuesCheckBox) {
          const nbQualitativeValue = pmfm.qualitativeValues.length;
          result[pmfm.id] = this.pageDimensions.columnPmfmQualitativeValueWidth * Math.round(nbQualitativeValue / 2);
        } else {
          result[pmfm.id] = this.pageDimensions.columnPmfmQualitativeValueWidth;
        }
      } else if (type === 'latitude' || type === 'longitude') {
        result[pmfm.id] = this.pageDimensions.columnPmfmLatLongWidth;
      } else {
        result[pmfm.id] = this.pageDimensions.columnPmfmWidth;
      }
    }
    return result;
  }

  protected computeTablePart(
    pmfms: IPmfm[],
    columnWidthByPmfmsIds: { [key: number]: number } | null,
    availableWidthForTable: number,
    leftPartWidth: number,
    rightPartWidth: number
  ): number[][] {
    columnWidthByPmfmsIds = columnWidthByPmfmsIds || {};
    const availableWidthOnePage = availableWidthForTable - rightPartWidth - leftPartWidth;

    // const totalWidthConsumedByAllPmfms = Object.values(columnWidthByPmfmsIds).reduce((total, width) => total + width, 0);
    const totalWidthConsumedByAllPmfms = pmfms.reduce((total, pmfm) => total + columnWidthByPmfmsIds[pmfm.id], 0);

    // If all pmfm column can fit in one page : there is only one table part that contain all pmfms
    if (totalWidthConsumedByAllPmfms <= availableWidthOnePage) return [[0, Object.keys(columnWidthByPmfmsIds).length]];

    const availableWidthOnFirstPage = availableWidthForTable - leftPartWidth;
    const availableWidthOnLastPage = availableWidthForTable - rightPartWidth;

    // If all columns can fit in tow table part : return two table part with all the content
    if (totalWidthConsumedByAllPmfms <= availableWidthOnePage + availableWidthOnLastPage) {
      let nbPmfmsThatCanFitOnFirstPage = 0;
      let widthConsumedOnFirstPage = 0;
      for (const pmfm of pmfms) {
        widthConsumedOnFirstPage += columnWidthByPmfmsIds[pmfm.id];
        if (widthConsumedOnFirstPage > availableWidthOnFirstPage) break;
        nbPmfmsThatCanFitOnFirstPage++;
      }
      return [
        [0, nbPmfmsThatCanFitOnFirstPage - 1],
        [nbPmfmsThatCanFitOnFirstPage - 1, pmfms.length],
      ];
    }

    // Else use middle page
    const availableWidthOnMiddlePage = availableWidthForTable;

    // Compute nbPmfms on the first page
    let nbPmfmsThatCanFitOnFirstPage = 0;
    let widthConsumedOnFirstPage = 0;
    for (const pmfm of pmfms) {
      widthConsumedOnFirstPage += columnWidthByPmfmsIds[pmfm.id];
      if (widthConsumedOnFirstPage > availableWidthOnFirstPage) break;
      nbPmfmsThatCanFitOnFirstPage++;
    }

    const pagePart = [[0, nbPmfmsThatCanFitOnFirstPage - 1]];
    let remainPmfms = pmfms.slice(nbPmfmsThatCanFitOnFirstPage - 1);
    let remainWidth = remainPmfms.reduce((total, pmfm) => total + columnWidthByPmfmsIds[pmfm.id], 0);

    while (remainWidth > availableWidthOnLastPage) {
      let nbPmfmsThatCanFitOnThisPage = 0;
      let widthConsumedByThisPage = 0;
      for (const pmfm of remainPmfms) {
        widthConsumedByThisPage += columnWidthByPmfmsIds[pmfm.id];
        if (widthConsumedByThisPage > availableWidthOnMiddlePage) break;
        remainWidth -= columnWidthByPmfmsIds[pmfm.id];
        nbPmfmsThatCanFitOnThisPage++;
      }
      remainPmfms = remainPmfms.slice(nbPmfmsThatCanFitOnThisPage - 1);
      const currentPagePartNum = pagePart[pagePart.length - 1][1] - 1;
      pagePart.push([currentPagePartNum, currentPagePartNum + nbPmfmsThatCanFitOnFirstPage]);
    }

    // Append last page
    pagePart.push([pagePart[pagePart.length - 1][1]]);

    return pagePart;
  }
}
