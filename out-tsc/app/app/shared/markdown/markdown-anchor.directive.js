import { __decorate, __metadata } from "tslib";
import { Directive, ElementRef, HostListener } from '@angular/core';
import { MarkdownAnchorService } from '@app/shared/markdown/markdown-anchor.service';
import { Subscription } from 'rxjs';
let MarkdownAnchorDirective = class MarkdownAnchorDirective {
    constructor(service, element) {
        this.service = service;
        this.element = element;
        this._subscription = new Subscription();
    }
    processAnchors() {
        const listener = (event) => this.service.interceptClick(event);
        const links = this.element.nativeElement.querySelectorAll('a');
        links.forEach((link) => {
            link.addEventListener('click', listener);
            this._subscription.add(() => link.removeEventListener('click', listener));
        });
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
};
__decorate([
    HostListener('ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MarkdownAnchorDirective.prototype, "processAnchors", null);
MarkdownAnchorDirective = __decorate([
    Directive({
        // tslint:disable-next-line: directive-selector
        selector: 'markdown,[markdown]',
    }),
    __metadata("design:paramtypes", [MarkdownAnchorService, ElementRef])
], MarkdownAnchorDirective);
export { MarkdownAnchorDirective };
//# sourceMappingURL=markdown-anchor.directive.js.map