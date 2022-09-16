import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Optional, Output, QueryList, ViewChild, ViewChildren, ViewEncapsulation } from '@angular/core';
import { sleep, waitForFalse, WaitForOptions } from '@sumaris-net/ngx-components';
import Reveal from 'reveal.js/dist/reveal.esm';
import { MarkdownComponent } from 'ngx-markdown';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Location } from '@angular/common';


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

@Component({
  selector: 'app-slides',
  templateUrl: './slides.component.html',
  styleUrls: ['./slides.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppSlidesComponent implements AfterViewInit, OnDestroy
{
  private _reveal: Reveal;
  private _$loading = new BehaviorSubject(true);
  private _subscription = new Subscription();
  private _initialContent: string;

  @Input() options: Partial<IRevealOptions>;
  @Output('ready') onReady = new EventEmitter()

  @ViewChild('reveal') revealDiv!: ElementRef;
  @ViewChildren('[markdown]') markdownList!: QueryList<MarkdownComponent>;

  @HostListener('window:resize', ['$event'])
  onResize(event){
    //this._reveal?.layout();
  }

  get loading(): boolean {
    return this._$loading.value;
  }

  constructor(private location: Location,
              private router: Router,
              @Optional() private ionContent?: IonContent) {

    // route.queryParams
    //   .pipe(
    //     map(params => params['print-pdf']),
    //     filter(isNotNil),
    //     //tap(_ => menu.opened && menu.toggle()),
    //     mergeMap(_ => this.waitIdle()),
    //     mergeMap(_ => timer(1000))
    //   )
    //   .subscribe(_ => {
    //     window.print();
    //     window.close();
    //   })
  }

  ngAfterViewInit() {
    this._initialContent = this.revealDiv.nativeElement.innerHTML;
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
    this._reveal = await this.create(this.revealDiv.nativeElement);

    console.info(`[slides] Reveal initialized in ${Date.now()-now}ms`);
    this.onReady.emit();
    this.markAsLoaded();

    this._subscription.add(() => {
      this._reveal.destroy();
      this.revealDiv.nativeElement.innerHTML = '';
    });
  }

  async create(element: any, options?: Partial<IRevealOptions>): Promise<Reveal> {

    // Full list of configuration options available here:
    // https://github.com/hakimel/reveal.js#configuration
    const reveal = new Reveal(element, {
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
      keyboardCondition: 'focused',

      ...options
    });

    await reveal.initialize();

    return reveal;
  }

  configure(options: Partial<IRevealOptions>){
    this._reveal?.configure(options);
  }

  // async fullscreen(event?: UIEvent) {
  //   const div = document.createElement('div');
  //   div.classList.add('reveal');
  //   div.innerHTML = this._initialContent;
  //   document.body.appendChild(div);
  //   const reveal = await this.create(div, {control: false, progress: false});
  //
  //
  // }

  async print(event?: UIEvent) {
    await this.waitIdle();

    const body = document.getElementsByTagName('body')[0];
    const {width, height} = body.style;

    const div = document.createElement('div');
    div.classList.add('reveal');
    div.innerHTML = this._initialContent;
    document.body.appendChild(div);

    this.addQueryParam('print-pdf', true);

    const reveal = await this.create(div);

    const ionApp = document.getElementsByTagName('ion-app')[0];
    //ionApp.classList.add('cdk-visually-hidden');
    this._reveal.destroy();
    this.revealDiv.nativeElement.innerHTML = "";
    this.revealDiv.nativeElement.classList.remove('reveal', 'embedded', 'slide');

    await sleep(1000);

    window.print();

    //reveal.destroy();
    div.remove();
    //this.removeQueryParam('print-pdf', true);

    this.location.back();

    body.style.height = height;
    body.style.width = width;

    await sleep(1000);
    this.revealDiv.nativeElement.innerHTML = this._initialContent;
    this.revealDiv.nativeElement.classList.add('reveal');
    await sleep(1000);
    this._reveal = await this.create(this.revealDiv.nativeElement);

    await sleep(1000);
    this._reveal.layout();
    //ionApp.classList.remove('cdk-visually-hidden');
  }

  waitIdle(opts?: WaitForOptions): Promise<void> {
    return waitForFalse(this._$loading, opts);
  }

  protected markAsLoading() {
    this._$loading.next(true);
  }

  protected markAsLoaded() {
    this._$loading.next(false);
  }

  private addQueryParam(name: string, reload?: boolean) {
    let query = window.location.search || '?';
    if (query.indexOf(name) !== -1) return;
    query += name;
    query += window.location.hash || '';
    if (!reload) {
      this.location.replaceState(window.location.pathname, query.substring(1 /* remove '?'*/));
    }
    else {
      this.location.go(window.location.pathname, query.substring(1 /* remove '?'*/));
    }
  }

  private removeQueryParam(name: string, reload?: boolean) {
    let query = window.location.search || '?';
    if (query.indexOf(name) === -1) return;
    query = query.replace(new RegExp(name + '[=]?'), '');
    query += window.location.hash || '';
    if (!reload) {
      this.location.replaceState(window.location.pathname, query.substring(1 /* remove '?'*/));
    }
    else {
      this.location.go(window.location.pathname, query.substring(1 /* remove '?'*/));
      window.location.reload();
    }
  }
}
