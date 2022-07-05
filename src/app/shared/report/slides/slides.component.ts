import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { fadeInAnimation, waitFor } from '@sumaris-net/ngx-components';
import Reveal from 'reveal.js/dist/reveal.esm';
import { MarkdownComponent } from 'ngx-markdown';
import { Subscription } from 'rxjs';


export interface IRevealOptions {
  config: boolean;
  progress: boolean;
  history: boolean;
  center: boolean;
}
export interface IRevealMenu {
  toggle();
}
export interface IRevealNotes {
  open();
}
@Component({
  selector: 'app-slides',
  templateUrl: './slides.component.html',
  styleUrls: ['./slides.component.scss'],
  animations: [fadeInAnimation],
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSlidesComponent implements AfterViewInit, OnDestroy
{
  private _loading = true;
  private _subscription = new Subscription();

  @Input() options: Partial<IRevealOptions>;
  @Output('ready') onReady = new EventEmitter()

  @ViewChild('reveal') revealDiv!: ElementRef;
  @ViewChildren('[markdown]') markdownList!: QueryList<MarkdownComponent>;


  constructor() {
  }

  ngAfterViewInit() {
    setTimeout(() => this.initialize(), 100);
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
    const reveal = new Reveal(this.revealDiv.nativeElement, {
      controls: true,
      progress: true,
      history: true,
      center: true,
      mouseWheel: true,
      slideNumber: false, // Disable number
      keyboard: true,
      fragments: true,
      controlsBackArrows: 'faded',
      pdfMaxPagesPerSlide: 1,
      hideInactiveCursor: true,
      touch: true,

      ...this.options,

      embedded: true, // Required for multi .reveal div
      keyboardCondition: 'focused'

    });

    await reveal.initialize();

    console.info(`[slides] Reveal initialized in ${Date.now()-now}ms`);
    this.onReady.emit();
    this._loading = false;

    this._subscription.add(() => {
      reveal.destroy();
      this.revealDiv.nativeElement.innerHTML = '';
    });
  }

  async print() {
    await waitFor(() => !this._loading, {timeout: 1000});
    window.print();
  }
}
