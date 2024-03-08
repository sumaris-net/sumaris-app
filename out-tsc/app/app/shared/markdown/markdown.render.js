// function that returns `MarkedOptions` with renderer override
import { MarkedRenderer } from 'ngx-markdown';
export class MarkdownRenderer extends MarkedRenderer {
    constructor(service) {
        super();
        this.service = service;
    }
    // Override link construction
    link(href, title, text) {
        if (this.service.isInternalUrl(href)) {
            const externalUrl = this.service.normalizeExternalUrl(href);
            return `<a href="${externalUrl}" routerLink="${href}" title="${title || ''}">${text}</a>`;
        }
        return `<a href="${href || ''}" title="${title || ''}">${text}</a>`;
    }
}
//# sourceMappingURL=markdown.render.js.map