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
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';

import { DOCUMENT } from '@angular/common';
import { ToastController } from '@ionic/angular';
import { OverlayEventDetail } from '@ionic/core';
import { TranslateService } from '@ngx-translate/core';
import { isNotNil, isSafari, ShowToastOptions, sleep, StorageService, Toasts, waitForFalse, WaitForOptions } from '@sumaris-net/ngx-components';
import { MarkdownComponent } from 'ngx-markdown';
import { BehaviorSubject, lastValueFrom, Subscription } from 'rxjs';
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
  private _reveal: IReveal;
  private _embedded = false;
  private _parent: RevealComponent;
  private loadingSubject = new BehaviorSubject(true);
  private _subscription = new Subscription();
  private _printing = false;
  private _printIframe: HTMLIFrameElement;
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
    return this._printing;
  }

  @Input() options: Partial<IRevealExtendedOptions>;
  @Input() autoPrint = true;

  @Output() ready = new EventEmitter();
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
    private toastController: ToastController,
    private cd: ChangeDetectorRef,
    private translate: TranslateService,
    @SkipSelf() @Optional() @Inject(REVEAL_COMPONENT) parent?: RevealComponent
  ) {
    this._parent = parent !== this ? parent : undefined;
    this._embedded = !!this._parent;

    if (this.isPrintingPDF()) {
      this.configurePrintPdfCss();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    this._reveal?.layout();
  }

  @HostListener('window:beforeprint')
  onbeforeprint(event?: Event) {
    console.debug('[reveal] Received before print event');
    if (!this.isPrintingPDF()) {
      //event?.preventDefault();
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
    // Root component
    if (!this._embedded) {
      if (this.options && this.options.autoInitialize !== false) {
        setTimeout(() => this.initialize(), 100);
      }

      if (this.isPrintingPDF() && this.options.autoPrint !== false) {
        this.waitIdle().then(() => this.print());
      }
    }
    // Embedded component
    else {
      this._sectionDefs.forEach((section) => {
        this._parent.registerSection(section);
      });
    }

    console.log('[reveal] ngAfterViewInit finished');
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  registerSection(section: RevealSectionDefDirective) {
    if (!this._embedded) {
      const exists = this._sectionDefs.some((s) => s === section) || this._registeredSections.includes(section);

      if (exists) return; // Skip if already registered (e.g. see testing embedded page)

      console.debug(`[reveal] registerSection`, section);
      this._registeredSections.push(section);
    } else {
      this._parent.registerSection(section);
    }
  }

  moveToBody(): void {
    console.debug(`[reveal] Moving <div class="reveal"> into <body> ...`);
    this.viewRef.detach();
    this.appRef.attachView(this.viewRef);
    const domElement: HTMLElement = (this.viewRef as EmbeddedViewRef<RevealComponent>).rootNodes[0];
    this._document.body.appendChild(domElement);
  }

  async initialize() {
    const now = Date.now();
    console.debug(`[reveal] Initialize Reveal.js ... {printing: ${this._printing}}`);

    await this.renderSections();

    // wait markdown rendered
    await Promise.all(this.markdownList.map((md) => lastValueFrom(md.ready)));

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
      keyboardCondition: 'focused',
      plugins: [RevealMarkdown],
    });

    await this._reveal.initialize();

    console.info(`[reveal] Reveal initialized in ${Date.now() - now}ms`);
    this.ready.emit();
    this.markAsLoaded();

    this._reveal.on('slidechanged', (event: RevealSlideChangedEvent) => {
      this.slideChanged.emit(event);
    });

    this._subscription.add(() => {
      this._reveal.destroy();
      this._revealDiv.nativeElement.innerHTML = '';
    });
  }

  protected async renderSections() {
    if (this.embedded) return; // Skip
    const viewContainer = this._sectionOutlet.viewContainer;
    let indexSection = 0;
    this._sectionDefs.forEach((section, index) => viewContainer.createEmbeddedView(section.template, {}, indexSection++));
    this._registeredSections.forEach((section, index) => viewContainer.createEmbeddedView(section.template, {}, indexSection++));
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
    if (this.loading) return; // skip

    console.debug('[reveal] Print...');

    if (isSafari(window)) {
      this.showToast({ type: 'warning', message: 'WARNING.PARTIALLY_COMPATIBLE_WEB_BROWSER', duration: 5000 });
    }

    if (!this.isPrintingPDF()) {
      // Create a iframe with '?print-pdf'
      const printUrl = this.getPrintPdfUrl();

      this.markAsLoading();

      try {
        const toast = await this.showToast({ message: 'COMMON.PLEASE_WAIT', duration: 0 });
        this._printIframe = this.createPrintHiddenIframe(printUrl);
        await this._checkIfReadyToPrint();
        await this.toastController.dismiss(toast);
        this._printIframe.contentWindow.window.print();
      } catch (err) {
        this.disablePrintJob();
        console.error('[reveal] Failed to create hidden iframe. Will opening a new window');
      } finally {
        this._printIframe?.remove();
        this._printIframe = null;
        this.markAsLoaded();
      }
    }
  }

  waitIdle(opts?: WaitForOptions): Promise<void> {
    return waitForFalse(this.loadingSubject, opts);
  }

  async hasPrintingJob(): Promise<boolean> {
    const result = await this._storageService.get('prepare-printing-report-' + this.options.reportId);
    return isNotNil(result);
  }

  async enablePrintJob() {
    console.debug('[reveal] Enable print job', this.options.reportId);
    await this._storageService.set('prepare-printing-report-' + this.options.reportId, '1');
  }

  async disablePrintJob() {
    console.debug('[reveal] Disable print job', this.options.reportId);
    await this._storageService.remove('prepare-printing-report-' + this.options.reportId);
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
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    this._document.body.appendChild(iframe);
    iframe.src = url;
    return iframe;
  }

  private getPrintPdfUrl() {
    const printUrl = this.options.printUrl || new URL(window.location.href);

    if (!printUrl.searchParams.has('print-pdf')) {
      printUrl.searchParams.append('print-pdf', '1');
    }
    printUrl.searchParams.append('report-id', this.options.reportId);

    return printUrl.href;
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
    if (!this.toastController) throw new Error("Missing toastController in component's constructor");
    return await Toasts.show(this.toastController, this.translate, opts);
  }

  private async _checkIfReadyToPrint(): Promise<void> {
    while (await this.hasPrintingJob()) {
      console.debug('[reveal] Wait for printing iframe', this.options.reportId);
      await sleep(1000);
    }
  }
}
