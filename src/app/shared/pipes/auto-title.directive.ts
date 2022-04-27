import { AfterContentChecked, Directive, ElementRef, Inject } from '@angular/core';

const compatibleTagNames = ['ion-label', 'mat-label'];

@Directive({
  selector: '[appAutoTitle]',
})
export class AutoTitleDirective implements AfterContentChecked {
  private readonly element: HTMLElement;

  constructor(@Inject(ElementRef) private readonly elementRef: ElementRef<HTMLElement>) {
    // Check compatible tag
    if (compatibleTagNames.includes(elementRef.nativeElement.tagName?.toLowerCase())) {
      this.element = elementRef.nativeElement;
    }
  }

  ngAfterContentChecked(): void {
    // Update title if different
    if (this.element && this.element.title !== this.element.textContent) {
      this.element.title = this.element.textContent;
    }
  }
}
