import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Optional, Output } from '@angular/core';
import { RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { filter, first, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Directive({
  selector: 'section'
})
export class RevealSectionDirective implements OnInit, OnDestroy{

  private _destroySubject = new Subject<void>();

  @Output('entered') onEntered = new EventEmitter<{ currentSlide: HTMLElement }>();

  constructor(
    private readonly _elementRef: ElementRef,
    @Optional() private readonly _slides: RevealComponent
  ) {

  }

  ngOnInit() {
    if (this._slides) {
      this.startWorkflow(this._slides);
    }
  }

  ngOnDestroy() {
    this._destroySubject.next();
  }

  private async startWorkflow(slides: RevealComponent) {
    await slides.waitIdle({stop: this._destroySubject, stopError: false});

    // First, check classList, in case current section is the first visible
    if (this._elementRef.nativeElement.classList.contains('present' /*reveal current section style*/)) {
      this.onEntered.emit({ currentSlide: this._elementRef.nativeElement});
    }
    else {
      slides.onSlideChanged
        .pipe(
          takeUntil(this._destroySubject),
          filter(event => event.currentSlide === this._elementRef.nativeElement),
          first()
        )
        .subscribe(event =>  this.onEntered.emit(event));
    }
  }
}
