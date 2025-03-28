import { ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { ReportAppendixSection, ReportTips } from '@app/data/report/report-component.class';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { IRevealExtendedOptions, RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { firstTruePromise, isNotEmptyArray, WaitForOptions } from '@sumaris-net/ngx-components';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { FormReportPageDimensions } from './common-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { IReportI18nContext } from './base-report.class';

interface AppendixBloc {
  index: string;
  title: string;
  columnBreak: boolean;
  items?: { label: string; name: string }[];
}

interface AppendixPage {
  sectionTitle: string;
  blocks: AppendixBloc[];
}

interface ReportAnnexPageDimensions {
  baseMargin: number;
  headerHeight: number;
  pageContentWidth: number;
  pageContentHeight: number;
  blockWidth: number;
  rowHeight: number;
  reportTipsTableMarginBottom: number;
  blockTitleHeight: number;
  itemTitleHeight: number;
  itemHeight: number;
  blockMarginVertical: number;
  blockMarginHorizontal: number;
}

@Component({
  selector: 'report-appendix',
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, ReportChunkModule],
  templateUrl: './report-appendix.html',
  styleUrls: ['./report-appendix.scss', './base-form-report.scss'],
})
export class ReportAppendix implements OnInit, OnDestroy {
  private logPrefix = '[report-appendix] ';

  protected _revealOptions: Partial<IRevealExtendedOptions>;
  protected readonly cd = inject(ChangeDetectorRef);

  protected loadingSubject = new BehaviorSubject<boolean>(true);
  protected readyToInitialize = new BehaviorSubject<boolean>(false);
  protected readonly destroySubject = new Subject<void>();
  protected subscriptions = new Subscription();

  protected pageDimensions: ReportAnnexPageDimensions;
  protected pages: AppendixPage[];

  @ViewChild(RevealComponent, { static: false }) protected reveal: RevealComponent;

  @Input({ required: true }) isPrintingPDF: boolean;
  @Input({ required: true }) parentPageDimensions: FormReportPageDimensions;
  @Input({ required: true }) titleColor: string;
  @Input({ required: true }) i18nContext: IReportI18nContext;
  @Input({ required: true }) logoHeadRightUrl: string;
  @Input({ required: true }) logoHeadLeftUrl: string;

  get loaded(): boolean {
    return !this.loadingSubject.value;
  }
  get loading(): boolean {
    return this.loadingSubject.value;
  }

  set data(value: ReportAppendixSection[]) {
    if (isNotEmptyArray(value)) {
      this.pages = this.splitSectionsIntoChunks(value);
    }
    this.markAsLoaded();
  }

  @Input({ required: true }) set revealOptions(options: Partial<IRevealExtendedOptions>) {
    this._revealOptions = {
      ...options,
      autoInitialize: false,
    };
  }

  ngOnInit() {
    this.computePageDimensions();
    this.subscriptions.add(
      this.loadingSubject.subscribe((value) => {
        if (value == false) {
          setTimeout(() => {
            this.markAsReadyToInitialize();
          }, 500);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.destroySubject.next();
  }

  async waitIdle(opts: WaitForOptions) {
    if (this.readyToInitialize.value) return;
    await firstTruePromise(this.readyToInitialize, { stop: this.destroySubject, ...opts });
  }

  async initializeReveal() {
    await this.reveal.initialize();
  }

  protected computePageDimensions() {
    const baseMargin = 25;
    const headerHeight = 72;
    const pageContentWidth = this.parentPageDimensions.pageWidth - baseMargin;
    const pageContentHeight = this.parentPageDimensions.pageHeight - baseMargin * 2 - headerHeight - 30;
    const blockWidth = pageContentWidth / 2 - baseMargin;
    this.pageDimensions = {
      baseMargin,
      headerHeight,
      pageContentWidth,
      pageContentHeight,
      blockWidth,
      rowHeight: 24,
      reportTipsTableMarginBottom: 12,
      blockMarginHorizontal: 20,
      blockMarginVertical: 20,
      blockTitleHeight: 50,
      itemHeight: 30,
      itemTitleHeight: 30,
    };
  }

  protected markAsLoaded(opts = { emitEvent: true }) {
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected markAsReadyToInitialize(opts = { emitEvent: true }) {
    if (!this.readyToInitialize.value) {
      this.readyToInitialize.next(true);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected splitSectionsIntoChunks(data: ReportAppendixSection[]): AppendixPage[] {
    const pages: AppendixPage[] = [];
    const availableHeightOnOneColumn = this.pageDimensions.pageContentHeight;
    let currentPage: AppendixPage;
    for (const section of data) {
      currentPage = { sectionTitle: section.title, blocks: [] };
      let remainHeightOnCurrentColumn = availableHeightOnOneColumn;
      let onRightSide = false;
      let columnBreak = false;
      for (const block of section.blocks) {
        let nbDisplayedLines = 0;
        const nbLinesToDisplay = block.items.length;
        let nbRemainLineToDisplay = nbLinesToDisplay;
        while (nbRemainLineToDisplay > 0) {
          const nbLinesThatCanBeDisplayed = this.computeNbLinesThatCanBeDisplayed(remainHeightOnCurrentColumn);
          // If have not enough available place to current column
          // go on right column or create new page
          if (nbLinesThatCanBeDisplayed < 1) {
            if (onRightSide) {
              // Add New page
              pages.push(currentPage);
              currentPage = { sectionTitle: section.title, blocks: [] };
              onRightSide = false;
            } else {
              // Mark that we jump on right column
              onRightSide = true;
              columnBreak = true;
            }
            remainHeightOnCurrentColumn = availableHeightOnOneColumn;
            continue;
          }
          const nbLinesThatBeDisplayed = Math.min(nbLinesThatCanBeDisplayed, nbRemainLineToDisplay);
          currentPage.blocks.push({
            index: block.index,
            title: block.title,
            items: block.items.slice(nbDisplayedLines, nbDisplayedLines + nbLinesThatBeDisplayed),
            columnBreak: columnBreak,
          });
          columnBreak = false;
          nbDisplayedLines += nbLinesThatBeDisplayed;
          nbRemainLineToDisplay -= nbLinesThatBeDisplayed;
          remainHeightOnCurrentColumn -= this.computeBlockHeight(nbLinesThatBeDisplayed);
        }
      }
    }

    pages.push(currentPage);
    return pages;
  }

  private computeBlockHeight(nbItems: number): number {
    return this.pageDimensions.rowHeight * (nbItems + 1) + this.pageDimensions.baseMargin;
  }

  private heightToNbLine(remainSpace: number): number {
    return Math.trunc(remainSpace / this.pageDimensions.rowHeight);
  }

  private computeNbLinesThatCanBeDisplayed(remainHeightOnCurrentColumn: number) {
    // Remove title line + bottom margin
    const availableHeight = remainHeightOnCurrentColumn - this.pageDimensions.rowHeight - this.pageDimensions.baseMargin;
    return Math.trunc(availableHeight / this.pageDimensions.rowHeight);
  }
}
