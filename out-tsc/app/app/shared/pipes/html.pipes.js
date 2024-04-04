import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
import { noHtml } from '@app/shared/functions';
let NoHtmlPipe = class NoHtmlPipe {
    transform(value) {
        return noHtml(value);
    }
};
NoHtmlPipe = __decorate([
    Pipe({
        name: 'noHtml',
    })
    /**
     * Remove all HTML tags, from an input string
     */
], NoHtmlPipe);
export { NoHtmlPipe };
//# sourceMappingURL=html.pipes.js.map