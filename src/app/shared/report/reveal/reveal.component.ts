import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  EventEmitter,
  HostListener,
  Inject,
  InjectionToken,
  Input,
  OnDestroy,
  Optional,
  Output,
  QueryList,
  SkipSelf,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
  ViewRef,
} from '@angular/core';
import { ToastController } from '@ionic/angular';
import { OverlayEventDetail } from '@ionic/core';
import { TranslateService } from '@ngx-translate/core';
import {
  PrintService,
  ShowToastOptions,
  StorageService,
  Toasts,
  WaitForOptions,
  getUserAgent,
  isNotNil,
  isSafari,
  waitForFalse,
} from '@sumaris-net/ngx-components';
import { MarkdownComponent } from 'ngx-markdown';
import { BehaviorSubject, Subscription, lastValueFrom } from 'rxjs';
import { IReveal, IRevealOptions, Reveal, RevealMarkdown, RevealSlideChangedEvent } from './reveal.utils';

export interface IRevealExtendedOptions extends IRevealOptions {
  autoInitialize: boolean;
  autoPrint: boolean;
  printUrl: URL;
  reportId: string;
}

export const REVEAL_COMPONENT = new InjectionToken<any>('REVEAL_COMPONENT');

@Directive({ selector: '[sectionOutlet]' })
export class RevealSectionOutletDirective {
  constructor(public viewContainer: ViewContainerRef) {}
}

@Directive({
  selector: '[sectionDef]',
})
export class RevealSectionDefDirective {
  constructor(public template: TemplateRef<any>) {}
}

