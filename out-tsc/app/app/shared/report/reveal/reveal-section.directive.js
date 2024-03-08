import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Directive, ElementRef, EventEmitter, Optional, Output } from '@angular/core';
import { RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { filter, first, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
let RevealSectionDirective = class RevealSectionDirective {
    constructor(_elementRef, _reveal) {
        this._elementRef = _elementRef;
        this._reveal = _reveal;
        this.logPrefix = 'reveal-section-directive';
        this._destroySubject = new Subject();
        this.entered = new EventEmitter();
    }
    ngOnInit() {
        // DEBUG
        // console.debug(`[${this.logPrefix} ngOnInit]`, arguments);
        if (this._reveal) {
            this.startWorkflow(this._reveal);
        }
    }
    ngOnDestroy() {
        this._destroySubject.next();
    }
    startWorkflow(reveal) {
        return __awaiter(this, void 0, void 0, function* () {
            yield reveal.waitIdle({ stop: this._destroySubject, stopError: false });
            // First, check classList, in case current section is the first visible
            if (this._elementRef.nativeElement.classList.contains('present' /*reveal current section style*/)) {
                this.entered.emit({ currentSlide: this._elementRef.nativeElement });
            }
            else {
                reveal.slideChanged
                    .pipe(filter((event) => event.currentSlide === this._elementRef.nativeElement), first(), takeUntil(this._destroySubject))
                    .subscribe((event) => this.entered.emit(event));
            }
        });
    }
};
__decorate([
    Output(),
    __metadata("design:type", Object)
], RevealSectionDirective.prototype, "entered", void 0);
RevealSectionDirective = __decorate([
    Directive({
        selector: 'section',
    }),
    __param(1, Optional()),
    __metadata("design:paramtypes", [ElementRef, RevealComponent])
], RevealSectionDirective);
export { RevealSectionDirective };
//# sourceMappingURL=reveal-section.directive.js.map