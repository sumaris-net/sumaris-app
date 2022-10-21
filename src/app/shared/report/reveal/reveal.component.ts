import {
  AfterViewInit,
  ApplicationRef,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EmbeddedViewRef,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  Output,
  QueryList,
  ViewChild,
  ViewRef
} from '@angular/core';
import { ShowToastOptions, sleep, Toasts, waitForFalse, WaitForOptions } from '@sumaris-net/ngx-components';
import { IReveal, IRevealOptions, Reveal, RevealSlideChangedEvent } from './reveal.utils';
import { MarkdownComponent } from 'ngx-markdown';
import { BehaviorSubject, Subscription } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { OverlayEventDetail } from '@ionic/core';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';


export interface IRevealExtendedOptions extends IRevealOptions {
  autoInitialize: boolean;
  autoPrint: boolean;
  printHref: string;
}

@Component({
  selector: 'app-reveal',
  templateUrl: './reveal.component.html',
  styleUrls: ['./reveal.component.scss']
})
export class RevealComponent implements AfterViewInit, OnDestroy
{
  private _reveal: IReveal;
  private loadingSubject = new BehaviorSubject(true);
  private _subscription = new Subscription();
  private _printing = false;
  private _printIframe: HTMLIFrameElement;

  get loading(): boolean {
    return this.loadingSubject.value;
  }

  get loaded(): boolean {
    return !this.loadingSubject.value;
  }

  get printing(): boolean {
    return this._printing;
  }

  @Input() options: Partial<IRevealExtendedOptions>;
  @Input() autoPrint = true;

  @Output('ready') onReady = new EventEmitter();
  @Output('slideChanged') onSlideChanged = new EventEmitter<RevealSlideChangedEvent>();

  @ViewChild('main') _revealDiv!: ElementRef;
  @ContentChildren('[markdown]') markdownList: QueryList<MarkdownComponent>;

  constructor(
    private appRef: ApplicationRef,
    @Inject(ChangeDetectorRef) private viewRef: ViewRef,
    @Inject(DOCUMENT) private _document: Document,
    private toastController: ToastController,
    private translate: TranslateService
    ) {

    if (this.isPrintingPDF()) {
      this.configurePrintPdfCss();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event){
    this._reveal?.layout();
  }

  @HostListener('window:beforeprint')
  onbeforeprint(event: Event) {
    if (!this.isPrintingPDF()) {
      event?.preventDefault();
      this.print();
    }
  }

  @HostListener('window:afterprint')
  onafterprint(event: Event) {
    if (this.isPrintingPDF()) {
      window.close();
    }
  }

  ngAfterViewInit() {
    if (this.options.autoInitialize !== false) {
      setTimeout(() => this.initialize(), 100);
    }

    if (this.isPrintingPDF() && this.options.autoPrint !== false) {
      this.waitIdle()
        .then(() => this.print());
    }

  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  moveToBody(): void {

    console.debug(`[reveal] Moving <div class="reveal"> into <body> ...`);
    this.viewRef.detach();
    this.appRef.attachView(this.viewRef);
    const domElement: HTMLElement = (this.viewRef as EmbeddedViewRef<RevealComponent>)
      .rootNodes[0];
    this._document.body.appendChild(domElement);
  }

  async initialize() {

    // wait markdown rendered
    await Promise.all(this.markdownList
      .map(md => md.ready.toPromise()));

    const now = Date.now();
    console.debug(`[reveal] Initialize Reveal.js ... {printing: ${this._printing}}`);

    // Move content to body
    if (this.isPrintingPDF()) {
      this.moveToBody();
    }

    // Full list of configuration options available here:
    // https://github.com/hakimel/reveal.js#configuration
    this._reveal = new Reveal(this._revealDiv.nativeElement, <IRevealOptions>{
      controls: true,
      progress: true,
      history: true,
      center: true,
      mouseWheel: true,
      slideNumber: false, // Disable number
      keyboard: true,
      fragments: true,
      controlsBackArrows: 'faded',
      hideInactiveCursor: true,
      touch: true,

      ...this.options,

      embedded: !this._printing, // Required for multi .reveal div
      keyboardCondition: 'focused'
    });

    await this._reveal.initialize();

    console.info(`[reveal] Reveal initialized in ${Date.now()-now}ms`);
    this.onReady.emit();
    this.markAsLoaded();

    this._reveal.on( 'slidechanged', (event: RevealSlideChangedEvent) => {
      this.onSlideChanged.emit(event);
    });

    this._subscription.add(() => {
      this._reveal.destroy();
      this._revealDiv.nativeElement.innerHTML = '';
    });
  }

  configure(options: Partial<IRevealOptions>){
    this._reveal?.configure(options);
  }

  layout() {
    this._reveal.layout();
  }

  sync() {
    this._reveal.sync();
  }

  navigatePrev() {
    this._reveal.navigatePrev();
  }

  toggleHelp() {
    this._reveal.toggleHelp();
  }

  async print(event?: UIEvent) {
    if (this.loading) return; // skip

    console.debug('[reveal] Print...');

    if (this.isPrintingPDF()) {

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
        console.error('[reveal] Failed to create hidden iframe. Will opening a new window');
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
    let href = this.options.printHref || window.location.href;
    let query = !this.options.printHref && window.location.search || '?';
    let hash = !this.options.printHref && window.location.hash || '';
    if (href.lastIndexOf('#') !== -1) {
      href = href.substring(0, href.lastIndexOf('#'));
    }
    if (href.indexOf('?') !== -1) {
      href = href.substring(0, href.indexOf('?'));
    }
    // Set query
    if (query.indexOf('print-pdf') !== -1) return; // not need
    query += 'print-pdf';
    // Compute final URL
    return href + query + hash;
  }

  private isPrintingPDF(): boolean {
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
