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
  protected pages: ReportAppendixSection[][];

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
    const pageContentHeight = this.parentPageDimensions.pageHeight - baseMargin * 2 - headerHeight;
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

  protected splitSectionsIntoChunks(data: ReportAppendixSection[]): ReportAppendixSection[][] {
    const result: ReportAppendixSection[][] = [];

    // * 2 -> pages are splited into 2 columns
    const pageHeight = this.pageDimensions.pageContentHeight * 2;
    let currentPage: ReportAppendixSection[] = [];
    let currentPageRemainingHeight = pageHeight;
    let currentSection: ReportAppendixSection;

    // For each section
    for (const section of data) {
      // For each blocks
      for (const block of section.blocks) {
        const blockHeight = this.computeBlockHeight(block);

        // Not enough height: slip
        if (!currentSection || blockHeight > currentPageRemainingHeight) {
          // Flush the current page (is not empty)
          if (isNotEmptyArray(currentPage)) result.push(currentPage);

          // Create a new page, and new section
          currentPage = [];
          currentPageRemainingHeight = pageHeight - this.pageDimensions.blockTitleHeight;
          currentSection = { title: section.title, blocks: [] };
          currentPage.push(currentSection);
        }

        currentSection.blocks = currentSection.blocks.concat(block);
        currentPageRemainingHeight -= blockHeight;
      }
    }

    // Add last page
    if (isNotEmptyArray(currentPage)) result.push(currentPage);

    return result;
  }

  protected computeBlockHeight(tips: ReportTips): number {
    const titleHeight = this.pageDimensions.rowHeight;
    const linesHeight = this.pageDimensions.rowHeight * tips.items?.length;
    const marginBottom = this.pageDimensions.reportTipsTableMarginBottom;
    return titleHeight + linesHeight + 30; // 30 for the table padding top and bottom
  }
}
