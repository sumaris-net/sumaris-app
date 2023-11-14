// function that returns `MarkedOptions` with renderer override
import { MarkedRenderer } from 'ngx-markdown';
import { MarkdownAnchorService } from '@app/shared/markdown/markdown-anchor.service';

export class MarkdownRenderer extends MarkedRenderer {
  constructor(private service: MarkdownAnchorService) {
    super();
  }

  // Override link construction
  link(href: string | null, title: string | null, text: string): string {
    if (this.service.isInternalUrl(href)) {
      const externalUrl = this.service.normalizeExternalUrl(href);
      return `<a href="${externalUrl}" routerLink="${href}" title="${title || ''}">${text}</a>`;
    }
    return `<a href="${href || ''}" title="${title || ''}">${text}</a>`;
  }
}