@Component({
  selector: 'app-reveal',
  templateUrl: './reveal.component.html',
  styleUrls: ['./reveal.component.scss'],
  providers: [{ provide: REVEAL_COMPONENT, useExisting: RevealComponent }],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class RevealComponent implements AfterViewInit, OnDestroy {
  private _logPrefix: string;
  private _reveal: IReveal;
  private _embedded = false;
  private _parent: RevealComponent;
  private loadingSubject = new BehaviorSubject(true);
  private _subscription = new Subscription();
  private _printing = false;
  private readonly _printJobId: number | string;
  private _registeredSections: RevealSectionDefDirective[] = [];

  get loading(): boolean {
    return this.loadingSubject.value;
  }

  get loaded(): boolean {
    return !this.loadingSubject.value;
  }

  get embedded(): boolean {
    return this._embedded;
  }

  @Input() set embedded(value: boolean) {
    this._embedded = value;
  }

  get printing(): boolean {
    return this._printing || this.isPrintingUrl();
  }

  @Input() options: Partial<IRevealExtendedOptions>;
  @Input() autoPrint = true;
  @Input() renderOrder = 0;

  @Output() loadedEvent = new EventEmitter();
  @Output() loadingEvent = new EventEmitter();
  @Output() slideChanged = new EventEmitter<RevealSlideChangedEvent>();

  @ViewChild('main') _revealDiv!: ElementRef;

  @ViewChild(RevealSectionOutletDirective, { static: true }) _sectionOutlet: RevealSectionOutletDirective;
  @ContentChildren(RevealSectionDefDirective, { descendants: true }) _sectionDefs: QueryList<RevealSectionDefDirective>;
  @ContentChildren('[markdown]') markdownList: QueryList<MarkdownComponent>;

  constructor(
    private appRef: ApplicationRef,
    @Inject(ChangeDetectorRef) private viewRef: ViewRef,
    @Inject(DOCUMENT) private _document: Document,
    @Inject(StorageService) private _storageService: StorageService,
    @Inject(PrintService) private _printService: PrintService,
    private toastController: ToastController,
    private cd: ChangeDetectorRef,
    private translate: TranslateService,
    @SkipSelf() @Optional() @Inject(REVEAL_COMPONENT) parent?: RevealComponent
  ) {
    this._parent = parent !== this ? parent : undefined;
    this._embedded = !!this._parent;
    this._logPrefix = '[reveal] ';

    // Configure if running inside an iframe
    if (!this._embedded && this.isPrintingUrl()) {
      this._printJobId = this._printService.getJobId();
      this.configurePrintPdfCss();
      this.redirectPrintIframeConsole();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    this._reveal?.layout();
  }

  ngAfterViewInit() {
    // Root component
    if (this.options && this.options.autoInitialize !== false) {
      setTimeout(() => this.initialize(), 100);
    }

    if (this.isPrintingUrl() && this.options.autoPrint !== false) {
      this.waitIdle().then(() => this.print());
    }
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  registerSection(section: RevealSectionDefDirective) {
    if (!this._embedded) {
      const exists = this._sectionDefs.some((s) => s === section) || this._registeredSections.includes(section);

      if (exists) return; // Skip if already registered (e.g. see testing embedded page)

      this._registeredSections.push(section);
    } else {
      this._parent.registerSection(section);
    }
  }

  moveToBody(): void {
    console.debug('Moving <div class="reveal"> into <body> ...', 'debug');
    this.viewRef.detach();
    this.appRef.attachView(this.viewRef);
    const domElement: HTMLElement = (this.viewRef as EmbeddedViewRef<RevealComponent>).rootNodes[0];
    this._document.body.appendChild(domElement);
  }

  async initialize(opts?: { emitEvent?: boolean }) {
    const now = Date.now();
    console.debug(`${this._logPrefix}Initializing... {printing: ${this.isPrintingUrl()}}`);

    if (this._embedded) {
      this._sectionDefs.forEach((section) => {
        this._parent.registerSection(section);
      });
      this.markAsLoaded();
      return;
    }

    await this.renderSections();

    // wait markdown rendered
    await Promise.all(this.markdownList.map((md) => lastValueFrom(md.ready)));

    // Move content to body
    if (this.isPrintingUrl()) {
      console.info(this._logPrefix + 'Move content to body');
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

      embedded: !this.isPrintingUrl(), // Required for multi .reveal div
      keyboardCondition: 'focused',
      plugins: [RevealMarkdown],
    });

    await this._reveal.initialize();

    this._reveal.on('slidechanged', (event: RevealSlideChangedEvent) => {
      this.slideChanged.emit(event);
    });

    this._subscription.add(() => {
      this._reveal.destroy();
      this._revealDiv.nativeElement.innerHTML = '';
    });

    console.info(`${this._logPrefix}Initialized in ${Date.now() - now}ms`);

    // Emit event
    if (opts?.emitEvent !== false) {
      this.markAsLoaded();
    }
  }

  protected async renderSections() {
    if (this.embedded) return; // Skip
    const viewContainer = this._sectionOutlet.viewContainer;
    let indexSection = 0;
    this._sectionDefs.forEach((section, index) => viewContainer.createEmbeddedView(section.template, {}, indexSection++));
    this._registeredSections.forEach((section) => viewContainer.createEmbeddedView(section.template, {}, indexSection++));
    this.cd.detectChanges();
  }

  configure(options: Partial<IRevealOptions>) {
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

  async print() {
    if (this.loading || this.isPrintingUrl()) return; // skip

    if (this._printing) {
      console.warn(this._logPrefix + 'Previous printing task not finished');
      return;
    }

    this._printing = true;
    console.debug(this._logPrefix + 'Print...');

    if (!this.isPrintingUrl()) {
      // Safari print feature seems to hide some part...
      // As a workaround, we display a warning message
      if (isSafari(window)) {
        console.debug(this._logPrefix + 'Detecting Safari - User-Agent: ', 'warn', getUserAgent(window));
        this.showToast({ type: 'warning', message: 'ERROR.INCOMPATIBLE_WEB_BROWSER', duration: 5000 });
      }

      try {
        const jobId = this._printService.nextJobId();
        const printUrl = this.getPrintPdfUrl(jobId);
        this.markAsLoading();
        await this._printService.markAsLoading(jobId);
        await this._printService.printUrl(printUrl, { id: jobId });
      } catch (err) {
        console.debug(this._logPrefix + 'Print task failed', 'error', err);
      } finally {
        this._printing = false;
        this.markAsLoaded();
      }
    }
  }

  waitIdle(opts?: WaitForOptions): Promise<void> {
    return waitForFalse(this.loadingSubject, opts);
  }

  isPrintingUrl(): boolean {
    return this._printService.isPrintingUrl();
  }

  /* -- protected functions -- */

  protected markAsLoading(opts = { emitEvent: true }) {
    this.loadingSubject.next(true);

    if (opts.emitEvent) {
      this.loadingEvent.emit();
    }
  }

  protected markAsLoaded(opts = { emitEvent: true }) {
    this.loadingSubject.next(false);

    // If inside an iframe, tell the print service that the print job is ready
    if (this.isPrintingUrl() && isNotNil(this._printJobId)) {
      setTimeout(async () => {
        await this._printService.markAsLoaded(this._printJobId);
      }, 250);
    }

    if (opts.emitEvent) {
      this.loadedEvent.emit();
    }
  }

  private getPrintPdfUrl(jobId: number) {
    const printUrl = this.options.printUrl || new URL(window.location.href);

    printUrl.searchParams.set('print-pdf', jobId.toString());

    return printUrl.href;
  }

  private configurePrintPdfCss() {
    const html = this._document.getElementsByTagName('html')[0];
    html.classList.add('print-pdf');
  }

  private redirectPrintIframeConsole() {
    const parentConsole = (window.parent as any)?.console;
    if (parentConsole) {
      this._logPrefix = '[print-iframe] ';
      ['debug', 'info', 'warn', 'error'].forEach((level) => {
        console[level] = (...args: any[]) => {
          // If first argument is a string, add prefix
          if (typeof args[0] === 'string') {
            args[0] = this._logPrefix + args[0];
          } else {
            // If first argument is not a string, add the prefix as separate argument
            args.unshift(this._logPrefix);
          }
          parentConsole[level].apply(console, args);
        };
      });
    }
  }

  private async showToast<T = any>(opts: ShowToastOptions): Promise<OverlayEventDetail<T>> {
    if (!this.toastController) throw new Error("Missing toastController in component's constructor");
    return await Toasts.show(this.toastController, this.translate, opts);
  }
}
