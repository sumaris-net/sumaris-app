import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { waitFor, WaitForOptions } from '@sumaris-net/ngx-components';
import Reveal from 'reveal.js/dist/reveal.esm';
import { MarkdownComponent } from 'ngx-markdown';
import { BehaviorSubject, Subscription } from 'rxjs';


export interface IRevealOptions {
  config: boolean;
  progress: boolean;
  history: boolean;
  center: boolean;
  autoInitialize: boolean;
  disableLayout: boolean;
  touch: boolean
}

@Component({
  selector: 'app-slides',
  templateUrl: './slides.component.html',
  styleUrls: ['./slides.component.scss']
})
export class AppSlidesComponent implements AfterViewInit, OnDestroy
{
  private _reveal: Reveal;
  private _$loading = new BehaviorSubject(true);
  private _subscription = new Subscription();

  @Input() options: Partial<IRevealOptions>;
  @Output('ready') onReady = new EventEmitter()

  @ViewChild('reveal') revealDiv!: ElementRef;
  @ViewChildren('[markdown]') markdownList!: QueryList<MarkdownComponent>;

  @HostListener('window:resize', ['$event'])
  onResize(event){
    this._reveal?.layout();
  }

  get loading(): boolean {
    return this._$loading.value;
  }

  constructor() {
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
      .map(md => md.ready.toPromise()))

    const now = Date.now();
    console.debug('[slides] Initialize Reveal.js ...');

    // Full list of configuration options available here:
    // https://github.com/hakimel/reveal.js#configuration
    this._reveal = new Reveal(this.revealDiv.nativeElement, {
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
      this.revealDiv.nativeElement.innerHTML = '';
    });
  }

  configure(options: Partial<IRevealOptions>){
    this._reveal?.configure(options);
  }

  async print(event?: UIEvent) {
    await this.waitIdle();
    window.print();
  }

  waitIdle(opts?: WaitForOptions): Promise<void> {
    return waitFor(() => !this.loading, opts);
  }

  protected markAsLoading() {
    this._$loading.next(true);
  }

  protected markAsLoaded() {
    this._$loading.next(false);
  }
}
