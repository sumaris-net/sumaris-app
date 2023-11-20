import { Directive, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { MarkdownAnchorService } from '@app/shared/markdown/markdown-anchor.service';
import { Subscription } from 'rxjs';

@Directive({
  // tslint:disable-next-line: directive-selector
  selector: 'markdown,[markdown]',
})
export class MarkdownAnchorDirective implements OnDestroy {
  private _subscription = new Subscription();

  constructor(private service: MarkdownAnchorService, private element: ElementRef<HTMLElement>) {}

  @HostListener('ready')
  public processAnchors() {
    const listener = (event: Event) => this.service.interceptClick(event);
    const links = this.element.nativeElement.querySelectorAll('a');
    links.forEach((link) => {
      link.addEventListener('click', listener);
      this._subscription.add(() => link.removeEventListener('click', listener));
    });
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }
}
