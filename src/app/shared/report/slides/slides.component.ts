import { AfterViewInit, Component, ContentChildren, ElementRef, EventEmitter, HostListener, Inject, Input, OnDestroy, Output, QueryList, ViewChild } from '@angular/core';
import { ShowToastOptions, sleep, Toasts, waitForFalse, WaitForOptions } from '@sumaris-net/ngx-components';
import { Reveal } from '../reveal';
import { MarkdownComponent } from 'ngx-markdown';
import { BehaviorSubject, Subscription } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { OverlayEventDetail } from '@ionic/core';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';


export interface IRevealOptions {
  config: boolean;
  control?: boolean;
  progress: boolean;
  history: boolean;
  center: boolean;
  autoInitialize: boolean;
  disableLayout: boolean;
  touch: boolean
  embedded: boolean; // Required for multi .reveal div
  keyboardCondition: string;
  [key: string]: any;
}
export interface IReveal {
  initialize();
  destroy();
  layout();
  configure(options: Partial<IRevealOptions>);
}

@Component({
  selector: 'app-slides',
  templateUrl: './slides.component.html',
  styleUrls: ['./slides.component.scss'],
  //encapsulation: ViewEncapsulation.None
})
export class AppSlidesComponent implements AfterViewInit, OnDestroy
{
  private _reveal: Reveal & IReveal;
  private loadingSubject = new BehaviorSubject(true);
  private _subscription = new Subscription();
  private _printing = false;
  private _printIframe: HTMLIFrameElement;

  get loading(): boolean {
    return this.loadingSubject.value;
  }

  get printing(): boolean {
    return this._printing;
  }

  @Input() options: Partial<IRevealOptions>;

  @Output('ready') onReady = new EventEmitter()

  @ViewChild('main') _revealDiv!: ElementRef;

  @ContentChildren('[markdown]') markdownList: QueryList<MarkdownComponent>;

  constructor(
    @Inject(DOCUMENT) private _document: Document,
    private toastController: ToastController,
    private translate: TranslateService) {

    if (this.isPrintingPdf()) {
      this.configurePrintPdfCss();
      this.waitIdle().then(() => this.print());
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event){
    this._reveal?.layout();
  }

  @HostListener('window:beforeprint')
  onbeforeprint(event: Event) {
    if (!this.isPrintingPdf()) {
      event?.preventDefault();
      this.print();
    }
  }

  @HostListener('window:afterprint')
  onafterprint(event: Event) {
    if (this.isPrintingPdf()) {
      window.close();
    }
  }

  ngAfterViewInit() {
    if (this.options.autoInitialize !== false) {
      setTimeout(() => this.initialize(), 100);
    }
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  async initialize() {

    // wait markdown rendered
    await Promise.all(this.markdownList
      .map(md => md.ready.toPromise()));

    const now = Date.now();
    console.debug(`[slides] Initialize Reveal.js ... {printing: ${this._printing}}`);

    // Move content to body
    if (this.isPrintingPdf()) {
      this._document.body.appendChild(this._revealDiv.nativeElement);
    }

    // Full list of configuration options available here:
    // https://github.com/hakimel/reveal.js#configuration
    this._reveal = new Reveal(this._revealDiv.nativeElement, {
      controls: true,
      progress: true,
      history: true,
      center: true,
      mouseWheel: true,
      slideNumber: false, // Disable number
      keyboard: true,
      fragments: true,
      controlsBackArrows: 'faded',
      //pdfMaxPagesPerSlide: 1,
      hideInactiveCursor: true,
      touch: true,

      ...this.options,

      embedded: true, // Required for multi .reveal div
      keyboardCondition: 'focused'
    });

    await this._reveal.initialize();

    console.info(`[slides] Reveal initialized in ${Date.now()-now}ms`);
    this.onReady.emit();
    this.markAsLoaded();

    this._subscription.add(() => {
      this._reveal.destroy();
      this._revealDiv.nativeElement.innerHTML = '';
    });
  }

  configure(options: Partial<IRevealOptions>){
    this._reveal?.configure(options);
  }

  async print(event?: UIEvent) {
    if (this.loading) return; // skip

    console.debug('[slides] Print...');

    if (this.isPrintingPdf()) {
      await this.waitIdle();
      await sleep(1000); // Wait end of render
      window.print();
    }
    else {

      // Create a iframe with '?print-pdf'
      const printUrl = this.getPrintPdfUrl();

      this.markAsLoading();

      try {
        // Already exists: use it
        if (this._printIframe) {
          this._printIframe.contentWindow.window.print();
        }
        else {
          this.showToast({message: 'COMMON.PLEASE_WAIT'});
          this._printIframe = this.createPrintHiddenIframe(printUrl);

          // Remember to destroy the iframe, on destroy
          const removeIframe = () => {
            this._printIframe?.remove();
            this._printIframe = null;
          }
          // destroy after 1min
          setTimeout(removeIframe, 60000);

          // destroy when destroy
          this._subscription.add(removeIframe);
        }

      } catch(err) {
        console.error('[slides] Failed to create hidden iframe. Will opening a new window');
      }
      finally {
        this.markAsLoaded();
      }
    }
  }

  waitIdle(opts?: WaitForOptions): Promise<void> {
    return waitForFalse(this.loadingSubject, opts);
  }

  protected markAsLoading() {
    this.loadingSubject.next(true);
  }

  protected markAsLoaded() {
    this.loadingSubject.next(false);
  }

  private createPrintHiddenIframe(url: string): HTMLIFrameElement {
    // Create a iframe with '?print-pdf'
    const iframe = this._document.createElement('iframe');
    iframe.classList.add('cdk-visually-hidden');
    iframe.style.width='100%';
    iframe.style.height='100%';
    this._document.body.appendChild(iframe);
    iframe.src = url;
    return iframe;
  }

  private getPrintPdfUrl() {
    let href = window.location.href;
    if (href.lastIndexOf('#') !== -1) {
      href = href.substring(0, href.lastIndexOf('#'));
    }
    if (href.indexOf('?') !== -1) {
      href = href.substring(0, href.indexOf('?'));
    }
    let query = window.location.search || '?';
    if (query.indexOf('print-pdf') !== -1) return; // not need
    query += 'print-pdf';
    return href + query + (window.location.hash || '');
  }

  private isPrintingPdf(): boolean {
    if (this._printing) return true;
    const query = window.location.search || '?';
    return query.indexOf('print-pdf') !== -1;
  }

  private configurePrintPdfCss() {
    this._printing = true;
    const html = this._document.getElementsByTagName('html')[0];
    html.classList.add('print-pdf');
  }

  private async showToast<T = any>(opts: ShowToastOptions): Promise<OverlayEventDetail<T>> {
    if (!this.toastController) throw new Error('Missing toastController in component\'s constructor');
    return await Toasts.show(this.toastController, this.translate, opts);
  }
}
